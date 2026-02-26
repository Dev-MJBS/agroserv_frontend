'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase Auth not initialized. Please check your environment variables.");
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Se o Firebase não estiver configurado, apenas exibe a mensagem (pode ocorrer durante build se chaves faltarem)
  if (!auth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-red-50 text-red-700">
        Configuração do Firebase ausente no ambiente.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <svg
            className="h-10 w-10 animate-spin text-green-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="mt-4 text-sm font-medium text-gray-600">Verificando autenticação...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex overflow-hidden h-screen">
      {/* Sidebar Simples */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 text-2xl font-bold border-b border-slate-800">
          Agroserv Admin
        </div>
        <nav className="flex-1 mt-6 px-4 space-y-2">
            <a href="/dashboard" className="block py-2 px-4 rounded hover:bg-slate-800 transition-colors">Dashboard</a>
            <a href="/financeiro" className="block py-2 px-4 rounded hover:bg-slate-800 transition-colors">Financeiro</a>
            <a href="/rh" className="block py-2 px-4 rounded hover:bg-slate-800 transition-colors">RH</a>
            <a href="/logistica" className="block py-2 px-4 rounded hover:bg-slate-800 transition-colors">Logística</a>
        </nav>
        <div className="p-4 border-t border-slate-800">
            <button 
                onClick={() => auth?.signOut()}
                className="w-full text-left py-2 px-4 rounded hover:bg-red-600 transition-colors text-red-400 hover:text-white"
            >
                Sair
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
