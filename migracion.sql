-- ════════════════════════════════════════════════════════════
-- MIGRACIÓN — CAMISAS IUB
-- Ejecutar en Supabase (SQL Editor) para aplicar los cambios.
-- Es seguro ejecutarlo varias veces (usa IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════

-- 1. Pedidos: marcar como finalizados (Historial) y fecha de entrega opcional.
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS finalizado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ventas ALTER COLUMN fecha_entrega DROP NOT NULL;

-- 2. Hora de registro (Hora de Colombia) en Compras y Liquidaciones.
ALTER TABLE compras_proveedor ADD COLUMN IF NOT EXISTS hora TEXT;
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS hora TEXT;

-- 3. Hora de creación/edición en Pedidos (para mostrar 🕐 en la tabla).
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
-- Opcional: trigger para actualizar automáticamente en cada UPDATE
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS ventas_updated_at ON ventas;
CREATE TRIGGER ventas_updated_at BEFORE UPDATE ON ventas FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Fecha/hora de compra (cuando el pedido pasa a Comprado).
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS comprado_at timestamptz;

-- 5. PAPELERA: borrado logico de pedidos (2026-09-25).
--    Con esta columna, "Eliminar" un pedido solo le pone la fecha de borrado
--    y sale de Pedidos, pero se puede restaurar desde el boton "🗑️ Eliminados".
--    Si NO aplicas esta migracion, la app lo detecta y hace borrado definitivo
--    avisandote, asi que es seguro aplicarla o no.
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS eliminado_at timestamptz;

-- Indice para que la papelela (where eliminado_at is not null) sea rapida.
CREATE INDEX IF NOT EXISTS ventas_eliminado_at_idx ON ventas (eliminado_at);

-- 6. RENGELES DE CADA VISITA A YESENIA (2026-09-29).
--    Una visita a Yesenia puede quedar A MEDIAS: se paga parte de un pedido un
--    dia y el resto dias despues (caso Sara: $30.000 el domingo, $30.000 mas
--    tarde). Antes solo se guardaba el TOTAL en ventas.abono_yesenia, asi que
--    la app no tenia forma de saber cuanto se habia pagado de cada pedido EN
--    CADA visita, y la lista de abonos mostraba los dos pagos como uno solo.
--
--    Esta tabla es el "renglon" de la visita: que pedido cubrio y cuanto se
--    le pago ESE dia. El saldo del pedido NO cambia: sigue saliendo de
--    ventas.items_camisa[].abono_yesenia, que es el acumulado.
--
--    Los abonos guardados ANTES de esta migracion no tienen renglon. La app lo
--    detecta y los muestra como siempre, asi que se puede aplicar en cualquier
--    momento sin romper nada ni backfillrar nada.
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

-- Misma proteccion que las otras tablas: solo usuarios con sesion.
ALTER TABLE compra_pedidos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS compra_pedidos_all_authenticated ON compra_pedidos;
CREATE POLICY compra_pedidos_all_authenticated ON compra_pedidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- (Lo que estaba en el paso 6 antes: sincronizacion. Se dejo de hacer en 2026-09-26.
--  las 4 tablas siguen en la publicacion supabase_realtime, pero sin clientes
--  suscritos no se manda ningun mensaje, asi que no cuesta nada. La alternativa
--  esta anotada en PROYECTO.md, entrada 53.)

-- 7. PASO 7 — guardar un abono a Yesenia en una transaccion (2026-09-29).
--    Ver aplicar-paso-7-abono-atomico.sql: ahi esta la funcion completa con su
--    comentario. No se copia aqui para no tener la misma funcion en dos
--    archivos que se puedan desincronizar.
--
--    Sin esto, guardar un abono son N escrituras sueltas y, si se cae la señal
--    en la tercera, quedan pedidos con compra_id y abono_yesenia a medias.
--
--    La app detecta sola si la funcion existe: si no esta, avisa por consola y
--    usa el metodo viejo (guardarCompraSinTransaccion). No se rompe nada por no
--    aplicarla.



