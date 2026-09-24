# ContextAI

ContextAI is an AI-powered knowledge assistant that allows users to interact with their own documents and web content using natural-language questions.

The application combines document ingestion, semantic search, embeddings, and Retrieval-Augmented Generation (RAG) to generate answers based on the provided knowledge.

## Features

- Upload PDF, TXT, and Markdown files
- Add public website URLs as knowledge sources
- Extract and chunk document content
- Semantic search using Gemini embeddings
- RAG-based question answering
- Context-aware follow-up questions
- Store documents and chunks using SQLite
- Background processing for website indexing

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS

### Backend

- Node.js
- Express
- TypeScript

### AI and Data

- Google Gemini
- Gemini Embeddings
- Retrieval-Augmented Generation (RAG)
- SQLite
- PDF and web content processing

## How It Works

```text
Document / Website
       |
       v
Text Extraction
       |
       v
Text Chunking
       |
       v
Gemini Embeddings
       |
       v
Semantic Search
       |
       v
Relevant Context
       |
       v
Google Gemini
       |
       v
AI-generated Answer
