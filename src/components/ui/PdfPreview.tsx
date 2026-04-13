import React, { useState } from 'react';
import { FileText } from 'lucide-react';

interface PdfPreviewProps {
  imageUrl: string;
}

export default function PdfPreview({ imageUrl }: PdfPreviewProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // #page=1 ensures only the first page is shown
  // toolbar=0, navpanes=0, scrollbar=0 hide the native PDF viewer controls
  // view=FitH fits the page horizontally
  const viewerUrl = `${imageUrl}#page=1&view=FitH&toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0`;

  return (
    <div className="relative w-full h-full overflow-hidden bg-white pointer-events-none flex items-center justify-center">
      {/* Iframe acts as the image renderer. Native PDF viewers bypass CORS fetch restrictions. */}
      {/* We apply a slight scale hack if we want it to cover completely, but typical FitH works well enough. */}
      <iframe
        src={viewerUrl}
        className={`absolute inset-0 border-none transition-opacity duration-300 pointer-events-none custom-pdf-iframe`}
        style={{ 
          width: '100%', 
          height: '100%', 
          opacity: isLoaded ? 1 : 0 
        }}
        onLoad={() => setIsLoaded(true)}
        title="PDF Thumbnail"
        scrolling="no"
        tabIndex={-1}
      />
      
      {/* Loading state / Default backdrop */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-0">
          <FileText className="w-6 h-6 text-slate-200 animate-pulse" />
        </div>
      )}

      {/* Transparent overlay blocks any accidental clicks and captures hover events */}
      <div className="absolute inset-0 z-10 bg-transparent" />
    </div>
  );
}
