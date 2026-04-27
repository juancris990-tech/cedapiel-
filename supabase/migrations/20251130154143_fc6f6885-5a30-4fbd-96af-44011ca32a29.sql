-- Agregar políticas RLS para que usuarios autenticados puedan insertar en lotes_producto y stock_actual

-- Políticas para lotes_producto
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear lotes" ON public.lotes_producto;
CREATE POLICY "Usuarios autenticados pueden crear lotes"
  ON public.lotes_producto
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar lotes" ON public.lotes_producto;
CREATE POLICY "Usuarios autenticados pueden actualizar lotes"
  ON public.lotes_producto
  FOR UPDATE
  TO authenticated
  USING (true);

-- Políticas para stock_actual
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear stock" ON public.stock_actual;
CREATE POLICY "Usuarios autenticados pueden crear stock"
  ON public.stock_actual
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar stock individual" ON public.stock_actual;
CREATE POLICY "Usuarios autenticados pueden actualizar stock individual"
  ON public.stock_actual
  FOR UPDATE
  TO authenticated
  USING (true);