-- Limpiar y consolidar políticas RLS duplicadas en venta_items
-- Primero eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Authenticated users can create sale items" ON venta_items;
DROP POLICY IF EXISTS "Authenticated users can read sale items" ON venta_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar items" ON venta_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear items" ON venta_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden eliminar items" ON venta_items;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer items" ON venta_items;

-- Crear políticas consolidadas y claras
CREATE POLICY "Usuarios autenticados pueden leer items"
ON venta_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden crear items"
ON venta_items FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar items"
ON venta_items FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar items"
ON venta_items FOR DELETE
TO authenticated
USING (true);

COMMENT ON POLICY "Usuarios autenticados pueden leer items" ON venta_items IS 'Permite a usuarios autenticados leer todos los items de venta';
COMMENT ON POLICY "Usuarios autenticados pueden crear items" ON venta_items IS 'Permite a usuarios autenticados crear items de venta';
COMMENT ON POLICY "Usuarios autenticados pueden actualizar items" ON venta_items IS 'Permite a usuarios autenticados actualizar items de venta';
COMMENT ON POLICY "Usuarios autenticados pueden eliminar items" ON venta_items IS 'Permite a usuarios autenticados eliminar items de venta';