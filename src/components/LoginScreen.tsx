import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  HardHat,
  AlertCircle,
  Eye,
  EyeOff,
  Users,
  ArrowRight,
  UserPlus,
  LogIn,
  ArrowLeft,
  CheckCircle2,
  UserCheck
} from 'lucide-react';
import { UserRole } from '../types';
import { apiChangePin, apiLogin, apiRegister, type ApiUser } from '../lib/api';

interface LoginScreenProps {
  onLoginSuccess: (role: UserRole, fullName?: string, employeeId?: string) => void;
  appTitle?: string;
  companyName?: string;
}

interface RegisteredUser {
  username: string;
  name: string;
  role: UserRole;
  pin: string;
  createdAt: string;
}

export default function LoginScreen({
  onLoginSuccess,
  appTitle = 'Quản Trị Doanh Nghiệp',
  companyName = 'CÔNG TY CỔ PHẦN ĐẦU TƯ & XÂY DỰNG ĐẤT VIỆT'
}: LoginScreenProps) {
  const serverMode = import.meta.env.VITE_USE_SERVER === 'true';

  // App modes: 'login' or 'register'
  const [activeMode, setActiveMode] = useState<'login' | 'register'>('login');

  // Login types: 'default' (by default roles) or 'personal' (by registered users)
  const [loginType, setLoginType] = useState<'default' | 'personal'>('default');

  // Login states
  const [selectedRole, setSelectedRole] = useState<UserRole>('CEO');
  const [employeeUsername, setEmployeeUsername] = useState('');
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [pendingPasswordUser, setPendingPasswordUser] = useState<ApiUser | null>(null);
  const [currentDefaultPassword, setCurrentDefaultPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Registration states
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('CEO');
  const [regPin, setRegPin] = useState('');
  const [regConfirmPin, setRegConfirmPin] = useState('');
  const [regEmployeeCode, setRegEmployeeCode] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [showRegPin, setShowRegPin] = useState(false);

  // List of registered users
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);

  // Load registered users from local storage
  useEffect(() => {
    const saved = localStorage.getItem('erp_registered_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RegisteredUser[];
        setRegisteredUsers(parsed);
        if (parsed.length > 0) {
          setSelectedUsername(parsed[0].username);
        }
      } catch (e) {
        console.error('Error loading registered users', e);
      }
    }
  }, []);

  // Default system roles configuration
  const roleConfig = {
    CEO: {
      name: 'Giám Đốc (CEO)',
      desc: 'Quản trị hệ thống, phê duyệt ngân sách và khôi phục dữ liệu',
      correctPin: '1111',
      icon: ShieldCheck,
      color: 'border-l-blue-500 text-blue-600',
      badge: 'Toàn quyền Hệ thống'
    },
    Accountant: {
      name: 'Kế Toán Trưởng',
      desc: 'Kiểm soát sổ sách kế toán, dòng tiền lương, công nợ & nhân sự',
      correctPin: '2222',
      icon: Users,
      color: 'border-l-indigo-500 text-indigo-600',
      badge: 'Tài chính & Nhân sự'
    },
    SiteManager: {
      name: 'Chỉ Huy Trưởng',
      desc: 'Quản lý kho bãi, cấp phát nhiên liệu và điều phối thiết bị',
      correctPin: '3333',
      icon: HardHat,
      color: 'border-l-emerald-500 text-emerald-600',
      badge: 'Tác chiến Công trường'
    },
    Auditor: {
      name: 'Thanh Tra / Khách',
      desc: 'Truy cập chế độ chỉ xem báo cáo và dữ liệu kiểm toán',
      correctPin: '4444',
      icon: KeyRound,
      color: 'border-l-amber-500 text-amber-600',
      badge: 'Chỉ đọc (Read-Only)'
    },
    Employee: {
      name: 'Nhân Viên',
      desc: 'Chấm công, điểm danh và xem bảng lương cá nhân',
      correctPin: '5555',
      icon: UserCheck,
      color: 'border-l-cyan-500 text-cyan-600',
      badge: 'Cổng Nhân viên'
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (loginType === 'default') {
      const config = roleConfig[selectedRole];
      if (serverMode) {
        const usernames: Record<Exclude<UserRole, 'Employee' | 'SiteManager'>, string> = { CEO: 'ceo', Accountant: 'ketoan', Auditor: 'kiemtoan' };
        const personalRole = selectedRole === 'Employee' || selectedRole === 'SiteManager';
        const username = personalRole ? employeeUsername.trim().toLowerCase() : usernames[selectedRole];
        if (!username) {
          setErrorMsg('Vui lòng nhập tên đăng nhập nhân viên.');
          return;
        }
        try {
          const { user } = await apiLogin(username, pin);
          if (user.mustChangePassword) {
            setPendingPasswordUser(user);
            setCurrentDefaultPassword(pin);
            setPin('');
            return;
          }
          onLoginSuccess(user.role, user.fullName, user.employeeId);
        } catch (error) {
          setErrorMsg(error instanceof Error ? error.message : 'Không thể kết nối máy chủ.');
        }
        return;
      }
      if (pin === config.correctPin) {
        onLoginSuccess(selectedRole);
      } else {
        setErrorMsg(`Mật khẩu không đúng cho vai trò ${config.name}.`);
      }
    } else {
      // Personal login
      if (!selectedUsername) {
        setErrorMsg('Vui lòng chọn tài khoản cá nhân để đăng nhập!');
        return;
      }

      const user = registeredUsers.find(u => u.username === selectedUsername);
      if (!user) {
        setErrorMsg('Tài khoản không tồn tại trên hệ thống!');
        return;
      }

      if (pin === user.pin) {
        // Successful personal login
        onLoginSuccess(user.role, user.name);
      } else {
        setErrorMsg(`Mật khẩu không chính xác cho tài khoản "${user.name}".`);
      }
    }
  };

  const handleFirstPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    if (!pendingPasswordUser) return;
    if (!/^\d{6,12}$/.test(newPassword) || newPassword === currentDefaultPassword) {
      setErrorMsg('Mật khẩu mới phải có 6–12 chữ số và khác mật khẩu mặc định.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    try {
      await apiChangePin(currentDefaultPassword, newPassword);
      const { user } = await apiLogin(pendingPasswordUser.username, newPassword);
      onLoginSuccess(user.role, user.fullName, user.employeeId);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không đổi được mật khẩu.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    // Validation
    const cleanUsername = regUsername.trim().toLowerCase();
    if (!cleanUsername) {
      setErrorMsg('Tên đăng nhập không được để trống.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMsg('Tên đăng nhập phải chứa ít nhất 3 ký tự.');
      return;
    }

    // Check spaces or special chars
    if (/\s/.test(cleanUsername)) {
      setErrorMsg('Tên đăng nhập không được chứa khoảng trắng.');
      return;
    }

    if (serverMode) {
      if (!/^\d{6,12}$/.test(regPin)) { setErrorMsg('Mật khẩu đăng ký phải có 6–12 chữ số.'); return; }
      if (regPin !== regConfirmPin) { setErrorMsg('Xác nhận mật khẩu không trùng khớp.'); return; }
      try {
        const { user } = await apiRegister(cleanUsername, regEmployeeCode.trim(), regPhone, regPin);
        onLoginSuccess(user.role, user.fullName, user.employeeId);
      } catch (error) {
        setErrorMsg(error instanceof Error ? error.message : 'Không đăng ký được tài khoản.');
      }
      return;
    }

    const cleanFullName = regFullName.trim();
    if (!cleanFullName) {
      setErrorMsg('Họ và tên không được để trống.');
      return;
    }

    if (regPin.length !== 4 || !/^\d+$/.test(regPin)) {
      setErrorMsg('Mật khẩu phải gồm đúng 4 chữ số.');
      return;
    }

    if (regPin !== regConfirmPin) {
      setErrorMsg('Xác nhận mật khẩu không trùng khớp.');
      return;
    }

    // Check if duplicate username
    const isDuplicate = registeredUsers.some(u => u.username === cleanUsername);
    if (isDuplicate) {
      setErrorMsg(`Tên đăng nhập "${cleanUsername}" đã tồn tại. Vui lòng chọn tên khác!`);
      return;
    }

    // Create new user account
    const newUser: RegisteredUser = {
      username: cleanUsername,
      name: cleanFullName,
      role: regRole,
      pin: regPin,
      createdAt: new Date().toISOString()
    };

    const updatedList = [...registeredUsers, newUser];
    localStorage.setItem('erp_registered_users', JSON.stringify(updatedList));
    setRegisteredUsers(updatedList);

    // Clear registration fields
    setRegUsername('');
    setRegFullName('');
    setRegRole('CEO');
    setRegPin('');
    setRegConfirmPin('');

    // Success transition
    setSuccessMsg(`Tài khoản "${cleanFullName}" đã được đăng ký thành công!`);
    setSelectedUsername(cleanUsername);
    setLoginType('personal');
    setPin('');
    setActiveMode('login');
  };

  if (pendingPasswordUser) return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-100">
      <form onSubmit={handleFirstPasswordChange} className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-850 p-6 shadow-2xl space-y-4">
        <div><h1 className="text-lg font-black">Đổi mật khẩu lần đầu</h1><p className="mt-1 text-xs text-slate-400">{pendingPasswordUser.fullName} • @{pendingPasswordUser.username}</p></div>
        {errorMsg && <div className="rounded-lg border border-rose-800 bg-rose-950/60 p-3 text-xs font-semibold text-rose-200">{errorMsg}</div>}
        <input type="password" inputMode="numeric" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value.replace(/\D/g, ''))} placeholder="Mật khẩu mới 6–12 chữ số" className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm font-bold" required />
        <input type="password" inputMode="numeric" autoComplete="new-password" value={confirmNewPassword} onChange={event => setConfirmNewPassword(event.target.value.replace(/\D/g, ''))} placeholder="Nhập lại mật khẩu mới" className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm font-bold" required />
        <button type="submit" className="w-full rounded-xl bg-blue-600 p-3 text-xs font-black uppercase tracking-wider text-white">Đổi mật khẩu và đăng nhập</button>
      </form>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans text-slate-100" id="login-container">
      {/* Decorative Blueprint Background Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `radial-gradient(circle, #fff 1px, transparent 1px)`,
        backgroundSize: '24px 24px'
      }}></div>

      {/* Modern Centered Glass Card */}
      <div className="w-full max-w-xl bg-slate-850/90 border border-slate-750 rounded-2xl shadow-2xl p-6 md:p-8 relative z-10 backdrop-blur-md animate-fade-in" id="login-card">
        {/* Logo / Header block */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-3 shadow-lg shadow-blue-500/20 font-black text-xl tracking-wider">
            {appTitle.substring(0, 1).toUpperCase()}
          </div>
          <h2 className="text-lg md:text-xl font-black uppercase tracking-tight text-white mb-1">
            {appTitle}
          </h2>
          <p className="text-[10px] md:text-xs font-bold text-slate-400 tracking-wider uppercase">
            {companyName}
          </p>
          <div className="h-px w-20 bg-blue-500 mx-auto mt-4"></div>
        </div>

        {/* Success message banner */}
        {successMsg && (
          <div className="mb-5 bg-emerald-950/50 border border-emerald-850 rounded-xl p-3.5 flex gap-2.5 text-emerald-200 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {/* Login result banner */}
        {errorMsg ? (
          <div className="mb-5 bg-rose-950/50 border border-rose-800/80 rounded-xl p-3.5 flex gap-2.5 text-rose-200 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        ) : null}

        {/* MAIN MODE: LOGIN */}
        {activeMode === 'login' && (
          <div className="space-y-5">
            {/* Tabs for Login Type */}
            <div className="flex bg-slate-900/85 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setLoginType('default');
                  setErrorMsg(null);
                  setPin('');
                }}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  loginType === 'default'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Đăng nhập hệ thống
              </button>
              {!serverMode && <button
                type="button"
                onClick={() => {
                  setLoginType('personal');
                  setErrorMsg(null);
                  setPin('');
                  if (registeredUsers.length > 0 && !selectedUsername) {
                    setSelectedUsername(registeredUsers[0].username);
                  }
                }}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all relative ${
                  loginType === 'personal'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Tài khoản cá nhân ({registeredUsers.length})
              </button>}
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Type 1: Default Role-based Grid */}
              {loginType === 'default' && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Chọn vai trò tác nghiệp
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(Object.keys(roleConfig) as Array<UserRole>).map((role) => {
                      const conf = roleConfig[role];
                      const Icon = conf.icon;
                      const isSelected = selectedRole === role;

                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setSelectedRole(role);
                            if (role !== 'Employee') setEmployeeUsername('');
                            setErrorMsg(null);
                          }}
                          className={`text-left p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between h-24 relative overflow-hidden cursor-pointer ${
                            isSelected
                              ? 'bg-slate-800 border-blue-500/80 shadow-md shadow-blue-500/5'
                              : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex justify-between items-start w-full gap-2">
                            <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-blue-600/10 text-blue-400' : 'bg-slate-800 text-slate-400'}`}>
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isSelected ? 'bg-blue-600/20 text-blue-300' : 'bg-slate-850 text-slate-500'
                            }`}>
                              {conf.badge}
                            </span>
                          </div>

                          <div className="mt-2">
                            <span className="text-xs font-extrabold block text-white">
                              {conf.name}
                            </span>
                            <span className="text-[9px] text-slate-400 line-clamp-1 block leading-tight">
                              {conf.desc}
                            </span>
                          </div>

                          {isSelected && (
                            <div className="absolute right-0 top-0 w-2 h-2 bg-blue-500 rounded-bl"></div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {serverMode && loginType === 'default' && (selectedRole === 'Employee' || selectedRole === 'SiteManager') && (
                <div className="space-y-2">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    {selectedRole === 'SiteManager' ? 'Tên đăng nhập Chỉ huy trưởng' : 'Tên đăng nhập nhân viên'}
                  </label>
                  <input
                    type="text"
                    autoComplete="username"
                    value={employeeUsername}
                    onChange={(event) => {
                      setEmployeeUsername(event.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Ví dụ: nv-001"
                    className="block w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white lowercase focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {/* Type 2: Personal Accounts Selection */}
              {loginType === 'personal' && (
                <div className="space-y-4">
                  {registeredUsers.length === 0 ? (
                    <div className="p-6 bg-slate-900/40 border border-slate-800 border-dashed rounded-xl text-center">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-400">Chưa có tài khoản cá nhân nào được đăng ký.</p>
                      <button
                        type="button"
                        onClick={() => setActiveMode('register')}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Đăng ký tài khoản ngay
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                        Chọn tài khoản cá nhân
                      </label>
                      <select
                        value={selectedUsername}
                        onChange={(e) => {
                          setSelectedUsername(e.target.value);
                          setErrorMsg(null);
                        }}
                        className="block w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500 cursor-pointer"
                      >
                        {registeredUsers.map((u) => {
                          const rLabel =
                            u.role === 'CEO' ? 'Giám Đốc (CEO)' :
                            u.role === 'Accountant' ? 'Kế Toán Trưởng' :
                            u.role === 'SiteManager' ? 'Chỉ Huy Trưởng' :
                            'Thanh Tra / Khách';
                          return (
                            <option key={u.username} value={u.username} className="bg-slate-900 text-white font-semibold">
                              {u.name} (@{u.username}) - {rLabel}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Passcode PIN input (only shown if in default role or if we have personal accounts registered) */}
              {(loginType === 'default' || registeredUsers.length > 0) && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                      Mật khẩu đăng nhập
                    </label>
                  </div>

                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      maxLength={serverMode ? 12 : 4}
                      value={pin}
                      onChange={(e) => {
                        setPin(e.target.value.replace(/\D/g, ''));
                        setErrorMsg(null);
                      }}
                      placeholder="Nhập mật khẩu"
                      className="block w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-center text-sm font-bold font-mono tracking-[1.5em] pl-[2em] text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500 placeholder:tracking-normal placeholder:pl-0 placeholder:text-slate-600 transition-all shadow-inner"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              {(loginType === 'default' || registeredUsers.length > 0) && (
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/10 transition-all cursor-pointer group mt-2"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </form>

            {/* Footer switcher link */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setActiveMode('register');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 font-bold transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                Chưa có tài khoản? Đăng ký tài khoản cá nhân mới
              </button>
            </div>
          </div>
        )}

        {/* MAIN MODE: REGISTER */}
        {activeMode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Đăng ký tài khoản</h3>
              <button
                type="button"
                onClick={() => {
                  setActiveMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white font-bold transition-all cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại đăng nhập
              </button>
            </div>

            {/* Username */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Tên đăng nhập *
              </label>
              <input
                type="text"
                value={regUsername}
                onChange={(e) => setRegUsername(e.target.value)}
                placeholder="ví dụ: hoangm, nguyenha"
                className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500"
                required
              />
              <span className="text-[9px] text-slate-500 block">Viết liền, không dấu, ít nhất 3 ký tự, dùng để đăng nhập.</span>
            </div>

            {serverMode && <div className="grid grid-cols-2 gap-3"><div className="space-y-1"><label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Mã nhân viên *</label><input className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white" value={regEmployeeCode} onChange={e=>setRegEmployeeCode(e.target.value)} placeholder="emp-17 hoặc mã NV" required/></div><div className="space-y-1"><label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Số điện thoại hồ sơ *</label><input className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white" value={regPhone} onChange={e=>setRegPhone(e.target.value.replace(/\D/g,''))} placeholder="0961001001" required/></div></div>}

            {!serverMode && <>
            {/* Full Name */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Họ và tên người sử dụng *
              </label>
              <input
                type="text"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="ví dụ: Nguyễn Minh Hoàng"
                className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500"
                required
              />
            </div>

            {/* Assigned Role */}
            <div className="space-y-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                Vai trò tác nghiệp *
              </label>
              <select
                value={regRole}
                onChange={(e) => setRegRole(e.target.value as UserRole)}
                className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80 focus:border-blue-500 cursor-pointer"
              >
                <option value="CEO">Giám Đốc (CEO) - Đặc quyền tối cao</option>
                <option value="Accountant">Kế Toán Trưởng - Sổ sách & Nhân sự</option>
                <option value="SiteManager">Chỉ Huy Trưởng - Kho bãi & Công trường</option>
                <option value="Auditor">Thanh Tra / Khách - Chế độ chỉ xem</option>
              </select>
              <span className="text-[9px] text-slate-500 block">Vai trò quyết định phân quyền truy cập các mô-đun trong app.</span>
            </div>
            </>}

            {/* Pin Code & Confirm PIN Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    Mật khẩu đăng nhập *
                  </label>
                </div>
                <div className="relative">
                  <input
                    type={showRegPin ? 'text' : 'password'}
                    maxLength={serverMode ? 12 : 4}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs font-bold font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPin(!showRegPin)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showRegPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <span className="text-[8px] text-slate-500 block">{serverMode ? '6–12 chữ số tự chọn' : '4 chữ số tự chọn'}</span>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                  Xác nhận mật khẩu *
                </label>
                <input
                  type={showRegPin ? 'text' : 'password'}
                  maxLength={serverMode ? 12 : 4}
                  value={regConfirmPin}
                  onChange={(e) => setRegConfirmPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••"
                  className="block w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs font-bold font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-blue-500/80"
                  required
                />
                <span className="text-[8px] text-slate-500 block">Nhập lại mật khẩu trên</span>
              </div>
            </div>

            {/* Register button */}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/10 transition-all cursor-pointer mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Xác nhận Đăng ký tài khoản</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
