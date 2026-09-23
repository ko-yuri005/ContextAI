import React, { useState } from 'react';
import {
  LayoutDashboard,
  Files,
  BotMessageSquare,
  NotebookPen,
  Eye,
  Settings2,
  Plus,
  ChevronRight,
  ChevronsUpDown,
  Sparkles,
  Layers,
  HardDrive,
  PanelLeftClose,
  PanelLeftOpen,
  Globe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AppTab } from '../../types';
import { cn, formatFileSize } from '../../utils/cn';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const {
    activeTab,
    setActiveTab,
    documents,
    selectedDocumentIds,
    setIsUploadModalOpen,
    setIsWebsiteModalOpen,
    notes,
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);

  const readyDocuments = documents.filter((d) => d.status === 'ready');
  const totalIndexedPages = readyDocuments.reduce((sum, d) => sum + d.totalPages, 0);
  const totalBytes = documents.reduce((sum, d) => sum + d.size, 0);
  const storagePct = totalBytes > 0 ? Math.min(Math.round((totalBytes / (500 * 1024 * 1024)) * 100), 100) : 0;

  const navItems: {
    id: AppTab;
    label: string;
    icon: React.ElementType;
    badge?: string | number;
    badgeColor?: string;
  }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: Files,
      badge: documents.length,
      badgeColor: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'chat',
      label: 'AI Chat',
      icon: BotMessageSquare,
      badge: selectedDocumentIds.length > 0 ? `${selectedDocumentIds.length} src` : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-700 font-semibold',
    },
    {
      id: 'notes',
      label: 'Notes',
      icon: NotebookPen,
      badge: notes.length > 0 ? notes.length : undefined,
      badgeColor: 'bg-slate-100 text-slate-600',
    },
    {
      id: 'preview',
      label: 'Document Preview',
      icon: Eye,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings2,
    },
  ];

  const handleNavClick = (tab: AppTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static top-0 bottom-0 left-0 z-40 flex flex-col bg-white border-r border-slate-200 transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-slate-900 text-base tracking-tight block leading-tight">
                  ContextAI
                </span>
                <span className="text-[11px] font-medium text-slate-400 block leading-tight">
                  Document Intelligence
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Sparkles className="w-5 h-5" />
            </div>
          )}

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Workspace Section */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="w-full flex items-center justify-between p-2 rounded-xl text-left bg-slate-50 border border-slate-200/70 transition-colors">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                  Y
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">Your Workspace</p>
                  <p className="text-[10px] text-slate-500 truncate">Your personal document space</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Ingestion Actions */}
        <div className="px-3 py-2 space-y-1.5">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all hover:shadow hover:-translate-y-0.5 active:translate-y-0',
              isCollapsed && 'px-0'
            )}
            title="Upload Document"
          >
            <Plus className="w-4 h-4 shrink-0" />
            {!isCollapsed && <span>Upload Document</span>}
          </button>
          <button
            onClick={() => setIsWebsiteModalOpen(true)}
            className={cn(
              'w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/80 text-xs font-semibold rounded-xl transition-all',
              isCollapsed && 'px-0'
            )}
            title="Add Website"
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>Add Website</span>}
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {!isCollapsed && (
            <div className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
              Platform
            </div>
          )}

          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
                  isCollapsed && 'justify-center px-0'
                )}
                title={item.label}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-600'
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        className={cn(
                          'px-1.5 py-0.5 text-[10px] rounded-md transition-colors',
                          isActive ? 'bg-slate-800 text-indigo-300' : item.badgeColor
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Sources Info Card */}
        {!isCollapsed && (
          <div className="p-3 mx-3 my-2 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Selected Sources</span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                {selectedDocumentIds.length} / {documents.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-snug">
              {selectedDocumentIds.length > 0
                ? `${selectedDocumentIds.length} document(s) chosen for answers.`
                : 'No documents selected. Choose documents to ask questions about.'}
            </p>
            <button
              onClick={() => setActiveTab('documents')}
              className="mt-2 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
            >
              Manage sources
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Storage Stats & Footer */}
        <div className="p-3 border-t border-slate-100">
          {!isCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                  Storage Used
                </span>
                <span className="font-semibold text-slate-700">{formatFileSize(totalBytes)}</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${storagePct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                {totalIndexedPages} total pages uploaded
              </p>
            </div>
          ) : (
            <div className="flex justify-center text-slate-400" title={`${totalIndexedPages} pages uploaded`}>
              <HardDrive className="w-4 h-4" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
