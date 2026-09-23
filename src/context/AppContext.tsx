import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Document,
  DocumentType,
  ChatSession,
  ChatMessage,
  Citation,
  Note,
  AppTab,
  PreviewTarget,
  ToastMessage,
} from '../types';
import { INITIAL_DOCUMENTS, INITIAL_CHAT_SESSION, INITIAL_NOTES } from '../data/mockData';

interface AppContextType {
  // Navigation
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  isWebsiteModalOpen: boolean;
  setIsWebsiteModalOpen: (open: boolean) => void;

  // Documents
  documents: Document[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (id: string) => void;
  selectAllDocuments: () => void;
  deselectAllDocuments: () => void;
  bulkDeleteDocuments: (ids: string[]) => Promise<boolean>;
  uploadDocument: (fileOrName: File | string, type?: DocumentType, size?: number) => Promise<Document | void>;
  ingestWebsite: (url: string) => Promise<Document>;
  addDocument: (doc: Document) => void;
  retryProcessing: (id: string) => void;

  // Document Preview
  previewTarget: PreviewTarget | null;
  navigateToPreview: (
    documentId: string,
    pageNumber?: number,
    highlightText?: string,
    sectionTitle?: string
  ) => void;
  setPreviewTarget: (target: PreviewTarget | null) => void;

  // Chat & Q&A
  chatSession: ChatSession;
  isAiThinking: boolean;
  streamingMessageId: string | null;
  sendMessage: (query: string) => void;
  clearChat: () => void;
  createDocumentChat: (documentId: string) => void;

  // Notes
  notes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  createNote: (title?: string, content?: string) => string;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  askAboutNote: (note: Note) => void;

  // Feedback & Toasts
  toasts: ToastMessage[];
  addToast: (title: string, message?: string, type?: ToastMessage['type']) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false);

  // Documents state
  const [documents, setDocuments] = useState<Document[]>(INITIAL_DOCUMENTS);
  const selectedDocumentIds = documents.filter((d) => d.isSelectedAsSource).map((d) => d.id);

  // Fetch persisted documents from SQLite database on mount
  useEffect(() => {
    let isMounted = true;
    fetch('/api/documents')
      .then((res) => (res.ok ? res.json() : []))
      .then((persistedDocs: Document[]) => {
        if (isMounted && Array.isArray(persistedDocs)) {
          setDocuments(persistedDocs);
        }
      })
      .catch((err) => {
        console.error('Failed to load persisted documents from SQLite:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Poll for background indexing completion when any document is 'processing'
  const hasProcessingDocs = documents.some((d) => d.status === 'processing');

  useEffect(() => {
    if (!hasProcessingDocs) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/documents');
        if (!res.ok) return;
        const freshDocs: Document[] = await res.json();
        if (!isMounted || !Array.isArray(freshDocs)) return;

        setDocuments((prev) => {
          // Check if any document completed background indexing
          freshDocs.forEach((freshDoc) => {
            const oldDoc = prev.find((p) => p.id === freshDoc.id);
            if (oldDoc && oldDoc.status === 'processing' && freshDoc.status === 'ready') {
              addToast(
                'Document Ready',
                `"${freshDoc.name}" finished indexing and is ready.`,
                'success'
              );
            }
          });

          // Merge fresh documents preserving client selection state
          return freshDocs.map((doc) => {
            const existing = prev.find((p) => p.id === doc.id);
            return {
              ...doc,
              isSelectedAsSource: existing ? existing.isSelectedAsSource : doc.isSelectedAsSource,
            };
          });
        });
      } catch (err) {
        console.error('Failed to poll document status:', err);
      }
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [hasProcessingDocs]);

  // Document Preview State
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);

  // Chat State
  const [chatSession, setChatSession] = useState<ChatSession>(INITIAL_CHAT_SESSION);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Notes State
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (title: string, message?: string, type: ToastMessage['type'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Toggle single document source selection (Max 7)
  const toggleDocumentSelection = (id: string) => {
    setDocuments((prev) => {
      const doc = prev.find((d) => d.id === id);
      if (!doc) return prev;

      if (doc.status !== 'ready') {
        addToast(
          'Indexing in Progress',
          `"${doc.name}" is still indexing and cannot be selected as a source yet.`,
          'warning'
        );
        return prev;
      }

      if (!doc.isSelectedAsSource) {
        const currentlySelected = prev.filter((d) => d.isSelectedAsSource).length;
        if (currentlySelected >= 7) {
          addToast('Limit Reached', 'You can select a maximum of 7 documents as sources.', 'warning');
          return prev;
        }
        // No toast for Document Selected to keep UI clean
        return prev.map((d) => (d.id === id ? { ...d, isSelectedAsSource: true } : d));
      } else {
        // No toast for Document Deselected to keep UI clean
        return prev.map((d) => (d.id === id ? { ...d, isSelectedAsSource: false } : d));
      }
    });
  };

  const selectAllDocuments = () => {
    setDocuments((prev) => {
      let count = 0;
      return prev.map((doc) => {
        if (doc.status === 'ready' && count < 7) {
          count++;
          return { ...doc, isSelectedAsSource: true };
        }
        return { ...doc, isSelectedAsSource: false };
      });
    });
    addToast('Ready Documents Selected', 'Up to 7 ready documents selected for questions.', 'success');
  };

  const deselectAllDocuments = () => {
    setDocuments((prev) => prev.map((doc) => ({ ...doc, isSelectedAsSource: false })));
    addToast('Selection Cleared', 'No documents are currently selected.', 'info');
  };

  const bulkDeleteDocuments = async (ids: string[]): Promise<boolean> => {
    if (!ids || ids.length === 0) return false;
    try {
      const res = await fetch(`/api/documents/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentIds: ids }),
      });
      if (!res.ok) {
        const errBody: unknown = await res.json().catch(() => null);
        const errMsg =
          errBody && typeof errBody === 'object' && 'error' in errBody && typeof errBody.error === 'string'
            ? errBody.error
            : `Failed to delete documents (${res.status})`;
        throw new Error(errMsg);
      }
      setDocuments((prev) => prev.filter((d) => !ids.includes(d.id)));
      if (previewTarget && ids.includes(previewTarget.documentId)) {
        setPreviewTarget(null);
      }
      addToast('Documents Deleted', `${ids.length} document${ids.length === 1 ? '' : 's'} deleted`, 'info');
      return true;
    } catch (err: unknown) {
      console.error('Failed to bulk delete documents:', err);
      const message = err instanceof Error ? err.message : 'Failed to delete documents.';
      addToast('Delete Failed', message, 'error');
      return false;
    }
  };

  const retryProcessing = (id: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: 'processing', processingProgress: 15 } : d))
    );
    addToast('Reprocessing Triggered', 'Document is being re-indexed...', 'info');

    setTimeout(() => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === id ? { ...d, status: 'ready', processingProgress: 100 } : d))
      );
      addToast('Document Ready', 'Re-indexing completed successfully.', 'success');
    }, 2800);
  };

  // Real Document Upload via POST /api/documents/upload
  const uploadDocument = async (
    fileOrName: File | string,
    type?: DocumentType,
    size?: number
  ): Promise<Document | void> => {
    if (fileOrName instanceof File) {
      const formData = new FormData();
      formData.append('file', fileOrName);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Upload failed (${res.status})`);
      }

      const doc: Document = await res.json();
      setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
      setPreviewTarget({ documentId: doc.id, pageNumber: 1 });
      addToast(
        'Document Ready',
        `"${doc.name}" was processed with ${doc.totalPages} ${doc.unitLabel}${doc.totalPages === 1 ? '' : 's'}.`,
        'success'
      );
      return doc;
    }
  };

  // Add real ingested/uploaded document to state
  const addDocument = (doc: Document) => {
    setDocuments((prev) => [doc, ...prev.filter((d) => d.id !== doc.id)]);
    setPreviewTarget({ documentId: doc.id, pageNumber: 1 });
  };

  // Real Website Ingestion via POST /api/websites/ingest
  const ingestWebsite = async (url: string): Promise<Document> => {
    const res = await fetch('/api/websites/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Failed to ingest website (${res.status})`);
    }

    const doc: Document = await res.json();
    addDocument(doc);
    setActiveTab('documents');
    if (doc.status === 'processing') {
      addToast(
        'Website Added',
        `"${doc.name}" added and indexing in the background...`,
        'info'
      );
    } else {
      addToast(
        'Website Ingested',
        `"${doc.name}" added with ${doc.totalPages} ${doc.unitLabel}${doc.totalPages === 1 ? '' : 's'}.`,
        'success'
      );
    }
    return doc;
  };

  // Direct navigation to Document Preview with target page & highlight
  const navigateToPreview = (
    documentId: string,
    pageNumber?: number,
    highlightText?: string,
    sectionTitle?: string
  ) => {
    setPreviewTarget({
      documentId,
      pageNumber,
      sectionTitle,
      highlightText,
    });
    setActiveTab('preview');
  };

  // Launch chat focused specifically on a given document
  const createDocumentChat = (documentId: string) => {
    setDocuments((prev) =>
      prev.map((d) => ({
        ...d,
        isSelectedAsSource: d.id === documentId,
      }))
    );
    setActiveTab('chat');
    addToast('Document Selected', 'AI Chat is now focused on this document.', 'info');
  };

  // Clear chat history
  const clearChat = () => {
    setChatSession((prev) => ({
      ...prev,
      messages: [],
      updatedAt: new Date().toISOString(),
    }));
    addToast('Chat Cleared', 'Conversation history was reset.', 'info');
  };

  // Send message and query real RAG backend
  const sendMessage = async (query: string) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || isAiThinking) return;

    // Snapshot recent conversation history before adding current query to avoid duplicate entry
    const historyPayload = chatSession.messages.slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      content: trimmedQuery,
      timestamp: new Date().toISOString(),
      activeSourceIds: [...selectedDocumentIds],
    };

    setChatSession((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      updatedAt: new Date().toISOString(),
    }));

    setIsAiThinking(true);

    try {
      const response = await fetch('/api/rag/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: trimmedQuery,
          documentIds: selectedDocumentIds.length > 0 ? selectedDocumentIds : undefined,
          topK: 5,
          conversation: historyPayload,
        }),
      });

      if (!response.ok) {
        let errorMsg = 'Failed to get answer from ContextAI.';
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errorMsg = errorData.error;
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMsg);
      }

      const data: {
        query: string;
        retrievalQuery: string;
        answer: string;
        citations: {
          id: number;
          documentId: string;
          documentName: string;
          chunkId: string;
          sectionTitle?: string;
          pageNumber?: number;
          snippet: string;
        }[];
      } = await response.json();

      // Map backend citations into frontend Citation type
      const mappedCitations: Citation[] = (data.citations || []).map((c) => {
        const matchingDoc = documents.find((d) => d.id === c.documentId);
        const docType = matchingDoc?.type || (matchingDoc?.url ? 'website' : 'pdf');
        return {
          id: c.id,
          documentId: c.documentId,
          documentName: c.documentName,
          documentType: docType,
          pageOrSlideNumber: docType === 'website' ? undefined : c.pageNumber,
          snippetText: c.snippet,
          confidenceScore: 1, // Neutral value for existing badge tooltip compatibility
          sectionTitle: c.sectionTitle,
        };
      });

      const assistantMessage: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'assistant',
        content: data.answer || '',
        timestamp: new Date().toISOString(),
        activeSourceIds: selectedDocumentIds.length > 0 ? [...selectedDocumentIds] : undefined,
        citations: mappedCitations.length > 0 ? mappedCitations : undefined,
      };

      setChatSession((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        updatedAt: new Date().toISOString(),
      }));
    } catch (err: any) {
      console.error('Error in sendMessage RAG query:', err);
      const errorMessage =
        err?.message && err.message !== 'Failed to fetch'
          ? err.message
          : "Sorry, I couldn't answer that right now. Please try again.";

      const assistantErrorMessage: ChatMessage = {
        id: `msg-ai-err-${Date.now()}`,
        sender: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString(),
      };

      setChatSession((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantErrorMessage],
        updatedAt: new Date().toISOString(),
      }));

      addToast('Query Failed', errorMessage, 'error');
    } finally {
      setIsAiThinking(false);
      setStreamingMessageId(null);
    }
  };

  // Notes operations
  const createNote = (title = 'Untitled Note', content = ''): string => {
    const id = `note-${Date.now()}`;
    const newNote: Note = {
      id,
      title,
      content,
      updatedAt: new Date().toISOString(),
      tags: ['Workspace'],
    };
    setNotes((prev) => [newNote, ...prev]);
    setActiveNoteId(id);
    addToast('Note Created', `New note "${title}" created.`, 'success');
    return id;
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(notes.find((n) => n.id !== id)?.id || null);
    }
    addToast('Note Removed', 'Note was deleted.', 'info');
  };

  const askAboutNote = (note: Note) => {
    // Add note as a document if not already added, or trigger a chat prompt
    sendMessage(`Summarize and provide actionable suggestions for the note titled "${note.title}":\n\n${note.content}`);
    setActiveTab('chat');
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isCommandPaletteOpen,
        setIsCommandPaletteOpen,
        isUploadModalOpen,
        setIsUploadModalOpen,
        isWebsiteModalOpen,
        setIsWebsiteModalOpen,
        documents,
        selectedDocumentIds,
        toggleDocumentSelection,
        selectAllDocuments,
        deselectAllDocuments,
        bulkDeleteDocuments,
        uploadDocument,
        ingestWebsite,
        addDocument,
        retryProcessing,
        previewTarget,
        navigateToPreview,
        setPreviewTarget,
        chatSession,
        isAiThinking,
        streamingMessageId,
        sendMessage,
        clearChat,
        createDocumentChat,
        notes,
        activeNoteId,
        setActiveNoteId,
        createNote,
        updateNote,
        deleteNote,
        askAboutNote,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
