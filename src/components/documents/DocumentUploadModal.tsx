import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  FileText,
  Presentation,
  Image as ImageIcon,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DocumentType } from '../../types';
import { cn } from '../../utils/cn';

export const DocumentUploadModal: React.FC = () => {
  const { isUploadModalOpen, setIsUploadModalOpen, uploadDocument } = useApp();
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState<DocumentType>('pdf');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isUploadModalOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setErrorMessage(null);

    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
    if (file.size > MAX_FILE_SIZE) {
      setErrorMessage('File is too large. Maximum size is 50 MB.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    setIsUploading(true);
    setUploadProgress(20);
    setUploadStage('Uploading document to server...');

    const progressTimer1 = setTimeout(() => {
      setUploadProgress(55);
      setUploadStage('Extracting text, pages, and structure...');
    }, 400);

    const progressTimer2 = setTimeout(() => {
      setUploadProgress(85);
      setUploadStage('Finalizing document indexing...');
    }, 1000);

    try {
      await uploadDocument(file);
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      setUploadProgress(100);
      setUploadStage('Document ready!');
      setTimeout(() => {
        setIsUploading(false);
        setIsUploadModalOpen(false);
        setUploadProgress(0);
      }, 500);
    } catch (err: any) {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      setIsUploading(false);
      setUploadProgress(0);
      setErrorMessage(err.message || 'Failed to upload and process document.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Upload Documents</h3>
              <p className="text-xs text-slate-500">Supports PDF, PPTX slides, images, and text notes</p>
            </div>
          </div>
          <button
            onClick={() => !isUploading && setIsUploadModalOpen(false)}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Supported Format Badges */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { type: 'pdf' as DocumentType, label: 'PDF Docs', ext: '.pdf', icon: FileText, color: 'text-rose-600 bg-rose-50 border-rose-100' },
              { type: 'pptx' as DocumentType, label: 'Slide Decks', ext: '.pptx, .ppt', icon: Presentation, color: 'text-amber-600 bg-amber-50 border-amber-100' },
              { type: 'image' as DocumentType, label: 'Images', ext: '.jpg, .png', icon: ImageIcon, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
              { type: 'note' as DocumentType, label: 'Text/Notes', ext: '.md, .txt', icon: FileCode, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
            ].map((fmt) => {
              const Icon = fmt.icon;
              return (
                <div
                  key={fmt.type}
                  className={cn(
                    'p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all',
                    fmt.color
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[11px] font-bold block">{fmt.label}</span>
                  <span className="text-[9px] text-slate-500 block">{fmt.ext}</span>
                </div>
              );
            })}
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3 text-xs text-rose-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-rose-900 mb-0.5">Upload Failed</p>
                <p className="text-rose-700 leading-relaxed">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Drag & Drop Area */}
          {!isUploading ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center group',
                dragActive
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                  : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/70'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple={false}
                accept=".pdf,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.txt,.md"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">
                Click to browse or drop your file here
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                We will read your file so you can ask questions with page and slide citations. Max 50 MB.
              </p>
            </div>
          ) : (
            /* Upload in-progress state */
            <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-6 text-center space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{uploadStage}</h4>
                <p className="text-xs text-slate-500 mt-0.5">Please keep the window open</p>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-indigo-700">
                  <span>Processing</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-indigo-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
