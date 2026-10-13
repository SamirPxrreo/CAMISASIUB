import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shirt, Sparkles, Lock, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginView({ onLoginSuccess }) {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setCargando(true);
    try {
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-tr from-slate-100 via-indigo-50/40 to-slate-100 relative overflow-hidden">
      {/* Círculos decorativos de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-200/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 350, damping: 25 }}
        className="relative w-full max-w-md bg-white rounded-4xl p-8 shadow-xl shadow-indigo-500/10 border border-slate-100 flex flex-col items-center"
      >
        {/* Ícono de la marca */}
        <motion.div
          whileHover={{ rotate: 12, scale: 1.1 }}
          className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-500/25 mb-4"
        >
          <Shirt className="w-8 h-8" />
        </motion.div>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight text-center flex items-center gap-1.5">
          Camisas IUB
          <Sparkles className="w-4 h-4 text-amber-500" />
        </h1>
        <p className="text-xs text-slate-400 font-medium text-center mt-1 mb-6">
          Sistema de control de ventas, compras y socios
        </p>

        {errorMsg && (
          <div className="w-full p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold mb-4 text-center">
            {errorMsg}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="w-full space-y-3 mb-6">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Correo electrónico</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Contraseña</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all"
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={cargando}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all mt-2"
          >
            <span>{cargando ? 'Ingresando...' : 'Iniciar Sesión'}</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        </form>

        {/* Acceso Rápido / Demo */}
        <div className="w-full pt-4 border-t border-slate-100 text-center">
          <span className="text-[11px] font-semibold text-slate-400 block mb-2">O entra directamente como:</span>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => { demoLogin('admin'); if (onLoginSuccess) onLoginSuccess(); }}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              👑 Admin
            </button>
            <button
              onClick={() => { demoLogin('samir'); if (onLoginSuccess) onLoginSuccess(); }}
              className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              👕 Samir
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
