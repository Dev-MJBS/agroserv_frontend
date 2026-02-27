'use client';

import { useState, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Tipagens para os resultados da API
interface ComparisonResults {
  conferem: string[];
  faltam_no_base: string[];
  faltam_no_comparacao: string[];
  termos_desconhecidos: string[];
}

const COLORS = ['#22c55e', '#ef4444', '#f97316', '#64748b']; // Verde, Vermelho, Laranja, Cinza

export default function ComparacaoLogisticaPage() {
  // Estados de fluxo e dados
  const [step, setStep] = useState<number>(1);
  const [fileBase, setFileBase] = useState<File | null>(null);
  const [fileCompare, setFileCompare] = useState<File | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [results, setResults] = useState<ComparisonResults | null>(null);
  
  // Estados de UI
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Refs para os inputs de ficheiro
  const fileBaseRef = useRef<HTMLInputElement>(null);
  const fileCompareRef = useRef<HTMLInputElement>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

  // Passo 1: Enviar ficheiro base para analisar colunas
  const handleAnalyzeColumns = async () => {
    if (!fileBase) {
      setError('Por favor, selecione o documento base primeiro.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    // ESSENCIAL: O nome 'arquivo' deve bater com o parâmetro UploadFile na rota FastAPI
    formData.append('arquivo', fileBase);

    try {
      const response = await fetch(`${apiUrl}/logistica/analisar-colunas`, {
        method: 'POST',
        body: formData,
        // REGRA DE OURO: NÃO DEFINA "Content-Type" manualmente. O browser cuidará do 'boundary'.
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Erro no servidor: ${JSON.stringify(errorData) || response.statusText}`);
      }

      const data = await response.json();
      // Assumindo que a API devolve { colunas: ['col1', 'col2'] } ou um array direto
      const columns = Array.isArray(data) ? data : data.colunas || [];
      
      if (columns.length === 0) throw new Error('Nenhuma coluna encontrada no documento.');

      setAvailableColumns(columns);
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao processar o ficheiro.');
    } finally {
      setLoading(false);
    }
  };

  // Passo 2: Gerir seleção de colunas
  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    );
  };

  // Passo 4: Enviar ambos os ficheiros e colunas para comparação
  const handleCompare = async () => {
    if (!fileBase || !fileCompare) {
      setError('Ambos os documentos são necessários para a comparação.');
      return;
    }
    if (selectedColumns.length === 0) {
      setError('Selecione pelo menos uma coluna para comparar.');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    // ESSENCIAL: Nomes devem bater com o esperado pelo backend
    formData.append('arquivo_base', fileBase);
    formData.append('arquivo_comparacao', fileCompare);
    // Adiciona as colunas selecionadas
    selectedColumns.forEach(col => formData.append('colunas', col));

    try {
      const response = await fetch(`${apiUrl}/logistica/comparar-documentos`, {
        method: 'POST',
        body: formData,
        // O fetch cuidará do Content-Type e boundary automaticamente
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(`Erro na comparação: ${JSON.stringify(errorData) || response.statusText}`);
      }

      const data: ComparisonResults = await response.json();
      setResults(data);
      setStep(5);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro durante a comparação.');
    } finally {
      setLoading(false);
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
    ].filter(item => item.value > 0); // Remove categorias vazias do gráfico
  };

  // Resetar fluxo
  const resetFlow = () => {
    setStep(1);
    setFileBase(null);
    setFileCompare(null);
    setAvailableColumns([]);
    setSelectedColumns([]);
    setResults(null);
    setError(null);
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
        {[1, 2, 3, 4, 5].map((s) => (
          <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= s ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-500'} transition-colors`}>
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
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
              />
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
              <p className="mt-2 text-sm text-gray-600 font-medium">
                {fileBase ? fileBase.name : 'Clique para selecionar ou arraste o ficheiro'}
              </p>
            </div>

            <button 
              onClick={handleAnalyzeColumns}
              disabled={!fileBase || loading}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex justify-center items-center"
            >
              {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : 'Analisar Colunas'}
            </button>
          </div>
        )}

        {/* PASSO 2: Seleção de Colunas */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold text-gray-800">Passo 2: Selecionar Colunas</h2>
            <p className="text-sm text-gray-500">Quais colunas deseja utilizar como chave de comparação?</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-4 bg-gray-50 rounded-lg border border-gray-200">
              {availableColumns.map((col) => (
                <label key={col} className="flex items-center space-x-3 p-3 bg-white rounded-md shadow-sm border border-gray-100 cursor-pointer hover:border-green-500 transition-colors">
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-5 w-5 text-green-600 rounded focus:ring-green-500"
                    checked={selectedColumns.includes(col)}
                    onChange={() => toggleColumn(col)}
                  />
                  <span className="text-sm font-medium text-gray-700 truncate">{col}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Voltar</button>
              <button 
                onClick={() => setStep(3)}
                disabled={selectedColumns.length === 0}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Continuar ({selectedColumns.length} selecionadas)
              </button>
            </div>
          </div>
        )}

        {/* PASSO 3 e 4: Upload Comparação e Submissão */}
        {(step === 3 || step === 4) && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-semibold text-gray-800">Passo 3: Documento de Comparação</h2>
            <p className="text-sm text-gray-500">Faça o upload do ficheiro que será comparado com a base (ex: Relatório da Transportadora).</p>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 text-center hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => fileCompareRef.current?.click()}>
              <input 
                type="file" 
                className="hidden" 
                ref={fileCompareRef} 
                onChange={(e) => {
                  setFileCompare(e.target.files?.[0] || null);
                  setStep(4);
                }}
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, application/pdf"
              />
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              <p className="mt-2 text-sm text-gray-600 font-medium">
                {fileCompare ? fileCompare.name : 'Clique para selecionar o segundo ficheiro'}
              </p>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(2)} className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50">Voltar</button>
              <button 
                onClick={handleCompare}
                disabled={!fileCompare || loading}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors flex justify-center items-center"
              >
                {loading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span> : 'Comparar Documentos'}
              </button>
            </div>
          </div>
        )}

        {/* PASSO 5: Resultados */}
        {step === 5 && results && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800">Resultados da Comparação</h2>
              <p className="text-gray-500">Análise concluída com sucesso.</p>
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
                <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                  <h3 className="text-green-800 font-bold flex justify-between items-center mb-3">
                    Conferem <span className="bg-green-200 text-green-800 py-1 px-2 rounded-full text-xs">{results.conferem.length}</span>
                  </h3>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {results.conferem.length > 0 ? results.conferem.map((item, i) => (
                      <li key={i} className="text-sm text-green-700 bg-white p-2 rounded shadow-sm">{item}</li>
                    )) : <li className="text-sm text-green-600/50 italic">Nenhum item</li>}
                  </ul>
                </div>

                {/* Faltam no Base */}
                <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                  <h3 className="text-red-800 font-bold flex justify-between items-center mb-3">
                    Faltam no Base <span className="bg-red-200 text-red-800 py-1 px-2 rounded-full text-xs">{results.faltam_no_base.length}</span>
                  </h3>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {results.faltam_no_base.length > 0 ? results.faltam_no_base.map((item, i) => (
                      <li key={i} className="text-sm text-red-700 bg-white p-2 rounded shadow-sm">{item}</li>
                    )) : <li className="text-sm text-red-600/50 italic">Nenhum item</li>}
                  </ul>
                </div>

                {/* Faltam na Comparação */}
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
                  <h3 className="text-orange-800 font-bold flex justify-between items-center mb-3">
                    Faltam na Comparação <span className="bg-orange-200 text-orange-800 py-1 px-2 rounded-full text-xs">{results.faltam_no_comparacao.length}</span>
                  </h3>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {results.faltam_no_comparacao.length > 0 ? results.faltam_no_comparacao.map((item, i) => (
                      <li key={i} className="text-sm text-orange-700 bg-white p-2 rounded shadow-sm">{item}</li>
                    )) : <li className="text-sm text-orange-600/50 italic">Nenhum item</li>}
                  </ul>
                </div>

                {/* Desconhecidos */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h3 className="text-slate-800 font-bold flex justify-between items-center mb-3">
                    Desconhecidos <span className="bg-slate-200 text-slate-800 py-1 px-2 rounded-full text-xs">{results.termos_desconhecidos.length}</span>
                  </h3>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                    {results.termos_desconhecidos.length > 0 ? results.termos_desconhecidos.map((item, i) => (
                      <li key={i} className="text-sm text-slate-700 bg-white p-2 rounded shadow-sm">{item}</li>
                    )) : <li className="text-sm text-slate-600/50 italic">Nenhum item</li>}
                  </ul>
                </div>

              </div>
            </div>
            
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
