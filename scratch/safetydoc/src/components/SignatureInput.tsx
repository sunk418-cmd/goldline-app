import React, { useRef, useEffect } from 'react';
import SignaturePad from 'signature_pad';
import { RotateCcw, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface SignatureInputProps {
  onSave: (dataUrl: string) => void;
  className?: string;
}

export function SignatureInput({ onSave, className }: SignatureInputProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      signaturePadRef.current = new SignaturePad(canvasRef.current, {
        backgroundColor: 'rgb(255, 255, 255)',
      });

      const resizeCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ratio = Math.max(window.devicePixelRatio || 1, 1);
          canvas.width = canvas.offsetWidth * ratio;
          canvas.height = canvas.offsetHeight * ratio;
          canvas.getContext('2d')?.scale(ratio, ratio);
          signaturePadRef.current?.clear();
        }
      };

      window.addEventListener('resize', resizeCanvas);
      resizeCanvas();

      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, []);

  const handleClear = () => {
    signaturePadRef.current?.clear();
  };

  const handleConfirm = () => {
    if (signaturePadRef.current?.isEmpty()) {
      alert('서명을 해주세요.');
      return;
    }
    const dataUrl = signaturePadRef.current?.toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative w-full aspect-[2/1] bg-white rounded-xl border-2 border-slate-200 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          className="w-full h-full touch-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          <RotateCcw size={18} />
          다시 쓰기
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
        >
          <Check size={18} />
          서명 완료
        </button>
      </div>
    </div>
  );
}
