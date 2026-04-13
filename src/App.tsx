import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Notices from './pages/Notices';
import Meetings from './pages/Meetings';
import Drawings from './pages/Drawings';
import Resources from './pages/Resources';
import Regulations from './pages/Regulations';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import { ROUTES } from './constants';
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
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAllowed, setIsAllowed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toasts, showToast, removeToast } = useToast();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<AllowedUser[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log("onAuthStateChanged triggered:", firebaseUser?.email, firebaseUser?.uid);
      if (firebaseUser) {
        try {
          console.log("Checking allowedUsers for:", firebaseUser.email);
          // Check if user is in allowedUsers collection
          const allowedDoc = await getDoc(doc(db, 'allowedUsers', firebaseUser.email!));
          console.log("allowedDoc exists:", allowedDoc.exists());
          
          if (allowedDoc.exists() || firebaseUser.email === 'sunk418@gmail.com' || firebaseUser.email === 'sunk4180@gmail.com') {
            let role: UserRole = 'user';
            
            if (firebaseUser.email === 'sunk418@gmail.com' || firebaseUser.email === 'sunk4180@gmail.com') {
              role = 'owner';
            } else if (allowedDoc.exists()) {
              role = allowedDoc.data().role as UserRole;
            }
            
            const userProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email!,
              displayName: firebaseUser.displayName || '사용자',
              photoURL: firebaseUser.photoURL || undefined,
              role: role,
              createdAt: new Date()
            };

            // Save/Update user profile in Firestore
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), {
                ...userProfile,
                updatedAt: serverTimestamp()
              }, { merge: true });
            } catch (writeError) {
              handleFirestoreError(writeError, OperationType.WRITE, `users/${firebaseUser.uid}`);
            }

            setUser(userProfile);
            setIsAllowed(true);
          } else {
            setIsAllowed(false);
            await signOut(auth);
            showToast('error', '허가되지 않은 사용자입니다. 관리자에게 문의하세요.');
          }
        } catch (error) {
          console.error("Auth check error:", error);
          // If it's already a Firestore error thrown by handleFirestoreError, just rethrow it
          if (error instanceof Error && error.message.includes('operationType')) {
            throw error;
          }
          // Otherwise, wrap it if it's a permission error
          if (error instanceof Error && error.message.includes('permission')) {
            handleFirestoreError(error, OperationType.GET, `allowedUsers/${firebaseUser.email}`);
          }
          setIsAllowed(false);
        }
      } else {
        setUser(null);
        setIsAllowed(false);
      }
      setIsAuthReady(true);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listeners
  useEffect(() => {
    if (!user || !isAllowed) return;

    const unsubNotices = onSnapshot(query(collection(db, 'notices'), orderBy('createdAt', 'desc')), (snapshot) => {
      setNotices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notice)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'notices');
    });

    const unsubMeetings = onSnapshot(query(collection(db, 'meetings'), orderBy('createdAt', 'desc')), (snapshot) => {
      setMeetings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Meeting)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'meetings');
    });

    const unsubDrawings = onSnapshot(query(collection(db, 'drawings'), orderBy('createdAt', 'desc')), (snapshot) => {
      setDrawings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Drawing)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'drawings');
    });

    const unsubResources = onSnapshot(query(collection(db, 'resources'), orderBy('createdAt', 'desc')), (snapshot) => {
      setResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Resource)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'resources');
    });

    const unsubAllowed = onSnapshot(collection(db, 'allowedUsers'), (snapshot) => {
      setAllowedUsers(snapshot.docs.map(doc => doc.data() as AllowedUser));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'allowedUsers');
    });

    return () => {
      unsubNotices();
      unsubMeetings();
      unsubDrawings();
      unsubResources();
      unsubAllowed();
    };
  }, [user, isAllowed]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('success', '로그인 중입니다...');
    } catch (error: any) {
      // Don't show error toast if user just closed the popup
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Login cancelled by user (popup closed)");
        return;
      }
      console.error("Popup login failed, trying redirect:", error);
      showToast('info', '팝업 로그인이 차단되어 리다이렉트 로그인으로 전환합니다...');
      
      try {
        await signInWithRedirect(auth, googleProvider);
      } catch (redirectError: any) {
        console.error("Redirect login error:", redirectError);
        showToast('error', `로그인에 실패했습니다: ${redirectError.message}`);
      }
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

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Login onLogin={handleLogin} />
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
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path={ROUTES.DASHBOARD} element={<Dashboard notices={notices} meetings={meetings} drawings={drawings} resources={resources} isLoading={isLoading} />} />
          <Route path={ROUTES.NOTICES} element={<Notices notices={notices} role={user.role} onCreate={async (n) => { try { await addDoc(collection(db, 'notices'), { ...n, createdAt: serverTimestamp() }); showToast('success', '공지가 등록되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'notices'); } }} onUpdate={async () => {}} onDelete={async (id) => { try { await deleteDoc(doc(db, 'notices', id)); showToast('success', '공지가 삭제되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `notices/${id}`); } }} isLoading={isLoading} />} />
          <Route path={ROUTES.MEETINGS} element={<Meetings meetings={meetings} role={user.role} onCreate={async (m) => { try { await addDoc(collection(db, 'meetings'), { ...m, createdAt: serverTimestamp() }); showToast('success', '회의록이 등록되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'meetings'); } }} onUpdate={async () => {}} onDelete={async (id) => { try { await deleteDoc(doc(db, 'meetings', id)); showToast('success', '회의록이 삭제되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `meetings/${id}`); } }} isLoading={isLoading} />} />
          <Route path={ROUTES.DRAWINGS} element={<Drawings drawings={drawings} role={user.role} onDelete={async (id) => { try { await deleteDoc(doc(db, 'drawings', id)); showToast('success', '도면이 삭제되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `drawings/${id}`); } }} isLoading={isLoading} showToast={showToast} />} />
          <Route path={ROUTES.RESOURCES} element={<Resources resources={resources} role={user.role} onDelete={async (id) => { try { await deleteDoc(doc(db, 'resources', id)); showToast('success', '자료가 삭제되었습니다.'); } catch (e) { handleFirestoreError(e, OperationType.DELETE, `resources/${id}`); } }} isLoading={isLoading} showToast={showToast} />} />
          <Route path={ROUTES.REGULATIONS} element={<Regulations />} />
          <Route path={ROUTES.ADMIN} element={(user.role === 'owner' || user.role === 'admin') ? <Admin userRole={user.role} allowedUsers={allowedUsers} drawings={drawings} resources={resources} notices={notices} meetings={meetings} onAddAllowedUser={async (e, r) => { try { await setDoc(doc(db, 'allowedUsers', e), { email: e, role: r }); showToast('success', '사용자가 추가되었습니다.'); } catch (err) { handleFirestoreError(err, OperationType.WRITE, `allowedUsers/${e}`); } }} onRemoveAllowedUser={async (e) => { try { await deleteDoc(doc(db, 'allowedUsers', e)); showToast('success', '사용자가 삭제되었습니다.'); } catch (err) { handleFirestoreError(err, OperationType.DELETE, `allowedUsers/${e}`); } }} isLoading={isLoading} /> : <Navigate to={ROUTES.DASHBOARD} />} />
          <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} />} />
        </Routes>
      </Layout>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </Router>
  );
}
