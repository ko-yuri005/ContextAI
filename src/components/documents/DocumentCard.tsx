import React from 'react';
import {
  MoreVertical,
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

interface DocumentCardProps {
  document: Document;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document: doc }) => {
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
      className={`bg-white rounded-2xl border p-5 transition-all flex flex-col justify-between group relative shadow-xs ${
        doc.isSelectedAsSource
          ? 'border-indigo-300 ring-2 ring-indigo-500/10 shadow-sm'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <div>
        {/* Card Header: Icon, Type, Checkbox */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <DocumentTypeIcon type={doc.type} size="md" />
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">
                {doc.type === 'website' ? (domain ? `WEBSITE · ${domain}` : 'WEBSITE') : `${doc.type.toUpperCase()} DOCUMENT`}
              </span>
              <h4
                onClick={() => isReady && navigateToPreview(doc.id, 1)}
                className="text-xs font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors cursor-pointer"
                title={doc.name}
              >
                {doc.name}
              </h4>
            </div>
          </div>

          {/* Context Checkbox */}
          <button
            onClick={() => isReady && toggleDocumentSelection(doc.id)}
            disabled={!isReady}
            title={
              !isReady
                ? 'Document is still indexing'
                : doc.isSelectedAsSource
                ? 'Remove from AI context'
                : 'Add to AI context'
            }
            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
          >
            {doc.isSelectedAsSource ? (
              <CheckSquare className="w-5 h-5 text-indigo-600" />
            ) : (
              <Square className="w-5 h-5 text-slate-300" />
            )}
          </button>
        </div>

        {/* Summary snippet */}
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
          {doc.summary}
        </p>

        {/* Tags */}
        {doc.tags && doc.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {doc.tags.map((tag) => (
              <TagBadge key={tag} label={tag} />
            ))}
          </div>
        )}
      </div>

      {/* Footer Details & Actions */}
      <div className="pt-3 border-t border-slate-100 mt-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
          <span>
            {doc.totalPages} {doc.unitLabel}{doc.totalPages === 1 ? '' : 's'} • {formatFileSize(doc.size)}
          </span>
          <StatusBadge
            status={doc.status}
            progress={doc.processingProgress}
            label={doc.type === 'website' && isReady ? 'Website · Ready' : undefined}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 pt-1">
          {isReady ? (
            <>
              <button
                onClick={() => navigateToPreview(doc.id, 1)}
                className="flex-1 py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                Preview
              </button>
              {doc.url && (
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1 shrink-0"
                  title="Open original website in a new tab"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
                  <span className="hidden sm:inline">Open Website</span>
                </a>
              )}
              <button
                onClick={() => createDocumentChat(doc.id)}
                className="flex-1 py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <BotMessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                Ask AI
              </button>
            </>
          ) : (
            <button
              onClick={() => retryProcessing(doc.id)}
              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500 animate-spin" />
              Reprocess
            </button>
          )}

          <button
            onClick={() => bulkDeleteDocuments([doc.id])}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            title="Delete document"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
