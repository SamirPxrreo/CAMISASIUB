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

-- (NO hay paso 6.) Al quitar la sincronizacion entre dispositivos (2026-09-26)
-- las 4 tablas siguen en la publicacion supabase_realtime, pero eso ya no
-- cuesta nada: sin clientes suscritos no se envia ningun mensaje. Se decidio
-- NO tocar Supabase. Si algun dia se cambia de idea, esta la alternativa en
-- PROYECTO.md, entrada 53.

