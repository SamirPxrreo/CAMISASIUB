import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Plus,
  Minus,
  Sparkles,
  Shirt,
  User,
  Phone,
  Calendar,
  MapPin,
  DollarSign,
  Copy,
  Trash2,
  FileText
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  LUGARES_ENTREGA,
  VERSIONES_DISPONIBLES,
  GENEROS_DISPONIBLES,
  COLORES_DISPONIBLES,
  TALLAS_DISPONIBLES,
  PRECIO_VENTA_DEFECTO,
  ORDEN_ESTADOS,
  costoProveedorSugerido,
  hoyColombia,
  fmt,
  itemsCrudosVenta
} from '../lib/utils';

export default function NewSaleModal({ isOpen, onClose, editingOrder = null }) {
  const { addVenta, updateVenta, ventas } = useData();
  const { role } = useAuth();

  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vendedor, setVendedor] = useState(role?.nombre === 'Valentina' ? 'Valentina' : 'Samir');
  const [lugarEntrega, setLugarEntrega] = useState('Soledad');
  const [lugarOtro, setLugarOtro] = useState('');
  const [fecha, setFecha] = useState(hoyColombia());
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [fechaEntregaPendiente, setFechaEntregaPendiente] = useState(false);
  const [nota, setNota] = useState('');
  const [sugerencias, setSugerencias] = useState([]);

  // Filas de camisas del pedido
  const [filas, setFilas] = useState([
    {
      cantidad: 1,
      modelo: 'Viejo', // Versión 1
      genero: 'Hombre',
      color: 'Negro',
      talla: 'M',
      programa: '',
      precio: PRECIO_VENTA_DEFECTO,
      costo: 30000,
      abono: 0,
      estado: 'Pedido'
    }
  ]);

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Cargar datos si estamos en modo edición o resetear si es nuevo
  useEffect(() => {
    if (editingOrder) {
      setCliente(editingOrder.cliente_nombre || '');
      setTelefono(editingOrder.cliente_telefono || editingOrder.telefono || '');
      setVendedor(editingOrder.vendedor || 'Samir');
      if (LUGARES_ENTREGA.includes(editingOrder.lugar_entrega)) {
        setLugarEntrega(editingOrder.lugar_entrega);
        setLugarOtro('');
      } else if (editingOrder.lugar_entrega) {
        setLugarEntrega('Otro');
        setLugarOtro(editingOrder.lugar_entrega);
      } else {
        setLugarEntrega('Soledad');
        setLugarOtro('');
      }
      setFecha(editingOrder.fecha || hoyColombia());
      setFechaEntrega(editingOrder.fecha_entrega || '');
      setFechaEntregaPendiente(!editingOrder.fecha_entrega);
      setNota(editingOrder.nota || '');

      const crudos = itemsCrudosVenta(editingOrder);
      if (crudos && crudos.length) {
        setFilas(crudos.map(it => ({
          cantidad: Math.max(1, Number(it.cantidad) || 1),
          modelo: it.modelo === 'Nuevo' ? 'Nuevo' : 'Viejo',
          genero: it.genero || 'Hombre',
          color: it.color || 'Negro',
          talla: it.talla || 'M',
          programa: it.programa || '',
          precio: Number(it.precio) || Number(editingOrder.precio_unitario) || PRECIO_VENTA_DEFECTO,
          costo: Number(it.costo) || Number(editingOrder.costo_unitario) || 30000,
          abono: Number(it.abono) || 0,
          estado: it.estado || editingOrder.estado || 'Pedido'
        })));
      } else {
        setFilas([{
          cantidad: Number(editingOrder.cantidad) || 1,
          modelo: editingOrder.modelo === 'Nuevo' ? 'Nuevo' : 'Viejo',
          genero: editingOrder.genero || 'Hombre',
          color: editingOrder.color || 'Negro',
          talla: editingOrder.talla || 'M',
          programa: editingOrder.cliente_programa || '',
          precio: Number(editingOrder.precio_unitario) || PRECIO_VENTA_DEFECTO,
          costo: Number(editingOrder.costo_unitario) || 30000,
          abono: Number(editingOrder.abono) || 0,
          estado: editingOrder.estado || 'Pedido'
        }]);
      }
    } else {
      // Modo Nuevo
      setCliente('');
      setTelefono('');
      setVendedor(role?.nombre === 'Valentina' ? 'Valentina' : 'Samir');
      setLugarEntrega('Soledad');
      setLugarOtro('');
      setFecha(hoyColombia());
      setFechaEntrega('');
      setFechaEntregaPendiente(false);
      setNota('');
      setFilas([{
        cantidad: 1,
        modelo: 'Viejo',
        genero: 'Hombre',
        color: 'Negro',
        talla: 'M',
        programa: '',
        precio: PRECIO_VENTA_DEFECTO,
        costo: 30000,
        abono: 0,
        estado: 'Pedido'
      }]);
    }
    setErrorMsg('');
  }, [editingOrder, isOpen, role]);

  if (!isOpen) return null;

  // Autocompletado de cliente
  const handleClienteChange = (e) => {
    const val = e.target.value;
    setCliente(val);
    if (!val || val.trim().length < 2) {
      setSugerencias([]);
      return;
    }

    const mapa = new Map();
    const query = val.toLowerCase().trim();
    ventas.forEach(v => {
      const nom = String(v.cliente_nombre || '').trim();
      const tel = String(v.cliente_telefono || '').trim();
      if (nom.toLowerCase().includes(query) || tel.includes(query)) {
        const key = `${nom.toLowerCase()}|${tel}`;
        if (!mapa.has(key)) {
          mapa.set(key, { nombre: nom, telefono: tel, vendedor: v.vendedor });
        }
      }
    });
    setSugerencias([...mapa.values()].slice(0, 4));
  };

  const seleccionarSugerencia = (sug) => {
    setCliente(sug.nombre);
    if (sug.telefono) setTelefono(sug.telefono);
    if (sug.vendedor) setVendedor(sug.vendedor);
    setSugerencias([]);
  };

  // Agregar fila nueva
  const addFila = () => {
    setFilas(prev => [
      ...prev,
      {
        cantidad: 1,
        modelo: 'Viejo',
        genero: 'Hombre',
        color: 'Negro',
        talla: 'M',
        programa: '',
        precio: PRECIO_VENTA_DEFECTO,
        costo: 30000,
        abono: 0,
        estado: 'Pedido'
      }
    ]);
  };

  // Duplicar fila
  const duplicateFila = (idx) => {
    setFilas(prev => {
      const copia = { ...prev[idx] };
      const nuevo = [...prev];
      nuevo.splice(idx + 1, 0, copia);
      return nuevo;
    });
  };

  // Quitar fila
  const removeFila = (idx) => {
    if (filas.length <= 1) return;
    setFilas(prev => prev.filter((_, i) => i !== idx));
  };

  // Actualizar campo de una fila
  const updateFila = (idx, field, value) => {
    setFilas(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const updated = { ...f, [field]: value };
      // Si cambia modelo o talla, sugerir costo de Yesenia
      if (field === 'modelo' || field === 'talla') {
        updated.costo = costoProveedorSugerido(
          field === 'modelo' ? value : updated.modelo,
          field === 'talla' ? value : updated.talla
        );
      }
      return updated;
    }));
  };

  // Cambiar multiplicador (+/-)
  const cambiarCantidad = (idx, delta) => {
    setFilas(prev => prev.map((f, i) => {
      if (i !== idx) return f;
      const nueva = Math.max(1, f.cantidad + delta);
      return { ...f, cantidad: nueva };
    }));
  };

  // Totales
  const totalCamisas = filas.reduce((s, f) => s + f.cantidad, 0);
  const totalVenta = filas.reduce((s, f) => s + (Number(f.precio) || 0) * f.cantidad, 0);
  const totalAbono = filas.reduce((s, f) => s + (Number(f.abono) || 0) * f.cantidad, 0);
  const saldoPendiente = Math.max(totalVenta - totalAbono, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cliente.trim()) {
      setErrorMsg('Por favor ingresa el nombre del cliente.');
      return;
    }
    if (!telefono.trim()) {
      setErrorMsg('Por favor ingresa el teléfono del cliente.');
      return;
    }
    if (!fechaEntregaPendiente && !fechaEntrega) {
      setErrorMsg('Selecciona la fecha de entrega o marca "Pendiente por definir".');
      return;
    }

    setGuardando(true);
    setErrorMsg('');

    try {
      // Desplegar filas según multiplicador para guardado fiel
      const itemsIndividuales = [];
      filas.forEach(f => {
        for (let i = 0; i < f.cantidad; i++) {
          itemsIndividuales.push({
            modelo: f.modelo,
            genero: f.genero,
            color: f.color,
            talla: f.talla,
            programa: f.programa.trim(),
            precio: Number(f.precio) || PRECIO_VENTA_DEFECTO,
            costo: Number(f.costo) || 30000,
            abono: Number(f.abono) || 0,
            estado: f.estado || 'Pedido'
          });
        }
      });

      // Determinar estado principal (el más atrasado o el único)
      const estados = itemsIndividuales.map(it => it.estado);
      const todosIguales = estados.every(e => e === estados[0]);
      const estadoPrincipal = todosIguales
        ? estados[0]
        : estados.slice().sort((a, b) => ORDEN_ESTADOS.indexOf(a) - ORDEN_ESTADOS.indexOf(b))[0] || 'Pedido';

      const payload = {
        cliente_nombre: cliente.trim(),
        cliente_telefono: telefono.trim(),
        telefono: telefono.trim(),
        vendedor: vendedor,
        lugar_entrega: lugarEntrega === 'Otro' ? lugarOtro.trim() || 'Otro' : lugarEntrega,
        fecha: fecha,
        fecha_entrega: fechaEntregaPendiente ? null : (fechaEntrega || null),
        cantidad: totalCamisas,
        precio_unitario: filas[0]?.precio || PRECIO_VENTA_DEFECTO,
        costo_unitario: filas[0]?.costo || 30000,
        abono: totalAbono,
        estado: estadoPrincipal,
        nota: nota.trim(),
        items_camisa: JSON.stringify(itemsIndividuales)
      };

      if (editingOrder) {
        await updateVenta(editingOrder.id, payload);
      } else {
        await addVenta(payload);
      }

      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el pedido');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop suave */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
        />

        {/* Modal Card Bubbly */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 26 }}
          className="relative w-full max-w-2xl bg-white rounded-[32px] p-6 sm:p-8 shadow-2xl border border-slate-200/80 z-10 max-h-[90vh] flex flex-col my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <Shirt className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  {editingOrder ? 'Editar Pedido' : 'Nueva Venta'}
                  <Sparkles className="w-4 h-4 text-amber-500" />
                </h2>
                <p className="text-xs text-slate-400 font-medium">
                  {editingOrder ? `Actualizando pedido #${editingOrder.id}` : 'Registra un pedido de camisas tipo Polo'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-2xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formulario scrolleable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-6 pr-1">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                ⚠️ {errorMsg}
              </div>
            )}

            {/* 1. Datos del Cliente */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                1. Datos del Cliente & Venta
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre del Cliente *</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={cliente}
                      onChange={handleClienteChange}
                      placeholder="Ej. Juan Pérez"
                      required
                      autoComplete="off"
                      className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all"
                    />
                  </div>
                  {/* Chips sugerencias de clientes recurrentes */}
                  {sugerencias.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl p-2 z-20 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase px-2 block">Clientes anteriores:</span>
                      {sugerencias.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => seleccionarSugerencia(sug)}
                          className="w-full text-left p-2 rounded-xl hover:bg-indigo-50 text-xs flex items-center justify-between transition-colors"
                        >
                          <span className="font-bold text-slate-800">{sug.nombre}</span>
                          <span className="text-slate-400 font-mono text-[11px]">{sug.telefono}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono o WhatsApp *</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ej. 300 123 4567 o @usuario"
                      required
                      className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Vendedor asignado</label>
                  <select
                    value={vendedor}
                    onChange={(e) => setVendedor(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all font-medium"
                  >
                    <option value="Samir">Samir</option>
                    <option value="Valentina">Valentina</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Fecha del Pedido</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={fecha}
                      onChange={(e) => setFecha(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Entrega */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lugar de Entrega</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <select
                      value={lugarEntrega}
                      onChange={(e) => setLugarEntrega(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all font-medium"
                    >
                      {LUGARES_ENTREGA.map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                  {lugarEntrega === 'Otro' && (
                    <input
                      type="text"
                      value={lugarOtro}
                      onChange={(e) => setLugarOtro(e.target.value)}
                      placeholder="Especifica el lugar..."
                      className="mt-2 w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Fecha de Entrega</label>
                  <div className="space-y-1.5">
                    <input
                      type="date"
                      value={fechaEntrega}
                      disabled={fechaEntregaPendiente}
                      onChange={(e) => setFechaEntrega(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all disabled:opacity-50"
                    />
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-500 select-none">
                      <input
                        type="checkbox"
                        checked={fechaEntregaPendiente}
                        onChange={(e) => {
                          setFechaEntregaPendiente(e.target.checked);
                          if (e.target.checked) setFechaEntrega('');
                        }}
                        className="rounded accent-indigo-600"
                      />
                      <span>Fecha aún no definida</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Camisas del Pedido */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    2. Camisas Tipo Polo ({totalCamisas} prenda{totalCamisas !== 1 ? 's' : ''})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Manejamos tipo Polo en Versión 1 ($30.000 costo) y Versión 2 ($31.000 costo).
                  </span>
                </div>
                <button
                  type="button"
                  onClick={addFila}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Agregar Fila</span>
                </button>
              </div>

              {/* Lista de Filas de Camisas */}
              <div className="space-y-3">
                {filas.map((f, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-3 relative group"
                  >
                    {/* Barra de cabecera de la fila con multiplicador y acciones */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-slate-700">Fila #{idx + 1}</span>
                        {f.cantidad > 1 && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                            ×{f.cantidad} iguales
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Stepper Multiplicador */}
                        <div className="inline-flex items-center bg-white rounded-xl border border-slate-200 p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(idx, -1)}
                            disabled={f.cantidad <= 1}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-slate-800">{f.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => cambiarCantidad(idx, 1)}
                            className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Duplicar fila */}
                        <button
                          type="button"
                          onClick={() => duplicateFila(idx)}
                          title="Duplicar esta fila"
                          className="p-1.5 rounded-xl hover:bg-white text-slate-400 hover:text-indigo-600 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {/* Borrar fila */}
                        {filas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeFila(idx)}
                            title="Quitar fila"
                            className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Campos de la prenda */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Versión</label>
                        <select
                          value={f.modelo}
                          onChange={(e) => updateFila(idx, 'modelo', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none"
                        >
                          {VERSIONES_DISPONIBLES.map(v => (
                            <option key={v.id} value={v.id}>{v.nombre}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Género</label>
                        <select
                          value={f.genero}
                          onChange={(e) => updateFila(idx, 'genero', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none"
                        >
                          {GENEROS_DISPONIBLES.map(g => (
                            <option key={g} value={g}>{g}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Color</label>
                        <select
                          value={f.color}
                          onChange={(e) => updateFila(idx, 'color', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold outline-none"
                        >
                          {COLORES_DISPONIBLES.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Talla</label>
                        <select
                          value={f.talla}
                          onChange={(e) => updateFila(idx, 'talla', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold outline-none"
                        >
                          {TALLAS_DISPONIBLES.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">Bordado</label>
                        <input
                          type="text"
                          value={f.programa}
                          onChange={(e) => updateFila(idx, 'programa', e.target.value)}
                          placeholder="Ej. Ingeniería"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs outline-none"
                        />
                      </div>
                    </div>

                    {/* Precios, Abonos y Estado de la camisa */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/40">
                      <div>
                        <label className="text-[10.5px] font-semibold text-slate-500 block mb-0.5">Precio Venta ($)</label>
                        <input
                          type="number"
                          value={f.precio}
                          onChange={(e) => updateFila(idx, 'precio', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10.5px] font-semibold text-slate-500 block mb-0.5">Costo Yesenia ($)</label>
                        <input
                          type="number"
                          value={f.costo}
                          onChange={(e) => updateFila(idx, 'costo', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-amber-700 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10.5px] font-semibold text-slate-500 block mb-0.5">Abono ($)</label>
                        <input
                          type="number"
                          value={f.abono}
                          onChange={(e) => updateFila(idx, 'abono', parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-emerald-700 outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[10.5px] font-semibold text-slate-500 block mb-0.5">Estado</label>
                        <select
                          value={f.estado}
                          onChange={(e) => updateFila(idx, 'estado', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold outline-none"
                        >
                          {ORDEN_ESTADOS.map(es => (
                            <option key={es} value={es}>{es}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. Nota u Observación */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Nota / Instrucciones especiales</label>
              <textarea
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                rows={2}
                placeholder="Detalle de entrega, indicaciones de hilo o bordado..."
                className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs outline-none focus:bg-white focus:border-indigo-500 transition-all"
              />
            </div>
          </form>

          {/* Footer con Resumen de Totales y Botón Guardar */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10.5px]">Total Venta</span>
                <span className="font-extrabold text-slate-800 text-sm">{fmt(totalVenta)}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10.5px]">Abono</span>
                <span className="font-extrabold text-emerald-600 text-sm">{fmt(totalAbono)}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 block text-[10.5px]">Saldo</span>
                <span className={`font-extrabold text-sm ${saldoPendiente > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {fmt(saldoPendiente)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={guardando}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : editingOrder ? 'Actualizar Pedido' : 'Guardar Pedido'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
