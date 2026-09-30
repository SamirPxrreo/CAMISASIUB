-- ============================================================================
--  Paso 8: la hora se guarda con SEGUNDOS  (HH:MM:SS)
-- ============================================================================
--
--  POR QUE ESTE PASO
--  La funcion guardar_abono_yesenia rellenaba compras_proveedor.hora con
--  to_char(now() ..., 'HH24:MI'), o sea SIN segundos. Dos abonos del mismo
--  minuto quedaban con la misma hora y no se distinguian al ordenar. La app
--  ya manda y muestra HH:MM:SS (horaColombia en app.v2.js, desde el 2026-09-30);
--  faltaba que Postgres guardara los segundos tambien.
--
--  QUE CAMBIA Y QUE NO
--  CAMBIA: el formato de la hora, en DOS lugares (UPDATE e INSERT). Nada mas.
--  NO CAMBIA: como se reparte el abono, los totales, el redondeo, ni que se
--  desvinculen los pedidos. Esa parte es la que mueve plata y va COPIADA
--  byte a byte del paso 7. Para comprobarlo, la unica diferencia entre los
--  dos archivos debe ser HH24:MI -> HH24:MI:SS.
--
--  ANTES DE CORRERLO, CORRE ESTO SOLO PARA VER (no cambia nada):
--
--    SELECT column_name, data_type, time_precision
--      FROM information_schema.columns
--     WHERE table_name IN ('compras_proveedor','liquidaciones')
--       AND column_name = 'hora';
--
--    time_precision = 0 (o vacio) significa que la columna es TIME sin
--    precision, y ESO YA ALCANZA para guardar segundos: en Postgres
--    TIME(0) guarda hasta el segundo. Si en cambio sale data_type =
--    character varying con un limite de 5 o menos, hay que ensanchar la
--    columna primero, porque "16:10:23" son 8 caracteres:
--
--    ALTER TABLE compras_proveedor ALTER COLUMN hora TYPE varchar(8);
--    ALTER TABLE liquidaciones     ALTER COLUMN hora TYPE varchar(8);
--
--  DESPUES, EN EL SQL EDITOR DE SUPABASE: pegar y Run. Es idempotente.
-- ============================================================================
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
  -- `fecha` es una columna DATE en compras_proveedor (verificado el 2026-09-30
  -- al ejecutar la funcion: "column fecha is of type date but expression is of
  -- type text"). Por eso esta variable es date y NO text: asignar un text a
  -- una columna date dentro de plpgsql falla.
  v_fecha     date;
  v_pedido    jsonb;
  v_id        uuid;
  v_items     text;      -- items_camisa es TEXT en la base, NO jsonb
  v_abono     numeric;
  v_monto     numeric;
  v_total     numeric;
  v_persona   text;      -- quién aporta en esta visita
  v_montoAp   numeric;   -- cuánto aporta
  v_fechaAp   date;      -- fecha del aporte (compra_aportes.fecha)
BEGIN
  v_fecha     := (p_compra ->> 'fecha')::date;
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
           hora         = COALESCE(p_compra ->> 'hora', to_char(now() at time zone 'America/Bogota', 'HH24:MI:SS'))
     WHERE id = v_compra_id;
  ELSE
    INSERT INTO compras_proveedor (fecha, comprador, proveedor, observaciones, total, hora)
    VALUES (
      v_fecha,
      p_compra ->> 'comprador',
      COALESCE(p_compra ->> 'proveedor', 'Yesenia'),
      p_compra ->> 'observaciones',
      v_total,
      COALESCE(p_compra ->> 'hora', to_char(now() at time zone 'America/Bogota', 'HH24:MI:SS'))
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

    -- OJO: `items_camisa` es TEXT en la base, NO jsonb (aunque el PROYECTO.md
    -- lo diga jsonb — se verificó el 2026-09-30). Por eso `v_items` es text y
    -- NO lleva `::jsonb`: castearlo a jsonb haría fallar la función.
    --
    -- Y el COALESCE es importante: si la app mandara `items_camisa: null`, un
    -- `SET items_camisa = v_items` GUARDARÍA NULL y se perdería el detalle de
    -- las camisas del pedido. Con COALESCE, si no llega nada, se conserva lo
    -- que había. Preferimos un dato viejo a perder información.
    UPDATE ventas
       SET compra_id      = v_compra_id,
           items_camisa   = COALESCE(v_items, items_camisa),
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
  v_fechaAp := COALESCE((p_aporte ->> 'fecha')::date, v_fecha);
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
      v_fechaAp,
      ''
    );
  END IF;

  RETURN v_compra_id;
END;
$$;

-- Permiso: solo usuarios con sesión (misma regla que el resto de la app).
GRANT EXECUTE ON FUNCTION guardar_abono_yesenia(jsonb, uuid[], jsonb, jsonb) TO authenticated;
REVOKE EXECUTE ON FUNCTION guardar_abono_yesenia(jsonb, uuid[], jsonb, jsonb) FROM anon;
