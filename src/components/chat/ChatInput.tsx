import React, { useRef, useEffect } from 'react';
import { Paperclip, ArrowUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ChatInputProps {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export const ChatInput: React.FC<ChatInputProps> = ({ input, setInput, textareaRef }) => {
  const { sendMessage, isAiThinking, selectedDocumentIds, setIsUploadModalOpen } = useApp();

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isAiThinking) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  return (
    <div className="p-4 sm:p-5 bg-white border-t border-slate-100 shrink-0">
      <div className="max-w-3xl mx-auto">
        {/* Main Input Box Container */}
        <div className="relative border border-slate-200 hover:border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 rounded-2xl bg-white shadow-xs transition-all p-3">
          <textarea
            ref={textareaRef}
            rows={2}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={isAiThinking}
            placeholder="Ask a question about your documents..."
            className="w-full bg-transparent resize-none border-none outline-hidden text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 px-1 py-1 max-h-44 leading-relaxed"
          />

          {/* Bottom toolbar inside input box */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 mt-1">
            {/* Left side: 📎 Attach button */}
            <button
              type="button"
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Upload and attach a document"
            >
              <Paperclip className="w-4 h-4 text-slate-500" />
              <span>Attach</span>
            </button>

            {/* Right side: Send button */}
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-[11px] text-slate-400">
                Press Enter to send
              </span>
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={!input.trim() || isAiThinking}
                className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-30 disabled:hover:bg-indigo-600 transition-all shadow-xs"
                aria-label="Send question"
                title={!input.trim() ? 'Type a question to send' : 'Send question (Enter)'}
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
