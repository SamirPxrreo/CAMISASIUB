import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Check, X, Sparkles, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { btnPrimario, btnNeutroIcono } from '../lib/buttonStyles';

export default function ThemeModal({ isOpen, onClose }) {
  const { theme, setTheme, themes } = useTheme();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        />

        {/* Modal Box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200/80 p-6 z-10 overflow-hidden"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Palette className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                  Personalizar Tema
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </h3>
                <p className="text-xs text-slate-400">
                  Elige la paleta y estilo visual que mejor se adapte a ti.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className={btnNeutroIcono + ' w-8 h-8'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Opciones de Temas */}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {themes.map((t) => {
              const isSelected = theme === t.id;

              return (
                <motion.div
                  key={t.id}
                  whileHover={{ scale: 1.015, x: 2 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => setTheme(t.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {/* Swatch circular */}
                    <div
                      className={`w-10 h-10 rounded-2xl bg-gradient-to-tr ${t.previewGradient} flex items-center justify-center shadow-xs border border-white/40 text-white shrink-0`}
                    >
                      {t.isDark ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-800">{t.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{t.desc}</p>
                    </div>
                  </div>

                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    isSelected ? 'bg-indigo-600 text-white' : 'border-2 border-slate-200'
                  }`}>
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Se guarda automáticamente en tu navegador
            </span>
            <button
              onClick={onClose}
              className={btnPrimario}
            >
              Listo
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
