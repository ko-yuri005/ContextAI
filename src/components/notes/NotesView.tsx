import React, { useState } from 'react';
import {
  NotebookPen,
  Plus,
  Trash2,
  BotMessageSquare,
  Search,
  Sparkles,
  Save,
  Tag,
  Clock,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatRelativeTime } from '../../utils/cn';
import { TagBadge } from '../common/Badge';

export const NotesView: React.FC = () => {
  const {
    notes,
    activeNoteId,
    setActiveNoteId,
    createNote,
    updateNote,
    deleteNote,
    askAboutNote,
  } = useApp();

  const [search, setSearch] = useState('');

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const wordCount = activeNote
    ? activeNote.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] bg-white overflow-hidden">
      {/* Left Sidebar: Notes list */}
      <div className="w-full md:w-80 border-r border-slate-200 flex flex-col bg-slate-50/50 shrink-0">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <NotebookPen className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Workspace Notes</h3>
            </div>
            <button
              onClick={() => createNote('Untitled Note', '')}
              className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-xs transition-colors"
              title="Create note"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* List of notes */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredNotes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">No notes found</p>
          ) : (
            filteredNotes.map((note) => {
              const isActive = note.id === activeNote?.id;

              return (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className={`p-3 rounded-xl cursor-pointer text-left transition-all border ${
                    isActive
                      ? 'bg-white border-indigo-200 shadow-xs'
                      : 'border-transparent hover:bg-white/80 hover:border-slate-200'
                  }`}
                >
                  <h4 className="text-xs font-bold text-slate-900 truncate mb-1">
                    {note.title || 'Untitled Note'}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                    {note.content || 'No content yet...'}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{formatRelativeTime(note.updatedAt)}</span>
                    <div className="flex items-center gap-1">
                      {note.tags.map((t) => (
                        <TagBadge key={t} label={t} className="text-[9px] py-0 px-1" />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Note Content Editor */}
      {activeNote ? (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Editor Header */}
          <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Edited {formatRelativeTime(activeNote.updatedAt)}</span>
              <span>•</span>
              <span>{wordCount} words</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => askAboutNote(activeNote)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl border border-indigo-200 transition-colors shadow-2xs"
                title="Send note to AI chat for analysis or expansion"
              >
                <BotMessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ask AI about this Note</span>
              </button>

              <button
                onClick={() => deleteNote(activeNote.id)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto p-6 sm:p-8 max-w-3xl mx-auto w-full space-y-4">
            {/* Title Input */}
            <input
              type="text"
              value={activeNote.title}
              onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
              placeholder="Note Title..."
              className="w-full text-xl sm:text-2xl font-bold text-slate-900 border-none outline-hidden placeholder:text-slate-300"
            />

            {/* Content Textarea */}
            <textarea
              value={activeNote.content}
              onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
              placeholder="Write thoughts, extract insights from documents, or draft questions..."
              rows={16}
              className="w-full resize-none text-sm text-slate-700 leading-relaxed border-none outline-hidden placeholder:text-slate-300 font-sans"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-xs">
          Select or create a note to begin.
        </div>
      )}
    </div>
  );
};
