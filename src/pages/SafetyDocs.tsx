import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronRight, ArrowLeft, Download, CheckCircle2, RotateCcw, CheckSquare, Square, Users, Plus, Minus, User, ShieldAlert } from 'lucide-react';
import { DOC_TEMPLATES, DocTemplate, COMMON_FIELDS, WORKER_ROLES, WorkerData, WorkerRole } from '../constants/templates';
import { SignatureInput } from '../components/SignatureInput';
import { RiskAssessmentModal } from '../components/RiskAssessmentModal';
import { RiskAssessment } from '../constants/riskData';
import { generateMergedDocx } from '../lib/docx';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { ROUTES } from '../constants';

type Step = 'main' | 'preview';

export default function SafetyDocs() {
  const [step, setStep] = useState<Step>('main');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [workers, setWorkers] = useState<WorkerData[]>([
    { name: '', nameHandwritten: '', signature: '', role: '작업책임자' },
    { name: '', nameHandwritten: '', signature: '', role: '작업자' },
  ]);
  const [activeDrawingRef, setActiveDrawingRef] = useState<{ index: number, field: 'signature' | 'nameHandwritten' } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [appliedRiskAssessment, setAppliedRiskAssessment] = useState<RiskAssessment | null>(null);

  const handleApplyRiskAssessment = (assessment: RiskAssessment) => {
    setAppliedRiskAssessment(assessment);
    if (formData['jobName'] !== undefined || true) {
      setFormData(prev => ({ ...prev, jobName: assessment.jobName, projectName: assessment.jobName }));
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleWorkerChange = (index: number, field: keyof WorkerData, value: string) => {
    setWorkers(prev => {
      const newWorkers = [...prev];
      const updatedWorker = { ...newWorkers[index], [field]: value };
      
      if (field === 'role' && value === '철도운행관리자') {
        return newWorkers.map((w, i) => {
          if (i === index) return updatedWorker;
          if (w.role === '철도운행관리자') return { ...w, role: '작업자' as WorkerRole };
          return w;
        });
      }
      
      newWorkers[index] = updatedWorker;
      return newWorkers;
    });
  };

  const addWorker = () => {
    if (workers.length >= 12) return;
    setWorkers(prev => [...prev, { name: '', nameHandwritten: '', signature: '', role: '작업자' }]);
  };

  const removeWorker = () => {
    if (workers.length <= 2) return;
    setWorkers(prev => prev.slice(0, -1));
  };

  const toggleTemplateSelection = (id: string) => {
    setSelectedTemplateIds(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    const selectedTemplates = DOC_TEMPLATES.filter(t => selectedTemplateIds.includes(t.id));
    if (selectedTemplates.length === 0) {
      alert('최소 하나 이상의 서류를 선택해주세요.');
      return;
    }

    const missingCommon = COMMON_FIELDS.filter(f => !formData[f.id]);
    if (missingCommon.length > 0) {
      alert(`${missingCommon[0].label} 항목을 입력해주세요.`);
      return;
    }

    for (let i = 0; i < workers.length; i++) {
      if (!workers[i].name) {
        alert(`작업자${i + 1}의 이름을 입력해주세요.`);
        return;
      }
      if (!workers[i].nameHandwritten) {
        alert(`작업자${i + 1}의 성명(수기)을 해주세요.`);
        return;
      }
      if (!workers[i].signature) {
        alert(`작업자${i + 1}의 서명을 해주세요.`);
        return;
      }
    }

    setIsGenerating(true);
    try {
      const finalData: Record<string, string> = { ...formData };
      
      // 날짜(일, 월요일)에 따른 작업 시간 분기 처리
      let globalAlcoholDate = '';
      let globalAlcoholTime = '00:30';
      if (formData.date) {
        const parts = formData.date.split('-');
        if (parts.length === 3) {
          globalAlcoholDate = `${parts[1]}/${parts[2]}`; // 기본: MM/DD 형식
        } else {
          globalAlcoholDate = formData.date;
        }

        const d = new Date(formData.date);
        const day = d.getDay(); // 0: 일요일, 1: 월요일
        finalData.workTime = (day === 0 || day === 1) ? '00:20 ~ 03:30' : '01:20 ~ 03:30';
        
        if (day === 0 || day === 1) {
          // 전날 날짜 계산
          const prevD = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          prevD.setDate(prevD.getDate() - 1);
          const mm = String(prevD.getMonth() + 1).padStart(2, '0');
          const dd = String(prevD.getDate()).padStart(2, '0');
          globalAlcoholDate = `${mm}/${dd}`;
          globalAlcoholTime = '23:30';
        }
      } else {
        finalData.workTime = '01:20 ~ 03:30';
      }
      
      for (let i = 0; i < 16; i++) {
        const w = workers[i];
        finalData[`worker_${i}_name`] = w ? w.name : '';
        finalData[`worker_${i}_role`] = w ? w.role : '';
        finalData[`worker_${i}_name_handwritten`] = w ? w.nameHandwritten : '';
        finalData[`worker_${i}_signature`] = w ? w.signature : '';
        finalData[`worker_${i}_phone`] = w ? (w.phone || '') : '';
        
        // 빈 줄(작업자가 없는 행)에는 공통 정보가 들어가지 않도록 개별 변수 추가
        finalData[`worker_${i}_date`] = w ? (formData.date || '') : '';
        finalData[`worker_${i}_alcoholDate`] = w ? globalAlcoholDate : '';
        finalData[`worker_${i}_alcoholTime`] = w ? globalAlcoholTime : '';
        finalData[`worker_${i}_companyName`] = w ? (formData.companyName || '') : '';
        finalData[`worker_${i}_manager_signature`] = w ? (workers[0]?.signature || '') : '';
        finalData[`worker_${i}_open_paren`] = w ? '(' : '';
        finalData[`worker_${i}_close_paren`] = w ? ')' : '';
      }

      if (appliedRiskAssessment) {
        for (let i = 0; i < 10; i++) {
          const t = appliedRiskAssessment.tasks[i];
          finalData[`task_${i}_task`] = t ? t.task : '';
          finalData[`task_${i}_details`] = t ? t.details : '';

          const f = appliedRiskAssessment.riskFactors[i];
          finalData[`factor_${i}_jobType`] = f ? f.jobType : '';
          finalData[`factor_${i}_factor`] = f ? f.factor : '';
          finalData[`factor_${i}_measure`] = f ? (f.measure || '') : '';
        }
      } else {
        for (let i = 0; i < 10; i++) {
          finalData[`task_${i}_task`] = '';
          finalData[`task_${i}_details`] = '';
          finalData[`factor_${i}_jobType`] = '';
          finalData[`factor_${i}_factor`] = '';
          finalData[`factor_${i}_measure`] = '';
        }
      }

      await generateMergedDocx(selectedTemplates, finalData);
      setStep('preview');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'DOCX 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">안전서류 생성</h1>
          <p className="text-slate-500 mt-1 font-medium text-sm">필요한 서류를 선택하고 한 번에 docx 파일로 생성하세요.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'main' && (
          <motion.div
            key="main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-10"
          >
            {/* Document Selection Section */}
            <section className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckSquare size={18} className="text-orange-600" />
                  서류 선택
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">작성할 서류를 클릭하여 선택하세요 (중복 선택 가능)</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {DOC_TEMPLATES.map((template) => {
                  const isSelected = selectedTemplateIds.includes(template.id);
                  return (
                    <button
                      key={template.id}
                      onClick={() => toggleTemplateSelection(template.id)}
                      className={cn(
                        "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 gap-2",
                        isSelected 
                          ? "bg-orange-50 border-orange-500 shadow-sm" 
                          : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                        isSelected ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"
                      )}>
                        <FileText size={20} />
                      </div>
                      <span className={cn(
                        "text-xs font-bold text-center line-clamp-1",
                        isSelected ? "text-orange-900" : "text-slate-600"
                      )}>
                        {template.name}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 size={14} className="text-orange-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Worker List Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Users size={18} className="text-orange-600" />
                    작업 인원 설정
                  </h2>
                  <p className="text-xs text-slate-500">최소 2명 이상 입력하세요.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={removeWorker}
                    className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:bg-slate-50 disabled:opacity-30"
                    disabled={workers.length <= 2}
                  >
                    <Minus size={16} />
                  </button>
                  <button 
                    onClick={addWorker}
                    className="p-2 bg-orange-500 rounded-lg text-white hover:bg-orange-600 shadow-md shadow-orange-200"
                    disabled={workers.length >= 5}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workers.map((worker, index) => (
                  <div key={index} className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none -mr-4 -mt-4"></div>
                    <div className="flex items-center justify-between relative z-10">
                      <span className="text-xs font-black text-orange-600 uppercase tracking-widest">작업자 {index + 1}</span>
                      {index === 0 && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200 font-bold">고정</span>}
                    </div>

                    <div className="space-y-3 relative z-10">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">이름</label>
                        <input
                          type="text"
                          value={worker.name}
                          onChange={(e) => handleWorkerChange(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm text-slate-900 transition-colors"
                          placeholder="이름 입력"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">작업공종</label>
                        {index === 0 ? (
                          <div className="w-full px-3 py-2 bg-orange-50 border border-orange-100 rounded-xl text-sm text-orange-700 font-bold flex items-center gap-2">
                            <User size={14} />
                            작업책임자
                          </div>
                        ) : (
                          <div className="relative">
                            <select
                              value={worker.role}
                              onChange={(e) => handleWorkerChange(index, 'role', e.target.value as any)}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm appearance-none pr-8 text-slate-900 transition-colors"
                            >
                              {WORKER_ROLES.filter(r => r !== '작업책임자').map(role => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <ChevronRight size={14} className="rotate-90" />
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {worker.role === '철도운행관리자' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">핸드폰 번호</label>
                          <input
                            type="tel"
                            value={worker.phone || ''}
                            onChange={(e) => handleWorkerChange(index, 'phone', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 text-sm text-slate-900 transition-colors"
                            placeholder="010-0000-0000"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 relative z-10">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">성명 (수기)</label>
                        {worker.nameHandwritten ? (
                          <div className="relative group">
                            <img 
                              src={worker.nameHandwritten} 
                              alt="Handwritten Name" 
                              className="w-full h-16 bg-slate-50 rounded-xl border border-slate-200 object-contain p-2"
                            />
                            <button 
                              onClick={() => handleWorkerChange(index, 'nameHandwritten', '')}
                              className="absolute top-1 right-1 p-1 bg-white text-slate-900 rounded-full shadow-md border border-slate-200 hover:bg-slate-100"
                            >
                              <RotateCcw size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveDrawingRef({ index, field: 'nameHandwritten' })}
                            className="w-full h-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-all hover:bg-orange-50/50"
                          >
                            <Plus size={16} />
                            <span className="text-[10px] font-bold">성명수기</span>
                          </button>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">서명</label>
                        {worker.signature ? (
                          <div className="relative group">
                            <img 
                              src={worker.signature} 
                              alt="Signature" 
                              className="w-full h-16 bg-slate-50 rounded-xl border border-slate-200 object-contain p-2"
                            />
                            <button 
                              onClick={() => handleWorkerChange(index, 'signature', '')}
                              className="absolute top-1 right-1 p-1 bg-white text-slate-900 rounded-full shadow-md border border-slate-200 hover:bg-slate-100"
                            >
                              <RotateCcw size={10} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setActiveDrawingRef({ index, field: 'signature' })}
                            className="w-full h-16 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-orange-400 hover:text-orange-500 transition-all hover:bg-orange-50/50"
                          >
                            <Plus size={16} />
                            <span className="text-[10px] font-bold">터치서명</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Common Information Section */}
            <section className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText size={18} className="text-orange-600" />
                  기타 정보 입력
                </h2>
                <p className="text-xs text-slate-500">서류에 삽입될 나머지 정보를 입력하세요.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {COMMON_FIELDS.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 ml-1 uppercase tracking-wider">{field.label}</label>
                    <input
                      type={field.type}
                      value={formData[field.id] || ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all text-sm text-slate-900 shadow-sm"
                      placeholder={`${field.label} 입력`}
                    />
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setIsRiskModalOpen(true)}
                className={cn(
                  "w-full lg:w-auto mt-4 py-3 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm border",
                  appliedRiskAssessment 
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" 
                    : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                )}
              >
                {appliedRiskAssessment ? (
                  <>
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span className="text-sm">위험성 평가 완료: {appliedRiskAssessment.jobName}</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={18} />
                    위험성 평가 등록
                  </>
                )}
              </button>
            </section>

            <div className="pt-6 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || selectedTemplateIds.length === 0}
                className={cn(
                  "py-4 px-8 bg-orange-600 text-white rounded-[24px] font-black text-base shadow-xl shadow-orange-500/30 hover:bg-orange-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3",
                  (isGenerating || selectedTemplateIds.length === 0) && "opacity-50 cursor-not-allowed grayscale"
                )}
              >
                {isGenerating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    문서 생성 중...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    {selectedTemplateIds.length > 0 
                      ? `${selectedTemplateIds.length}개 서류 DOCX 생성` 
                      : "서류를 선택해주세요"}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8 text-center py-20 bg-white rounded-[40px] shadow-sm border border-slate-100"
          >
            <div className="flex flex-col items-center gap-6">
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100">
                <CheckCircle2 size={56} className="text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">생성 완료!</h2>
                <p className="text-slate-500 font-medium">세로 양식은 하나의 파일로 병합되었으며,<br/>가로 양식(음주측정 등)은 양식 보존을 위해 별도로 다운로드 되었습니다.</p>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-6">
              <button
                onClick={() => setStep('main')}
                className="py-3 px-8 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-2xl transition-all font-bold"
              >
                돌아가기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <RiskAssessmentModal 
        isOpen={isRiskModalOpen} 
        onClose={() => setIsRiskModalOpen(false)} 
        onApply={handleApplyRiskAssessment}
        appliedId={appliedRiskAssessment?.id}
      />

      <AnimatePresence>
        {activeDrawingRef !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white border border-slate-200 rounded-[32px] p-8 space-y-6 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  작업자 {activeDrawingRef.index + 1} {activeDrawingRef.field === 'nameHandwritten' ? '성명 수기' : '서명'}
                </h3>
                <button 
                  onClick={() => setActiveDrawingRef(null)}
                  className="w-10 h-10 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-full flex items-center justify-center transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              </div>
              <SignatureInput 
                onSave={(dataUrl) => {
                  handleWorkerChange(activeDrawingRef.index, activeDrawingRef.field, dataUrl);
                  setActiveDrawingRef(null);
                }} 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
