import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const THEMES = [
  {
    id: 'pastel',
    name: 'Pastel IUB',
    desc: 'Limpio y equilibrado con toques índigo y tonos suaves',
    accentColor: '#6366f1',
    bgClass: 'bg-slate-50/70',
    cardClass: 'bg-white',
    textClass: 'text-slate-900',
    previewGradient: 'from-indigo-500 via-purple-500 to-pink-500',
    isDark: false
  },
  {
    id: 'dark',
    name: 'Noche Elegante',
    desc: 'Modo oscuro profundo, alto contraste y descanso visual',
    accentColor: '#818cf8',
    bgClass: 'bg-[#090d16]',
    cardClass: 'bg-[#131b2e]',
    textClass: 'text-slate-100',
    previewGradient: 'from-slate-950 via-slate-900 to-indigo-950',
    isDark: true
  },
  {
    id: 'lavender',
    name: 'Lavanda Soft',
    desc: 'Estilo pastel lila y violeta delicado para un ambiente armónico',
    accentColor: '#8b5cf6',
    bgClass: 'bg-[#f6f4fe]',
    cardClass: 'bg-white',
    textClass: 'text-slate-900',
    previewGradient: 'from-violet-400 via-purple-300 to-indigo-400',
    isDark: false
  },
  {
    id: 'mint',
    name: 'Menta Fresh',
    desc: 'Frescura pastel en verdes suaves y menta estimulante',
    accentColor: '#10b981',
    bgClass: 'bg-[#f0fbf6]',
    cardClass: 'bg-white',
    textClass: 'text-slate-900',
    previewGradient: 'from-emerald-400 via-teal-300 to-emerald-500',
    isDark: false
  },
  {
    id: 'sunset',
    name: 'Atardecer Cálido',
    desc: 'Toques cálidos melocotón, durazno pastel y energía positiva',
    accentColor: '#f97316',
    bgClass: 'bg-[#fff8f4]',
    cardClass: 'bg-white',
    textClass: 'text-slate-900',
    previewGradient: 'from-orange-400 via-amber-300 to-rose-400',
    isDark: false
  }
];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const guardado = localStorage.getItem('camisas_iub_theme');
      if (guardado && THEMES.some(t => t.id === guardado)) {
        return guardado;
      }
    } catch {
      // fallback
    }
    return 'pastel';
  });

  const setTheme = (nuevoTema) => {
    setThemeState(nuevoTema);
    try {
      localStorage.setItem('camisas_iub_theme', nuevoTema);
    } catch (e) {
      console.warn("No se pudo guardar el tema:", e);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const currentThemeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES, currentThemeConfig }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
}
