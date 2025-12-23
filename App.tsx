
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  AlertTriangle, 
  Wrench, 
  LogOut, 
  Database,
  Plus,
  HardDrive,
  UserCog,
  Sparkles,
  BrainCircuit
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
  parseISO
} from 'date-fns';
import { db } from './firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { Role, User, Machine, MaintenanceRecord, MaintenanceType } from './types';
import { GoogleGenAI } from "@google/genai";

// Componentes UI Reutilizables
const IndustrialButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ai';
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', fullWidth = false, disabled = false }) => {
  const baseStyles = "px-6 py-4 font-extrabold text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 rounded-2xl shadow-md disabled:opacity-50";
  const variants = {
    primary: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-100",
    secondary: "bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 text-white shadow-amber-200",
    danger: "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-red-200",
    success: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-200",
    outline: "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-orange-400",
    ai: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-100"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}>
      {children}
    </button>
  );
};

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 p-8 border border-slate-100 ${className}`}>
    {children}
  </div>
);

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD'>('LOGIN');
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      // Fix: Use window.aistudio.hasSelectedApiKey() directly
      if ((window as any).aistudio?.hasSelectedApiKey) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        setApiKeySelected(hasKey);
      }
    };
    checkKey();

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)));
    });
    const unsubMachines = onSnapshot(collection(db, 'machines'), (snapshot) => {
      setMachines(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Machine)));
    });
    const unsubRecords = onSnapshot(query(collection(db, 'records'), orderBy('date', 'desc')), (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord)));
    });

    const savedUser = localStorage.getItem('tpm_auth_user');
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
      localStorage.setItem('tpm_auth_user', JSON.stringify(user));
      setView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tpm_auth_user');
    setView('LOGIN');
  };

  const handleOpenKeyDialog = async () => {
    // Fix: Trigger API key selection as required for Gemini 3 models
    await (window as any).aistudio.openSelectKey();
    // Fix: Proceed assuming the key selection was successful as per guidelines to avoid race condition
    setApiKeySelected(true);
  };

  if (!apiKeySelected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <Card className="max-w-md w-full text-center space-y-8">
          <div className="p-5 bg-indigo-100 rounded-full text-indigo-600 mx-auto w-fit">
            <BrainCircuit className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Configurar IA</h2>
          <p className="text-slate-500 font-bold text-sm leading-relaxed">
            Para habilitar el análisis de riesgos, configure su API Key de Google Gemini Pro. Debe usar una clave de un proyecto de GCP con facturación habilitada.
            <br />
            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">Documentación de facturación</a>
          </p>
          <IndustrialButton variant="ai" fullWidth onClick={handleOpenKeyDialog}>
            Configurar API Key
          </IndustrialButton>
        </Card>
      </div>
    );
  }

  if (view === 'LOGIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <div className="w-full max-w-md space-y-12">
          <div className="text-center space-y-4">
            <div className="inline-block p-5 bg-orange-100 rounded-[2rem] text-orange-600 shadow-lg shadow-orange-100">
              <Settings className="w-16 h-16 animate-spin-slow" />
            </div>
            <h1 className="text-6xl font-black uppercase tracking-tighter text-slate-900 leading-none">TPM <span className="text-orange-600">PRO</span></h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Industrial Cloud Sync</p>
          </div>
          <Card className="space-y-8">
            <select className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-lg font-bold outline-none focus:border-orange-500 transition-all" onChange={(e) => handleLogin(e.target.value)} value="">
              <option value="" disabled>-- Seleccione su Identidad --</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} | {u.role}</option>)}
            </select>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-lg shadow-orange-200"><Settings className="w-7 h-7" /></div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">TPM <span className="text-orange-600">PRO</span></h1>
        </div>
        <div className="flex items-center gap-8">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-900 uppercase leading-none">{currentUser?.name}</p>
            <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase mt-2 inline-block tracking-tighter">{currentUser?.role}</span>
          </div>
          <button onClick={handleLogout} className="p-4 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"><LogOut className="w-6 h-6" /></button>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-12 max-w-7xl mx-auto w-full">
        {currentUser?.role === Role.OPERATOR && <OperatorView user={currentUser} machines={machines} onResetKey={() => setApiKeySelected(false)} />}
        {currentUser?.role === Role.LEADER && <LeaderView user={currentUser} machines={machines} records={records} />}
        {currentUser?.role === Role.MANAGER && <ManagerView users={users} machines={machines} records={records} onResetKey={() => setApiKeySelected(false)} />}
      </main>
    </div>
  );
}

// Vista Operario
const OperatorView: React.FC<{ user: User; machines: Machine[]; onResetKey: () => void }> = ({ user, machines, onResetKey }) => {
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(new Array(5).fill(false));
  const [obs, setObs] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const myMachines = machines.filter(m => m.assignedTo === user.id);

  const analyzeWithAI = async () => {
    if (!obs.trim()) return;
    setIsAnalyzing(true);
    try {
      // Fix: Initialize GoogleGenAI with process.env.API_KEY right before use
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analiza esta observación técnica: "${obs}". Identifica nivel de riesgo (Bajo/Medio/Alto) y acción sugerida. Máximo 20 palabras.`,
      });
      // Fix: Access response.text property (not a method)
      setAiAnalysis(response.text);
    } catch (e: any) {
      // Fix: Reset key selection if entity not found
      if (e?.message?.toLowerCase().includes("not found")) onResetKey();
    } finally { setIsAnalyzing(false); }
  };

  const submitManto = async () => {
    if (!selectedMachine) return;
    await addDoc(collection(db, 'records'), {
      machineId: selectedMachine.id,
      userId: user.id,
      date: new Date().toISOString(),
      observations: obs,
      type: MaintenanceType.LIGHT,
      isIssue: checklist.some(c => !c)
    });
    await updateDoc(doc(db, 'machines', selectedMachine.id), { lastMaintenance: new Date().toISOString() });
    setSelectedMachine(null);
    setObs('');
    setAiAnalysis(null);
    alert("Reporte guardado en la nube.");
  };

  if (selectedMachine) {
    return (
      <Card className="max-w-2xl mx-auto border-orange-200">
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-orange-600 mb-8 tracking-widest">← Volver</button>
        <h2 className="text-3xl font-black text-slate-800 uppercase mb-8">{selectedMachine.name}</h2>
        <div className="space-y-4 mb-8">
          {["Lubricación", "Limpieza", "Ajustes", "Sensores", "Fugas"].map((t, i) => (
            <label key={i} className={`flex items-center gap-5 p-4 rounded-3xl border-2 cursor-pointer transition-all ${checklist[i] ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-100'}`}>
              <input type="checkbox" className="w-6 h-6 accent-orange-600" checked={checklist[i]} onChange={() => { const c = [...checklist]; c[i] = !c[i]; setChecklist(c); }} />
              <span className="font-bold text-slate-700">{t} OK</span>
            </label>
          ))}
        </div>
        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] h-32 mb-4 outline-none focus:border-orange-500" placeholder="Observaciones técnicas..." value={obs} onChange={e => setObs(e.target.value)} />
        <div className="flex gap-4 mb-8">
          <IndustrialButton variant="ai" className="py-2 flex-1" onClick={analyzeWithAI} disabled={isAnalyzing || !obs}>
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            Analítica IA
          </IndustrialButton>
          <IndustrialButton className="flex-[2]" onClick={submitManto}>Enviar Reporte</IndustrialButton>
        </div>
        {aiAnalysis && <div className="p-6 bg-indigo-50 rounded-3xl text-sm font-bold text-indigo-900 border border-indigo-100 italic">"{aiAnalysis}"</div>}
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {myMachines.map(m => (
        <Card key={m.id}>
          <h3 className="text-xl font-black text-slate-800 uppercase mb-8">{m.name}</h3>
          <IndustrialButton fullWidth onClick={() => setSelectedMachine(m)}>Mantenimiento Diario</IndustrialButton>
        </Card>
      ))}
    </div>
  );
};

// Vista Líder
const LeaderView: React.FC<{ user: User; machines: Machine[]; records: MaintenanceRecord[] }> = ({ machines, records }) => {
  const alerts = records.filter(r => r.isIssue);
  return (
    <div className="space-y-12">
      <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Alertas Activas</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {alerts.map(r => (
          <Card key={r.id} className="border-l-8 border-red-600">
            <h4 className="font-black text-slate-800 uppercase mb-4">{machines.find(m => m.id === r.machineId)?.name}</h4>
            <p className="text-slate-600 italic mb-6">"{r.observations}"</p>
            <IndustrialButton variant="outline" className="py-2">Marcar como Resuelto</IndustrialButton>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Vista Manager
const ManagerView: React.FC<{ users: User[]; machines: Machine[]; records: MaintenanceRecord[]; onResetKey: () => void }> = ({ users, machines, records, onResetKey }) => {
  const [activePanel, setActivePanel] = useState<'KPI' | 'AI'>('KPI');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const total = machines.length;
    const due = machines.filter(m => isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays))).length;
    return [{ name: 'Al Día', value: total - due, color: '#10b981' }, { name: 'Vencidas', value: due, color: '#f97316' }];
  }, [machines]);

  const getAiAudit = async () => {
    setLoading(true);
    try {
      // Fix: Initialize GoogleGenAI with process.env.API_KEY right before use
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analiza: ${JSON.stringify(records.slice(0, 10))}. Resume los 3 problemas de mantenimiento más frecuentes detectados en la planta este mes.`;
      const result = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
      // Fix: Access result.text property (not a method)
      setAiReport(result.text);
    } catch (e: any) {
      // Fix: Reset key selection if entity not found
      if (e?.message?.toLowerCase().includes("not found")) onResetKey();
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex bg-white p-2 rounded-[2rem] border w-fit mx-auto shadow-xl">
        <button className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase ${activePanel === 'KPI' ? 'bg-orange-600 text-white' : 'text-slate-400'}`} onClick={() => setActivePanel('KPI')}>Estadísticas</button>
        <button className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 ${activePanel === 'AI' ? 'bg-indigo-600 text-white' : 'text-indigo-400'}`} onClick={() => setActivePanel('AI')}><BrainCircuit className="w-3 h-3"/> Auditoría IA</button>
      </div>

      {activePanel === 'KPI' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Card className="flex flex-col items-center">
            <h3 className="text-xl font-black uppercase text-slate-700 w-full border-b pb-6 mb-8">Disponibilidad Planta</h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value">
                    {stats.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h3 className="text-xl font-black uppercase text-slate-700 border-b pb-6 mb-8">Últimos Eventos</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4">
              {records.slice(0, 10).map(r => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between">
                  <span className="font-black uppercase text-[10px]">{machines.find(m => m.id === r.machineId)?.name}</span>
                  <span className="text-[9px] text-slate-400 uppercase">{format(parseISO(r.date), 'dd/MM HH:mm')}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="border-indigo-100 text-center space-y-8">
          <div className="p-6 bg-indigo-600 rounded-[2.5rem] text-white mx-auto w-fit shadow-2xl shadow-indigo-100"><Sparkles className="w-12 h-12" /></div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Auditoría Predictiva Gemini</h3>
          <IndustrialButton variant="ai" className="mx-auto" onClick={getAiAudit} disabled={loading}>{loading ? 'Generando Reporte...' : 'Escanear Historial Planta'}</IndustrialButton>
          {aiReport && <div className="p-10 bg-white rounded-[3rem] border border-indigo-50 shadow-2xl text-left font-bold text-slate-700 leading-relaxed italic animate-in fade-in slide-in-from-bottom-4">"{aiReport}"</div>}
        </Card>
      )}
    </div>
  );
};
