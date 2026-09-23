import React, { useState } from 'react';
import {
  Sliders,
  Cpu,
  Database,
  FileCheck,
  RotateCcw,
  Save,
  HardDrive,
  Shield,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { documents, addToast } = useApp();

  const [model, setModel] = useState('context-neural-v2');
  const [topK, setTopK] = useState(5);
  const [chunkSize, setChunkSize] = useState(512);
  const [minConfidence, setMinConfidence] = useState(85);
  const [ocrEnabled, setOcrEnabled] = useState(true);
  const [tableTopology, setTableTopology] = useState(true);

  const readyDocuments = documents.filter((d) => d.status === 'ready');
  const totalPages = readyDocuments.reduce((sum, d) => sum + d.totalPages, 0);

  const handleSave = () => {
    addToast('Settings Updated', 'Retrieval engine parameters saved.', 'success');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Workspace & Search Settings
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Adjust how ContextAI reads your documents and finds answers.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Preferences</span>
        </button>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Section 1: Retrieval & Grounding Engine */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Answer Accuracy & Search Settings
              </h3>
              <p className="text-xs text-slate-500">
                Controls how thoroughly ContextAI searches your documents before answering
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Model Engine Mock */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                AI Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-hidden focus:border-indigo-500"
              >
                <option value="context-neural-v2">ContextAI Default (Optimized for Citations)</option>
                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                <option value="gpt-4o-grounded">GPT-4o</option>
                <option value="gemini-1-5-pro">Gemini 1.5 Pro</option>
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Answers will be backed directly by your uploaded files.
              </span>
            </div>

            {/* Top-K Chunks */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Sections Searched per Question
                </label>
                <span className="text-xs font-mono font-bold text-indigo-600">{topK} sections</span>
              </div>
              <input
                type="range"
                min={2}
                max={12}
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Higher values search more sections of your documents for each question.
              </span>
            </div>

            {/* Chunk Size */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Section Size</label>
                <span className="text-xs font-mono font-bold text-indigo-600">
                  {chunkSize} tokens
                </span>
              </div>
              <input
                type="range"
                min={256}
                max={1024}
                step={128}
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Recommended 512 tokens for balanced page-level citation accuracy.
              </span>
            </div>

            {/* Min Confidence Threshold */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Citation Strictness
                </label>
                <span className="text-xs font-mono font-bold text-emerald-600">
                  {minConfidence}%
                </span>
              </div>
              <input
                type="range"
                min={70}
                max={95}
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Only shows citations when the AI is confident the source text matches.
              </span>
            </div>
          </div>
        </div>

        {/* Section 2: Ingestion & OCR policies */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Document Reading Options</h3>
              <p className="text-xs text-slate-500">
                Toggle automatic text reading from images and table layout preservation
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Automatic Text Reading (OCR) for Images & Scans
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Reads text from JPG, PNG, and scanned PDF pages so you can search them.
                </span>
              </div>
              <input
                type="checkbox"
                checked={ocrEnabled}
                onChange={(e) => setOcrEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded accent-indigo-600"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200/80 hover:bg-slate-50 cursor-pointer transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Table & Spreadsheet Structure Preservation
                </span>
                <span className="text-[11px] text-slate-500 block">
                  Keeps table rows and columns aligned so questions about numbers return accurate results.
                </span>
              </div>
              <input
                type="checkbox"
                checked={tableTopology}
                onChange={(e) => setTableTopology(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded accent-indigo-600"
              />
            </label>
          </div>
        </div>

        {/* Section 3: Storage */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 mb-4">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Document Storage</h3>
              <p className="text-xs text-slate-500">
                Storage breakdown for your uploaded files
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Total Files
              </span>
              <span className="text-lg font-bold text-slate-800 block mt-1">
                {documents.length} {documents.length === 1 ? 'File' : 'Files'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Total Pages & Slides
              </span>
              <span className="text-lg font-bold text-indigo-600 block mt-1">
                {totalPages} Pages/Slides
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Index Status
              </span>
              <span className="text-lg font-bold text-slate-800 block mt-1">
                {documents.length > 0 ? 'Active' : 'Idle'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
