export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Visão Geral Dashboard</h1>
      <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="bg-green-100 p-3 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Bem-vindo ao Grupo AGROSERV</h2>
        <p className="text-gray-500 mt-2 max-w-sm">
          Você está autenticado com sucesso. Os dados em tempo real da API serão conectados em breve.
        </p>
      </div>
    </div>
  );
}
