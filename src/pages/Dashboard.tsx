import React from 'react';
import { 
  Bell, 
  FileText, 
  Image as ImageIcon, 
  FolderOpen, 
  Search, 
  ChevronRight,
  Plus,
  TrendingUp,
  Users,
  Calendar,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Card from '@/src/components/ui/Card';
import Badge from '@/src/components/ui/Badge';
import Button from '@/src/components/ui/Button';
import { ROUTES } from '@/src/constants';
import { Notice, Meeting, Drawing, Resource } from '@/src/types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import PdfPreview from '@/src/components/ui/PdfPreview';

interface DashboardProps {
  notices: Notice[];
  meetings: Meeting[];
  drawings: Drawing[];
  resources: Resource[];
  isLoading: boolean;
}

export default function Dashboard({ notices, meetings, drawings, resources, isLoading }: DashboardProps) {
  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">대시보드</h1>
          <p className="text-slate-500 mt-1 font-medium text-base">김포골드라인 토목팀 시스템에 오신 것을 환영합니다.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={ROUTES.NOTICES}>
            <Button leftIcon={<Plus className="w-4 h-4" />} size="sm">새 공지 작성</Button>
          </Link>
        </div>
      </div>

      {/* 1. Notices Section (Top Priority) */}
      <div className="space-y-6">
        {/* Compact Headlight Notice (Latest) */}
        {notices.length > 0 && (
          <div className="relative overflow-hidden rounded-[24px] bg-slate-900 text-white p-6 shadow-xl shadow-slate-200/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-500 text-white border-none text-[9px] font-black px-2 py-0.5 uppercase tracking-widest">Update</Badge>
                  <span className="text-slate-500 font-bold text-[10px] uppercase tracking-widest">최신 공지사항</span>
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight leading-tight truncate">
                    {notices[0].title}
                  </h2>
                  <p className="text-slate-400 text-sm mt-1 line-clamp-1 font-medium leading-relaxed max-w-2xl">
                    {notices[0].content}
                  </p>
                </div>
              </div>
              <Link to={ROUTES.NOTICES} className="flex-shrink-0">
                <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 border-none px-6 font-black text-xs uppercase tracking-widest">
                  View Detail
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Access - Middle Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to={ROUTES.REGULATIONS} className="flex items-center gap-3 p-4 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-all duration-300 group border border-indigo-100/50">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Search className="w-5 h-5" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">내규 검색</span>
        </Link>
        <Link to={ROUTES.MEETINGS} className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all duration-300 group border border-emerald-100/50">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">회의록</span>
        </Link>
        <Link to={ROUTES.DRAWINGS} className="flex items-center gap-3 p-4 rounded-2xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition-all duration-300 group border border-violet-100/50">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <ImageIcon className="w-5 h-5" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">도면게시판</span>
        </Link>
        <Link to={ROUTES.RESOURCES} className="flex items-center gap-3 p-4 rounded-2xl bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all duration-300 group border border-amber-100/50">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <FolderOpen className="w-5 h-5" />
          </div>
          <span className="text-xs font-black uppercase tracking-widest">자료실</span>
        </Link>
      </div>

      {/* 3-Column Grid for Other Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 1. Drawings */}
        <Card 
          title="최근 도면" 
          headerAction={
            <Link to={ROUTES.DRAWINGS} className="text-[10px] font-black text-violet-600 hover:text-violet-700 flex items-center gap-1 uppercase tracking-widest">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          }
          className="border-none shadow-xl shadow-slate-200/40 rounded-[32px]"
        >
          <div className="grid grid-cols-1 gap-4 -mx-2">
            {drawings.slice(0, 3).map((drawing) => (
              <Link key={drawing.id} to={ROUTES.DRAWINGS} className="group flex items-center gap-4 p-2 rounded-2xl hover:bg-slate-50 transition-all">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm relative flex-shrink-0">
                  {drawing.fileType === 'pdf' ? (
                    <PdfPreview imageUrl={drawing.imageUrl} />
                  ) : (
                    <img src={drawing.imageUrl} alt={drawing.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900 truncate text-xs group-hover:text-violet-600 transition-colors">{drawing.title}</h4>
                  <Badge className="mt-1 bg-slate-100 text-slate-500 border-none text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest">{drawing.category}</Badge>
                </div>
              </Link>
            ))}
            {drawings.length === 0 && (
              <div className="p-8 text-center">
                <p className="text-slate-400 text-xs font-bold tracking-tight">등록된 도면이 없습니다.</p>
              </div>
            )}
          </div>
        </Card>

        {/* 2. Resources */}
        <Card 
          title="자료실" 
          headerAction={
            <Link to={ROUTES.RESOURCES} className="text-[10px] font-black text-amber-600 hover:text-amber-700 flex items-center gap-1 uppercase tracking-widest">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          }
          className="border-none shadow-xl shadow-slate-200/40 rounded-[32px]"
        >
          <div className="divide-y divide-slate-50 -mx-6 -my-6">
            {resources.slice(0, 4).map((resource) => (
              <Link 
                key={resource.id} 
                to={ROUTES.RESOURCES}
                className="flex items-center gap-4 p-5 hover:bg-slate-50/50 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors tracking-tight text-sm truncate">
                    {resource.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{resource.fileType}</p>
                </div>
              </Link>
            ))}
            {resources.length === 0 && (
              <div className="p-12 text-center">
                <p className="text-slate-400 text-xs font-bold tracking-tight">등록된 자료가 없습니다.</p>
              </div>
            )}
          </div>
        </Card>

        {/* 3. Meetings */}
        <Card 
          title="최근 회의록" 
          headerAction={
            <Link to={ROUTES.MEETINGS} className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 uppercase tracking-widest">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          }
          className="border-none shadow-xl shadow-slate-200/40 rounded-[32px]"
        >
          <div className="grid grid-cols-1 gap-4 -mx-2">
            {meetings.slice(0, 3).map((meeting) => (
              <Link 
                key={meeting.id} 
                to={ROUTES.MEETINGS}
                className="p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-bold text-slate-900 group-hover:text-emerald-700 line-clamp-1 tracking-tight text-xs">{meeting.title}</h4>
                  <FileText className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                </div>
                <p className="text-[10px] text-slate-500 line-clamp-2 mb-3 font-medium leading-relaxed">{meeting.content}</p>
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100/60">
                  <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar className="w-2.5 h-2.5" />
                    {meeting.date}
                  </div>
                </div>
              </Link>
            ))}
            {meetings.length === 0 && (
              <div className="col-span-1 p-12 text-center">
                <p className="text-slate-400 text-xs font-bold tracking-tight">등록된 회의록이 없습니다.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
