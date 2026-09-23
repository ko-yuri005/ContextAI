import { PDFParse } from 'pdf-parse';
import { chunkDocument, DocumentChunk } from './chunker.js';

export interface ExtractedPage {
  pageNumber: number;
  title?: string;
  content: string;
}

export type ExtractedChunk = DocumentChunk;

export interface IngestedDocumentResult {
  id: string;
  name: string;
  type: 'pdf' | 'note';
  size: number;
  uploadDate: string;
  status: 'ready';
  totalPages: number;
  unitLabel: 'page' | 'section';
  summary: string;
  tags: string[];
  isSelectedAsSource: boolean;
  text: string;
  pages: ExtractedPage[];
  chunks: DocumentChunk[];
}

/**
 * Extracts real text and per-page content from a PDF buffer.
 */
export async function extractFromPdf(buffer: Buffer, originalFilename: string): Promise<IngestedDocumentResult> {
  // Ensure a clean Uint8Array without Node.js Buffer prototype for pdfjs-dist transferability
  const uint8 = new Uint8Array(buffer.byteLength);
  uint8.set(buffer);
  const parser = new PDFParse({ data: uint8 });

  try {
    // Execute sequentially to avoid worker transferable race condition
    const info = await parser.getInfo().catch(() => null);
    const textResult = await parser.getText();

    const totalPages = textResult.total || textResult.pages.length || 1;
    const pages: ExtractedPage[] = [];

    if (textResult.pages && textResult.pages.length > 0) {
      for (const p of textResult.pages) {
        pages.push({
          pageNumber: p.num,
          title: `Page ${p.num}`,
          content: p.text.trim(),
        });
      }
    } else {
      pages.push({
        pageNumber: 1,
        title: 'Page 1',
        content: textResult.text.trim(),
      });
    }

    const fullText = textResult.text.trim();

    // Generate chunks for RAG
    // Generate concise summary from first 1-2 pages of text
    const sampleText = pages
      .map((p) => p.content)
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    const summary =
      sampleText.length > 250
        ? sampleText.substring(0, 247).trim() + '...'
        : sampleText || 'Extracted PDF document.';

    // Document title
    const metaTitle = (info as any)?.info?.Title?.trim();
    const docName = metaTitle && metaTitle.length > 2 && metaTitle !== 'Untitled'
      ? metaTitle
      : originalFilename;

    const id = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Generate RAG-ready chunks with section/page context
    const chunks = chunkDocument({
      id,
      name: docName,
      pages,
      text: fullText,
    });

    return {
      id,
      name: docName,
      type: 'pdf',
      size: buffer.byteLength,
      uploadDate: new Date().toISOString(),
      status: 'ready',
      totalPages,
      unitLabel: 'page',
      summary,
      tags: ['PDF', `${totalPages} ${totalPages === 1 ? 'Page' : 'Pages'}`],
      isSelectedAsSource: false,
      text: fullText,
      pages,
      chunks,
    };
  } finally {
    await parser.destroy().catch(() => {});
  }
}

/**
 * Extracts content from text and markdown files.
 */
export function extractFromPlainText(buffer: Buffer, originalFilename: string): IngestedDocumentResult {
  const content = buffer.toString('utf-8');
  const lines = content.split('\n');

  // Derive title from first line or filename
  let title = originalFilename;
  const firstLine = lines.find((l) => l.trim().length > 0);
  if (firstLine && firstLine.startsWith('# ')) {
    title = firstLine.replace(/^#+\s*/, '').trim();
  }

  const sections: ExtractedPage[] = [];
  const rawSections = content.split(/^##\s+/m);

  if (rawSections.length > 1) {
    rawSections.forEach((sec, idx) => {
      const trimmed = sec.trim();
      if (!trimmed) return;
      const secLines = trimmed.split('\n');
      const secTitle = secLines[0].replace(/^#+\s*/, '').trim();
      const secContent = secLines.slice(1).join('\n').trim();
      sections.push({
        pageNumber: idx + 1,
        title: secTitle || `Section ${idx + 1}`,
        content: secContent || trimmed,
      });
    });
  } else {
    sections.push({
      pageNumber: 1,
      title: 'Full Note',
      content: content.trim(),
    });
  }

  const summary =
    content.length > 220
      ? content.replace(/\s+/g, ' ').substring(0, 217).trim() + '...'
      : content.replace(/\s+/g, ' ').trim() || 'Text document';

  const id = `note-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  // Generate RAG-ready chunks with section context
  const chunks = chunkDocument({
    id,
    name: title,
    pages: sections,
    text: content,
  });

  return {
    id,
    name: title,
    type: 'note',
    size: buffer.byteLength,
    uploadDate: new Date().toISOString(),
    status: 'ready',
    totalPages: sections.length,
    unitLabel: 'section',
    summary,
    tags: ['Note', 'Text'],
    isSelectedAsSource: false,
    text: content,
    pages: sections,
    chunks,
  };
}
