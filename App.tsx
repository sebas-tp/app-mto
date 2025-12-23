import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Settings, BarChart3, CheckCircle2, AlertTriangle, Wrench, LogOut, 
  MessageSquare, ClipboardList, Database, Plus, UserPlus, History, HardDrive, 
  UserCog, LayoutDashboard, X, Calendar, Filter, Trophy, Search, Lock, Fingerprint, Loader2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { 
  format, addDays, isPast, parseISO, startOfMonth, isSameMonth, 
  isWithinInterval, startOfDay, endOfDay 
} from 'date-fns';

// --- FIREBASE IMPORTS ---
import { db } from './firebaseConfig'; 
import { 
  collection, doc, addDoc, updateDoc, onSnapshot, query, orderBy, setDoc
} from 'firebase/firestore';

import { Role, User, Machine, MaintenanceRecord, MaintenanceType } from './types';

// --- COMPONENTS ---

const IndustrialButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'dark';
  className?: string;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', fullWidth = false, type = "button", disabled = false }) => {
  const baseStyles = "px-6 py-4 font-extrabold text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 rounded-2xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-100",
    secondary: "bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white shadow-amber-200",
    danger: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-200",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200",
    outline: "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-orange-400",
    dark: "bg-slate-900 text-white hover:bg-slate-800 border border-slate-700"
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 p-8 border border-slate-100 ${className}`}>
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

// --- MAIN APP ---

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD'>('LOGIN');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState('');

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    });
    const unsubMachines = onSnapshot(collection(db, "machines"), (snapshot) => {
      setMachines(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine)));
    });
    const unsubRecords = onSnapshot(query(collection(db, "records"), orderBy("date", "desc")), (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord)));
    });
    
    const savedUser = localStorage.getItem('local_session_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setView('DASHBOARD');
    }

    return () => { unsubUsers(); unsubMachines(); unsubRecords(); };
  }, []);

  const handleLogin = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('local_session_user', JSON.stringify(user));
      setView('DASHBOARD');
    }
  };

  const handleAdminLogin = () => {
    if (adminPass === 'admin123') {
      const admin = users.find(u => u.role === Role.MANAGER);
      if (admin) {
        setCurrentUser(admin);
        localStorage.setItem('local_session_user', JSON.stringify(admin));
        setView('DASHBOARD');
        setShowAdminLogin(false);
        setAdminPass('');
      } else {
        alert("No se encontró usuario Gerente en la base de datos.");
      }
    } else {
      alert("Contraseña incorrecta.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('local_session_user');
    setView('LOGIN');
  };

  const seedDB = async () => {
    const confirm = window.confirm("¿Seguro? Esto borrará/rescribirá los datos iniciales en la Nube.");
    if (!confirm) return;

    try {
      await setDoc(doc(db, "users", "u1"), { name: 'Juan Operario', role: Role.OPERATOR, phone: '5491112345678', pin: '1234' });
      await setDoc(doc(db, "users", "u2"), { name: 'Pedro Líder', role: Role.LEADER, phone: '5491112345678', pin: '1234' });
      await setDoc(doc(db, "users", "u3"), { name: 'Ana Gerente', role: Role.MANAGER, phone: '5491112345678', pin: '9999' });

      await setDoc(doc(db, "machines", "m1"), { name: 'Inyectora Plástico I-01', assignedTo: 'u1', lastMaintenance: new Date(Date.now() - 20 * 86400000).toISOString(), intervalDays: 15 });
      await setDoc(doc(db, "machines", "m2"), { name: 'Brazo Robótico R-4', assignedTo: undefined, lastMaintenance: new Date(Date.now() - 2 * 86400000).toISOString(), intervalDays: 15 });
      await setDoc(doc(db, "machines", "m3"), { name: 'Compresor Central C-80', assignedTo: 'u2', lastMaintenance: new Date(Date.now() - 40 * 86400000).toISOString(), intervalDays: 30 });

      alert("Base de Datos Inicializada Correctamente.");
    } catch (error) {
      console.error(error);
      alert("Error al escribir en Firebase. Revisa las reglas de seguridad o la consola.");
    }
  };

  const getRoleDisplayName = (role?: Role) => {
    if (role === Role.LEADER) return "RESP. MANTENIMIENTO GRAL.";
    if (role === Role.MANAGER) return "GERENCIA DE PLANTA";
    return "OPERARIO DE LÍNEA";
  };

  if (view === 'LOGIN') {
    const publicUsers = users.filter(u => u.role !== Role.MANAGER);

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6 relative overflow-hidden">
        {showAdminLogin && (
          <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300">
            <Card className="w-full max-w-md border-slate-700 bg-slate-800 text-white shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black uppercase flex items-center gap-3"><Lock className="text-orange-500"/> Acceso Restringido</h3>
                <button onClick={() => setShowAdminLogin(false)}><X className="text-slate-400 hover:text-white"/></button>
              </div>
              <p className="text-sm text-slate-400 mb-6 font-medium">Área exclusiva para Gerencia Técnica. Ingrese clave maestra.</p>
              <input type="password" placeholder="Contraseña" className="w-full p-4 rounded-xl bg-slate-900 border border-slate-600 text-white font-bold mb-6 outline-none focus:border-orange-500 text-center tracking-widest text-xl" value={adminPass} onChange={e => setAdminPass(e.target.value)} />
              <IndustrialButton fullWidth onClick={handleAdminLogin}>Ingresar al Panel</IndustrialButton>
            </Card>
          </div>
        )}

        <div className="w-full max-w-md space-y-12 relative z-10">
          <div className="text-center space-y-4">
            <div className="inline-block p-5 bg-orange-100 rounded-[2rem] text-orange-600 shadow-lg shadow-orange-100">
              <Settings className="w-16 h-16 animate-spin-slow" />
            </div>
            <h1 className="text-6xl font-black uppercase tracking-tighter text-slate-900 leading-none">TPM <span className="text-orange-600 underline decoration-amber-500">PRO</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Portal de Acceso Industrial</p>
          </div>
          
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-50 space-y-8 relative">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Personal de Planta</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-lg font-bold outline-none appearance-none cursor-pointer focus:border-orange-500 transition-all" onChange={(e) => handleLogin(e.target.value)} value="">
                <option value="" disabled>-- Seleccione su Identidad --</option>
                {publicUsers.map(u => <option key={u.id} value={u.id}>{u.name} | {getRoleDisplayName(u.role)}</option>)}
              </select>
            </div>
            {users.length === 0 && (<IndustrialButton fullWidth variant="secondary" onClick={seedDB}>Inicializar Base de Datos Nube</IndustrialButton>)}
            <div className="pt-4 border-t border-slate-100 flex justify-center">
              <button onClick={() => setShowAdminLogin(true)} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-300 hover:text-orange-600 transition-colors tracking-widest">
                <Lock className="w-3 h-3" /> Acceso Gerencial
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-lg shadow-orange-200"><Settings className="w-7 h-7" /></div>
          <div><h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">TPM <span className="text-orange-600">PRO</span></h1><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: Conectado a Nube</p></div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block"><p className="text-sm font-black text-slate-900 uppercase leading-none">{currentUser?.name}</p><span className="text-[9px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase mt-2 inline-block tracking-tighter">{getRoleDisplayName(currentUser?.role)}</span></div>
          <button onClick={handleLogout} className="p-4 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><LogOut className="w-6 h-6" /></button>
        </div>
      </header>
      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {currentUser?.role === Role.OPERATOR && <OperatorView user={currentUser} machines={machines} records={records} />}
        {currentUser?.role === Role.LEADER && <LeaderView user={currentUser} machines={machines} records={records} />}
        {currentUser?.role === Role.MANAGER && <ManagerView users={users} machines={machines} records={records} />}
      </main>
    </div>
  );
}

const OperatorView: React.FC<{ user: User; machines: Machine[]; records: MaintenanceRecord[] }> = ({ user, machines, records }) => {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(5).fill(false));
  const [obs, setObs] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);

  const myMachines = machines.filter(m => m.assignedTo === user.id);
  const availableMachines = machines.filter(m => !m.assignedTo);

  const updateMachineAssign = async (machineId: string, userId: string) => { await updateDoc(doc(db, "machines", machineId), { assignedTo: userId }); };
  const requestSignature = () => { if (!selectedMachine || checklist.some(c => !c)) return alert("Debe tildar todos los puntos de seguridad."); setShowPinModal(true); };
  const finalizeManto = async (pin: string) => { if (pin !== user.pin) return alert("ERROR DE FIRMA: PIN incorrecto."); if (!selectedMachine) return; try { await addDoc(collection(db, "records"), { machineId: selectedMachine.id, userId: user.id, date: new Date().toISOString(), observations: obs, type: MaintenanceType.LIGHT, isIssue: isCritical }); await updateDoc(doc(db, "machines", selectedMachine.id), { lastMaintenance: new Date().toISOString() }); setSelectedMachine(null); setIsCritical(false); setObs(''); setChecklist(new Array(5).fill(false)); setShowPinModal(false); alert("Certificado digitalmente."); } catch (e) { console.error(e); alert("Error de conexión."); } };

  if (selectedMachine) {
    return (
      <Card className="max-w-2xl mx-auto border-orange-200 shadow-orange-100 relative">
        <PinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} onConfirm={finalizeManto} title="Confirme su identidad para certificar" />
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-orange-600 mb-8 flex items-center gap-2 tracking-widest">← Volver a Mis Equipos</button>
        <div className="mb-8"><h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{selectedMachine.name}</h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Protocolo de Mantenimiento Autónomo</p></div>
        <div className="space-y-4 mb-8">{["Verificación de Niveles", "Limpieza de Zona", "Detección de Vibración", "Chequeo de Sensores", "Seguridad Activa"].map((t, i) => (<label key={i} className={`flex items-center gap-5 p-6 rounded-3xl border-2 cursor-pointer transition-all ${checklist[i] ? 'bg-orange-50 border-orange-500 shadow-inner' : 'bg-white border-slate-100 hover:border-slate-300'}`}><input type="checkbox" className="w-8 h-8 accent-orange-600 rounded-lg" checked={checklist[i]} onChange={() => { const c = [...checklist]; c[i] = !c[i]; setChecklist(c); }} /><span className="text-lg font-bold text-slate-700">{t}</span></label>))}</div>
        <div className={`p-6 rounded-3xl border-2 mb-8 flex items-center gap-5 transition-colors ${isCritical ? 'bg-red-600 border-red-700 text-white' : 'bg-red-50 border-red-100 text-red-600'}`}><input type="checkbox" className="w-8 h-8 accent-white" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} id="critical" /><label htmlFor="critical" className="font-black uppercase text-sm cursor-pointer select-none">⚠️ Reportar Avería Crítica (Alerta a Líder)</label></div>
        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] mb-8 h-32 outline-none focus:border-orange-500 font-medium text-lg" placeholder="Añadir observaciones técnicas..." value={obs} onChange={e => setObs(e.target.value)} />
        <IndustrialButton fullWidth onClick={requestSignature}>Certificar Mantenimiento</IndustrialButton>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end"><div><h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mi Panel</h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-3">Estado de Máquinas Bajo Control</p></div><ClipboardList className="w-12 h-12 text-orange-500 opacity-20" /></div>
      {myMachines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{myMachines.map(m => { const isDue = isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays)); return (<Card key={m.id} className={isDue ? 'border-red-500 shadow-red-100' : 'border-emerald-500 shadow-emerald-100'}><div className="flex justify-between mb-4"><div className={`p-3 rounded-2xl ${isDue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}><Wrench className="w-6 h-6" /></div>{isDue && <span className="text-[9px] font-black bg-red-600 text-white px-3 py-1 rounded-full animate-pulse uppercase tracking-widest">Atención Requerida</span>}</div><h3 className="text-2xl font-black text-slate-800 uppercase mb-4 leading-tight">{m.name}</h3><div className="space-y-2 mb-8"><p className="text-[10px] font-black text-slate-400 uppercase">Frecuencia: {m.intervalDays} días</p><p className="text-[10px] font-black text-slate-400 uppercase">ID Equipo: {m.id}</p></div><IndustrialButton fullWidth variant={isDue ? 'primary' : 'outline'} onClick={() => { setSelectedMachine(m); setChecklist(new Array(5).fill(false)); }}>Realizar Manto.</IndustrialButton></Card>); })}</div>
      ) : (<div className="bg-white p-16 rounded-[3rem] border-2 border-dashed border-orange-200 text-center shadow-inner"><div className="bg-orange-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-orange-600"><AlertTriangle className="w-10 h-10" /></div><p className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Sin Asignaciones</p><p className="text-slate-400 font-bold uppercase text-xs">No tiene máquinas a cargo.</p></div>)}
      {availableMachines.length > 0 && (<div className="space-y-6 pt-12 border-t border-slate-200"><h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3"><Plus className="text-orange-600" /> Equipos Libres</h3><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">{availableMachines.map(m => (<div key={m.id} onClick={() => updateMachineAssign(m.id, user.id)} className="bg-white p-6 rounded-3xl border border-slate-100 cursor-pointer hover:border-orange-500 hover:shadow-2xl transition-all flex flex-col justify-between items-start group"><div className="flex justify-between w-full mb-4"><div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:text-orange-600 transition-colors"><HardDrive className="w-5 h-5" /></div><UserPlus className="w-5 h-5 text-slate-200 group-hover:text-orange-400 transition-all" /></div><p className="font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">{m.name}</p><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ciclo: {m.intervalDays}d</p></div>))}</div></div>)}
    </div>
  );
};

const LeaderView: React.FC<{ user: User; machines: Machine[]; records: MaintenanceRecord[] }> = ({ user, machines, records }) => {
  const [closingIssue, setClosingIssue] = useState<MaintenanceRecord | null>(null);
  const [closingComment, setClosingComment] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(5).fill(false));
  const [mantoObs, setMantoObs] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);

  const issues = records.filter(r => r.isIssue);
  const myMachines = machines.filter(m => m.assignedTo === user.id);

  const handleCloseIssue = async () => { if(!closingComment) return alert("Debe ingresar comentario."); if(!closingIssue) return; await updateDoc(doc(db, "records", closingIssue.id), { isIssue: false, observations: closingIssue.observations + ` | SOLUCIÓN LÍDER: ${closingComment}` }); setClosingIssue(null); setClosingComment(''); alert("Incidencia cerrada."); };
  const finalizeLeaderManto = async (pin: string) => { if (pin !== user.pin) return alert("ERROR: PIN inválido."); if (!selectedMachine) return; try { await addDoc(collection(db, "records"), { machineId: selectedMachine.id, userId: user.id, date: new Date().toISOString(), observations: `MANTENIMIENTO PROFUNDO: ${mantoObs}`, type: MaintenanceType.HEAVY, isIssue: false }); await updateDoc(doc(db, "machines", selectedMachine.id), { lastMaintenance: new Date().toISOString() }); setSelectedMachine(null); setChecklist(new Array(5).fill(false)); setMantoObs(''); setShowPinModal(false); alert("Certificado por Liderazgo."); } catch(e) { console.error(e); } };

  if (selectedMachine) {
    return (
      <Card className="max-w-2xl mx-auto border-amber-600 shadow-amber-100/50 relative">
        <PinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} onConfirm={finalizeLeaderManto} title="Firma de Responsable Técnico" />
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-amber-700 mb-8 flex items-center gap-2 tracking-widest">← Cancelar Operación</button>
        <div className="mb-8"><h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{selectedMachine.name}</h2><p className="text-amber-600 font-bold uppercase text-[10px] tracking-widest mt-2">Protocolo Técnico Avanzado</p></div>
        <div className="space-y-4 mb-8">{["Desarme de Seguridad", "Lubricación de Ejes Principales", "Calibración de Sensores", "Prueba de Carga Máxima", "Limpieza Profunda de Motor"].map((t, i) => (<label key={i} className={`flex items-center gap-5 p-6 rounded-3xl border-2 cursor-pointer transition-all ${checklist[i] ? 'bg-amber-50 border-amber-600 shadow-inner' : 'bg-white border-slate-100 hover:border-slate-300'}`}><input type="checkbox" className="w-8 h-8 accent-amber-700 rounded-lg" checked={checklist[i]} onChange={() => { const c = [...checklist]; c[i] = !c[i]; setChecklist(c); }} /><span className="text-lg font-bold text-slate-700">{t}</span></label>))}</div>
        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] mb-8 h-32 outline-none focus:border-amber-600 font-medium text-lg" placeholder="Detalles técnicos..." value={mantoObs} onChange={e => setMantoObs(e.target.value)} />
        <IndustrialButton variant="secondary" fullWidth onClick={() => { if (!selectedMachine || checklist.some(c => !c)) return alert("Checklist incompleto."); setShowPinModal(true); }}>Firmar Mantenimiento Experto</IndustrialButton>
      </Card>
    );
  }

  return (
    <div className="space-y-16 relative">
      {closingIssue && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black uppercase text-slate-800">Cierre Técnico</h3><button onClick={() => setClosingIssue(null)}><X className="w-6 h-6 text-slate-400 hover:text-red-500" /></button></div><p className="text-sm font-bold text-slate-500 uppercase mb-4">Resolución de falla en: <span className="text-slate-900">{machines.find(m => m.id === closingIssue.machineId)?.name}</span></p><div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6"><p className="text-[10px] text-red-400 font-black uppercase mb-1">Reporte Original:</p><p className="text-red-800 italic font-medium">"{closingIssue.observations}"</p></div><textarea autoFocus className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl mb-6 outline-none focus:border-orange-500 font-medium" placeholder="Solución aplicada..." rows={4} value={closingComment} onChange={e => setClosingComment(e.target.value)} /><IndustrialButton fullWidth onClick={handleCloseIssue}>Confirmar Solución</IndustrialButton></Card></div>)}
      <div className="flex justify-between items-end"><div><h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Resp. Mantenimiento <span className="text-orange-600">Gral.</span></h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-3">Supervisión de Línea y Equipos Críticos</p></div><Wrench className="w-12 h-12 text-amber-600 opacity-20" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8"><h3 className="text-2xl font-black text-red-600 uppercase flex items-center gap-3"><AlertTriangle className="animate-pulse" /> Alertas de Campo</h3>{issues.length === 0 ? (<div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center"><CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-4" /><p className="text-slate-400 font-black uppercase text-xs">Sin incidencias</p></div>) : (issues.map(r => (<Card key={r.id} className="border-l-8 border-red-600 bg-red-50/20"><div className="flex justify-between items-start mb-4"><h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{machines.find(m => m.id === r.machineId)?.name}</h4><span className="text-[9px] font-black bg-red-600 text-white px-3 py-1 rounded-full uppercase">Falla Urgente</span></div><p className="text-slate-600 font-medium italic mb-6 leading-relaxed">"{r.observations}"</p><div className="flex justify-between items-center border-t border-red-100 pt-6"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reporte por Operario</p><button className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-tighter bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all" onClick={() => setClosingIssue(r)}>Resolver Incidencia</button></div></Card>)))}</div>
        <div className="space-y-8"><h3 className="text-2xl font-black text-amber-700 uppercase flex items-center gap-3"><HardDrive /> Mis Equipos Asignados</h3>{myMachines.length === 0 ? (<div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center"><p className="text-slate-400 font-black uppercase text-xs">Sin tareas pesadas a cargo</p></div>) : (myMachines.map(m => { const isDue = isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays)); return (<Card key={m.id} className={isDue ? 'border-red-500 shadow-red-50' : 'border-amber-600'}><div className="flex justify-between items-start mb-6"><h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">{m.name}</h4>{isDue && <span className="bg-red-600 text-white text-[9px] px-3 py-1 rounded-full animate-bounce uppercase font-black">Pendiente</span>}</div><div className="bg-slate-50 p-4 rounded-2xl mb-6"><p className="text-[10px] font-black text-slate-400 uppercase mb-1">Último Manto.</p><p className="font-bold text-slate-700">{format(parseISO(m.lastMaintenance), 'dd MMMM, yyyy')}</p></div><IndustrialButton variant="secondary" fullWidth onClick={() => { setSelectedMachine(m); setChecklist(new Array(5).fill(false)); }}>Iniciar Protocolo Experto</IndustrialButton></Card>); }))}</div>
      </div>
    </div>
  );
};

const ManagerView: React.FC<{ users: User[]; machines: Machine[]; records: MaintenanceRecord[] }> = ({ users, machines, records }) => {
  const [activePanel, setActivePanel] = useState<'STATS' | 'HISTORY' | 'MACHINES' | 'USERS'>('STATS');
  const [userForm, setUserForm] = useState({ name: '', phone: '', role: Role.OPERATOR, pin: '1234' });
  const [machineForm, setMachineForm] = useState({ name: '', interval: 15 });
  const [historyFilter, setHistoryFilter] = useState({ userId: 'ALL', dateFrom: '', dateTo: '', type: 'ALL' });

  const stats = useMemo(() => { const total = machines.length; const due = machines.filter(m => isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays))).length; return [{ name: 'Operativo', value: total - due, color: '#10b981' }, { name: 'Vencido', value: due, color: '#ef4444' }]; }, [machines]);
  const maintenanceTypeStats = useMemo(() => { const preventive = records.filter(r => !r.isIssue).length; const corrective = records.filter(r => r.isIssue).length; return [{ name: 'Preventivo', cantidad: preventive }, { name: 'Correctivo', cantidad: corrective }]; }, [records]);
  const ranking = useMemo(() => { const activeStaff = users.filter(u => u.role === Role.OPERATOR || u.role === Role.LEADER); return activeStaff.map(u => ({ ...u, score: records.filter(r => r.userId === u.id).length })).sort((a, b) => b.score - a.score).slice(0, 3); }, [users, records]);
  const filteredRecords = useMemo(() => { return records.filter(r => { const matchUser = historyFilter.userId === 'ALL' || r.userId === historyFilter.userId; let matchDate = true; if (historyFilter.dateFrom && historyFilter.dateTo) { matchDate = isWithinInterval(parseISO(r.date), { start: startOfDay(parseISO(historyFilter.dateFrom)), end: endOfDay(parseISO(historyFilter.dateTo)) }); } const matchType = historyFilter.type === 'ALL' ? true : historyFilter.type === 'ISSUE' ? r.isIssue : !r.isIssue; return matchUser && matchDate && matchType; }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); }, [records, historyFilter]);

  const addUser = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, "users"), { ...userForm }); setUserForm({ name: '', phone: '', role: Role.OPERATOR, pin: '1234' }); alert("Usuario creado en nube."); };
  const addMachine = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, "machines"), { name: machineForm.name, intervalDays: machineForm.interval, lastMaintenance: new Date().toISOString(), assignedTo: null }); setMachineForm({ name: '', interval: 15 }); alert("Máquina creada en nube."); }; // <--- CORREGIDO (assignedTo: null)
  const updateMachineOwner = async (machineId: string, val: string) => { await updateDoc(doc(db, "machines", machineId), { assignedTo: val === "none" ? null : val }); }; // <--- CORREGIDO
  const updateUserRole = async (userId: string, newRole: Role) => { await updateDoc(doc(db, "users", userId), { role: newRole }); };

  return (
    <div className="space-y-12">
      <div className="flex flex-col xl:flex-row justify-between items-center gap-8"><div><h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Control <span className="text-orange-600">Maestro</span></h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Gerencia Técnica • Dashboard Intelligence</p></div><div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-x-auto max-w-full">{[{ id: 'STATS', label: 'KPIs Globales', icon: BarChart3 }, { id: 'HISTORY', label: 'Auditoría', icon: History }, { id: 'MACHINES', label: 'Activos', icon: HardDrive }, { id: 'USERS', label: 'Personal', icon: Users }].map(tab => (<button key={tab.id} onClick={() => setActivePanel(tab.id as any)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all tracking-widest flex items-center gap-2 whitespace-nowrap ${activePanel === tab.id ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-400 hover:text-orange-500'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>))}</div></div>
      {activePanel === 'STATS' && (<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"><div className="grid grid-cols-1 lg:grid-cols-3 gap-8"><Card className="lg:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-slate-400/50 relative overflow-hidden"><div className="absolute top-0 right-0 p-8 opacity-10"><Trophy className="w-48 h-48" /></div><h3 className="text-xl font-black uppercase mb-8 flex items-center gap-3 relative z-10"><Trophy className="text-yellow-400" /> Top Performance</h3><div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end relative z-10">{ranking.map((u, index) => { const styles = ["bg-yellow-400 text-yellow-900 border-yellow-300 h-48", "bg-slate-300 text-slate-900 border-slate-200 h-40", "bg-orange-400 text-orange-900 border-orange-300 h-32"]; return (<div key={u.id} className={`${styles[index]} p-5 rounded-3xl flex flex-col justify-between border-t-4 shadow-xl transform hover:-translate-y-2 transition-transform`}><div className="text-right font-black text-4xl opacity-50">#{index + 1}</div><div><p className="text-4xl font-black mb-1">{u.score}</p><p className="font-bold uppercase text-xs leading-tight truncate">{u.name}</p><p className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-1">{u.role === Role.LEADER ? 'Líder' : 'Operario'}</p></div></div>); })}</div></Card><Card className="flex flex-col items-center justify-center"><h3 className="text-lg font-black uppercase text-slate-700 w-full text-center mb-4">Salud del Parque</h3><div className="h-[200px] w-full"><ResponsiveContainer><PieChart><Pie data={stats} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{stats.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}</Pie><Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} /><Legend verticalAlign="bottom" /></PieChart></ResponsiveContainer></div></Card></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-8"><Card><h3 className="text-xl font-black uppercase text-slate-700 border-b pb-6 mb-8 flex items-center gap-3"><BarChart3 className="text-orange-600" /> Plan vs. Incidencias</h3><div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={maintenanceTypeStats}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} /><YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} /><Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} /><Bar dataKey="cantidad" fill="#f97316" radius={[10, 10, 0, 0]} barSize={60} /></BarChart></ResponsiveContainer></div></Card><Card><h3 className="text-xl font-black uppercase text-slate-700 border-b pb-6 mb-8 flex items-center gap-3"><Users className="text-orange-600" /> Productividad Mensual</h3><div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">{users.filter(u => u.role === Role.OPERATOR || u.role === Role.LEADER).map(u => { const count = records.filter(r => r.userId === u.id && isSameMonth(parseISO(r.date), startOfMonth(new Date()))).length; return (<div key={u.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-orange-300 transition-colors"><div><span className="font-black text-slate-800 uppercase text-xs tracking-tight block">{u.name}</span><span className={`text-[9px] font-bold uppercase ${u.role === Role.LEADER ? 'text-amber-600' : 'text-slate-400'}`}>{u.role === Role.LEADER ? 'Resp. Mantenimiento' : 'Operario Línea'}</span></div><div className="flex items-center gap-3"><span className="bg-white shadow-sm px-3 py-1 rounded-lg text-[10px] font-black uppercase text-orange-600 border border-orange-100">{count} Tareas</span><MessageSquare className="w-5 h-5 text-emerald-500 cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(`https://wa.me/${u.phone}`)} /></div></div>); })}</div></Card></div></div>)}
      {activePanel === 'HISTORY' && (<div className="space-y-8 animate-in fade-in zoom-in duration-300"><Card className="bg-slate-900 text-white border-none shadow-2xl shadow-slate-400/20"><div className="flex flex-col md:flex-row gap-6 items-end"><div className="w-full md:w-1/4 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 flex gap-2"><Calendar className="w-3 h-3"/> Desde</label><input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 text-white" value={historyFilter.dateFrom} onChange={e => setHistoryFilter({...historyFilter, dateFrom: e.target.value})} /></div><div className="w-full md:w-1/4 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 flex gap-2"><Calendar className="w-3 h-3"/> Hasta</label><input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 text-white" value={historyFilter.dateTo} onChange={e => setHistoryFilter({...historyFilter, dateTo: e.target.value})} /></div><div className="w-full md:w-1/4 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 flex gap-2"><UserCog className="w-3 h-3"/> Empleado</label><select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 text-white cursor-pointer appearance-none" value={historyFilter.userId} onChange={e => setHistoryFilter({...historyFilter, userId: e.target.value})}><option value="ALL">Todos los Usuarios</option>{users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div><div className="w-full md:w-1/4 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 flex gap-2"><Filter className="w-3 h-3"/> Tipo Registro</label><select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 text-white cursor-pointer appearance-none" value={historyFilter.type} onChange={e => setHistoryFilter({...historyFilter, type: e.target.value})}><option value="ALL">Todo</option><option value="MANTO">Mantenimientos</option><option value="ISSUE">Fallas</option></select></div></div></Card><Card className="p-0 overflow-hidden border-orange-100"><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead className="bg-orange-50 text-orange-900 text-[10px] font-black uppercase tracking-widest"><tr><th className="p-6">Fecha</th><th className="p-6">Máquina</th><th className="p-6">Responsable</th><th className="p-6">Detalle</th><th className="p-6 text-center">Tipo</th></tr></thead><tbody className="text-xs font-medium text-slate-600">{filteredRecords.length > 0 ? filteredRecords.map(r => { const user = users.find(u => u.id === r.userId); const machine = machines.find(m => m.id === r.machineId); return (<tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors group"><td className="p-6 font-bold whitespace-nowrap text-slate-400 group-hover:text-orange-600 transition-colors">{format(parseISO(r.date), 'dd/MM/yyyy HH:mm')}</td><td className="p-6 uppercase font-black text-slate-800">{machine?.name || 'Máquina Eliminada'}</td><td className="p-6"><div className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">{user?.name.charAt(0)}</span><span className="font-bold">{user?.name}</span></div></td><td className="p-6 italic max-w-xs truncate" title={r.observations}>{r.observations || <span className="text-slate-300">-</span>}</td><td className="p-6 text-center">{r.isIssue ? <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">Falla</span> : <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">OK</span>}</td></tr>); }) : <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-bold uppercase text-sm">Sin registros</td></tr>}</tbody></table></div></Card></div>)}
      {activePanel === 'MACHINES' && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in duration-300"><Card className="lg:col-span-1 border-orange-200 bg-orange-50/10"><form onSubmit={addMachine} className="space-y-6"><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3"><Plus className="text-orange-600" /> Registro de Activo</h3><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre Técnico</label><input required className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner" placeholder="Prensa Hidráulica X-10" value={machineForm.name} onChange={e => setMachineForm({...machineForm, name: e.target.value})} /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Ciclo de Servicio (Días)</label><input type="number" required className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner" placeholder="15" value={machineForm.interval} onChange={e => setMachineForm({...machineForm, interval: parseInt(e.target.value)})} /></div><IndustrialButton fullWidth type="submit">Dar de Alta Activo</IndustrialButton></form></Card><div className="lg:col-span-2"><Card className="p-0 overflow-hidden"><table className="w-full text-left border-collapse"><thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest"><tr><th className="p-6">Nombre de Máquina</th><th className="p-6 text-center">Frecuencia</th><th className="p-6">Operario Asignado</th></tr></thead><tbody className="text-xs font-bold text-slate-600">{machines.map(m => (<tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors"><td className="p-6 text-slate-900 uppercase font-black tracking-tight">{m.name}</td><td className="p-6 text-center">{m.intervalDays || m.interval || 0} días</td><td className="p-6"><select className="bg-white border-2 border-slate-100 p-3 rounded-xl text-[10px] font-black uppercase outline-none focus:border-orange-500 cursor-pointer" value={m.assignedTo || 'none'} onChange={e => updateMachineOwner(m.id, e.target.value)}><option value="none">-- Disponible --</option>{users.map(u => (<option key={u.id} value={u.id}>{u.name} ({(u.role ? u.role.substring(0,3) : 'N/A')})</option>))}</select></td></tr>))}</tbody></table></Card></div></div>)}
      {activePanel === 'USERS' && (<div className="grid grid-cols-1 lg:grid-cols-3 gap-12 animate-in fade-in duration-300"><Card className="lg:col-span-1 border-orange-200 bg-orange-50/10"><form onSubmit={addUser} className="space-y-6"><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3"><UserPlus className="text-orange-600" /> Nuevo Colaborador</h3><input required className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner" placeholder="Nombre y Apellido" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} /><input className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner" placeholder="Teléfono" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} /><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Asignar PIN de Seguridad</label><input type="password" maxLength={4} className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner tracking-widest" placeholder="PIN" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value.replace(/[^0-9]/g, '')})} /></div><select className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 cursor-pointer shadow-inner" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}><option value={Role.OPERATOR}>OPERARIO DE LÍNEA</option><option value={Role.LEADER}>RESP. MANTENIMIENTO GRAL.</option><option value={Role.MANAGER}>GERENCIA Y AUDITORÍA</option></select><IndustrialButton fullWidth type="submit">Alta de Usuario</IndustrialButton></form></Card><div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">{users.map(u => (<Card key={u.id} className="flex justify-between items-center group border-slate-200 hover:border-orange-400 transition-all"><div className="flex items-center gap-5"><div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors"><UserCog className="w-6 h-6" /></div><div><h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">{u.name}</h4><span className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none">{u.role === Role.LEADER ? 'RESP. MANTO.' : u.role}</span></div></div><div className="flex flex-col gap-2 text-right"><span className="text-[9px] font-bold text-slate-400 uppercase">PIN: ****</span><select className="bg-white border border-slate-100 p-2 rounded-xl text-[9px] font-black uppercase outline-none focus:border-orange-500" value={u.role} onChange={e => updateUserRole(u.id, e.target.value as Role)}><option value={Role.OPERATOR}>OPERARIO</option><option value={Role.LEADER}>RESP. MANTO.</option><option value={Role.MANAGER}>GERENCIA</option></select></div></Card>))}</div></div>)}
    </div>
  );
};
