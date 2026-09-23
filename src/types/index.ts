export type DocumentType = 'pdf' | 'website' | 'pptx' | 'image' | 'note';

export type DocumentStatus = 'ready' | 'processing' | 'failed';

export type DocumentUnit = 'page' | 'slide' | 'section';

export interface DocumentChunk {
  id: string;
  documentId: string;
  text: string;
  pageNumber?: number;
  sectionTitle?: string;
  tokenCount: number;
  embedding?: number[] | null;
  embeddingModel?: string | null;
  embeddingDimension?: number | null;
  // Backward compatibility aliases for preview UI
  pageOrSlideNumber: number;
  snippet: string;
}

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  url?: string;
  domain?: string;
  size: number;
  uploadDate: string;
  status: DocumentStatus;
  processingProgress?: number; // 0-100 for progress
  totalPages: number;
  unitLabel: DocumentUnit;
  summary: string;
  tags: string[];
  isSelectedAsSource: boolean;
  text?: string;
  errorMessage?: string;
  pages?: {
    pageNumber: number;
    title?: string;
    content: string;
  }[];
  chunks?: DocumentChunk[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Citation {
  id: string | number;
  documentId: string;
  documentName: string;
  documentType: DocumentType;
  pageOrSlideNumber?: number;
  snippetText: string;
  confidenceScore: number; // e.g. 0.94
  sectionTitle?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  activeSourceIds?: string[];
  isStreaming?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  selectedSourceDocumentIds: string[];
  messages: ChatMessage[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
  tags: string[];
}

export type AppTab = 'dashboard' | 'documents' | 'chat' | 'notes' | 'preview' | 'settings';

export interface PreviewTarget {
  documentId: string;
  pageNumber?: number;
  sectionTitle?: string;
  highlightText?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}
