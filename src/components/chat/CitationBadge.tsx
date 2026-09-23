import React, { useState } from 'react';
import { Citation } from '../../types';
import { useApp } from '../../context/AppContext';
import { DocumentTypeIcon } from '../common/DocumentTypeIcon';
import { ExternalLink, CheckCircle2 } from 'lucide-react';

interface CitationBadgeProps {
  citation: Citation;
}

export const CitationBadge: React.FC<CitationBadgeProps> = ({ citation }) => {
  const { navigateToPreview } = useApp();
  const [showTooltip, setShowTooltip] = useState(false);

  const getLocationLabel = () => {
    if (citation.documentType === 'website') {
      if (citation.sectionTitle && citation.sectionTitle.trim()) {
        return citation.sectionTitle.trim();
      }
      return `Section ${citation.pageOrSlideNumber || 1}`;
    }
    if (citation.documentType === 'pptx') {
      return `Slide ${citation.pageOrSlideNumber || 1}`;
    }
    return `Page ${citation.pageOrSlideNumber || 1}`;
  };

  const locationLabel = getLocationLabel();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigateToPreview(
      citation.documentId,
      citation.pageOrSlideNumber,
      citation.snippetText,
      citation.sectionTitle
    );
  };

  return (
    <span
      className="relative inline-block my-0.5"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 border border-slate-200/80 transition-all cursor-pointer shadow-2xs group max-w-full"
        title={`Inspect ${citation.documentName} (${locationLabel})`}
      >
        <span className="text-slate-400 group-hover:text-indigo-400 font-normal">[</span>
        <span className="truncate max-w-[140px] font-medium">{citation.documentName}</span>
        <span className="text-slate-400">·</span>
        <span className="font-semibold text-slate-600 group-hover:text-indigo-600 truncate max-w-[140px]">
          {locationLabel}
        </span>
        <span className="text-slate-400 group-hover:text-indigo-400 font-normal">]</span>
      </button>

      {/* Rich interactive hover tooltip */}
      {showTooltip && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-xl z-50 text-left pointer-events-none animate-slide-up border border-slate-800"
          style={{ transform: 'translateX(-50%) translateY(-2px)' }}
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5 truncate">
              <DocumentTypeIcon type={citation.documentType} size="sm" className="p-1" />
              <span className="text-[11px] font-bold text-slate-200 truncate">
                {citation.documentName}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-0.5 shrink-0">
              <CheckCircle2 className="w-3 h-3" />
              {Math.round(citation.confidenceScore * 100)}% match
            </span>
          </div>

          <p className="text-[11px] text-slate-300 italic line-clamp-3 leading-relaxed">
            "{citation.snippetText}"
          </p>

          <div className="mt-2 pt-1 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-indigo-300">
            <span className="truncate max-w-[180px]">Location: {locationLabel}</span>
            <span className="font-semibold shrink-0">Click badge to inspect &rarr;</span>
          </div>
        </div>
      )}
    </span>
  );
};
