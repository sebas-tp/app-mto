
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
  BrainCircuit,
  Loader2
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
  addDoc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { Role, User, Machine, MaintenanceRecord, MaintenanceType } from './types';
import { GoogleGenAI } from "@google/genai";

// --- COMPONENTES ATÓMICOS ---

const IndustrialButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline' | 'ai';
  className?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}> = ({ children, onClick, variant = 'primary', className = '', fullWidth = false, disabled = false }) => {
  const baseStyles = "px-6 py-4 font-extrabold text-sm uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-3 rounded-2xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-200",
    secondary: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-red-200",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200",
    outline: "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    ai: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
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

// --- APP PRINCIPAL ---

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'DASHBOARD'>('LOGIN');
  const [loading, setLoading] = useState(true);
  const [apiKeySelected, setApiKeySelected] = useState<boolean>(false);

  useEffect(() => {
    // Verificar si estamos en un entorno con API Key manejada
    const checkKey = async () => {
      try {
        if ((window as any).aistudio?.hasSelectedApiKey) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setApiKeySelected(hasKey);
        } else {
          setApiKeySelected(true); // Fallback para despliegues directos
        }
      } catch (e) {
        setApiKeySelected(true);
      }
    };
    checkKey();

    // Suscripciones en tiempo real a Firebase
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User)));
      setLoading(false);
    }, (err) => {
      console.error("Error cargando usuarios:", err);
      setLoading(false);
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
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
    }
    // Fix: Assume the key selection was successful to mitigate race condition
    setApiKeySelected(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-12 h-12 text-orange-600 animate-spin mb-4" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Conectando a la Nube...</p>
      </div>
    );
  }

  if (!apiKeySelected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <Card className="max-w-md w-full text-center space-y-8 border-indigo-100">
          <div className="p-5 bg-indigo-100 rounded-full text-indigo-600 mx-auto w-fit">
            <BrainCircuit className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Acceso IA Requerido</h2>
          <p className="text-slate-500 font-bold text-sm leading-relaxed">
            Configure su clave de Gemini para activar las auditorías predictivas en planta.
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
            <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Cloud Infrastructure Active</p>
          </div>
          <Card className="space-y-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Identificación de Usuario</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-lg font-bold outline-none focus:border-orange-500 transition-all" 
                onChange={(e) => handleLogin(e.target.value)} 
                value=""
              >
                <option value="" disabled>-- Seleccione su Identidad --</option>
                {users.length > 0 ? (
                  users.map(u => <option key={u.id} value={u.id}>{u.name} | {u.role}</option>)
                ) : (
                  <option disabled>No hay usuarios configurados</option>
                )}
              </select>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
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
          <button onClick={handleLogout} className="p-4 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all">
            <LogOut className="w-6 h-6" />
          </button>
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

// --- VISTA OPERARIO ---
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
      // Fix: Follow strict initialization guidelines using process.env.API_KEY directly
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analiza esta observación técnica industrial: "${obs}". Identifica nivel de riesgo y acción sugerida. Máximo 15 palabras.`,
      });
      // Fix: Use response.text property directly as per the latest SDK
      setAiAnalysis(response.text || "Análisis completado.");
    } catch (e: any) {
      // Fix: Handle specific error message for key resets according to guidelines
      if (e?.message?.toLowerCase().includes("not found")) onResetKey();
      else setAiAnalysis("Error en análisis de IA.");
    } finally { setIsAnalyzing(false); }
  };

  const submitManto = async () => {
    if (!selectedMachine) return;
    try {
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
      alert("Reporte guardado con éxito.");
    } catch (e) {
      alert("Error guardando en la nube.");
    }
  };

  if (selectedMachine) {
    return (
      <Card className="max-w-2xl mx-auto border-orange-200 animate-in fade-in duration-300">
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-orange-600 mb-8 tracking-widest flex items-center gap-2 hover:translate-x-[-4px] transition-transform">← Volver al Panel</button>
        <h2 className="text-3xl font-black text-slate-800 uppercase mb-8 border-b pb-4">{selectedMachine.name}</h2>
        <div className="space-y-4 mb-8">
          {["Engrase de Rodamientos", "Limpieza de Filtros", "Ajuste de Tornillería", "Calibración Sensores", "Fugas de Presión"].map((t, i) => (
            <label key={i} className={`flex items-center gap-5 p-5 rounded-3xl border-2 cursor-pointer transition-all ${checklist[i] ? 'bg-orange-50 border-orange-500' : 'bg-white border-slate-100'}`}>
              <input type="checkbox" className="w-6 h-6 accent-orange-600" checked={checklist[i]} onChange={() => { const c = [...checklist]; c[i] = !c[i]; setChecklist(c); }} />
              <span className="font-bold text-slate-700">{t}</span>
            </label>
          ))}
        </div>
        <div className="space-y-4 mb-8">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Bitácora de Observaciones</label>
          <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] h-32 outline-none focus:border-orange-500 transition-all text-slate-700" placeholder="Describa ruidos, vibraciones o anomalías detectadas..." value={obs} onChange={e => setObs(e.target.value)} />
        </div>
        <div className="flex gap-4 mb-8">
          <IndustrialButton variant="ai" className="py-2 flex-1" onClick={analyzeWithAI} disabled={isAnalyzing || !obs}>
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            IA Risk
          </IndustrialButton>
          <IndustrialButton className="flex-[2]" onClick={submitManto}>Certificar Mantenimiento</IndustrialButton>
        </div>
        {aiAnalysis && <div className="p-6 bg-indigo-50 rounded-3xl text-sm font-bold text-indigo-900 border border-indigo-100 italic animate-in slide-in-from-top-2 duration-300">"{aiAnalysis}"</div>}
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Mis Equipos</h2>
        <div className="bg-white px-6 py-2 rounded-full border border-slate-100 text-[10px] font-bold text-slate-400 uppercase">Cloud Sync: OK</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {myMachines.length > 0 ? myMachines.map(m => (
          <Card key={m.id} className="hover:border-orange-200 transition-all">
            <h3 className="text-xl font-black text-slate-800 uppercase mb-8">{m.name}</h3>
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black text-slate-400 uppercase">Frecuencia</span>
              <span className="text-sm font-bold text-slate-700">{m.intervalDays} días</span>
            </div>
            <IndustrialButton fullWidth onClick={() => setSelectedMachine(m)}>Iniciar Preventivo</IndustrialButton>
          </Card>
        )) : (
          <p className="col-span-full text-center text-slate-400 font-bold uppercase py-20 italic">No tienes máquinas asignadas</p>
        )}
      </div>
    </div>
  );
};

// --- VISTA LÍDER ---
const LeaderView: React.FC<{ user: User; machines: Machine[]; records: MaintenanceRecord[] }> = ({ machines, records }) => {
  const alerts = records.filter(r => r.isIssue);
  return (
    <div className="space-y-12">
      <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Alertas Activas en Planta</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {alerts.length > 0 ? alerts.map(r => (
          <Card key={r.id} className="border-l-8 border-red-600">
            <div className="flex justify-between items-start mb-4">
              <h4 className="font-black text-slate-800 uppercase">{machines.find(m => m.id === r.machineId)?.name || 'Equipo Desconocido'}</h4>
              <span className="bg-red-100 text-red-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Crítico</span>
            </div>
            <p className="text-slate-600 italic mb-6">"{r.observations || 'Sin observaciones detalladas'}"</p>
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
               <span className="text-[9px] font-black text-slate-400 uppercase">{format(parseISO(r.date), 'dd/MM/yy HH:mm')}</span>
               <IndustrialButton variant="outline" className="py-2 text-[9px] px-4">Intervenir Equipo</IndustrialButton>
            </div>
          </Card>
        )) : (
          <div className="col-span-full text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Planta sin incidencias críticas</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- VISTA MANAGER ---
const ManagerView: React.FC<{ users: User[]; machines: Machine[]; records: MaintenanceRecord[]; onResetKey: () => void }> = ({ machines, records, onResetKey }) => {
  const [activePanel, setActivePanel] = useState<'KPI' | 'AI'>('KPI');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const total = machines.length;
    const due = machines.filter(m => isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays))).length;
    return [
      { name: 'En Norma', value: total - due, color: '#10b981' }, 
      { name: 'Vencidas', value: due, color: '#f97316' }
    ];
  }, [machines]);

  const getAiAudit = async () => {
    setLoading(true);
    try {
      // Fix: Follow strict initialization guidelines using process.env.API_KEY directly
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analiza estos datos de planta: ${JSON.stringify(records.slice(0, 15))}. Resume los 3 riesgos operativos principales en 50 palabras.`;
      // Fix: Use response.text property directly as per the latest SDK
      const result = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
      setAiReport(result.text || "Reporte generado.");
    } catch (e: any) {
      // Fix: Handle specific error message for key resets according to guidelines
      if (e?.message?.toLowerCase().includes("not found")) onResetKey();
      else setAiReport("No se pudo conectar con el motor de IA.");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div className="flex bg-white p-2 rounded-[2rem] border w-fit mx-auto shadow-xl">
        <button className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase transition-all ${activePanel === 'KPI' ? 'bg-orange-600 text-white shadow-lg shadow-orange-200' : 'text-slate-400 hover:text-slate-600'}`} onClick={() => setActivePanel('KPI')}>Dashboard KPI</button>
        <button className={`px-8 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 transition-all ${activePanel === 'AI' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-indigo-400 hover:text-indigo-600'}`} onClick={() => setActivePanel('AI')}><BrainCircuit className="w-3 h-3"/> Auditoría IA</button>
      </div>

      {activePanel === 'KPI' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in duration-500">
          <Card className="flex flex-col items-center">
            <h3 className="text-xl font-black uppercase text-slate-700 w-full border-b pb-6 mb-8 flex justify-between">
              Disponibilidad Activos
              <Database className="text-slate-300 w-5 h-5" />
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={10} dataKey="value">
                    {stats.map((e, i) => <Cell key={i} fill={e.color} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <h3 className="text-xl font-black uppercase text-slate-700 border-b pb-6 mb-8">Eventos Recientes</h3>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-4 custom-scrollbar">
              {records.length > 0 ? records.slice(0, 10).map(r => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-black uppercase text-[10px] text-slate-800">{machines.find(m => m.id === r.machineId)?.name || 'Equipo'}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">{format(parseISO(r.date), 'dd/MM HH:mm')}</span>
                  </div>
                  {r.isIssue ? <AlertTriangle className="w-5 h-5 text-orange-500" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                </div>
              )) : <p className="text-center text-slate-400 font-bold uppercase text-xs py-10">Sin registros históricos</p>}
            </div>
          </Card>
        </div>
      ) : (
        <Card className="border-indigo-100 text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div className="p-6 bg-indigo-600 rounded-[2.5rem] text-white mx-auto w-fit shadow-2xl shadow-indigo-100"><Sparkles className="w-12 h-12" /></div>
          <div className="max-w-xl mx-auto space-y-4">
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Auditoría Predictiva Gemini</h3>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest leading-relaxed">Analizando el historial de planta para detectar fallas recurrentes y optimizar rutas de mantenimiento.</p>
          </div>
          <IndustrialButton variant="ai" className="mx-auto" onClick={getAiAudit} disabled={loading}>{loading ? 'Escaneando...' : 'Escanear Historial Planta'}</IndustrialButton>
          {aiReport && (
            <div className="p-10 bg-white rounded-[3rem] border border-indigo-50 shadow-2xl text-left font-bold text-slate-700 leading-relaxed italic animate-in fade-in slide-in-from-bottom-4">
              <div className="w-1 h-12 bg-indigo-600 absolute left-8 rounded-full"></div>
              "{aiReport}"
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
