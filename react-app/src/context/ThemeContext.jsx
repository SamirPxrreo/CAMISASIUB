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
  },
  {
    id: 'bosque',
    name: 'Bosque Nocturno',
    desc: 'Verde profundo con acentos esmeralda, descansa la vista de noche',
    accentColor: '#34d399',
    bgClass: 'bg-[#04140d]',
    cardClass: 'bg-[#0c2019]',
    textClass: 'text-emerald-50',
    previewGradient: 'from-emerald-900 via-emerald-700 to-emerald-400',
    isDark: true
  },
  {
    id: 'medianoche',
    name: 'Medianoche',
    desc: 'Azul profundo de madrugada, máxima concentración',
    accentColor: '#60a5fa',
    bgClass: 'bg-[#070d1c]',
    cardClass: 'bg-[#0e1830]',
    textClass: 'text-blue-50',
    previewGradient: 'from-blue-950 via-blue-800 to-blue-400',
    isDark: true
  },
  {
    // OJO: el id va sin acentos a proposito. Un id como 'carbón' se rompe
    // entre localStorage, los selectores [data-theme="..."] de index.css y el
    // encoding del archivo: el tema no coincidia y la app caia a Pastel.
    // El nombre visible si lleva acento.
    id: 'carbon',
    name: 'Carbón Cálido',
    desc: 'Gris carbón con acentos naranja, elegante y sobrio',
    accentColor: '#fb923c',
    bgClass: 'bg-[#12100f]',
    cardClass: 'bg-[#1c1917]',
    textClass: 'text-stone-50',
    previewGradient: 'from-stone-800 via-stone-700 to-orange-400',
    isDark: true
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

  const currentThemeConfig = THEMES.find(t => t.id === theme) || THEMES[0];

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.setAttribute('data-theme', theme);

    // data-oscuro agrupa a todos los temas oscuros. Las ~290 reglas de
    // index.css usan [data-oscuro="1"] en vez de [data-theme="dark"], asi que
    // un solo bloque de CSS cubre los cuatro temas oscuros.
    if (currentThemeConfig.isDark) {
      raiz.setAttribute('data-oscuro', '1');
      raiz.classList.add('dark');
    } else {
      raiz.removeAttribute('data-oscuro');
      raiz.classList.remove('dark');
    }
  }, [theme, currentThemeConfig]);

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
