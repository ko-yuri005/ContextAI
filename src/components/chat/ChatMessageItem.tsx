import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Quote,
  ExternalLink,
} from 'lucide-react';
import { ChatMessage } from '../../types';
import { CitationBadge } from './CitationBadge';
import { useApp } from '../../context/AppContext';
import { formatRelativeTime } from '../../utils/cn';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const { addToast, navigateToPreview } = useApp();
  const [isCopied, setIsCopied] = useState(false);
  const [rated, setRated] = useState<'up' | 'down' | null>(null);

  const isAssistant = message.sender === 'assistant';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setIsCopied(true);
    addToast('Copied to Clipboard', 'Message text copied.', 'info');
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRate = (direction: 'up' | 'down') => {
    setRated(direction);
    addToast(
      'Feedback Recorded',
      direction === 'up'
        ? 'Glad this grounded response was helpful!'
        : 'Feedback noted for model citation accuracy.',
      'info'
    );
  };

  // Helper to render text with markdown-like styling & inline citation matching
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');

    return lines.map((line, lineIdx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h4 key={lineIdx} className="text-sm font-bold text-slate-900 mt-3 mb-1.5">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Horizontal Rule
      if (line.trim() === '---') {
        return <hr key={lineIdx} className="my-3 border-slate-200" />;
      }
      // Bullet items
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const content = line.trim().replace(/^[\*\-]\s+/, '');
        return (
          <li key={lineIdx} className="ml-4 list-disc text-xs sm:text-sm text-slate-700 leading-relaxed mb-1">
            {parseInlineStyling(content)}
          </li>
        );
      }
      // Numbered list
      if (/^\d+\.\s/.test(line.trim())) {
        return (
          <div key={lineIdx} className="ml-4 text-xs sm:text-sm text-slate-700 leading-relaxed mb-1">
            {parseInlineStyling(line.trim())}
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={lineIdx} className="h-2" />;
      }
      // Normal paragraph
      return (
        <p key={lineIdx} className="text-xs sm:text-sm text-slate-700 leading-relaxed mb-2">
          {parseInlineStyling(line)}
        </p>
      );
    });
  };

  // Parse bold and citation tags in text
  const parseInlineStyling = (text: string) => {
    // Regex for bold text **...**, bracketed citation numbers [1] or [1, 2], and legacy [Doc, p. 1]
    const parts = text.split(/(\*\*.*?\*\*|\[\d+(?:\s*,\s*\d+)*\]|\[.*?,\s*(?:p\.|slide)\s*\d+\])/g);

    return parts.map((part, i) => {
      // Bold text **...**
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }

      // Bracketed numbers like [1], [2], [1, 2]
      if (/^\[\d+(?:\s*,\s*\d+)*\]$/.test(part)) {
        const nums = part
          .slice(1, -1)
          .split(',')
          .map((n) => parseInt(n.trim(), 10))
          .filter((n) => !isNaN(n));

        const elements = nums.map((num, nIdx) => {
          const matchingCitation = message.citations?.find((c) => String(c.id) === String(num));

          if (!matchingCitation) {
            // Unmatched numbers remain normal plain text
            return <span key={`${i}-${nIdx}`}>[{num}]</span>;
          }

          const locationLabel =
            matchingCitation.documentType === 'website'
              ? (matchingCitation.sectionTitle?.trim() || `Section ${matchingCitation.pageOrSlideNumber || 1}`)
              : (matchingCitation.documentType === 'pptx'
                ? `Slide ${matchingCitation.pageOrSlideNumber || 1}`
                : `Page ${matchingCitation.pageOrSlideNumber || 1}`);

          return (
            <button
              key={`${i}-${nIdx}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigateToPreview(
                  matchingCitation.documentId,
                  matchingCitation.pageOrSlideNumber,
                  matchingCitation.snippetText,
                  matchingCitation.sectionTitle
                );
              }}
              className="inline-flex items-center justify-center px-1.5 py-0.2 mx-0.5 rounded text-[11px] font-mono font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 border border-indigo-200 hover:border-indigo-300 transition-colors cursor-pointer align-baseline"
              title={`Jump to ${matchingCitation.documentName} (${locationLabel})`}
            >
              [{num}]
            </button>
          );
        });

        return <React.Fragment key={i}>{elements}</React.Fragment>;
      }

      // Match legacy inline citation format like [Report.pdf, p. 1]
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <span
            key={i}
            className="inline-block px-1.5 py-0.2 mx-0.5 rounded text-[11px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
          >
            {part}
          </span>
        );
      }

      return part;
    });
  };

  return (
    <div
      className={`flex gap-3 sm:gap-4 py-4 px-3 sm:px-6 transition-colors ${
        isAssistant ? 'bg-slate-50/50' : 'bg-transparent'
      }`}
    >
      {/* Avatar */}
      <div className="shrink-0 mt-0.5">
        {isAssistant ? (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
        ) : (
          <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Message Content Container */}
      <div className="flex-1 min-w-0">
        {/* Author header */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-slate-900">
            {isAssistant ? 'ContextAI Assistant' : 'You'}
          </span>
          <span className="text-[10px] text-slate-400">
            {formatRelativeTime(message.timestamp)}
          </span>
          {isAssistant && message.citations && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <Quote className="w-2.5 h-2.5" />
              {message.citations.length} {message.citations.length === 1 ? 'Source' : 'Sources'}
            </span>
          )}
        </div>

        {/* Formatted body */}
        <div className="prose prose-sm max-w-none">
          {renderFormattedText(message.content)}
        </div>

        {/* Citations (if present) */}
        {isAssistant && message.citations && message.citations.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-slate-200/70">
            <span className="text-xs font-bold text-slate-700 block mb-2">
              Sources:
            </span>
            <div className="flex flex-wrap gap-2">
              {message.citations.map((citation) => (
                <CitationBadge key={citation.id} citation={citation} />
              ))}
            </div>
          </div>
        )}

        {/* Action bar for assistant answers */}
        {isAssistant && (
          <div className="flex items-center gap-2 mt-3 pt-2 text-slate-400">
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1 text-[11px]"
              title="Copy answer text"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <span className="text-slate-300">|</span>

            <button
              onClick={() => handleRate('up')}
              className={`p-1 rounded transition-colors flex items-center gap-1 text-[11px] ${
                rated === 'up' ? 'text-indigo-600 font-semibold' : 'hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Helpful and well-cited"
            >
              <ThumbsUp className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleRate('down')}
              className={`p-1 rounded transition-colors flex items-center gap-1 text-[11px] ${
                rated === 'down' ? 'text-rose-600 font-semibold' : 'hover:text-slate-700 hover:bg-slate-100'
              }`}
              title="Citation mismatch"
            >
              <ThumbsDown className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
