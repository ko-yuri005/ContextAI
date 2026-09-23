import React, { useState } from 'react';
import {
  Globe,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type IngestStep = 'idle' | 'validating' | 'fetching' | 'extracting' | 'ready';

export const AddWebsiteModal: React.FC = () => {
  const {
    isWebsiteModalOpen,
    setIsWebsiteModalOpen,
    addDocument,
    setActiveTab,
    addToast,
  } = useApp();

  const [url, setUrl] = useState('');
  const [ingestStep, setIngestStep] = useState<IngestStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isWebsiteModalOpen) return null;

  const isProcessing = ingestStep !== 'idle';

  const handleClose = () => {
    if (isProcessing) return;
    setUrl('');
    setErrorMessage(null);
    setIngestStep('idle');
    setIsWebsiteModalOpen(false);
  };

  const getStepText = () => {
    switch (ingestStep) {
      case 'validating':
        return 'Validating URL...';
      case 'fetching':
        return 'Fetching & extracting content...';
      case 'extracting':
        return 'Processing sections...';
      case 'ready':
        return 'Website added';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = url.trim();

    if (!cleanUrl) {
      setErrorMessage('Please enter a website URL.');
      return;
    }

    setErrorMessage(null);

    // 1. Validating URL...
    setIngestStep('validating');
    try {
      const parsed = new URL(cleanUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Only http:// and https:// URLs are allowed.');
      }
    } catch (err: any) {
      setIngestStep('idle');
      setErrorMessage(err.message || 'Please enter a valid HTTP or HTTPS URL.');
      return;
    }

    // 2. Fetching & extracting website content...
    setIngestStep('fetching');

    try {
      const response = await fetch('/api/websites/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cleanUrl }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Server returned error (${response.status})`);
      }

      // 3. Document ready / added
      setIngestStep('ready');
      addDocument(data);
      setActiveTab('documents');
      if (data.status === 'processing') {
        addToast(
          'Website Added',
          `"${data.name}" added and indexing in the background...`,
          'info'
        );
      } else {
        addToast(
          'Website Ingested',
          `"${data.name}" added with ${data.totalPages} ${data.unitLabel}${data.totalPages === 1 ? '' : 's'}.`,
          'success'
        );
      }

      // Close modal and show in Documents
      setUrl('');
      setIngestStep('idle');
      setIsWebsiteModalOpen(false);
    } catch (err: any) {
      setIngestStep('idle');
      setErrorMessage(err.message || 'Failed to ingest website. Please check the URL and try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Add Website</h3>
              <p className="text-xs text-slate-500">Ingest a public article or documentation page</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label htmlFor="website-url" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Website URL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-4 h-4" />
              </div>
              <input
                id="website-url"
                type="url"
                disabled={isProcessing}
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="https://example.com/article"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-slate-900 placeholder:text-slate-400"
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Public HTTP & HTTPS pages only. Ads, scripts, and navigation are automatically removed.
            </p>
          </div>

          {/* Processing State with 4 genuine UI stages */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-100 flex items-center gap-3 animate-in fade-in">
              {ingestStep === 'ready' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-sky-600 animate-spin shrink-0" />
              )}
              <div className="text-xs">
                <p className="font-semibold text-slate-900">{getStepText()}</p>
                <p className="text-slate-500 mt-0.5">
                  {ingestStep === 'validating' && 'Verifying protocol and URL formatting'}
                  {ingestStep === 'fetching' && 'Connecting to web server and extracting readable content'}
                  {ingestStep === 'extracting' && 'Saving sections and preparing background indexing'}
                  {ingestStep === 'ready' && 'Document added'}
                </p>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900 mb-0.5">Could not ingest website</p>
                <p className="text-rose-700 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Example URLs for testing convenience */}
          {!isProcessing && !errorMessage && (
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-600 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Quick examples:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'https://en.wikipedia.org/wiki/Artificial_intelligence',
                  'https://example.com',
                ].map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setUrl(sample)}
                    className="text-[11px] font-mono bg-white hover:bg-sky-50 hover:text-sky-700 text-slate-600 border border-slate-200 rounded-md px-2 py-1 transition-colors truncate max-w-full"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing || !url.trim()}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {getStepText()}
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  Add Website Source
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
