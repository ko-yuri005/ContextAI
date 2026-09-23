import * as cheerio from 'cheerio';
import { validateSafeUrl } from './ssrfGuard.js';
import { chunkDocument, DocumentChunk } from './chunker.js';

export interface ExtractedSection {
  pageNumber: number; // For consistency with pages array
  title: string;
  content: string;
}

export type ExtractedChunk = DocumentChunk;

export interface IngestedWebsiteDocument {
  id: string;
  name: string;
  type: 'website';
  url: string;
  size: number;
  uploadDate: string;
  status: 'ready' | 'processing' | 'failed';
  totalPages: number;
  unitLabel: 'section';
  summary: string;
  tags: string[];
  isSelectedAsSource: boolean;
  text: string;
  pages: ExtractedSection[];
  chunks: DocumentChunk[];
}

const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 10000; // 10 seconds
const MAX_REDIRECTS = 5;

/**
 * Safely fetches a webpage with SSRF protection, timeout, and redirect validation.
 */
async function fetchSafeHtml(initialUrl: string): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    // 1. SSRF Check on current URL
    const validation = await validateSafeUrl(currentUrl);
    if (!validation.safe || !validation.url) {
      throw new Error(validation.error || 'URL validation failed.');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(currentUrl, {
        method: 'GET',
        redirect: 'manual', // Intercept redirects for SSRF validation
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (ContextAI/1.0)',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        signal: controller.signal,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out after 10 seconds. The webpage took too long to respond.');
      }
      throw new Error(`Failed to connect to ${currentUrl}: ${err.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    // 2. Check for redirect
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error(`Received redirect status ${response.status} with no Location header.`);
      }

      if (redirectCount === MAX_REDIRECTS) {
        throw new Error('Too many redirects encountered while fetching the webpage.');
      }

      // Resolve relative redirect URLs against current URL
      const resolvedRedirect = new URL(location, currentUrl).toString();
      currentUrl = resolvedRedirect;
      continue;
    }

    // 3. HTTP status check
    if (!response.ok) {
      throw new Error(`Webpage returned error status HTTP ${response.status} (${response.statusText}).`);
    }

    // 4. Content-Type check
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
      throw new Error(
        `Unsupported content type "${contentType}". ContextAI can only ingest HTML web pages or plain text.`
      );
    }

    // 5. Size check
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
      throw new Error(
        `Webpage is too large (${Math.round(parseInt(contentLength, 10) / 1024)} KB). Maximum allowed size is 5 MB.`
      );
    }

    const html = await response.text();
    if (html.length > MAX_RESPONSE_SIZE) {
      throw new Error('Webpage content exceeded the 5 MB size limit.');
    }

    return { html, finalUrl: currentUrl };
  }

  throw new Error('Failed to fetch webpage after maximum redirect attempts.');
}

/**
 * Extracts clean, readable text, sections, and metadata from raw HTML.
 */
export async function extractFromWebsite(targetUrl: string): Promise<IngestedWebsiteDocument> {
  const { html, finalUrl } = await fetchSafeHtml(targetUrl);
  const parsedUrl = new URL(finalUrl);

  const $ = cheerio.load(html);

  // 1. Remove non-content elements
  $(
    'script, style, noscript, iframe, svg, canvas, video, audio, object, embed, ' +
      'nav, header, footer, aside, ' +
      '[role="navigation"], [role="banner"], [role="contentinfo"], ' +
      '[class*="cookie"], [id*="cookie"], [class*="consent"], [id*="consent"], ' +
      '[class*="ad-"], [class*="advertisement"], [id*="ad-"], ins.adsbygoogle, ' +
      'form, [class*="popup"], [class*="modal"]'
  ).remove();

  // 2. Extract Metadata (Title, Summary, Domain)
  let title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('meta[name="twitter:title"]').attr('content')?.trim() ||
    $('title').text().trim() ||
    $('h1').first().text().trim() ||
    parsedUrl.hostname.replace(/^www\./, '');

  // Clean title (remove common site suffixes like " | CNN", " - The New York Times")
  title = title.replace(/\s*[|\-–—]\s*[^|\-–—]+$/, '').trim() || title;

  const rawDescription =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    '';

  // 3. Locate Main Content Container
  let $root = $('article');
  if ($root.length === 0 || $root.text().trim().length < 100) {
    $root = $('main');
  }
  if ($root.length === 0 || $root.text().trim().length < 100) {
    $root = $('[role="main"]');
  }
  if ($root.length === 0 || $root.text().trim().length < 100) {
    $root = $('.content, #content, .post-content, .entry-content, .article-content, .article-body');
  }
  if ($root.length === 0 || $root.text().trim().length < 100) {
    $root = $('body');
  }

  // 4. Extract structured sections
  const sections: ExtractedSection[] = [];
  let currentSectionTitle = 'Overview';
  let currentSectionParagraphs: string[] = [];

  // Iterate over block-level readable elements
  $root.find('h1, h2, h3, h4, p, ul, ol, blockquote').each((_, el) => {
    const tagName = el.tagName.toLowerCase();
    const $el = $(el);

    if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) {
      const headingText = $el.text().replace(/\s+/g, ' ').trim();
      if (headingText && headingText.length > 1) {
        // Flush previous section if it has content
        if (currentSectionParagraphs.length > 0) {
          sections.push({
            pageNumber: sections.length + 1,
            title: currentSectionTitle,
            content: currentSectionParagraphs.join('\n\n'),
          });
          currentSectionParagraphs = [];
        }
        currentSectionTitle = headingText;
      }
    } else if (tagName === 'p' || tagName === 'blockquote') {
      const pText = $el.text().replace(/\s+/g, ' ').trim();
      if (pText.length > 15) {
        currentSectionParagraphs.push(pText);
      }
    } else if (tagName === 'ul' || tagName === 'ol') {
      const items: string[] = [];
      $el.find('li').each((_, li) => {
        const itemText = $(li).text().replace(/\s+/g, ' ').trim();
        if (itemText) items.push(`• ${itemText}`);
      });
      if (items.length > 0) {
        currentSectionParagraphs.push(items.join('\n'));
      }
    }
  });

  // Flush remaining section
  if (currentSectionParagraphs.length > 0) {
    sections.push({
      pageNumber: sections.length + 1,
      title: currentSectionTitle,
      content: currentSectionParagraphs.join('\n\n'),
    });
  }

  // Fallback if no clean sections were formed
  if (sections.length === 0) {
    const rawBodyText = $root
      .text()
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 20)
      .join('\n\n');

    if (!rawBodyText) {
      throw new Error(
        'Unable to extract readable content from this webpage. It may require JavaScript to render or access is blocked.'
      );
    }

    sections.push({
      pageNumber: 1,
      title: 'Extracted Content',
      content: rawBodyText,
    });
  }

  // 5. Build full text
  const fullText = sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n');

  // 6. Generate brief summary from description or first section
  let summary = rawDescription;
  if (!summary || summary.length < 30) {
    const firstSectionContent = sections[0]?.content || '';
    summary =
      firstSectionContent.length > 220
        ? firstSectionContent.substring(0, 217).trim() + '...'
        : firstSectionContent || 'Extracted webpage content.';
  }

  const domain = parsedUrl.hostname.replace(/^www\./, '');
  const id = `web-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // 7. Generate RAG-ready chunks with section context & sentence boundaries
  const chunks = chunkDocument({
    id,
    name: title,
    pages: sections,
    text: fullText,
  });

  return {
    id,
    name: title,
    type: 'website',
    url: finalUrl,
    size: Buffer.byteLength(fullText, 'utf8'),
    uploadDate: new Date().toISOString(),
    status: 'ready',
    totalPages: sections.length,
    unitLabel: 'section',
    summary,
    tags: [domain, 'Web Source'],
    isSelectedAsSource: false,
    text: fullText,
    pages: sections,
    chunks,
  };
}
