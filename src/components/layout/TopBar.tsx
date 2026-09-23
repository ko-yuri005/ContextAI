import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  Search,
  UploadCloud,
  Layers,
  ChevronDown,
  Check,
  Command,
  Sparkles,
  CheckSquare,
  Square,
  Globe,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Document } from '../../types';
import { cn } from '../../utils/cn';
import { DocumentTypeIcon } from '../common/DocumentTypeIcon';

interface TopBarProps {
  onMobileMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMobileMenuClick }) => {
  const {
    activeTab,
    documents,
    selectedDocumentIds,
    toggleDocumentSelection,
    selectAllDocuments,
    deselectAllDocuments,
    bulkDeleteDocuments,
    setIsUploadModalOpen,
    setIsWebsiteModalOpen,
    setIsCommandPaletteOpen,
  } = useApp();

  const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSourceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Overview Dashboard';
      case 'documents':
        return 'Your Documents';
      case 'chat':
        return 'Document Q&A';
      case 'notes':
        return 'Your Notes';
      case 'preview':
        return 'Document Preview';
      case 'settings':
        return 'Settings';
      default:
        return 'ContextAI';
    }
  };

  const readyDocuments = documents.filter((d) => d.status === 'ready');
  const allSelected = readyDocuments.length > 0 && readyDocuments.every((d) => d.isSelectedAsSource);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Left: Mobile Toggle & Page Title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuClick}
          className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {getTabTitle()}
            </h1>
          </div>
        </div>
      </div>

      {/* Center & Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quick Search / Command Palette Trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-500 text-xs transition-all group"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600" />
          <span className="hidden md:inline">Search documents & commands...</span>
          <span className="md:hidden">Search</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-400 bg-white border border-slate-200 rounded shadow-2xs">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>

        {/* Active Source Documents Dropdown Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsSourceDropdownOpen(!isSourceDropdownOpen)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all',
              selectedDocumentIds.length > 0
                ? 'bg-indigo-50/70 border-indigo-200 text-indigo-800 hover:bg-indigo-100/70'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            )}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span className="font-semibold">{selectedDocumentIds.length}</span>
            <span className="hidden sm:inline">Selected Sources</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* Interactive Source Selection Popover */}
          {isSourceDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-slide-up">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Selected Documents</h4>
                  <p className="text-[11px] text-slate-500">
                    Checked documents are used by the AI to answer your questions
                  </p>
                </div>
                <button
                  onClick={allSelected ? deselectAllDocuments : selectAllDocuments}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              {/* Document Checkbox List */}
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {documents.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">No documents uploaded</p>
                ) : (
                  documents.map((doc) => {
                    const isSelected = doc.isSelectedAsSource;
                    const isReady = doc.status === 'ready';

                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          if (isReady) toggleDocumentSelection(doc.id);
                        }}
                        className={cn(
                          'group/item flex items-center gap-2.5 p-2 rounded-xl transition-all cursor-pointer select-none text-left',
                          isSelected
                            ? 'bg-indigo-50/50 border border-indigo-100'
                            : 'hover:bg-slate-50 border border-transparent',
                          !isReady && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        <button
                          type="button"
                          className="shrink-0 text-slate-400 hover:text-indigo-600"
                          disabled={!isReady}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                        <DocumentTypeIcon type={doc.type} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[10px] text-slate-400">
                            {doc.totalPages} {doc.unitLabel}s • {doc.status}
                          </p>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}

                        {/* Delete Document Selection */}
                        <div
                          className="flex items-center justify-end shrink-0 ml-1 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 data-[selected=true]:opacity-100 transition-opacity"
                          data-selected={selectedForDeletion.has(doc.id)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300 focus:ring-rose-500 cursor-pointer accent-rose-600"
                            checked={selectedForDeletion.has(doc.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedForDeletion);
                              if (e.target.checked) newSet.add(doc.id);
                              else newSet.delete(doc.id);
                              setSelectedForDeletion(newSet);
                            }}
                            title="Select for deletion"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                {selectedForDeletion.size > 0 ? (
                  <>
                    <span className="font-semibold text-rose-600">
                      {selectedForDeletion.size} selected for deletion
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                      className="px-2 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Delete selected
                    </button>
                  </>
                ) : (
                  <>
                    <span>{readyDocuments.length} ready in documents</span>
                    <span className="font-semibold text-indigo-600">
                      {selectedDocumentIds.length} selected for questions
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Website Button */}
        <button
          onClick={() => setIsWebsiteModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-xs font-semibold rounded-xl transition-all"
          title="Add Website"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Website</span>
        </button>

        {/* Upload Button */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0"
        >
          <UploadCloud className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Upload File</span>
        </button>
      </div>

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
          onClick={(e) => {
            e.stopPropagation();
            setIsBulkDeleteModalOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 max-w-sm w-full animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">Delete selected documents?</h3>
              </div>
            </div>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              This will permanently remove the selected documents and their indexed content.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const wasDeleted = await bulkDeleteDocuments(Array.from(selectedForDeletion));
                  if (wasDeleted) {
                    setSelectedForDeletion(new Set());
                    setIsBulkDeleteModalOpen(false);
                    setIsSourceDropdownOpen(false);
                  }
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl shadow-xs transition-colors"
              >
                Delete selected
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
