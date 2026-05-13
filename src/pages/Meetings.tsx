import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Maximize2,
  Calendar,
  User,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Upload,
  Loader2,
  Download,
  Paperclip
} from 'lucide-react';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Input from '@/src/components/ui/Input';
import Badge from '@/src/components/ui/Badge';
import Modal from '@/src/components/ui/Modal';
import { Meeting, UserRole } from '@/src/types';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ko } from 'date-fns/locale';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  storage 
} from '@/src/firebase';
import { useRef } from 'react';

interface MeetingsProps {
  meetings: Meeting[];
  role: UserRole;
  onCreate: (meeting: Omit<Meeting, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: string, meeting: Partial<Meeting>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}

export default function Meetings({ meetings, role, onCreate, onUpdate, onDelete, isLoading }: MeetingsProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all'); // yyyy format
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // yyyy-MM format
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxFiles, setLightboxFiles] = useState<any[]>([]); // MeetingFile or legacy
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    content: ''
  });

  const filteredMeetings = meetings.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         m.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesYear = selectedYear === 'all' || m.date.startsWith(selectedYear);
    const matchesMonth = selectedMonth === 'all' || m.date.startsWith(selectedMonth);
    return matchesSearch && matchesYear && matchesMonth;
  }).sort((a, b) => b.date.localeCompare(a.date));

  // Grouping logic
  const groupedMeetings: { [key: string]: Meeting[] } = {};
  filteredMeetings.forEach(m => {
    const monthKey = m.date.substring(0, 7); // yyyy-MM
    if (!groupedMeetings[monthKey]) {
      groupedMeetings[monthKey] = [];
    }
    groupedMeetings[monthKey].push(m);
  });

  const monthKeys = Object.keys(groupedMeetings).sort((a, b) => b.localeCompare(a));

  // Get unique years and months for filter
  const availableYears = Array.from(new Set(meetings.map(m => m.date.substring(0, 4))))
    .sort((a, b) => b.localeCompare(a));

  const availableMonthsForYear = selectedYear === 'all' 
    ? [] 
    : Array.from(new Set(meetings
        .filter(m => m.date.startsWith(selectedYear))
        .map(m => m.date.substring(0, 7))))
        .sort((a, b) => b.localeCompare(a));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = [...selectedFiles, ...files].slice(0, 5); // Max 5
    setSelectedFiles(newFiles);
    
    const urls = newFiles.map(file => {
      if (file.type.startsWith('image/')) {
        return URL.createObjectURL(file);
      }
      return '';
    });
    setPreviewUrls(urls);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
    
    const newUrls = [...previewUrls];
    if (newUrls[index] && newUrls[index].startsWith('blob:')) {
      URL.revokeObjectURL(newUrls[index]);
    }
    newUrls.splice(index, 1);
    setPreviewUrls(newUrls);
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  const handleCreate = async () => {
    if (!newMeeting.title || !newMeeting.content) return;
    
    setIsUploading(true);
    try {
      let fileData: any = {};
      const uploadedFiles = [];
      
      if (selectedFiles.length > 0) {
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
          const fileRef = ref(storage, `meetings/${Date.now()}_${i}_${file.name}`);
          const metadata = { contentType: file.type };
          
          const uploadPromise = uploadBytes(fileRef, file, metadata);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('UPLOAD_TIMEOUT')), 45000)
          );

          await Promise.race([uploadPromise, timeoutPromise]);
          const fileUrl = await getDownloadURL(fileRef);
          
          uploadedFiles.push({
            fileUrl,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
          });
        }
        
        if (uploadedFiles.length > 0) {
          fileData = {
            fileUrl: uploadedFiles[0].fileUrl,
            fileName: uploadedFiles[0].fileName,
            fileType: uploadedFiles[0].fileType,
            fileSize: uploadedFiles[0].fileSize,
            files: uploadedFiles
          };
        }
      }

      await onCreate({
        ...newMeeting,
        ...fileData
      });
      
      // Success: Close and Reset
      setIsCreateModalOpen(false);
      setNewMeeting({ title: '', date: format(new Date(), 'yyyy-MM-dd'), content: '' });
      setSelectedFiles([]);
      setPreviewUrls([]);
    } catch (error: any) {
      console.error("Error creating meeting:", error);
      // Even on error, we might want to close the modal if the upload actually happened
      setIsCreateModalOpen(false);
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (meetingToDelete) {
      await onDelete(meetingToDelete);
      setIsDeleteModalOpen(false);
      setMeetingToDelete(null);
    }
  };

  const handleViewFile = (fileUrl: string, fileName: string) => {
    if (!fileUrl) return;
    
    const lowerName = fileName.toLowerCase();
    // PDF and Images can usually be opened directly in browser tabs
    if (lowerName.endsWith('.pdf') || /\.(jpg|jpeg|png|gif|webp)$/i.test(lowerName)) {
      window.open(fileUrl, '_blank');
    } else {
      // For Office documents (docx, xlsx, etc.), use Google Docs Viewer to prevent forced download on mobile
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
      window.open(viewerUrl, '_blank');
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">회의록</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">팀 내 주요 회의 내용과 결정 사항을 관리하세요.</p>
        </div>
        {(role === 'owner' || role === 'admin') && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200/50 border-emerald-500/20"
          >
            새 회의록 작성
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <Card className="flex-1 border-none shadow-xl shadow-slate-200/40 p-0.5">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="text" 
                placeholder="회의 제목, 내용 검색..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-6 py-3 bg-slate-50/50 border-none rounded-[18px] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white transition-all duration-300"
              />
            </div>
          </Card>
          
          <div className="p-1.5 bg-slate-100/80 rounded-[20px] border border-slate-200/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button 
              onClick={() => {
                setSelectedYear('all');
                setSelectedMonth('all');
              }}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0",
                selectedYear === 'all' 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200/50" 
                  : "text-slate-500 hover:bg-white hover:text-emerald-600"
              )}
            >
              전체보기
            </button>
            {availableYears.map((year) => (
              <button 
                key={year}
                onClick={() => {
                  setSelectedYear(year);
                  setSelectedMonth('all');
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0",
                  selectedYear === year 
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200/50" 
                    : "text-slate-500 hover:bg-white hover:text-emerald-600"
                )}
              >
                {year}년
              </button>
            ))}
          </div>
        </div>

        {/* Month Filter (shown when a year is selected) */}
        {selectedYear !== 'all' && (
          <div className="p-1.5 bg-emerald-50/50 rounded-[20px] border border-emerald-100/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-500">
            <div className="px-4 py-2 text-[9px] font-black text-emerald-700 whitespace-nowrap uppercase tracking-[0.2em] border-r border-emerald-100/50 mr-1.5">
              {selectedYear}년 월별
            </div>
            <button 
              onClick={() => setSelectedMonth('all')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0",
                selectedMonth === 'all' 
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-100/50" 
                  : "text-emerald-600 hover:bg-emerald-100/50"
              )}
            >
              전체
            </button>
            {availableMonthsForYear.map((month) => (
              <button 
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all flex-shrink-0",
                  selectedMonth === month 
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-100/50" 
                    : "text-emerald-600 hover:bg-emerald-100/50"
                )}
              >
                {format(parseISO(month + '-01'), 'M월', { locale: ko })}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Meeting List Grouped by Month */}
      <div className="space-y-16">
        {monthKeys.map((monthKey) => (
          <div key={monthKey} className="space-y-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-3 h-10 bg-emerald-500 rounded-full shadow-lg shadow-emerald-200/50"></div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter">
                  {format(parseISO(monthKey + '-01'), 'yyyy년 MM월', { locale: ko })}
                </h2>
              </div>
              <div className="flex-1 h-px bg-slate-200/60"></div>
              <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-black text-[10px] uppercase tracking-widest px-4 py-1.5">
                {groupedMeetings[monthKey].length} Records
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {groupedMeetings[monthKey].map((meeting) => (
                <Card 
                  key={meeting.id} 
                  className="group hover:shadow-2xl transition-all duration-500 cursor-pointer border-none shadow-xl shadow-slate-200/40 flex flex-col p-6 relative overflow-hidden rounded-[24px]"
                  onClick={() => {
                    setSelectedMeeting(meeting);
                    setIsDetailModalOpen(true);
                  }}
                >
                  {/* Subtle hover background accent */}
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
                  
                  <div className="flex-1 space-y-4 relative z-10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white group-hover:rotate-6 transition-all duration-500 shadow-sm">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Date</span>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none px-2 py-0.5 text-[9px] font-black tracking-tighter">
                          {meeting.date}
                        </Badge>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-black text-slate-900 line-clamp-1 group-hover:text-emerald-600 transition-colors tracking-tight">
                        {meeting.title}
                      </h3>
                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-medium">
                        {meeting.content}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      <span>{meeting.createdAt ? format(meeting.createdAt.toDate ? meeting.createdAt.toDate() : new Date(meeting.createdAt), 'HH:mm', { locale: ko }) : '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest translate-x-2 group-hover:translate-x-0">
                        View <ChevronRight className="w-2.5 h-2.5" />
                      </div>
                      {(role === 'owner' || role === 'admin') && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMeetingToDelete(meeting.id);
                            setIsDeleteModalOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {monthKeys.length === 0 && (
          <div className="py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner shadow-slate-50">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">검색 결과가 없습니다</h3>
            <p className="text-slate-500 mt-2 font-medium">다른 검색어나 연도/월을 선택해 보세요.</p>
            <Button 
              variant="outline" 
              className="mt-8"
              onClick={() => {
                setSearchQuery('');
                setSelectedYear('all');
                setSelectedMonth('all');
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
        title="새 회의록 작성"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)} disabled={isUploading}>취소</Button>
            <Button 
              onClick={handleCreate} 
              variant="primary" 
              className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200/50"
              disabled={isUploading || !newMeeting.title || !newMeeting.content}
              leftIcon={isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
            >
              {isUploading ? '업로드 중...' : '회의록 등록'}
            </Button>
          </>
        }
      >
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Input 
              label="회의 제목" 
              placeholder="회의 제목을 입력하세요" 
              value={newMeeting.title}
              onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
              disabled={isUploading}
            />
            <Input 
              label="회의 일자" 
              type="date"
              value={newMeeting.date}
              onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}
              disabled={isUploading}
            />
          </div>
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">회의 내용</label>
            <textarea 
              className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white transition-all duration-300 min-h-[200px] font-medium leading-relaxed"
              placeholder="회의 내용을 상세히 입력하세요"
              value={newMeeting.content}
              onChange={(e) => setNewMeeting({...newMeeting, content: e.target.value})}
              disabled={isUploading}
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest">첨부 파일 (이미지 또는 PDF)</label>
              <span className="text-xs font-bold text-slate-400">{selectedFiles.length} / 5</span>
            </div>
            {selectedFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                    {previewUrls[index] ? (
                      <img src={previewUrls[index]} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <FileText className="w-8 h-8 text-emerald-500 mb-2" />
                        <span className="text-[10px] font-black text-slate-600 truncate px-2 w-full text-center">{file.name}</span>
                      </div>
                    )}
                    {!isUploading && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(index);
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg shadow-sm transition-all opacity-0 group-hover:opacity-100 z-10"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {selectedFiles.length < 5 && !isUploading && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="relative aspect-square rounded-2xl border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 flex flex-col items-center justify-center cursor-pointer transition-all group"
                  >
                    <Plus className="w-8 h-8 text-slate-400 group-hover:text-emerald-500 mb-2 transition-colors" />
                    <span className="text-xs font-bold text-slate-500 group-hover:text-emerald-600">추가하기</span>
                  </div>
                )}
              </div>
            )}
            {selectedFiles.length === 0 && (
              <div 
                onClick={() => !isUploading && fileInputRef.current?.click()}
                className={cn(
                  "relative overflow-hidden border-2 border-dashed rounded-[32px] transition-all cursor-pointer group p-16 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-[28px] bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all duration-500 shadow-inner">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-black text-slate-900 tracking-tight">클릭하여 파일 업로드 (최대 5개)</p>
                    <p className="text-xs font-medium text-slate-400">이미지 또는 PDF 파일을 선택해 주세요</p>
                  </div>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              className="hidden" 
              multiple
              accept="image/*,.pdf"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedMeeting?.title}
        size="lg"
      >
        {selectedMeeting && (
          <div className="space-y-8">
            <div className="p-6 bg-slate-50/50 rounded-[24px] border border-slate-100 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100 flex-shrink-0">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">회의 일자</p>
                    <p className="text-lg font-black text-slate-900 tracking-tight whitespace-nowrap">{selectedMeeting.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-1 sm:border-l sm:border-slate-200 sm:pl-6">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100 flex-shrink-0">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-0.5">작성 시각</p>
                    <p className="text-lg font-black text-slate-900 tracking-tight">
                      {selectedMeeting.createdAt ? format(selectedMeeting.createdAt.toDate ? selectedMeeting.createdAt.toDate() : new Date(selectedMeeting.createdAt), 'HH:mm', { locale: ko }) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {(selectedMeeting.files?.length ? selectedMeeting.files.length > 0 : !!selectedMeeting.fileUrl) && (
                <div className="pt-6 border-t border-slate-200/60 space-y-3">
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">첨부 파일 ({selectedMeeting.files?.length || 1})</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(selectedMeeting.files || [{
                      fileUrl: selectedMeeting.fileUrl!,
                      fileName: selectedMeeting.fileName || '첨부파일',
                      fileType: selectedMeeting.fileType || '',
                      fileSize: selectedMeeting.fileSize || 0
                    }]).map((file, idx, arr) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all group cursor-pointer" onClick={() => {
                        setLightboxFiles(arr);
                        setLightboxIndex(idx);
                        setLightboxOpen(true);
                      }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0 group-hover:scale-110 transition-transform">
                            <Paperclip className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-700 truncate group-hover:text-emerald-600 transition-colors">
                              {file.fileName}
                            </p>
                            <p className="text-[9px] text-slate-400">{file.fileType?.includes('pdf') || file.fileName?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'IMAGE'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-8 bg-white border border-slate-100 rounded-[32px] min-h-[250px] shadow-sm">
              <p className="text-slate-700 leading-loose whitespace-pre-wrap font-medium text-base">
                {selectedMeeting.content}
              </p>
            </div>

            <div className="flex items-center gap-4 p-5 bg-indigo-50/50 rounded-[24px] text-indigo-700 text-sm font-bold border border-indigo-100/50">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="leading-relaxed">
                본 회의록은 김포골드라인 토목팀 내부용입니다. <br/>
                <span className="text-indigo-500/70 text-xs font-black uppercase tracking-widest">Confidential Information</span>
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Lightbox Modal */}
      {lightboxOpen && lightboxFiles.length > 0 && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-300">
          <div className="flex items-center justify-between p-4 md:p-6 absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent">
            <div className="text-white">
              <p className="font-bold text-sm md:text-base">{lightboxFiles[lightboxIndex].fileName}</p>
              <p className="text-xs text-white/50">{lightboxIndex + 1} / {lightboxFiles.length}</p>
            </div>
            <div className="flex items-center gap-3">
              <a 
                href={lightboxFiles[lightboxIndex].fileUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                title="새 탭에서 열기"
              >
                <Maximize2 className="w-4 h-4" />
              </a>
              <button 
                onClick={() => setLightboxOpen(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-rose-500/80 flex items-center justify-center text-white transition-colors"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 flex items-center justify-center relative w-full h-full p-4 md:p-12 mt-16 md:mt-0">
            <button 
              className="absolute left-2 md:left-8 w-12 h-12 rounded-full bg-white/10 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-md transition-all disabled:opacity-30 disabled:hover:bg-white/10 z-10"
              onClick={() => setLightboxIndex(i => Math.max(0, i - 1))}
              disabled={lightboxIndex === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="w-full h-full flex items-center justify-center max-w-5xl mx-auto overflow-hidden rounded-2xl">
              {lightboxFiles[lightboxIndex].fileType?.includes('pdf') || lightboxFiles[lightboxIndex].fileName?.toLowerCase().endsWith('.pdf') ? (
                <iframe 
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(lightboxFiles[lightboxIndex].fileUrl)}&embedded=true`}
                  className="w-full h-full bg-white rounded-xl shadow-2xl"
                  title={lightboxFiles[lightboxIndex].fileName}
                />
              ) : (
                <img 
                  src={lightboxFiles[lightboxIndex].fileUrl} 
                  alt={lightboxFiles[lightboxIndex].fileName} 
                  className="max-w-full max-h-full object-contain rounded-xl shadow-2xl" 
                />
              )}
            </div>

            <button 
              className="absolute right-2 md:right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-emerald-600 text-white flex items-center justify-center backdrop-blur-md transition-all disabled:opacity-30 disabled:hover:bg-white/10 z-10"
              onClick={() => setLightboxIndex(i => Math.min(lightboxFiles.length - 1, i + 1))}
              disabled={lightboxIndex === lightboxFiles.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="회의록 삭제"
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
            삭제된 회의록은 복구할 수 없습니다. <br/>
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
