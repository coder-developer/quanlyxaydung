import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { 
  Cloud, 
  Folder, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  Upload, 
  Plus, 
  Trash2, 
  ExternalLink, 
  ChevronRight, 
  Search, 
  ArrowLeft, 
  RefreshCw, 
  LogOut, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  HardDrive,
  FolderPlus,
  ArrowUpRight,
  Info
} from 'lucide-react';
import firebaseConfig from '../../firebase-applet-config.json';
import { Project } from '../types';

interface DriveManagerProps {
  projects: Project[];
  backupData: unknown;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

interface Breadcrumb {
  id: string;
  name: string;
}

// Ensure Firebase is initialized
const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(firebaseApp);

export default function DriveManager({ projects, backupData }: DriveManagerProps) {
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(true);

  // Drive Explorer State
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([{ id: 'root', name: 'My Drive' }]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');

  // UI States
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Custom dialogs & feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; isFolder: boolean } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto clear toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auth State Listener with in-memory caching rules
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // If we have an active session, let's check if the token is available
        if (accessToken) {
          setNeedsAuth(false);
        } else {
          // Token is strictly in-memory, if page refreshed, request re-auth popup
          setNeedsAuth(true);
        }
      } else {
        setUser(null);
        setAccessToken(null);
        setNeedsAuth(true);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [accessToken]);

  // Handle Google Drive Sign In with correct Drive scopes
  const handleSignIn = async () => {
    setLoadingAuth(true);
    const provider = new GoogleAuthProvider();
    
    // Chỉ quản lý các tệp do ứng dụng tạo hoặc người dùng chọn, không xin toàn quyền Drive.
    provider.addScope('https://www.googleapis.com/auth/drive.file');

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error('Không thể khởi tạo mã xác thực từ Google Auth.');
      }

      setAccessToken(token);
      setNeedsAuth(false);
      setToast({ type: 'success', message: 'Kết nối Google Drive thành công!' });
    } catch (error: any) {
      console.error('Lỗi đăng nhập Google Auth:', error);
      setToast({ 
        type: 'error', 
        message: error.message || 'Đăng nhập thất bại. Vui lòng xác nhận quyền truy cập Google Drive.' 
      });
    } finally {
      setLoadingAuth(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setAccessToken(null);
      setUser(null);
      setNeedsAuth(true);
      setFiles([]);
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }]);
      setCurrentFolderId('root');
      setToast({ type: 'info', message: 'Đã ngắt kết nối tài khoản Google Drive.' });
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  // Fetch Files from Google Drive API
  const fetchFiles = useCallback(async (folderId: string, search: string = '') => {
    if (!accessToken) return;
    setLoadingFiles(true);
    try {
      let q = `'${folderId}' in parents and trashed = false`;
      if (search) {
        q = `name contains '${search}' and trashed = false`;
      }

      const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,modifiedTime,webViewLink)&orderBy=folder,name&pageSize=50`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, force re-auth
          setNeedsAuth(true);
          setAccessToken(null);
          throw new Error('Phiên làm việc hết hạn. Vui lòng đăng nhập lại Google Drive.');
        }
        throw new Error(`Truy vấn Drive thất bại: ${response.statusText}`);
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error: any) {
      console.error('Drive fetching error:', error);
      setToast({ type: 'error', message: error.message || 'Không thể tải danh sách tệp từ Google Drive.' });
    } finally {
      setLoadingFiles(false);
    }
  }, [accessToken]);

  // Load files when active directory or auth token changes
  useEffect(() => {
    if (accessToken && !needsAuth) {
      fetchFiles(currentFolderId, searchQuery);
    }
  }, [accessToken, needsAuth, currentFolderId, fetchFiles]);

  // Handle Search Input Debouncing / Triggers
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFiles(currentFolderId, searchQuery);
  };

  // Navigate deeper into a folder
  const handleFolderClick = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs(prev => [...prev, { id: folderId, name: folderName }]);
    setSearchQuery('');
  };

  // Click on a breadcrumb path to navigate back
  const handleBreadcrumbClick = (crumb: Breadcrumb, index: number) => {
    setCurrentFolderId(crumb.id);
    setBreadcrumbs(prev => prev.slice(0, index + 1));
    setSearchQuery('');
  };

  // Create New Folder
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !accessToken) return;
    
    setCreatingFolder(true);
    try {
      const metadata = {
        name: newFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: currentFolderId !== 'root' ? [currentFolderId] : undefined
      };

      const response = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error('Không thể tạo thư mục.');
      }

      setToast({ type: 'success', message: `Đã tạo thư mục "${newFolderName}" thành công!` });
      setNewFolderName('');
      setCreatingFolder(false);
      // Refresh file list
      fetchFiles(currentFolderId);
    } catch (error: any) {
      console.error(error);
      setToast({ type: 'error', message: error.message || 'Lỗi khi tạo thư mục.' });
      setCreatingFolder(false);
    }
  };

  // File Upload Helper (Multipart upload using Blob)
  const uploadFile = async (file: File) => {
    if (!accessToken) return;
    setUploading(true);
    setUploadProgress(`Đang chuẩn bị tải lên tệp: ${file.name}...`);

    try {
      const metadata = {
        name: file.name,
        parents: currentFolderId !== 'root' ? [currentFolderId] : undefined
      };

      const formData = new FormData();
      formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      formData.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Tải lên thất bại.');
      }

      setToast({ type: 'success', message: `Đã tải lên tệp "${file.name}" thành công!` });
      fetchFiles(currentFolderId);
    } catch (error: any) {
      console.error(error);
      setToast({ type: 'error', message: error.message || 'Lỗi khi tải tệp lên Google Drive.' });
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  const handleBackupErp = async () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const payload = JSON.stringify({ version: '2.0', exportedAt: new Date().toISOString(), data: backupData }, null, 2);
    await uploadFile(new File([payload], `CONSTRUCT-OS-Backup-${timestamp}.json`, { type: 'application/json' }));
  };

  // File Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      uploadFile(file);
    }
  };

  // Traditional File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  // Explicit confirmation delete handler
  const handleDeleteFile = async () => {
    if (!confirmDelete || !accessToken) return;

    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${confirmDelete.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error('Xóa tệp/thư mục thất bại.');
      }

      setToast({ 
        type: 'success', 
        message: `Đã xóa ${confirmDelete.isFolder ? 'thư mục' : 'tệp'} "${confirmDelete.name}" khỏi Google Drive.` 
      });
      setConfirmDelete(null);
      fetchFiles(currentFolderId);
    } catch (error: any) {
      console.error(error);
      setToast({ type: 'error', message: error.message || 'Không thể xóa mục này.' });
      setConfirmDelete(null);
    }
  };

  // Helper to trigger specialized ERP directory structures
  const handleSetupErpDirectory = async () => {
    if (!accessToken) return;
    setUploading(true);
    setUploadProgress('Đang thiết lập cấu trúc thư mục lưu trữ ERP...');

    try {
      // 1. Create Root "CONSTRUCT_OS_RECORDS" Folder
      const rootMeta = {
        name: 'CONSTRUCT_OS_RECORDS',
        mimeType: 'application/vnd.google-apps.folder'
      };

      const rootRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(rootMeta)
      });

      if (!rootRes.ok) throw new Error('Không thể tạo thư mục gốc ERP.');
      const rootFolder = await rootRes.json();

      // 2. Loop through all active projects and create directories
      for (const proj of projects) {
        const projMeta = {
          name: `Dự án - ${proj.name}`,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [rootFolder.id]
        };

        const projRes = await fetch('https://www.googleapis.com/drive/v3/files', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(projMeta)
        });

        if (projRes.ok) {
          const projFolder = await projRes.json();
          // Create sub-categories
          const subfolders = ['1_Hợp đồng & Pháp lý', '2_Nhật ký công trường', '3_Hồ sơ Nghiệm thu & Bản vẽ', '4_Ảnh chụp Thực tế'];
          for (const sub of subfolders) {
            await fetch('https://www.googleapis.com/drive/v3/files', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                name: sub,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [projFolder.id]
              })
            });
          }
        }
      }

      setToast({ type: 'success', message: 'Khởi tạo cấu trúc lưu trữ dã chiến ERP thành công!' });
      setCurrentFolderId(rootFolder.id);
      setBreadcrumbs([{ id: 'root', name: 'My Drive' }, { id: rootFolder.id, name: 'CONSTRUCT_OS_RECORDS' }]);
    } catch (error: any) {
      console.error(error);
      setToast({ type: 'error', message: error.message || 'Thất bại khi khởi tạo cây lưu trữ.' });
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // Helper to get beautiful, modern icons for file types
  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />;
    }
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (mimeType.includes('image/')) {
      return <FileImage className="w-5 h-5 text-purple-500" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  // Filter project associations from drive files (Virtual helper)
  const matchedProjectFiles = useMemo(() => {
    if (selectedProjectId === 'all') return files;
    const selectedProj = projects.find(p => p.id === selectedProjectId);
    if (!selectedProj) return files;
    
    // Virtual tagging: Match files containing project name or ID
    const query = selectedProj.name.toLowerCase();
    const queryId = selectedProj.id.toLowerCase();
    return files.filter(f => 
      f.name.toLowerCase().includes(query) || 
      f.name.toLowerCase().includes(queryId) ||
      f.mimeType === 'application/vnd.google-apps.folder' // always keep folders
    );
  }, [files, selectedProjectId, projects]);

  // Loading Screen
  if (loadingAuth) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Đang khởi tạo cổng bảo mật Google API...</p>
      </div>
    );
  }

  // SIGN IN COMPONENT
  if (needsAuth) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm max-w-2xl mx-auto my-8">
        <div className="p-8 border-b border-slate-100 bg-slate-50 text-center relative overflow-hidden">
          {/* Subtle tech background shapes */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -z-10"></div>
          
          <div className="w-16 h-16 bg-blue-50 rounded-2xl text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-3xs border border-blue-100">
            <Cloud className="w-8 h-8 animate-pulse" />
          </div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
            Kết Nối Lưu Trữ Đám Mây Google Drive
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-2 leading-relaxed">
            Đồng bộ hồ sơ nghiệm thu, bản vẽ thiết kế kỹ thuật và ảnh chụp công trường trực tiếp từ Google Drive của doanh nghiệp với chuẩn bảo mật OAuth 2.0.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Quản lý thư mục dã chiến
              </div>
              <p className="text-slate-500 leading-normal">Tự động cấu trúc cây thư mục hồ sơ theo mã dự án Coteccons/Delta.</p>
            </div>
            
            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Tải tệp đa năng
              </div>
              <p className="text-slate-500 leading-normal">Hỗ trợ kéo thả trực tiếp tệp bản vẽ CAD, ảnh chụp thi công JPEG, PDF nghiệm thu.</p>
            </div>

            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Xóa bảo mật tuyệt đối
              </div>
              <p className="text-slate-500 leading-normal">Cơ chế xác thực 2 lớp chống xóa nhầm dữ liệu pháp lý của dự án.</p>
            </div>

            <div className="p-4 border border-slate-100 rounded-xl bg-slate-50/50 space-y-1">
              <div className="flex items-center gap-2 text-slate-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Độc lập thiết bị
              </div>
              <p className="text-slate-500 leading-normal">Truy cập dữ liệu trực tiếp tại văn phòng chính hoặc di động dã chiến tại hiện trường.</p>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={handleSignIn}
              className="gsi-material-button w-full sm:w-auto shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-bold text-slate-700">Đồng bộ qua tài khoản Google</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN EXPLORER UI
  return (
    <div className="space-y-6" id="drive-manager-root">
      
      {/* Toast Feedback */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-xs font-semibold animate-slide-up ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
          'bg-slate-50 text-slate-800 border-slate-200'
        }`}>
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-500" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 max-w-md w-full text-xs space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="font-black text-sm text-slate-800 uppercase tracking-tight">Xác nhận xóa tệp pháp lý?</h3>
                <p className="text-[10px] text-rose-500 uppercase font-bold">Hành động này không thể hoàn tác</p>
              </div>
            </div>
            
            <p className="text-slate-600 leading-relaxed">
              Bạn đang yêu cầu xóa {confirmDelete.isFolder ? 'thư mục' : 'tệp'} <strong className="text-slate-800">"{confirmDelete.name}"</strong> khỏi hệ thống đám mây. Mọi liên kết hồ sơ dự án liên quan sẽ bị gián đoạn.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-lg transition-colors shadow-3xs"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteFile}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg transition-colors shadow-sm"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top action dashboard card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-3xs">
            <Cloud className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Hệ thống Drive lưu trữ dã chiến</h2>
              <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[8px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded">Đã liên kết</span>
            </div>
            <p className="text-slate-400 text-[10px] font-semibold flex items-center gap-1.5 mt-0.5">
              <span>Tài khoản: {user?.email}</span>
              <span>•</span>
              <button onClick={handleSignOut} className="text-rose-500 hover:text-rose-700 hover:underline font-bold flex items-center gap-0.5">
                <LogOut className="w-3 h-3" /> Ngắt kết nối
              </button>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleBackupErp}
            disabled={uploading}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Lưu một bản sao đầy đủ dữ liệu ERP vào thư mục Google Drive hiện tại"
          >
            <HardDrive className="w-4 h-4" />
            <span>Sao lưu dữ liệu ERP</span>
          </button>
          {/* Setup ERP Directory Button */}
          <button
            onClick={handleSetupErpDirectory}
            disabled={uploading}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Khởi tạo cây thư mục chuẩn hóa cho toàn bộ dự án đang quản lý"
          >
            <FolderPlus className="w-4 h-4 text-blue-400" />
            <span>Khởi tạo cấu trúc ERP</span>
          </button>

          {/* Trigger manual input click */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-3xs"
          >
            <Upload className="w-4 h-4" />
            <span>Tải tệp lên</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
        </div>
      </div>

      {/* Explorer Content block */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Column: Filter and folder structures */}
        <div className="lg:col-span-1 space-y-6">
          {/* Quick Create Folder Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-500" /> TẠO THƯ MỤC MỚI
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <input 
                type="text"
                placeholder="Tên thư mục (vd: Bản vẽ dầm móng...)"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                disabled={creatingFolder}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={creatingFolder || !newFolderName.trim()}
                className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg border border-blue-200 flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {creatingFolder ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <FolderPlus className="w-4 h-4" />
                    <span>Tạo Thư Mục</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Project Tagging / Filtration Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Info className="w-4 h-4 text-blue-500" /> LIÊN KẾT HỒ SƠ DỰ ÁN
              </h3>
              <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                Lọc nhanh các tệp tài liệu được lưu trữ, đồng bộ hoặc ghi chú khớp với từ khóa của từng công trình dã chiến.
              </p>
            </div>

            <div className="space-y-1.5 pt-1">
              <button
                onClick={() => setSelectedProjectId('all')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all ${
                  selectedProjectId === 'all' 
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-3xs' 
                    : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                }`}
              >
                <span>Tất cả tài liệu</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">
                  {files.length}
                </span>
              </button>

              {projects.map(proj => {
                // Approximate count
                const count = files.filter(f => 
                  f.name.toLowerCase().includes(proj.name.toLowerCase()) || 
                  f.name.toLowerCase().includes(proj.id.toLowerCase())
                ).length;

                return (
                  <button
                    key={proj.id}
                    onClick={() => setSelectedProjectId(proj.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all ${
                      selectedProjectId === proj.id 
                        ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-3xs' 
                        : 'bg-white text-slate-600 border-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate pr-2">{proj.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active File Explorer and Grid */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Breadcrumbs & Search Area */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
            
            {/* Breadcrumb Path navigation */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 font-bold">
              <HardDrive className="w-4 h-4 text-slate-400 shrink-0" />
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb.id}>
                  {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-300" />}
                  <button 
                    onClick={() => handleBreadcrumbClick(crumb, idx)}
                    className={`hover:text-blue-600 transition-colors uppercase tracking-tight text-[11px] ${
                      idx === breadcrumbs.length - 1 ? 'text-slate-800' : ''
                    }`}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>

            {/* Search Input Box */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input 
                type="text"
                placeholder="Tìm nhanh tệp tin trong thư mục hiện tại..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold pl-9 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-extrabold uppercase rounded-md transition-colors"
              >
                Tìm Kiếm
              </button>
            </form>
          </div>

          {/* DRAG AND DROP CONTAINER */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`min-h-[350px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all relative ${
              isDragOver ? 'border-2 border-dashed border-blue-500 bg-blue-50/20' : ''
            }`}
          >
            
            {/* Uploading progress overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-3xs flex flex-col items-center justify-center p-6 z-10 text-center animate-fade-in">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                <p className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">Vui lòng chờ</p>
                <p className="text-[11px] text-slate-500 mt-1 font-medium">{uploadProgress}</p>
              </div>
            )}

            {/* Dragover hint overlay */}
            {isDragOver && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-blue-50/40 pointer-events-none z-10">
                <Upload className="w-10 h-10 text-blue-600 animate-bounce mb-3" />
                <p className="text-sm font-black text-blue-800 uppercase tracking-tight">Thả tệp dã chiến vào đây</p>
                <p className="text-xs text-blue-600 mt-1">Hệ thống sẽ tải tệp trực tiếp vào thư mục hiện tại</p>
              </div>
            )}

            {/* File Table */}
            {loadingFiles ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
                <span className="text-xs font-semibold">Đang truy vấn đám mây Google Drive...</span>
              </div>
            ) : matchedProjectFiles.length > 0 ? (
              <div className="flex-1 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-400 text-[9px] font-extrabold uppercase tracking-wider">
                      <th className="p-3.5 pl-5">Tên Tệp / Thư Mục</th>
                      <th className="p-3.5 hidden md:table-cell">MIME Type / Định Dạng</th>
                      <th className="p-3.5 text-right hidden sm:table-cell">Kích Thước</th>
                      <th className="p-3.5 text-right hidden md:table-cell">Cập Nhật Cuối</th>
                      <th className="p-3.5 pr-5 text-right">Tác Vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {matchedProjectFiles.map(file => {
                      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                      const formattedSize = file.size 
                        ? `${(parseInt(file.size) / 1024).toFixed(1)} KB` 
                        : isFolder ? 'Thư mục' : '—';
                      
                      const formattedDate = file.modifiedTime 
                        ? new Date(file.modifiedTime).toLocaleDateString('vi-VN', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit'
                          })
                        : '—';

                      return (
                        <tr 
                          key={file.id} 
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          {/* Name column */}
                          <td className="p-3.5 pl-5">
                            {isFolder ? (
                              <button
                                onClick={() => handleFolderClick(file.id, file.name)}
                                className="flex items-center gap-2.5 text-slate-800 hover:text-blue-600 text-xs font-bold text-left group"
                              >
                                {getFileIcon(file.mimeType)}
                                <span className="group-hover:underline truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                {getFileIcon(file.mimeType)}
                                <span className="text-slate-700 truncate max-w-[180px] sm:max-w-xs">{file.name}</span>
                              </div>
                            )}
                          </td>

                          {/* MIME Type column */}
                          <td className="p-3.5 hidden md:table-cell text-[10px] text-slate-400 font-mono">
                            {file.mimeType.replace('application/', '').replace('vnd.google-apps.', '')}
                          </td>

                          {/* Size column */}
                          <td className="p-3.5 text-right hidden sm:table-cell font-mono text-[11px] text-slate-500 font-bold">
                            {formattedSize}
                          </td>

                          {/* Last modified column */}
                          <td className="p-3.5 text-right hidden md:table-cell font-mono text-[11px] text-slate-400">
                            {formattedDate}
                          </td>

                          {/* Actions column */}
                          <td className="p-3.5 pr-5 text-right space-x-1.5 whitespace-nowrap">
                            {file.webViewLink && (
                              <a
                                href={file.webViewLink}
                                target="_blank"
                                rel="noopener noreferrer referrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-800 rounded border border-slate-200 transition-colors text-[10px] font-bold"
                                title="Mở trực tiếp trên Google Drive"
                              >
                                <span>Mở</span>
                                <ArrowUpRight className="w-3 h-3" />
                              </a>
                            )}
                            
                            <button
                              onClick={() => setConfirmDelete({ id: file.id, name: file.name, isFolder })}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all inline-flex items-center"
                              title="Xóa mục này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                <Cloud className="w-12 h-12 text-slate-200 mb-3" />
                <span className="text-xs font-bold uppercase tracking-tight text-slate-500">Thư mục trống</span>
                <span className="text-[10px] text-slate-400 mt-1 max-w-xs text-center leading-normal">
                  Kéo thả tệp tin bất kỳ vào đây hoặc nhấn vào nút <strong className="text-blue-500">Tải tệp lên</strong> ở phía trên để lưu trữ hồ sơ.
                </span>
              </div>
            )}

            {/* Explorer Footer status bar */}
            <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5">
              <span>Thư mục: {currentFolderId === 'root' ? 'My Drive' : currentFolderId}</span>
              <span>Tổng số: {matchedProjectFiles.length} mục</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
