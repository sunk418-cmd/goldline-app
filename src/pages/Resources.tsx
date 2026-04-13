import React, { useState } from 'react';
import { 
  FolderOpen, 
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
  FileText,
  FileSpreadsheet,
  FileCode,
  File as FileIcon,
  Upload,
  Loader2,
  ChevronRight
} from 'lucide-react';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Input from '@/src/components/ui/Input';
import Badge from '@/src/components/ui/Badge';
import Modal from '@/src/components/ui/Modal';
import { Resource, UserRole } from '@/src/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  storage, 
  db, 
  collection, 
  addDoc, 
  serverTimestamp, 
  handleFirestoreError, 
  OperationType 
} from '@/src/firebase';
import { useRef } from 'react';

interface ResourcesProps {
  resources: Resource[];
  role: UserRole;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function Resources({ resources, role, onDelete, isLoading, showToast }: ResourcesProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  
  const [newResource, setNewResource] = useState({
    title: '',
    fileUrl: '',
    fileType: 'pdf'
  });

  const filteredResources = resources.filter(r => 
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.fileName && r.fileName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredResources.length / itemsPerPage);
  const paginatedResources = filteredResources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        showToast('error', `파일 크기가 너무 큽니다. (최대 20MB, 현재: ${(file.size / (1024 * 1024)).toFixed(2)}MB)`);
        e.target.value = ''; // Reset input
        setSelectedFile(null); // Clear selected file
        return;
      }
      
      setSelectedFile(file);
      
      // Auto-detect file type from extension
      const extension = file.name.split('.').pop()?.toLowerCase() || 'pdf';
      setNewResource(prev => ({
        ...prev,
        title: prev.title || file.name.split('.')[0],
        fileType: extension
      }));
    }
  };

  const handleCreate = async () => {
    if (!newResource.title) {
      showToast('error', '자료 제목을 입력해 주세요.');
      return;
    }

    // File selected for upload
    if (!selectedFile) {
      showToast('error', '파일을 선택해 주세요.');
      return;
    }

    // Double check file size before upload
    if (selectedFile.size > 20 * 1024 * 1024) {
      showToast('error', `파일 크기가 너무 큽니다. (최대 20MB, 현재: ${(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)`);
      return;
    }

    setIsUploading(true);
    try {
      console.log("Starting file upload process for:", selectedFile.name);
      
      if (!storage) {
        console.error("Firebase Storage is not initialized!");
        throw new Error("Firebase Storage가 초기화되지 않았습니다.");
      }

      // 1. Upload file to Firebase Storage
      const storagePath = `resources/${Date.now()}_${selectedFile.name}`;
      console.log("Uploading to path:", storagePath);
      const storageRef = ref(storage, storagePath);
      
      console.log("Calling uploadBytes...");
      const snapshot = await uploadBytes(storageRef, selectedFile);
      console.log("uploadBytes successful, snapshot:", snapshot.ref.fullPath);
      
      console.log("Getting download URL...");
      const fileUrl = await getDownloadURL(snapshot.ref);
      console.log("Download URL obtained:", fileUrl);

      // 2. Create resource record in Firestore
      console.log("Creating Firestore record...");
      try {
        const resourceData = {
          title: newResource.title,
          fileUrl,
          fileType: newResource.fileType,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          createdAt: serverTimestamp()
        };
        
        await addDoc(collection(db, 'resources'), resourceData);
        console.log("Firestore record created successfully");
      } catch (firestoreError) {
        console.error("Firestore creation error:", firestoreError);
        handleFirestoreError(firestoreError, OperationType.CREATE, 'resources');
      }

      // 3. Reset state and close modal
      setIsCreateModalOpen(false);
      setNewResource({ title: '', fileUrl: '', fileType: 'pdf' });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      showToast('success', '자료가 성공적으로 등록되었습니다.');
    } catch (error: any) {
      console.error("Upload error details:", error);
      let errorMsg = '파일 업로드 중 오류가 발생했습니다.';
      if (error.code === 'storage/unauthorized') {
        errorMsg = 'Firebase Storage 권한이 없습니다. Storage 규칙을 확인해 주세요.';
      } else if (error.code === 'storage/canceled') {
        errorMsg = '업로드가 취소되었습니다.';
      } else if (error.message) {
        errorMsg = `오류: ${error.message}`;
      }
      showToast('error', errorMsg);
    } finally {
      setIsUploading(false);
      console.log("Upload process finished");
    }
  };

  const confirmDelete = async () => {
    if (resourceToDelete) {
      await onDelete(resourceToDelete);
      setIsDeleteModalOpen(false);
      setResourceToDelete(null);
    }
  };

  const handleViewResource = (fileUrl: string, fileName: string) => {
    if (!fileUrl) return;
    
    const lowerName = fileName.toLowerCase();
    // PDF and Images can be opened directly
    if (lowerName.endsWith('.pdf') || /\.(jpg|jpeg|png|gif|webp)$/i.test(lowerName)) {
      window.open(fileUrl, '_blank');
    } else {
      // For Office documents, use Google Docs Viewer to avoid forced download
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      window.open(viewerUrl, '_blank');
    }
  };

  const getFileIcon = (type: string, className: string = "w-8 h-8") => {
    switch (type.toLowerCase()) {
      case 'pdf': return <FileText className={cn(className, "text-rose-500")} />;
      case 'xlsx':
      case 'xls':
      case 'csv': return <FileSpreadsheet className={cn(className, "text-emerald-500")} />;
      case 'doc':
      case 'docx': return <FileIcon className={cn(className, "text-indigo-500")} />;
      default: return <FileIcon className={cn(className, "text-slate-400")} />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">자료실</h1>
          <p className="text-slate-500 mt-1 font-medium text-base">업무에 필요한 각종 양식과 자료를 공유하세요.</p>
        </div>
        {(role === 'owner' || role === 'admin') && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 shadow-xl shadow-amber-200/50 border-amber-500/20"
          >
            자료 업로드
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <Card className="border-none shadow-xl shadow-slate-200/40 p-1 rounded-[24px]">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-amber-500 transition-colors" />
            <input 
              type="text" 
              placeholder="자료 제목, 파일명 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 bg-slate-50/50 border-none rounded-[18px] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:bg-white transition-all duration-300"
            />
          </div>
          <Button variant="outline" size="sm" leftIcon={<Filter className="w-3.5 h-3.5" />} className="rounded-[18px] px-6 border-slate-200">
            필터
          </Button>
        </div>
      </Card>

      {/* Resource List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedResources.map((resource) => (
          <Card 
            key={resource.id} 
            className="group hover:shadow-2xl transition-all duration-500 border-none shadow-xl shadow-slate-200/40 flex flex-col p-6 relative overflow-hidden rounded-[24px]"
          >
            {/* Subtle hover background accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="flex items-start justify-between gap-3 mb-6 relative z-10">
              <div className="w-12 h-12 rounded-[18px] bg-slate-50 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-xl transition-all duration-500 border border-transparent group-hover:border-slate-100 group-hover:rotate-6">
                {getFileIcon(resource.fileType, "w-6 h-6")}
              </div>
              <Badge variant="secondary" className="bg-amber-100 text-amber-600 border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5">
                {resource.fileType}
              </Badge>
            </div>
            
            <div className="flex-1 relative z-10">
              <h3 className="text-base font-black text-slate-900 line-clamp-2 group-hover:text-amber-600 transition-colors tracking-tight leading-tight">
                {resource.title}
              </h3>
              {resource.fileName && resource.fileName !== resource.title && (
                <p className="text-[9px] font-black text-slate-400 mt-1.5 truncate uppercase tracking-widest">{resource.fileName}</p>
              )}
              
              <div className="flex items-center gap-2 mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>{resource.createdAt ? format(resource.createdAt.toDate ? resource.createdAt.toDate() : new Date(resource.createdAt), 'yyyy.MM.dd', { locale: ko }) : '-'}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 relative z-10">
              <Button 
                variant="primary" 
                size="sm"
                className="flex-1 bg-amber-600 hover:bg-amber-700 shadow-xl shadow-amber-200/50 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest"
                leftIcon={<Maximize2 className="w-3.5 h-3.5" />}
                onClick={() => handleViewResource(resource.fileUrl, resource.fileName || resource.title)}
              >
                자료 크게 보기
              </Button>
              {(role === 'owner' || role === 'admin') && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  onClick={() => {
                    setResourceToDelete(resource.id);
                    setIsDeleteModalOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        ))}

        {paginatedResources.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-200 shadow-inner shadow-slate-50">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">검색 결과가 없습니다</h3>
            <p className="text-slate-500 mt-1 text-sm font-medium">다른 검색어를 입력해 보세요.</p>
            <Button 
              variant="outline" 
              size="sm"
              className="mt-6"
              onClick={() => setSearchQuery('')}
            >
              검색 초기화
            </Button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="rounded-xl"
          >
            이전
          </Button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={cn(
                  "w-10 h-10 rounded-xl text-xs font-black transition-all duration-300",
                   currentPage === page 
                    ? "bg-amber-600 text-white shadow-lg shadow-amber-200/50 scale-110" 
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                )}
              >
                {page}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="rounded-xl"
          >
            다음
          </Button>
        </div>
      )}

      {/* Create Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => !isUploading && setIsCreateModalOpen(false)}
        title="자료 업로드"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isUploading}>취소</Button>
            <Button 
              onClick={handleCreate} 
              variant="primary" 
              className="bg-amber-600 hover:bg-amber-700 shadow-amber-200/50"
              disabled={isUploading || !newResource.title}
              leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isUploading ? '업로드 중...' : '업로드 완료'}
            </Button>
          </>
        }
      >
        <div className="space-y-8">
            <Input 
              label="자료 제목" 
              placeholder="자료 제목을 입력하세요" 
              value={newResource.title}
              onChange={(e) => setNewResource({...newResource, title: e.target.value})}
              disabled={isUploading}
            />

          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">파일 업로드</label>
            <label 
              className={cn(
                "p-12 border-2 border-dashed border-slate-200 rounded-[32px] text-center space-y-4 hover:bg-slate-50/50 hover:border-amber-500/50 transition-all duration-500 cursor-pointer group block relative overflow-hidden",
                selectedFile && "border-amber-500 bg-amber-50/30 shadow-inner",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="w-16 h-16 rounded-[24px] bg-amber-50 text-amber-600 flex items-center justify-center mx-auto group-hover:bg-amber-600 group-hover:text-white group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-sm">
                {isUploading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Upload className="w-8 h-8" />}
              </div>
              <div>
                <p className="text-lg font-black text-slate-900 tracking-tight">
                  {selectedFile ? selectedFile.name : '파일을 드래그하거나 클릭하세요'}
                </p>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest">PDF, Excel, Word 등 (최대 20MB)</p>
              </div>
              <input 
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="자료 삭제"
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
            삭제된 자료는 복구할 수 없습니다. <br/>
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
