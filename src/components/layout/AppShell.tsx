import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useApp } from '../../context/AppContext';
import { DashboardView } from '../dashboard/DashboardView';
import { DocumentsView } from '../documents/DocumentsView';
import { ChatView } from '../chat/ChatView';
import { DocumentPreviewView } from '../preview/DocumentPreviewView';
import { NotesView } from '../notes/NotesView';
import { SettingsView } from '../settings/SettingsView';
import { DocumentUploadModal } from '../documents/DocumentUploadModal';
import { AddWebsiteModal } from '../documents/AddWebsiteModal';
import { CommandPaletteModal } from './CommandPaletteModal';
import { ToastContainer } from '../common/ToastContainer';

export const AppShell: React.FC = () => {
  const { activeTab } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'documents':
        return <DocumentsView />;
      case 'chat':
        return <ChatView />;
      case 'notes':
        return <NotesView />;
      case 'preview':
        return <DocumentPreviewView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Persistent desktop sidebar & mobile drawer */}
      <Sidebar isMobileOpen={isMobileMenuOpen} setIsMobileOpen={setIsMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopBar onMobileMenuClick={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {renderActiveView()}
        </main>
      </div>

      {/* Interactive Global Modals & Overlays */}
      <DocumentUploadModal />
      <AddWebsiteModal />
      <CommandPaletteModal />
      <ToastContainer />
    </div>
  );
};
