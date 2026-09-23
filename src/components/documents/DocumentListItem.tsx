import React from 'react';
import {
  Eye,
  BotMessageSquare,
  Trash2,
  CheckSquare,
  Square,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { Document } from '../../types';
import { DocumentTypeIcon } from '../common/DocumentTypeIcon';
import { StatusBadge, TagBadge } from '../common/Badge';
import { formatFileSize, formatRelativeTime } from '../../utils/cn';
import { useApp } from '../../context/AppContext';

interface DocumentListItemProps {
  document: Document;
}

export const DocumentListItem: React.FC<DocumentListItemProps> = ({ document: doc }) => {
  const {
    toggleDocumentSelection,
    navigateToPreview,
    createDocumentChat,
    bulkDeleteDocuments,
    retryProcessing,
  } = useApp();

  const isReady = doc.status === 'ready';

  const domain = doc.url
    ? (() => {
        try {
          return new URL(doc.url).hostname.replace(/^www\./, '');
        } catch {
          return doc.tags?.[0] || '';
        }
      })()
    : doc.tags?.[0] || '';

  return (
    <div
      className={`bg-white px-4 py-3 rounded-xl border transition-all flex items-center justify-between gap-4 group ${
        doc.isSelectedAsSource
          ? 'border-indigo-200 bg-indigo-50/20 shadow-2xs'
          : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
      }`}
    >
      {/* Left: Checkbox, Icon, Title, Tags */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <button
          onClick={() => isReady && toggleDocumentSelection(doc.id)}
          disabled={!isReady}
          title={
            !isReady
              ? 'Still processing'
              : doc.isSelectedAsSource
              ? 'Remove from AI context'
              : 'Add to AI context'
          }
          className="text-slate-400 hover:text-indigo-600 transition-colors shrink-0 disabled:opacity-40"
        >
          {doc.isSelectedAsSource ? (
            <CheckSquare className="w-5 h-5 text-indigo-600" />
          ) : (
            <Square className="w-5 h-5 text-slate-300" />
          )}
        </button>

        <DocumentTypeIcon type={doc.type} size="sm" />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4
              onClick={() => isReady && navigateToPreview(doc.id, 1)}
              className="text-xs font-bold text-slate-900 truncate hover:text-indigo-600 cursor-pointer"
              title={doc.name}
            >
              {doc.name}
            </h4>
            {doc.type === 'website' && domain && (
              <span className="text-[10px] font-semibold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200/60 truncate">
                {domain}
              </span>
            )}
            <StatusBadge
              status={doc.status}
              progress={doc.processingProgress}
              label={doc.type === 'website' && isReady ? 'Website · Ready' : undefined}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
            <span>
              {doc.totalPages} {doc.unitLabel}{doc.totalPages === 1 ? '' : 's'}
            </span>
            <span>•</span>
            <span>{formatFileSize(doc.size)}</span>
            <span>•</span>
            <span>{formatRelativeTime(doc.createdAt || doc.uploadDate)}</span>
          </div>
        </div>

        {/* Tags on medium screens */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {doc.tags.slice(0, 2).map((t) => (
            <TagBadge key={t} label={t} />
          ))}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isReady ? (
          <>
            {doc.url && (
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 text-xs font-medium text-sky-700 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                title="Open original website"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">Open Website</span>
              </a>
            )}
            <button
              onClick={() => navigateToPreview(doc.id, 1)}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Preview</span>
            </button>
            <button
              onClick={() => createDocumentChat(doc.id)}
              className="px-2.5 py-1 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <BotMessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => retryProcessing(doc.id)}
            className="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Reprocess</span>
          </button>
        )}

        <button
          onClick={() => bulkDeleteDocuments([doc.id])}
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          title="Delete file"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
