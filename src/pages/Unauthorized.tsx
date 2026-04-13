import React from 'react';
import { ShieldAlert, LogOut, MessageCircle } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import Card from '@/src/components/ui/Card';
import { APP_NAME } from '@/src/constants';

interface UnauthorizedProps {
  onLogout: () => void;
}

export default function Unauthorized({ onLogout }: UnauthorizedProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl text-red-600 shadow-xl shadow-red-100 mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            접근이 거부되었습니다
          </h1>
          <p className="text-red-500 font-bold">
            비인가 이메일 계정입니다.
          </p>
        </div>

        <Card className="p-8 border-none shadow-2xl shadow-gray-200/50">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="text-sm text-center text-gray-600 leading-relaxed space-y-2">
                <p className="font-bold text-gray-800 text-base">죄송합니다. 접속하신 이메일은 승인되지 않았습니다.</p>
                <p>현재 사용 중인 계정은 시스템 접근 권한이 없습니다.<br />
                업무를 위해 접근이 필요하신 경우, 아래 담당자에게 이메일 주소 등록을 요청해 주세요.</p>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 font-medium">
                  관리자: 김포골드라인 토목팀 운영 담당자
                </p>
              </div>

              <Button 
                onClick={onLogout}
                variant="outline"
                className="w-full py-4 text-lg"
                leftIcon={<LogOut className="w-5 h-5" />}
              >
                다른 계정으로 로그인
              </Button>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <p className="text-xs text-center text-gray-400 leading-relaxed">
                본 시스템은 김포골드라인 토목팀 전용입니다.<br />
                비인가자의 접근은 엄격히 제한됩니다.
              </p>
            </div>
          </div>
        </Card>

        <p className="text-center text-sm text-gray-400">
          &copy; 2026 김포골드라인 토목팀. All rights reserved.
        </p>
      </div>
    </div>
  );
}
