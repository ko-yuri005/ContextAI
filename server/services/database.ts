import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the server/data directory exists
const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'contextai.db');

export interface StoredDocument {
  id: string;
  name: string;
  type: 'pdf' | 'website' | 'pptx' | 'image' | 'note';
  url?: string | null;
  domain?: string | null;
  size: number;
  uploadDate: string;
  status: 'ready' | 'processing' | 'failed';
  totalPages: number;
  unitLabel: 'page' | 'slide' | 'section';
  summary: string;
  tags: string[];
  isSelectedAsSource: boolean;
  text?: string;
  pages?: {
    pageNumber: number;
    title?: string;
    content: string;
  }[];
  chunks?: {
    id: string;
    documentId?: string;
    text?: string;
    pageNumber?: number;
    sectionTitle?: string;
    tokenCount: number;
    pageOrSlideNumber?: number;
    snippet?: string;
    embedding?: number[] | null;
    embeddingModel?: string | null;
    embeddingDimension?: number | null;
  }[];
  createdAt: string;
  updatedAt: string;
}

let db: any = null;

/**
 * Initializes the SQLite database, configures pragmas, and creates the documents table.
 */
export function getDb(): any {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT,
        domain TEXT,
        size INTEGER NOT NULL DEFAULT 0,
        uploadDate TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ready',
        totalPages INTEGER NOT NULL DEFAULT 1,
        unitLabel TEXT NOT NULL DEFAULT 'page',
        summary TEXT,
        tags TEXT,
        text TEXT,
        pages TEXT,
        chunks TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  }
  return db;
}

/**
 * Helper to deserialize database row into a StoredDocument.
 */
function rowToDocument(row: any): StoredDocument {
  let tags: string[] = [];
  let pages: any[] = [];
  let chunks: any[] = [];

  try {
    tags = row.tags ? JSON.parse(row.tags) : [];
  } catch {
    tags = [];
  }

  try {
    pages = row.pages ? JSON.parse(row.pages) : [];
  } catch {
    pages = [];
  }

  try {
    chunks = row.chunks ? JSON.parse(row.chunks) : [];
  } catch {
    chunks = [];
  }

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url || undefined,
    domain: row.domain || undefined,
    size: Number(row.size) || 0,
    uploadDate: (row.uploadDate && !isNaN(new Date(row.uploadDate).getTime()))
      ? row.uploadDate
      : (row.createdAt || row.uploadDate || new Date().toISOString()),
    status: row.status || 'ready',
    totalPages: Number(row.totalPages) || 1,
    unitLabel: row.unitLabel || 'page',
    summary: row.summary || '',
    tags,
    isSelectedAsSource: false,
    text: row.text || undefined,
    pages,
    chunks,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Inserts or replaces a document in the database.
 */
export function insertDocument(doc: {
  id: string;
  name: string;
  type: 'pdf' | 'website' | 'pptx' | 'image' | 'note';
  url?: string | null;
  domain?: string | null;
  size: number;
  uploadDate: string;
  status: 'ready' | 'processing' | 'failed';
  totalPages: number;
  unitLabel: 'page' | 'slide' | 'section';
  summary: string;
  tags?: string[];
  text?: string;
  pages?: any[];
  chunks?: any[];
  createdAt?: string;
  updatedAt?: string;
}): StoredDocument {
  const database = getDb();
  const now = new Date().toISOString();
  const createdAt = doc.createdAt || now;
  const updatedAt = doc.updatedAt || now;

  let domain = doc.domain;
  if (!domain && doc.url) {
    try {
      domain = new URL(doc.url).hostname.replace(/^www\./, '');
    } catch {
      domain = undefined;
    }
  }

  const tagsJson = JSON.stringify(doc.tags || []);
  const pagesJson = JSON.stringify(doc.pages || []);
  const chunksJson = JSON.stringify(doc.chunks || []);

  const stmt = database.prepare(`
    INSERT OR REPLACE INTO documents (
      id, name, type, url, domain, size, uploadDate, status,
      totalPages, unitLabel, summary, tags, text, pages, chunks,
      createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?
    )
  `);

  stmt.run(
    doc.id,
    doc.name,
    doc.type,
    doc.url || null,
    domain || null,
    doc.size,
    doc.uploadDate,
    doc.status,
    doc.totalPages,
    doc.unitLabel,
    doc.summary || '',
    tagsJson,
    doc.text || '',
    pagesJson,
    chunksJson,
    createdAt,
    updatedAt
  );

  return rowToDocument({
    ...doc,
    domain,
    tags: tagsJson,
    pages: pagesJson,
    chunks: chunksJson,
    createdAt,
    updatedAt,
  });
}

/**
 * Retrieves all stored documents ordered newest to oldest.
 */
export function getAllDocuments(): StoredDocument[] {
  const database = getDb();
  const rows = database.prepare(`SELECT * FROM documents ORDER BY createdAt DESC`).all();
  return rows.map(rowToDocument);
}

/**
 * Retrieves a single document by its ID.
 */
export function getDocumentById(id: string): StoredDocument | null {
  const database = getDb();
  const row = database.prepare(`SELECT * FROM documents WHERE id = ?`).get(id);
  if (!row) return null;
  return rowToDocument(row);
}

/**
 * Deletes a document by its ID.
 */
export function deleteDocument(id: string): boolean {
  const database = getDb();
  const result = database.prepare(`DELETE FROM documents WHERE id = ?`).run(id);
  return result.changes > 0;
}

/**
 * Bulk deletes documents by their IDs using a transaction.
 * Returns the array of IDs that were successfully deleted.
 */
export function deleteDocumentsBulk(ids: string[]): string[] {
  if (!ids || ids.length === 0) return [];
  const database = getDb();
  
  const deletedIds: string[] = [];
  
  const transaction = database.transaction((documentIds: string[]) => {
    const stmt = database.prepare(`DELETE FROM documents WHERE id = ?`);
    for (const id of documentIds) {
      const result = stmt.run(id);
      if (result.changes > 0) {
        deletedIds.push(id);
      }
    }
  });
  
  transaction(ids);
  return deletedIds;
}

/**
 * Updates a document's status, chunks, and updatedAt timestamp.
 */
export function updateDocumentStatusAndChunks(
  id: string,
  status: 'ready' | 'processing' | 'failed',
  chunks?: any[],
  summary?: string
): StoredDocument | null {
  const database = getDb();
  const existing = getDocumentById(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const chunksJson = chunks !== undefined ? JSON.stringify(chunks) : JSON.stringify(existing.chunks || []);
  const summaryVal = summary !== undefined ? summary : existing.summary;

  const stmt = database.prepare(`
    UPDATE documents
    SET status = ?, chunks = ?, summary = ?, updatedAt = ?
    WHERE id = ?
  `);

  stmt.run(status, chunksJson, summaryVal, now, id);
  return getDocumentById(id);
}

export interface EmbeddedChunkItem {
  id: string;
  documentId: string;
  documentName: string;
  text: string;
  pageNumber?: number;
  sectionTitle?: string;
  tokenCount: number;
  pageOrSlideNumber?: number;
  snippet?: string;
  embedding: number[];
  embeddingModel?: string;
  embeddingDimension?: number;
}

/**
 * Retrieves all document chunks that have valid embeddings from the database.
 * If documentIds is provided and non-empty, only chunks from those documents are returned.
 * Read-only operation; does not modify stored embeddings.
 */
export function getEmbeddedChunks(documentIds?: string[]): EmbeddedChunkItem[] {
  const database = getDb();
  let rows: any[] = [];

  if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
    const validIds = documentIds.filter((id) => typeof id === 'string' && id.trim().length > 0);
    if (validIds.length === 0) {
      return [];
    }
    const placeholders = validIds.map(() => '?').join(', ');
    rows = database
      .prepare(`SELECT id, name, chunks FROM documents WHERE id IN (${placeholders})`)
      .all(...validIds);
  } else {
    rows = database.prepare(`SELECT id, name, chunks FROM documents`).all();
  }

  const embeddedChunks: EmbeddedChunkItem[] = [];

  for (const row of rows) {
    if (!row.chunks) continue;
    let chunks: any[] = [];
    try {
      chunks = JSON.parse(row.chunks);
    } catch {
      continue;
    }

    if (!Array.isArray(chunks)) continue;

    for (const chunk of chunks) {
      if (
        chunk &&
        Array.isArray(chunk.embedding) &&
        chunk.embedding.length > 0 &&
        typeof chunk.embedding[0] === 'number'
      ) {
        embeddedChunks.push({
          id: chunk.id,
          documentId: chunk.documentId || row.id,
          documentName: row.name,
          text: chunk.text || '',
          pageNumber: chunk.pageNumber ?? chunk.pageOrSlideNumber ?? 1,
          sectionTitle: chunk.sectionTitle || '',
          tokenCount: chunk.tokenCount || 0,
          pageOrSlideNumber: chunk.pageOrSlideNumber ?? chunk.pageNumber ?? 1,
          snippet: chunk.snippet || (chunk.text ? chunk.text.slice(0, 240) + '...' : ''),
          embedding: chunk.embedding,
          embeddingModel: chunk.embeddingModel || undefined,
          embeddingDimension: chunk.embeddingDimension || chunk.embedding.length,
        });
      }
    }
  }

  return embeddedChunks;
}
