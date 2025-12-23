import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Settings, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  LogOut, 
  MessageSquare, 
  ClipboardList,
  Database,
  Plus,
  UserPlus,
  History,
  HardDrive,
  UserCog,
  LayoutDashboard,
  X // Agregamos icono de cerrar para los modales
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  format, 
  addDays, 
  isPast, 
  parseISO, 
  startOfMonth, 
  isSameMonth 
} from 'date-fns';
import { Role, User, Machine, MaintenanceRecord, MaintenanceType } from './types';

// --- DATABASE SIMULATION ---
const STORAGE_KEYS = {
  USERS: 'tpm_users',
  MACHINES: 'tpm_machines',
  RECORDS: 'tpm_records',
  AUTH: 'tpm_auth_user'
};

const getDB = <T,>(key: string, initial: T): T => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : initial;
};

const setDB = (key: string, data: any) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// --- REUSABLE UI COMPONENTS ---

const IndustrialButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  className?: string;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
}> = ({ children, onClick, variant = 'primary', className = '', fullWidth = false, type = "button" }) => {
  const baseStyles = "px-6 py-4 font-extrabold text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 rounded-2xl shadow-md disabled:opacity-50";
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-100",
    secondary: "bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white shadow-amber-200",
    danger: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-200",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200",
    outline: "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-orange-400"
  };

  return (
    <button type={type} onClick={onClick} className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 p-8 border border-slate-100 ${className}`}>
    {children}
  </div>
);

// --- MAIN APPLICATION ---

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD'>('LOGIN');

  useEffect(() => {
    setUsers(getDB(STORAGE_KEYS.USERS, []));
    setMachines(getDB(STORAGE_KEYS.MACHINES, []));
    setRecords(getDB(STORAGE_KEYS.RECORDS, []));
    const savedUser = localStorage.getItem(STORAGE_KEYS.AUTH);
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setView('DASHBOARD');
    }
  }, []);

  const persistMachines = (newMachines: Machine[]) => {
    setMachines(newMachines);
    setDB(STORAGE_KEYS.MACHINES, newMachines);
  };

  const persistUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    setDB(STORAGE_KEYS.USERS, newUsers);
  };

  const seedDB = () => {
    const initialUsers: User[] = [
      { id: 'u1', name: 'Juan Operario', role: Role.OPERATOR, phone: '5491112345678' },
      { id: 'u2', name: 'Pedro Líder', role: Role.LEADER, phone: '5491112345678' },
      { id: 'u3', name: 'Ana Gerente', role: Role.MANAGER },
    ];
    const initialMachines: Machine[] = [
      { id: 'm1', name: 'Inyectora Plástico I-01', assignedTo: 'u1', lastMaintenance: new Date(Date.now() - 20 * 86400000).toISOString(), intervalDays: 15 },
      { id: 'm2', name: 'Brazo Robótico R-4', assignedTo: undefined, lastMaintenance: new Date(Date.now() - 2 * 86400000).toISOString(), intervalDays: 15 },
      { id: 'm3', name: 'Compresor Central C-80', assignedTo: 'u2', lastMaintenance: new Date(Date.now() - 40 * 86400000).toISOString(), intervalDays: 30 },
    ];
    persistUsers(initialUsers);
    persistMachines(initialMachines);
    setRecords([]);
    setDB(STORAGE_KEYS.RECORDS, []);
    alert("Sistema Reiniciado Correctamente.");
  };

  const handleLogin = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(user));
      setView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH);
    setView('LOGIN');
  };

  // Helper para mostrar nombres bonitos de roles
  const getRoleDisplayName = (role?: Role) => {
    if (role === Role.LEADER) return "RESP. MANTENIMIENTO GRAL.";
    if (role === Role.MANAGER) return "GERENCIA DE PLANTA";
    return "OPERARIO DE LÍNEA";
  };

  if (view === 'LOGIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <div className="w-full max-w-md space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-block p-5 bg-orange-100 rounded-[2rem] text-orange-600 shadow-lg shadow-orange-100">
              <Settings className="w-16 h-16 animate-spin-slow" />
            </div>
            <h1 className="text-6xl font-black uppercase tracking-tighter text-slate-900 leading-none">TPM <span className="text-orange-600 underline decoration-amber-500">PRO</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Portal de Acceso Industrial</p>
          </div>
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-50 space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Personal Identificado</label>
              <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-lg font-bold outline-none appearance-none cursor-pointer focus:border-orange-500 transition-all" onChange={(e) => handleLogin(e.target.value)} value="">
                <option value="" disabled>-- Seleccione su Identidad --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} | {getRoleDisplayName(u.role)}</option>)}
              </select>
            </div>
            {users.length === 0 && <IndustrialButton fullWidth variant="secondary" onClick={seedDB}>Inicializar Planta</IndustrialButton>}
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
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">TPM <span className="text-orange-600">PRO</span></h1>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Status: Operativo</p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-900 uppercase leading-none">{currentUser?.name}</p>
            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase mt-2 inline-block tracking-tighter">
              {getRoleDisplayName(currentUser?.role)}
            </span>
          </div>
          <button onClick={handleLogout} className="p-4 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><LogOut className="w-6 h-6" /></button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {currentUser?.role === Role.OPERATOR && <OperatorView user={currentUser} machines={machines} setMachines={persistMachines} setRecords={(r: any) => { setRecords(r); setDB(STORAGE_KEYS.RECORDS, r); }} records={records} />}
        {currentUser?.role === Role.LEADER && <LeaderView user={currentUser} machines={machines} setMachines={persistMachines} setRecords={(r: any) => { setRecords(r); setDB(STORAGE_KEYS.RECORDS, r); }} records={records} />}
        {currentUser?.role === Role.MANAGER && <ManagerView users={users} setUsers={persistUsers} machines={machines} setMachines={persistMachines} records={records} seedDB={seedDB} />}
      </main>
    </div>
  );
}

// --- OPERATOR VIEW ---
const OperatorView: React.FC<{ user: User; machines: Machine[]; setMachines: any; setRecords: any; records: MaintenanceRecord[] }> = ({ user, machines, setMachines, setRecords, records }) => {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(5).fill(false));
  const [obs, setObs] = useState('');
  const [isCritical, setIsCritical] = useState(false);

  const myMachines = machines.filter(m => m.assignedTo === user.id);
  const availableMachines = machines.filter(m => !m.assignedTo);

  const submitManto = () => {
    if (!selectedMachine || checklist.some(c => !c)) return alert("Debe tildar todos los puntos de seguridad.");
    const newRecord: MaintenanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      machineId: selectedMachine.id,
      userId: user.id,
      date: new Date().toISOString(),
      observations: obs,
      type: MaintenanceType.LIGHT,
      isIssue: isCritical
    };
    const updatedMachines = machines.map(m => m.id === selectedMachine.id ? { ...m, lastMaintenance: new Date().toISOString() } : m);
    setMachines(updatedMachines);
    setRecords([...records, newRecord]);
    setSelectedMachine(null);
    setIsCritical(false);
    setObs('');
    alert("Tarea registrada correctamente.");
  };

  if (selectedMachine) {
    return (
      <Card className="max-w-2xl mx-auto border-orange-200 shadow-orange-100">
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-orange-600 mb-8 flex items-center gap-2 tracking-widest">← Volver a Mis Equipos</button>
        <div className="mb-8">
          <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{selectedMachine.name}</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-2">Protocolo de Mantenimiento Autónomo</p>
        </div>
        <div className="space-y-4 mb-8">
          {["Verificación de Niveles", "Limpieza de Zona", "Detección de Vibración", "Chequeo de Sensores", "Seguridad Activa"].map((t, i) => (
            <label key={i} className={`flex items-center gap-5 p-6 rounded-3xl border-2 cursor-pointer transition-all ${checklist[i] ? 'bg-orange-50 border-orange-500 shadow-inner' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
              <input type="checkbox" className="w-8 h-8 accent-orange-600 rounded-lg" checked={checklist[i]} onChange={() => { const c = [...checklist]; c[i] = !c[i]; setChecklist(c); }} />
              <span className="text-lg font-bold text-slate-700">{t}</span>
            </label>
          ))}
        </div>
        
        <div className={`p-6 rounded-3xl border-2 mb-8 flex items-center gap-5 transition-colors ${isCritical ? 'bg-red-600 border-red-700 text-white' : 'bg-red-50 border-red-100 text-red-600'}`}>
          <input type="checkbox" className="w-8 h-8 accent-white" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} id="critical" />
          <label htmlFor="critical" className="font-black uppercase text-sm cursor-pointer select-none">⚠️ Reportar Avería Crítica (Alerta a Líder)</label>
        </div>

        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] mb-8 h-32 outline-none focus:border-orange-500 font-medium text-lg" placeholder="Añadir observaciones técnicas..." value={obs} onChange={e => setObs(e.target.value)} />
        <IndustrialButton fullWidth onClick={submitManto}>Certificar Mantenimiento</IndustrialButton>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mi Panel</h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-3">Estado de Máquinas Bajo Control</p>
        </div>
        <ClipboardList className="w-12 h-12 text-orange-500 opacity-20" />
      </div>

      {myMachines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {myMachines.map(m => {
            const isDue = isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays));
            return (
              <Card key={m.id} className={isDue ? 'border-red-500 shadow-red-100' : 'border-emerald-500 shadow-emerald-100'}>
                <div className="flex justify-between mb-4">
                   <div className={`p-3 rounded-2xl ${isDue ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}><Wrench className="w-6 h-6" /></div>
                   {isDue && <span className="text-[9px] font-black bg-red-600 text-white px-3 py-1 rounded-full animate-pulse uppercase tracking-widest">Atención Requerida</span>}
                </div>
                <h3 className="text-2xl font-black text-slate-800 uppercase mb-4 leading-tight">{m.name}</h3>
                <div className="space-y-2 mb-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Frecuencia: {m.intervalDays} días</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase">ID Equipo: {m.id}</p>
                </div>
                <IndustrialButton fullWidth variant={isDue ? 'primary' : 'outline'} onClick={() => { setSelectedMachine(m); setChecklist(new Array(5).fill(false)); }}>Realizar Manto.</IndustrialButton>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-16 rounded-[3rem] border-2 border-dashed border-orange-200 text-center shadow-inner">
          <div className="bg-orange-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-orange-600"><AlertTriangle className="w-10 h-10" /></div>
          <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-2">Sin Asignaciones de Ruta</p>
          <p className="text-slate-400 font-bold uppercase text-xs">Usted no tiene máquinas a cargo. Seleccione una de las disponibles debajo.</p>
        </div>
      )}

      {availableMachines.length > 0 && (
        <div className="space-y-6 pt-12 border-t border-slate-200">
          <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3"><Plus className="text-orange-600" /> Equipos Libres en Planta</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {availableMachines.map(m => (
              <div key={m.id} onClick={() => setMachines(machines.map(mac => mac.id === m.id ? {...mac, assignedTo: user.id} : mac))} className="bg-white p-6 rounded-3xl border border-slate-100 cursor-pointer hover:border-orange-500 hover:shadow-2xl transition-all flex flex-col justify-between items-start group">
                <div className="flex justify-between w-full mb-4">
                  <div className="bg-slate-50 p-2 rounded-xl text-slate-400 group-hover:text-orange-600 transition-colors"><HardDrive className="w-5 h-5" /></div>
                  <UserPlus className="w-5 h-5 text-slate-200 group-hover:text-orange-400 transition-all" />
                </div>
                <p className="font-black text-slate-800 uppercase tracking-tighter leading-none mb-2">{m.name}</p>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ciclo: {m.intervalDays}d</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- LEADER VIEW (MODIFICADA) ---
const LeaderView: React.FC<{ user: User; machines: Machine[]; setMachines: any; setRecords: any; records: MaintenanceRecord[] }> = ({ user, machines, setMachines, setRecords, records }) => {
  const [closingIssue, setClosingIssue] = useState<MaintenanceRecord | null>(null);
  const [closingComment, setClosingComment] = useState('');
  
  // Estado para mantenimiento del Líder
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(5).fill(false));
  const [mantoObs, setMantoObs] = useState('');

  const issues = records.filter(r => r.isIssue);
  const myMachines = machines.filter(m => m.assignedTo === user.id);

  // --- LOGICA CIERRE DE ALERTA ---
  const handleCloseIssue = () => {
    if(!closingComment) return alert("Debe ingresar un comentario técnico sobre la solución.");
    const updatedRecords = records.map(r => 
      r.id === closingIssue?.id 
      ? { ...r, isIssue: false, observations: r.observations + ` | SOLUCIÓN LÍDER: ${closingComment}` } 
      : r
    );
    setRecords(updatedRecords);
    setClosingIssue(null);
    setClosingComment('');
    alert("Incidencia cerrada y archivada.");
  };

  // --- LOGICA MANTENIMIENTO LIDER ---
  const submitLeaderManto = () => {
    if (!selectedMachine || checklist.some(c => !c)) return alert("Debe completar todo el checklist de seguridad avanzada.");
    
    // Guardamos el registro
    const newRecord: MaintenanceRecord = {
      id: Math.random().toString(36).substr(2, 9),
      machineId: selectedMachine.id,
      userId: user.id,
      date: new Date().toISOString(),
      observations: `MANTENIMIENTO PROFUNDO: ${mantoObs}`,
      type: MaintenanceType.HEAVY, // Asumimos que el líder hace mantos pesados
      isIssue: false
    };

    // Actualizamos la fecha de la máquina
    const updatedMachines = machines.map(m => m.id === selectedMachine.id ? { ...m, lastMaintenance: new Date().toISOString() } : m);
    
    setMachines(updatedMachines);
    setRecords([...records, newRecord]);
    
    // Reset
    setSelectedMachine(null);
    setChecklist(new Array(5).fill(false));
    setMantoObs('');
    alert("Mantenimiento Especializado Registrado.");
  };

  // --- VISTA FORMULARIO DE MANTENIMIENTO (LIDER) ---
  if (selectedMachine) {
    return (
      <Card className="max-w-2xl mx-auto border-amber-600 shadow-amber-100/50">
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-amber-700 mb-8 flex items-center gap-2 tracking-widest">← Cancelar Operación</button>
        <div className="mb-8">
          <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">{selectedMachine.name}</h2>
          <p className="text-amber-600 font-bold uppercase text-[10px] tracking-widest mt-2">Protocolo Técnico Avanzado (Nivel Líder)</p>
        </div>
        
        <div className="space-y-4 mb-8">
          {["Desarme de Seguridad", "Lubricación de Ejes Principales", "Calibración de Sensores", "Prueba de Carga Máxima", "Limpieza Profunda de Motor"].map((t, i) => (
            <label key={i} className={`flex items-center gap-5 p-6 rounded-3xl border-2 cursor-pointer transition-all ${checklist[i] ? 'bg-amber-50 border-amber-600 shadow-inner' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
              <input type="checkbox" className="w-8 h-8 accent-amber-700 rounded-lg" checked={checklist[i]} onChange={() => { const c = [...checklist]; c[i] = !c[i]; setChecklist(c); }} />
              <span className="text-lg font-bold text-slate-700">{t}</span>
            </label>
          ))}
        </div>

        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] mb-8 h-32 outline-none focus:border-amber-600 font-medium text-lg" placeholder="Detalles técnicos del ajuste..." value={mantoObs} onChange={e => setMantoObs(e.target.value)} />
        <IndustrialButton variant="secondary" fullWidth onClick={submitLeaderManto}>Firmar Mantenimiento Experto</IndustrialButton>
      </Card>
    );
  }

  return (
    <div className="space-y-16 relative">
      {/* MODAL DE CIERRE DE INCIDENCIA */}
      {closingIssue && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black uppercase text-slate-800">Cierre Técnico</h3>
              <button onClick={() => setClosingIssue(null)}><X className="w-6 h-6 text-slate-400 hover:text-red-500" /></button>
            </div>
            <p className="text-sm font-bold text-slate-500 uppercase mb-4">Resolución de falla en: <span className="text-slate-900">{machines.find(m => m.id === closingIssue.machineId)?.name}</span></p>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6">
              <p className="text-[10px] text-red-400 font-black uppercase mb-1">Reporte Original:</p>
              <p className="text-red-800 italic font-medium">"{closingIssue.observations}"</p>
            </div>
            <textarea 
              autoFocus
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl mb-6 outline-none focus:border-orange-500 font-medium"
              placeholder="Describa la solución aplicada..."
              rows={4}
              value={closingComment}
              onChange={e => setClosingComment(e.target.value)}
            />
            <IndustrialButton fullWidth onClick={handleCloseIssue}>Confirmar Solución</IndustrialButton>
          </Card>
        </div>
      )}

      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Resp. Mantenimiento <span className="text-orange-600">Gral.</span></h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-3">Supervisión de Línea y Equipos Críticos</p>
        </div>
        <Wrench className="w-12 h-12 text-amber-600 opacity-20" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* FALLAS REPORTADAS */}
        <div className="space-y-8">
          <h3 className="text-2xl font-black text-red-600 uppercase flex items-center gap-3"><AlertTriangle className="animate-pulse" /> Alertas de Campo</h3>
          {issues.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
              <p className="text-slate-400 font-black uppercase text-xs">Planta sin incidencias críticas</p>
            </div>
          ) : (
            issues.map(r => (
              <Card key={r.id} className="border-l-8 border-red-600 bg-red-50/20">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{machines.find(m => m.id === r.machineId)?.name}</h4>
                  <span className="text-[9px] font-black bg-red-600 text-white px-3 py-1 rounded-full uppercase">Falla Urgente</span>
                </div>
                <p className="text-slate-600 font-medium italic mb-6 leading-relaxed">"{r.observations}"</p>
                <div className="flex justify-between items-center border-t border-red-100 pt-6">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reporte por Operario</p>
                  <button className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-tighter bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all" onClick={() => setClosingIssue(r)}>Resolver Incidencia</button>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* MIS EQUIPOS PESADOS */}
        <div className="space-y-8">
          <h3 className="text-2xl font-black text-amber-700 uppercase flex items-center gap-3"><HardDrive /> Mis Equipos Asignados</h3>
          {myMachines.length === 0 ? (
            <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center">
              <p className="text-slate-400 font-black uppercase text-xs">Sin tareas pesadas a cargo</p>
            </div>
          ) : (
            myMachines.map(m => {
              const isDue = isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays));
              return (
                <Card key={m.id} className={isDue ? 'border-red-500 shadow-red-50' : 'border-amber-600'}>
                  <div className="flex justify-between items-start mb-6">
                    <h4 className="text-2xl font-black text-slate-800 uppercase tracking-tight leading-none">{m.name}</h4>
                    {isDue && <span className="bg-red-600 text-white text-[9px] px-3 py-1 rounded-full animate-bounce uppercase font-black">Pendiente</span>}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl mb-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Último Manto.</p>
                      <p className="font-bold text-slate-700">{format(parseISO(m.lastMaintenance), 'dd MMMM, yyyy')}</p>
                  </div>
                  <IndustrialButton variant="secondary" fullWidth onClick={() => { setSelectedMachine(m); setChecklist(new Array(5).fill(false)); }}>Iniciar Protocolo Experto</IndustrialButton>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

// --- MANAGER VIEW ---
const ManagerView: React.FC<{ users: User[]; setUsers: any; machines: Machine[]; setMachines: any; records: MaintenanceRecord[]; seedDB: () => void }> = ({ users, setUsers, machines, setMachines, records, seedDB }) => {
  const [activePanel, setActivePanel] = useState<'STATS' | 'MACHINES' | 'USERS'>('STATS');
  const [userForm, setUserForm] = useState({ name: '', phone: '', role: Role.OPERATOR });
  const [machineForm, setMachineForm] = useState({ name: '', interval: 15 });

  const stats = useMemo(() => {
    const total = machines.length;
    const due = machines.filter(m => isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays))).length;
    return [{ name: 'Al Día', value: total - due, color: '#10b981' }, { name: 'Vencidas', value: due, color: '#f97316' }];
  }, [machines]);

  const addUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = { id: 'u' + (users.length + 1), ...userForm };
    setUsers([...users, newUser]);
    setUserForm({ name: '', phone: '', role: Role.OPERATOR });
    alert("Colaborador Registrado.");
  };

  const addMachine = (e: React.FormEvent) => {
    e.preventDefault();
    const mac: Machine = { id: 'm' + (machines.length + 1), name: machineForm.name, intervalDays: machineForm.interval, lastMaintenance: new Date().toISOString(), assignedTo: undefined };
    setMachines([...machines, mac]);
    setMachineForm({ name: '', interval: 15 });
    alert("Activo Registrado.");
  };

  const updateRole = (uId: string, newRole: Role) => {
    setUsers(users.map(u => u.id === uId ? { ...u, role: newRole } : u));
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-center gap-8">
        <div>
          <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Control <span className="text-orange-600">Maestro</span></h2>
          <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">Gerencia Técnica • Supervisión Total</p>
        </div>
        <div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
          <button className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all tracking-widest ${activePanel === 'STATS' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-400'}`} onClick={() => setActivePanel('STATS')}>KPIs</button>
          <button className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all tracking-widest ${activePanel === 'MACHINES' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-400'}`} onClick={() => setActivePanel('MACHINES')}>Activos</button>
          <button className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all tracking-widest ${activePanel === 'USERS' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-400'}`} onClick={() => setActivePanel('USERS')}>Personal</button>
        </div>
      </div>

      {activePanel === 'STATS' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Card className="flex flex-col items-center">
            <h3 className="text-xl font-black uppercase text-slate-700 w-full border-b pb-6 mb-8 flex items-center gap-3"><LayoutDashboard className="text-orange-600" /> Rendimiento Planta</h3>
            <div className="h-[300px] w-full"><ResponsiveContainer><PieChart><Pie data={stats} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value">{stats.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}</Pie><Tooltip /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer></div>
            <div className="w-full mt-10 space-y-4">
              <IndustrialButton variant="outline" fullWidth onClick={seedDB}><Database className="w-4 h-4" /> Restaurar Base de Datos</IndustrialButton>
            </div>
          </Card>
          <Card>
            <h3 className="text-xl font-black uppercase text-slate-700 border-b pb-6 mb-8 flex items-center gap-3"><Users className="text-orange-600" /> Productividad de Operarios</h3>
            <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
              {users.filter(u => u.role === Role.OPERATOR).map(u => {
                const count = records.filter(r => r.userId === u.id && isSameMonth(parseISO(r.date), startOfMonth(new Date()))).length;
                return (
                  <div key={u.id} className="flex justify-between items-center p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:border-orange-300 transition-colors">
                    <span className="font-black text-slate-800 uppercase text-sm tracking-tight">{u.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="bg-white shadow-sm px-4 py-2 rounded-xl text-[10px] font-black uppercase text-emerald-600 border border-emerald-100">{count} Tareas/Mes</span>
                      <MessageSquare className="w-6 h-6 text-emerald-500 cursor-pointer hover:scale-110 transition-transform" onClick={() => window.open(`https://wa.me/${u.phone}`)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {activePanel === 'MACHINES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <Card className="lg:col-span-1 border-orange-200 bg-orange-50/10">
            <form onSubmit={addMachine} className="space-y-6">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3"><Plus className="text-orange-600" /> Registro de Activo</h3>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Nombre Técnico</label>
                 <input required className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner" placeholder="Prensa Hidráulica X-10" value={machineForm.name} onChange={e => setMachineForm({...machineForm, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Ciclo de Servicio (Días)</label>
                 <input type="number" required className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner" placeholder="15" value={machineForm.interval} onChange={e => setMachineForm({...machineForm, interval: parseInt(e.target.value)})} />
              </div>
              <IndustrialButton fullWidth type="submit">Dar de Alta Activo</IndustrialButton>
            </form>
          </Card>
          <div className="lg:col-span-2">
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest">
                  <tr><th className="p-6">Nombre de Máquina</th><th className="p-6 text-center">Frecuencia</th><th className="p-6">Operario Asignado</th></tr>
                </thead>
                <tbody className="text-xs font-bold text-slate-600">
                  {machines.map(m => (
                    <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-6 text-slate-900 uppercase font-black tracking-tight">{m.name}</td>
                      <td className="p-6 text-center">{m.intervalDays} días</td>
                      <td className="p-6">
                        <select className="bg-white border-2 border-slate-100 p-3 rounded-xl text-[10px] font-black uppercase outline-none focus:border-orange-500 cursor-pointer" value={m.assignedTo || 'none'} onChange={e => setMachines(machines.map(mac => mac.id === m.id ? {...mac, assignedTo: e.target.value === "none" ? undefined : e.target.value} : mac))}>
                          <option value="none">-- Disponible --</option>
                          {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role.substring(0,3)})</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        </div>
      )}

      {activePanel === 'USERS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <Card className="lg:col-span-1 border-orange-200 bg-orange-50/10">
            <form onSubmit={addUser} className="space-y-6">
              <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3"><UserPlus className="text-orange-600" /> Nuevo Colaborador</h3>
              <input required className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner" placeholder="Nombre y Apellido" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} />
              <input className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 transition-all shadow-inner" placeholder="Teléfono (Ej: 549...)" value={userForm.phone} onChange={e => setUserForm({...userForm, phone: e.target.value})} />
              <select className="w-full p-5 rounded-2xl border-2 border-slate-100 font-bold outline-none focus:border-orange-500 cursor-pointer shadow-inner" value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as Role})}>
                <option value={Role.OPERATOR}>OPERARIO DE LÍNEA</option>
                <option value={Role.LEADER}>RESP. MANTENIMIENTO GRAL.</option>
                <option value={Role.MANAGER}>GERENCIA Y AUDITORÍA</option>
              </select>
              <IndustrialButton fullWidth type="submit">Alta de Usuario</IndustrialButton>
            </form>
          </Card>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            {users.map(u => (
              <Card key={u.id} className="flex justify-between items-center group border-slate-200 hover:border-orange-400 transition-all">
                <div className="flex items-center gap-5">
                  <div className="bg-slate-50 p-4 rounded-2xl group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors"><UserCog className="w-6 h-6" /></div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase text-sm tracking-tight">{u.name}</h4>
                    <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest leading-none">{u.role === Role.LEADER ? 'RESP. MANTO.' : u.role}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <select className="bg-white border border-slate-100 p-2 rounded-xl text-[9px] font-black uppercase outline-none focus:border-orange-500" value={u.role} onChange={e => updateRole(u.id, e.target.value as Role)}>
                    <option value={Role.OPERATOR}>OPERARIO</option>
                    <option value={Role.LEADER}>RESP. MANTO.</option>
                    <option value={Role.MANAGER}>GERENCIA</option>
                  </select>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
