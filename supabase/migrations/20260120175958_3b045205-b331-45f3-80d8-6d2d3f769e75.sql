
-- Corregir políticas de bitacora_accion para que solo usuarios autenticados puedan acceder
DROP POLICY IF EXISTS "Cualquier usuario autenticado puede insertar en bitácora" ON public.bitacora_accion;
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer bitácora" ON public.bitacora_accion;

CREATE POLICY "Solo usuarios autenticados pueden insertar en bitácora"
ON public.bitacora_accion FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Solo usuarios autenticados pueden leer bitácora"
ON public.bitacora_accion FOR SELECT TO authenticated USING (true);

-- Corregir políticas de comisiones para que solo usuarios autenticados puedan acceder
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer comisiones" ON public.comisiones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear comisiones" ON public.comisiones;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar comisiones" ON public.comisiones;

CREATE POLICY "Solo autenticados pueden leer comisiones"
ON public.comisiones FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solo autenticados pueden crear comisiones"
ON public.comisiones FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Solo autenticados pueden actualizar comisiones"
ON public.comisiones FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Solo autenticados pueden eliminar comisiones"
ON public.comisiones FOR DELETE TO authenticated USING (true);
