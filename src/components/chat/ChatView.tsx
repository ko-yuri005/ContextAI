import React, { useRef, useEffect, useState } from 'react';
import {
  RotateCcw,
  Sparkles,
  BotMessageSquare,
  Layers,
  ChevronDown,
  Check,
  CheckSquare,
  Square,
  Upload,
  ExternalLink,
  Globe,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Document } from '../../types';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInput } from './ChatInput';
import { DocumentTypeIcon } from '../common/DocumentTypeIcon';
import { cn } from '../../utils/cn';

export const ChatView: React.FC = () => {
  const {
    chatSession,
    isAiThinking,
    clearChat,
    sendMessage,
    documents,
    selectedDocumentIds,
    toggleDocumentSelection,
    bulkDeleteDocuments,
    setIsUploadModalOpen,
    setIsWebsiteModalOpen,
  } = useApp();

  const [input, setInput] = useState('');
  const [isSourceSelectorOpen, setIsSourceSelectorOpen] = useState(false);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<string>>(new Set());
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const sourceSelectorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Close source dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sourceSelectorRef.current &&
        !sourceSelectorRef.current.contains(event.target as Node)
      ) {
        setIsSourceSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatSession.messages, isAiThinking]);

  // Clickable suggestions that populate and send the question when explicitly clicked
  const handleSelectSuggestion = (text: string) => {
    sendMessage(text);
    setInput('');
  };

  const readyDocuments = documents.filter((d) => d.status === 'ready');

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Top Header */}
      <div className="h-16 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-white z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BotMessageSquare className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
              AI Chat
            </h2>
            <p className="text-xs text-slate-500 truncate">
              Ask questions about your uploaded documents.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Compact Source Selection Control Popover */}
          <div className="relative" ref={sourceSelectorRef}>
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setIsSourceSelectorOpen(!isSourceSelectorOpen)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-700 hover:text-indigo-700 hover:bg-white font-medium transition-colors"
                title="View selected source files"
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>
                  Sources: <strong className="text-slate-900">{selectedDocumentIds.length}</strong> selected
                </span>
              </button>
              <span className="w-px h-3.5 bg-slate-200 my-auto" />
              <button
                type="button"
                onClick={() => setIsSourceSelectorOpen(!isSourceSelectorOpen)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold transition-colors"
                title="Manage source documents"
              >
                <span>Manage Sources</span>
                <ChevronDown
                  className={cn(
                    'w-3 h-3 transition-transform duration-200',
                    isSourceSelectorOpen && 'rotate-180'
                  )}
                />
              </button>
            </div>

            {/* Dropdown / Popover Content */}
            {isSourceSelectorOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-92 bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 z-50 animate-slide-up">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Select Sources</h4>
                    <p className="text-[11px] text-slate-500">
                      Limit: up to 7 documents at a time
                    </p>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {selectedDocumentIds.length} / 7
                  </span>
                </div>

                {/* List or Empty Notice */}
                <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
                  {documents.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-slate-500 leading-relaxed">
                        No sources yet. Upload a file or add a public website URL.
                      </p>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsSourceSelectorOpen(false);
                            setIsWebsiteModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-semibold rounded-xl transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Add Website</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSourceSelectorOpen(false);
                            setIsUploadModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                        </button>
                      </div>
                    </div>
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
                            'group/item flex items-center gap-2.5 p-2 rounded-xl transition-all select-none text-left cursor-pointer',
                            isSelected
                              ? 'bg-indigo-50/60 border border-indigo-200/80'
                              : 'hover:bg-slate-50 border border-transparent',
                            !isReady && 'opacity-50 cursor-not-allowed'
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

                {/* Popover Footer */}
                {documents.length > 0 && (
                  <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                    {selectedForDeletion.size > 0 ? (
                      <>
                        <span className="text-[11px] font-semibold text-rose-600">
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsSourceSelectorOpen(false);
                              setIsUploadModalOpen(true);
                            }}
                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1"
                          >
                            + Upload file
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsSourceSelectorOpen(false);
                              setIsWebsiteModalOpen(true);
                            }}
                            className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
                          >
                            + Add website
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsSourceSelectorOpen(false)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                          Done
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reset / Clear Chat button */}
          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Reset conversation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Chat</span>
          </button>
        </div>
      </div>

      {/* Message List / Empty State */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 flex flex-col">
        {chatSession.messages.length === 0 ? (
          /* Large Clean Empty Chat State */
          <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center max-w-2xl mx-auto w-full">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 border border-indigo-100/80 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Ask anything about your documents
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md leading-relaxed">
              Select a document and ask a question to get started.
            </p>

            {/* 4 Suggested Question Pills */}
            <div className="mt-7 flex flex-wrap justify-center gap-2 sm:gap-2.5 max-w-lg">
              {[
                'Summarize this document',
                'Explain this topic simply',
                'What are the key points?',
                'Find important information',
              ].map((queryText) => (
                <button
                  key={queryText}
                  type="button"
                  onClick={() => handleSelectSuggestion(queryText)}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 text-slate-700 text-xs sm:text-sm font-medium border border-slate-200/80 shadow-2xs transition-all hover:-translate-y-0.5 cursor-pointer"
                >
                  {queryText}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Active Chat Stream */
          <div className="flex-1">
            {chatSession.messages.map((msg) => (
              <ChatMessageItem key={msg.id} message={msg} />
            ))}

            {/* AI Thinking Indicator */}
            {isAiThinking && (
              <div className="flex gap-4 py-4 px-4 sm:px-6 bg-slate-50/50">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">ContextAI</span>
                    <span className="text-[10px] text-indigo-600 font-medium">
                      Consulting {selectedDocumentIds.length} source file(s)...
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                    <span className="text-xs text-slate-400">
                      Reading passages and preparing citations...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Main Focus Chat Input */}
      <ChatInput input={input} setInput={setInput} textareaRef={textareaRef} />

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
                    setIsSourceSelectorOpen(false);
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
    </div>
  );
};
