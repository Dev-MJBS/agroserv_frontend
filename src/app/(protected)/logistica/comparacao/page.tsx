'use client';

import { useState, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Tipagens para os resultados da API
interface ComparisonResults {
  conferem: string[];
  faltam_no_base: string[];
  faltam_no_comparacao: string[];
  termos_desconhecidos: string[];
  analise_ia?: string; // Análise estratégica gerada pelo Gemini 2.0
}

interface ColumnMapping {
  col1: string;
  col2: string;
}

const COLORS = ['#22c55e', '#ef4444', '#f97316', '#64748b']; // Verde, Vermelho, Laranja, Cinza

export default function ComparacaoLogisticaPage() {
  // Estados de fluxo e dados
  const [step, setStep] = useState<number>(1);
  const [fileBase, setFileBase] = useState<File | null>(null);
  const [fileCompare, setFileCompare] = useState<File | null>(null);
  
  // Colunas extraídas de cada ficheiro
  const [colsFile1, setColsFile1] = useState<string[]>([]);
  const [colsFile2, setColsFile2] = useState<string[]>([]);
  
  // Mapeamento selecionado: [{ col1: 'A', col2: 'B' }]
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [results, setResults] = useState<ComparisonResults | null>(null);
  const [analyzeIA, setAnalyzeIA] = useState<string | null>(null); // Armazena a análise da IA
  
  // Estados de UI
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [comparisonId, setComparisonId] = useState<string | null>(null);

  // Refs para os inputs de ficheiro
  const fileBaseRef = useRef<HTMLInputElement>(null);
  const fileCompareRef = useRef<HTMLInputElement>(null);

  // Base da API centralizada com o prefixo /api
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '') + '/api';

  // Passo 1: Analisar colunas do Ficheiro 1 (Base)
  const handleAnalyzeBase = async () => {
    if (!fileBase) {
      setError('Por favor, selecione o documento base primeiro.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('arquivo', fileBase);

    try {
      const response = await fetch(`${apiUrl}/logistica/analisar-colunas`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erro do Backend:", data);
        const msg = data.message || data.detail || 'Falha ao analisar o ficheiro.';
        alert(`Erro no Backend: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
        throw new Error(msg);
      }

      const columns = Array.isArray(data) ? data : data.colunas || [];
      
      if (columns.length === 0) throw new Error('Nenhuma coluna encontrada no documento.');

      setColsFile1(columns);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar o ficheiro.');
    } finally {
      setLoading(false);
    }
  };

  // Passo 3: Analisar colunas do Ficheiro 2 (Comparação)
  const handleAnalyzeCompare = async () => {
    if (!fileCompare) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('arquivo', fileCompare);

    try {
      const response = await fetch(`${apiUrl}/logistica/analisar-colunas`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erro do Backend:", data);
        const msg = data.message || data.detail || 'Falha ao analisar o ficheiro.';
        alert(`Erro no Backend: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
        throw new Error(msg);
      }

      const columns = Array.isArray(data) ? data : data.colunas || [];
      setColsFile2(columns);
      setStep(3); // Vai para o ecrã de Mapeamento
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Atualizar mapeamento
  const updateMapping = (col1: string, col2: string) => {
    setMappings(prev => {
      const filtered = prev.filter(m => m.col1 !== col1);
      if (col2 === "") return filtered;
      return [...filtered, { col1, col2 }];
    });
  };

  // Passo Final: Comparar com Mapeamento
  const handleCompare = async () => {
    if (!fileBase || !fileCompare || mappings.length === 0) {
      setError('Ambos os documentos e ao menos um mapeamento são necessários.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setComparisonId(null);

    const formData = new FormData();
    // NOMES EXATOS QUE O BACKEND ESPERA (arquivo_1, arquivo_2, mapeamento)
    formData.append('arquivo_1', fileBase);
    formData.append('arquivo_2', fileCompare);
    formData.append('mapeamento', JSON.stringify(mappings));

    try {
      const response = await fetch(`${apiUrl}/logistica/comparar-documentos`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      // 1. VERIFICAÇÃO CRUCIAL: Se a resposta não for OK, pare aqui!
      if (!response.ok) {
        console.error("Erro retornado pelo servidor:", result);
        const msg = result.message || result.detail || "Falha na análise dos documentos";
        alert(`Erro: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
        return; // Impede que o código abaixo execute e quebre o app
      }

      // 2. VERIFICAÇÃO DE DADOS: Use 'optional chaining' (?.) para segurança
      if (result?.conferem) {
        setResults(result);
        setAnalyzeIA(result.analise_ia || null); // Captura a análise da IA
        setStep(4);
      } else {
        console.warn("Nenhum dado retornado ou formato inesperado", result);
        setError("O servidor não retornou dados de comparação válidos.");
      }
    } catch (error: any) {
      console.error("Erro de conexão com o servidor:", error);
      setError(error.message || 'Erro de rede ou conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar Comparação
  const handleSave = async () => {
    if (!results) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`${apiUrl}/logistica/salvar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: results,
          name: `Comparação - ${new Date().toLocaleDateString()}`,
          mappings: mappings,
          analise_ia: analyzeIA // Inclui a análise da IA no salvamento
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erro do Backend:", data);
        const msg = data.message || data.detail || 'Erro ao salvar.';
        alert(`Erro no Backend: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
        throw new Error(msg);
      }
      
      setComparisonId(data.id || "temp-id"); // Se o backend retornar o ID
      setSuccess('Comparação salva com sucesso!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Excluir Comparação
  const handleDelete = async () => {
    if (!comparisonId) return;
    if (!confirm('Tem certeza que deseja excluir esta comparação salva?')) return;

    setSaving(true);
    try {
      const response = await fetch(`${apiUrl}/logistica/excluir-comparacao/${comparisonId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Erro do Backend:", data);
        const msg = data.message || data.detail || 'Erro ao excluir.';
        alert(`Erro no Backend: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
        throw new Error(msg);
      }
      
      setComparisonId(null);
      setSuccess('Comparação removida.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Exportar PDF
  const handleExportPDF = async () => {
    if (!results) return;
    setExporting(true);
    setError(null);

    try {
      const response = await fetch(`${apiUrl}/logistica/exportar-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ message: 'Erro ao gerar PDF.' }));
        console.error("Erro do Backend:", data);
        const msg = data.message || data.detail || 'Erro ao gerar PDF.';
        alert(`Erro no Backend: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`);
        throw new Error(msg);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparacao_${new Date().getTime()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  // Preparar dados para o gráfico
  const getChartData = () => {
    if (!results) return [];
    return [
      { name: 'Conferem', value: results.conferem?.length || 0 },
      { name: 'Faltam no Base', value: results.faltam_no_base?.length || 0 },
      { name: 'Faltam na Comparação', value: results.faltam_no_comparacao?.length || 0 },
      { name: 'Desconhecidos', value: results.termos_desconhecidos?.length || 0 },
    ].filter(item => item.value > 0);
  };

  // Resetar fluxo
  const resetFlow = () => {
    setStep(1);
    setFileBase(null);
    setFileCompare(null);
    setColsFile1([]);
    setColsFile2([]);
    setMappings([]);
    setResults(null);
    setAnalyzeIA(null);
    setError(null);
    setSuccess(null);
    setComparisonId(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Comparação de Documentos</h1>
          <p className="text-gray-500 mt-1">Módulo de Logística - Conciliação de Cargas e Entregas</p>
        </div>
        {step > 1 && (
          <button onClick={resetFlow} className="text-sm text-gray-500 hover:text-gray-700 underline">
            Recomeçar
          </button>
        )}
      </div>

      {/* Indicador de Passos */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'} transition-all shadow-sm`}>
            {s}
          </div>
        ))}
      </div>

      {/* Mensagem de Erro Global */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Mensagem de Sucesso */}
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-md">
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
        
        {/* PASSO 1: Upload Base */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold text-gray-800">Passo 1: Documento Base</h2>
            <p className="text-sm text-gray-500">Faça o upload do ficheiro principal (ex: Relatório do Sistema).</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileBaseRef.current?.click()}>
              <input 
                type="file" 
                className="hidden" 
                ref={fileBaseRef} 
                onChange={(e) => setFileBase(e.target.files?.[0] || null)}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              />
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <p className="mt-2 text-sm text-gray-600 font-medium">
                {fileBase ? fileBase.name : 'Clique para selecionar o primeiro ficheiro'}
              </p>
            </div>

            <button 
              onClick={handleAnalyzeBase}
              disabled={!fileBase || loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex justify-center items-center"
            >
              {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : 'Analisar Documento Base'}
            </button>
          </div>
        )}

        {/* PASSO 2: Upload Ficheiro 2 */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold text-gray-800">Passo 2: Documento de Comparação</h2>
            <p className="text-sm text-gray-500">Faça o upload do segundo ficheiro para podermos extrair as colunas.</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileCompareRef.current?.click()}>
              <input 
                type="file" 
                className="hidden" 
                ref={fileCompareRef} 
                onChange={(e) => setFileCompare(e.target.files?.[0] || null)}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
              />
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <p className="mt-2 text-sm text-gray-600 font-medium">{fileCompare ? fileCompare.name : 'Selecione o segundo ficheiro'}</p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Voltar</button>
              <button 
                onClick={handleAnalyzeCompare}
                disabled={!fileCompare || loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex justify-center items-center"
              >
                {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : 'Analisar Colunas'}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3: Mapeamento de Colunas */}
        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold text-gray-800">Passo 3: Mapear Colunas</h2>
            <p className="text-sm text-gray-500">Relacione as colunas da Base com as colunas da Comparação.</p>
            
            <div className="max-h-96 overflow-y-auto space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              {colsFile1.map((col1) => (
                <div key={col1} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center bg-white p-3 rounded-lg shadow-sm border border-gray-100 italic">
                  <div className="text-md font-extrabold text-green-900 truncate uppercase tracking-wider">{col1}</div>
                  <select 
                    className="block w-full text-md border-gray-400 rounded-lg focus:ring-green-600 focus:border-green-600 shadow-md text-black font-bold bg-white cursor-pointer hover:bg-gray-50 transition-colors"
                    onChange={(e) => updateMapping(col1, e.target.value)}
                    value={mappings.find(m => m.col1 === col1)?.col2 || ""}
                  >
                    <option value="">Não mapear</option>
                    {colsFile2.map(col2 => (
                      <option key={col2} value={col2}>{col2}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-100">
              <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Voltar</button>
              <button 
                onClick={handleCompare}
                disabled={mappings.length === 0 || loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors flex justify-center items-center"
              >
                {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : `Comparar (${mappings.length} mapeadas)`}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 4: Resultados */}
        {step === 4 && results && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-left">
                <h2 className="text-2xl font-bold text-gray-800">Resultados da Comparação</h2>
                <p className="text-gray-500">Análise concluída com sucesso.</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={handleExportPDF}
                  disabled={exporting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {exporting ? 'Gerando...' : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                      PDF
                    </>
                  )}
                </button>

                {!comparisonId ? (
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Salvando...' : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 002-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                        Salvar
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={handleDelete}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors disabled:opacity-50 border border-red-100"
                  >
                    {saving ? 'Excluindo...' : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        Excluir Salva
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Gráfico */}
              <div className="lg:col-span-1 bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
                <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Visão Geral</h3>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Listas de Resultados */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Conferem */}
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm">
                  <h3 className="text-green-800 font-bold flex justify-between items-center mb-3">
                    Conferem <span className="bg-green-200 text-green-800 py-1 px-2 rounded-full text-xs">{results.conferem.length}</span>
                  </h3>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {results.conferem.length > 0 ? results.conferem.map((item, i) => (
                      <li key={i} className="text-sm text-green-700 bg-white p-2 rounded shadow-sm border border-green-50">{item}</li>
                    )) : <li className="text-sm text-green-600/50 italic">Nenhum item</li>}
                  </ul>
                </div>

                {/* Faltam no Base */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
                  <h3 className="text-red-800 font-bold flex justify-between items-center mb-3">
                    Faltam no Base <span className="bg-red-200 text-red-800 py-1 px-2 rounded-full text-xs">{results.faltam_no_base.length}</span>
                  </h3>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {results.faltam_no_base.length > 0 ? results.faltam_no_base.map((item, i) => (
                      <li key={i} className="text-sm text-red-700 bg-white p-2 rounded shadow-sm border border-red-50">{item}</li>
                    )) : <li className="text-sm text-red-600/50 italic">Nenhum item</li>}
                  </ul>
                </div>

                {/* Faltam na Comparação */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm">
                  <h3 className="text-orange-800 font-bold flex justify-between items-center mb-3">
                    Faltam na Comparação <span className="bg-orange-200 text-orange-800 py-1 px-2 rounded-full text-xs">{results.faltam_no_comparacao.length}</span>
                  </h3>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {results.faltam_no_comparacao.length > 0 ? results.faltam_no_comparacao.map((item, i) => (
                      <li key={i} className="text-sm text-orange-700 bg-white p-2 rounded shadow-sm border border-orange-50">{item}</li>
                    )) : <li className="text-sm text-orange-600/50 italic">Nenhum item</li>}
                  </ul>
                </div>

                {/* Desconhecidos */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-slate-800 font-bold flex justify-between items-center mb-3">
                    Desconhecidos <span className="bg-slate-200 text-slate-800 py-1 px-2 rounded-full text-xs">{results.termos_desconhecidos.length}</span>
                  </h3>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {results.termos_desconhecidos.length > 0 ? results.termos_desconhecidos.map((item, i) => (
                      <li key={i} className="text-sm text-slate-700 bg-white p-2 rounded shadow-sm border border-slate-50">{item}</li>
                    )) : <li className="text-sm text-slate-600/50 italic">Nenhum item</li>}
                  </ul>
                </div>

              </div>
            </div>

            {/* Análise de IA */}
            {analyzeIA && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5a4 4 0 100-8 4 4 0 000 8z"></path>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-purple-900 font-bold text-lg mb-2">Análise Estratégica (IA)</h3>
                    <p className="text-purple-800 text-sm leading-relaxed whitespace-pre-wrap">{analyzeIA}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-6 border-t border-gray-100 flex justify-end">
              <button onClick={resetFlow} className="bg-gray-900 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                Nova Comparação
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
