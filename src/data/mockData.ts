import { Document, ChatSession, Note } from '../types';

export const INITIAL_DOCUMENTS: Document[] = [];

export const INITIAL_CHAT_SESSION: ChatSession = {
  id: 'session-main',
  title: 'New Conversation',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  selectedSourceDocumentIds: [],
  messages: []
};

export const INITIAL_NOTES: Note[] = [];

export const SUGGESTED_QUERIES = [
  'Summarize this document',
  'Explain this topic simply',
  'What are the key points?',
  'Find important information'
];
