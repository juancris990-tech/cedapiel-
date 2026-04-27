-- Agregar políticas RLS para permitir INSERT y UPDATE en servicios
-- Los usuarios autenticados pueden insertar servicios
CREATE POLICY "Authenticated users can insert services" 
ON public.servicios 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Los usuarios autenticados pueden actualizar servicios
CREATE POLICY "Authenticated users can update services" 
ON public.servicios 
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Los usuarios autenticados pueden eliminar servicios (desactivar)
CREATE POLICY "Authenticated users can delete services" 
ON public.servicios 
FOR DELETE 
TO authenticated
USING (true);