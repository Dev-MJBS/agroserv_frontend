'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Brain, Cpu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnaliseIARendererProps {
  text?: string;
  title?: string;
  variant?: 'emerald' | 'blue' | 'slate' | 'dark';
  className?: string;
}

export const AnaliseIARenderer = ({ 
  text, 
  title = "Análise Executiva Agroserv", 
  variant = 'emerald',
  className 
}: AnaliseIARendererProps) => {
  if (!text) return null;

  const variants = {
    emerald: {
      card: "bg-emerald-50/50 border-emerald-100",
      icon: "text-emerald-700 bg-emerald-100/50",
      prose: "prose-emerald prose-headings:text-emerald-900 prose-strong:text-emerald-800",
    },
    blue: {
      card: "bg-blue-50/50 border-blue-100",
      icon: "text-blue-700 bg-blue-100/50",
      prose: "prose-blue prose-headings:text-blue-900 prose-strong:text-blue-800",
    },
    slate: {
      card: "bg-slate-50 border-slate-200",
      icon: "text-slate-700 bg-slate-200/50",
      prose: "prose-slate prose-headings:text-slate-900 prose-strong:text-slate-800",
    },
    dark: {
      card: "bg-slate-900 border-slate-800 text-white",
      icon: "text-emerald-400 bg-emerald-500/10",
      prose: "prose-invert prose-emerald prose-headings:text-emerald-400 prose-strong:text-emerald-300",
    }
  };

  const currentVariant = variants[variant];

  return (
    <div className={cn(
      "p-6 rounded-2xl border shadow-sm transition-all animate-in fade-in slide-in-from-bottom-2",
      currentVariant.card,
      className
    )}>
      <div className="flex items-center gap-3 mb-6">
        <div className={cn("p-2 rounded-xl backdrop-blur-sm", currentVariant.icon)}>
          <Brain className="w-6 h-6" />
        </div>
        <div>
          <h2 className={cn(
            "text-lg font-bold tracking-tight",
            variant === 'dark' ? "text-white" : "text-slate-900"
          )}>
            {title}
          </h2>
          <p className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em]",
            variant === 'dark' ? "text-emerald-400/60" : "text-slate-400"
          )}>
            Processado por Inteligência Artificial
          </p>
        </div>
      </div>

      <article className={cn(
        "prose max-w-none leading-relaxed",
        currentVariant.prose,
        variant === 'dark' ? "text-emerald-50/90" : "text-slate-700"
      )}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {text}
        </ReactMarkdown>
      </article>

      <div className="mt-6 pt-4 border-t border-current/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold opacity-50">
          <Cpu className="w-3 h-3" />
          <span>AGROSERV AI ENGINE v2.0</span>
        </div>
        <div className="text-[10px] font-bold opacity-30">
          DOCUMENTO CONFIDENCIAL
        </div>
      </div>
    </div>
  );
};
