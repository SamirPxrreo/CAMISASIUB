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
  itemsCrudosVenta,
  fmt
} from '../lib/utils';

const DataContext = createContext(null);

export function DataProvider({ children }) {
  const { user, role } = useAuth();
  const [ventas, setVentas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [compraAportes, setCompraAportes] = useState([]);
  const [compraPedidos, setCompraPedidos] = useState([]);
  const [liquidaciones, setLiquidaciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Consulta real a todas las tablas de Supabase
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Cargar ventas reales
      const { data: vData, error: vErr } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false });

      if (vErr) {
        console.error("[Supabase] Error cargando ventas:", vErr);
        setError(vErr.message);
      } else {
        // Filtrar borrados lógicos como hace la app real
        const filtradas = (vData || []).filter(v => !v.eliminado_at);
        setVentas(filtradas);
      }

      // 2. Cargar compras al proveedor (tabla: compras_proveedor)
      try {
        const { data: cData, error: cErr } = await supabase
          .from('compras_proveedor')
          .select('*')
          .order('fecha', { ascending: false });
        if (!cErr && cData) setCompras(cData);
      } catch (e) {
        console.warn("[Supabase] compras_proveedor:", e);
      }

      // 3. Cargar aportes de compras
      try {
        const { data: caData } = await supabase.from('compra_aportes').select('*');
        if (caData) setCompraAportes(caData);
      } catch (e) {
        console.warn("[Supabase] compra_aportes:", e);
      }

      // 4. Cargar pedidos vinculados a compras
      try {
        const { data: cpData } = await supabase.from('compra_pedidos').select('*');
        if (cpData) setCompraPedidos(cpData);
      } catch (e) {
        console.warn("[Supabase] compra_pedidos:", e);
      }

      // 5. Cargar liquidaciones entre socios
      try {
        const { data: lData, error: lErr } = await supabase
          .from('liquidaciones')
          .select('*')
          .order('fecha', { ascending: false })
          .order('hora', { ascending: false });
        if (!lErr && lData) setLiquidaciones(lData);
      } catch (e) {
        console.warn("[Supabase] liquidaciones:", e);
      }

      // 6. Cargar usuarios del sistema
      try {
        const { data: uData } = await supabase.from('usuarios').select('*');
        if (uData) setUsuarios(uData);
      } catch (e) {
        console.warn("[Supabase] usuarios:", e);
      }

    } catch (err) {
      console.error("[Supabase] Error general de carga:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar datos al montar y cada vez que cambia el usuario autenticado
  useEffect(() => {
    fetchData();
  }, [user, fetchData]);

  // Suscripción Realtime para reflejar cambios en vivo entre dispositivos
  useEffect(() => {
    // Canal broadcast para avisos de cambios
    const canalAvisos = supabase.channel('avisos-camisas-iub', {
      config: { broadcast: { self: false } }
    })
      .on('broadcast', { event: 'cambio' }, () => {
        fetchData();
      })
      .subscribe();

    // Canal postgres_changes para cambios directos en BD
    const dbChannel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ventas' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'compras_proveedor' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'liquidaciones' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(canalAvisos);
      supabase.removeChannel(dbChannel);
    };
  }, [fetchData]);

  // Notificar cambio por Realtime
  const avisarCambioRealtime = (tipo, texto) => {
    try {
      const ch = supabase.channel('avisos-camisas-iub');
      ch.send({
        type: 'broadcast',
        event: 'cambio',
        payload: {
          tipo,
          texto,
          autor: user?.id || null,
          autorEmail: user?.email || null,
          fecha: new Date().toISOString()
        }
      });
    } catch {}
  };

  // Agregar una venta real en Supabase
  const addVenta = async (nuevaVenta) => {
    try {
      const payload = {
        ...nuevaVenta,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      let { data, error } = await supabase.from('ventas').insert([payload]).select().single();
      if (error && String(error.message).toLowerCase().match(/updated_at|comprado_at/)) {
        delete payload.updated_at;
        delete payload.comprado_at;
        const retry = await supabase.from('ventas').insert([payload]).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;
      
      await fetchData();
      avisarCambioRealtime('venta', `registró un pedido nuevo de ${nuevaVenta.cliente_nombre || ''}`);
      triggerConfetti();
      return data;
    } catch (err) {
      console.error("[Supabase] Error al registrar venta:", err);
      throw err;
    }
  };

  // Actualizar una venta existente
  const updateVenta = async (id, cambios) => {
    try {
      const payload = {
        ...cambios,
        updated_at: new Date().toISOString()
      };
      let { data, error } = await supabase
        .from('ventas')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error && String(error.message).toLowerCase().match(/updated_at|comprado_at/)) {
        delete payload.updated_at;
        delete payload.comprado_at;
        const retry = await supabase.from('ventas').update(payload).eq('id', id).select().single();
        data = retry.data;
        error = retry.error;
      }
      if (error) throw error;

      setVentas(prev => prev.map(v => v.id === id ? data : v));
      avisarCambioRealtime('venta', `modificó un pedido.`);
      return data;
    } catch (err) {
      console.error("[Supabase] Error al actualizar venta:", err);
      throw err;
    }
  };

  // Eliminar venta (borrado lógico seguro con eliminado_at)
  const deleteVenta = async (id) => {
    try {
      const { error } = await supabase
        .from('ventas')
        .update({ eliminado_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setVentas(prev => prev.filter(v => v.id !== id));
      avisarCambioRealtime('venta', `envió un pedido a la papelera.`);
    } catch (err) {
      console.error("[Supabase] Error al eliminar venta:", err);
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
    if (!esAdmin && miNombre && v.vendedor !== miNombre) return false;
    return true;
  });

  // Alerta 1: Listos para entrega sin cerrar
  const alertasListosSinEntrega = () => {
    const porClave = new Map();
    ventas.forEach(v => {
      if (v.finalizado || estadosTodosLiquidado(v) || !todosItemsListosEntrega(v)) return;
      if (!esAdmin && miNombre && v.vendedor !== miNombre) return;
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
      if (saldo > 0 && v.cliente_nombre) {
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
      compraAportes,
      compraPedidos,
      liquidaciones,
      usuarios,
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
