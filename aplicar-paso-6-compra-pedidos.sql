-- ════════════════════════════════════════════════════════════
--  PASO 6 — Renglones de cada visita a Yesenia
-- ════════════════════════════════════════════════════════════
--  Para qué: una visita a Yesenia puede quedar A MEDIAS. Se paga parte de un
--  pedido un día y el resto días después. Antes la app solo guardaba el TOTAL
--  en ventas.abono_yesenia, así que no había forma de saber cuánto se pagó de
--  cada pedido EN CADA visita, y la lista de abonos mostraba los dos pagos
--  como si fueran uno solo.
--
--  Esta tabla es el "renglón" de la visita: qué pedido cubrió y cuánto se le
--  pagó ESE día. El saldo del pedido NO cambia: sigue saliendo de
--  ventas.items_camisa[].abono_yesenia, que es el acumulado.
--
--  CÓMO APLICAR:
--    1. Supabase → panel del proyecto → SQL Editor → New query
--    2. Copia TODO este archivo
--    3. Run / Ejecutar
--
--  ES SEGURO: no borra ni modifica datos. Solo crea una tabla nueva.
--  Se puede volver a ejecutar sin problema.
--  Si no la aplicas, la app sigue funcionando igual: lo detecta, avisa por
--  consola y los abonos se muestran como siempre.
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS compra_pedidos (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id  uuid NOT NULL REFERENCES compras_proveedor(id) ON DELETE CASCADE,
  venta_id   uuid NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  monto      numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE (compra_id, venta_id)
);

CREATE INDEX IF NOT EXISTS compra_pedidos_compra_idx ON compra_pedidos (compra_id);
CREATE INDEX IF NOT EXISTS compra_pedidos_venta_idx  ON compra_pedidos (venta_id);

-- Misma protección que las otras tablas: solo usuarios con sesión iniciada.
ALTER TABLE compra_pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compra_pedidos_all_authenticated ON compra_pedidos;
CREATE POLICY compra_pedidos_all_authenticated ON compra_pedidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verificación (opcional): debería devolver 0 filas.
-- SELECT policyname, roles FROM pg_policies WHERE tablename = 'compra_pedidos';
