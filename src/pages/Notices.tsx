import React, { useState } from 'react';
import { 
  Bell, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  AlertCircle
} from 'lucide-react';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Input from '@/src/components/ui/Input';
import Badge from '@/src/components/ui/Badge';
import Modal from '@/src/components/ui/Modal';
import { Notice, UserRole } from '@/src/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface NoticesProps {
  notices: Notice[];
  role: UserRole;
  onCreate: (notice: Omit<Notice, 'id' | 'createdAt'>) => Promise<void>;
  onUpdate: (id: string, notice: Partial<Notice>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  isLoading: boolean;
}

export default function Notices({ notices, role, onCreate, onUpdate, onDelete, isLoading }: NoticesProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [noticeToDelete, setNoticeToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newNotice, setNewNotice] = useState({
    title: '',
    content: '',
    author: '관리자' // In real app, get from auth
  });

  const filteredNotices = notices.filter(n => 
    n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    if (!newNotice.title || !newNotice.content) return;
    await onCreate({
      ...newNotice,
      authorEmail: 'admin@example.com' // In real app, get from auth
    });
    setIsCreateModalOpen(false);
    setNewNotice({ title: '', content: '', author: '관리자' });
  };

  const confirmDelete = async () => {
    if (noticeToDelete) {
      await onDelete(noticeToDelete);
      setIsDeleteModalOpen(false);
      setNoticeToDelete(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">공지사항</h1>
          <p className="text-slate-500 mt-2 font-medium text-lg">팀 내 주요 소식과 공지사항을 확인하세요.</p>
        </div>
        {(role === 'owner' || role === 'admin') && (
          <Button 
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<Plus className="w-5 h-5" />}
            size="lg"
            className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200/50 border-indigo-500/20"
          >
            새 공지 작성
          </Button>
        )}
      </div>

      {/* Search & Filter */}
      <Card className="border-none shadow-xl shadow-slate-200/40 p-1">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              type="text" 
              placeholder="제목, 내용, 작성자 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50/50 border-none rounded-[20px] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-300"
            />
          </div>
          <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />} className="rounded-[20px] px-8 border-slate-200">
            필터
          </Button>
        </div>
      </Card>

      {/* Notice List */}
      <div className="space-y-4">
        {filteredNotices.map((notice) => (
          <Card 
            key={notice.id} 
            className="group hover:shadow-2xl transition-all duration-500 cursor-pointer border-none shadow-xl shadow-slate-200/40 p-5 relative overflow-hidden rounded-[24px]"
            onClick={() => {
              setSelectedNotice(notice);
              setIsDetailModalOpen(true);
            }}
          >
            {/* Subtle hover background accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />
            
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-[18px] bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 transition-all duration-500 shadow-sm">
                  <Bell className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <Badge variant="secondary" className="bg-indigo-100 text-indigo-600 border-none font-black text-[8px] uppercase tracking-widest px-2 py-0.5">
                      Notice
                    </Badge>
                    <h3 className="text-base font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors tracking-tight">
                      {notice.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-3 font-medium">
                    {notice.content}
                  </p>
                  <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{notice.author}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{notice.createdAt ? format(notice.createdAt.toDate ? notice.createdAt.toDate() : new Date(notice.createdAt), 'yyyy.MM.dd', { locale: ko }) : '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex text-indigo-600 opacity-0 group-hover:opacity-100 transition-all duration-300 items-center gap-1 text-[9px] font-black uppercase tracking-widest translate-x-2 group-hover:translate-x-0">
                  Read <ChevronRight className="w-3 h-3" />
                </div>
                {(role === 'owner' || role === 'admin') && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    onClick={(e) => {
                      e.stopPropagation();
                      setNoticeToDelete(notice.id);
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

        {filteredNotices.length === 0 && (
          <div className="py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-200 shadow-inner shadow-slate-50">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell className="w-10 h-10 text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">검색 결과가 없습니다</h3>
            <p className="text-slate-500 mt-2 font-medium">다른 검색어를 입력해 보세요.</p>
            <Button 
              variant="outline" 
              className="mt-8"
              onClick={() => setSearchQuery('')}
            >
              검색 초기화
            </Button>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)}
        title="새 공지 작성"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>취소</Button>
            <Button onClick={handleCreate} variant="primary" className="bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50">공지 등록</Button>
          </>
        }
      >
        <div className="space-y-8">
          <Input 
            label="공지 제목" 
            placeholder="공지사항 제목을 입력하세요" 
            value={newNotice.title}
            onChange={(e) => setNewNotice({...newNotice, title: e.target.value})}
          />
          <div className="space-y-3">
            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">공지 내용</label>
            <textarea 
              className="w-full px-5 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all duration-300 min-h-[300px] font-medium leading-relaxed"
              placeholder="공지사항 내용을 상세히 입력하세요"
              value={newNotice.content}
              onChange={(e) => setNewNotice({...newNotice, content: e.target.value})}
            />
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={selectedNotice?.title}
        size="lg"
      >
        {selectedNotice && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-50/50 rounded-[24px] border border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm border border-slate-100">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">작성자</p>
                  <p className="text-sm font-black text-slate-900 tracking-tight">{selectedNotice.author}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-6">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-0.5">작성일</p>
                  <p className="text-sm font-black text-slate-900 tracking-tight">
                    {selectedNotice.createdAt ? format(selectedNotice.createdAt.toDate ? selectedNotice.createdAt.toDate() : new Date(selectedNotice.createdAt), 'yyyy년 MM월 dd일', { locale: ko }) : '-'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-white border border-slate-100 rounded-[24px] min-h-[300px] shadow-sm">
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap font-medium text-sm">
                {selectedNotice.content}
              </p>
            </div>

            <div className="flex items-center gap-4 p-5 bg-indigo-50/50 rounded-[24px] text-indigo-700 text-sm font-bold border border-indigo-100/50">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-500 shadow-sm flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="leading-relaxed">
                본 공지사항은 김포골드라인 토목팀 내부용입니다. <br/>
                <span className="text-indigo-500/70 text-xs font-black uppercase tracking-widest">Confidential Information</span>
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="공지사항 삭제"
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
            삭제된 공지사항은 복구할 수 없습니다. <br/>
            신중하게 결정해 주세요.
          </p>
        </div>
      </Modal>
    </div>
  );
}
