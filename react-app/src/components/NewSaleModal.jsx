import React, { useState } from 'react';
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
  DollarSign
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  LUGARES_ENTREGA,
  TIPOS_CAMISA,
  TALLAS,
  COLORES,
  hoyColombia,
  fmt
} from '../lib/utils';

export default function NewSaleModal({ isOpen, onClose }) {
  const { addVenta } = useData();
  const { role } = useAuth();

  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [vendedor, setVendedor] = useState(role?.nombre === 'Valentina' ? 'Valentina' : 'Samir');
  const [lugarEntrega, setLugarEntrega] = useState('Soledad');
  const [fechaEntrega, setFechaEntrega] = useState('');
  
  // Lista de camisas del pedido
  const [items, setItems] = useState([
    { tipo: 'Polo', talla: 'M', color: 'Blanco', bordado: '', precio: 45000, costo: 25000, abono: 0, estado: 'Pedido' }
  ]);

  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const addItem = () => {
    setItems(prev => [
      ...prev,
      { tipo: 'Polo', talla: 'M', color: 'Blanco', bordado: '', precio: 45000, costo: 25000, abono: 0, estado: 'Pedido' }
    ]);
  };

  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const totalVenta = items.reduce((s, it) => s + (Number(it.precio) || 0), 0);
  const totalAbono = items.reduce((s, it) => s + (Number(it.abono) || 0), 0);

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

    setGuardando(true);
    setErrorMsg('');

    try {
      const payload = {
        cliente_nombre: cliente.trim(),
        telefono: telefono.trim(),
        vendedor: vendedor,
        lugar_entrega: lugarEntrega,
        fecha_entrega: fechaEntrega || null,
        fecha: hoyColombia(),
        cantidad: items.length,
        items_camisa: JSON.stringify(items),
        precio_unitario: items[0]?.precio || 45000,
        costo_unitario: items[0]?.costo || 25000,
        precio_total: totalVenta,
        abono: totalAbono,
        estado: 'Pedido',
        finalizado: false
      };

      await addVenta(payload);
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Error al guardar el pedido');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop con desenfoque suave */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
        />

        {/* Tarjeta emergente Bubbly */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-3xl sm:rounded-4xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden z-10"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Shirt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Registrar Nuevo Pedido</h3>
                <span className="text-[11px] text-slate-400">Ingresa los datos del cliente y camisas</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Formulario scrolleable */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {errorMsg && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {errorMsg}
              </div>
            )}

            {/* Datos del Cliente */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> 1. Datos del Cliente
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Nombre completo</label>
                  <input
                    type="text"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Ej. Carlos Mendoza"
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Teléfono o WhatsApp</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Ej. 300 123 4567"
                    required
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white text-sm outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Vendedor</label>
                  <select
                    value={vendedor}
                    onChange={(e) => setVendedor(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                  >
                    <option value="Samir">Samir</option>
                    <option value="Valentina">Valentina</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Lugar de entrega</label>
                  <select
                    value={lugarEntrega}
                    onChange={(e) => setLugarEntrega(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                  >
                    {LUGARES_ENTREGA.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Fecha entrega</label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Stepper y Camisas del Pedido */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Shirt className="w-3.5 h-3.5" /> 2. Camisas del Pedido ({items.length})
                </h4>

                {/* Botón rápido para agregar camisa */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={addItem}
                  className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar otra
                </motion.button>
              </div>

              {/* Lista de filas de camisa */}
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div key={idx} className="p-4 rounded-3xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-100/70 px-2 py-0.5 rounded-full">
                        Camisa #{idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-full transition-colors"
                          title="Eliminar esta camisa"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Tipo</label>
                        <select
                          value={it.tipo}
                          onChange={(e) => updateItem(idx, 'tipo', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs outline-none"
                        >
                          {TIPOS_CAMISA.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Talla</label>
                        <select
                          value={it.talla}
                          onChange={(e) => updateItem(idx, 'talla', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs outline-none"
                        >
                          {TALLAS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Color</label>
                        <select
                          value={it.color}
                          onChange={(e) => updateItem(idx, 'color', e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs outline-none"
                        >
                          {COLORES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Precio ($)</label>
                        <input
                          type="number"
                          value={it.precio}
                          onChange={(e) => updateItem(idx, 'precio', Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 text-xs outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-500 block mb-0.5">Nota de bordado / diseño</label>
                      <input
                        type="text"
                        value={it.bordado}
                        onChange={(e) => updateItem(idx, 'bordado', e.target.value)}
                        placeholder="Ej. Logo pecho izquierdo blanco"
                        className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resumen Total y Abono */}
            <div className="p-4 rounded-3xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-indigo-900 font-medium block">Total Pedido:</span>
                <span className="text-xl font-extrabold text-indigo-700">{fmt(totalVenta)}</span>
              </div>

              <div>
                <span className="text-xs text-slate-500 font-medium block">Camisas:</span>
                <span className="text-base font-bold text-slate-800 text-right block">{items.length} unid.</span>
              </div>
            </div>

            {/* Botón de Enviar con Confeti */}
            <motion.button
              type="submit"
              disabled={guardando}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96 }}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{guardando ? 'Guardando...' : 'Crear Pedido 🎉'}</span>
            </motion.button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
