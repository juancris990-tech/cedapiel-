-- Agregar política RLS UPDATE para la tabla ventas
-- Esto permite que usuarios autenticados (incluyendo edge functions) puedan actualizar ventas
CREATE POLICY "Authenticated users can update sales"
ON public.ventas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Agregar política RLS DELETE para la tabla ventas (por completitud)
CREATE POLICY "Authenticated users can delete sales"
ON public.ventas
FOR DELETE
TO authenticated
USING (true);