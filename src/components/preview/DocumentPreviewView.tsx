import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  BotMessageSquare,
  Search,
  Quote,
  FileText,
  FileQuestion,
  Layers,
  Sparkles,
  Highlighter,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocumentTypeIcon } from '../common/DocumentTypeIcon';
import { StatusBadge, TagBadge } from '../common/Badge';
import { formatFileSize, formatDate } from '../../utils/cn';
import { EmptyState } from '../common/EmptyState';

export const DocumentPreviewView: React.FC = () => {
  const {
    documents,
    previewTarget,
    setPreviewTarget,
    createDocumentChat,
    sendMessage,
    setActiveTab,
    setIsUploadModalOpen,
  } = useApp();

  // Find targeted or default document
  const activeDoc =
    documents.find((d) => d.id === previewTarget?.documentId) ||
    documents.find((d) => d.status === 'ready') ||
    documents[0];

  // Helper to resolve the target unit (page, slide, section) from previewTarget
  const resolveTargetUnit = (): number => {
    if (!previewTarget) return 1;

    // 1. If explicit page/slide number is provided (PDF, PPTX)
    if (typeof previewTarget.pageNumber === 'number' && previewTarget.pageNumber > 0) {
      return previewTarget.pageNumber;
    }

    // 2. If non-paginated source (Website, Note) with sectionTitle, locate matching section
    if (previewTarget.sectionTitle && activeDoc?.pages) {
      const cleanTarget = previewTarget.sectionTitle.trim().toLowerCase();
      const exactPage = activeDoc.pages.find(
        (p) => p.title && p.title.trim().toLowerCase() === cleanTarget
      );
      if (exactPage) return exactPage.pageNumber;

      const partialPage = activeDoc.pages.find(
        (p) =>
          p.title &&
          (p.title.trim().toLowerCase().includes(cleanTarget) ||
            cleanTarget.includes(p.title.trim().toLowerCase()))
      );
      if (partialPage) return partialPage.pageNumber;

      const chunkWithTitle = activeDoc.chunks?.find(
        (c) => c.sectionTitle && c.sectionTitle.trim().toLowerCase() === cleanTarget
      );
      if (chunkWithTitle?.pageNumber) return chunkWithTitle.pageNumber;
    }

    // 3. Fallback to snippet/chunk content matching if highlightText is available
    if (previewTarget.highlightText && activeDoc) {
      const snippet = previewTarget.highlightText.trim().toLowerCase();
      const chunkWithSnippet = activeDoc.chunks?.find(
        (c) =>
          (c.snippet && snippet.includes(c.snippet.trim().toLowerCase())) ||
          (c.text && c.text.toLowerCase().includes(snippet))
      );
      if (chunkWithSnippet?.pageNumber) return chunkWithSnippet.pageNumber;

      const pageWithSnippet = activeDoc.pages?.find(
        (p) => p.content && p.content.toLowerCase().includes(snippet)
      );
      if (pageWithSnippet) return pageWithSnippet.pageNumber;
    }

    return 1;
  };

  const [currentPage, setCurrentPage] = useState<number>(resolveTargetUnit);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [inDocSearch, setInDocSearch] = useState<string>('');

  // Sync state when previewTarget changes (e.g. from citation badge click)
  useEffect(() => {
    if (previewTarget) {
      setCurrentPage(resolveTargetUnit());
    }
  }, [previewTarget, activeDoc]);

  if (!activeDoc) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <EmptyState
          icon={FileQuestion}
          title="No document to preview"
          description="Upload or select a document to inspect pages, slides, and citations."
          actionLabel="Upload Document"
          onAction={() => setIsUploadModalOpen(true)}
        />
      </div>
    );
  }

  const unit = activeDoc.unitLabel;
  const totalUnits = activeDoc.totalPages || 1;

  // Get active page content or fallback
  const pageData = activeDoc.pages?.find((p) => p.pageNumber === currentPage) || {
    pageNumber: currentPage,
    title: activeDoc.name,
    content: activeDoc.text || '',
  };

  const isHighlightedSnippetPresent = Boolean(
    previewTarget?.highlightText &&
      previewTarget.documentId === activeDoc.id &&
      (typeof previewTarget.pageNumber === 'number'
        ? previewTarget.pageNumber === currentPage
        : true)
  );

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalUnits) setCurrentPage((p) => p + 1);
  };

  const handleAskAboutPage = () => {
    sendMessage(
      `Based on ${activeDoc.name} (${unit} ${currentPage}), can you explain the key details and implications of this section:\n\n"${pageData.content}"`
    );
    setActiveTab('chat');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-100 overflow-hidden">
      {/* Top Document Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <DocumentTypeIcon type={activeDoc.type} size="md" />
          <div className="min-w-0">
            {/* Document Switcher Dropdown */}
            <select
              value={activeDoc.id}
              onChange={(e) => {
                setPreviewTarget({ documentId: e.target.value, pageNumber: 1 });
                setCurrentPage(1);
              }}
              className="font-bold text-xs sm:text-sm text-slate-900 bg-transparent hover:bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-hidden cursor-pointer max-w-xs truncate"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.totalPages} {d.unitLabel}{d.totalPages === 1 ? '' : 's'})
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>{formatFileSize(activeDoc.size)}</span>
              <span>•</span>
              <span>Uploaded {formatDate(activeDoc.uploadDate)}</span>
              <span>•</span>
              <StatusBadge
                status={activeDoc.status}
                progress={activeDoc.processingProgress}
                label={activeDoc.type === 'website' && activeDoc.status === 'ready' ? 'Website · Ready' : undefined}
              />
            </div>
          </div>
        </div>

        {/* Right action buttons */}
        <div className="flex items-center gap-2">
          {activeDoc.url && (
            <a
              href={activeDoc.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold rounded-xl border border-sky-200 transition-colors shadow-2xs shrink-0"
              title="Open original website in a new tab"
            >
              <ExternalLink className="w-3.5 h-3.5 text-sky-600" />
              <span>Open Website</span>
            </a>
          )}
          <button
            onClick={handleAskAboutPage}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors shadow-2xs"
          >
            <BotMessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ask AI about {unit} {currentPage}</span>
          </button>
          <button
            onClick={() => createDocumentChat(activeDoc.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <span>Chat Entire File</span>
          </button>
        </div>
      </div>

      {/* Main Preview Work Area: Left viewer canvas + Right chunks sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Viewer Canvas Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-200/70">
          {/* Viewer Toolbar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between text-xs text-slate-600 shrink-0">
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-slate-900 capitalize">{unit}</span>
                <input
                  type="number"
                  min={1}
                  max={totalUnits}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= totalUnits) setCurrentPage(val);
                  }}
                  className="w-12 text-center border border-slate-200 rounded px-1 py-0.5 font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                />
                <span className="text-slate-400">of {totalUnits}</span>
              </div>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalUnits}
                className="p-1 rounded hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* In-document Search */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Find in page text..."
                value={inDocSearch}
                onChange={(e) => setInDocSearch(e.target.value)}
                className="bg-transparent text-xs text-slate-800 placeholder:text-slate-400 border-none outline-hidden w-full"
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 15, 70))}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-[11px] text-slate-500 w-10 text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 15, 150))}
                className="p-1 rounded hover:bg-slate-100 text-slate-500"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="p-1 rounded hover:bg-slate-100 text-slate-500 ml-1"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Virtual Page Render Container */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-start justify-center">
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-3xl bg-white rounded-xl shadow-xl border border-slate-300 p-8 sm:p-12 transition-transform duration-150 min-h-[600px] flex flex-col justify-between"
            >
              {/* Page Layout Header */}
              <div>
                <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                      DOCUMENT SOURCE
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-mono text-indigo-600 font-semibold">
                      {activeDoc.name} [{unit.toUpperCase()} {currentPage}]
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    ID: {activeDoc.id}
                  </span>
                </div>

                {/* Page Title */}
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-4 leading-snug">
                  {pageData.title || `Section ${currentPage}: Overview & Analysis`}
                </h2>

                {/* Simulated Highlight banner if user arrived via citation click */}
                {isHighlightedSnippetPresent && (
                  <div className="p-3 mb-6 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 animate-slide-up flex items-start gap-2.5">
                    <Highlighter className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <span className="font-bold block">Cited in AI Answer:</span>
                      <p className="mt-0.5 italic text-slate-700">"{previewTarget?.highlightText}"</p>
                    </div>
                  </div>
                )}

                {/* Website Source URL indicator if applicable */}
                {activeDoc.url && (
                  <div className="mb-6 p-3 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center justify-between gap-3 text-xs text-sky-900 font-sans">
                    <span className="truncate">
                      Source Webpage: <span className="font-mono text-[11px] text-sky-950 font-medium">{activeDoc.url}</span>
                    </span>
                    <a
                      href={activeDoc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-sky-600 hover:text-sky-800 hover:underline shrink-0"
                    >
                      Open Website <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Page Content Body */}
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed space-y-4 font-sans">
                  {pageData.content ? (
                    pageData.content.split('\n\n').map((para, i) => (
                      <p key={i} className="whitespace-pre-line text-slate-700 leading-relaxed">
                        {para}
                      </p>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">No text content extracted for this {unit}.</p>
                  )}
                </div>
              </div>

              {/* Page Footer */}
              <div className="pt-8 mt-8 border-t border-slate-100 flex items-center justify-between text-slate-400 text-xs font-mono">
                <span>ContextAI • Document Viewer</span>
                <span>{unit} {currentPage} of {totalUnits}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Chunks & Metadata Sidebar */}
        <div className="hidden lg:flex w-80 bg-white border-l border-slate-200 flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Quote className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900">Document Sections</h3>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {activeDoc.chunks?.length || 0} sections
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {activeDoc.chunks && activeDoc.chunks.length > 0 ? (
              activeDoc.chunks.map((chunk) => {
                const isMatchingPage = chunk.pageOrSlideNumber === currentPage;

                return (
                  <div
                    key={chunk.id}
                    onClick={() => setCurrentPage(chunk.pageOrSlideNumber || 1)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                      isMatchingPage
                        ? 'border-indigo-300 bg-indigo-50/60 shadow-2xs'
                        : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-100/70 px-1.5 py-0.5 rounded">
                        {unit} {chunk.pageOrSlideNumber}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {chunk.tokenCount} tokens
                      </span>
                    </div>

                    <p className="text-slate-700 text-xs leading-relaxed italic line-clamp-3">
                      "{chunk.snippet}"
                    </p>

                    <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Chunk ID: {chunk.id}</span>
                      <span className="text-indigo-600 font-semibold">Inspect &rarr;</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-400 text-center py-8">
                No semantic chunks generated for this file yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
