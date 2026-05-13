import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { pdfjs } from 'react-pdf';

// Set up the worker for PDF.js - using a CDN is more reliable
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Notices from './pages/Notices';
import Meetings from './pages/Meetings';
import Drawings from './pages/Drawings';
import Resources from './pages/Resources';
import Regulations from './pages/Regulations';
import SafetyDocs from './pages/SafetyDocs';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import { ROUTES, OPERATOR_EMAILS } from './constants';
import { UserProfile, Notice, Meeting, Drawing, Resource, AllowedUser, UserRole } from './types';
import { ToastContainer } from './components/ui/Toast';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { useToast } from './hooks/useToast';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signOut, 
  onAuthStateChanged,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  handleFirestoreError,
  OperationType,
  getDocFromServer
} from './firebase';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

function AppContent() {
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isPermissionLoading, setIsPermissionLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('시스템을 시작하고 있습니다...');
  const { toasts, showToast, removeToast } = useToast();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);

  useEffect(() => {
    // Check for redirect result on mount
    const checkRedirect = async () => {
      try {
        const { getRedirectResult } = await import('firebase/auth');
        const result = await getRedirectResult(auth);
        if (result) {
          showToast('success', '리다이렉트 로그인이 완료되었습니다!');
        }
      } catch (error: any) {
        console.error("Redirect summary error:", error);
        setLoginError(`리다이렉트 로그인 실패: ${error.message}`);
      }
    };
    checkRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsPermissionLoading(true);
      
      if (firebaseUser) {
        setLoadingMessage('로그인 정보를 확인 중입니다...');
        
        const userEmail = (firebaseUser.email || '').toLowerCase();
        const isOperator = OPERATOR_EMAILS.includes(userEmail);
        
        // 1. Create base profile
        const baseProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: userEmail,
          displayName: firebaseUser.displayName || '사용자',
          role: isOperator ? 'owner' : 'user',
          createdAt: new Date()
        };
        setUser(baseProfile);

        // 2. Sequential Permission Check
        setLoadingMessage(`${userEmail} 계정의 권한을 확인하고 있습니다...`);
        
        try {
          if (isOperator) {
            setIsAllowed(true);
            setLoadingMessage('운영자 권한으로 접속합니다...');
          } else {
            // Force server check for permission - strictly sequential
            const userDoc = await getDocFromServer(doc(db, 'allowedUsers', userEmail));
            
            if (userDoc.exists()) {
              const data = userDoc.data() as AllowedUser;
              setIsAllowed(true);
              setUser({ ...baseProfile, role: data.role });
              setLoadingMessage('권한 확인이 완료되었습니다. 데이터를 불러옵니다...');
            } else {
              setIsAllowed(false);
            }
          }
        } catch (e) {
          console.error("Whitelist check error:", e);
          setIsAllowed(false);
          showToast('error', '권한 확인 중 오류가 발생했습니다.');
        }
      } else {
        setUser(null);
        setIsAllowed(false);
      }
      
      setIsAuthReady(true);
      setIsPermissionLoading(false);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 1. Real-time Permission Listener (Keeps role and access in sync)
  useEffect(() => {
    if (!user || !isAuthReady) return;

    const unsubAllowed = onSnapshot(collection(db, 'allowedUsers'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data() as AllowedUser);
      setAllowedUsers(users);
      
      const userEmail = user.email.toLowerCase();
      const isInWhitelist = users.some(u => u.email.toLowerCase() === userEmail);
      const isOperator = OPERATOR_EMAILS.includes(userEmail);
      
      if (isOperator || isInWhitelist) {
        setIsAllowed(true);
        if (isInWhitelist) {
          const whiteListUser = users.find(u => u.email.toLowerCase() === userEmail);
          if (whiteListUser) {
            const finalRole = isOperator ? 'owner' : whiteListUser.role;
            if (user.role !== finalRole) {
              setUser(prev => prev ? {...prev, role: finalRole} : prev);
            }
          }
        }
      } else {
        setIsAllowed(false);
      }
    }, (error) => {
      console.warn("Permission listener error:", error);
    });

    return () => unsubAllowed();
  }, [user?.email, isAuthReady]);

  // 2. Real-time Data Listeners (Only runs when allowed)
  useEffect(() => {
    if (!user || !isAllowed) {
      // Clear data when access is lost
      setNotices([]);
      setMeetings([]);
      setDrawings([]);
      setResources([]);
      return;
    }

    const unsubNotices = onSnapshot(query(collection(db, 'notices'), orderBy('createdAt', 'desc')), (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
    }, (error) => {
      showToast('error', '공지사항 동기화 실패');
      handleFirestoreError(error, OperationType.GET, 'notices');
    });

    const unsubMeetings = onSnapshot(query(collection(db, 'meetings'), orderBy('createdAt', 'desc')), (snapshot) => {
      setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting)));
    }, (error) => {
      showToast('error', '회의록 동기화 실패');
      handleFirestoreError(error, OperationType.GET, 'meetings');
    });

    const unsubDrawings = onSnapshot(query(collection(db, 'drawings'), orderBy('createdAt', 'desc')), (snapshot) => {
      setDrawings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Drawing)));
    }, (error) => {
      showToast('error', '도면 동기화 실패');
      handleFirestoreError(error, OperationType.GET, 'drawings');
    });

    const unsubResources = onSnapshot(query(collection(db, 'resources'), orderBy('createdAt', 'desc')), (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
    }, (error) => {
      showToast('error', '자료실 동기화 실패');
      handleFirestoreError(error, OperationType.GET, 'resources');
    });

    return () => {
      unsubNotices();
      unsubMeetings();
      unsubDrawings();
      unsubResources();
    };
  }, [user, isAllowed]);

  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoginError(null);
    try {
      showToast('info', 'Google 로그인 창을 여는 중...');
      await signInWithPopup(auth, googleProvider);
      showToast('success', '로그인이 완료되었습니다!');
    } catch (error: any) {
      console.error("Login detail error:", error);
      
      let message = "로그인에 실패했습니다.";
      if (error.code === 'auth/popup-blocked') {
        message = "팝업이 차단되었습니다. 브라우저 설정을 확인해주세요.";
      } else if (error.code === 'auth/internal-error' || error.message.includes('invalid-action-code')) {
        message = "브라우저 설정에서 '3차 쿠키 차단'을 해제하거나 '리다이렉트 로그인'을 시도해주세요.";
      } else {
        message = `로그인 실패: ${error.code || error.message}`;
      }
      
      setLoginError(message);
      showToast('error', message);
    }
  };

  const handleLoginRedirect = async () => {
    setLoginError(null);
    try {
      showToast('info', 'Google 로그인 페이지로 이동합니다...');
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Redirect Login error:", error);
      setLoginError(`리다이렉트 로그인 실패: ${error.message}`);
      showToast('error', '로그인 페이지 이동 실패');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsAllowed(false);
      showToast('info', '로그아웃 되었습니다.');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  if (!isAuthReady || (user && isPermissionLoading)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-white rounded-full shadow-sm"></div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-2 max-w-xs text-center">
          <p className="text-sm font-black text-slate-900 tracking-tighter uppercase">{loadingMessage}</p>
          <div className="flex items-center gap-1">
            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-1 h-1 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-60">System Security Verification</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} onLoginRedirect={handleLoginRedirect} error={loginError} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  if (!isAllowed) {
    return (
      <>
        <Unauthorized onLogout={handleLogout} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Layout user={user} onLogout={handleLogout}>
        <Routes key={location.pathname}>
          <Route index element={<Dashboard notices={notices} meetings={meetings} drawings={drawings} resources={resources} isLoading={isLoading} />} />
          <Route path={ROUTES.NOTICES} element={<Notices notices={notices} role={user.role} onCreate={async (n) => { try { await addDoc(collection(db, 'notices'), { ...n, createdAt: serverTimestamp() }); showToast('success', '공지가 등록되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'notices'); } }} onUpdate={async () => {}} onDelete={async (id) => { try { await deleteDoc(doc(db, 'notices', id)); showToast('success', '공지가 삭제되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `notices/${id}`); } }} isLoading={isLoading} />} />
          <Route path={ROUTES.MEETINGS} element={<Meetings meetings={meetings} role={user.role} onCreate={async (m) => { try { await addDoc(collection(db, 'meetings'), { ...m, createdAt: serverTimestamp() }); showToast('success', '회의록이 등록되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'meetings'); } }} onUpdate={async () => {}} onDelete={async (id) => { try { await deleteDoc(doc(db, 'meetings', id)); showToast('success', '회의록이 삭제되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `meetings/${id}`); } }} isLoading={isLoading} />} />
          <Route path={ROUTES.DRAWINGS} element={<Drawings drawings={drawings} role={user.role} onDelete={async (id) => { try { await deleteDoc(doc(db, 'drawings', id)); showToast('success', '도면이 삭제되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `drawings/${id}`); } }} isLoading={isLoading} showToast={showToast} />} />
          <Route path={ROUTES.RESOURCES} element={<Resources resources={resources} role={user.role} onDelete={async (id) => { try { await deleteDoc(doc(db, 'resources', id)); showToast('success', '자료가 삭제되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `resources/${id}`); } }} isLoading={isLoading} showToast={showToast} />} />
          <Route path={ROUTES.REGULATIONS} element={<Regulations />} />
          <Route path={ROUTES.SAFETY_DOCS} element={<SafetyDocs />} />
          <Route path={ROUTES.ADMIN} element={(user.role === 'owner' || user.role === 'admin') ? <Admin userRole={user.role} allowedUsers={allowedUsers} drawings={drawings} resources={resources} notices={notices} meetings={meetings} onAddAllowedUser={async (e, r) => { try { await setDoc(doc(db, 'allowedUsers', e), { email: e, role: r }); showToast('success', '사용자가 추가되었습니다.'); } catch (err) { handleFirestoreError(err, OperationType.WRITE, `allowedUsers/${e}`); } }} onRemoveAllowedUser={async (e) => { try { await deleteDoc(doc(db, 'allowedUsers', e)); showToast('success', '사용자가 삭제되었습니다.'); } catch (err) { handleFirestoreError(err, OperationType.DELETE, `allowedUsers/${e}`); } }} isLoading={isLoading} /> : <Navigate to={ROUTES.DASHBOARD} />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} />} />
        </Routes>
      </Layout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
