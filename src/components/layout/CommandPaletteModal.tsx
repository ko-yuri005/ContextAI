import React, { useState, useEffect } from 'react';
import {
  Search,
  Files,
  BotMessageSquare,
  Eye,
  NotebookPen,
  Upload,
  Plus,
  LayoutDashboard,
  Settings,
  ArrowRight,
  X,
  Globe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppTab } from '../../types';
import { DocumentTypeIcon } from '../common/DocumentTypeIcon';

export const CommandPaletteModal: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    setActiveTab,
    documents,
    navigateToPreview,
    setIsUploadModalOpen,
    setIsWebsiteModalOpen,
    createNote,
  } = useApp();

  const [query, setQuery] = useState('');

  // Handle global Cmd+K or Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const filteredDocs = documents.filter((d) =>
    d.name.toLowerCase().includes(query.toLowerCase()) ||
    d.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  const navigationActions: { label: string; tab: AppTab; icon: React.ElementType }[] = [
    { label: 'Go to Dashboard', tab: 'dashboard', icon: LayoutDashboard },
    { label: 'Go to Your Documents', tab: 'documents', icon: Files },
    { label: 'Open AI Chat & Q&A', tab: 'chat', icon: BotMessageSquare },
    { label: 'Inspect Document Preview', tab: 'preview', icon: Eye },
    { label: 'View Your Notes', tab: 'notes', icon: NotebookPen },
    { label: 'Open Settings', tab: 'settings', icon: Settings },
  ];

  const filteredNav = navigationActions.filter((n) =>
    n.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectTab = (tab: AppTab) => {
    setActiveTab(tab);
    setIsCommandPaletteOpen(false);
  };

  const handleSelectDoc = (docId: string) => {
    navigateToPreview(docId, 1);
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Type a command, search documents, or jump to view..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="flex-1 bg-transparent border-none outline-hidden text-sm text-slate-900 placeholder:text-slate-400"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Quick Actions */}
          <div>
            <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Quick Actions
            </div>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  setIsUploadModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 transition-colors group text-xs text-slate-700 font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                    <Upload className="w-4 h-4" />
                  </div>
                  <span>Upload new document (PDF, PPTX, Image, Note)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  setIsWebsiteModalOpen(true);
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 transition-colors group text-xs text-slate-700 font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                    <Globe className="w-4 h-4" />
                  </div>
                  <span>Add public website URL source</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => {
                  setIsCommandPaletteOpen(false);
                  createNote('New Note', '');
                  setActiveTab('notes');
                }}
                className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 transition-colors group text-xs text-slate-700 font-medium"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <Plus className="w-4 h-4" />
                  </div>
                  <span>Create quick workspace note</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          {/* Navigation Section */}
          {filteredNav.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Navigation
              </div>
              <div className="space-y-1">
                {filteredNav.map((nav) => {
                  const Icon = nav.icon;
                  return (
                    <button
                      key={nav.tab}
                      onClick={() => handleSelectTab(nav.tab)}
                      className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 transition-colors text-xs text-slate-700 font-medium"
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 text-slate-400" />
                        <span>{nav.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Jump</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {filteredDocs.length > 0 && (
            <div>
              <div className="px-2 pb-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Your Documents
              </div>
              <div className="space-y-1">
                {filteredDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleSelectDoc(doc.id)}
                    className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-slate-100 transition-colors group text-xs text-slate-700"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <DocumentTypeIcon type={doc.type} size="sm" />
                      <div className="truncate">
                        <p className="font-semibold text-slate-800 truncate">{doc.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {doc.totalPages} {doc.unitLabel}s • {doc.tags.join(', ')}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Inspect &rarr;
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Navigate with mouse or Esc to close</span>
          <span>Tip: Press Cmd/Ctrl+K anytime</span>
        </div>
      </div>
    </div>
  );
};
