import React, { useState, useEffect, useRef } from 'react';
import { 
  Image as ImageIcon, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye,
  Calendar,
  User,
  Download,
  AlertCircle,
  Maximize2,
  X,
  Loader2,
  Upload,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Document, Page } from 'react-pdf';

import PdfPreview from '@/src/components/ui/PdfPreview';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Input from '@/src/components/ui/Input';
import Badge from '@/src/components/ui/Badge';
import Modal from '@/src/components/ui/Modal';
import { Drawing, UserRole } from '@/src/types';
import { DRAWING_CATEGORIES } from '@/src/constants';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  getBlob,
  storage, 
  db, 
  collection, 
  addDoc, 
  serverTimestamp, 
  handleFirestoreError, 
  OperationType 
} from '@/src/firebase';

interface DrawingsProps {
  drawings: Drawing[];
  role: UserRole;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}


export default function Drawings({ drawings, role, onDelete, isLoading, showToast }: DrawingsProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedDrawing, setSelectedDrawing] = useState<Drawing | null>(null);


  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newDrawing, setNewDrawing] = useState({
    title: '',
    category: DRAWING_CATEGORIES[0] as Drawing['category'],
    imageUrl: '',
    fileType: 'image' as 'image' | 'pdf'
  });

  const [drawingToDelete, setDrawingToDelete] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [useFallback, setUseFallback] = useState(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const filteredDrawings = drawings.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || d.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('error', `파일 크기가 너무 큽니다. (최대 5MB, 현재: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
        e.target.value = ''; // Reset input
        setSelectedFile(null); // Clear selected file
        setPreviewUrl(null); // Clear preview
        return;
      }
      
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        showToast('error', 'JPG, PNG, WEBP 이미지 또는 PDF 파일만 업로드 가능합니다.');
        return;
      }

      setSelectedFile(file);
      setNewDrawing(prev => ({ ...prev, fileType: file.type === 'application/pdf' ? 'pdf' : 'image' }));
      
      if (file.type.startsWith('image/')) {
        // Use createObjectURL instead of FileReader for better performance on mobile
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null); // No image preview for PDF
      }
    }
  };

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!isPreviewModalOpen) {
      setPageNumber(1);
      setNumPages(null);
      setUseFallback(false);
    }
  }, [isPreviewModalOpen]);

  const handleCreate = async () => {
    if (!newDrawing.title) {
      showToast('error', '도면 제목을 입력해 주세요.');
      return;
    }
    
    // File selected for upload
    if (!selectedFile) {
      showToast('error', '도면 파일을 선택해 주세요.');
      return;
    }

    // Double check file size before upload
    if (selectedFile.size > 5 * 1024 * 1024) {
      showToast('error', `파일 크기가 너무 큽니다. (최대 5MB, 현재: ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)`);
      return;
    }
    
    setIsUploading(true);
    try {
      console.log("Starting drawing upload process for:", selectedFile.name);
      
      if (!storage) {
        console.error("Firebase Storage is not initialized!");
        throw new Error("Firebase Storage가 초기화되지 않았습니다.");
      }

      // 1. Upload file to Firebase Storage with a timeout
      const storagePath = `drawings/${Date.now()}_${selectedFile.name}`;
      console.log("Uploading to path:", storagePath);
      const storageRef = ref(storage, storagePath);
      
      console.log("Calling uploadBytes...");
      
      // Use Promise.race to implement a timeout for the upload
      const uploadPromise = uploadBytes(storageRef, selectedFile, { contentType: selectedFile.type });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), 45000) // 45s timeout
      );

      const snapshot = await Promise.race([uploadPromise, timeoutPromise]) as any;
      console.log("Upload successful, snapshot:", snapshot.ref.fullPath);
      
      console.log("Getting download URL...");
      const imageUrl = await getDownloadURL(snapshot.ref);
      console.log("Download URL obtained:", imageUrl);
      
      // 2. Create drawing record in Firestore
      console.log("Creating Firestore record...");
      
      const drawingData = {
        title: newDrawing.title,
        category: newDrawing.category,
        imageUrl: imageUrl,
        fileType: newDrawing.fileType,
        createdAt: serverTimestamp(),
      };

      try {
        // Use Promise.race for Firestore addDoc with 15s timeout
        const addDocPromise = addDoc(collection(db, 'drawings'), drawingData);
        const dbTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('DATABASE_TIMEOUT')), 15000)
        );

        await Promise.race([addDocPromise, dbTimeoutPromise]);
        console.log("Firestore record created successfully");
      } catch (firestoreError) {
        console.error("Firestore creation error:", firestoreError);
        handleFirestoreError(firestoreError, OperationType.CREATE, 'drawings');
      }
      
      setIsCreateModalOpen(false);
      setNewDrawing({ title: '', category: DRAWING_CATEGORIES[0] as Drawing['category'], imageUrl: '', fileType: 'image' });
      setSelectedFile(null);
      setPreviewUrl(null);
      showToast('success', '도면이 성공적으로 등록되었습니다.');
    } catch (error: any) {
      console.error("Upload error details:", error);
      let errorMsg = '도면 업로드 중 오류가 발생했습니다.';
      
      if (error.message === 'UPLOAD_TIMEOUT') {
        errorMsg = '업로드 시간이 초과되었습니다. 네트워크 상태를 확인하거나 파일을 다시 선택해 주세요.';
      } else if (error.code === 'storage/unauthorized') {
        errorMsg = 'Firebase Storage 권한이 없습니다. 관리자 콘솔에서 Storage 규칙을 확인해 주세요.';
      } else if (error.code === 'storage/retry-limit-exceeded') {
        errorMsg = '업로드 재시도 횟수를 초과했습니다. 네트워크 상태를 확인해 주세요.';
      } else if (error.message) {
        errorMsg = `오류: ${error.message}`;
      }
      showToast('error', errorMsg);
      // Close modal on error to prevent UI hang
      setIsCreateModalOpen(false);
    } finally {
      setIsUploading(false);
      console.log("Upload process finished");
    }
  };

  const confirmDelete = async () => {
    if (drawingToDelete) {
      await onDelete(drawingToDelete);
      setIsDeleteModalOpen(false);
      setDrawingToDelete(null);
    }
  };

  const handleOpenOriginal = () => {
    if (!selectedDrawing) return;
    window.open(selectedDrawing.imageUrl, '_blank');
    showToast('info', '새 창에서 원본 도면을 엽니다.');
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">도면 게시판</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">분기기, 선로일람약도, 건축도면 등 각종 시설물 도면을 확인하고 관리하세요.</p>
        </div>
        {(role === 'owner' || role === 'admin') && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            size="sm"
            className="bg-violet-600 hover:bg-violet-700 shadow-xl shadow-violet-200/50 border-violet-500/20"
          >
            새 도면 등록
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <Card className="flex-1 border-none shadow-xl shadow-slate-200/40 p-0.5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-violet-500 transition-colors" />
              <input 
                type="text" 
                placeholder="도면 제목 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-slate-50/50 border-none rounded-[18px] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-violet-500/10 focus:bg-white transition-all duration-300"
              />
            </div>
          </Card>
          
          <div className="p-1.5 bg-slate-100/80 rounded-[20px] border border-slate-200/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0",
                selectedCategory === 'all' 
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-200/50" 
                  : "text-slate-500 hover:bg-white hover:text-violet-600"
              )}
            >
              전체
            </button>
            {DRAWING_CATEGORIES.map((cat) => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0",
                  selectedCategory === cat 
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-200/50" 
                    : "text-slate-500 hover:bg-white hover:text-violet-600"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drawing Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredDrawings.map((drawing) => (
          <Card 
            key={drawing.id} 
            className="group hover:shadow-2xl transition-all duration-500 cursor-pointer border-none shadow-xl shadow-slate-200/40 flex flex-col p-0 overflow-hidden rounded-[24px]"
            onClick={() => {
              setSelectedDrawing(drawing);
              setIsPreviewModalOpen(true);
            }}
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 flex items-center justify-center">
              {drawing.fileType === 'pdf' ? (
                <PdfPreview imageUrl={drawing.imageUrl} />
              ) : (
                <img 
                  src={drawing.imageUrl} 
                  alt={drawing.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              )}
              
              {/* Hover Overlay with Action Buttons */}
              <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all duration-500 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
                <div 
                  className="w-12 h-12 rounded-2xl bg-white text-violet-600 shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all transform -translate-y-4 group-hover:translate-y-0 duration-500"
                  title="미리보기"
                >
                  <Eye className="w-5 h-5" />
                </div>
                <a 
                  href={drawing.imageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl bg-violet-600 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all transform translate-y-4 group-hover:translate-y-0 duration-500 delay-75"
                  title="새 창에서 원본 보기"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Maximize2 className="w-5 h-5" />
                </a>
              </div>

              <div className="absolute top-3 left-3">
                <Badge variant="secondary" className="bg-white/90 backdrop-blur-md border-none shadow-sm text-violet-600 font-black text-[8px] uppercase tracking-widest px-2 py-0.5">
                  {drawing.category}
                </Badge>
              </div>
            </div>
            
            <div className="p-4 flex-1 flex flex-col justify-between relative">
              {/* Subtle accent line */}
              <div className="absolute top-0 left-4 right-4 h-px bg-slate-100" />
              
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-violet-600 transition-colors tracking-tight">
                    {drawing.title}
                  </h3>
                  <a 
                    href={drawing.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-400 hover:text-violet-600 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                    title="새 창에서 보기"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <Calendar className="w-3 h-3 text-violet-500" />
                  <span>{drawing.createdAt ? format(drawing.createdAt.toDate ? drawing.createdAt.toDate() : new Date(drawing.createdAt), 'yyyy.MM.dd', { locale: ko }) : '-'}</span>
                </div>
              </div>

              {(role === 'owner' || role === 'admin') && (
                <div className="mt-4 flex items-center justify-end">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDrawingToDelete(drawing.id);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}

        {filteredDrawings.length === 0 && (
          <div className="col-span-full py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner shadow-slate-50">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <ImageIcon className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">검색 결과가 없습니다</h3>
            <p className="text-slate-500 mt-2 font-medium">다른 카테고리나 검색어를 선택해 보세요.</p>
            <Button 
              variant="outline" 
              className="mt-8"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
            >
              필터 초기화
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="새 도면 등록"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isUploading}>취소</Button>
            <Button 
              onClick={handleCreate} 
              variant="primary" 
              className="bg-violet-600 hover:bg-violet-700 shadow-violet-200/50"
              disabled={isUploading || !newDrawing.title || !selectedFile}
              leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isUploading ? '업로드 중...' : '도면 등록 완료'}
            </Button>
          </>
        }
      >
        <div className="space-y-8">
          <Input 
            label="도면 제목" 
            placeholder="도면 제목을 입력하세요" 
            value={newDrawing.title}
            onChange={(e) => setNewDrawing({...newDrawing, title: e.target.value})}
            disabled={isUploading}
          />
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">카테고리 선택</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {DRAWING_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  disabled={isUploading}
                  onClick={() => setNewDrawing({...newDrawing, category: cat as Drawing['category']})}
                  className={cn(
                    "px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-widest border-2 transition-all",
                    newDrawing.category === cat 
                      ? "bg-violet-50 border-violet-200 text-violet-700 shadow-sm" 
                      : "bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:text-slate-600"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">도면 파일 (이미지 또는 PDF)</label>
            <div 
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={cn(
                "relative overflow-hidden border-2 border-dashed rounded-[32px] transition-all cursor-pointer group",
                (previewUrl || newDrawing.imageUrl || (selectedFile && selectedFile.type === 'application/pdf')) ? "aspect-video border-violet-200 bg-slate-50" : "p-16 border-slate-200 hover:border-violet-300 hover:bg-violet-50/30",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {(previewUrl || newDrawing.imageUrl || (selectedFile && selectedFile.type === 'application/pdf')) ? (
                <>
                  {selectedFile?.type === 'application/pdf' || newDrawing.imageUrl.toLowerCase().endsWith('.pdf') ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-violet-600 mb-4">
                        <FileText className="w-10 h-10" />
                      </div>
                      <span className="text-sm font-black text-slate-700 tracking-tight">{selectedFile?.name || 'PDF 파일'}</span>
                      <Badge variant="secondary" className="mt-2 bg-violet-100 text-violet-600 border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest">PDF Document</Badge>
                    </div>
                  ) : (
                    <img src={previewUrl || newDrawing.imageUrl} alt="Preview" className="w-full h-full object-contain p-4" />
                  )}
                  <div className="absolute inset-0 bg-violet-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center text-white">
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mb-2">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest">파일 변경하기</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-[24px] bg-violet-50 text-violet-600 flex items-center justify-center mx-auto group-hover:bg-violet-100 group-hover:scale-110 transition-all duration-500 shadow-sm">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-base font-black text-slate-900 tracking-tight">도면 파일 업로드</p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">JPG, PNG, WEBP 또는 PDF 지원 (최대 5MB)</p>
                  </div>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden" 
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        title={selectedDrawing?.title}
        size="full"
      >
        {selectedDrawing && (
          <div className="h-full flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-slate-50/50 rounded-[32px] border border-slate-100 gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-4 md:gap-8 flex-1">
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex-1 md:flex-none">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shrink-0">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5 whitespace-nowrap">카테고리</p>
                    <p className="text-sm font-black text-slate-900 tracking-tight truncate">{selectedDrawing.category}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex-1 md:flex-none">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5 whitespace-nowrap">등록일자</p>
                    <p className="text-sm font-black text-slate-900 tracking-tight truncate">
                      {selectedDrawing.createdAt ? format(selectedDrawing.createdAt.toDate ? selectedDrawing.createdAt.toDate() : new Date(selectedDrawing.createdAt), 'yyyy.MM.dd', { locale: ko }) : '-'}
                    </p>
                  </div>
                </div>
              </div>
              
              <a 
                href={selectedDrawing.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-200/50 py-4 md:py-3 px-8 whitespace-nowrap text-[10px] uppercase tracking-widest font-black rounded-xl inline-flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
              >
                <Maximize2 className="w-4 h-4" />
                도면 크게 보기
              </a>
            </div>
            
            <div className="flex-1 bg-slate-900 rounded-[40px] overflow-hidden relative group flex flex-col items-center justify-center shadow-2xl">
              {selectedDrawing.fileType === 'pdf' ? (
                useFallback ? (
                  <iframe
                    src={`${selectedDrawing.imageUrl}#view=FitH`}
                    className="w-full h-full border-none bg-white rounded-xl"
                    title={selectedDrawing.title}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center bg-slate-800 p-4 overflow-auto custom-scrollbar">
                    <div className="flex-1 flex items-center justify-center min-h-0 w-full">
                      <Document
                        file={selectedDrawing.imageUrl}
                        onLoadSuccess={onDocumentLoadSuccess}
                        onLoadError={(err) => {
                          console.error('PDF Load Error:', err);
                          setUseFallback(true);
                        }}
                        loading={
                          <div className="flex flex-col items-center gap-4 text-white">
                            <Loader2 className="w-10 h-10 animate-spin text-violet-400" />
                            <p className="text-xs font-black uppercase tracking-widest opacity-50">도면을 불러오는 중...</p>
                          </div>
                        }
                      >
                        <Page 
                          pageNumber={pageNumber} 
                          renderTextLayer={false}
                          renderAnnotationLayer={false}
                          className="shadow-2xl max-w-full"
                          width={Math.min(window.innerWidth * 0.9, 1200)}
                        />
                      </Document>
                    </div>
                    
                    {numPages && numPages > 1 && (
                      <div className="mt-6 px-6 py-3 bg-black/40 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-6 text-white shrink-0">
                        <button 
                          onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                          disabled={pageNumber <= 1}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest min-w-[80px] text-center">
                          {pageNumber} / {numPages}
                        </span>
                        <button 
                          onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                          disabled={pageNumber >= numPages}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-20"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <TransformWrapper
                  initialScale={1}
                  initialPositionX={0}
                  initialPositionY={0}
                  centerOnInit={true}
                >
                  {({ zoomIn, zoomOut, resetTransform }) => (
                    <>
                      <div className="absolute top-6 right-6 z-10 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={() => zoomIn()}
                          className="w-12 h-12 bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all flex items-center justify-center shadow-2xl"
                          title="확대"
                        >
                          <ZoomIn className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => zoomOut()}
                          className="w-12 h-12 bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all flex items-center justify-center shadow-2xl"
                          title="축소"
                        >
                          <ZoomOut className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => resetTransform()}
                          className="w-12 h-12 bg-white/10 backdrop-blur-xl hover:bg-white/20 text-white rounded-2xl border border-white/10 transition-all flex items-center justify-center shadow-2xl"
                          title="초기화"
                        >
                          <RotateCcw className="w-6 h-6" />
                        </button>
                      </div>

                      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0 pointer-events-none">
                        <div className="px-6 py-3 bg-black/60 backdrop-blur-xl rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 shadow-2xl">
                          Drag to Move / Scroll to Zoom
                        </div>
                      </div>

                      <TransformComponent
                        wrapperStyle={{ width: "100%", height: "100%" }}
                        contentStyle={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <img 
                          src={selectedDrawing.imageUrl} 
                          alt={selectedDrawing.title} 
                          className="max-w-[90%] max-h-[90%] object-contain cursor-grab active:cursor-grabbing shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)]"
                          referrerPolicy="no-referrer"
                        />
                      </TransformComponent>
                    </>
                  )}
                </TransformWrapper>
              )}
            </div>

            {/* Warning Section */}
            <div className="p-6 bg-violet-50/50 rounded-[32px] border border-violet-100 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-violet-500 shadow-sm border border-violet-100 shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black text-violet-900 tracking-tight leading-tight">도면은 외부 유출이 엄격히 금지됩니다.</p>
                <p className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mt-1">Confidential Drawing Data</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="도면 삭제"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>취소</Button>
            <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 shadow-rose-200/50 border-rose-500/20" onClick={confirmDelete}>삭제하기</Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-inner">
            <Trash2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">정말 삭제하시겠습니까?</h3>
          <p className="text-slate-500 mt-3 font-medium leading-relaxed">
            삭제된 도면은 복구할 수 없습니다. <br/>
            신중하게 결정해 주세요.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
