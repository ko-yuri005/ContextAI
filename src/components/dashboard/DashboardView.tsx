import React from 'react';
import {
  Files,
  Layers,
  BotMessageSquare,
  HardDrive,
  Upload,
  ArrowRight,
  Eye,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  CheckSquare,
  Square,
  Globe,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MetricsCard } from './MetricsCard';
import { DocumentTypeIcon } from '../common/DocumentTypeIcon';
import { StatusBadge } from '../common/Badge';
import { CitationBadge } from '../chat/CitationBadge';
import { formatFileSize, formatRelativeTime } from '../../utils/cn';

export const DashboardView: React.FC = () => {
  const {
    documents,
    selectedDocumentIds,
    toggleDocumentSelection,
    setActiveTab,
    setIsUploadModalOpen,
    setIsWebsiteModalOpen,
    navigateToPreview,
    createDocumentChat,
    chatSession,
  } = useApp();

  const readyDocuments = documents.filter((d) => d.status === 'ready');
  const totalPages = readyDocuments.reduce((sum, d) => sum + d.totalPages, 0);
  const totalBytes = documents.reduce((sum, d) => sum + d.size, 0);

  const recentDocs = [...documents].slice(0, 4);

  // Extract real latest Q&A if any
  const userMessages = chatSession.messages.filter((m) => m.sender === 'user');
  const latestUserMessage = userMessages[userMessages.length - 1];
  const assistantMessages = chatSession.messages.filter((m) => m.sender === 'assistant');
  const latestAssistantMessage = assistantMessages[assistantMessages.length - 1];

  // User flow steps
  const flowSteps = [
    { title: 'Upload Document', desc: 'PDF, PPTX, Images, Notes', action: () => setIsUploadModalOpen(true) },
    { title: 'Processing', desc: 'Reading & Structuring', action: () => setActiveTab('documents') },
    { title: 'Ready to Use', desc: `${readyDocuments.length} ready`, action: () => setActiveTab('documents') },
    { title: 'Select Documents', desc: `${selectedDocumentIds.length} chosen (max 7)`, action: () => setActiveTab('chat') },
    { title: 'Ask Question', desc: 'Any question about files', action: () => setActiveTab('chat') },
    { title: 'AI Answer & Citations', desc: 'Exact page & slide source', action: () => setActiveTab('chat') },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-400/20">
            <Sparkles className="w-3.5 h-3.5" />
            Document Assistant
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ask anything about your documents
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 leading-relaxed">
            ContextAI reads your PDFs, presentation slides, images, and notes to give you clear answers
            with exact page and slide citations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-xl shadow-md transition-all hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
          <button
            onClick={() => setIsWebsiteModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/30 text-xs font-semibold rounded-xl backdrop-blur-xs transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Globe className="w-4 h-4 text-sky-300" />
            Add Website
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl backdrop-blur-xs border border-white/10 transition-all"
          >
            <BotMessageSquare className="w-4 h-4" />
            Open AI Chat
          </button>
        </div>
      </div>

      {/* Interactive Flow Roadmap */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              How It Works
            </h3>
            <p className="text-xs text-slate-500">
              Click any step to jump to that part of your workflow
            </p>
          </div>
          <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
            Personal Space
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {flowSteps.map((step, idx) => (
            <button
              key={step.title}
              onClick={step.action}
              className="group p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-indigo-50/50 hover:border-indigo-200 text-left transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold font-mono text-indigo-600">
                  0{idx + 1}
                </span>
                {idx < flowSteps.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
                )}
              </div>
              <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 truncate">
                {step.title}
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{step.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          label="Selected Sources"
          value={`${selectedDocumentIds.length} / ${documents.length}`}
          subtext="Documents chosen to answer your questions (max 7)"
          icon={Layers}
          iconColor="text-indigo-600"
          bgColor="bg-indigo-50"
          onClick={() => setActiveTab('documents')}
        />
        <MetricsCard
          label="Total Pages & Slides"
          value={totalPages}
          subtext="Uploaded across all ready documents"
          icon={Files}
          iconColor="text-emerald-600"
          bgColor="bg-emerald-50"
          onClick={() => setActiveTab('documents')}
        />
        <MetricsCard
          label="Questions Asked"
          value={chatSession.messages.length}
          subtext="Answers backed by your document sources"
          icon={BotMessageSquare}
          iconColor="text-sky-600"
          bgColor="bg-sky-50"
          onClick={() => setActiveTab('chat')}
        />
        <MetricsCard
          label="Document Storage"
          value={formatFileSize(totalBytes)}
          subtext="Total size of your uploaded documents"
          icon={HardDrive}
          iconColor="text-amber-600"
          bgColor="bg-amber-50"
          onClick={() => setActiveTab('settings')}
        />
      </div>

      {/* Two-Column Grid: Recent Documents & Active Chat Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Document Library Highlights */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 mb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Documents</h3>
                <p className="text-xs text-slate-500">
                  Manage your files and choose which ones to ask questions about
                </p>
              </div>
              {documents.length > 0 && (
                <button
                  onClick={() => setActiveTab('documents')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 hover:underline"
                >
                  View all ({documents.length})
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {documents.length === 0 ? (
              /* Friendly zero-state */
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 border border-indigo-100/60">
                  <Files className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No documents yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
                  Upload your first PDF, presentation slide deck, image, or notes to get started.
                </p>
                <button
                  onClick={() => setIsUploadModalOpen(true)}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
                >
                  Upload Document
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentDocs.map((doc) => {
                  const isSelected = doc.isSelectedAsSource;
                  const isReady = doc.status === 'ready';

                  return (
                    <div
                      key={doc.id}
                      className="py-3 flex items-center justify-between gap-4 group hover:bg-slate-50/60 px-2 rounded-xl transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => isReady && toggleDocumentSelection(doc.id)}
                          disabled={!isReady}
                          className="text-slate-400 hover:text-indigo-600 shrink-0"
                          title={isSelected ? 'Deselect document' : 'Select document'}
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>
                        <DocumentTypeIcon type={doc.type} size="md" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-800 truncate block">
                              {doc.name}
                            </span>
                            <StatusBadge status={doc.status} progress={doc.processingProgress} />
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <span>
                              {doc.totalPages} {doc.unitLabel}s
                            </span>
                            <span>•</span>
                            <span>{formatRelativeTime(doc.createdAt || doc.uploadDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Row Actions */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigateToPreview(doc.id, 1)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="Preview pages/slides"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => createDocumentChat(doc.id)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-medium transition-colors"
                        >
                          Ask AI
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {documents.length > 0 && (
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {selectedDocumentIds.length} document(s) chosen for questions
              </span>
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                + Upload another document
              </button>
            </div>
          )}
        </div>

        {/* Right 1 Col: Recent Q&A Thread Card */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BotMessageSquare className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">Latest Answer</h3>
              </div>
              <button
                onClick={() => setActiveTab('chat')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Go to Chat
              </button>
            </div>

            {latestUserMessage && latestAssistantMessage ? (
              <div className="space-y-3">
                {/* User Prompt snippet */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Question Asked
                  </span>
                  <p className="text-xs text-slate-700 font-medium line-clamp-2">
                    "{latestUserMessage.content}"
                  </p>
                </div>

                {/* AI Snippet & Citations */}
                <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                      Answer Snippet
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Grounded
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {latestAssistantMessage.content}
                  </p>

                  {latestAssistantMessage.citations && latestAssistantMessage.citations.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-indigo-100/80">
                      <span className="text-[10px] font-bold text-slate-600 block mb-1.5">Sources:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {latestAssistantMessage.citations.map((c) => (
                          <CitationBadge key={c.id} citation={c} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2">
                  <BotMessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700">No questions asked yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
                  Upload documents and ask ContextAI anything. Answers will appear here with sources.
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setActiveTab('chat')}
            className="w-full mt-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <span>Ask a question</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
