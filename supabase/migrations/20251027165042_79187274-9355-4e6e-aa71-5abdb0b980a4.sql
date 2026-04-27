-- Actualizar política de INSERT en productos para incluir a recepción
DROP POLICY IF EXISTS "Administradores pueden crear productos" ON public.productos;

CREATE POLICY "Administradores y recepción pueden crear productos"
ON public.productos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role, 'recepcion'::app_role])
  )
);

-- Actualizar política de UPDATE en productos para incluir a recepción
DROP POLICY IF EXISTS "Administradores pueden actualizar productos" ON public.productos;

CREATE POLICY "Administradores y recepción pueden actualizar productos"
ON public.productos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role, 'recepcion'::app_role])
  )
);