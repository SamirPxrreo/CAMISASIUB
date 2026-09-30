-- ════════════════════════════════════════════════════════════
--  PASO 7 — Guardar un abono a Yesenia en una sola transacción
-- ════════════════════════════════════════════════════════════
--  POR QUÉ:
--  Guardar un abono hacen MUCHAS operaciones seguidas: insertar/actualizar la
--  compra, desvincular los pedidos que se sacaron, y luego por cada pedido
--  seleccionado un UPDATE (compra_id + items_camisa + abono_yesenia) y su
--  renglón en compra_pedidos. Todo eso va en N peticiones separadas, SIN
--  transacción.
--
--  Si se cae la señal (o el celular se bloquea, o se cierra la pestaña) en el
--  pedido 3 de 5, quedan los 2 primeros actualizados y los 3 últimos sin
--  tocar: el abono dice que cubre 5 pedidos pero solo cubre 2. Para arreglarlo
--  a mano hay que entrar pedido por pedido.
--
--  Esta función envuelve TODO en una sola transacción de Postgres: o se
--  guardan los 5 pedidos, o no se guarda ninguno. No hay ventana intermedia.
--
--  POR QUÉ CALCULA EL REPARTO AQUÍ Y NO EN JS:
--  La función recibe los valores YA calculados por la app (items_camisa con
--  el abono_yesenia acumulado, abono_yesenia del pedido y el monto del
--  renglón). El reparto equitativo y las reglas de negocio se quedan en JS,
--  donde ya están y probadas; esta función solo se encarga de que ESCRIBIR
--  sea todo-o-nada.
--
--  CÓMO APLICAR:
--    1. Supabase → panel del proyecto → SQL Editor → New query
--    2. Copia TODO este archivo
--    3. Run / Ejecutar
--
--  ES SEGURO: no borra ni modifica datos. Solo crea una función.
--  Se puede volver a ejecutar sin problema.
--  Si no la aplicas, la app sigue funcionando con el método viejo (N
--  UPDATE sueltos): avisa por consola y no se rompe nada.
-- ════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION guardar_abono_yesenia(
  p_compra       jsonb,   -- { id?, fecha, comprador, observaciones, total }
  p_desvincular  uuid[],  -- pedidos que se quitan de esta compra
  p_pedidos      jsonb,   -- [{ venta_id, items_camisa (texto), abono_yesenia, monto_renglon }]
  p_aporte       jsonb    -- { persona, monto, fecha } — el aporte automático
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_compra_id uuid;
  v_fecha     text;
  v_registro  jsonb;
  v_pedido    jsonb;
  v_id        uuid;
  v_items     text;
  v_abono     numeric;
  v_monto     numeric;
  v_total     numeric;
BEGIN
  v_fecha     := p_compra ->> 'fecha';
  v_total     := COALESCE((p_compra ->> 'total')::numeric, 0);

  ------------------------------------------------------------------
  -- 1) La compra: actualizar si ya existe, crearla si es nueva.
  ------------------------------------------------------------------
  IF (p_compra ->> 'id') IS NOT NULL AND (p_compra ->> 'id') <> '' THEN
    v_compra_id := (p_compra ->> 'id')::uuid;

    UPDATE compras_proveedor
       SET fecha        = v_fecha,
           comprador    = p_compra ->> 'comprador',
           proveedor    = COALESCE(p_compra ->> 'proveedor', 'Yesenia'),
           observaciones = p_compra ->> 'observaciones',
           total        = v_total,
           hora         = COALESCE(p_compra ->> 'hora', to_char(now() at time zone 'America/Bogota', 'HH24:MI'))
     WHERE id = v_compra_id;
  ELSE
    INSERT INTO compras_proveedor (fecha, comprador, proveedor, observaciones, total, hora)
    VALUES (
      v_fecha,
      p_compra ->> 'comprador',
      COALESCE(p_compra ->> 'proveedor', 'Yesenia'),
      p_compra ->> 'observaciones',
      v_total,
      COALESCE(p_compra ->> 'hora', to_char(now() at time zone 'America/Bogota', 'HH24:MI'))
    )
    RETURNING id INTO v_compra_id;
  END IF;

  ------------------------------------------------------------------
  -- 2) Desvincular los pedidos que se sacaron.
  --    Solo los que SEGUEN apuntando a esta compra: si un pedido ya se
  --    completó en otra visita, ponerlo en null lo dejaría sin abono.
  ------------------------------------------------------------------
  IF p_desvincular IS NOT NULL AND array_length(p_desvincular, 1) > 0 THEN
    UPDATE ventas
       SET compra_id = NULL,
           estado    = 'Pedido'
     WHERE id = ANY(p_desvincular)
       AND compra_id = v_compra_id;
  END IF;

  ------------------------------------------------------------------
  -- 3) Los pedidos seleccionados, uno por uno.
  ------------------------------------------------------------------
  FOR v_pedido IN SELECT * FROM jsonb_array_elements(COALESCE(p_pedidos, '[]'::jsonb))
  LOOP
    v_id    := (v_pedido ->> 'venta_id')::uuid;
    v_items := v_pedido ->> 'items_camisa';
    v_abono := COALESCE((v_pedido ->> 'abono_yesenia')::numeric, 0);
    v_monto := COALESCE((v_pedido ->> 'monto_renglon')::numeric, 0);

    UPDATE ventas
       SET compra_id      = v_compra_id,
           items_camisa   = v_items,
           abono_yesenia  = v_abono,
           updated_at     = now()
     WHERE id = v_id;

    -- El renglón de ESTA visita: se borra y se pone el nuevo, para que
    -- reeditar un abono no deje dos renglones del mismo pedido.
    DELETE FROM compra_pedidos
     WHERE compra_id = v_compra_id AND venta_id = v_id;

    IF v_monto > 0 THEN
      INSERT INTO compra_pedidos (compra_id, venta_id, monto)
      VALUES (v_compra_id, v_id, v_monto)
      ON CONFLICT (compra_id, venta_id) DO UPDATE SET monto = EXCLUDED.monto;
    END IF;
  END LOOP;

  ------------------------------------------------------------------
  -- 4) El aporte de quien pagó (registro automático).
  --    Se borra el anterior de ESA persona con `observacion = ''` (el
  --    automático) y se pone el nuevo, para no duplicar al reeditar.
  --    Los aportes manuales (observacion con texto) no se tocan.
  ------------------------------------------------------------------
  v_persona := p_aporte ->> 'persona';
  v_montoAp := COALESCE((p_aporte ->> 'monto')::numeric, 0);
  IF v_persona IS NOT NULL AND v_persona <> '' AND v_montoAp > 0 THEN
    DELETE FROM compra_aportes
     WHERE compra_id = v_compra_id
       AND persona = v_persona
       AND COALESCE(observacion, '') = '';

    INSERT INTO compra_aportes (compra_id, persona, monto, fecha, observacion)
    VALUES (
      v_compra_id,
      v_persona,
      v_montoAp,
      COALESCE(p_aporte ->> 'fecha', v_fecha),
      ''
    );
  END IF;

  RETURN v_compra_id;
END;
$$;

-- Permiso: solo usuarios con sesión (misma regla que el resto de la app).
GRANT EXECUTE ON FUNCTION guardar_abono_yesenia(jsonb, uuid[], jsonb, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION guardar_abono_yesenia(jsonb, uuid[], jsonb, jsonb) FROM anon;
