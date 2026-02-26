import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-green-50 to-green-100">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col space-y-8">
        <h1 className="text-6xl font-black text-green-800 text-center uppercase tracking-tighter">
          Grupo AGROSERV
        </h1>
        <p className="text-xl text-green-700 text-center font-sans max-w-2xl px-4">
          O sistema completo para gestão de Recursos Humanos, Financeiro e Logística da sua empresa agropecuária.
        </p>
        <div className="flex gap-4">
          <Link 
            href="/login" 
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-green-600 text-white gap-2 hover:bg-green-700 text-base h-12 px-8 font-bold"
          >
            Acessar Sistema
          </Link>
        </div>
      </div>
    </main>
  );
}
