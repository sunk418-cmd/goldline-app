import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Save, Search, ChevronRight, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { RiskAssessment, RiskTask, RiskFactor, INITIAL_RISK_DATA } from '../config/riskData';
import { cn } from '../lib/utils';

interface RiskAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply?: (assessment: RiskAssessment) => void;
  appliedId?: string;
}

export function RiskAssessmentModal({ isOpen, onClose, onApply, appliedId }: RiskAssessmentModalProps) {
  const [savedAssessments, setSavedAssessments] = useState<RiskAssessment[]>([]);
  const [jobName, setJobName] = useState('');
  const [tasks, setTasks] = useState<RiskTask[]>([]);
  const [riskFactors, setRiskFactors] = useState<RiskFactor[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('risk_assessments');
    if (stored) {
      setSavedAssessments(JSON.parse(stored));
    } else {
      setSavedAssessments(INITIAL_RISK_DATA);
      localStorage.setItem('risk_assessments', JSON.stringify(INITIAL_RISK_DATA));
    }
  }, []);

  const handleSelectJob = (risk: RiskAssessment) => {
    setJobName(risk.jobName);
    setTasks([...risk.tasks]);
    setRiskFactors([...risk.riskFactors]);
    setSearchTerm('');
    setIsEditing(true);
  };

  const startNew = () => {
    setJobName('');
    setTasks([{ id: Date.now().toString(), task: '', details: '' }]);
    setRiskFactors([{ id: (Date.now() + 1).toString(), jobType: '', factor: '' }]);
    setIsEditing(true);
    setSearchTerm('');
  };

  const addTask = () => {
    setTasks([...tasks, { id: Date.now().toString(), task: '', details: '' }]);
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const addFactor = () => {
    setRiskFactors([...riskFactors, { id: Date.now().toString(), jobType: '', factor: '' }]);
  };

  const removeFactor = (id: string) => {
    setRiskFactors(riskFactors.filter(f => f.id !== id));
  };

  const handleApply = (assessment: RiskAssessment) => {
    if (onApply) {
      onApply(assessment);
      onClose();
    }
  };

  const handleSave = () => {
    if (!jobName.trim()) {
      alert('작업명을 입력해주세요.');
      return;
    }

    try {
      const newAssessment: RiskAssessment = {
        id: Date.now().toString(),
        jobName,
        tasks,
        riskFactors,
        updatedAt: new Date().toISOString(),
      };

      const updated = [
        newAssessment,
        ...savedAssessments.filter(a => a.jobName.trim() !== jobName.trim())
      ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

      setSavedAssessments(updated);
      localStorage.setItem('risk_assessments', JSON.stringify(updated));
      
      alert('성공적으로 저장되었습니다.');
      setIsEditing(false); // 저장 후 목록으로 이동
    } catch (error) {
      console.error('Save error:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (deleteConfirmId === id) {
      // Second click: perform delete
      const updated = savedAssessments.filter(a => a.id !== id);
      setSavedAssessments(updated);
      localStorage.setItem('risk_assessments', JSON.stringify(updated));
      setDeleteConfirmId(null);
    } else {
      // First click: ask to confirm
      setDeleteConfirmId(id);
      // Auto cancel after 3 seconds
      setTimeout(() => {
        setDeleteConfirmId(prev => prev === id ? null : prev);
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl shadow-purple-500/10"
      >
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-orange-400" size={20} />
            <h2 className="text-lg font-bold">위험성 평가하기</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {!isEditing ? (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-900">작업을 선택하거나 새로 만드세요</h3>
                <p className="text-sm text-slate-500">기존에 저장된 평가서를 불러와 재사용할 수 있습니다.</p>
              </div>

              <div className="grid gap-3">
                <button 
                  onClick={startNew}
                  className="w-full p-4 bg-purple-50 border-2 border-dashed border-purple-200 rounded-2xl flex items-center justify-center gap-2 text-purple-600 font-bold hover:bg-purple-100 transition-all"
                >
                  <Plus size={20} />
                  새로운 작업 위험성 평가 작성
                </button>

                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="저장된 작업 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-4">
                  {savedAssessments.filter(item => item.jobName.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
                    const isApplied = appliedId === item.id;
                    const isConfirmingDelete = deleteConfirmId === item.id;

                    return (
                      <div key={item.id} className="relative group">
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectJob(item)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleSelectJob(item);
                            }
                          }}
                          className={cn(
                            "w-full p-4 bg-white border rounded-2xl flex flex-col gap-2 hover:shadow-md transition-all cursor-pointer outline-none focus:ring-2 focus:ring-purple-200",
                            isApplied ? "border-orange-500 bg-orange-50/30" : "border-slate-200"
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <FileText size={16} className={isApplied ? "text-orange-500" : "text-slate-400"} />
                                <div className="font-bold text-slate-900 truncate">{item.jobName}</div>
                                {isApplied && (
                                  <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] rounded-full font-bold">적용됨</span>
                                )}
                              </div>
                              <div className="text-xs text-slate-400">최근 수정: {new Date(item.updatedAt).toLocaleDateString()}</div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 shrink-0 mt-1" />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 mt-1">
                            <button
                              onClick={(e) => handleDelete(e, item.id)}
                              className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all text-xs font-medium",
                                isConfirmingDelete 
                                  ? "bg-red-500 text-white animate-pulse" 
                                  : "text-slate-400 hover:text-red-500 hover:bg-red-50"
                              )}
                            >
                              <Trash2 size={14} />
                              {isConfirmingDelete ? "정말 삭제할까요?" : "삭제"}
                            </button>
                            
                            {!isApplied && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleApply(item);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition-all shadow-sm"
                              >
                                <CheckCircle2 size={14} />
                                적용하기
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
              {/* Job Name Area */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">공사(작업)명</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 font-bold text-slate-900"
                    placeholder="예: 분기기 인력점검"
                  />
                  <button 
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold hover:bg-slate-200 transition-all text-sm"
                  >
                    목록
                  </button>
                </div>
              </div>

              {/* STEP 2 */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 bg-purple-600 text-white rounded-md flex items-center justify-center text-[10px]">STEP 2</span>
                      작업 순서 및 작업방법
                    </h4>
                  </div>
                  <button onClick={addTask} className="text-purple-600 hover:bg-purple-50 p-1.5 rounded-lg transition-colors">
                    <Plus size={20} />
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-400 w-12 text-center">NO</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-400">작업</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-400">세부내용</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tasks.map((task, index) => (
                        <tr key={task.id} className="group">
                          <td className="px-3 py-3 text-center text-slate-400 font-mono text-xs">{index + 1}</td>
                          <td className="px-3 py-3">
                            <input 
                              value={task.task}
                              onChange={(e) => {
                                const newTasks = [...tasks];
                                newTasks[index].task = e.target.value;
                                setTasks(newTasks);
                              }}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0"
                              placeholder="작업 내용"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input 
                              value={task.details}
                              onChange={(e) => {
                                const newTasks = [...tasks];
                                newTasks[index].details = e.target.value;
                                setTasks(newTasks);
                              }}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0"
                              placeholder="세부 상세 내용"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <button onClick={() => removeTask(task.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* STEP 3 */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 bg-orange-500 text-white rounded-md flex items-center justify-center text-[10px]">STEP 3</span>
                      작업 위험요인 제거
                    </h4>
                  </div>
                  <button onClick={addFactor} className="text-orange-600 hover:bg-orange-50 p-1.5 rounded-lg transition-colors">
                    <Plus size={20} />
                  </button>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-400 w-12 text-center">NO</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-400 w-24">작업공종</th>
                        <th className="px-3 py-2 text-left text-xs font-bold text-slate-400">위험요인</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {riskFactors.map((factor, index) => (
                        <tr key={factor.id} className="group">
                          <td className="px-3 py-3 text-center text-slate-400 font-mono text-xs">{index + 1}</td>
                          <td className="px-3 py-3">
                            <input 
                              value={factor.jobType}
                              onChange={(e) => {
                                const newFactors = [...riskFactors];
                                newFactors[index].jobType = e.target.value;
                                setRiskFactors(newFactors);
                              }}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0"
                              placeholder="공종"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input 
                              value={factor.factor}
                              onChange={(e) => {
                                const newFactors = [...riskFactors];
                                newFactors[index].factor = e.target.value;
                                setRiskFactors(newFactors);
                              }}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none p-0"
                              placeholder="위험요인 설명"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <button onClick={() => removeFactor(factor.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={handleSave}
                  className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  <Save size={20} />
                </button>
                <button 
                  onClick={() => handleApply({ id: Date.now().toString(), jobName, tasks, riskFactors, updatedAt: new Date().toISOString() })}
                  className="flex-1 py-4 bg-orange-500 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={20} />
                  이 평가서로 적용하기
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
