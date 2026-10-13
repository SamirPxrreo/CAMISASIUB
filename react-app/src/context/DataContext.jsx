import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  precioTotalVenta,
  abonoClienteTotal,
  saldoCliente,
  normalizarEstado,
  todosItemsListosEntrega,
  estadosTodosLiquidado,
  diasTranscurridos,
  hoyColombia,
  triggerConfetti,
  itemsCrudosVenta
} from '../lib/utils';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { role } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cargar ventas
      const { data: vData, error: vErr } = await supabase
        .from('ventas')
        .select('*')
        .order('id', { ascending: false });

      if (vErr) throw vErr;
      setVentas(vData || []);

      // 2. Cargar compras
      try {
        const { data: cData } = await supabase.from('compras').select('*').order('id', { ascending: false });
        if (cData) setCompras(cData);
      } catch {}

      // 3. Cargar liquidaciones
      try {
        const { data: lData } = await supabase.from('liquidaciones').select('*').order('id', { ascending: false });
        if (lData) setLiquidaciones(lData);
      } catch {}

    } catch (err) {
      console.error("Error al cargar datos de Supabase:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Agregar una venta
  const addVenta = async (nuevaVenta) => {
    try {
      const payload = {
        ...nuevaVenta,
        created_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from('ventas').insert([payload]).select().single();
      if (error) throw error;
      setVentas(prev => [data, ...prev]);
      triggerConfetti();
      return data;
    } catch (err) {
      console.error("Error al registrar venta:", err);
      throw err;
    }
  };

  // Actualizar una venta
  const updateVenta = async (id, cambios) => {
    try {
      const { data, error } = await supabase
        .from('ventas')
        .update(cambios)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      setVentas(prev => prev.map(v => v.id === id ? data : v));
      return data;
    } catch (err) {
      console.error("Error al actualizar venta:", err);
      throw err;
    }
  };

  // Eliminar venta
  const deleteVenta = async (id) => {
    try {
      const { error } = await supabase.from('ventas').delete().eq('id', id);
      if (error) throw error;
      setVentas(prev => prev.filter(v => v.id !== id));
    } catch (err) {
      console.error("Error al eliminar venta:", err);
      throw err;
    }
  };

  // Cambiar estado de una camisa individual
  const updateItemEstado = async (ventaId, itemIdx, nuevoEstado) => {
    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) return;
    const items = itemsCrudosVenta(venta) || [];
    if (items[itemIdx]) {
      items[itemIdx].estado = nuevoEstado;
      const jsonStr = JSON.stringify(items);
      const todosIguales = items.every(it => normalizarEstado(it.estado) === normalizarEstado(nuevoEstado));
      const cambios = {
        items_camisa: jsonStr,
        estado: todosIguales ? nuevoEstado : 'Mixto'
      };
      await updateVenta(ventaId, cambios);
      if (nuevoEstado === 'Listo para entrega' || nuevoEstado === 'Liquidado') {
        triggerConfetti();
      }
    }
  };

  // Alertas calculadas
  const esAdmin = role?.role === 'admin';
  const miNombre = role?.vendedor;

  const ventasActivas = ventas.filter(v => {
    if (v.finalizado || estadosTodosLiquidado(v)) return false;
    if (!esAdmin && v.vendedor !== miNombre) return false;
    return true;
  });

  // Alerta 1: Listos para entrega sin cerrar
  const alertasListosSinEntrega = () => {
    const porClave = new Map();
    ventas.forEach(v => {
      if (v.finalizado || estadosTodosLiquidado(v) || !todosItemsListosEntrega(v)) return;
      if (!esAdmin && v.vendedor !== miNombre) return;
      const clave = `${v.cliente_nombre || ''}|${v.vendedor || ''}|${v.fecha_entrega || ''}`;
      if (!porClave.has(clave)) {
        porClave.set(clave, {
          cliente: v.cliente_nombre,
          vendedor: v.vendedor,
          fecha: v.fecha_entrega,
          count: 0,
          dias: v.fecha_entrega ? diasTranscurridos(v.fecha_entrega) : null,
          sinFecha: !v.fecha_entrega
        });
      }
      const g = porClave.get(clave);
      g.count += 1;
    });

    const lista = [];
    porClave.forEach(g => {
      if (g.sinFecha) {
        lista.push({
          id: `sinfecha-${g.cliente}`,
          tipo: 'info',
          titulo: `${g.cliente} (${g.vendedor})`,
          detalle: `${g.count} pedido${g.count > 1 ? 's' : ''} en Listo para entrega sin fecha fijada`
        });
      } else if (g.dias !== null && g.dias >= 2) {
        lista.push({
          id: `dias-${g.cliente}`,
          tipo: 'warning',
          titulo: `${g.cliente} (${g.vendedor})`,
          detalle: `${g.count} pedido${g.count > 1 ? 's' : ''} listo desde hace ${g.dias} días`
        });
      }
    });
    return lista;
  };

  // Alerta 2: Deudas altas
  const clientesConDeudaAlta = () => {
    const clientesDeuda = {};
    ventasActivas.forEach(v => {
      const saldo = saldoCliente(v);
      if (saldo > 0) {
        clientesDeuda[v.cliente_nombre] = (clientesDeuda[v.cliente_nombre] || 0) + saldo;
      }
    });
    return Object.entries(clientesDeuda)
      .filter(([_, deuda]) => deuda > 100000)
      .map(([cliente, deuda]) => ({
        cliente,
        deuda,
        detalle: `Debe ${fmt(deuda)} en pedidos acumulados`
      }));
  };

  // Métricas
  const porComprar = ventasActivas.reduce((acc, v) => {
    const crudos = itemsCrudosVenta(v);
    if (!crudos) return acc + (normalizarEstado(v.estado) === 'Pedido' ? (Number(v.cantidad) || 1) : 0);
    return acc + crudos.filter(it => normalizarEstado(it.estado || v.estado) === 'Pedido').length;
  }, 0);

  const porCobrarTotal = ventasActivas.reduce((acc, v) => acc + saldoCliente(v), 0);

  return (
    <DataContext.Provider value={{
      ventas,
      compras,
      liquidaciones,
      loading,
      error,
      refreshData: fetchData,
      addVenta,
      updateVenta,
      deleteVenta,
      updateItemEstado,
      alertasListosSinEntrega: alertasListosSinEntrega(),
      clientesConDeudaAlta: clientesConDeudaAlta(),
      porComprar,
      porCobrarTotal,
      pedidosActivosCount: ventasActivas.length
    }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
