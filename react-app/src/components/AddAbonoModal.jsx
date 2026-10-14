import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  DollarSign,
  Check,
  CreditCard,
  AlertCircle,
  Coins,
  Shirt,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  fmt,
  formatMiles,
  parseMiles,
  itemsCrudosVenta,
  precioDeItem,
  precioTotalVenta,
  abonoClienteTotal,
  saldoCliente,
  triggerConfetti,
  getVendedorColor
} from '../lib/utils';

export default function AddAbonoModal({ isOpen, onClose, order }) {
  const { updateVenta } = useData();
  const { role } = useAuth();

  // Estados locales
  const [itemsAbonos, setItemsAbonos] = useState([]);
  const [montoGeneralStr, setMontoGeneralStr] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  // Inicializar estado cuando se abre con una orden
  useEffect(() => {
    if (!order) return;
    const items = itemsCrudosVenta(order) || [];
    const cant = items.length || Number(order.cantidad) || 1;

    if (items.length > 0) {
      setItemsAbonos(
        items.map((it, idx) => {
          const precio = precioDeItem(it, order);
          const abonoActual = Number(it.abono) || 0;
          const saldoItem = Math.max(precio - abonoActual, 0);
          return {
            idx,
            color: it.color || 'Negro',
            talla: it.talla || 'U',
            genero: it.genero === 'Hombre' ? 'Hombre' : 'Mujer',
            modelo: it.modelo || 'Viejo',
            programa: it.programa || '',
            precio,
            abonoActual,
            saldoItem,
            abonoNuevo: 0,
            abonoNuevoStr: ''
          };
        })
      );
    } else {
      const precioTot = precioTotalVenta(order);
      const abonoAct = abonoClienteTotal(order);
      const saldoItem = Math.max(precioTot - abonoAct, 0);
      setItemsAbonos([
        {
          idx: 0,
          color: order.color || 'Negro',
          talla: order.talla || 'U',
          genero: order.genero === 'Hombre' ? 'Hombre' : 'Mujer',
          modelo: order.modelo || 'Viejo',
          programa: order.cliente_programa || '',
          precio: precioTot,
          abonoActual: abonoAct,
          saldoItem,
          abonoNuevo: 0,
          abonoNuevoStr: ''
        }
      ]);
    }
    setMontoGeneralStr('');
    setMetodoPago('Efectivo');
    setNota('');
    setError(null);
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const totalPedido = precioTotalVenta(order);
  const abonoPrevio = abonoClienteTotal(order);
  const saldoPendiente = saldoCliente(order);

  // Total que se abonará en esta transacción
  const sumaAbonosNuevos = itemsAbonos.reduce((s, it) => s + (Number(it.abonoNuevo) || 0), 0);
  const saldoFinalRestante = Math.max(saldoPendiente - sumaAbonosNuevos, 0);

  // Manejar cambio en el input general: distribuye el monto proporcionalmente a las prendas con saldo
  const handleMontoGeneralChange = (e) => {
    const rawVal = e.target.value;
    const num = parseMiles(rawVal);
    const montoLimitado = Math.min(num, saldoPendiente);
    const formatted = montoLimitado > 0 ? formatMiles(montoLimitado) : (rawVal === '' ? '' : '0');
    setMontoGeneralStr(formatted);
    setError(null);

    // Distribuir el monto entre las prendas de forma secuencial
    let restantePorRepartir = montoLimitado;
    setItemsAbonos(prev =>
      prev.map(it => {
        if (restantePorRepartir <= 0 || it.saldoItem <= 0) {
          return { ...it, abonoNuevo: 0, abonoNuevoStr: '' };
        }
        const asignado = Math.min(restantePorRepartir, it.saldoItem);
        restantePorRepartir -= asignado;
        return {
          ...it,
          abonoNuevo: asignado,
          abonoNuevoStr: asignado > 0 ? formatMiles(asignado) : ''
        };
      })
    );
  };

  // Manejar cambio individual por prenda
  const handleItemAbonoChange = (idx, rawVal) => {
    const num = parseMiles(rawVal);
    setError(null);

    setItemsAbonos(prev => {
      const next = [...prev];
      const it = next[idx];
      const maxPermitido = it.saldoItem;
      const limitado = Math.min(num, maxPermitido);

      next[idx] = {
        ...it,
        abonoNuevo: limitado,
        abonoNuevoStr: limitado > 0 ? formatMiles(limitado) : (rawVal === '' ? '' : '0')
      };

      // Actualizar el monto general como suma de los individuales
      const totalNuevos = next.reduce((s, x) => s + (Number(x.abonoNuevo) || 0), 0);
      setMontoGeneralStr(totalNuevos > 0 ? formatMiles(totalNuevos) : '');

      return next;
    });
  };

  // Botón rápido: Pagar saldo completo
  const handlePagarSaldoCompleto = () => {
    setMontoGeneralStr(formatMiles(saldoPendiente));
    setItemsAbonos(prev =>
      prev.map(it => ({
        ...it,
        abonoNuevo: it.saldoItem,
        abonoNuevoStr: it.saldoItem > 0 ? formatMiles(it.saldoItem) : ''
      }))
    );
    setError(null);
  };

  // Guardar abono en base de datos
  const handleGuardarAbono = async () => {
    if (sumaAbonosNuevos <= 0) {
      setError('Ingresa un monto válido para abonar (mayor a $0).');
      return;
    }

    if (sumaAbonosNuevos > saldoPendiente) {
      setError(`El abono ($${formatMiles(sumaAbonosNuevos)}) no puede superar el saldo pendiente ($${formatMiles(saldoPendiente)}).`);
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const nowIso = new Date().toISOString();
      const nuevoAbonoTotal = abonoPrevio + sumaAbonosNuevos;

      // Reconstruir items_camisa con los nuevos abonos acumulados
      let itemsOriginales = itemsCrudosVenta(order);
      let itemsActualizados = [];

      if (itemsOriginales && itemsOriginales.length > 0) {
        itemsActualizados = itemsOriginales.map((it, idx) => {
          const asignado = itemsAbonos[idx]?.abonoNuevo || 0;
          const abonoAnterior = Number(it.abono) || 0;
          return {
            ...it,
            abono: abonoAnterior + asignado
          };
        });
      } else {
        itemsActualizados = itemsAbonos.map(it => ({
          modelo: it.modelo,
          genero: it.genero,
          color: it.color,
          talla: it.talla,
          programa: it.programa,
          precio: it.precio,
          abono: it.abonoActual + it.abonoNuevo
        }));
      }

      // Historial de auditoría
      let prevHistorial = [];
      try {
        if (order.items_camisa) {
          const p = typeof order.items_camisa === 'string' ? JSON.parse(order.items_camisa) : order.items_camisa;
          if (p && Array.isArray(p.historial)) prevHistorial = p.historial;
        }
      } catch {}

      const eventoAbono = {
        fecha: nowIso,
        tipo: 'abono_cliente',
        titulo: `Abono de ${fmt(sumaAbonosNuevos)} registrado`,
        detalle: `Método: ${metodoPago}${nota ? ` · Nota: "${nota}"` : ''} · Saldo restante: ${fmt(saldoFinalRestante)}`,
        usuario: role?.vendedor || role?.nombre || 'Usuario'
      };
      const updatedHistorial = [eventoAbono, ...prevHistorial];

      const jsonStr = JSON.stringify({
        items: itemsActualizados,
        historial: updatedHistorial
      });

      const cambios = {
        abono: nuevoAbonoTotal,
        items_camisa: jsonStr,
        updated_at: nowIso
      };

      await updateVenta(order.id, cambios);

      if (saldoFinalRestante <= 1) {
        triggerConfetti();
      }

      onClose();
    } catch (err) {
      console.error('Error al registrar abono:', err);
      setError('Error al registrar el abono: ' + (err.message || err));
    } finally {
      setGuardando(false);
    }
  };

  const vCol = getVendedorColor(order.vendedor);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
        >
          {/* 1. Encabezado */}
          <div className="p-5 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center font-black">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base leading-tight">
                  Registrar Abono del Cliente
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-slate-700 text-xs truncate max-w-[180px]">
                    {order.cliente_nombre}
                  </span>
                  <span className={`px-2 py-0.2 rounded-md font-black text-[10px] border ${vCol.badge}`}>
                    {order.vendedor || 'Samir'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* 2. Resumen Financiero Actual */}
            <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total</span>
                <span className="text-sm font-black text-slate-800 mt-0.5 block">{fmt(totalPedido)}</span>
              </div>
              <div className="border-x border-slate-200/80 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Abonado</span>
                <span className="text-sm font-black text-emerald-600 mt-0.5 block">{fmt(abonoPrevio)}</span>
              </div>
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Saldo Pendiente</span>
                <span className="text-sm font-black text-amber-600 mt-0.5 block">{fmt(saldoPendiente)}</span>
              </div>
            </div>

            {/* 3. Input Principal de Abono y Botón Rápido */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Monto a abonar hoy ($):
                </label>
                {saldoPendiente > 0 && (
                  <button
                    type="button"
                    onClick={handlePagarSaldoCompleto}
                    className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Pagar Saldo Completo ({fmt(saldoPendiente)})
                  </button>
                )}
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={montoGeneralStr}
                  onChange={handleMontoGeneralChange}
                  onKeyDown={(e) => {
                    if (e.key === '.' || e.key === ',') e.preventDefault();
                  }}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-slate-300 rounded-2xl text-base font-black text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </div>
              <span className="text-[10.5px] text-slate-400 block">
                Máximo permitido: <strong>{fmt(saldoPendiente)}</strong>. Formato de miles automático.
              </span>
            </div>

            {/* 4. Si el pedido tiene varias prendas, desglose individual */}
            {itemsAbonos.length > 1 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                  Distribución por Prenda ({itemsAbonos.length}):
                </span>

                <div className="space-y-2">
                  {itemsAbonos.map((it) => {
                    const restanteItem = Math.max(it.saldoItem - (it.abonoNuevo || 0), 0);
                    return (
                      <div
                        key={it.idx}
                        className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                              #{it.idx + 1}
                            </span>
                            <span className="font-bold text-slate-800 truncate">
                              {it.color} · Talla {it.talla} para {it.genero}
                            </span>
                            {it.modelo === 'Nuevo' && (
                              <span className="text-[9.5px] font-black px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 border border-amber-500/30">
                                v2
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-extrabold text-slate-600 shrink-0">
                            Falta: {fmt(it.saldoItem)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">
                              $
                            </span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={it.abonoNuevoStr}
                              onChange={(e) => handleItemAbonoChange(it.idx, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === '.' || e.key === ',') e.preventDefault();
                              }}
                              placeholder="0"
                              className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-indigo-500"
                            />
                          </div>

                          <div className="text-right text-[10.5px] text-slate-500 min-w-[90px]">
                            {restanteItem === 0 ? (
                              <span className="text-emerald-600 font-black">Cubierta ✓</span>
                            ) : (
                              <span>Restará {fmt(restanteItem)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 5. Método de Pago y Nota Opcional */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Método de Pago
                </label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Nequi">Nequi</option>
                  <option value="Bancolombia">Bancolombia</option>
                  <option value="Daviplata">Daviplata</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  Nota / Referencia (Opcional)
                </label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: comprobante #9412"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none"
                />
              </div>
            </div>

            {/* 6. Indicador del resultado final */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">Saldo restante tras este pago:</span>
              <span className={`text-sm font-black ${saldoFinalRestante === 0 ? 'text-emerald-600 flex items-center gap-1' : 'text-amber-600'}`}>
                {saldoFinalRestante === 0 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    ¡Totalmente Pagado! ($0)
                  </>
                ) : (
                  fmt(saldoFinalRestante)
                )}
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* 7. Footer de Acciones */}
          <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={guardando}
              className="px-4 py-2.5 rounded-2xl bg-white border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleGuardarAbono}
              disabled={guardando || sumaAbonosNuevos <= 0}
              className={`px-5 py-2.5 rounded-2xl text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-xs ${
                sumaAbonosNuevos > 0 && !guardando
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{guardando ? 'Guardando...' : `Registrar Abono (${fmt(sumaAbonosNuevos)})`}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
