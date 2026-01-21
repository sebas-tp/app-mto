import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Settings, BarChart3, Activity, Timer, TrendingUp, Gauge, 
  Wrench, LogOut, MessageSquare, ClipboardList, Database, Plus, UserPlus, 
  History, HardDrive, UserCog, LayoutDashboard, X, Calendar as CalendarIcon, 
  Filter, Search, Lock, Fingerprint, Loader2, Trash2, Pencil, FileSpreadsheet, 
  FileText, ChevronLeft, ChevronRight, Clock, Send, Smartphone, ListChecks, 
  Truck, Container, FileBadge, Stethoscope, PauseCircle, PlayCircle, CheckCircle2, AlertTriangle, ScanLine
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from 'recharts';
import { 
  format, addDays, isPast, parseISO, startOfMonth, isSameMonth, 
  isWithinInterval, startOfDay, endOfDay, eachDayOfInterval, endOfMonth, startOfWeek, endOfWeek, isSameDay, addMonths, subMonths, isToday, isValid
} from 'date-fns';

// --- FIREBASE IMPORTS ---
import { db, auth } from './firebaseConfig'; 
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

// --- TIPOS DE DATOS (DEFINIDOS AQUÍ PARA EVITAR CONFLICTOS) ---
export enum Role {
  OPERATOR = 'OPERATOR',
  LEADER = 'LEADER',
  MANAGER = 'MANAGER',
  SUPERVISOR = 'SUPERVISOR' // <--- ROL DE SUPERVISOR
}

export enum MaintenanceType {
  LIGHT = 'LIGHT',
  HEAVY = 'HEAVY'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  phone?: string;
  pin?: string; 
}

export interface Machine {
  id: string;
  name: string;
  operatorInterval: number; 
  leaderInterval: number;   
  lastOperatorDate: string; 
  lastLeaderDate: string;   
  operatorId?: string | null; 
  leaderId?: string | null;   
  assetType?: 'MAQUINA' | 'VEHICULO' | 'MONTACARGA'; 
  status?: 'ACTIVE' | 'STOPPED';
}

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  userId: string;
  date: string;
  type: MaintenanceType;
  observations?: string;
  isIssue?: boolean;
  downtime?: number; 
}

interface ChecklistItem {
  id: string;
  label: string;
  roleTarget: Role; 
  targetType: 'MAQUINA' | 'VEHICULO' | 'MONTACARGA' | 'ALL';
}

// --- HELPER FECHAS ---
const safeDate = (dateStr: string | undefined | null): Date => {
    if (!dateStr) return new Date();
    try { const parsed = parseISO(dateStr); return isValid(parsed) ? parsed : new Date(); } 
    catch (e) { return new Date(); }
};

// --- COMPONENTES UI ---

function IndustrialButton({ children, onClick, variant = 'primary', className = '', fullWidth = false, type = "button" as "button", disabled = false }) {
  const baseStyles = "px-4 py-3 md:px-6 md:py-4 font-extrabold text-xs md:text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 rounded-2xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed";
  const variants: any = {
    primary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-100",
    secondary: "bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white shadow-amber-200",
    danger: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-200",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200",
    outline: "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-orange-400",
    dark: "bg-slate-900 text-white hover:bg-slate-800 border border-slate-700",
    ghost: "bg-transparent text-slate-400 hover:text-slate-600 shadow-none"
  };
  return <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>{children}</button>;
}

const Card = ({ children, className = '', onClick = undefined }: any) => (
  <div onClick={onClick} className={`bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-slate-200/40 p-5 md:p-8 border border-slate-100 ${className}`}>{children}</div>
);

const PinModal = ({ isOpen, onClose, onConfirm, title }: any) => {
  const [pin, setPin] = useState('');
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-sm text-center">
        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-500"><Fingerprint className="w-8 h-8" /></div>
        <h3 className="text-xl font-black uppercase text-slate-900 mb-2">Firma Digital</h3>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">{title}</p>
        <input type="password" maxLength={4} placeholder="PIN" className="w-full text-center text-3xl font-black tracking-[1em] p-4 border-b-4 border-orange-500 outline-none mb-8 bg-transparent" value={pin} onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))} autoFocus />
        <div className="space-y-3"><IndustrialButton fullWidth onClick={() => { onConfirm(pin); setPin(''); }}>Firmar y Confirmar</IndustrialButton><button onClick={onClose} className="text-xs font-bold text-slate-400 uppercase hover:text-red-500 transition-colors">Cancelar</button></div>
      </Card>
    </div>
  );
};

const WhatsAppModal = ({ isOpen, onClose, onSend, userName }: any) => {
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
const MiniCalendar = ({ machines, records, users = [], user, mode }: any) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const calendarDays = useMemo(() => eachDayOfInterval({ start: startOfWeek(startOfMonth(currentMonth)), end: endOfWeek(endOfMonth(currentMonth)) }), [currentMonth]);
  
  const getDayStatus = (date: Date) => {
    const dayRecords = records.filter((r:any) => isSameDay(safeDate(r.date), date) && (mode === 'MANAGER' || r.userId === user?.id));
    const isPending = machines.some((m:any) => {
        if (m.status === 'STOPPED') return false; 
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
    if (dayRecords.some((r:any) => r.isIssue)) return 'issue';
    if (dayRecords.length > 0) return 'done';
    if (isPending) return isPast(date) && !isToday(date) ? 'missed' : 'planned';
    return 'none';
  };

  const getDetails = (date: Date) => {
    const done = records.filter((r:any) => isSameDay(safeDate(r.date), date) && (mode === 'MANAGER' || r.userId === user?.id));
    let pending: any[] = [];
    machines.forEach((m:any) => {
        if (m.status === 'STOPPED') return;
        const opNext = addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15);
        const leadNext = addDays(safeDate(m.lastLeaderDate), m.leaderInterval || 30);
        if (isSameDay(opNext, date)) {
            const resp = users.find((u:any) => u.id === m.operatorId);
            if (mode === 'MANAGER' || (user?.role === Role.OPERATOR && (user.id === m.operatorId || !m.operatorId))) {
                const exists = done.some((r:any) => r.machineId === m.id && r.type === MaintenanceType.LIGHT);
                if (!exists) pending.push({ machineName: m.name, role: 'Operario', responsibleName: resp?.name || 'COMÚN/ROTATIVO' });
            }
        }
        if (isSameDay(leadNext, date)) {
            const resp = users.find((u:any) => u.id === m.leaderId);
            if (mode === 'MANAGER' || (user?.role === Role.LEADER && (user.id === m.leaderId || !m.leaderId))) {
                const exists = done.some((r:any) => r.machineId === m.id && r.type === MaintenanceType.HEAVY);
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
                {getDetails(selectedDay).done.map((r:any) => {
                    const user = users.find((u:any) => u.id === r.userId);
                    return (
                        <div key={r.id} className="flex justify-between items-center mb-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex flex-col"><span className="font-bold text-slate-700 text-xs">{machines.find((m:any) => m.id === r.machineId)?.name}</span><span className="text-[9px] text-slate-400 uppercase font-bold">Hecho por: {user ? user.name : 'Desconocido'}</span></div>
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

// --- VISTAS ---

function OperatorView({ user, users, machines, records, checklistItems }: any) {
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [checklistStatus, setChecklistStatus] = useState<Record<string, string>>({});
  const [obs, setObs] = useState('');
  const [vehicleDocs, setVehicleDocs] = useState(''); 
  const [engineHours, setEngineHours] = useState('');
  const [downtime, setDowntime] = useState(0);
  const [isCritical, setIsCritical] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const myMachines = machines.filter((m:any) => m.operatorId === user.id && m.status !== 'STOPPED');
  const alertMachines = machines.filter((m:any) => m.operatorId !== user.id && m.status !== 'STOPPED' && isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15)));
  const otherMachines = machines.filter((m:any) => m.operatorId !== user.id && m.status !== 'STOPPED' && !isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15)) && (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCheck = (itemId: string, status: string) => { setChecklistStatus(prev => { if (prev[itemId] === status) { const n = { ...prev }; delete n[itemId]; return n; } return { ...prev, [itemId]: status }; }); };
  const myChecklistItems = checklistItems.filter((i:any) => {
    if (i.roleTarget !== Role.OPERATOR) return false;
    const currentMachineType = selectedMachine?.assetType || 'MAQUINA';
    const itemTarget = i.targetType || 'ALL';
    return itemTarget === 'ALL' || itemTarget === currentMachineType;
  });

  const requestSignature = () => { const allChecked = myChecklistItems.every((i:any) => checklistStatus[i.id]); if (!selectedMachine || !allChecked) return alert("Complete todos los items."); setShowPinModal(true); };
  const finalizeManto = async (pin: string) => { 
    if (pin !== user.pin) return alert("ERROR DE FIRMA."); 
    try { 
      const checklistText = Object.entries(checklistStatus).map(([id, s]) => `${checklistItems.find((i:any) => i.id === id)?.label}: ${s}`).join(', ');
      let fullObs = `[PARADA: ${downtime} min] [CHECKLIST: ${checklistText}] ${obs}`;
      if (selectedMachine.assetType === 'VEHICULO' && vehicleDocs) fullObs += ` | [DOCS/KM: ${vehicleDocs}]`;
      if (selectedMachine.assetType === 'MONTACARGA' && engineHours) fullObs += ` | [HORAS MOTOR: ${engineHours}]`;
      await addDoc(collection(db, "records"), { machineId: selectedMachine.id, userId: user.id, date: new Date().toISOString(), observations: fullObs, type: MaintenanceType.LIGHT, isIssue: isCritical, downtime: downtime }); 
      await updateDoc(doc(db, "machines", selectedMachine.id), { lastOperatorDate: new Date().toISOString() }); 
      setSelectedMachine(null); setIsCritical(false); setObs(''); setVehicleDocs(''); setEngineHours(''); setChecklistStatus({}); setDowntime(0); setShowPinModal(false); setSearchTerm(''); alert("Guardado."); 
    } catch (e) { console.error(e); } 
  };

  if (selectedMachine) {
    const isVehicle = selectedMachine.assetType === 'VEHICULO';
    const isForklift = selectedMachine.assetType === 'MONTACARGA';
    return (
      <Card className="max-w-2xl mx-auto border-orange-200 shadow-orange-100 relative mb-20">
        <PinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} onConfirm={finalizeManto} title="Firma Digital" />
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-orange-600 mb-8 flex items-center gap-2 tracking-widest">← Volver</button>
        <div className="mb-8"><h2 className="text-3xl md:text-4xl font-black text-slate-800 uppercase tracking-tighter">{selectedMachine.name}</h2><div className="flex gap-2 mt-2"><span className="bg-slate-100 text-slate-500 font-bold uppercase text-[9px] px-2 py-1 rounded">{selectedMachine.assetType || 'MAQUINA'}</span></div></div>
        <div className="space-y-4 mb-8">{myChecklistItems.map((item:any) => (<div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border-2 border-slate-100 bg-white gap-4 sm:gap-0"><span className="text-sm font-bold text-slate-700 w-full sm:w-1/2">{item.label}</span><div className="flex gap-2 flex-wrap sm:flex-nowrap justify-end"><button onClick={() => handleCheck(item.id, 'NA')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'NA' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>N/A</button>{(isVehicle || isForklift) ? (<><button onClick={() => handleCheck(item.id, 'DEFICIENTE')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'DEFICIENTE' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-amber-100'}`}>DEFICIENTE</button><button onClick={() => handleCheck(item.id, 'BIEN')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'BIEN' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100'}`}>BIEN</button></>) : (<button onClick={() => handleCheck(item.id, 'OK')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'OK' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100'}`}>HECHO</button>)}</div></div>))}</div>
        {isVehicle && (<div className="mb-8 bg-blue-50 p-6 rounded-[2rem] border border-blue-100"><h4 className="text-blue-800 font-black uppercase text-sm mb-4 flex items-center gap-2"><FileBadge className="w-5 h-5"/> Documentación & Kilometraje</h4><textarea className="w-full p-4 border border-blue-200 rounded-2xl outline-none focus:border-blue-500 font-medium text-sm h-24" placeholder="Ej: Seguro al día. KM Actual: 150.000" value={vehicleDocs} onChange={e => setVehicleDocs(e.target.value)} /></div>)}
        {isForklift && (<div className="mb-8 bg-amber-50 p-6 rounded-[2rem] border border-amber-100"><h4 className="text-amber-800 font-black uppercase text-sm mb-4 flex items-center gap-2"><Clock className="w-5 h-5"/> Horómetro (Horas Motor)</h4><input type="number" className="w-full p-4 border border-amber-200 rounded-2xl outline-none focus:border-amber-500 font-bold text-lg" placeholder="Ej: 12500" value={engineHours} onChange={e => setEngineHours(e.target.value)} /></div>)}
        <div className="mb-8"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tiempo Parada (Min)</label><input type="number" className="w-full p-4 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-orange-500 font-bold text-xl" value={downtime} onChange={e => setDowntime(parseInt(e.target.value) || 0)} /></div>
        <div className={`p-4 md:p-6 rounded-3xl border-2 mb-8 flex items-center gap-5 transition-colors ${isCritical ? 'bg-red-600 border-red-700 text-white' : 'bg-red-50 border-red-100 text-red-600'}`}><input type="checkbox" className="w-6 h-6 md:w-8 md:h-8 accent-white" checked={isCritical} onChange={e => setIsCritical(e.target.checked)} id="critical" /><label htmlFor="critical" className="font-black uppercase text-xs md:text-sm cursor-pointer select-none">⚠️ Reportar Avería</label></div>
        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] mb-8 h-32 outline-none focus:border-orange-500 font-medium text-lg" placeholder="Observaciones generales..." value={obs} onChange={e => setObs(e.target.value)} />
        <IndustrialButton fullWidth onClick={requestSignature}>Certificar</IndustrialButton>
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-end gap-8"><div><h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Mi Panel</h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-3">Estado de Máquinas</p></div><div className="w-full md:w-96"><MiniCalendar machines={machines} records={records} user={user} mode="OPERATOR" /></div></div>
      {myMachines.length > 0 && (<div className="space-y-6"><h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3"><UserCog className="text-orange-600" /> Mis Responsabilidades</h3><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{myMachines.map((m:any) => (<Card key={m.id} className={`${isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15)) ? 'border-red-500 shadow-red-100' : 'border-emerald-500 shadow-emerald-100'} cursor-pointer hover:scale-[1.02]`} onClick={() => { setSelectedMachine(m); setChecklistStatus({}); }}><div className="flex justify-between mb-4"><div className={`p-3 rounded-2xl ${isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15)) ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{m.assetType === 'VEHICULO' ? <Truck className="w-6 h-6"/> : m.assetType === 'MONTACARGA' ? <Container className="w-6 h-6"/> : <Wrench className="w-6 h-6" />}</div></div><h3 className="text-2xl font-black text-slate-800 uppercase mb-4 leading-tight">{m.name}</h3></Card>))}</div></div>)}
      {alertMachines.length > 0 && (<div className="space-y-6 pt-12 border-t border-slate-200"><h3 className="text-xl font-black text-red-600 uppercase flex items-center gap-3 animate-pulse"><AlertTriangle /> Mantenimiento Vencido</h3><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">{alertMachines.map((m:any) => (<div key={m.id} onClick={() => { setSelectedMachine(m); setChecklistStatus({}); }} className="bg-red-50 p-6 rounded-3xl border border-red-200 cursor-pointer hover:shadow-xl"><p className="font-black text-slate-800 uppercase">{m.name}</p></div>))}</div></div>)}
      <div className="space-y-6 pt-12 border-t border-slate-200"><div className="flex flex-col md:flex-row justify-between items-end gap-4"><h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-3"><ScanLine className="text-slate-400" /> Operar Otro Equipo</h3><div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-200 w-full md:w-auto"><Search className="w-4 h-4 text-slate-400" /><input className="outline-none text-sm font-bold text-slate-700 bg-transparent" placeholder="Buscar equipo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>{searchTerm && (<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in fade-in">{otherMachines.map((m:any) => (<div key={m.id} onClick={() => { setSelectedMachine(m); setChecklistStatus({}); }} className="bg-white p-6 rounded-3xl border border-slate-100 cursor-pointer hover:shadow-xl"><p className="font-black text-slate-800 uppercase">{m.name}</p></div>))}</div>)}</div>
    </div>
  );
}

function LeaderView({ user, machines, records, checklistItems }: any) {
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [checklistStatus, setChecklistStatus] = useState<Record<string, string>>({});
  const [mantoObs, setMantoObs] = useState('');
  const [downtime, setDowntime] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [closingIssue, setClosingIssue] = useState<any>(null);
  const [closingComment, setClosingComment] = useState('');

  const issues = records.filter((r:any) => r.isIssue);
  const heavyDutyDue = machines.filter((m:any) => isPast(addDays(safeDate(m.lastLeaderDate), m.leaderInterval || 30)));
  const myChecklistItems = checklistItems.filter((i:any) => i.roleTarget === Role.LEADER && (selectedMachine?.assetType ? (i.targetType === 'ALL' || i.targetType === selectedMachine.assetType) : true));
  const handleCheck = (itemId: string, status: string) => { setChecklistStatus(prev => { if (prev[itemId] === status) { const n = { ...prev }; delete n[itemId]; return n; } return { ...prev, [itemId]: status }; }); };
  const finalizeLeaderManto = async (pin: string) => { 
    if (pin !== user.pin) return alert("ERROR: PIN inválido."); 
    try { 
        const checklistText = Object.entries(checklistStatus).map(([id, s]) => `${checklistItems.find((i:any) => i.id === id)?.label}: ${s}`).join(', ');
        const fullObs = `[PARADA: ${downtime} min] [CHECKLIST: ${checklistText}] ${mantoObs}`;
        await addDoc(collection(db, "records"), { machineId: selectedMachine.id, userId: user.id, date: new Date().toISOString(), observations: fullObs, type: MaintenanceType.HEAVY, isIssue: false, downtime: downtime }); 
        await updateDoc(doc(db, "machines", selectedMachine.id), { lastLeaderDate: new Date().toISOString() }); 
        setSelectedMachine(null); setChecklistStatus({}); setMantoObs(''); setDowntime(0); setShowPinModal(false); alert("Certificado por Liderazgo."); 
    } catch(e) { console.error(e); } 
  };
  const handleCloseIssue = async () => { if(!closingComment) return alert("Debe ingresar comentario."); if(!closingIssue) return; await updateDoc(doc(db, "records", closingIssue.id), { isIssue: false, observations: closingIssue.observations + ` | SOLUCIÓN LÍDER: ${closingComment}` }); setClosingIssue(null); setClosingComment(''); alert("Incidencia cerrada."); };

  if (selectedMachine) {
    return (
      <Card className="max-w-2xl mx-auto border-amber-600 shadow-amber-100/50 relative mb-20">
        <PinModal isOpen={showPinModal} onClose={() => setShowPinModal(false)} onConfirm={finalizeLeaderManto} title="Firma de Responsable Técnico" />
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-amber-700 mb-8 flex items-center gap-2 tracking-widest">← Cancelar</button>
        <div className="mb-8"><h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">{selectedMachine.name}</h2></div>
        <div className="space-y-4 mb-8">{myChecklistItems.map((item:any) => (<div key={item.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-100 bg-white"><span className="text-sm font-bold text-slate-700 w-1/2">{item.label}</span><div className="flex gap-2"><button onClick={() => handleCheck(item.id, 'NA')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'NA' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>N/A</button><button onClick={() => handleCheck(item.id, 'OK')} className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all ${checklistStatus[item.id] === 'OK' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-amber-100'}`}>HECHO</button></div></div>))}</div>
        <div className="mb-8"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Tiempo Parada (Min)</label><input type="number" className="w-full p-4 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-amber-500 font-bold text-xl" value={downtime} onChange={e => setDowntime(parseInt(e.target.value) || 0)} /></div>
        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] mb-8 h-32 outline-none focus:border-amber-600 font-medium text-lg" placeholder="Detalles técnicos..." value={mantoObs} onChange={e => setMantoObs(e.target.value)} />
        <IndustrialButton variant="secondary" fullWidth onClick={() => { if (!selectedMachine) return; setShowPinModal(true); }}>Firmar Mantenimiento Experto</IndustrialButton>
      </Card>
    );
  }

  return (
    <div className="space-y-16 relative">
      {closingIssue && (<div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><Card className="w-full max-w-lg animate-in fade-in zoom-in duration-200"><div className="flex justify-between items-center mb-6"><h3 className="text-2xl font-black uppercase text-slate-800">Cierre Técnico</h3><button onClick={() => setClosingIssue(null)}><X className="w-6 h-6 text-slate-400 hover:text-red-500" /></button></div><p className="text-sm font-bold text-slate-500 uppercase mb-4">Resolución de falla en: <span className="text-slate-900">{machines.find((m:any) => m.id === closingIssue.machineId)?.name}</span></p><div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-6"><p className="text-[10px] text-red-400 font-black uppercase mb-1">Reporte Original:</p><p className="text-red-800 italic font-medium">"{closingIssue.observations}"</p></div><textarea autoFocus className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl mb-6 outline-none focus:border-orange-500 font-medium" placeholder="Solución aplicada..." rows={4} value={closingComment} onChange={e => setClosingComment(e.target.value)} /><IndustrialButton fullWidth onClick={handleCloseIssue}>Confirmar Solución</IndustrialButton></Card></div>)}
      <div className="flex flex-col md:flex-row justify-between items-end gap-8"><div><h2 className="text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">Resp. Mantenimiento <span className="text-orange-600">Gral.</span></h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-3">Supervisión de Línea y Equipos Críticos</p></div><div className="w-full md:w-96"><MiniCalendar machines={machines} records={records} user={user} mode="OPERATOR" /></div></div>
      {issues.length > 0 && (<div className="space-y-6"><h3 className="text-xl font-black text-red-600 uppercase flex items-center gap-3 animate-pulse"><AlertTriangle /> Urgencias de Planta</h3><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{issues.map((r:any) => (<Card key={r.id} className="border-l-8 border-red-600 bg-red-50/20"><div className="flex justify-between items-start mb-4"><h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{machines.find((m:any) => m.id === r.machineId)?.name}</h4><span className="text-[9px] font-black bg-red-600 text-white px-3 py-1 rounded-full uppercase">Falla Urgente</span></div><p className="text-slate-600 font-medium italic mb-6 leading-relaxed">"{r.observations}"</p><div className="flex justify-between items-center border-t border-red-100 pt-6"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reportado: {format(safeDate(r.date), 'dd/MM HH:mm')}</p><button className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-tighter bg-white px-4 py-2 rounded-xl shadow-sm hover:shadow-md transition-all" onClick={() => setClosingIssue(r)}>Resolver Incidencia</button></div></Card>))}</div></div>)}
      <div className="space-y-6 pt-12 border-t border-slate-200"><h3 className="text-xl font-black text-amber-700 uppercase flex items-center gap-3"><Stethoscope /> Rondas Preventivas Vencidas (30 Días)</h3><div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">{heavyDutyDue.map((m:any) => (<div key={m.id} onClick={() => { setSelectedMachine(m); setChecklistStatus({}); }} className="p-6 rounded-3xl border border-amber-200 cursor-pointer hover:shadow-xl"><p className="font-black text-slate-800 uppercase">{m.name}</p></div>))}</div></div>
    </div>
  );
}

function ManagerView({ currentUser, users, machines, records, checklistItems, onInitChecklist }: any) {
  const [activePanel, setActivePanel] = useState<'STATS' | 'HISTORY' | 'MACHINES' | 'USERS' | 'CONFIG'>('STATS');
  const [userForm, setUserForm] = useState({ name: '', phone: '', role: Role.OPERATOR, pin: '1234' });
  const [historyFilter, setHistoryFilter] = useState({ userId: 'ALL', dateFrom: '', dateTo: '', type: 'ALL' });
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [machineForm, setMachineForm] = useState({ name: '', operatorInterval: 15, leaderInterval: 30, operatorId: '', leaderId: '', baseDate: new Date().toISOString().slice(0, 10), assetType: 'MAQUINA', status: 'ACTIVE' });
  const [selectedMachineId, setSelectedMachineId] = useState<string>('ALL');
  const [chartMetric, setChartMetric] = useState<'DOWNTIME' | 'EFFECTIVENESS'>('EFFECTIVENESS');
  const [viewRecord, setViewRecord] = useState<any>(null);
  const [machineSearch, setMachineSearch] = useState('');
  const [newItemText, setNewItemText] = useState('');
  const [newItemRole, setNewItemRole] = useState<Role>(Role.OPERATOR);
  const [newItemTarget, setNewItemTarget] = useState<any>('ALL');
  const [showWAModal, setShowWAModal] = useState(false);
  const [waTargetUser, setWaTargetUser] = useState<User | null>(null);

  const isSupervisor = currentUser.role === Role.SUPERVISOR;
  const activeMachinesList = useMemo(() => machines.filter((m:any) => m.status !== 'STOPPED'), [machines]);
  const filteredMachines = useMemo(() => selectedMachineId === 'ALL' ? activeMachinesList : activeMachinesList.filter((m:any) => m.id === selectedMachineId), [activeMachinesList, selectedMachineId]);
  const filteredRecordsForStats = useMemo(() => selectedMachineId === 'ALL' ? records : records.filter((r:any) => r.machineId === selectedMachineId), [records, selectedMachineId]);
  const visibleMachinesInList = useMemo(() => machines.filter((m:any) => (m.name || '').toLowerCase().includes(machineSearch.toLowerCase())), [machines, machineSearch]);

  const kpiData = useMemo(() => {
    const totalAssets = filteredMachines.length;
    const totalTasks = filteredRecordsForStats.length;
    const totalDowntime = filteredRecordsForStats.reduce((acc:any, r:any) => acc + (r.downtime || 0), 0);
    const efficiency = totalAssets * 30 * 24 * 60 > 0 ? Math.max(0, Math.round(((totalAssets * 30 * 24 * 60 - totalDowntime) / (totalAssets * 30 * 24 * 60)) * 100)) : 100;
    const compliantMachines = filteredMachines.filter((m:any) => !isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15)) && !isPast(addDays(safeDate(m.lastLeaderDate), m.leaderInterval || 30))).length;
    const complianceRate = totalAssets > 0 ? Math.round((compliantMachines / totalAssets) * 100) : 100;
    return { totalAssets, totalTasks, totalDowntime, complianceRate, efficiency };
  }, [filteredMachines, filteredRecordsForStats]);

  const stats = useMemo(() => { 
      const total = filteredMachines.length; 
      const due = filteredMachines.filter((m:any) => isPast(addDays(safeDate(m.lastOperatorDate), m.operatorInterval || 15)) || isPast(addDays(safeDate(m.lastLeaderDate), m.leaderInterval || 30))).length; 
      return [{ name: 'Operativo', value: total - due, color: '#10b981' }, { name: 'Vencido', value: due, color: '#ef4444' }]; 
  }, [filteredMachines]);

  const trendData = useMemo(() => {
    const grouped = filteredRecordsForStats.reduce((acc: any, r:any) => {
        const date = r.date.slice(0, 10);
        if (!acc[date]) acc[date] = { date, downtime: 0, preventive: 0, total: 0 };
        acc[date].downtime += (r.downtime || 0);
        if (!r.isIssue) acc[date].preventive += 1;
        acc[date].total += 1;
        return acc;
    }, {});
    return Object.values(grouped).map((day: any) => ({ ...day, effectiveness: day.total > 0 ? Math.round((day.preventive / day.total) * 100) : 0 })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredRecordsForStats]);

  const planVsRealData = useMemo(() => [{ name: 'Plan (Preventivo)', value: filteredRecordsForStats.filter((r:any) => !r.isIssue).length }, { name: 'Incidencias (Correctivo)', value: filteredRecordsForStats.filter((r:any) => r.isIssue).length }], [filteredRecordsForStats]);
  const filteredRecords = useMemo(() => records.filter((r:any) => { const matchUser = historyFilter.userId === 'ALL' || r.userId === historyFilter.userId; let matchDate = true; if (historyFilter.dateFrom && historyFilter.dateTo) { matchDate = isWithinInterval(safeDate(r.date), { start: startOfDay(parseISO(historyFilter.dateFrom)), end: endOfDay(parseISO(historyFilter.dateTo)) }); } const matchType = historyFilter.type === 'ALL' ? true : historyFilter.type === 'ISSUE' ? r.isIssue : !r.isIssue; return matchUser && matchDate && matchType; }).sort((a:any, b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()), [records, historyFilter]);

  const handlePrint = () => { window.print(); };
  const openWAModal = (u: User) => { setWaTargetUser(u); setShowWAModal(true); };
  const sendWhatsApp = (text: string) => { if(!waTargetUser) return; const url = `https://wa.me/${waTargetUser.phone}?text=${encodeURIComponent(text)}`; window.open(url, '_blank'); setShowWAModal(false); };
  const addUser = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, "users"), { ...userForm }); setUserForm({ name: '', phone: '', role: Role.OPERATOR, pin: '1234' }); alert("Usuario creado."); };
  const deleteUser = async (userId: string) => { if(!window.confirm("¿Seguro?")) return; await deleteDoc(doc(db, "users", userId)); };
  const handleMachineSubmit = async (e: React.FormEvent) => { e.preventDefault(); const baseDate = new Date(machineForm.baseDate).toISOString(); const data: any = { name: machineForm.name, operatorInterval: machineForm.operatorInterval, leaderInterval: machineForm.leaderInterval, operatorId: machineForm.operatorId || null, leaderId: machineForm.leaderId || null, assetType: machineForm.assetType, status: machineForm.status, lastOperatorDate: baseDate, lastLeaderDate: baseDate }; if (editingMachineId) { await updateDoc(doc(db, "machines", editingMachineId), data); alert("Actualizado."); setEditingMachineId(null); } else { await addDoc(collection(db, "machines"), data); alert("Creado."); } setMachineForm({ name: '', operatorInterval: 15, leaderInterval: 30, operatorId: '', leaderId: '', baseDate: new Date().toISOString().slice(0, 10), assetType: 'MAQUINA', status: 'ACTIVE' } as any); };
  const handleEditMachine = (m: ExtendedMachine) => { setEditingMachineId(m.id); setMachineForm({ name: m.name, operatorInterval: m.operatorInterval, leaderInterval: m.leaderInterval, operatorId: m.operatorId || '', leaderId: m.leaderId || '', baseDate: m.lastOperatorDate ? m.lastOperatorDate.slice(0, 10) : new Date().toISOString().slice(0, 10), assetType: m.assetType || 'MAQUINA', status: m.status || 'ACTIVE' } as any); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const handleDeleteMachine = async (id: string) => { if(!window.confirm("¿Eliminar?")) return; await deleteDoc(doc(db, "machines", id)); };
  const updateMachineOwner = async (machineId: string, val: string) => { await updateDoc(doc(db, "machines", machineId), { assignedTo: val === "none" ? null : val }); };
  const updateUserRole = async (userId: string, newRole: Role) => { await updateDoc(doc(db, "users", userId), { role: newRole }); };
  const addChecklistItem = async (e: React.FormEvent) => { e.preventDefault(); await addDoc(collection(db, "checklist_config"), { label: newItemText, roleTarget: newItemRole, targetType: newItemTarget }); setNewItemText(''); };
  const deleteChecklistItem = async (id: string) => { await deleteDoc(doc(db, "checklist_config", id)); };
  const handleDeleteRecord = async (recordId: string, e: React.MouseEvent) => { e.stopPropagation(); if (!window.confirm("¿Eliminar registro?")) return; await deleteDoc(doc(db, "records", recordId)); };
  
  const availableTabs = isSupervisor ? [{ id: 'STATS', label: 'KPIs', icon: BarChart3 }, { id: 'HISTORY', label: 'Auditoría', icon: History }] : [{ id: 'STATS', label: 'KPIs', icon: BarChart3 }, { id: 'HISTORY', label: 'Auditoría', icon: History }, { id: 'MACHINES', label: 'Activos', icon: HardDrive }, { id: 'USERS', label: 'Personal', icon: Users }, { id: 'CONFIG', label: 'Config', icon: ListChecks }];

  return (
    <div className="space-y-12">
      <WhatsAppModal isOpen={showWAModal} onClose={() => setShowWAModal(false)} onSend={sendWhatsApp} userName={waTargetUser?.name || ''} />
      {viewRecord && (<div className="fixed inset-0 bg-slate-900/80 z-[200] flex items-center justify-center p-4" onClick={() => setViewRecord(null)}><Card className="w-full max-w-lg" onClick={(e:any) => e.stopPropagation()}><div className="flex justify-between items-start mb-6"><div><h3 className="text-xl font-black uppercase text-slate-800">{machines.find((m:any) => m.id === viewRecord.machineId)?.name}</h3><p className="text-xs text-slate-400 font-bold uppercase">{format(safeDate(viewRecord.date), 'dd/MM/yyyy HH:mm')}</p></div><button onClick={() => setViewRecord(null)}><X className="w-6 h-6 text-slate-400 hover:text-red-500" /></button></div><div className="space-y-4"><div className="flex justify-between p-4 bg-slate-50 rounded-2xl"><span className="text-sm font-bold text-slate-600">Responsable</span><span className="text-sm font-black text-slate-900 uppercase">{(users.find((u:any) => u.id === viewRecord.userId)?.name) || 'Desconocido'}</span></div><div className="p-4 bg-slate-50 rounded-2xl"><p className="text-[10px] font-black uppercase text-slate-400 mb-2">Detalle</p><p className="text-sm text-slate-700 font-medium italic">"{viewRecord.observations}"</p></div></div></Card></div>)}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-8 no-print"><div><h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Control <span className="text-orange-600">Maestro</span></h2><p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mt-3">{isSupervisor ? 'Supervisión de Planta' : 'Gerencia Técnica'}</p></div><div className="flex bg-white p-2 rounded-[2rem] border border-slate-100 shadow-xl overflow-x-auto max-w-full">{availableTabs.map((tab:any) => (<button key={tab.id} onClick={() => setActivePanel(tab.id as any)} className={`px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all tracking-widest flex items-center gap-2 whitespace-nowrap ${activePanel === tab.id ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400 hover:text-orange-500'}`}><tab.icon className="w-4 h-4" /> {tab.label}</button>))}</div></div>
      {activePanel === 'STATS' && (<div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500"><div className="bg-slate-800 p-4 rounded-2xl flex justify-between items-center"><h3 className="text-white font-bold uppercase text-sm flex items-center gap-2"><Filter className="w-4 h-4 text-orange-500"/> Filtro:</h3><select className="bg-slate-700 text-white font-bold p-2 rounded-xl outline-none border border-slate-600" value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)}><option value="ALL">Global</option>{activeMachinesList.map((m:any) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div><div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><Card className="bg-slate-900 text-white border-none"><div className="flex items-center gap-3 mb-2"><HardDrive className="text-orange-500 w-5 h-5" /><span className="text-[10px] font-black uppercase tracking-widest opacity-70">Activos</span></div><p className="text-4xl font-black">{kpiData.totalAssets}</p></Card><Card className="bg-white border-emerald-100"><div className="flex items-center gap-3 mb-2"><Activity className="text-emerald-500 w-5 h-5" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cumplimiento</span></div><p className="text-4xl font-black text-emerald-600">{kpiData.complianceRate}%</p></Card></div><div className="w-full"><MiniCalendar machines={activeMachinesList} records={records} users={users} mode="MANAGER" /></div></div>)}
      {activePanel === 'HISTORY' && (<div className="space-y-8 animate-in fade-in zoom-in duration-300"><Card className="bg-slate-900 text-white border-none shadow-2xl no-print"><div className="flex flex-col md:flex-row gap-6 items-end"><div className="w-full md:w-1/4 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 flex gap-2"><CalendarIcon className="w-3 h-3"/> Desde</label><input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 text-white" value={historyFilter.dateFrom} onChange={e => setHistoryFilter({...historyFilter, dateFrom: e.target.value})} /></div><div className="w-full md:w-1/4 space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 flex gap-2"><CalendarIcon className="w-3 h-3"/> Hasta</label><input type="date" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-sm font-bold outline-none focus:border-orange-500 text-white" value={historyFilter.dateTo} onChange={e => setHistoryFilter({...historyFilter, dateTo: e.target.value})} /></div></div></Card><div className="flex gap-4 justify-end no-print"><IndustrialButton onClick={handlePrint} variant="dark"><FileText className="w-4 h-4"/> PDF</IndustrialButton></div><Card className="p-0 overflow-hidden border-orange-100"><div className="overflow-x-auto"><table className="w-full text-left border-collapse"><thead className="bg-orange-50 text-orange-900 text-[10px] font-black uppercase tracking-widest"><tr><th className="p-6">Fecha</th><th className="p-6">Máquina</th><th className="p-6">Resp.</th><th className="p-6">Detalle</th><th className="p-6 text-center">Acción</th></tr></thead><tbody className="text-xs font-medium text-slate-600">{filteredRecords.map((r:any) => (<tr key={r.id} onClick={() => setViewRecord(r)} className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"><td className="p-6 font-bold text-slate-400">{format(safeDate(r.date), 'dd/MM HH:mm')}</td><td className="p-6 uppercase font-black text-slate-800">{machines.find((m:any) => m.id === r.machineId)?.name}</td><td className="p-6">{users.find((u:any) => u.id === r.userId)?.name}</td><td className="p-6 italic">{r.observations}</td><td className="p-6 text-center">{!isSupervisor && <button onClick={(e) => handleDeleteRecord(r.id, e)}><Trash2 className="w-4 h-4"/></button>}</td></tr>))}</tbody></table></div></Card></div>)}
      {!isSupervisor && activePanel === 'MACHINES' && (<div className="grid grid-cols-1 gap-12"><Card><form onSubmit={handleMachineSubmit} className="space-y-6"><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3"><Plus className="text-orange-600" /> {editingMachineId ? 'Editar' : 'Nuevo'} Activo</h3><input className="w-full p-5 rounded-2xl border-2" placeholder="Nombre Máquina" value={machineForm.name} onChange={e => setMachineForm({...machineForm, name: e.target.value})} /><div className="flex gap-2"><select className="w-full p-5 rounded-2xl border-2" value={machineForm.assetType} onChange={(e:any) => setMachineForm({...machineForm, assetType: e.target.value})}><option value="MAQUINA">MÁQUINA</option><option value="VEHICULO">VEHÍCULO</option><option value="MONTACARGA">MONTACARGA</option></select></div><IndustrialButton fullWidth type="submit">Guardar</IndustrialButton></form></Card><div className="space-y-4">{visibleMachinesInList.map((m:any) => (<Card key={m.id} className="flex justify-between items-center"><span className="font-black uppercase">{m.name}</span><div className="flex gap-2"><button onClick={() => handleEditMachine(m)}><Pencil className="w-4 h-4 text-blue-500"/></button><button onClick={() => handleDeleteMachine(m.id)}><Trash2 className="w-4 h-4 text-red-500"/></button></div></Card>))}</div></div>)}
      {!isSupervisor && activePanel === 'USERS' && (<div className="grid grid-cols-1 gap-12"><Card><form onSubmit={addUser} className="space-y-6"><h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Nuevo Usuario</h3><input className="w-full p-5 rounded-2xl border-2" placeholder="Nombre" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} /><input className="w-full p-5 rounded-2xl border-2" placeholder="PIN" value={userForm.pin} onChange={e => setUserForm({...userForm, pin: e.target.value})} /><select className="w-full p-5 rounded-2xl border-2" value={userForm.role} onChange={(e:any) => setUserForm({...userForm, role: e.target.value})}><option value={Role.OPERATOR}>OPERARIO</option><option value={Role.LEADER}>LIDER</option><option value={Role.MANAGER}>GERENTE</option><option value={Role.SUPERVISOR}>SUPERVISOR</option></select><IndustrialButton fullWidth type="submit">Crear</IndustrialButton></form></Card><div className="grid gap-4">{users.map((u:any) => (<Card key={u.id} className="flex justify-between"><span>{u.name} ({u.role})</span><button onClick={() => deleteUser(u.id)}><Trash2 className="text-red-500 w-4 h-4"/></button></Card>))}</div></div>)}
      {!isSupervisor && activePanel === 'CONFIG' && (<div className="grid grid-cols-1 gap-8"><Card><form onSubmit={addChecklistItem} className="space-y-6"><h3 className="text-2xl font-black">Nueva Tarea Checklist</h3><input className="w-full p-5 rounded-2xl border-2" placeholder="Tarea" value={newItemText} onChange={e => setNewItemText(e.target.value)} /><select className="w-full p-5 rounded-2xl border-2" value={newItemTarget} onChange={(e:any) => setNewItemTarget(e.target.value)}><option value="ALL">Todo</option><option value="MAQUINA">Máquina</option><option value="VEHICULO">Vehículo</option><option value="MONTACARGA">Montacarga</option></select><IndustrialButton fullWidth type="submit">Agregar</IndustrialButton></form></Card><div className="space-y-2">{checklistItems.map((i:any) => (<div key={i.id} className="flex justify-between p-4 bg-white border rounded-xl"><span>{i.label} ({i.targetType})</span><button onClick={() => deleteChecklistItem(i.id)}><Trash2 className="w-4 h-4 text-red-500"/></button></div>))}</div></div>)}
    </div>
  );
}

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

  const handleLogin = (userId: string) => { 
    const user = users.find(u => u.id === userId); 
    if (!user) return;
    if (user.role === Role.SUPERVISOR) {
        const inputPin = prompt(`🔐 Seguridad: Ingrese el PIN de ${user.name}`);
        if (inputPin !== user.pin) { alert("PIN Incorrecto."); return; }
    }
    setCurrentUser(user); 
    localStorage.setItem('local_session_user', JSON.stringify(user)); 
    setView('DASHBOARD'); 
  };

  const handleAdminLogin = () => { 
    if (adminPass === 'admin123') { const admin = users.find(u => u.role === Role.MANAGER); if (admin) { setCurrentUser(admin); localStorage.setItem('local_session_user', JSON.stringify(admin)); setView('DASHBOARD'); setShowAdminLogin(false); setAdminPass(''); } else { alert("No se encontró usuario Gerente en la base de datos."); } } else { alert("Contraseña incorrecta."); } 
  };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('local_session_user'); setView('LOGIN'); };
  
  const seedDB = async () => { alert("Función desactivada."); };
  const getRoleDisplayName = (role?: Role) => { if (role === Role.LEADER) return "RESP. MANTENIMIENTO"; if (role === Role.MANAGER) return "GERENCIA"; if (role === Role.SUPERVISOR) return "SUPERVISOR"; return "OPERARIO"; };

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
                      {publicUsers.map((u:any) => <option key={u.id} value={u.id}>{u.name} | {getRoleDisplayName(u.role)}</option>)}
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
        {(currentUser?.role === Role.MANAGER || currentUser?.role === Role.SUPERVISOR) && (
            <ManagerView 
                currentUser={currentUser} 
                users={users} 
                machines={machines} 
                records={records} 
                checklistItems={checklistItems} 
                onInitChecklist={seedDB} 
            />
        )}
      </main>
      
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
