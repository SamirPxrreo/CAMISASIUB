import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Users,
  Sliders,
  Plus,
  Pencil,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Shield,
  UserCheck,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  Info,
  GitBranch,
  Layers,
  ArrowRight,
  MapPin
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { btnNeutro, btnIconoSutil, btnPestanaActiva, btnPestanaInactiva } from '../lib/buttonStyles';
import InlineDeleteConfirm from './InlineDeleteConfirm';



export default function SettingsView() {
  const {
    colores,
    agregarColor,
    actualizarColor,
    eliminarColor,
    restablecerColores,
    lugaresEntrega,
    agregarLugarEntrega,
    actualizarLugarEntrega,
    eliminarLugarEntrega,
    restablecerLugaresEntrega,
    usuarios,
    agregarUsuario,
    actualizarUsuario,
    eliminarUsuario
  } = useData();

  const { role } = useAuth();
  const { theme, setTheme, THEMES } = useTheme();

  // Tab activo: 'colores' | 'lugares' | 'usuarios' | 'temas' | 'versiones'
  const [activeTab, setActiveTab] = useState('colores');

  // Filtros de búsqueda
  const [searchColor, setSearchColor] = useState('');
  const [searchLugar, setSearchLugar] = useState('');
  const [searchUser, setSearchUser] = useState('');

  // Modales de Colores
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState(null); // null para nuevo, objeto para editar
  const [colorNombre, setColorNombre] = useState('');
  const [colorHex, setColorHex] = useState('#6366f1');
  const [colorError, setColorError] = useState('');

  // Modales de Lugares de Entrega
  const [isLugarModalOpen, setIsLugarModalOpen] = useState(false);
  const [editingLugar, setEditingLugar] = useState(null); // null para nuevo, string para editar
  const [lugarNombre, setLugarNombre] = useState('');
  const [lugarError, setLugarError] = useState('');

  // Modales de Usuarios
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('vendedor');
  const [userPassword, setUserPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [isSubmittingUser, setIsSubmittingUser] = useState(false);

  // --- CONTROL DE COLORES ---
  const handleOpenNewColor = () => {
    setEditingColor(null);
    setColorNombre('');
    setColorHex('#6366f1');
    setColorError('');
    setIsColorModalOpen(true);
  };

  const handleOpenEditColor = (col) => {
    setEditingColor(col);
    setColorNombre(col.nombre);
    setColorHex(col.hex || '#6366f1');
    setColorError('');
    setIsColorModalOpen(true);
  };

  const handleSaveColor = (e) => {
    e.preventDefault();
    setColorError('');
    try {
      if (editingColor) {
        actualizarColor(editingColor.id, { nombre: colorNombre, hex: colorHex });
      } else {
        agregarColor({ nombre: colorNombre, hex: colorHex });
      }
      setIsColorModalOpen(false);
    } catch (err) {
      setColorError(err.message || 'Error al guardar el color.');
    }
  };

  const handleSelectPreset = (p) => {
    setColorNombre(p.nombre);
    setColorHex(p.hex);
  };

  // --- CONTROL DE LUGARES DE ENTREGA ---
  const handleOpenNewLugar = () => {
    setEditingLugar(null);
    setLugarNombre('');
    setLugarError('');
    setIsLugarModalOpen(true);
  };

  const handleOpenEditLugar = (lugar) => {
    setEditingLugar(lugar);
    setLugarNombre(lugar);
    setLugarError('');
    setIsLugarModalOpen(true);
  };

  const handleSaveLugar = (e) => {
    e.preventDefault();
    setLugarError('');
    try {
      if (editingLugar) {
        actualizarLugarEntrega(editingLugar, lugarNombre);
      } else {
        agregarLugarEntrega(lugarNombre);
      }
      setIsLugarModalOpen(false);
    } catch (err) {
      setLugarError(err.message || 'Error al guardar el lugar.');
    }
  };

  // --- CONTROL DE USUARIOS ---
  const handleOpenNewUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserRole('vendedor');
    setUserPassword('');
    setShowPassword(false);
    setUserError('');
    setUserSuccess('');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u) => {
    setEditingUser(u);
    setUserName(u.nombre || '');
    setUserEmail(u.correo || '');
    setUserRole(u.rol || 'vendedor');
    setUserPassword('');
    setUserError('');
    setUserSuccess('');
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');
    setIsSubmittingUser(true);

    try {
      if (editingUser) {
        await actualizarUsuario(editingUser.id, { nombre: userName, rol: userRole });
        setUserSuccess('Usuario actualizado correctamente.');
      } else {
        await agregarUsuario({
          nombre: userName,
          correo: userEmail,
          rol: userRole,
          password: userPassword
        });
        setUserSuccess('Usuario creado con éxito.');
      }
      setTimeout(() => {
        setIsUserModalOpen(false);
        setUserSuccess('');
      }, 1000);
    } catch (err) {
      setUserError(err.message || 'Error al procesar el usuario.');
    } finally {
      setIsSubmittingUser(false);
    }
  };

  // Filtrado de colores
  const coloresFiltrados = (colores || []).filter(c =>
    (c.nombre || '').toLowerCase().includes(searchColor.toLowerCase().trim())
  );

  // Filtrado de lugares de entrega
  const lugaresFiltrados = (lugaresEntrega || []).filter(l =>
    (l || '').toLowerCase().includes(searchLugar.toLowerCase().trim())
  );

  // Filtrado de usuarios
  const usuariosFiltrados = (usuarios || []).filter(u =>
    (u.nombre || '').toLowerCase().includes(searchUser.toLowerCase().trim()) ||
    (u.correo || '').toLowerCase().includes(searchUser.toLowerCase().trim()) ||
    (u.rol || '').toLowerCase().includes(searchUser.toLowerCase().trim())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. ENCABEZADO PRINCIPAL DE CONFIGURACIÓN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Ajustes & Catálogos</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Configuración del Sistema
            <Sliders className="w-5 h-5 text-slate-400 inline" />
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Personaliza el catálogo de colores de camisas, administra usuarios con acceso y ajusta preferencias visuales.
          </p>
        </div>

        {/* Píldoras de navegación de pestañas */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200/60 overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setActiveTab('colores')}
            className={activeTab === 'colores' ? btnPestanaActiva : btnPestanaInactiva}
          >
            <Palette className="w-3.5 h-3.5 text-indigo-600" />
            <span>Colores de Camisas</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700">
              {colores?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('lugares')}
            className={activeTab === 'lugares' ? btnPestanaActiva : btnPestanaInactiva}
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
            <span>Lugares de Entrega</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700">
              {lugaresEntrega?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            className={activeTab === 'usuarios' ? btnPestanaActiva : btnPestanaInactiva}
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>Usuarios & Acceso</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700">
              {usuarios?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('temas')}
            className={activeTab === 'temas' ? btnPestanaActiva : btnPestanaInactiva}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Temas Visuales</span>
          </button>

          <button
            onClick={() => setActiveTab('versiones')}
            className={activeTab === 'versiones' ? btnPestanaActiva : btnPestanaInactiva}
          >
            <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
            <span>Despliegues (3 Versiones)</span>
          </button>
        </div>
      </div>

      {/* 2. CONTENIDO SEGÚN PESTAÑA */}

      {/* PESTAÑA 1: CATÁLOGO DE COLORES DE CAMISAS */}
      {activeTab === 'colores' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="space-y-4"
        >
          {/* Barra de herramientas de colores */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar color de camisa..."
                value={searchColor}
                onChange={(e) => setSearchColor(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={restablecerColores}
                title="Volver a los 9 colores predeterminados"
                className={btnNeutro}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restablecer</span>
              </button>

              <button
                onClick={handleOpenNewColor}
                className="theme-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Color</span>
              </button>
            </div>
          </div>

          {/* Grid de colores de camisas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {coloresFiltrados.map((col) => {
              const hexVal = col.hex || '#6366f1';
              const isWhiteOrLight = ['#ffffff', '#fff', '#f8fafc', '#f1f5f9'].includes(hexVal.toLowerCase());

              return (
                <motion.div
                  key={col.id}
                  layout
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Muestra circular del color */}
                    <div
                      className={`w-10 h-10 rounded-2xl shadow-inner shrink-0 flex items-center justify-center transition-transform ${
                        isWhiteOrLight ? 'border-2 border-slate-200' : 'border border-black/10'
                      }`}
                      style={{ backgroundColor: hexVal }}
                      title={`Tono: ${hexVal}`}
                    >
                      {isWhiteOrLight && (
                        <span className="text-[10px] text-slate-400 font-bold">•</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate">
                        {col.nombre}
                      </h4>
                      <span className="font-mono text-[11px] text-slate-400 uppercase font-semibold">
                        {hexVal}
                      </span>
                    </div>
                  </div>

                  {/* Acciones de edición y eliminación */}
                  <div className="flex flex-wrap items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditColor(col)}
                      className={btnIconoSutil}
                      title="Editar color"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <InlineDeleteConfirm
                      title={`¿Quitar color "${col.nombre}"?`}
                      confirmLabel="Quitar"
                      onDelete={() => eliminarColor(col.id)}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {coloresFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              <Palette className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm text-slate-600">No se encontraron colores</p>
              <p className="text-xs mt-1">Prueba con otro término de búsqueda o agrega un nuevo color.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* PESTAÑA 2: CATÁLOGO DE LUGARES DE ENTREGA */}
      {activeTab === 'lugares' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="space-y-4"
        >
          {/* Barra de herramientas de lugares de entrega */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar lugar de entrega..."
                value={searchLugar}
                onChange={(e) => setSearchLugar(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={restablecerLugaresEntrega}
                title="Volver a los lugares predeterminados"
                className={btnNeutro}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Restablecer</span>
              </button>

              <button
                onClick={handleOpenNewLugar}
                className="theme-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Lugar</span>
              </button>
            </div>
          </div>

          {/* Grid de lugares de entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {lugaresFiltrados.map((lugar) => {
              const isOtro = (lugar || '').toLowerCase() === 'otro';

              return (
                <motion.div
                  key={lugar}
                  layout
                  whileHover={{ y: -2 }}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
                      <MapPin className="w-5 h-5" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-extrabold text-slate-900 text-sm truncate" title={lugar}>
                        {lugar}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-semibold block">
                        {isOtro ? 'Opción especial' : 'Lugar activo'}
                      </span>
                    </div>
                  </div>

                  {/* Acciones de edición y eliminación */}
                  {!isOtro ? (
                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditLugar(lugar)}
                        className={btnIconoSutil}
                        title="Editar lugar de entrega"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      <InlineDeleteConfirm
                        title={`¿Quitar "${lugar}"?`}
                        confirmLabel="Quitar"
                        onDelete={() => eliminarLugarEntrega(lugar)}
                      />
                    </div>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-500 uppercase tracking-wider">
                      Fijo
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>

          {lugaresFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              <MapPin className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm text-slate-600">No se encontraron lugares de entrega</p>
              <p className="text-xs mt-1">Prueba con otro término de búsqueda o agrega un nuevo lugar.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* PESTAÑA 3: GESTIÓN DE USUARIOS */}
      {activeTab === 'usuarios' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="space-y-4"
        >
          {/* Barra de herramientas de usuarios */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o rol..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <button
              onClick={handleOpenNewUser}
              className="theme-btn-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Usuario</span>
            </button>
          </div>

          {/* Listado de usuarios */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {usuariosFiltrados.map((u) => {
              const isAdmin = (u.rol || '').toLowerCase() === 'admin';

              return (
                <motion.div
                  key={u.id}
                  layout
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col justify-between gap-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 ${
                        isAdmin ? 'bg-purple-100 text-purple-700' : 'bg-indigo-50 text-indigo-700'
                      }`}>
                        {(u.nombre || 'U')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-slate-900 text-sm truncate">
                          {u.nombre || 'Usuario'}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold truncate">
                          <Mail className="w-3 h-3 shrink-0 text-slate-400" />
                          <span className="truncate">{u.correo}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      isAdmin
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}>
                      {isAdmin ? 'Admin' : 'Vendedor'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                    <span className="text-[11px] text-slate-400 font-semibold">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('es-CO') : 'Activo'}
                    </span>

                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className={btnIconoSutil}
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Editar</span>
                      </button>

                      <InlineDeleteConfirm
                        title={`¿Eliminar usuario "${u.nombre}"?`}
                        confirmLabel="Borrar"
                        onDelete={() => eliminarUsuario(u.id)}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {usuariosFiltrados.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400">
              <Users className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-bold text-sm text-slate-600">No se encontraron usuarios</p>
              <p className="text-xs mt-1">Crea un usuario para conceder acceso a socios o vendedores.</p>
            </div>
          )}
        </motion.div>
      )}

      {/* PESTAÑA 3: APARIENCIA & TEMAS */}
      {activeTab === 'temas' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="space-y-4"
        >
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-black text-slate-900 text-base">Selecciona el tema de la aplicación</h3>
            <p className="text-xs text-slate-500">
              Los temas cambian el 100% de la interfaz de forma armónica: fondo, paneles laterales, tipografía, insignias y botones.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
              {THEMES.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <motion.button
                    key={t.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTheme(t.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                        : 'border-slate-200/80 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{t.emoji}</span>
                        <div>
                          <h4 className="font-bold text-sm text-slate-900">{t.name}</h4>
                          <span className="text-[11px] text-slate-400 font-medium">{t.desc}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 pt-1">
                      {t.previewColors.map((color, i) => (
                        <span
                          key={i}
                          className="w-5 h-5 rounded-full shadow-2xs border border-white"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* PESTAÑA 4: ESTRATEGIA DE DESPLIEGUES (3 VERSIONES) */}
      {activeTab === 'versiones' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-6"
        >
          <div>
            <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Estrategia de Versionado en GitHub Pages
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Camisas IUB maneja estrictamente un ciclo de 3 despliegues para garantizar rollback instantáneo y persistencia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Versión Fija */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 px-2 py-0.5 rounded-full bg-amber-500/20 inline-block mb-2">
                  1. Versión Fija (Ancla)
                </span>
                <h4 className="font-bold text-slate-900 text-sm">Commit 6a8ee5f</h4>
                <p className="text-xs text-slate-600 mt-1">
                  La última versión original desplegada en producción. Queda permanentemente congelada como ancla de respaldo y no se borra con nuevos despliegues.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-amber-500/20 text-[11px] font-mono text-amber-700 font-bold">
                ESTADO: FIJO / INTOCABLE
              </div>
            </div>

            {/* 2. Versión Anterior */}
            <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 px-2 py-0.5 rounded-full bg-sky-500/20 inline-block mb-2">
                  2. Versión Anterior
                </span>
                <h4 className="font-bold text-slate-900 text-sm">Punto de Rollback</h4>
                <p className="text-xs text-slate-600 mt-1">
                  En este momento coincide con la versión fija. En futuros despliegues, la versión actual pasará a ocupar este espacio para reversión de 1 paso.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-sky-500/20 text-[11px] font-mono text-sky-700 font-bold">
                ESTADO: ROLLBACK ACTIVO
              </div>
            </div>

            {/* 3. Versión Nueva */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 px-2 py-0.5 rounded-full bg-emerald-500/20 inline-block mb-2">
                  3. Versión Nueva (Viva)
                </span>
                <h4 className="font-bold text-slate-900 text-sm">React + Vite + Tailwind</h4>
                <p className="text-xs text-slate-600 mt-1">
                  La versión moderna que se publica hoy con interfaz Impeccable, selector dinámico de colores, cálculo exacto de socios y navegación fija.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-emerald-500/20 text-[11px] font-mono text-emerald-700 font-bold">
                ESTADO: VIVA EN PRODUCCIÓN
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* --- MODAL PARA AGREGAR O EDITAR COLOR --- */}
      <AnimatePresence>
        {isColorModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingColor ? 'Editar Color de Camisa' : 'Agregar Nuevo Color de Camisa'}
                </h3>
                <button
                  onClick={() => setIsColorModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {colorError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {colorError}
                </div>
              )}

              <form onSubmit={handleSaveColor} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre del Color</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Verde Militar, Azul Cielo, Palo de Rosa"
                    value={colorNombre}
                    onChange={(e) => setColorNombre(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Muestra / Tono Hexadecimal</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold uppercase"
                    />
                  </div>
                </div>

                {/* Vista previa en vivo del chip de prenda */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Vista previa en pedido:</span>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 text-xs font-bold shadow-2xs">
                    <span
                      className="w-3 h-3 rounded-full border border-black/10"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span>{colorNombre || 'Nombre Color'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsColorModalOpen(false)}
                    className={btnNeutro}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="theme-btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-sm"
                  >
                    {editingColor ? 'Guardar Cambios' : 'Agregar al Catálogo'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL PARA AGREGAR O EDITAR LUGAR DE ENTREGA --- */}
      <AnimatePresence>
        {isLugarModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {editingLugar ? 'Editar Lugar de Entrega' : 'Agregar Lugar de Entrega'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsLugarModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {lugarError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {lugarError}
                </div>
              )}

              <form onSubmit={handleSaveLugar} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre del Lugar / Sede</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: IUB POSGRADOS, CASA VAL, DOMICILIO..."
                    value={lugarNombre}
                    onChange={(e) => setLugarNombre(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsLugarModalOpen(false)}
                    className={btnNeutro}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="theme-btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                  >
                    {editingLugar ? 'Guardar Cambios' : 'Agregar Lugar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL PARA CREAR O EDITAR USUARIO --- */}
      <AnimatePresence>
        {isUserModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200/80 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-900 text-base">
                  {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                </h3>
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
                >
                  ✕
                </button>
              </div>

              {userError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {userError}
                </div>
              )}

              {userSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{userSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveUser} className="space-y-3.5">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Valentina, Samir, Vendedor Norte"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Correo Electrónico (Login)</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    placeholder="correo@ejemplo.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:border-indigo-500 ${
                      editingUser ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  />
                  {editingUser && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">El correo identifica la cuenta y no se puede modificar.</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Rol en la Plataforma</label>
                  <select
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
                  >
                    <option value="vendedor">Vendedor (Acceso a ventas, clientes y pedidos)</option>
                    <option value="admin">Administrador (Control total, compras, socios)</option>
                  </select>
                </div>

                {!editingUser && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Contraseña Inicial</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Mínimo 6 caracteres"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className={btnNeutro}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingUser}
                    className="theme-btn-primary px-5 py-2 rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingUser && <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
                    <span>{editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
