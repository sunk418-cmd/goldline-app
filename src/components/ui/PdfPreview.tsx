import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

// Set up the worker for PDF.js - using a CDN is more reliable across environments
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfPreviewProps {
  imageUrl: string;
}

export default function PdfPreview({ imageUrl }: PdfPreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const [useFallback, setUseFallback] = useState<boolean>(false);

  function onDocumentLoadSuccess() {
    setIsLoaded(true);
    setUseFallback(false);
  }

  function onDocumentLoadError(err: Error) {
    console.error('PDF Load Error:', err);
    setError(true);
    setIsLoaded(true);
    // If react-pdf fails (likely CORS), fallback to iframe for desktop
    setUseFallback(true);
  }

  // Fallback UI for when react-pdf fails (e.g., CORS issues)
  if (useFallback) {
    return (
      <div className="relative w-full h-full overflow-hidden bg-white flex items-center justify-center">
        <iframe
          src={`${imageUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`}
          className="absolute inset-0 border-none w-full h-full pointer-events-none"
          onLoad={() => setIsLoaded(true)}
          title="PDF Thumbnail Fallback"
        />
        {!isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-0">
            <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
          </div>
        )}
        <div className="absolute inset-0 z-10 bg-transparent" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden bg-white flex items-center justify-center">
      <div 
        className={`transition-opacity duration-500 w-full h-full flex items-center justify-center ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
      >
        <Document
          file={imageUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={null}
          className="flex items-center justify-center w-full h-full overflow-hidden"
        >
          <Page 
            pageNumber={1} 
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            className="max-w-full max-h-full"
            width={300}
          />
        </Document>
      </div>
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-0">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin" />
        </div>
      )}

      <div className="absolute inset-0 z-10 bg-transparent" />
    </div>
  );
}
