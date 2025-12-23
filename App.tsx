
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
  Loader2,
  RefreshCw
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

// --- COMPONENTES UI ---

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
    primary: "bg-orange-600 hover:bg-orange-700 text-white shadow-orange-100",
    secondary: "bg-slate-800 hover:bg-slate-900 text-white shadow-slate-200",
    danger: "bg-red-600 hover:bg-red-700 text-white shadow-red-200",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200",
    outline: "bg-white border-2 border-slate-200 text-slate-600 hover:bg-slate-50",
    ai: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-indigo-200"
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
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  useEffect(() => {
    // 1. Timeout de seguridad para la carga inicial
    const timer = setTimeout(() => {
      if (loading) setShowDiagnostic(true);
    }, 6000);

    // 2. Verificar API Key de IA usando window.aistudio
    const checkKey = async () => {
      try {
        if ((window as any).aistudio?.hasSelectedApiKey) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setApiKeySelected(hasKey);
        } else {
          setApiKeySelected(true);
        }
      } catch (e) {
        setApiKeySelected(true);
      }
    };
    checkKey();

    // 3. Suscripciones Firebase
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as User));
      setUsers(data);
      setLoading(false);
      setShowDiagnostic(false);
    }, (err) => {
      console.error("Error Firebase Users:", err);
      setLoading(false);
    });

    onSnapshot(collection(db, 'machines'), (snapshot) => {
      setMachines(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Machine)));
    });

    onSnapshot(query(collection(db, 'records'), orderBy('date', 'desc')), (snapshot) => {
      setRecords(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord)));
    });

    const savedUser = localStorage.getItem('tpm_auth_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
      setView('DASHBOARD');
    }

    return () => { clearTimeout(timer); unsubUsers(); };
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
    // Asumir éxito tras llamar al diálogo para evitar race conditions
    setApiKeySelected(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <Loader2 className="w-16 h-16 text-orange-600 animate-spin mb-6" />
        <div className="text-center space-y-2">
          <p className="text-slate-900 font-black uppercase tracking-tighter text-xl">Sincronizando Planta...</p>
          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Infraestructura Cloud TPM Pro</p>
        </div>
        {showDiagnostic && (
          <div className="mt-12 p-8 max-w-sm bg-slate-50 rounded-[2rem] border border-slate-100 animate-in fade-in slide-in-from-bottom-4">
            <p className="text-xs font-bold text-slate-500 mb-4 text-center">¿La carga tarda demasiado? Verifique su conexión o las variables de entorno de Firebase.</p>
            <IndustrialButton variant="outline" fullWidth onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4" /> Reintentar
            </IndustrialButton>
          </div>
        )}
      </div>
    );
  }

  if (!apiKeySelected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <Card className="max-w-md w-full text-center space-y-8 border-indigo-100">
          <div className="p-6 bg-indigo-600 rounded-full text-white mx-auto w-fit shadow-xl shadow-indigo-100">
            <BrainCircuit className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Activar Motor IA</h2>
          <div className="space-y-4">
            <p className="text-slate-500 font-bold text-sm leading-relaxed">
              Es necesario configurar una API Key de Gemini para habilitar el análisis de riesgos y auditorías automáticas.
            </p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-indigo-600 font-bold text-xs uppercase underline hover:text-indigo-800 transition-colors"
            >
              Documentación de Facturación
            </a>
          </div>
          <IndustrialButton variant="ai" fullWidth onClick={handleOpenKeyDialog}>
            Configurar Gemini Pro
          </IndustrialButton>
        </Card>
      </div>
    );
  }

  if (view === 'LOGIN') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
        <div className="w-full max-w-md space-y-12">
          <div className="text-center space-y-6">
            <div className="inline-block p-6 bg-orange-600 rounded-[2.5rem] text-white shadow-2xl shadow-orange-200">
              <Settings className="w-16 h-16 animate-spin-slow" />
            </div>
            <div>
              <h1 className="text-7xl font-black uppercase tracking-tighter text-slate-900 leading-none mb-2">TPM <span className="text-orange-600">PRO</span></h1>
              <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">Industrial Intelligence Platform</p>
            </div>
          </div>
          <Card className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Panel de Acceso</label>
              <select 
                className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-2xl text-lg font-bold outline-none focus:border-orange-500 transition-all cursor-pointer appearance-none shadow-inner" 
                onChange={(e) => handleLogin(e.target.value)} 
                value=""
              >
                <option value="" disabled>-- Seleccione su Perfil --</option>
                {users.length > 0 ? (
                  users.map(u => <option key={u.id} value={u.id}>{u.name} | {u.role}</option>)
                ) : (
                  <option disabled>No hay usuarios registrados en Firebase</option>
                )}
              </select>
            </div>
            {users.length === 0 && (
              <p className="text-[10px] text-red-500 font-bold text-center">Aviso: La base de datos de usuarios está vacía. Configure sus datos en Firestore.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white/90 backdrop-blur-xl border-b border-slate-100 px-8 py-5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-lg shadow-orange-100"><Settings className="w-6 h-6" /></div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">TPM <span className="text-orange-600">PRO</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-900 uppercase leading-none">{currentUser?.name}</p>
            <span className="text-[9px] font-black bg-orange-50 text-orange-600 px-3 py-1 rounded-full uppercase mt-1.5 inline-block tracking-tighter border border-orange-100">{currentUser?.role}</span>
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

// --- VISTAS ESPECÍFICAS ---

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
      // Instanciar GoogleGenAI justo antes del uso para asegurar la API Key actual
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Analiza esta observación industrial: "${obs}". Define criticidad y acción correctiva breve (15 palabras).`,
      });
      // Acceder a .text como propiedad (no método)
      setAiAnalysis(response.text || "Análisis completado satisfactoriamente.");
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes("not found")) onResetKey();
      else setAiAnalysis("Motor de IA no disponible temporalmente.");
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
      alert("Reporte Certificado correctamente.");
    } catch (e) {
      alert("Error de sincronización con la nube.");
    }
  };

  if (selectedMachine) {
    return (
      <Card className="max-w-2xl mx-auto border-orange-100 animate-in fade-in zoom-in-95 duration-300">
        <button onClick={() => setSelectedMachine(null)} className="text-[10px] font-black uppercase text-orange-600 mb-8 tracking-widest flex items-center gap-2">← Volver a Equipos</button>
        <h2 className="text-4xl font-black text-slate-800 uppercase mb-8 leading-none tracking-tighter">{selectedMachine.name}</h2>
        <div className="space-y-3 mb-10">
          {["Engrase Mecánico", "Inspección de Filtros", "Tensión de Bandas", "Prueba de Sensores", "Limpieza de Cabezal"].map((t, i) => (
            <label key={i} className={`flex items-center gap-5 p-5 rounded-[1.5rem] border-2 cursor-pointer transition-all ${checklist[i] ? 'bg-orange-50 border-orange-500 shadow-lg shadow-orange-100' : 'bg-white border-slate-100 hover:border-slate-200'}`}>
              <input type="checkbox" className="w-6 h-6 accent-orange-600" checked={checklist[i]} onChange={() => { const c = [...checklist]; c[i] = !c[i]; setChecklist(c); }} />
              <span className="font-bold text-slate-700">{t}</span>
            </label>
          ))}
        </div>
        <textarea className="w-full p-6 border-2 border-slate-100 rounded-[2rem] h-32 mb-6 outline-none focus:border-orange-500 text-slate-700 font-medium" placeholder="Notas técnicas adicionales..." value={obs} onChange={e => setObs(e.target.value)} />
        <div className="flex gap-4 mb-8">
          <IndustrialButton variant="ai" className="flex-1" onClick={analyzeWithAI} disabled={isAnalyzing || !obs}>
            <Sparkles className={`w-5 h-5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            IA Audit
          </IndustrialButton>
          <IndustrialButton className="flex-[2]" onClick={submitManto}>Enviar Reporte</IndustrialButton>
        </div>
        {aiAnalysis && <div className="p-8 bg-indigo-50 rounded-[2rem] text-sm font-bold text-indigo-900 border border-indigo-100 italic">"{aiAnalysis}"</div>}
      </Card>
    );
  }

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Mis Activos</h2>
        <div className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-full border border-emerald-100 text-[10px] font-black uppercase">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          Status: Cloud Link Active
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {myMachines.map(m => (
          <Card key={m.id} className="group hover:shadow-2xl hover:border-orange-200 transition-all duration-500">
            <h3 className="text-2xl font-black text-slate-800 uppercase mb-8 group-hover:text-orange-600 transition-colors leading-none">{m.name}</h3>
            <div className="flex justify-between items-center mb-10 pb-4 border-b border-slate-50">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan preventivo</span>
              <span className="text-sm font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-lg">Cada {m.intervalDays} días</span>
            </div>
            <IndustrialButton fullWidth onClick={() => setSelectedMachine(m)}>Mantenimiento Diario</IndustrialButton>
          </Card>
        ))}
        {myMachines.length === 0 && <p className="col-span-full py-20 text-center text-slate-400 font-bold uppercase italic tracking-widest">No hay máquinas asignadas a su perfil</p>}
      </div>
    </div>
  );
};

// --- VISTA LÍDER Y MANAGER SIMPLIFICADOS PARA ESTABILIDAD ---
const LeaderView: React.FC<{ user: User; machines: Machine[]; records: MaintenanceRecord[] }> = ({ machines, records }) => (
  <div className="space-y-12 animate-in fade-in duration-500">
    <h2 className="text-5xl font-black text-slate-900 uppercase tracking-tighter">Alertas Activas</h2>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {records.filter(r => r.isIssue).map(r => (
        <Card key={r.id} className="border-l-[12px] border-red-600 bg-red-50/10">
          <h4 className="text-xl font-black text-slate-800 uppercase mb-4">{machines.find(m => m.id === r.machineId)?.name}</h4>
          <p className="text-slate-600 font-medium mb-8 leading-relaxed italic">"{r.observations}"</p>
          <div className="flex items-center justify-between border-t border-red-100 pt-6 mt-auto">
             <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Falla Reportada</span>
             <IndustrialButton variant="outline" className="py-2 text-[9px] px-6">Intervenir</IndustrialButton>
          </div>
        </Card>
      ))}
      {records.filter(r => r.isIssue).length === 0 && <div className="col-span-full py-20 text-center font-black uppercase text-slate-300 tracking-tighter text-3xl">Planta en Condición Óptima</div>}
    </div>
  </div>
);

const ManagerView: React.FC<{ users: User[]; machines: Machine[]; records: MaintenanceRecord[]; onResetKey: () => void }> = ({ machines, records, onResetKey }) => {
  const [activePanel, setActivePanel] = useState<'KPI' | 'AI'>('KPI');
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const stats = useMemo(() => {
    const total = machines.length;
    const due = machines.filter(m => isPast(addDays(parseISO(m.lastMaintenance), m.intervalDays))).length;
    return [{ name: 'Ok', value: total - due, color: '#10b981' }, { name: 'Falla', value: due, color: '#f97316' }];
  }, [machines]);

  const getAiAudit = async () => {
    setLoading(true);
    try {
      // Instanciar GoogleGenAI justo antes del uso
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analiza historial: ${JSON.stringify(records.slice(0, 10))}. Resume riesgos operativos en 20 palabras.`;
      const result = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
      // Acceder a .text como propiedad
      setAiReport(result.text || "Reporte generado con éxito.");
    } catch (e: any) {
      if (e?.message?.toLowerCase().includes("not found")) onResetKey();
      else setAiReport("Error en conexión IA.");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-12">
      <div className="flex bg-white p-2 rounded-[2rem] border shadow-2xl w-fit mx-auto">
        <button className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${activePanel === 'KPI' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-400'}`} onClick={() => setActivePanel('KPI')}>Estadísticas</button>
        <button className={`px-10 py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${activePanel === 'AI' ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400'}`} onClick={() => setActivePanel('AI')}>Auditoría IA</button>
      </div>

      {activePanel === 'KPI' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Card className="h-[450px] flex flex-col items-center justify-center">
            <h3 className="text-xl font-black uppercase text-slate-800 mb-8 w-full border-b pb-4">Disponibilidad de Activos</h3>
            <div className="h-full w-full">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={stats} cx="50%" cy="40%" innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="value">
                    {stats.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="h-[450px]">
             <h3 className="text-xl font-black uppercase text-slate-800 mb-8 border-b pb-4">Últimos Registros</h3>
             <div className="space-y-3 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
               {records.map(r => (
                 <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-white hover:border-orange-200 transition-all">
                   <span className="font-black uppercase text-[10px] text-slate-700">{machines.find(m => m.id === r.machineId)?.name}</span>
                   <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase ${r.isIssue ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                     {r.isIssue ? 'Alerta' : 'Correcto'}
                   </span>
                 </div>
               ))}
             </div>
          </Card>
        </div>
      ) : (
        <Card className="max-w-3xl mx-auto border-indigo-100 text-center py-16 space-y-10">
          <div className="p-8 bg-indigo-600 rounded-[3rem] text-white mx-auto w-fit shadow-2xl shadow-indigo-200 animate-bounce-slow"><Sparkles className="w-16 h-16" /></div>
          <div className="space-y-4">
            <h3 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Auditoría Gemini Pro</h3>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Análisis semántico del historial técnico de la planta</p>
          </div>
          <IndustrialButton variant="ai" className="mx-auto" onClick={getAiAudit} disabled={loading}>
            {loading ? 'Procesando historial...' : 'Generar Reporte Ejecutivo'}
          </IndustrialButton>
          {aiReport && <div className="p-12 bg-indigo-50/50 rounded-[3rem] border border-indigo-100 text-left font-bold text-indigo-900 leading-relaxed italic animate-in fade-in slide-in-from-bottom-8">"{aiReport}"</div>}
        </Card>
      )}
    </div>
  );
};
