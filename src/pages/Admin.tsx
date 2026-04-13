import React, { useState } from 'react';
import { 
  Settings, 
  Users, 
  ShieldCheck, 
  Plus, 
  Trash2, 
  Search, 
  Mail, 
  UserPlus,
  AlertCircle,
  CheckCircle2,
  Database,
  HardDrive,
  Activity
} from 'lucide-react';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Input from '@/src/components/ui/Input';
import Badge from '@/src/components/ui/Badge';
import Modal from '@/src/components/ui/Modal';
import { AllowedUser, UserRole, Drawing, Resource, Notice, Meeting } from '@/src/types';

interface AdminProps {
  userRole: UserRole;
  allowedUsers: AllowedUser[];
  drawings: Drawing[];
  resources: Resource[];
  notices: Notice[];
  meetings: Meeting[];
  onAddAllowedUser: (email: string, role: UserRole) => Promise<void>;
  onRemoveAllowedUser: (email: string) => Promise<void>;
  isLoading: boolean;
}

export default function Admin({ userRole, allowedUsers, drawings, resources, notices, meetings, onAddAllowedUser, onRemoveAllowedUser, isLoading }: AdminProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState<string | null>(null);

  const filteredUsers = allowedUsers.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    // Admins can only add users, Owner can add both
    const roleToAdd = userRole === 'owner' ? newRole : 'user';
    await onAddAllowedUser(newEmail, roleToAdd);
    setIsAddModalOpen(false);
    setNewEmail('');
    setNewRole('user');
  };

  // Calculate real storage usage (5GB limit)
  const totalLimitGB = 5;
  
  // 1. Sum up file sizes from Storage (Drawings, Resources)
  const fileBytes = [...drawings, ...resources].reduce((acc, curr) => acc + (curr.fileSize || 0), 0);
  
  // 2. Estimate text data size from Firestore (Notices, Meetings)
  // Rough estimate: 3 bytes per character for Korean text in UTF-8
  const textBytes = [
    ...notices.map(n => (n.title.length + n.content.length)),
    ...meetings.map(m => (m.title.length + m.content.length))
  ].reduce((acc, curr) => acc + (curr * 3), 0);

  const totalBytes = fileBytes + textBytes;
  const usedGB = totalBytes / (1024 * 1024 * 1024);
  const usagePercent = Math.min((usedGB / totalLimitGB) * 100, 100);

  const stats = [
    { label: '허용된 사용자', value: allowedUsers.length, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: '관리자 계정', value: allowedUsers.filter(u => u.role === 'admin').length, icon: ShieldCheck, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: '저장 공간 사용', value: totalBytes > 1024 * 1024 ? `${(totalBytes / (1024 * 1024)).toFixed(1)}MB` : `${(totalBytes / 1024).toFixed(1)}KB`, icon: HardDrive, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '시스템 상태', value: '정상', icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">시스템 관리</h1>
          <p className="text-slate-500 mt-1 font-medium text-base">사용자 권한 및 시스템 설정을 관리하세요.</p>
        </div>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<UserPlus className="w-4 h-4" />}
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-200/50 border-indigo-500/20"
        >
          사용자 추가
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 border-none shadow-xl shadow-slate-200/40 group hover:shadow-2xl transition-all duration-500 rounded-[24px]">
            <div className="flex items-center gap-4">
              <div className={cn("w-12 h-12 rounded-[18px] flex items-center justify-center group-hover:rotate-6 transition-all duration-500 shadow-sm", stat.bg, stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                <p className="text-xl font-black text-slate-900 tracking-tight">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* User Management */}
        <div className="lg:col-span-2 space-y-6">
          <Card 
            className="border-none shadow-xl shadow-slate-200/40 rounded-[32px] overflow-hidden"
            title="사용자 권한 관리" 
            description="시스템에 접근 가능한 사용자 이메일을 관리합니다."
          >
            <div className="space-y-6">
              <div className="relative group">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="이메일 검색..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-6 py-3 bg-slate-50/50 border-none rounded-[18px] text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-300"
                />
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">사용자 이메일</th>
                      <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">권한</th>
                      <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredUsers.map((user) => (
                      <tr key={user.email} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                              <Mail className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-slate-900">{user.email}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge variant="secondary" className={cn(
                            "border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5",
                            user.email === 'sunk418@gmail.com' ? "bg-amber-100 text-amber-600" :
                            user.role === 'admin' ? "bg-violet-100 text-violet-600" : "bg-indigo-100 text-indigo-600"
                          )}>
                            {user.email === 'sunk418@gmail.com' ? '운영자' : 
                             user.role === 'admin' ? '관리자' : '일반사용자'}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {user.email !== 'sunk418@gmail.com' && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-9 w-9 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              onClick={() => setDeleteConfirmEmail(user.email)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </div>

        {/* System Info */}
        <div className="space-y-6">
          <Card title="데이터베이스 정보" className="border-none shadow-xl shadow-slate-200/40 rounded-[24px]">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-[18px] border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                    <Database className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-700 tracking-tight">Cloud Firestore</span>
                </div>
                <Badge variant="success" className="bg-emerald-100 text-emerald-600 border-none font-black text-[8px] uppercase tracking-widest">Connected</Badge>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-[18px] border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-700 tracking-tight">Firebase Auth</span>
                </div>
                <Badge variant="success" className="bg-emerald-100 text-emerald-600 border-none font-black text-[8px] uppercase tracking-widest">Healthy</Badge>
              </div>
            </div>
          </Card>

          <Card title="저장 공간 사용량" className="border-none shadow-xl shadow-slate-200/40 rounded-[24px]">
            <div className="space-y-4">
              <div className="flex items-end justify-between mb-1">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Usage</p>
                  <p className="text-xl font-black text-slate-900 tracking-tighter">
                    {totalBytes > 1024 * 1024 * 1024 
                      ? `${usedGB.toFixed(2)}GB` 
                      : totalBytes > 1024 * 1024 
                        ? `${(totalBytes / (1024 * 1024)).toFixed(1)}MB` 
                        : `${(totalBytes / 1024).toFixed(1)}KB`}
                  </p>
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Limit: {totalLimitGB}GB</span>
              </div>
              
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
                <div 
                  className={cn(
                    "h-full transition-all duration-1000 ease-out rounded-full shadow-lg",
                    usagePercent > 90 ? "bg-rose-500" : usagePercent > 70 ? "bg-amber-500" : "bg-indigo-500"
                  )}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Remaining</p>
                  <p className="text-base font-black text-slate-900 tracking-tight">{(totalLimitGB - usedGB).toFixed(2)}GB</p>
                </div>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Usage Rate</p>
                  <p className="text-base font-black text-slate-900 tracking-tight">{usagePercent.toFixed(1)}%</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-amber-50/50 rounded-[20px] text-amber-700 text-[10px] font-bold border border-amber-100/50">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-amber-500 shadow-sm flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="leading-relaxed">
                  <p>5GB 무료 티어 기준입니다.</p>
                  <p className="mt-1 text-[9px] opacity-70 font-medium">
                    * 회의록/공지사항 텍스트 용량도 포함됩니다.<br/>
                    * 시스템 업데이트 전 등록된 파일은 용량 집계에서 제외될 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="사용자 추가"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>취소</Button>
            <Button onClick={handleAdd} variant="primary" className="bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200/50">사용자 등록</Button>
          </>
        }
      >
        <div className="space-y-8">
          <Input 
            label="이메일 주소" 
            placeholder="example@company.com" 
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />
          {userRole === 'owner' && (
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">권한 설정</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setNewRole('user')}
                  className={cn(
                    "px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest border-2 transition-all duration-300",
                    newRole === 'user' 
                      ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-lg shadow-indigo-100" 
                      : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"
                  )}
                >
                  일반사용자
                </button>
                <button
                  onClick={() => setNewRole('admin')}
                  className={cn(
                    "px-6 py-4 rounded-2xl text-sm font-black uppercase tracking-widest border-2 transition-all duration-300",
                    newRole === 'admin' 
                      ? "bg-violet-50 border-violet-600 text-violet-700 shadow-lg shadow-violet-100" 
                      : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50"
                  )}
                >
                  관리자
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmEmail}
        onClose={() => setDeleteConfirmEmail(null)}
        title="사용자 권한 삭제"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteConfirmEmail(null)}>취소</Button>
            <Button 
              variant="primary"
              className="bg-rose-600 hover:bg-rose-700 shadow-rose-200/50 border-rose-500/20"
              onClick={async () => {
                if (deleteConfirmEmail) {
                  await onRemoveAllowedUser(deleteConfirmEmail);
                  setDeleteConfirmEmail(null);
                }
              }}
            >
              삭제하기
            </Button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center py-6">
          <div className="w-20 h-20 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-inner">
            <Trash2 className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">정말 삭제하시겠습니까?</h3>
          <div className="mt-4 p-4 bg-slate-50 rounded-2xl w-full border border-slate-100">
            <p className="text-indigo-600 font-black tracking-tight">{deleteConfirmEmail}</p>
          </div>
          <p className="text-slate-500 mt-4 font-medium leading-relaxed">
            이 사용자의 모든 시스템 접근 권한이 즉시 차단됩니다. <br/>
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
