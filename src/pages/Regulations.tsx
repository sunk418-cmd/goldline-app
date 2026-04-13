import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, Bot, Loader2, FileText, RotateCcw, HelpCircle, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import Card from '@/src/components/ui/Card';
import Button from '@/src/components/ui/Button';
import Badge from '@/src/components/ui/Badge';
import { askGemini } from '@/src/services/geminiService';
import { TRACK_MAINTENANCE_REG, MAINTENANCE_GUIDE, TRACK_INSPECTION_REG } from '@/src/constants/regulations';

interface RegulationResult {
  trackMaintenanceReg: string;
  maintenanceGuide: string;
  trackInspectionReg: string;
}

export default function Regulations() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RegulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const faqs = [
    "분기기 정비 주기는 어떻게 되나요?",
    "궤도 틀림 허용 오차는 얼마인가요?",
    "특별점검은 언제 실시하나요?",
    "균열 발생 시 조치 방법은?"
  ];

  const handleSend = async (queryText?: string) => {
    const text = queryText || input;
    if (!text.trim() || isLoading) return;

    setInput(text);
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const context = {
        trackMaintenanceReg: TRACK_MAINTENANCE_REG,
        maintenanceGuide: MAINTENANCE_GUIDE,
        trackInspectionReg: TRACK_INSPECTION_REG
      };

      const answer = await askGemini(text, context);
      
      // Parse the answer
      const parsedResult: RegulationResult = {
        trackMaintenanceReg: extractSection(answer, '선로정비내규'),
        maintenanceGuide: extractSection(answer, '유지관리지침'),
        trackInspectionReg: extractSection(answer, '선로검사내규')
      };

      setResult(parsedResult);
      
      // Scroll to result
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.message || '답변을 생성하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const extractSection = (text: string, sectionName: string): string => {
    // Normalize section name for regex (handle spaces)
    const normalizedSectionName = sectionName.replace(/\s+/g, '\\s*');
    
    // 1. Try ###SectionName### format (with optional spaces)
    const hashRegex = new RegExp(`###\\s*${normalizedSectionName}\\s*###\\s*([\\s\\S]*?)(?=\\n\\s*###|$)`, 'i');
    const hashMatch = text.match(hashRegex);
    
    if (hashMatch && hashMatch[1].trim() && hashMatch[1].trim() !== '관련사항 없음') {
      return hashMatch[1].trim();
    }

    // 2. Try **SectionName** format
    const boldRegex = new RegExp(`\\*\\*\\s*${normalizedSectionName}\\s*\\*\\*\\s*[:\\-]?\\s*([\\s\\S]*?)(?=\\n\\s*\\*\\*|$)`, 'i');
    const boldMatch = text.match(boldRegex);
    
    if (boldMatch && boldMatch[1].trim() && boldMatch[1].trim() !== '관련사항 없음') {
      return boldMatch[1].trim();
    }

    // 3. If the AI explicitly said "관련사항 없음" in a matched section, return it
    if (hashMatch && hashMatch[1].trim() === '관련사항 없음') return '관련사항 없음';
    if (boldMatch && boldMatch[1].trim() === '관련사항 없음') return '관련사항 없음';

    return '관련사항 없음';
  };

  const handleReset = () => {
    setInput('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="text-center space-y-4 pt-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 rounded-[24px] text-indigo-600 shadow-xl shadow-indigo-100/50 mb-2 rotate-3">
          <Search className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tighter">내규/지침 통합 검색</h1>
        <p className="text-slate-500 font-medium text-sm max-w-2xl mx-auto leading-relaxed">
          질문 하나로 선로정비내규, 선로검사내규, 유지관리지침을 동시에 검색합니다.<br />
          <span className="text-indigo-600 font-black">김포골드라인 토목팀</span>의 규정을 AI가 정확하게 찾아드립니다.
        </p>
      </div>

      {/* Search Input Area */}
      <Card className="p-6 border-none shadow-xl shadow-slate-200/50 bg-white z-20 rounded-[32px]">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Input Field - Expanded Horizontally */}
            <div className="relative group flex-1 w-full">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="궁금한 규정이나 지침을 입력하세요..."
                className="w-full bg-slate-50/50 border-none rounded-[18px] pl-12 pr-6 py-4 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all duration-300"
              />
            </div>
            
            {/* Buttons Row - Compact and No Wrap */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                size="sm"
                className="flex-1 md:flex-none px-6 h-[48px] rounded-[14px] bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200/40 font-black text-xs uppercase tracking-widest whitespace-nowrap"
                leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              >
                {isLoading ? 'Searching...' : '규정 찾기'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="px-4 h-[48px] rounded-[14px] text-slate-400 hover:text-slate-900 hover:bg-slate-50 font-black flex items-center gap-2 border-slate-100 whitespace-nowrap"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline uppercase tracking-widest text-[10px]">Reset</span>
              </Button>
            </div>
          </div>

          {/* FAQ Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-50">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1.5 mr-1">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-500" /> FAQ:
            </span>
            {faqs.map((faq) => (
              <button
                key={faq}
                onClick={() => handleSend(faq)}
                disabled={isLoading}
                className="text-[11px] font-bold px-4 py-2 bg-slate-50 text-slate-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all duration-300 border border-slate-100 hover:border-indigo-500"
              >
                {faq}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[24px] flex items-center gap-4 text-rose-600 font-black tracking-tight animate-shake shadow-lg shadow-rose-100/50">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
            <AlertCircle className="w-6 h-6" />
          </div>
          {error}
        </div>
      )}

      {/* Results Area */}
      <div ref={resultRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 min-h-[500px]">
        {/* Track Maintenance Regulation Card */}
        <ResultCard
          title="선로정비내규"
          icon={<FileText className="w-6 h-6" />}
          color="indigo"
          content={result?.trackMaintenanceReg}
          isLoading={isLoading}
        />

        {/* Track Inspection Regulation Card */}
        <ResultCard
          title="선로검사내규"
          icon={<FileText className="w-6 h-6" />}
          color="violet"
          content={result?.trackInspectionReg}
          isLoading={isLoading}
        />

        {/* Maintenance Guide Card */}
        <ResultCard
          title="유지관리지침"
          icon={<FileText className="w-6 h-6" />}
          color="emerald"
          content={result?.maintenanceGuide}
          isLoading={isLoading}
        />
      </div>

      {/* Footer Info */}
      {!isLoading && !result && (
        <div className="text-center py-20 opacity-30">
          <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bot className="w-12 h-12 text-slate-300" />
          </div>
          <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs">Ready to analyze 3 regulatory documents simultaneously</p>
        </div>
      )}
    </div>
  );
}

interface ResultCardProps {
  title: string;
  icon: React.ReactNode;
  color: 'indigo' | 'emerald' | 'violet';
  content?: string;
  isLoading: boolean;
}

function ResultCard({ title, icon, color, content, isLoading }: ResultCardProps) {
  const colorClasses = {
    indigo: {
      bg: 'bg-indigo-50/50',
      text: 'text-indigo-600',
      border: 'border-indigo-100/50',
      iconBg: 'bg-indigo-600',
      badge: 'info'
    },
    emerald: {
      bg: 'bg-emerald-50/50',
      text: 'text-emerald-600',
      border: 'border-emerald-100/50',
      iconBg: 'bg-emerald-600',
      badge: 'success'
    },
    violet: {
      bg: 'bg-violet-50/50',
      text: 'text-violet-600',
      border: 'border-violet-100/50',
      iconBg: 'bg-violet-600',
      badge: 'warning'
    }
  };

  const colors = colorClasses[color];

  return (
    <Card className={`flex flex-col border-none shadow-xl shadow-slate-200/40 overflow-hidden group transition-all duration-500 rounded-[24px] ${isLoading ? 'animate-pulse' : ''}`}>
      <div className={`p-4 ${colors.bg} border-b ${colors.border} flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 ${colors.iconBg} text-white rounded-lg shadow-lg flex items-center justify-center group-hover:rotate-6 transition-transform duration-500`}>
            {icon}
          </div>
          <h3 className={`font-black text-sm ${colors.text} whitespace-nowrap tracking-tight`}>{title}</h3>
        </div>
        {!isLoading && content && content !== '관련사항 없음' && (
          <Badge variant="secondary" className={`${colors.bg} ${colors.text} border-none font-black text-[9px] uppercase tracking-widest px-2 py-0.5`}>Found</Badge>
        )}
      </div>
      
      <div className="flex-1 p-6 bg-white relative overflow-hidden">
        {/* Subtle background pattern */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 opacity-50" />
        
        {isLoading ? (
          <div className="space-y-4 relative z-10">
            <div className="h-3 bg-slate-50 rounded-full w-3/4 animate-pulse" />
            <div className="h-3 bg-slate-50 rounded-full w-full animate-pulse" />
            <div className="h-3 bg-slate-50 rounded-full w-5/6 animate-pulse" />
            <div className="h-3 bg-slate-50 rounded-full w-2/3 animate-pulse" />
          </div>
        ) : content ? (
          <div className={`relative z-10 text-xs leading-relaxed ${content === '관련사항 없음' ? 'text-slate-300 italic flex flex-col items-center justify-center h-full gap-3 py-8' : 'text-slate-700 prose prose-slate prose-xs max-w-none font-medium'}`}>
            {content === '관련사항 없음' && <AlertCircle className="w-8 h-8 opacity-10" />}
            {content === '관련사항 없음' ? (
              <span className="font-black uppercase tracking-widest text-[9px] text-slate-400 text-center">No relevant information found</span>
            ) : (
              <div className="markdown-body">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-200 gap-3 py-8 relative z-10">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center">
              <FileText className="w-6 h-6 opacity-20" />
            </div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Waiting for query</p>
          </div>
        )}
      </div>
    </Card>
  );
}


function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
