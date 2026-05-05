import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ChevronRight, ArrowLeft, Share2, Download, CheckCircle2, RotateCcw, CheckSquare, Square, Users, Plus, Minus, User, ShieldAlert } from 'lucide-react';
import { DOC_TEMPLATES, DocTemplate, COMMON_FIELDS, WORKER_ROLES, WorkerData, WorkerRole } from './config/templates';
import { SignatureInput } from './components/SignatureInput';
import { RiskAssessmentModal } from './components/RiskAssessmentModal';
import { RiskAssessment } from './config/riskData';
import { generateMergedPdf, sharePdf } from './lib/pdf';
import { cn } from './lib/utils';

type Step = 'main' | 'preview';

export default function App() {
  const [step, setStep] = useState<Step>('main');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [workers, setWorkers] = useState<WorkerData[]>([
    { name: '', nameHandwritten: '', signature: '', role: '작업책임자' },
    { name: '', nameHandwritten: '', signature: '', role: '작업자' },
  ]);
  const [activeDrawingRef, setActiveDrawingRef] = useState<{ index: number, field: 'signature' | 'nameHandwritten' } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPdf, setGeneratedPdf] = useState<Uint8Array | null>(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [appliedRiskAssessment, setAppliedRiskAssessment] = useState<RiskAssessment | null>(null);

  const handleApplyRiskAssessment = (assessment: RiskAssessment) => {
    setAppliedRiskAssessment(assessment);
    // 공사명 필드(jobName)가 있으면 자동으로 채워줌
    if (formData['jobName'] !== undefined || true) {
      setFormData(prev => ({ ...prev, jobName: assessment.jobName }));
    }
  };

  const handleInputChange = (id: string, value: string) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleWorkerChange = (index: number, field: keyof WorkerData, value: string) => {
    setWorkers(prev => {
      const newWorkers = [...prev];
      const updatedWorker = { ...newWorkers[index], [field]: value };
      
      // 철도운행관리자 중복 방지 로직
      if (field === 'role' && value === '철도운행관리자') {
        return newWorkers.map((w, i) => {
          if (i === index) return updatedWorker;
          // 다른 사람이 철도운행관리자였다면 작업자로 변경
          if (w.role === '철도운행관리자') return { ...w, role: '작업자' as WorkerRole };
          return w;
        });
      }
      
      newWorkers[index] = updatedWorker;
      return newWorkers;
    });
  };

  const addWorker = () => {
    if (workers.length >= 5) return;
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

    // 공통 필드 체크
    const missingCommon = COMMON_FIELDS.filter(f => !formData[f.id]);
    if (missingCommon.length > 0) {
      alert(`${missingCommon[0].label} 항목을 입력해주세요.`);
      return;
    }

      // 작업자 필드 체크
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
      // PDF 생성을 위한 통합 데이터 구성
      const finalData: Record<string, string> = { ...formData };
      workers.forEach((w, i) => {
        finalData[`worker_${i}_name`] = w.name;
        finalData[`worker_${i}_name_handwritten`] = w.nameHandwritten;
        finalData[`worker_${i}_role`] = w.role;
        finalData[`worker_${i}_signature`] = w.signature;
      });

      const pdfBytes = await generateMergedPdf(selectedTemplates, finalData);
      setGeneratedPdf(pdfBytes);
      setStep('preview');
    } catch (error) {
      console.error(error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    if (!generatedPdf) return;
    const fileName = `안전서류_${new Date().toISOString().split('T')[0]}.pdf`;
    await sharePdf(generatedPdf, fileName);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-purple-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
              <FileText size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              SafetyDoc
            </h1>
          </div>
          {step === 'preview' && (
            <button 
              onClick={() => setStep('main')}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ArrowLeft size={20} />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 py-8">
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
                    <CheckSquare size={18} className="text-purple-600" />
                    서류 선택
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed">작성할 서류를 터치하여 선택하세요 (중복 선택 가능)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {DOC_TEMPLATES.map((template) => {
                    const isSelected = selectedTemplateIds.includes(template.id);
                    return (
                      <button
                        key={template.id}
                        onClick={() => toggleTemplateSelection(template.id)}
                        className={cn(
                          "relative flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 gap-2",
                          isSelected 
                            ? "bg-purple-50 border-purple-600 shadow-sm" 
                            : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                          isSelected ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400"
                        )}>
                          <FileText size={20} />
                        </div>
                        <span className={cn(
                          "text-xs font-bold text-center",
                          isSelected ? "text-purple-900" : "text-slate-600"
                        )}>
                          {template.name}
                        </span>
                        {isSelected && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 size={14} className="text-purple-600" />
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
                      <Users size={18} className="text-purple-600" />
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
                      className="p-2 bg-purple-600 rounded-lg text-white hover:bg-purple-700 shadow-md shadow-purple-200"
                      disabled={workers.length >= 5}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {workers.map((worker, index) => (
                    <div key={index} className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-600 uppercase tracking-widest">작업자 {index + 1}</span>
                        {index === 0 && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">고정</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase">이름</label>
                          <input
                            type="text"
                            value={worker.name}
                            onChange={(e) => handleWorkerChange(index, 'name', e.target.value)}
                            className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm text-slate-900"
                            placeholder="이름 입력"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase">작업공종</label>
                          {index === 0 ? (
                            <div className="w-full px-3 py-3 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-700 font-bold flex items-center gap-2">
                              <User size={14} />
                              작업책임자
                            </div>
                          ) : (
                            <div className="relative">
                              <select
                                value={worker.role}
                                onChange={(e) => handleWorkerChange(index, 'role', e.target.value as any)}
                                className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-sm appearance-none pr-8 text-slate-900"
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
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase">성명 (수기)</label>
                          {worker.nameHandwritten ? (
                            <div className="relative group">
                              <img 
                                src={worker.nameHandwritten} 
                                alt="Handwritten Name" 
                                className="w-full h-20 bg-slate-50 rounded-xl border border-slate-200 object-contain p-2"
                              />
                              <button 
                                onClick={() => handleWorkerChange(index, 'nameHandwritten', '')}
                                className="absolute top-1 right-1 p-1 bg-white/90 text-slate-900 rounded-full shadow-md border border-slate-200"
                              >
                                <RotateCcw size={10} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveDrawingRef({ index, field: 'nameHandwritten' })}
                              className="w-full h-20 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-purple-400 hover:text-purple-500 transition-all"
                            >
                              <Plus size={16} />
                              <span className="text-[10px]">성명수기</span>
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-semibold text-slate-400 ml-1 uppercase">서명</label>
                          {worker.signature ? (
                            <div className="relative group">
                              <img 
                                src={worker.signature} 
                                alt="Signature" 
                                className="w-full h-20 bg-slate-50 rounded-xl border border-slate-200 object-contain p-2"
                              />
                              <button 
                                onClick={() => handleWorkerChange(index, 'signature', '')}
                                className="absolute top-1 right-1 p-1 bg-white/90 text-slate-900 rounded-full shadow-md border border-slate-200"
                              >
                                <RotateCcw size={10} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setActiveDrawingRef({ index, field: 'signature' })}
                              className="w-full h-20 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-purple-400 hover:text-purple-500 transition-all"
                            >
                              <Plus size={16} />
                              <span className="text-[10px]">터치서명</span>
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
                    <FileText size={18} className="text-purple-600" />
                    기타 정보 입력
                  </h2>
                  <p className="text-xs text-slate-500">서류에 삽입될 나머지 정보를 입력하세요.</p>
                </div>

                <div className="space-y-5">
                  {COMMON_FIELDS.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 ml-1 uppercase tracking-wider">{field.label}</label>
                      <input
                        type={field.type}
                        value={formData[field.id] || ''}
                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                        className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-slate-900 placeholder:text-slate-300 shadow-sm"
                        placeholder={`${field.label} 입력`}
                      />
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={() => setIsRiskModalOpen(true)}
                  className={cn(
                    "w-full mt-4 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm border",
                    appliedRiskAssessment 
                      ? "bg-green-50 border-green-200 text-green-700" 
                      : "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  )}
                >
                  {appliedRiskAssessment ? (
                    <>
                      <CheckCircle2 size={20} className="text-green-500" />
                      <div className="flex flex-col items-center">
                        <span className="text-xs opacity-70">위험성 평가 완료</span>
                        <span>{appliedRiskAssessment.jobName}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <ShieldAlert size={20} />
                      위험성 평가하기
                    </>
                  )}
                </button>
              </section>

              <div className="sticky bottom-6 pt-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedTemplateIds.length === 0}
                  className={cn(
                    "w-full py-5 bg-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/30 hover:bg-purple-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3",
                    (isGenerating || selectedTemplateIds.length === 0) && "opacity-50 cursor-not-allowed grayscale"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Download size={22} />
                      {selectedTemplateIds.length > 0 
                        ? `${selectedTemplateIds.length}개의 서류 생성하기` 
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
              className="space-y-8 text-center py-10"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center border-2 border-green-100">
                  <CheckCircle2 size={56} className="text-green-500" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-slate-900">작성 완료!</h2>
                  <p className="text-slate-500">선택한 {selectedTemplateIds.length}개의 서류가 합쳐진<br/>PDF가 생성되었습니다.</p>
                </div>
              </div>

              <div className="grid gap-4 pt-6">
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/20 hover:bg-purple-700 transition-all"
                >
                  <Share2 size={22} />
                  공유하기
                </button>
                <button
                  onClick={handleShare}
                  className="w-full flex items-center justify-center gap-3 py-5 bg-white border border-slate-200 text-slate-700 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                >
                  <Download size={22} />
                  PDF 다운로드
                </button>
                <button
                  onClick={() => {
                    setStep('main');
                    setGeneratedPdf(null);
                  }}
                  className="w-full py-4 text-slate-400 hover:text-slate-600 transition-all font-medium"
                >
                  수정하기 / 처음으로
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Risk Assessment Modal */}
        <RiskAssessmentModal 
          isOpen={isRiskModalOpen} 
          onClose={() => setIsRiskModalOpen(false)} 
          onApply={handleApplyRiskAssessment}
          appliedId={appliedRiskAssessment?.id}
        />

        {/* Drawing Modal */}
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
                className="w-full max-w-sm bg-white border border-slate-200 rounded-3xl p-6 space-y-6 shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900 uppercase">
                    작업자 {activeDrawingRef.index + 1} {activeDrawingRef.field === 'nameHandwritten' ? '성명 수기' : '서명'}
                  </h3>
                  <button 
                    onClick={() => setActiveDrawingRef(null)}
                    className="text-slate-400 hover:text-slate-900"
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
      </main>

      {/* Footer Decoration */}
      <div className="fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-10" />
    </div>
  );
}

