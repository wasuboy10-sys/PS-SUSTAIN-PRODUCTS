import React, { useState, useEffect, useRef } from 'react';
import { 
  auth, 
  db 
} from './firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Upload, 
  Trash2, 
  Save, 
  Plus, 
  Search, 
  LogOut, 
  Globe, 
  RefreshCw, 
  FileImage, 
  Check, 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  Database, 
  Sparkles, 
  Eye, 
  Filter, 
  AlertCircle,
  Code,
  Copy,
  ExternalLink
} from 'lucide-react';

// Define TS Interface for Website Assets
interface Asset {
  id: string;
  title: string;
  alt: string;
  url: string;
  firebasePath: string;
  size: string;
  dimensions: string;
  category: string;
  createdAt: any;
}

// Default Seed Data
const DEFAULT_ASSETS: Asset[] = [
  {
    id: "hero-solar-01",
    title: "Sustainable Future Hero Header",
    alt: "Modern solar panel farm at sunset with clear sky background",
    url: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&q=80&w=600",
    firebasePath: "gs://ps-sustain-products/assets/hero_solar.jpg",
    size: "1.2 MB",
    dimensions: "1920x1080",
    category: "Hero Banner",
    createdAt: Date.now()
  },
  {
    id: "hero-wind-02",
    title: "Wind Turbine Renewable Energy",
    alt: "Stately wind turbine rotating on a green hill under white clouds",
    url: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&q=80&w=600",
    firebasePath: "gs://ps-sustain-products/assets/hero_wind.jpg",
    size: "840 KB",
    dimensions: "1600x900",
    category: "Hero Banner",
    createdAt: Date.now()
  },
  {
    id: "product-thermos-03",
    title: "Eco Friendly Bamboo Thermos",
    alt: "Sleek wooden bamboo bottle placed on a minimalist table with green leaves",
    url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&q=80&w=600",
    firebasePath: "gs://ps-sustain-products/assets/product_thermos.jpg",
    size: "450 KB",
    dimensions: "1000x1000",
    category: "Product Display",
    createdAt: Date.now()
  },
  {
    id: "product-tote-04",
    title: "Organic Cotton Tote Bags",
    alt: "Set of reusable cotton tote bags hanging on pegs",
    url: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600",
    firebasePath: "gs://ps-sustain-products/assets/product_tote.jpg",
    size: "620 KB",
    dimensions: "1200x1200",
    category: "Product Display",
    createdAt: Date.now()
  },
  {
    id: "sustainability-lifecycle-05",
    title: "Sustainably Sourced Materials Circle",
    alt: "Circular diagram illustrating eco-lifecycle of raw materials",
    url: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=600",
    firebasePath: "gs://ps-sustain-products/assets/sustainability_lifecycle.jpg",
    size: "310 KB",
    dimensions: "800x800",
    category: "Sustainability",
    createdAt: Date.now()
  },
  {
    id: "logo-sustain-06",
    title: "PS Sustain Primary Logo",
    alt: "Minimalist green leaf integrated with a clean letter P and S logo",
    url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=600",
    firebasePath: "gs://ps-sustain-products/assets/logo_sustain_dark.png",
    size: "85 KB",
    dimensions: "512x512",
    category: "Logo",
    createdAt: Date.now()
  }
];

export default function App() {
  // Authentication State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  // Assets Management State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Form Fields for Editing Selected Asset
  const [editTitle, setEditTitle] = useState("");
  const [editAlt, setEditAlt] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFirebasePath, setEditFirebasePath] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  // Upload Modals & State
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadAlt, setUploadAlt] = useState("");
  const [uploadCategory, setUploadCategory] = useState("Hero Banner");
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileBase64, setUploadFileBase64] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // Notification Banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Preview Website Modal
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Integration Modal
  const [isIntegrationOpen, setIsIntegrationOpen] = useState(false);
  const [integrationTab, setIntegrationTab] = useState<'api' | 'js' | 'react'>('api');

  // File Ref for click trigger
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-clear toasts
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Monitor Authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Listen to Firestore assets real-time updates
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(collection(db, 'assets'), (snapshot) => {
      const loadedAssets: Asset[] = [];
      snapshot.forEach((doc) => {
        loadedAssets.push({ id: doc.id, ...doc.data() } as Asset);
      });
      // Sort assets by creation time
      loadedAssets.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAssets(loadedAssets);

      // Automatically select the first asset if none is selected
      if (loadedAssets.length > 0 && !selectedAsset) {
        setSelectedAsset(loadedAssets[0]);
      } else if (loadedAssets.length === 0) {
        setSelectedAsset(null);
      } else if (selectedAsset) {
        // Update selected asset state if it was updated in firestore
        const updated = loadedAssets.find(a => a.id === selectedAsset.id);
        if (updated) {
          setSelectedAsset(updated);
        }
      }
    }, (error) => {
      console.error("Error listening to assets:", error);
      showToast("ไม่สามารถโหลดข้อมูลจาก Firebase ได้", "error");
    });

    return () => unsubscribe();
  }, [user]);

  // Sync Form fields with Selected Asset
  useEffect(() => {
    if (selectedAsset) {
      setEditTitle(selectedAsset.title);
      setEditAlt(selectedAsset.alt || "");
      setEditUrl(selectedAsset.url);
      setEditCategory(selectedAsset.category || "Hero Banner");
      setEditFirebasePath(selectedAsset.firebasePath || `gs://ps-sustain-products/assets/${selectedAsset.id}`);
    } else {
      setEditTitle("");
      setEditAlt("");
      setEditUrl("");
      setEditCategory("Hero Banner");
      setEditFirebasePath("");
    }
  }, [selectedAsset]);

  // Custom Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  // Seeding Database function
  const seedDatabase = async () => {
    try {
      showToast("กำลังเริ่มสร้างข้อมูลตัวอย่าง...", "info");
      for (const asset of DEFAULT_ASSETS) {
        await setDoc(doc(db, "assets", asset.id), {
          title: asset.title,
          alt: asset.alt,
          url: asset.url,
          firebasePath: asset.firebasePath,
          size: asset.size,
          dimensions: asset.dimensions,
          category: asset.category,
          createdAt: Date.now()
        });
      }
      showToast("สร้างข้อมูลตั้งต้นสำเร็จแล้ว!", "success");
    } catch (error: any) {
      console.error("Seeding failed:", error);
      showToast("สร้างข้อมูลไม่สำเร็จ: " + error.message, "error");
    }
  };

  // Auth: Email/Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      showToast("เข้าสู่ระบบสำเร็จ", "success");
    } catch (error: any) {
      console.error("Login error:", error);
      setAuthError(getFriendlyAuthError(error.code));
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Register/Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setAuthError("กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setAuthSuccess("สมัครสมาชิกสำเร็จ! กำลังเข้าสู่ระบบ...");
      showToast("สร้างบัญชีผู้ใช้ใหม่สำเร็จ", "success");
    } catch (error: any) {
      console.error("SignUp error:", error);
      setAuthError(getFriendlyAuthError(error.code));
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Auto Demo Login (Create if not exists)
  const handleDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    setAuthSuccess("");
    const demoEmail = "admin@ps-sustain.com";
    const demoPassword = "adminpassword";

    try {
      // Try to login first
      await signInWithEmailAndPassword(auth, demoEmail, demoPassword);
      showToast("เข้าสู่ระบบในฐานะ Admin สำเร็จ", "success");
    } catch (loginErr: any) {
      // If user not found, create user instantly
      if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
        try {
          await createUserWithEmailAndPassword(auth, demoEmail, demoPassword);
          showToast("สร้างและเข้าสู่ระบบด้วยบัญชีผู้ใช้ Admin ตัวอย่างสำเร็จ", "success");
        } catch (signUpErr: any) {
          setAuthError("ไม่สามารถเชื่อมต่อระบบผู้ใช้จำลอง: " + signUpErr.message);
        }
      } else {
        setAuthError("ข้อผิดพลาด: " + loginErr.message);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSelectedAsset(null);
      showToast("ออกจากระบบเรียบร้อยแล้ว", "success");
    } catch (error) {
      showToast("เกิดข้อผิดพลาดในการออกจากระบบ", "error");
    }
  };

  // Save Asset Changes to Firestore
  const handleSaveChanges = async () => {
    if (!selectedAsset) return;
    if (!editTitle.trim() || !editUrl.trim()) {
      showToast("กรุณากรอกหัวข้อภาพและ URL", "error");
      return;
    }

    setSaveLoading(true);
    try {
      const assetRef = doc(db, 'assets', selectedAsset.id);
      await updateDoc(assetRef, {
        title: editTitle,
        alt: editAlt,
        url: editUrl,
        category: editCategory,
        firebasePath: editFirebasePath
      });
      showToast("บันทึกการแก้ไขข้อมูลรูปภาพสำเร็จ!", "success");
    } catch (error: any) {
      console.error("Error updating asset:", error);
      showToast("ไม่สามารถบันทึกข้อมูลได้: " + error.message, "error");
    } finally {
      setSaveLoading(false);
    }
  };

  // Delete Asset from Firestore
  const handleDeleteAsset = async () => {
    if (!selectedAsset) return;
    
    // Confirm dialogue
    const confirmDelete = window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบรูปภาพ "${selectedAsset.title}" ?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, 'assets', selectedAsset.id));
      showToast("ลบรูปภาพเสร็จสิ้น", "success");
      setSelectedAsset(null);
    } catch (error: any) {
      showToast("เกิดข้อผิดพลาดในการลบรูปภาพ: " + error.message, "error");
    }
  };

  // Convert uploaded file to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError("กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น (PNG, JPG, SVG, WebP)");
      return;
    }

    setUploadFile(file);
    setUploadError("");
    setUploadTitle(file.name.split('.').slice(0, -1).join(' ') || file.name);
    setUploadAlt(`Image descriptive alt text for ${file.name}`);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadFileBase64(event.target.result as string);
        setUploadUrl(event.target.result as string); // Default base64 as the URL
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // Submit New Asset Upload
  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) {
      setUploadError("กรุณากรอกชื่อสำหรับแสดงผลรูปภาพ");
      return;
    }
    if (!uploadUrl.trim()) {
      setUploadError("กรุณาระบุ URL รูปภาพ หรือ อัปโหลดรูปภาพ");
      return;
    }

    setUploadLoading(true);
    setUploadError("");

    try {
      const newId = `asset-${Date.now()}`;
      
      // Calculate sizes & dimensions dynamically or mock realistic values
      let fileSize = "150 KB";
      let fileDims = "800x800";

      if (uploadFile) {
        // Calculate true file size
        const kb = uploadFile.size / 1024;
        if (kb > 1024) {
          fileSize = `${(kb / 1024).toFixed(1)} MB`;
        } else {
          fileSize = `${Math.round(kb)} KB`;
        }
      }

      const generatedFirebasePath = `gs://ps-sustain-products/assets/${uploadFile ? uploadFile.name.replace(/\s+/g, '_') : 'image_' + newId + '.jpg'}`;

      const newAsset: Asset = {
        id: newId,
        title: uploadTitle,
        alt: uploadAlt,
        url: uploadUrl,
        firebasePath: generatedFirebasePath,
        size: fileSize,
        dimensions: fileDims,
        category: uploadCategory,
        createdAt: Date.now()
      };

      await setDoc(doc(db, "assets", newId), newAsset);
      
      // Clear upload states
      setUploadTitle("");
      setUploadAlt("");
      setUploadUrl("");
      setUploadFile(null);
      setUploadFileBase64("");
      setIsUploadOpen(false);
      showToast("อัปโหลดและเพิ่มรูปภาพใหม่สำเร็จ!", "success");
    } catch (error: any) {
      console.error("Error uploading asset:", error);
      setUploadError("ไม่สามารถบันทึกข้อมูลได้: " + error.message);
    } finally {
      setUploadLoading(false);
    }
  };

  // Helpers to get specific category items
  const categories = ["All", "Hero Banner", "Product Display", "Sustainability", "Logo"];
  
  // Filter and search
  const filteredAssets = assets.filter(asset => {
    const matchesCategory = selectedCategory === "All" || asset.category === selectedCategory;
    const matchesSearch = asset.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (asset.alt && asset.alt.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          asset.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Safe login error translator
  const getFriendlyAuthError = (code: string) => {
    switch (code) {
      case 'auth/user-not-found':
        return 'ไม่พบบัญชีผู้ใช้นี้ในระบบ';
      case 'auth/wrong-password':
        return 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
      case 'auth/invalid-credential':
        return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
      case 'auth/email-already-in-use':
        return 'อีเมลนี้ถูกใช้งานแล้ว';
      case 'auth/weak-password':
        return 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร';
      case 'auth/invalid-email':
        return 'รูปแบบอีเมลไม่ถูกต้อง';
      default:
        return 'เกิดข้อผิดพลาดในการเชื่อมต่อกรุณาลองใหม่อีกครั้ง';
    }
  };

  return (
    <div id="root" className="min-h-screen bg-slate-50 flex overflow-hidden font-sans text-slate-900 select-none">
      
      {/* Toast Alert Notifications */}
      {toast && (
        <div 
          id="toast-notification"
          className={`fixed top-4 right-4 z-50 flex items-center space-x-3 px-5 py-4 rounded-xl shadow-xl transition-all duration-300 transform translate-y-0 scale-100 border ${
            toast.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : toast.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-600" />}
          {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600" />}
          {toast.type === 'info' && <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* ----------------- LOGIN / REGISTER CONTAINER ----------------- */}
      {!user ? (
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 bg-slate-100 min-h-screen">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden transform transition-all duration-300">
            
            {/* Login Header branding */}
            <div className="bg-slate-900 p-8 text-center text-white relative">
              <div className="absolute top-4 right-4 bg-blue-500/20 px-3 py-1 rounded-full border border-blue-400/30">
                <span className="text-[10px] tracking-widest font-mono text-blue-300 font-semibold">V4.0</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-blue-400">PS SUSTAIN</h1>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-semibold">Admin Portal Console</p>
            </div>

            {/* Login Error / Success Messages */}
            <div className="px-8 pt-6">
              {authError && (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}
              {authSuccess && (
                <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-lg text-xs font-semibold">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{authSuccess}</span>
                </div>
              )}
            </div>

            {/* Login form */}
            <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@ps-sustain.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={authLoading}
                className="w-full bg-slate-900 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer flex items-center justify-center space-x-2"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังประมวลผล...</span>
                  </>
                ) : (
                  <span>{isSignUp ? 'สมัครบัญชีผู้ใช้ (Sign Up)' : 'เข้าสู่ระบบ (Sign In)'}</span>
                )}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">หรือใช้งานด่วน</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Seamless Auto Admin Login Trigger */}
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={authLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>เข้าสู่ระบบด้วย Admin Demo (คลิกเดียว)</span>
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError("");
                    setAuthSuccess("");
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  {isSignUp ? 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบ' : 'ไม่มีบัญชี? สมัครใช้งานฟรี'}
                </button>
              </div>

              {/* Demo Account Credentials box */}
              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-800 mb-1">บัญชีทดสอบที่กำหนดไว้</p>
                <p className="text-xs text-blue-900 font-medium">อีเมล: <span className="font-mono bg-blue-100 px-1 rounded">admin@ps-sustain.com</span></p>
                <p className="text-xs text-blue-900 font-medium mt-0.5">รหัสผ่าน: <span className="font-mono bg-blue-100 px-1 rounded">adminpassword</span></p>
              </div>
            </form>
          </div>
        </div>
      ) : (
        
        // ----------------- FULL ADMIN DASHBOARD -----------------
        <div className="flex-1 flex overflow-hidden w-full">
          
          {/* SIDEBAR */}
          <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0 border-r border-slate-800">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-extrabold tracking-tight text-blue-400">PS SUSTAIN</h1>
                <p className="text-xs text-slate-400 mt-0.5 uppercase tracking-widest font-bold">Admin Console</p>
              </div>
              <span className="px-2 py-0.5 bg-blue-500/20 border border-blue-400/30 text-[10px] rounded text-blue-300 font-semibold">Active</span>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
              <a 
                href="#" 
                className="flex items-center space-x-3 p-3 rounded-xl bg-blue-600/90 text-white shadow-sm hover:bg-blue-600 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                }}
              >
                <FileImage className="w-5 h-5 text-blue-100" />
                <span className="font-semibold text-sm">Image Manager</span>
              </a>
              <a 
                href="#" 
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all border border-transparent hover:border-blue-500/20"
                onClick={(e) => {
                  e.preventDefault();
                  setIsIntegrationOpen(true);
                }}
              >
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-semibold">Web Integration (เชื่อมเว็บจริง)</span>
              </a>
              <a 
                href="#" 
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("Content Editor มีไว้สำหรับจัดการบทความ (Coming Soon)", "info");
                }}
              >
                <Database className="w-5 h-5" />
                <span className="text-sm font-medium">Content Editor</span>
              </a>
              <a 
                href="#" 
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                onClick={(e) => {
                  e.preventDefault();
                  showToast("ฟีเจอร์จัดการผู้ใช้เพิ่มเติม (Coming Soon)", "info");
                }}
              >
                <UserIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Users & Admins</span>
              </a>
            </nav>

            {/* Sidebar Bottom Firebase Status Widget */}
            <div className="p-4 border-t border-slate-800 space-y-3">
              <div className="bg-slate-800/40 border border-slate-800/60 rounded-xl p-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Firebase Project</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[10px] text-emerald-400 font-semibold">Online</span>
                  </div>
                </div>
                <p className="text-xs font-mono text-blue-300 truncate" title="PS SUSTAIN PRODUCTS">PS SUSTAIN PRODUCTS</p>
                <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">{auth.app.options.projectId}</p>
              </div>

              {/* Logout button */}
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 py-2 bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 rounded-lg text-slate-400 text-xs font-semibold border border-slate-800 hover:border-rose-900/30 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ (Logout)</span>
              </button>
            </div>
          </aside>

          {/* MAIN CONTAINER */}
          <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
            
            {/* MAIN HEADER */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
              <div className="flex items-center space-x-4">
                <span className="text-slate-400 text-sm font-medium">Dashboard</span>
                <span className="text-slate-300 font-light">/</span>
                <span className="font-bold text-slate-800 text-sm">Gallery Manager</span>
              </div>
              <div className="flex items-center space-x-4">
                {/* Preview Site Button */}
                <button 
                  onClick={() => setIsPreviewOpen(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all border border-slate-200 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span>Preview Website</span>
                </button>

                {/* User avatar and email info */}
                <div className="flex items-center space-x-2.5 pl-4 border-l border-slate-200">
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-800">Admin User</p>
                    <p className="text-[10px] text-slate-500 truncate max-w-[160px]" title={user.email || ""}>
                      {user.email}
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold uppercase shadow-inner">
                    {user.email ? user.email.charAt(0) : "A"}
                  </div>
                </div>
              </div>
            </header>

            {/* MAIN DYNAMIC CONTENT */}
            <div className="flex-1 p-8 grid grid-cols-12 gap-6 overflow-hidden">
              
              {/* GALLERY AND LISTING (COL-SPAN 8) */}
              <section className="col-span-8 flex flex-col space-y-5 overflow-hidden">
                
                {/* Section Header Controls */}
                <div className="flex justify-between items-center shrink-0">
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800">Website Assets</h2>
                    <p className="text-xs text-slate-500">จัดการสื่อและรูปภาพทั้งหมดบนหน้าหลักของแบรนด์</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => setIsUploadOpen(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>อัปโหลดภาพใหม่</span>
                    </button>
                  </div>
                </div>

                {/* Filter and Search Controls */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shrink-0 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
                  {/* Category Selection Tabs */}
                  <div className="flex items-center space-x-1 overflow-x-auto w-full md:w-auto">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          selectedCategory === cat 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        {cat === "All" ? "ทั้งหมด" : cat}
                      </button>
                    ))}
                  </div>

                  {/* Search bar */}
                  <div className="relative w-full md:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="ค้นหารูปภาพ..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid Scrollable Asset List */}
                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-6 overflow-y-auto shadow-sm">
                  
                  {/* Empty state: Database completely empty */}
                  {assets.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-16 h-16 bg-blue-50 border border-blue-100 text-blue-500 rounded-full flex items-center justify-center mb-4">
                        <Database className="w-8 h-8" />
                      </div>
                      <h3 className="text-base font-bold text-slate-800">ไม่พบรูปภาพในคลังสื่อสาร</h3>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">
                        ฐานข้อมูล Firestore ของคุณว่างเปล่า คุณสามารถเลือกอัปโหลดรูปภาพใหม่ หรือเริ่มต้นอย่างง่ายด้วยการโหลดข้อมูลตั้งต้น
                      </p>
                      <button
                        onClick={seedDatabase}
                        className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow transition-all flex items-center space-x-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-blue-100" />
                        <span>สร้างข้อมูลตัวอย่างของแบรนด์ (Seed Data)</span>
                      </button>
                    </div>
                  ) : filteredAssets.length === 0 ? (
                    
                    // Empty Search results state
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <div className="w-12 h-12 bg-slate-50 border border-slate-150 text-slate-400 rounded-full flex items-center justify-center mb-3">
                        <Search className="w-5 h-5" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">ไม่พบสิ่งที่ค้นหา</h3>
                      <p className="text-xs text-slate-500 mt-0.5">ไม่พบรูปภาพที่ตรงกับการค้นหา "{searchQuery}"</p>
                      <button 
                        onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                        className="mt-3 text-xs text-blue-600 hover:underline font-bold"
                      >
                        ล้างการกรองข้อมูลทั้งหมด
                      </button>
                    </div>
                  ) : (
                    
                    // Render Image Grid
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                      {filteredAssets.map((asset) => {
                        const isSelected = selectedAsset?.id === asset.id;
                        return (
                          <div 
                            key={asset.id}
                            onClick={() => setSelectedAsset(asset)}
                            className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 shadow-sm hover:shadow ${
                              isSelected 
                                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20' 
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            {/* Image Thumbnail Container */}
                            <div className="aspect-square bg-slate-100 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                              {asset.url ? (
                                <img 
                                  src={asset.url} 
                                  alt={asset.alt}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="text-slate-300 flex flex-col items-center">
                                  <FileImage className="w-8 h-8 stroke-[1.5]" />
                                  <span className="text-[10px] mt-1">ไม่มีรูปภาพ</span>
                                </div>
                              )}

                              {/* Category Badge overlay */}
                              <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-900/70 backdrop-blur-sm text-[9px] text-white rounded font-bold uppercase tracking-wider">
                                {asset.category}
                              </span>
                            </div>

                            {/* Text / Title display */}
                            <div className="p-3 bg-white">
                              <p className="text-xs font-bold text-slate-800 truncate" title={asset.title}>
                                {asset.title}
                              </p>
                              <div className="flex justify-between items-center mt-1">
                                <span className="text-[10px] font-mono text-slate-400 font-semibold">{asset.size || "120 KB"}</span>
                                <span className="text-[10px] font-mono text-slate-400 font-semibold">{asset.dimensions || "800x800"}</span>
                              </div>
                            </div>

                            {/* Active "Selected" banner */}
                            {isSelected && (
                              <div className="absolute bottom-0 inset-x-0 bg-blue-500 text-white py-1 text-[9px] font-extrabold uppercase text-center tracking-widest">
                                Selected
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </section>

              {/* EDIT DETAIL SIDEBAR (COL-SPAN 4) */}
              <section className="col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-base font-extrabold text-slate-800">Asset Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedAsset ? `กำลังแก้ไข: ${selectedAsset.title}` : "โปรดเลือกภาพที่ต้องการแก้ไข"}
                  </p>
                </div>
                
                {selectedAsset ? (
                  <>
                    <div className="p-6 flex-1 space-y-5 overflow-y-auto">
                      {/* Edit display title */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Display Title (ชื่อแสดงผล)</label>
                        <input 
                          type="text" 
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                        />
                      </div>

                      {/* Edit category */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Category (หมวดหมู่ภาพ)</label>
                        <select 
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                        >
                          <option value="Hero Banner">Hero Banner</option>
                          <option value="Product Display">Product Display</option>
                          <option value="Sustainability">Sustainability</option>
                          <option value="Logo">Logo</option>
                        </select>
                      </div>

                      {/* Edit Image URL */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Image URL (ที่อยู่อ้างอิงภาพ)</label>
                        <textarea 
                          rows={2}
                          value={editUrl}
                          onChange={(e) => setEditUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none font-mono text-[11px]"
                          placeholder="วางลิงก์รูปภาพของคุณ..."
                        />
                      </div>

                      {/* Edit Alt tag */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Alt Text / SEO Description</label>
                        <textarea 
                          value={editAlt}
                          onChange={(e) => setEditAlt(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-16 resize-none focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all" 
                          placeholder="อธิบายรายละเอียดภาพเพื่อผลทางด้าน SEO..."
                        />
                      </div>

                      {/* Display Firebase Path */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Firebase Path</label>
                        <div className="flex items-center px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-[10px] text-slate-600 font-mono select-all">
                          {editFirebasePath}
                        </div>
                      </div>

                      {/* Show Dimensions and Size stats */}
                      <div className="pt-4 border-t border-slate-100">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">ข้อมูลสถิติไฟล์</label>
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase">ขนาดไฟล์</span>
                            <span className="font-semibold text-slate-700">{selectedAsset.size || "1.2 MB"}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                            <span className="block text-[9px] text-slate-400 font-bold uppercase">ความละเอียด</span>
                            <span className="font-semibold text-slate-700">{selectedAsset.dimensions || "1920x1080"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons footer */}
                    <div className="p-6 bg-slate-50 border-t border-slate-200 flex space-x-3">
                      <button 
                        onClick={handleSaveChanges}
                        disabled={saveLoading}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
                      >
                        {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>บันทึกการแก้ไข</span>
                      </button>
                      <button 
                        onClick={handleDeleteAsset}
                        className="px-3.5 py-2.5 bg-white border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center cursor-pointer"
                        title="ลบรูปภาพ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                    <FileImage className="w-12 h-12 stroke-[1] mb-2 text-slate-300" />
                    <p className="text-xs font-semibold">กรุณาเลือกรูปภาพจากรายการ</p>
                    <p className="text-[10px] text-slate-400 mt-1">เพื่อเปิดดูรายละเอียดและแก้ไขข้อมูล</p>
                  </div>
                )}
              </section>

            </div>
          </main>
        </div>
      )}

      {/* ----------------- UPLOAD NEW IMAGE MODAL ----------------- */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-scale-up">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-800">เพิ่มรูปภาพใหม่ลงบนเว็บไซต์</h3>
              </div>
              <button 
                onClick={() => {
                  setIsUploadOpen(false);
                  setUploadError("");
                  setUploadFile(null);
                  setUploadFileBase64("");
                }} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleUploadAsset} className="p-6 space-y-4">
              
              {/* Error messages */}
              {uploadError && (
                <div className="flex items-center space-x-2 bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Drag and drop zone / custom file picker */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">เลือกรูปภาพ</label>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-50/50' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden" 
                  />
                  
                  {uploadFileBase64 ? (
                    <div className="relative group max-w-[120px] aspect-square rounded-xl overflow-hidden border border-slate-200">
                      <img src={uploadFileBase64} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-white text-[9px] font-bold uppercase">เปลี่ยนภาพ</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-slate-400">
                      <Upload className="w-8 h-8 mb-2 stroke-[1.5] text-slate-400" />
                      <p className="text-xs font-bold text-slate-700">ลากไฟล์มาวางที่นี่ หรือคลิกเพื่ออัปโหลด</p>
                      <p className="text-[10px] text-slate-400 mt-1">รองรับ JPG, PNG, WebP หรือ SVG</p>
                    </div>
                  )}

                  {uploadFile && (
                    <p className="text-[11px] font-mono text-blue-600 font-bold mt-2.5">
                      {uploadFile.name} ({(uploadFile.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>
              </div>

              {/* Title field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">หัวข้อภาพ (Display Title)</label>
                <input 
                  type="text" 
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="เช่น Sustainable energy hero banner"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Alt description / SEO */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Alt Text (SEO Description)</label>
                <input 
                  type="text" 
                  value={uploadAlt}
                  onChange={(e) => setUploadAlt(e.target.value)}
                  placeholder="เช่น ภาพถ่ายกลุ่มแผงโซลาร์เซลล์ภายใต้แสงพระอาทิตย์ตก"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                />
              </div>

              {/* Category selector */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">หมวดหมู่</label>
                  <select 
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  >
                    <option value="Hero Banner">Hero Banner</option>
                    <option value="Product Display">Product Display</option>
                    <option value="Sustainability">Sustainability</option>
                    <option value="Logo">Logo</option>
                  </select>
                </div>

                {/* Optional: URL Override */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">ระบุ URL อ้างอิงภายนอก (ตัวเลือก)</label>
                  <input 
                    type="text" 
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    disabled={!!uploadFileBase64}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Footer action buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsUploadOpen(false);
                    setUploadError("");
                    setUploadFile(null);
                    setUploadFileBase64("");
                  }} 
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  disabled={uploadLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center space-x-2 cursor-pointer"
                >
                  {uploadLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : (
                    <span>อัปโหลด & บันทึก</span>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ----------------- PREVIEW WEBSITE MODAL ----------------- */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col p-4 md:p-10 bg-slate-900/90 backdrop-blur-md overflow-hidden animate-fade-in">
          
          {/* Preview Control bar */}
          <div className="max-w-6xl mx-auto w-full flex justify-between items-center bg-slate-800 text-white px-6 py-4 rounded-t-2xl border border-b-0 border-slate-700 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="flex space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
              </div>
              <span className="text-xs font-mono text-slate-400 pl-2 border-l border-slate-700">Live Preview Website</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs bg-slate-700 px-3 py-1 rounded-full text-slate-300 font-semibold flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>เชื่อมต่อกับ Firestore Realtime</span>
              </span>
              <button 
                onClick={() => setIsPreviewOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-700 hover:bg-slate-600 transition-all cursor-pointer text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Realistic Rendered Public landing page mockup */}
          <div className="max-w-6xl mx-auto w-full flex-1 bg-white border border-slate-700 rounded-b-2xl overflow-y-auto">
            
            {/* Nav Menu */}
            <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 px-8 py-4 flex items-center justify-between z-30">
              <div className="flex items-center space-x-3">
                {/* Dynamically loads Logo Category item or default fallback logo */}
                {assets.find(a => a.category === "Logo")?.url ? (
                  <img 
                    src={assets.find(a => a.category === "Logo")!.url} 
                    alt="Brand Logo" 
                    className="h-10 w-auto object-contain rounded"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">PS</div>
                )}
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">PS SUSTAIN</span>
              </div>
              
              <nav className="hidden md:flex space-x-8 text-sm font-semibold text-slate-600">
                <a href="#" className="text-emerald-600 hover:text-emerald-700">หน้าหลัก</a>
                <a href="#" className="hover:text-emerald-600 transition-colors">เกี่ยวกับเรา</a>
                <a href="#" className="hover:text-emerald-600 transition-colors">ผลิตภัณฑ์สินค้า</a>
                <a href="#" className="hover:text-emerald-600 transition-colors">บทความเพื่อความยั่งยืน</a>
              </nav>

              <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all">
                ติดต่อเรา
              </button>
            </header>

            {/* Realistic Hero Section using first Hero Banner asset */}
            {(() => {
              const heroAsset = assets.find(a => a.category === "Hero Banner") || assets[0];
              const backgroundStyle = heroAsset?.url 
                ? { backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.5)), url(${heroAsset.url})` }
                : { backgroundColor: '#0f172a' };
              
              return (
                <section 
                  style={backgroundStyle}
                  className="bg-cover bg-center text-white py-24 px-8 md:px-16 text-center flex flex-col items-center justify-center relative min-h-[460px]"
                >
                  <div className="max-w-2xl space-y-4">
                    <span className="px-3.5 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-widest inline-block">
                      {heroAsset ? heroAsset.category : 'Sustainability Leader'}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black leading-tight">
                      {heroAsset ? heroAsset.title : "สร้างสรรค์พลังงานและสินค้าที่เป็นมิตรต่อสิ่งแวดล้อมเพื่อคุณ"}
                    </h2>
                    <p className="text-sm md:text-base text-slate-200">
                      {heroAsset ? heroAsset.alt : "ร่วมเดินทางสู่วิถีชีวิตที่ยั่งยืนด้วยการเลือกใช้ผลิตภัณฑ์และพลังงานสะอาดระดับแนวหน้าของอุตสาหกรรม"}
                    </p>
                    <div className="pt-4 flex flex-wrap justify-center gap-3">
                      <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all">
                        สำรวจผลิตภัณฑ์
                      </button>
                      <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold backdrop-blur-sm transition-all">
                        ศึกษาข้อมูลเพิ่มเติม
                      </button>
                    </div>
                  </div>
                </section>
              );
            })()}

            {/* Product Showcase section */}
            <section className="py-16 px-8 md:px-16 max-w-6xl mx-auto space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-slate-900">ผลิตภัณฑ์เพื่อสิ่งแวดล้อม</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">คัดสรรวัตถุดิบและระบบการผลิตที่ใส่ใจทุกขั้นตอนสู่สินค้าคุณภาพพรีเมียม</p>
              </div>

              {/* Grid of Product Display categories or default cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {assets.filter(a => a.category === "Product Display").slice(0, 3).map((prod) => (
                  <div key={prod.id} className="bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition-all flex flex-col">
                    <div className="aspect-[4/3] bg-slate-200 overflow-hidden relative">
                      <img src={prod.url} alt={prod.alt} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{prod.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{prod.alt}</p>
                      </div>
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                        <span className="text-xs font-bold text-emerald-600">สิทธิพิเศษ</span>
                        <button className="px-3 py-1.5 bg-slate-900 text-white hover:bg-emerald-600 rounded-lg text-[11px] font-semibold transition-all">
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* If no products are defined, show placeholders */}
                {assets.filter(a => a.category === "Product Display").length === 0 && (
                  <div className="col-span-3 text-center py-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-xs font-medium">โปรดเพิ่มรูปภาพหมวดหมู่ "Product Display" เพื่อแสดงที่นี่</p>
                  </div>
                )}
              </div>
            </section>

            {/* Sustainability section */}
            {(() => {
              const sustainAsset = assets.find(a => a.category === "Sustainability");
              return (
                <section className="py-16 px-8 md:px-16 bg-slate-900 text-white grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                  <div className="space-y-4">
                    <span className="text-emerald-400 text-xs font-extrabold tracking-wider uppercase">ความตั้งใจของเรา</span>
                    <h3 className="text-2xl md:text-3xl font-black">
                      {sustainAsset ? sustainAsset.title : "การพัฒนาที่ยั่งยืนเริ่มต้นที่กระบวนการจัดเก็บวัตถุดิบ"}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                      {sustainAsset ? sustainAsset.alt : "ด้วยวิสัยทัศน์ในระยะยาว PS SUSTAIN พัฒนาแนวคิดเศรษฐกิจหมุนเวียนและนำกระบวนการลดการปล่อยก๊าซคาร์บอน (Carbon Neutrality) มาผสานรวมในห่วงโซ่อุปทานทั้งหมด"}
                    </p>
                    <ul className="space-y-2 text-xs md:text-sm text-slate-300">
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                        <span>ลดอัตราการสร้างขยะอุตสาหกรรมกว่า 80%</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
                        <span>ใช้พลังงานหมุนเวียน 100% ในกระบวนการผลิต</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="aspect-video bg-slate-800 rounded-2xl overflow-hidden shadow-xl border border-slate-800">
                    {sustainAsset ? (
                      <img src={sustainAsset.url} alt={sustainAsset.alt} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-medium">
                        (รูปภาพด้านความยั่งยืน Sustainability Graphic)
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}

            {/* Mockup Footer */}
            <footer className="bg-slate-950 text-slate-500 py-10 px-8 md:px-16 text-center text-xs border-t border-slate-900">
              <p>© {new Date().getFullYear()} PS SUSTAIN PRODUCTS. All rights reserved.</p>
              <p className="mt-1 text-slate-600 font-mono">Powered by real-time Firebase Firestore data stream.</p>
            </footer>

          </div>
        </div>
      )}

      {/* ----------------- WEB INTEGRATION MODAL ----------------- */}
      {isIntegrationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center space-x-2.5">
                <Globe className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-800">คู่มือการเชื่อมต่อเว็บไซต์จริง (Web Integration Guide)</h3>
              </div>
              <button 
                onClick={() => setIsIntegrationOpen(false)} 
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 text-xs text-blue-900">
                <p className="font-bold flex items-center gap-1.5 text-blue-950 text-sm mb-1">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  คุณสามารถนำข้อมูลรูปภาพจากแผงควบคุมนี้ไปอัปเดตบนเว็บไซต์หลักของคุณได้ทันที!
                </p>
                <p className="leading-relaxed">
                  เราได้สร้างระบบ API Endpoint สาธารณะแบบ CORS-enabled ไว้ให้เรียบร้อยแล้ว เว็บไซต์จริงของคุณสามารถเรียกข้อมูลรูปภาพ, Alt Text, ลิงก์ และหมวดหมู่ที่ตั้งค่าผ่านหน้า Dashboard นี้ไปแสดงผลได้แบบไดนามิกแบบ Real-time
                </p>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setIntegrationTab('api')}
                  className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    integrationTab === 'api'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  1. API Endpoint
                </button>
                <button
                  type="button"
                  onClick={() => setIntegrationTab('js')}
                  className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    integrationTab === 'js'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  2. JavaScript Integration
                </button>
                <button
                  type="button"
                  onClick={() => setIntegrationTab('react')}
                  className={`px-4 py-2 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                    integrationTab === 'react'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  3. React Component
                </button>
              </div>

              {/* Tab Contents */}
              {integrationTab === 'api' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase mb-1">Live API URL</h4>
                    <p className="text-xs text-slate-500 mb-2">เรียกใช้ GET request ไปยัง URL นี้เพื่อดึง JSON ข้อมูลรูปภาพทั้งหมด</p>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2.5 font-mono text-[11px] text-slate-700 select-all truncate">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/api/assets
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (typeof window !== 'undefined') {
                            navigator.clipboard.writeText(`${window.location.origin}/api/assets`);
                            showToast("คัดลอก API URL สำเร็จ!", "success");
                          }
                        }}
                        className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอก</span>
                      </button>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Example API Response</span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-700 font-bold px-2 py-0.5 rounded">200 OK</span>
                    </div>
                    <pre className="p-4 bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto leading-relaxed max-h-48">
{`{
  "success": true,
  "projectName": "PS SUSTAIN PRODUCTS",
  "total": 6,
  "assets": [
    {
      "id": "hero-solar-01",
      "title": "Sustainable Future Hero Header",
      "alt": "Modern solar panel farm at sunset...",
      "url": "https://images.unsplash.com/photo-...",
      "category": "Hero Banner",
      "createdAt": 1719999999999
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              )}

              {integrationTab === 'js' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    นำสคริปต์นี้ไปแปะในหน้าเว็บ HTML จริง เพื่อดึงภาพจากแผงควบคุมมาแทนที่รูปภาพบนหน้าเว็บจริงโดยอัตโนมัติ:
                  </p>
                  
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Vanilla JS Embed Code</span>
                      <button
                        type="button"
                        onClick={() => {
                          const host = typeof window !== 'undefined' ? window.location.origin : 'https://ps-sustain.com';
                          const code = `<!-- 1. แปะ Tag รูปภาพเหล่านี้ไว้ที่จุดต่างๆ ในหน้าเว็บหลักของคุณ -->
<img id="web-logo" src="" alt="Logo Loading...">
<img id="web-hero-banner" src="" alt="Hero Loading...">

<script>
  // 2. ฟังก์ชันโหลดรูปภาพจากระบบ Admin Dashboard ของคุณ
  async function loadWebsiteAssets() {
    try {
      const response = await fetch('${host}/api/assets');
      const data = await response.json();
      
      if (data.success && data.assets) {
        // ดึงโลโก้ (Logo)
        const logoAsset = data.assets.find(a => a.category === "Logo");
        if (logoAsset) {
          const logoEl = document.getElementById("web-logo");
          if (logoEl) {
            logoEl.src = logoAsset.url;
            logoEl.alt = logoAsset.alt;
          }
        }

        // ดึงภาพแบนเนอร์หลัก (Hero Banner)
        const heroAsset = data.assets.find(a => a.category === "Hero Banner");
        if (heroAsset) {
          const heroEl = document.getElementById("web-hero-banner");
          if (heroEl) {
            heroEl.src = heroAsset.url;
            heroEl.alt = heroAsset.alt;
          }
        }
      }
    } catch (err) {
      console.error("Failed to load live assets:", err);
    }
  }

  // ทำการดึงภาพทันทีเมื่อหน้าเว็บโหลดเสร็จ
  document.addEventListener("DOMContentLoaded", loadWebsiteAssets);
</script>`;
                          navigator.clipboard.writeText(code);
                          showToast("คัดลอก Code สำเร็จ!", "success");
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        คัดลอกโค้ด
                      </button>
                    </div>
                    <pre className="p-4 bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto leading-relaxed max-h-64">
{`<!-- 1. แปะ Tag รูปภาพเหล่านี้ไว้ที่จุดต่างๆ ในหน้าเว็บหลักของคุณ -->
<img id="web-logo" src="" alt="Logo Loading...">
<img id="web-hero-banner" src="" alt="Hero Loading...">

<script>
  // 2. ฟังก์ชันโหลดรูปภาพจากระบบ Admin Dashboard ของคุณ
  async function loadWebsiteAssets() {
    try {
      const response = await fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://ps-sustain.com'}/api/assets');
      const data = await response.json();
      
      if (data.success && data.assets) {
        // ดึงโลโก้ (Logo)
        const logoAsset = data.assets.find(a => a.category === "Logo");
        if (logoAsset) {
          const logoEl = document.getElementById("web-logo");
          if (logoEl) {
            logoEl.src = logoAsset.url;
            logoEl.alt = logoAsset.alt;
          }
        }

        // ดึงภาพแบนเนอร์หลัก (Hero Banner)
        const heroAsset = data.assets.find(a => a.category === "Hero Banner");
        if (heroAsset) {
          const heroEl = document.getElementById("web-hero-banner");
          if (heroEl) {
            heroEl.src = heroAsset.url;
            heroEl.alt = heroAsset.alt;
          }
        }
      }
    } catch (err) {
      console.error("Failed to load live assets:", err);
    }
  }

  document.addEventListener("DOMContentLoaded", loadWebsiteAssets);
</script>`}
                    </pre>
                  </div>
                </div>
              )}

              {integrationTab === 'react' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    สำหรับเว็บไซต์จริงที่สร้างด้วย React (Next.js, Vite React), คุณสามารถสร้าง Custom Hook หรือเรียกใช้ผ่าน useEffect เพื่อดึงภาพไปแสดงผลได้อย่างลื่นไหล:
                  </p>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">React Component Snippet</span>
                      <button
                        type="button"
                        onClick={() => {
                          const host = typeof window !== 'undefined' ? window.location.origin : 'https://ps-sustain.com';
                          const code = `import React, { useState, useEffect } from 'react';

export function LiveHeroBanner() {
  const [heroImage, setHeroImage] = useState({ url: '', alt: '', title: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('${host}/api/assets')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.assets) {
          const hero = data.assets.find(a => a.category === 'Hero Banner');
          if (hero) {
            setHeroImage({ url: hero.url, alt: hero.alt, title: hero.title });
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>กำลังโหลดแบนเนอร์...</div>;
  if (!heroImage.url) return null;

  return (
    <div 
      style={{ backgroundImage: \`linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.4)), url(\${heroImage.url})\` }}
      className="bg-cover bg-center min-h-[500px] flex items-center justify-center text-white"
    >
      <div className="text-center">
        <h1 className="text-4xl font-extrabold">{heroImage.title}</h1>
        <p className="mt-2 text-slate-200">{heroImage.alt}</p>
      </div>
    </div>
  );
}`;
                          navigator.clipboard.writeText(code);
                          showToast("คัดลอก Code สำเร็จ!", "success");
                        }}
                        className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        คัดลอกโค้ด
                      </button>
                    </div>
                    <pre className="p-4 bg-slate-900 text-slate-300 font-mono text-[10px] overflow-x-auto leading-relaxed max-h-64">
{`import React, { useState, useEffect } from 'react';

export function LiveHeroBanner() {
  const [heroImage, setHeroImage] = useState({ url: '', alt: '', title: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('${typeof window !== 'undefined' ? window.location.origin : 'https://ps-sustain.com'}/api/assets')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.assets) {
          const hero = data.assets.find(a => a.category === 'Hero Banner');
          if (hero) {
            setHeroImage({ url: hero.url, alt: hero.alt, title: hero.title });
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>กำลังโหลดแบนเนอร์...</div>;
  if (!heroImage.url) return null;

  return (
    <div 
      style={{ backgroundImage: \`linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.4)), url(\${heroImage.url})\` }}
      className="bg-cover bg-center min-h-[500px] flex items-center justify-center text-white"
    >
      <div className="text-center">
        <h1 className="text-4xl font-extrabold">{heroImage.title}</h1>
        <p className="mt-2 text-slate-200">{heroImage.alt}</p>
      </div>
    </div>
  );
}`}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsIntegrationOpen(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
