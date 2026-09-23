import React from 'react';
import { Layers, Plus, X, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocumentTypeIcon } from '../common/DocumentTypeIcon';

export const ActiveSourcesBar: React.FC = () => {
  const {
    documents,
    selectedDocumentIds,
    toggleDocumentSelection,
    setActiveTab,
  } = useApp();

  const activeDocs = documents.filter((d) => d.isSelectedAsSource);

  return (
    <div className="bg-slate-50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between gap-3 overflow-x-auto">
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 shrink-0">
          <Layers className="w-3.5 h-3.5 text-indigo-600" />
          <span>Selected Sources ({activeDocs.length}):</span>
        </div>

        {activeDocs.length === 0 ? (
          <div className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
            <span>No documents selected. Choose documents so the AI knows what to answer from.</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
            {activeDocs.map((doc) => (
              <span
                key={doc.id}
                className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-lg text-xs bg-white text-slate-800 border border-slate-200 shadow-2xs shrink-0"
              >
                <DocumentTypeIcon type={doc.type} size="sm" className="p-0.5" />
                <span className="font-medium max-w-[140px] truncate">{doc.name}</span>
                <button
                  type="button"
                  onClick={() => toggleDocumentSelection(doc.id)}
                  className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                  title="Deselect this document"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Add / Change sources button */}
      <button
        onClick={() => setActiveTab('documents')}
        className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 shrink-0 ml-2"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Manage Sources</span>
      </button>
    </div>
  );
};
