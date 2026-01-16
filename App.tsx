import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Settings, BarChart3, CheckCircle2, AlertTriangle, Wrench, LogOut, 
  MessageSquare, ClipboardList, Database, Plus, UserPlus, History, HardDrive, 
  UserCog, LayoutDashboard, X, Calendar as CalendarIcon, Filter, Trophy, Search, Lock, Fingerprint, Loader2,
  Trash2, Pencil, FileSpreadsheet, FileText, ChevronLeft, ChevronRight, Clock, Send, Download, Smartphone,
  ListChecks, Ban, Activity, Timer, TrendingUp, Gauge, CheckSquare, Percent, Truck, Factory, FileCheck, ScanLine, Stethoscope, PauseCircle, FileBadge
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  format, addDays, isPast, parseISO, startOfMonth, isSameMonth, 
  isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, endOfMonth, startOfWeek, endOfWeek, isSameDay, addMonths, subMonths, isFuture, isToday, differenceInDays, isValid
} from 'date-fns';

// --- FIREBASE IMPORTS ---
import { db, auth } from './firebaseConfig'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, setDoc 
} from 'firebase/firestore';

import { Role, User, Machine, MaintenanceRecord, MaintenanceType } from './types';

// --- HELPER SEGURO PARA FECHAS ---
const safeDate = (dateStr: string | undefined | null): Date => {
    if (!dateStr) return new Date();
    try {
        const parsed = parseISO(dateStr);
        return isValid(parsed) ? parsed : new Date();
    } catch (e) {
        return new Date();
    }
};

// --- TIPOS ADICIONALES ---
type AssetType = 'MAQUINA' | 'VEHICULO';
type MachineStatus = 'ACTIVE' | 'STOPPED';

interface ExtendedMachine extends Machine {
  assetType?: AssetType; 
  status?: MachineStatus; 
}

interface ChecklistItem {
  id: string;
  label: string;
  roleTarget: Role; 
  targetType: AssetType | 'ALL';
}

// --- COMPONENTS ---

const IndustrialButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'dark' | 'ghost';
  className?: string;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', fullWidth = false, type = "button", disabled = false }) => {
  const baseStyles = "px-4 py-3 md:px-6 md:py-4 font-extrabold text-xs md:text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 rounded-2xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-100",
    secondary: "bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white shadow-amber-200",
    danger: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-200",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200",
    outline: "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-orange-400",
    dark: "bg-slate-900 text-white hover:bg-slate-800 border border-slate-700",
    ghost: "bg-transparent text-slate-400 hover:text-slate-600 shadow-none"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: (e: any) => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-slate-200/40 p-5 md:p-8 border border-slate-100 ${className}`}>
    {children}
  </div>
);

const PinModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (pin: string) => void; title: string }> = ({ isOpen, onClose, onConfirm, title }) => {
  const [pin, setPin] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-sm text-center">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500"><Fingerprint className="w-8 h-8" /></div>
        <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Firma Digital</h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{title}</p>
        <input type="password" maxLength={4} placeholder="PIN" className="w-full text-center text-3xl font-black tracking-[1em] p-4 border-b-4 border-orange-500 outline-none mb-8 bg-transparent" value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))} autoFocus />
        <div className="space-y-3"><IndustrialButton fullWidth onClick={() => { onConfirm(pin); setPin(''); }}>Firmar y Confirmar</IndustrialButton><button onClick={onClose} className="text-xs font-bold text-slate-400 uppercase hover:text-red-500 transition-colors">Cancelar Operación</button></div>
      </Card>
    </div>
  );
};

const WhatsAppModal: React.FC<{ isOpen: boolean; onClose: () => void; onSend: (text: string) => void; userName: string }> = ({ isOpen, onClose, onSend, userName }) => {
  const [message, setMessage] = useState('');
  useEffect(() => { if(isOpen) setMessage(`Hola ${userName}, consulta sobre mantenimiento pendiente:...`); }, [isOpen, userName]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md">
        <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black uppercase flex items-center gap-2 text-emerald-600"><MessageSquare className="w-6 h-6" /> Mensaje Directo</h3><button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-red-500" /></button></div>
        <p className="text-sm font-bold text-slate-500 mb-4 uppercase">Destinatario: <span className="text-slate-900">{userName}</span></p>
        <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl mb-6 outline-none focus:border-emerald-500 font-medium h-32 resize-none" value={message} onChange={e => setMessage(e.target.value)} autoFocus />
        <IndustrialButton fullWidth variant="success" onClick={() => onSend(message)}><Send className="w-4 h-4" /> Enviar WhatsApp</IndustrialButton>
      </Card>
    </div>
  );
};

// --- MINI CALENDARIO ---
const MiniCalendar: React.FC<{ machines: ExtendedMachine[], records: MaintenanceRecord[], users?: User[], user?: User, mode: 'MANAGER' | 'OPERATOR' }> = ({ machines, records, users = [], user, mode }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const calendarDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonth)), end: endOfWeek(endOfMonth(currentMonth)) }), [currentMonth]);
  
  const getDayStatus = (date: Date) => {
    const dayRecords = records.filter(r => isSameDay(safeDate(r.date), date) && (mode === 'MANAGER' || r.userId === user?.id));
    const isPending = machines.some(m => {
        if (m.status === 'STOPPED') return false; // Maquinas paradas no cuentan
        const opNext = addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15);
        const leadNext = addDays(safeDate(m.lastLeaderDate), m.leaderInterval || 30);
        const opMatch = isSameDay(opNext, date);
        const leadMatch = isSameDay(leadNext, date);
        if (mode === 'MANAGER') return opMatch || leadMatch;
        else if (user) {
            if (user.role === Role.OPERATOR) return (m.operatorId === user.id || !m.operatorId) && opMatch;
            if (user.role === Role.LEADER) return (m.leaderId === user.id || !m.leaderId) && leadMatch;
        }
        return false;
    });
    if (dayRecords.some(r => r.isIssue)) return 'issue';
    if (dayRecords.length > 0) return 'done';
    if (isPending) return isPast(date) && !isToday(date) ? 'missed' : 'planned';
    return 'none';
  };

  const getDetails = (date: Date) => {
    const done = records.filter(r => isSameDay(safeDate(r.date), date) && (mode === 'MANAGER' || r.userId === user?.id));
    let pending: any[] = [];
    machines.forEach(m => {
        if (m.status === 'STOPPED') return;
        const opNext = addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15);
        const leadNext = addDays(safeDate(m.lastLeaderDate), m.leaderInterval || 30);
        if (isSameDay(opNext, date)) {
            const resp = users.find(u => u.id === m.operatorId);
            if (mode === 'MANAGER' || (user?.role === Role.OPERATOR && (user.id === m.operatorId || !m.operatorId))) {
                const exists = done.some(r => r.machineId === m.id && r.type === MaintenanceType.LIGHT);
                if (!exists) pending.push({ machineName: m.name, role: 'Operario', responsibleName: resp?.name || 'COMÚN/ROTATIVO' });
            }
        }
        if (isSameDay(leadNext, date)) {
            const resp = users.find(u => u.id === m.leaderId);
            if (mode === 'MANAGER' || (user?.role === Role.LEADER && (user.id === m.leaderId || !m.leaderId))) {
                const exists = done.some(r => r.machineId === m.id && r.type === MaintenanceType.HEAVY);
                if (!exists) pending.push({ machineName: m.name, role: 'Líder', responsibleName: resp?.name || 'COMÚN/ROTATIVO' });
            }
        }
    });
    return { done, pending };
  };

  return (
    <Card className="h-full flex flex-col min-h-[350px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-black uppercase flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-orange-600" /> {mode === 'MANAGER' ? 'Auditoría' : 'Mi Turno'}</h3>
        <div className="flex gap-1"><button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-4 h-4"/></button><span className="text-xs font-black uppercase py-1 px-2 bg-slate-50 rounded-lg min-w-[80px] text-center">{format(currentMonth, 'MMM')}</span><button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-4 h-4"/></button></div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">{['D','L','M','M','J','V','S'].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-400">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => { 
          const status = getDayStatus(day); 
          const isCurrentMonth = isSameMonth(day, currentMonth); 
          const isSelected = selectedDay && isSameDay(day, selectedDay); 
          return (
            <div key={idx} onClick={() => setSelectedDay(day)} className={`h-8 md:h-10 rounded-lg border flex flex-col items-center justify-center cursor-pointer transition-all hover:scale-105 relative ${!isCurrentMonth ? 'opacity-20' : ''} ${isSelected ? 'border-orange-500 bg-orange-50' : 'border-slate-50 bg-white'}`}>
              <span className="text-[10px] font-bold text-slate-700">{format(day, 'd')}</span>
              <div className="flex gap-0.5 mt-0.5">
                {status === 'issue' && <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>}
                {status === 'done' && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>}
                {status === 'planned' && <div className="w-1.5 h-1.5 rounded-full bg-orange-400"></div>}
                {status === 'missed' && <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>}
              </div>
            </div>
          ); 
        })}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
        {selectedDay ? (
            <>
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2 sticky top-0 bg-white pb-1">{format(selectedDay, 'dd/MM/yyyy')}</p>
                {getDetails(selectedDay).done.map(r => {
                    const user = users.find(u => u.id === r.userId);
                    return (
                        <div key={r.id} className="flex justify-between items-center mb-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex flex-col"><span className="font-bold text-slate-700 text-xs">{machines.find(m => m.id === r.machineId)?.name}</span><span className="text-[9px] text-slate-400 uppercase font-bold">Hecho por: {user ? user.name : 'Desconocido'}</span></div>
                            {r.isIssue ? <span className="text-red-600 font-black text-[9px] border border-red-200 bg-red-50 px-2 py-1 rounded">FALLA</span> : <span className="text-emerald-600 font-black text-[9px] border border-emerald-200 bg-emerald-50 px-2 py-1 rounded">OK</span>}
                        </div>
                    );
                })}
                {getDetails(selectedDay).pending.map((p, i) => (
                    <div key={i} className={`flex justify-between items-center mb-2 p-2 rounded-lg border ${isPast(selectedDay) && !isToday(selectedDay) ? 'bg-red-50 border-red-100' : 'bg-orange-50 border-orange-100'}`}>
                        <div className="flex flex-col"><span className="font-bold text-xs text-slate-700">{p.machineName}</span><span className="text-[9px] uppercase font-bold text-slate-400">Resp: {p.responsibleName}</span></div>
                        <span className="font-black text-[9px] px-2 py-1 rounded border uppercase bg-white border-slate-200">{isPast(selectedDay) && !isToday(selectedDay) ? 'Vencido' : 'Pendiente'}</span>
                    </div>
                ))}
                {getDetails(selectedDay).done.length === 0 && getDetails(selectedDay).pending.length === 0 && <p className="text-center text-[10px] text-slate-300 italic py-4">Sin actividad.</p>}
            </>
        ) : <p className="text-center text-[10px] text-slate-400 italic py-8">Selecciona un día.</p>}
      </div>
    </Card>
  );
};

// --- MAIN APP ---

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<ExtendedMachine[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD'>('LOGIN');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => { window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setDeferredPrompt(e); }); }, []);
  const handleInstallClick = () => { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then((c: any) => { if (c.outcome === 'accepted') setDeferredPrompt(null); }); } };

  useEffect(() => {
    const conectarSistema = async () => {
      if (auth.currentUser) return;
      try { await signInWithEmailAndPassword(auth, "planta@sistema.com", "acceso_planta_2024"); } catch (error) { console.error("Error portero:", error); }
    };
    conectarSistema();
  }, []);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (s) => { setUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as User))); setIsDataLoading(false); }, () => setIsDataLoading(false));
    const unsubMachines = onSnapshot(collection(db, "machines"), (s) => setMachines(s.docs.map(d => ({ id: d.id, ...d.data() } as ExtendedMachine))));
    const unsubRecords = onSnapshot(query(collection(db, "records"), orderBy("date", "desc")), (s) => setRecords(s.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord))));
    const unsubChecklist = onSnapshot(collection(db, "checklist_config"), (s) => setChecklistItems(s.docs.map(d => ({ id: d.id, ...d.data() } as ChecklistItem))));
    
    const savedUser = localStorage.getItem('local_session_user');
    if (savedUser) { setCurrentUser(JSON.parse(savedUser)); setView('DASHBOARD'); }

    return () => { unsubUsers(); unsubMachines(); unsubRecords(); unsubChecklist(); };
  }, []);

  const handleLogin = (userId: string) => { const user = users.find(u => u.id === userId); if (user) { setCurrentUser(user); localStorage.setItem('local_session_user', JSON.stringify(user)); setView('DASHBOARD'); } };
  const handleAdminLogin = () => { 
    if (adminPass === 'admin123') { const admin = users.find(u => u.role === Role.MANAGER); if (admin) { setCurrentUser(admin); localStorage.setItem('local_session_user', JSON.stringify(admin)); setView('DASHBOARD'); setShowAdminLogin(false); setAdminPass(''); } else { alert("No se encontró usuario Gerente en la base de datos."); } } else { alert("Contraseña incorrecta."); } 
  };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('local_session_user'); setView('LOGIN'); };
  
  const seedDB = async () => { alert("Función desactivada."); };
  const getRoleDisplayName = (role?: Role) => { if (role === Role.LEADER) return "RESP. MANTENIMIENTO"; if (role === Role.MANAGER) return "GERENCIA"; return "OPERARIO"; };

  if (view === 'LOGIN') {
    const publicUsers = users.filter(u => u.role !== Role.MANAGER);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 relative overflow-hidden">
        {showAdminLogin && (
          <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <Card className="w-full max-w-md border-slate-700 bg-slate-800 text-white shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black uppercase flex items-center gap-3"><Lock className="text-orange-500"/> Acceso Restringido</h3><button onClick={() => setShowAdminLogin(false)}><X className="text-slate-400 hover:text-white"/></button></div>
              <p className="text-sm text-slate-400 mb-6 font-medium">Área exclusiva para Gerencia Técnica. Ingrese clave maestra.</p>
              <input type="password" placeholder="Contraseña" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-600 text-white font-bold mb-6 outline-none focus:border-orange-500 text-center tracking-widest text-xl" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
              <IndustrialButton fullWidth onClick={handleAdminLogin}>Ingresar al Panel</IndustrialButton>
            </Card>
          </div>
        )}
        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center space-y-2">
            <div className="inline-block p-4 bg-orange-100 rounded-[2rem] text-orange-600 shadow-lg shadow-orange-100"><Settings className="w-12 h-12 animate-spin-slow" /></div>
            <h1 className="text-5xl font-black uppercase tracking-tighter text-slate-900 leading-none">MTO <span className="text-orange-600 underline decoration-amber-500">PRO</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Portal de Acceso Industrial</p>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-50 space-y-6 relative min-h-[300px] flex flex-col justify-center">
            {isDataLoading ? (
              <div className="flex flex-col items-center justify-center gap-4 py-8"><Loader2 className="w-10 h-10 animate-spin text-orange-500" /><p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Conectando con Planta...</p></div>
            ) : (
              <>
                {users.length > 0 && (
                  <div className="space-y-2 animate-in fade-in">
                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Personal de Planta</label>
                    <select className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-2xl text-lg font-bold outline-none appearance-none cursor-pointer focus:border-orange-500 transition-all" onChange={(e) => handleLogin(e.target.value)} value="">
                      <option value="" disabled>-- Seleccione su Identidad --</option>
                      {publicUsers.map(u => <option key={u.id} value={u.id}>{u.name} | {getRoleDisplayName(u.role)}</option>)}
                    </select>
                  </div>
                )}
                {deferredPrompt && (
                  <button onClick={handleInstallClick} className="w-full py-3 bg-slate-900 text-white rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2 animate-bounce">
                    <Smartphone className="w-4 h-4" /> Instalar App en Celular
                  </button>
                )}
                <div className="pt-4 border-t border-slate-100 flex justify-center mt-4">
                  <button onClick={() => setShowAdminLogin(true)} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 hover:text-orange-600 transition-colors tracking-widest"><Lock className="w-3 h-3" /> Acceso Gerencial</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-xl text-white shadow-lg shadow-orange-200"><Settings className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div><h1 className="text-xl md:text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">MTO <span className="text-orange-600">PRO</span></h1></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block"><p className="text-sm font-black text-slate-900 uppercase leading-none">{currentUser?.name}</p><span className="text-[9px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase mt-2 inline-block tracking-tighter">{getRoleDisplayName(currentUser?.role)}</span></div>
          <button onClick={handleLogout} className="p-2 md:p-3 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><LogOut className="w-5 h-5 md:w-6 md:h-6" /></button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-12 max-w-7xl mx-auto w-full pb-20">
        {currentUser?.role === Role.OPERATOR && <OperatorView user={currentUser} users={users} machines={machines} records={records} checklistItems={checklistItems} />}
        {currentUser?.role === Role.LEADER && <LeaderView user={currentUser} machines={machines} records={records} checklistItems={checklistItems} />}
        {currentUser?.role === Role.MANAGER && <ManagerView users={users} machines={machines} records={records} checklistItems={checklistItems} onInitChecklist={seedDB} />}
      </main>
      
      {/* SGC FOOTER */}
      <footer className="bg-slate-900 text-slate-500 py-3 text-center text-[9px] font-bold uppercase tracking-widest fixed bottom-0 w-full z-40 hidden md:flex justify-center gap-10 border-t border-slate-800">
          <span>SGC - Top Safe S.A.</span>
          <span className="text-slate-400">|</span>
          <span>FG-030-62O: Plan Mto. Operario</span>
          <span className="text-slate-400">|</span>
          <span>FG-030-62R: Plan Mto. Responsable</span>
      </footer>
    </div>
  );
}

// --- VISTA OPERARIO MODIFICADA PARA VEHÍCULOS ---

const OperatorView: React.FC<{ user: User; users: User[]; machines: ExtendedMachine[]; records: MaintenanceRecord[]; checklistItems: ChecklistItem[] }> = ({ user, users, machines, records, checklistItems }) => {
  const [selectedMachine, setSelectedMachine] = useState<ExtendedMachine | null>(null);
  const [checklistStatus, setChecklistStatus] = useState<Record<string, string>>({});
  const [obs, setObs] = useState('');
  const [vehicleDocs, setVehicleDocs] = useState(''); // ESTADO PARA DOCUMENTACION
  const [downtime, setDowntime] = useState(0);
  const [isCritical, setIsCritical] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. MIS MAQUINAS
  const myMachines = machines.filter(m => m.operatorId === user.id);

  // 2. ALERTAS CRÍTICAS
  const alertMachines = machines.filter(m => 
    m.operatorId !== user.id && 
    m.status !== 'STOPPED' &&
    isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15))
  );
  
  // 3. BUSCADOR GENERAL
  const otherMachines = machines.filter(m => 
    m.operatorId !== user.id && 
    m.status !== 'STOPPED' &&
    !isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15)) &&
    (m.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCheck = (itemId: string, status: string) => { setChecklistStatus(prev => { if (prev[itemId] === status) { const n = { ...prev }; delete n[itemId]; return n; } return { ...prev, [itemId]: status }; }); };
  
  const myChecklistItems = checklistItems.filter(i => {
    if (i.roleTarget !== Role.OPERATOR) return false;
    const currentMachineType = selectedMachine?.assetType || 'MAQUINA';
    const itemTarget = i.targetType || 'ALL';
    return itemTarget === 'ALL' || itemTarget === currentMachineType;
  });

  const requestSignature = () => { const allChecked = myChecklistItems.every(i => checklistStatus[i.id]); if (!selectedMachine || !allChecked) return alert("Complete todos los items."); setShowPinModal(true); };
  
  const finalizeManto = async (pin: string) => { 
    if (pin !== user.pin) return alert("ERROR DE FIRMA."); 
    if (!selectedMachine) return; 
    try { 
      const checklistText = Object.entries(checklistStatus).map(([id, s]) => `${checklistItems.find(i => i.id === id)?.label}: ${s}`).join(', ');
      
      // INCORPORAR DATOS DE VEHÍCULO A LA OBSERVACIÓN SI EXISTEN
      let fullObs = `[PARADA: ${downtime} min] [CHECKLIST: ${checklistText}] ${obs}`;
      if (selectedMachine.assetType === 'VEHICULO' && vehicleDocs) {
          fullObs += ` [DOCS/KM: ${vehicleDocs}]`;
      }

      await addDoc(collection(db, "records"), { machineId: selectedMachine.id, userId: user.id, date: new Date().toISOString(), observations: fullObs, type: MaintenanceType.LIGHT, isIssue: isCritical, downtime: downtime }); 
      await updateDoc(doc(db, "machines", selectedMachine.id), { lastOperatorDate: new Date().toISOString() }); 
      setSelectedMachine(null); setIsCritical(false); setObs(''); setVehicleDocs(''); setChecklistStatus({}); setDowntime(0); setShowPinModal(false); setSearchTerm(''); alert("Guardado."); 
    } catch (e) { console.error(e); } 
  };

  if (selectedMachine) {
    const isVehicle = selectedMachine.assetType === 'VEHICULO';

    return (
      <Card className="max-w-2xl mx-auto border-orange-200 shadow-orange-100 relative mb-20">
        <PinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} onConfirm={finalizeManto} title="Firma Digital" />
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-orange-600 mb-8 flex items-center gap-2 tracking-widest">← Volver</button>
        <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-black text-slate-800 uppercase tracking-tighter">{selectedMachine.name}</h2>
            <div className="flex gap-2 mt-2">
                <span className="bg-slate-100 text-slate-500 font-bold uppercase text-[9px] px-2 py-1 rounded">{selectedMachine.assetType || 'MAQUINA'}</span>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest py-1">{isVehicle ? 'Inspección de Flota' : 'Mantenimiento Autónomo'}</p>
            </div>
        </div>
        
        <div className="space-y-4 mb-8">
            {myChecklistItems.length === 0 && <p className="text-sm italic text-slate-400">Sin items configurados.</p>}
            {myChecklistItems.map((item) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 border-slate-100 bg-white gap-4 sm:gap-0">
                    <span className="text-sm font-bold text-slate-700 w-full sm:w-1/2">{item.label}</span>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap justify-end">
                        <button onClick={() => handleCheck(item.id, 'NA')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'NA' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>N/A</button>
                        
                        {/* LÓGICA DE BOTONES SEGÚN TIPO */}
                        {isVehicle ? (
                            <>
                                <button onClick={() => handleCheck(item.id, 'DEFICIENTE')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'DEFICIENTE' ? 'bg-amber-500 text-white shadow-amber-200 shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600'}`}>DEFICIENTE</button>
                                <button onClick={() => handleCheck(item.id, 'BIEN')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'BIEN' ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}>BIEN</button>
                            </>
                        ) : (
                            <button onClick={() => handleCheck(item.id, 'OK')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'OK' ? 'bg-emerald-500 text-white shadow-emerald-200 shadow-lg' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-600'}`}>HECHO</button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* CAMPO ESPECIAL PARA VEHÍCULOS */}
        {isVehicle && (
             <div className="mb-8 bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                <h4 className="text-blue-800 font-black uppercase text-sm mb-4 flex items-center gap-2"><FileBadge className="w-5 h-5"/> Documentación & Kilometraje</h4>
                <textarea className="w-full p-4 border border-blue-200 rounded-2xl outline-none focus:border-blue-500 font-medium text-sm h-24" placeholder="Ej: Seguro al día, VTV vence en 2 meses. KM Actual: 150.000" value={vehicleDocs} onChange={e => setVehicleDocs(e.target.value)} />
             </div>
        )}

        <div className="mb-8"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tiempo Parada (Min)</label><input type="number" className="w-full p-4 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-orange-500 font-bold text-xl" value={downtime} onChange={e => setDowntime(parseInt(e.target.value) || 0)} /></div>
        <div className={`p-4 md:p-6 rounded-3xl border-2 mb-8 flex items-center gap-5 transition-colors ${isCritical ? 'bg-red-600 border-red-700 text-white' : 'bg-red-50 border-red-100 text-red-600'}`}><input type="checkbox" className="w-6 h-6 md:w-8 md:h-8 accent-white" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} id="critical" /><label htmlFor="critical" className="font-black uppercase text-xs md:text-sm cursor-pointer select-none">⚠️ Reportar Avería</label></div>
        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] mb-8 h-32 outline-none focus:border-orange-500 font-medium text-lg" placeholder="Observaciones generales..." value={obs} onChange={e => setObs(e.target.value)} />
        <IndustrialButton fullWidth onClick={requestSignature}>Certificar</IndustrialButton>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8"><div><h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mi Panel</h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-3">Estado de Máquinas</p></div><div className="w-full md:w-96"><MiniCalendar machines={machines} records={records} user={user} users={users} mode="OPERATOR" /></div></div>
      
      {/* SECCION 1: MIS ACTIVOS FIJOS */}
      {myMachines.length > 0 && (
        <div className="space-y-6">
            <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3"><UserCog className="text-orange-600" /> Mis Responsabilidades</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myMachines.map(m => { 
                    const isDue = isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15)); 
                    return (
                        <Card key={m.id} className={`${isDue ? 'border-red-500 shadow-red-100' : 'border-emerald-500 shadow-emerald-100'} cursor-pointer hover:scale-[1.02] transition-transform`} onClick={() => { setSelectedMachine(m); setChecklistStatus({}); }}>
                            <div className="flex justify-between mb-4">
                                <div className={`p-3 rounded-2xl ${isDue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {m.assetType === 'VEHICULO' ? <Truck className="w-6 h-6"/> : <Wrench className="w-6 h-6" />}
                                </div>
                                {isDue && <span className="text-[9px] font-black bg-red-600 text-white px-3 py-1 rounded-full animate-pulse uppercase tracking-widest">Atención Requerida</span>}
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 uppercase mb-4 leading-tight">{m.name}</h3>
                            <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase">Frecuencia: {m.operatorInterval} días</p></div>
                        </Card>
                    ); 
                })}
            </div>
        </div>
      )}

      {/* SECCION 2: ALERTAS DE PLANTA */}
      {alertMachines.length > 0 && (
        <div className="space-y-6 pt-12 border-t border-slate-200">
             <h3 className="text-xl font-black text-red-600 uppercase flex items-center gap-3 animate-pulse"><AlertTriangle /> Mantenimiento Vencido (General)</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {alertMachines.map(m => {
                    const respUser = users.find(u => u.id === m.operatorId);
                    return (
                        <div key={m.id} onClick={() => { setSelectedMachine(m); setChecklistStatus({}); }} className="bg-red-50 p-6 rounded-3xl border border-red-200 cursor-pointer hover:shadow-xl transition-all flex flex-col justify-between items-start group">
                            <div className="flex justify-between w-full mb-4">
                                <div className="bg-white p-2 rounded-xl text-red-500"><Wrench className="w-5 h-5" /></div>
                                <span className="text-[9px] bg-red-200 text-red-800 px-2 py-1 rounded font-bold uppercase">Vencido</span>
                            </div>
                            <p className="font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">{m.name}</p>
                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Resp: {respUser ? respUser.name : 'Sin Asignar'}</p>
                        </div>
                    );
                })}
             </div>
        </div>
      )}

      {/* SECCION 3: BUSCADOR GENERAL */}
      <div className="space-y-6 pt-12 border-t border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4">
              <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3"><ScanLine className="text-slate-400" /> Operar Otro Equipo</h3>
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 w-full md:w-auto">
                <Search className="w-4 h-4 text-slate-400" />
                <input className="outline-none text-sm font-bold text-slate-700 bg-transparent" placeholder="Buscar equipo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
          </div>
          
          {searchTerm && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in">
                  {otherMachines.map(m => {
                      return (
                          <div key={m.id} onClick={() => { setSelectedMachine(m); setChecklistStatus({}); }} className="bg-white p-6 rounded-3xl border border-slate-100 cursor-pointer hover:shadow-xl transition-all flex flex-col justify-between items-start group">
                              <div className="flex justify-between w-full mb-4">
                                  <div className="bg-slate-100 p-2 rounded-xl text-slate-500 group-hover:text-orange-600 transition-colors">
                                      {m.assetType === 'VEHICULO' ? <Truck className="w-5 h-5"/> : <HardDrive className="w-5 h-5" />}
                                  </div>
                                  <span className="text-[9px] bg-emerald-100 text-emerald-600 px-2 py-1 rounded font-bold uppercase">Al Día</span>
                              </div>
                              <p className="font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">{m.name}</p>
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ciclo: {m.operatorInterval}d</p>
                          </div>
                      );
                  })}
              </div>
          )}
      </div>
    </div>
  );
};
