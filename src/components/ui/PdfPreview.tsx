import React, { useState, useEffect, useRef } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import * as pdfjs from 'pdfjs-dist';

// pdfjs worker is already set up in App.tsx

interface PdfPreviewProps {
  imageUrl: string;
}

/**
 * Intelligent PDF Thumbnail Component
 * Renders the actual first page of the PDF into an image only when visible.
 * This provides the preview users want without the memory overhead of a full PDF viewer.
 */
export default function PdfPreview({ imageUrl }: PdfPreviewProps) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderStarted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !renderStarted.current && !thumbnail) {
          renderStarted.current = true;
          renderThumbnail();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [imageUrl, thumbnail]);

  const renderThumbnail = async () => {
    try {
      setLoading(true);
      // Load the PDF document
      const loadingTask = pdfjs.getDocument(imageUrl);
      const pdf = await loadingTask.promise;
      
      // Get the first page
      const page = await pdf.getPage(1);
      
      // Setup scale and viewport
      const viewport = page.getViewport({ scale: 0.5 }); // Lower scale for thumbnail
      
      // Create canvas to render
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) throw new Error('Canvas context failed');

      // Render page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      // Convert canvas to data URL (image)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      setThumbnail(dataUrl);
      
      // Clean up PDF resources immediately
      await pdf.destroy();
    } catch (err) {
      console.error('Thumbnail generation failed:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-4">
        <FileText className="w-8 h-8 text-slate-300 mb-2" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preview Failed</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-white overflow-hidden flex items-center justify-center">
      {thumbnail ? (
        <img 
          src={thumbnail} 
          alt="PDF Preview" 
          className="w-full h-full object-cover transition-opacity duration-500 opacity-100 animate-in fade-in" 
        />
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 text-violet-500 animate-spin opacity-50" />
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Generating...</span>
        </div>
      )}
      
      {/* Visual Indicator that it's a PDF */}
      <div className="absolute top-2 right-2 z-10">
        <div className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-lg uppercase tracking-widest ring-1 ring-white/20">
          PDF
        </div>
      </div>
    </div>
  );
}
