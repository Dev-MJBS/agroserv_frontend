'use client';

import React, { useState, useRef } from 'react';
import axios from 'axios';
import { 
  Upload, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Cpu, 
  Download, 
  Trash2, 
  RefreshCcw,
  PlusCircle,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Utility ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface ColumnMapping {
  col1: string;
  col2: string;
  prompt: string;
}

interface ComparisonResults {
  conferem: string[];
  faltam_no_base: string[];
  faltam_no_comparacao: string[];
  termos_desconhecidos: string[];
  analise_ia?: string;
}

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#64748b'];

// --- Helper Components ---
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  loading = false, 
  variant = 'primary', 
  className,
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) => {
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    ghost: "bg-transparent text-slate-500 hover:bg-slate-100"
  };

  return (
    <button 
      className={cn(
        "px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm",
        variants[variant],
        className
      )} 
      disabled={loading || props.disabled} 
      {...props}
    >
      {loading ? <RefreshCcw className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
};

export default function LogisticaInteligentePage() {
  // --- States ---
  const [step, setStep] = useState<1 | 2 | 3>(1); 
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [cols1, setCols1] = useState<string[]>([]);
  const [cols2, setCols2] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [results, setResults] = useState<ComparisonResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '') + '/api';

  // --- Handlers ---
  const analyzeFile = async (file: File) => {
    const formData = new FormData();
    formData.append('arquivo', file);
    const res = await axios.post(`${apiUrl}/logistica/analisar-colunas`, formData);
    return Array.isArray(res.data) ? res.data : res.data.colunas || [];
  };

  const handleUploadAndAnalyze = async () => {
    if (!file1 || !file2) {
      setError("Por favor, selecione os dois arquivos para comparação.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [res1, res2] = await Promise.all([
        analyzeFile(file1),
        analyzeFile(file2)
      ]);

      setCols1(res1);
      setCols2(res2);
      
      const initialMappings = res1.slice(0, 3).map((c1: string) => ({
        col1: c1,
        col2: '',
        prompt: ''
      }));
      setMappings(initialMappings.length > 0 ? initialMappings : [{ col1: '', col2: '', prompt: '' }]);
      
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.message || "Erro ao analisar colunas. Verifique o formato dos arquivos.");
    } finally {
      setLoading(false);
    }
  };

  const handleRunComparison = async () => {
    const validMappings = mappings.filter(m => m.col1 && m.col2);
    if (validMappings.length === 0) {
      setError("Adicione pelo menos um mapeamento válido.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('arquivo_1', file1!);
    formData.append('arquivo_2', file2!);
    formData.append('mapeamento', JSON.stringify(validMappings));

    try {
      const { data } = await axios.post(`${apiUrl}/logistica/comparar-documentos`, formData);
      setResults(data);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.message || "Algo deu errado durante a comparação estratégica.");
    } finally {
      setLoading(false);
    }
  };

  const addMappingRow = () => {
    setMappings([...mappings, { col1: '', col2: '', prompt: '' }]);
  };

  const removeMappingRow = (index: number) => {
    setMappings(mappings.filter((_, i) => i !== index));
  };

  const updateMapping = (index: number, key: keyof ColumnMapping, value: string) => {
    const newMappings = [...mappings];
    newMappings[index] = { ...newMappings[index], [key]: value };
    setMappings(newMappings);
  };

  const resetAll = () => {
    setStep(1);
    setFile1(null);
    setFile2(null);
    setMappings([]);
    setResults(null);
    setError(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 p-4 md:p-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
              Logística Inteligente
            </span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Auditoria de Documentos <span className="text-emerald-600">IA</span>
          </h1>
          <p className="text-slate-500 font-medium">Conciliação estratégica e análise de divergências com Gemini 2.0</p>
        </div>
        
        {step > 1 && (
          <Button variant="secondary" onClick={resetAll}>
            <RefreshCcw className="w-4 h-4" /> Nova Auditoria
          </Button>
        )}
      </header>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-start gap-3 text-rose-800 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{error}</p>
        </motion.div>
      )}

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Documento Base (Arquivo 1)</label>
              <div 
                onClick={() => fileInputRef1.current?.click()}
                className={cn(
                  "group border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer h-64",
                  file1 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                )}
              >
                <input type="file" ref={fileInputRef1} className="hidden" onChange={(e) => setFile1(e.target.files?.[0] || null)} />
                <div className={cn(
                  "p-4 rounded-full mb-4 transition-transform group-hover:scale-110",
                  file1 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  {file1 ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>
                <h3 className="font-bold text-slate-900 text-center">{file1 ? file1.name : "Selecionar Documento Principal"}</h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-tighter">Excel, CSV ou Planilha do Sistema</p>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-slate-700 uppercase tracking-wide">Documento Auditoria (Arquivo 2)</label>
              <div 
                onClick={() => fileInputRef2.current?.click()}
                className={cn(
                  "group border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all cursor-pointer h-64",
                  file2 ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:border-emerald-400 hover:bg-slate-50'
                )}
              >
                <input type="file" ref={fileInputRef2} className="hidden" onChange={(e) => setFile2(e.target.files?.[0] || null)} />
                <div className={cn(
                  "p-4 rounded-full mb-4 transition-transform group-hover:scale-110",
                  file2 ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  {file2 ? <CheckCircle2 className="w-8 h-8" /> : <Upload className="w-8 h-8" />}
                </div>
                <h3 className="font-bold text-slate-900 text-center">{file2 ? file2.name : "Selecionar Documento Comparação"}</h3>
                <p className="text-xs text-slate-500 mt-1 uppercase tracking-tighter">Canhotos, XMLs ou Logística Terceira</p>
              </div>
            </div>

            <div className="md:col-span-2 pt-6">
              <Button 
                onClick={handleUploadAndAnalyze} 
                loading={loading} 
                className="w-full h-16 text-xl shadow-lg border-2 border-emerald-700"
                disabled={!file1 || !file2}
              >
                {!file1 || !file2 ? "Aguardando arquivos..." : "Prosseguir para Mapeamento"} 
                <ArrowRight className="ml-2 w-6 h-6" />
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <Card>
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Mapeamento de Auditoria</h3>
                  <p className="text-sm text-slate-500">Defina quais colunas devem ser comparadas e adicione regras da IA.</p>
                </div>
                <Button variant="secondary" onClick={addMappingRow} className="!py-2">
                  <PlusCircle className="w-4 h-4" /> Adicionar Par
                </Button>
              </div>

              <div className="p-6">
                <div className="space-y-6">
                  {mappings.map((map, index) => (
                    <motion.div 
                      key={index} 
                      className="flex flex-col lg:flex-row gap-4 p-5 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-md transition-all shadow-sm group"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Documento Base</label>
                        <select 
                          className="w-full h-11 px-4 rounded-xl border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 transition-all bg-white shadow-xs appearance-none"
                          value={map.col1}
                          onChange={(e) => updateMapping(index, 'col1', e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {cols1.map((c: string) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="flex items-center justify-center pt-6 text-slate-300">
                        <ChevronRight className="w-6 h-6 hidden lg:block" />
                      </div>

                      <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Documento Auditoria</label>
                        <select 
                          className="w-full h-11 px-4 rounded-xl border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 transition-all bg-white shadow-xs appearance-none"
                          value={map.col2}
                          onChange={(e) => updateMapping(index, 'col2', e.target.value)}
                        >
                          <option value="">Selecione...</option>
                          {cols2.map((c: string) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div className="lg:flex-[2.5] space-y-2">
                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest pl-1 flex items-center gap-1">
                          <Cpu className="w-3 h-3" /> Regra Estratégica (Opcional)
                        </label>
                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            placeholder="Ex: 'Ignorar zeros' ou 'Converter para KG'"
                            className="flex-1 h-11 px-4 rounded-xl border-emerald-100 bg-emerald-50/30 text-emerald-900 placeholder:text-emerald-400 focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
                            value={map.prompt}
                            onChange={(e) => updateMapping(index, 'prompt', e.target.value)}
                          />
                          <button 
                            onClick={() => removeMappingRow(index)}
                            className="h-11 w-11 flex items-center justify-center rounded-xl text-rose-400 hover:bg-rose-50 transition-colors border border-rose-100"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={handleRunComparison} loading={loading} className="px-10 h-12 text-md">
                  Processar Auditoria Inteligente <Cpu className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}

        {step === 3 && results && (
          <motion.div key="step3" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
            <AnimatePresence>
              {results.analise_ia && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Cpu className="w-64 h-64 rotate-12" />
                  </div>
                  
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-2 bg-emerald-500/20 rounded-xl backdrop-blur-sm">
                        <Cpu className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h2 className="text-3xl font-black tracking-tight">Análise Executiva</h2>
                    </div>
                    <div className="max-w-4xl text-emerald-50 text-xl leading-relaxed font-medium italic">
                      "{results.analise_ia}"
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <Card className="p-8">
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs mb-8 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Resumo das Conformidades
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Conferem', value: results?.conferem?.length || 0 },
                            { name: 'Faltas Base', value: results?.faltam_no_base?.length || 0 },
                            { name: 'Faltas Auditoria', value: results?.faltam_no_comparacao?.length || 0 },
                            { name: 'Desconhecidos', value: results?.termos_desconhecidos?.length || 0 },
                          ].filter(d => d.value > 0)}
                          cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={8} dataKey="value"
                        >
                          {COLORS.map((color, i) => <Cell key={i} fill={color} stroke="none" />)}
                        </Pie>
                        <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </Card>

               <div className="grid grid-cols-1 gap-6">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-black text-emerald-900 text-sm uppercase tracking-widest pl-1">Conferência OK</span>
                      <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full">{results?.conferem?.length || 0}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-emerald-200">
                      {results?.conferem?.length ? results.conferem.map((v, i) => (
                        <div key={i} className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-xs font-bold text-emerald-800 border border-emerald-100/50">{v}</div>
                      )) : <p className="text-xs text-emerald-400 italic text-center py-4">Nenhum item conciliado ainda.</p>}
                    </div>
                  </div>

                  <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-black text-rose-900 text-sm uppercase tracking-widest pl-1">Divergências</span>
                      <span className="bg-rose-600 text-white text-xs font-black px-3 py-1 rounded-full">{results?.faltam_no_base?.length || 0}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-rose-200">
                       {results?.faltam_no_base?.length ? results.faltam_no_base.map((v, i) => (
                        <div key={i} className="bg-white/80 backdrop-blur-sm p-3 rounded-xl text-xs font-bold text-rose-800 border border-rose-100/50">{v}</div>
                      )) : <p className="text-xs text-rose-400 italic text-center py-4">Zero divergências encontradas.</p>}
                    </div>
                  </div>
               </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-10 border-t border-slate-100">
               <Button className="w-full md:w-auto px-8 bg-slate-900 hover:bg-slate-800">
                  <Download className="w-4 h-4" /> Baixar Relatório Executivo (.CSV)
               </Button>
               <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] order-first md:order-last">
                 AGROSERV ERP • PLATAFORMA DE INTELIGÊNCIA LOGÍSTICA
               </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
