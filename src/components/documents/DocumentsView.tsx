import React, { useState } from 'react';
import {
  Search,
  UploadCloud,
  LayoutGrid,
  List,
  CheckSquare,
  Square,
  Filter,
  Layers,
  Sparkles,
  FileQuestion,
  Globe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocumentType, DocumentStatus } from '../../types';
import { DocumentCard } from './DocumentCard';
import { DocumentListItem } from './DocumentListItem';
import { EmptyState } from '../common/EmptyState';

export const DocumentsView: React.FC = () => {
  const {
    documents,
    selectedDocumentIds,
    selectAllDocuments,
    deselectAllDocuments,
    setIsUploadModalOpen,
    setIsWebsiteModalOpen,
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<DocumentType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter documents
  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      doc.summary.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedType === 'all' || doc.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || doc.status === selectedStatus;

    return matchesSearch && matchesType && matchesStatus;
  });

  const readyDocs = documents.filter((d) => d.status === 'ready');
  const allSelected = readyDocs.length > 0 && readyDocs.every((d) => d.isSelectedAsSource);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Your Documents</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your files and select which documents you want the AI to look at when answering questions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWebsiteModalOpen(true)}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-xs font-semibold rounded-xl transition-all"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Add Website</span>
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all hover:shadow hover:-translate-y-0.5"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by file name, tag, or content snippet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* View Mode Toggle & Status Filter */}
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as DocumentStatus | 'all')}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="ready">Ready only</option>
              <option value="processing">Processing only</option>
              <option value="failed">Failed only</option>
            </select>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg text-xs transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-600 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="List view"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Format Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1">
          {[
            { id: 'all', label: 'All Formats' },
            { id: 'pdf', label: 'PDF Documents' },
            { id: 'website', label: 'Websites' },
            { id: 'pptx', label: 'Slide Decks (PPTX)' },
            { id: 'image', label: 'Images & Scans' },
            { id: 'note', label: 'Notes & Markdown' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedType(tab.id as DocumentType | 'all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedType === tab.id
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Context Selection Toolbar */}
      <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-indigo-950 block">
              Selected Sources: {selectedDocumentIds.length} of {documents.length} documents selected
            </span>
            <span className="text-[11px] text-indigo-700 block">
              Only checked documents will be referenced and cited when you ask questions in AI Chat.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={allSelected ? deselectAllDocuments : selectAllDocuments}
            className="px-3 py-1.5 bg-white hover:bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-xl shadow-2xs transition-colors flex items-center gap-1.5"
          >
            {allSelected ? (
              <>
                <Square className="w-3.5 h-3.5 text-indigo-500" />
                Deselect All
              </>
            ) : (
              <>
                <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                Select All Ready
              </>
            )}
          </button>
        </div>
      </div>

      {/* Document Grid / List rendering */}
      {documents.length === 0 ? (
        <EmptyState
          icon={UploadCloud}
          title="No documents yet"
          description="Upload your PDFs, slide decks, images, or notes to ask questions and get answers with citations."
          actionLabel="Upload Document"
          onAction={() => setIsUploadModalOpen(true)}
        />
      ) : filteredDocs.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="No documents match your filters"
          description="Try clearing search keywords or selecting a different document format."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setSelectedType('all');
            setSelectedStatus('all');
          }}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => (
            <DocumentListItem key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
};
