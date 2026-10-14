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
  validarPasoALiquidado,
  diasTranscurridos,
  hoyColombia,
  triggerConfetti,
  itemsCrudosVenta,
  fmt,
  COLORES_DEFECTO_OBJETOS,
  LUGARES_ENTREGA,
  ORDEN_ESTADOS
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

  // Catálogo dinámico y editable de lugares de entrega
  const [lugaresEntrega, setLugaresEntrega] = useState(() => {
    try {
      const guardados = localStorage.getItem('camisasiub_lugares');
      if (guardados) {
        const parsed = JSON.parse(guardados);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return LUGARES_ENTREGA;
  });

  // Persistir lugares de entrega en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('camisasiub_lugares', JSON.stringify(lugaresEntrega));
    } catch {}
  }, [lugaresEntrega]);

  // Catálogo dinámico y editable de colores de camisas
  const [colores, setColores] = useState(() => {
    try {
      const guardados = localStorage.getItem('camisasiub_colores');
      if (guardados) {
        const parsed = JSON.parse(guardados);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return COLORES_DEFECTO_OBJETOS;
  });

  // Persistir colores en localStorage
  useEffect(() => {
    try {
      localStorage.setItem('camisasiub_colores', JSON.stringify(colores));
    } catch {}
  }, [colores]);

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
      const payload = { ...nuevaVenta };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.telefono;
      if (!payload.cliente_telefono && nuevaVenta.telefono) {
        payload.cliente_telefono = nuevaVenta.telefono;
      }

      let res = await supabase.from('ventas').insert([payload]);
      if (res.error && String(res.error.message).toLowerCase().match(/updated_at|comprado_at|created_at/)) {
        delete payload.updated_at;
        delete payload.comprado_at;
        delete payload.created_at;
        res = await supabase.from('ventas').insert([payload]);
      }
      if (res.error) throw res.error;
      
      await fetchData();
      avisarCambioRealtime('venta', `registró un pedido nuevo de ${nuevaVenta.cliente_nombre || ''}`);
      triggerConfetti();
      return true;
    } catch (err) {
      console.error("[Supabase] Error al registrar venta:", err);
      throw err;
    }
  };

  // Actualizar una venta existente
  const updateVenta = async (id, cambios) => {
    try {
      const payload = { ...cambios };
      delete payload.id;
      delete payload.created_at;
      delete payload.telefono;
      if (!payload.cliente_telefono && cambios.telefono) {
        payload.cliente_telefono = cambios.telefono;
      }

      // Actualización optimista instantánea en memoria local
      setVentas(prev => prev.map(v => (String(v.id) === String(id) ? { ...v, ...cambios } : v)));

      let res = await supabase
        .from('ventas')
        .update(payload)
        .eq('id', id);

      if (res.error && String(res.error.message).toLowerCase().match(/updated_at|comprado_at/)) {
        delete payload.updated_at;
        delete payload.comprado_at;
        res = await supabase.from('ventas').update(payload).eq('id', id);
      }
      if (res.error) {
        console.error("[Supabase updateVenta error]", res.error);
        await fetchData();
        throw res.error;
      }

      await fetchData();
      avisarCambioRealtime('venta', `modificó un pedido.`);
      return true;
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
    const venta = ventas.find(v => String(v.id) === String(ventaId));
    if (!venta) return false;

    if (nuevoEstado === 'Liquidado') {
      const check = validarPasoALiquidado(venta, liquidaciones);
      if (!check.ok) {
        alert(`⚠️ No se puede marcar como Liquidado:\n\n• ${check.faltas.join('\n• ')}`);
        return false;
      }
    }

    let items = itemsCrudosVenta(venta);
    if (!items || !items.length) {
      const cant = Math.max(1, Number(venta.cantidad) || 1);
      items = Array.from({ length: cant }, () => ({
        modelo: venta.modelo || 'Viejo',
        genero: venta.genero || 'Hombre',
        color: venta.color || 'Negro',
        talla: venta.talla || 'M',
        programa: venta.cliente_programa || '',
        precio: Number(venta.precio_unitario) || 50000,
        costo: Number(venta.costo_unitario) || 30000,
        abono: Math.round((Number(venta.abono) || 0) / cant),
        estado: venta.estado || 'Pedido'
      }));
    } else {
      items = items.map(it => ({ ...it }));
    }

    if (items[itemIdx]) {
      items[itemIdx].estado = nuevoEstado;
      const jsonStr = JSON.stringify(items);

      // El estado general de la venta es el estado más retrasado entre todas las camisas
      const estadosOrdenados = items
        .map(it => normalizarEstado(it.estado || 'Pedido'))
        .sort((a, b) => ORDEN_ESTADOS.indexOf(a) - ORDEN_ESTADOS.indexOf(b));
      const estadoGeneral = estadosOrdenados[0] || 'Pedido';

      const cambios = {
        items_camisa: jsonStr,
        estado: estadoGeneral
      };

      await updateVenta(ventaId, cambios);
      if (nuevoEstado === 'Listo para entrega' || nuevoEstado === 'Liquidado') {
        triggerConfetti();
      }
      return true;
    }
  };

  // Cambiar estado de todo el pedido completo
  const updateOrderEstadoCompleto = async (ventaId, nuevoEstado) => {
    const venta = ventas.find(v => String(v.id) === String(ventaId));
    if (!venta) return false;

    if (nuevoEstado === 'Liquidado') {
      const check = validarPasoALiquidado(venta, liquidaciones);
      if (!check.ok) {
        alert(`⚠️ No se puede marcar como Liquidado:\n\n• ${check.faltas.join('\n• ')}`);
        return false;
      }
    }

    let items = itemsCrudosVenta(venta);
    if (items && items.length) {
      items = items.map(it => ({ ...it, estado: nuevoEstado }));
    }

    const cambios = {
      estado: nuevoEstado,
      ...(items ? { items_camisa: JSON.stringify(items) } : {})
    };

    await updateVenta(ventaId, cambios);
    if (nuevoEstado === 'Listo para entrega' || nuevoEstado === 'Liquidado') {
      triggerConfetti();
    }
    return true;
  };

  // Finalizar un pedido (moverlo al historial permanentemente)
  const finalizarPedido = async (ventaId) => {
    const venta = ventas.find(v => String(v.id) === String(ventaId));
    if (!venta) return false;

    if (!estadosTodosLiquidado(venta)) {
      alert(`⚠️ Para finalizar el pedido de ${venta.cliente_nombre || 'este cliente'}, todas sus prendas deben estar en estado "Liquidado" (100% pagado a Yesenia y liquidado entre socios).`);
      return false;
    }

    const conf = window.confirm(
      `¿Finalizar el pedido de ${venta.cliente_nombre || 'este cliente'}?\n\n` +
      `Pasará al Historial de pedidos y dejará de aparecer en la lista de pedidos activos.`
    );
    if (!conf) return false;

    try {
      await updateVenta(venta.id, { finalizado: true });
      triggerConfetti();
      return true;
    } catch (err) {
      console.error("Error al finalizar pedido:", err);
      alert("Error al finalizar el pedido: " + (err.message || err));
      return false;
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

  // --- MÉTODOS PARA GESTIÓN DE COLORES DE CAMISAS ---
  const agregarColor = (nuevoColor) => {
    const nombre = (nuevoColor?.nombre || '').trim();
    if (!nombre) throw new Error('El nombre del color es obligatorio.');
    const existe = colores.some(c => c.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) throw new Error(`El color "${nombre}" ya existe en el catálogo.`);

    const id = nombre.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36);
    const hex = nuevoColor?.hex || '#6366f1';
    const nuevoObj = { id, nombre, hex };
    setColores(prev => [...prev, nuevoObj]);
    return nuevoObj;
  };

  const actualizarColor = (id, data) => {
    const nombre = (data?.nombre || '').trim();
    if (!nombre) throw new Error('El nombre del color es obligatorio.');
    const existe = colores.some(c => c.id !== id && c.nombre.toLowerCase() === nombre.toLowerCase());
    if (existe) throw new Error(`Ya existe otro color con el nombre "${nombre}".`);

    setColores(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, nombre, hex: data?.hex || c.hex };
      }
      return c;
    }));
  };

  const eliminarColor = (id) => {
    if (colores.length <= 1) {
      throw new Error('Debe mantenerse al menos un color disponible.');
    }
    setColores(prev => prev.filter(c => c.id !== id));
  };

  const restablecerColores = () => {
    setColores(COLORES_DEFECTO_OBJETOS);
  };

  // --- MÉTODOS PARA GESTIÓN DE LUGARES DE ENTREGA ---
  const agregarLugarEntrega = (nuevoLugar) => {
    const lugar = (nuevoLugar || '').trim();
    if (!lugar) throw new Error('El nombre del lugar es obligatorio.');
    if (lugaresEntrega.some(l => l.toLowerCase() === lugar.toLowerCase())) {
      throw new Error(`El lugar "${lugar}" ya existe.`);
    }
    setLugaresEntrega(prev => {
      const filtrado = prev.filter(l => l.toLowerCase() !== 'otro');
      return [...filtrado, lugar, 'Otro'];
    });
  };

  const actualizarLugarEntrega = (lugarAntiguo, lugarNuevo) => {
    const viejo = (lugarAntiguo || '').trim();
    const nuevo = (lugarNuevo || '').trim();
    if (!nuevo) throw new Error('El nuevo nombre es obligatorio.');
    if (viejo.toLowerCase() === 'otro') throw new Error('El lugar "Otro" no se puede modificar.');
    setLugaresEntrega(prev => prev.map(l => l === viejo ? nuevo : l));
  };

  const eliminarLugarEntrega = (lugarAEliminar) => {
    const aBorrar = (lugarAEliminar || '').trim();
    if (aBorrar.toLowerCase() === 'otro') throw new Error('El lugar "Otro" es necesario para entregas personalizadas.');
    if (lugaresEntrega.length <= 2) throw new Error('Debe mantenerse al menos un lugar disponible.');
    setLugaresEntrega(prev => prev.filter(l => l !== aBorrar));
  };

  const restablecerLugaresEntrega = () => {
    setLugaresEntrega(LUGARES_ENTREGA);
  };

  // --- MÉTODOS PARA GESTIÓN DE USUARIOS ---
  const agregarUsuario = async ({ nombre, correo, rol, password }) => {
    const nom = (nombre || '').trim();
    const email = (correo || '').trim().toLowerCase();
    const r = rol || 'vendedor';

    if (!nom || !email) throw new Error('Nombre y correo son obligatorios.');
    if (!password || password.length < 6) throw new Error('La contraseña debe tener mínimo 6 caracteres.');

    // 1. Respaldar sesión activa de administrador
    let adminSession = null;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      adminSession = sessionData?.session;
    } catch {}

    // 2. Crear usuario en autenticación de Supabase
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password
      });
      if (signUpError) {
        console.warn('[Supabase Auth signUp warn]', signUpError.message);
      }
    } catch (e) {
      console.warn('[Supabase Auth error]', e);
    }

    // 3. Restaurar sesión del administrador
    if (adminSession) {
      try {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token
        });
      } catch {}
    }

    // 4. Insertar en tabla de usuarios
    try {
      const { data: inserted, error: insertError } = await supabase
        .from('usuarios')
        .insert({
          nombre: nom,
          correo: email,
          rol: r,
          vendedor: r === 'vendedor' ? nom : null
        })
        .select()
        .single();

      if (!insertError && inserted) {
        setUsuarios(prev => [inserted, ...prev]);
        return inserted;
      }
    } catch (e) {
      console.warn('[Supabase usuarios insert error]', e);
    }

    // 5. Fallback optimista local
    const fallbackUser = {
      id: 'usr-' + Date.now().toString(36),
      nombre: nom,
      correo: email,
      rol: r,
      created_at: new Date().toISOString()
    };
    setUsuarios(prev => [fallbackUser, ...prev]);
    return fallbackUser;
  };

  const actualizarUsuario = async (id, { nombre, rol }) => {
    const nom = (nombre || '').trim();
    const r = rol || 'vendedor';

    try {
      await supabase
        .from('usuarios')
        .update({ nombre: nom, rol: r })
        .eq('id', id);
    } catch (e) {
      console.warn('[Supabase update usuario warn]', e);
    }

    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, nombre: nom, rol: r } : u));
  };

  const eliminarUsuario = async (id) => {
    try {
      await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.warn('[Supabase delete usuario warn]', e);
    }

    setUsuarios(prev => prev.filter(u => u.id !== id));
  };

  return (
    <DataContext.Provider value={{
      ventas,
      compras,
      compraAportes,
      compraPedidos,
      liquidaciones,
      usuarios,
      colores,
      coloresNombres: colores.map(c => c.nombre),
      agregarColor,
      actualizarColor,
      eliminarColor,
      restablecerColores,
      lugaresEntrega,
      agregarLugarEntrega,
      actualizarLugarEntrega,
      eliminarLugarEntrega,
      restablecerLugaresEntrega,
      agregarUsuario,
      actualizarUsuario,
      eliminarUsuario,
      loading,
      error,
      refreshData: fetchData,
      addVenta,
      updateVenta,
      deleteVenta,
      updateItemEstado,
      updateOrderEstadoCompleto,
      finalizarPedido,
      validarPasoALiquidado: (v) => validarPasoALiquidado(v, liquidaciones),
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
