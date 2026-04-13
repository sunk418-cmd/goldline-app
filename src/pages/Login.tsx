import React, { useState } from 'react';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import Card from '@/src/components/ui/Card';
import { APP_NAME } from '@/src/constants';

interface LoginProps {
  onLogin: () => Promise<void>;
  onLoginRedirect: () => Promise<void>;
  error?: string | null;
}

export default function Login({ onLogin, onLoginRedirect, error }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await onLogin();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-200 mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {APP_NAME}
          </h1>
          <p className="text-gray-500 font-medium">
            토목팀 내부 관리 시스템에 오신 것을 환영합니다
          </p>
        </div>

        <Card className="p-8 border-none shadow-2xl shadow-gray-200/50">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm text-center text-gray-600">
                보안을 위해 구글 계정으로 로그인해 주세요.<br/>
                <span className="text-xs text-gray-400">(브라우저의 '3차 쿠키 차단' 해제가 필요할 수 있습니다)</span>
              </p>
              
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
              )}

              <Button 
                onClick={handleLogin}
                isLoading={isLoading}
                className="w-full py-4 text-lg"
                leftIcon={<LogIn className="w-5 h-5" />}
              >
                Google 계정으로 로그인 (팝업)
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">또는</span></div>
              </div>

              <Button 
                variant="outline"
                onClick={onLoginRedirect}
                className="w-full py-3 text-sm border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                리다이렉트 방식으로 로그인
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
