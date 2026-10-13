import React from 'react';
import { motion } from 'framer-motion';
import {
  PlusCircle,
  ShoppingBag,
  BarChart3,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { StatCard, ShortcutCard } from './StatCard';
import { fmt } from '../lib/utils';

export default function DashboardView({ onNavigate, onOpenNewSale }) {
  const {
    pedidosActivosCount,
    porComprar,
    porCobrarTotal,
    alertasListosSinEntrega,
    clientesConDeudaAlta,
    ventas
  } = useData();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 350, damping: 25 }
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 max-w-7xl mx-auto"
    >
      {/* 1. SECCIÓN ALERTAS (Si existen) */}
      {(alertasListosSinEntrega.length > 0 || clientesConDeudaAlta.length > 0) && (
        <motion.section variants={itemVariants} className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Alertas de Atención Inmediata
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertasListosSinEntrega.map((alerta) => (
              <motion.div
                key={alerta.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100 flex items-start gap-3 shadow-xs"
              >
                <Clock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-indigo-950 truncate">{alerta.titulo}</h4>
                  <p className="text-xs text-indigo-700 font-medium mt-0.5">{alerta.detalle}</p>
                </div>
              </motion.div>
            ))}

            {clientesConDeudaAlta.map((c) => (
              <motion.div
                key={c.cliente}
                whileHover={{ scale: 1.02 }}
                className="p-4 rounded-2xl bg-rose-50/80 border border-rose-100 flex items-start gap-3 shadow-xs"
              >
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-rose-950 truncate">Cliente con saldo: {c.cliente}</h4>
                  <p className="text-xs text-rose-700 font-medium mt-0.5">{c.detalle}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* 2. ACCESOS RÁPIDOS */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Accesos Rápidos</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ShortcutCard
            title="Nueva Venta"
            subtitle="Registrar pedido de camisas"
            actionText="+ Crear"
            icon={PlusCircle}
            onClick={onOpenNewSale}
          />
          <ShortcutCard
            title="Pedidos Activos"
            subtitle={`${pedidosActivosCount} pedidos en seguimiento`}
            actionText="Ver lista"
            icon={ShoppingBag}
            onClick={() => onNavigate('orders')}
          />
          <ShortcutCard
            title="Liquidaciones"
            subtitle="Reparto de ganancias y socios"
            actionText="Saldos"
            icon={DollarSign}
            onClick={() => onNavigate('settlements')}
          />
          <ShortcutCard
            title="Estadísticas"
            subtitle="Resúmenes y métricas de venta"
            actionText="Análisis"
            icon={BarChart3}
            onClick={() => onNavigate('summaries')}
          />
        </div>
      </motion.section>

      {/* 3. ESTADO DEL NEGOCIO / MÉTRICAS */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">Estado del Negocio</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Camisas por comprar"
            value={porComprar}
            subtitle="Pendientes de ir a distribuidora"
            icon={Package}
            color="amber"
          />
          <StatCard
            title="Total por cobrar"
            value={fmt(porCobrarTotal)}
            subtitle="Saldos pendientes de clientes"
            icon={DollarSign}
            color="rose"
          />
          <StatCard
            title="Pedidos activos"
            value={pedidosActivosCount}
            subtitle="En producción o entrega"
            icon={ShoppingBag}
            color="emerald"
          />
        </div>
      </motion.section>

      {/* 4. ÚLTIMOS PEDIDOS */}
      <motion.section variants={itemVariants} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Últimos Pedidos Registrados</h2>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
          >
            Ver todos los pedidos <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {ventas.slice(0, 5).map((v) => (
              <div key={v.id} className="p-4 flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {(v.cliente_nombre || 'C')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{v.cliente_nombre}</h4>
                    <p className="text-xs text-slate-400">
                      Vendido por {v.vendedor || 'Equipo'} &bull; {v.fecha || 'Sin fecha'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-slate-900 block">
                    {fmt(v.precio_total || v.precio_unitario || 0)}
                  </span>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-0.5">
                    {v.estado || 'Pedido'}
                  </span>
                </div>
              </div>
            ))}

            {ventas.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">
                No hay pedidos registrados todavía. ¡Crea el primero!
              </div>
            )}
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
