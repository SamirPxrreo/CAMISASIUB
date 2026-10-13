import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shirt, Sparkles, ArrowRight, ShieldCheck, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FloatingLabelInput from './FloatingLabelInput';

export default function LoginView({ onLoginSuccess }) {
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Por favor completa todos los campos');
      return;
    }
    setErrorMsg('');
    setCargando(true);
    try {
      await login(email, password);
      if (onLoginSuccess) onLoginSuccess();
    } catch (err) {
      setErrorMsg(err.message || 'Credenciales inválidas. Verifica tu correo y contraseña.');
    } finally {
      setCargando(false);
    }
  };

  const handleQuickLogin = (role) => {
    if (role === 'admin') {
      setEmail('admin@gmail.com');
    } else if (role === 'val') {
      setEmail('val@gmail.com');
    } else {
      setEmail('samir@gmail.com');
    }
    setTimeout(() => {
      const pwd = document.querySelector('input[type="password"]');
      if (pwd) pwd.focus();
    }, 50);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#090d16] text-white relative overflow-hidden select-none">
      {/* 1. Malla de puntos sutil de fondo */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.18) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* 2. Orbes de luz orgánica ambiental con Framer Motion */}
      <motion.div
        animate={{
          x: [0, 45, 0],
          y: [0, 30, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full bg-indigo-600/25 blur-[120px] pointer-events-none"
      />

      <motion.div
        animate={{
          x: [0, -35, 0],
          y: [0, -45, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 14,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -bottom-24 -right-24 w-[440px] h-[440px] rounded-full bg-violet-600/20 blur-[130px] pointer-events-none"
      />

      <motion.div
        animate={{
          opacity: [0.15, 0.3, 0.15],
          scale: [0.95, 1.05, 0.95]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none"
      />

      {/* 3. Tarjeta Principal Glassmorphic */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="relative w-full max-w-[430px] bg-slate-900/65 backdrop-blur-2xl border border-white/10 rounded-[32px] p-7 sm:p-9 shadow-2xl shadow-indigo-950/60 flex flex-col items-center z-10 before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-indigo-400/40 before:to-transparent"
      >
        {/* Ícono de la marca interactivo */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 6 }}
          whileTap={{ scale: 0.95 }}
          className="w-16 h-16 rounded-[24px] bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-4 ring-1 ring-white/20 cursor-pointer"
        >
          <Shirt className="w-8 h-8 drop-shadow" />
        </motion.div>

        {/* Título y badge */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px] font-semibold tracking-wide uppercase mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Control de Ventas & Socios
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
            Camisas IUB
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-xs text-slate-400 font-normal mt-1 max-w-[260px]">
            Ingresa tus credenciales para acceder al panel de operaciones y liquidaciones.
          </p>
        </div>

        {/* Alerta de Error animada */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-full p-3 rounded-[18px] bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-medium mb-4 flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Formulario con los inputs estilo bencho.dev (corner=26) */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 mb-6">
          <FloatingLabelInput
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            corner={26}
            required
            autoComplete="email"
          />

          <FloatingLabelInput
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            corner={26}
            required
            autoComplete="current-password"
          />

          {/* Botón de Iniciar Sesión con Spring Motion */}
          <motion.button
            type="submit"
            disabled={cargando}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="group w-full h-[52px] rounded-[26px] bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:via-indigo-500 hover:to-violet-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/50 flex items-center justify-center gap-2 cursor-pointer transition-all duration-200 mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {cargando ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Verificando...</span>
              </div>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </>
            )}
          </motion.button>
        </form>

        {/* Separador sutil */}
        <div className="w-full flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Autocompletar Correo
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Accesos rápidos para rellenar correo */}
        <div className="w-full grid grid-cols-3 gap-2">
          <motion.button
            type="button"
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleQuickLogin('admin')}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-[18px] bg-white/[0.04] border border-white/10 hover:border-amber-400/40 text-slate-200 text-[11px] font-semibold cursor-pointer transition-all duration-200 group"
            title="admin@gmail.com"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">admin</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(99, 102, 241, 0.15)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleQuickLogin('samir')}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-[18px] bg-indigo-500/10 border border-indigo-500/20 hover:border-indigo-400/40 text-indigo-200 text-[11px] font-semibold cursor-pointer transition-all duration-200 group"
            title="samir@gmail.com"
          >
            <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">samir</span>
          </motion.button>

          <motion.button
            type="button"
            whileHover={{ scale: 1.03, backgroundColor: 'rgba(236, 72, 153, 0.15)' }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleQuickLogin('val')}
            className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-[18px] bg-pink-500/10 border border-pink-500/20 hover:border-pink-400/40 text-pink-200 text-[11px] font-semibold cursor-pointer transition-all duration-200 group"
            title="val@gmail.com"
          >
            <UserCheck className="w-3.5 h-3.5 text-pink-400 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="truncate">val (Valentina)</span>
          </motion.button>
        </div>

        {/* Indicador de base de datos activa */}
        <div className="flex items-center justify-center gap-1.5 mt-5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Base de datos real Supabase conectada</span>
        </div>
      </motion.div>
    </div>
  );
}
