import React from 'react';
import { FileText, Presentation, Image as ImageIcon, FileCode, Globe } from 'lucide-react';
import { DocumentType } from '../../types';
import { cn } from '../../utils/cn';

interface DocumentTypeIconProps {
  type: DocumentType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const DocumentTypeIcon: React.FC<DocumentTypeIconProps> = ({
  type,
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-7 h-7',
  };

  const containerSizes = {
    sm: 'p-1.5 rounded',
    md: 'p-2 rounded-lg',
    lg: 'p-3 rounded-xl',
  };

  switch (type) {
    case 'website':
      return (
        <div className={cn('bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shrink-0', containerSizes[size], className)}>
          <Globe className={sizeClasses[size]} />
        </div>
      );
    case 'pdf':
      return (
        <div className={cn('bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0', containerSizes[size], className)}>
          <FileText className={sizeClasses[size]} />
        </div>
      );
    case 'pptx':
      return (
        <div className={cn('bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0', containerSizes[size], className)}>
          <Presentation className={sizeClasses[size]} />
        </div>
      );
    case 'image':
      return (
        <div className={cn('bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0', containerSizes[size], className)}>
          <ImageIcon className={sizeClasses[size]} />
        </div>
      );
    case 'note':
    default:
      return (
        <div className={cn('bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0', containerSizes[size], className)}>
          <FileCode className={sizeClasses[size]} />
        </div>
      );
  }
};
