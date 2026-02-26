export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900">Visão Geral Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total RH', count: '124', color: 'bg-green-500' },
          { label: 'Lucro Líquido', count: 'R$ 45k', color: 'bg-blue-500' },
          { label: 'Atendimentos', count: '89', color: 'bg-orange-500' },
          { label: 'Pendências', count: '12', color: 'bg-red-500' },
        ].map((card) => (
          <div key={card.label} className="flex flex-col rounded-xl bg-white p-6 shadow-sm border border-gray-100 items-center justify-center space-y-2">
            <span className="text-sm font-medium text-gray-500">{card.label}</span>
            <span className="text-3xl font-bold text-gray-900">{card.count}</span>
            <div className={`mt-2 h-1 w-full rounded-full ${card.color}`}></div>
          </div>
        ))}
      </div>
    </div>
  );
}
