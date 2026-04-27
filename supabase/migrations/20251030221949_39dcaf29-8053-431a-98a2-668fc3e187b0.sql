
-- Crear vista de usuarios del sistema
CREATE OR REPLACE VIEW public.vw_usuarios_sistema AS
SELECT 
  p.id,
  p.email,
  p.nombre_completo,
  p.telefono,
  p.activo,
  p.ultimo_login,
  p.created_at,
  p.id_sucursal,
  s.nombre as sucursal_nombre,
  p.id_empleado,
  COALESCE(
    (SELECT array_agg(role::text) 
     FROM public.user_roles 
     WHERE user_id = p.id),
    ARRAY[]::text[]
  ) as roles
FROM public.profiles p
LEFT JOIN public.sucursales s ON s.id = p.id_sucursal;

-- Permitir que administradores vean la vista
CREATE POLICY "Admins pueden ver todos los usuarios sistema"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'direccion') OR 
  has_role(auth.uid(), 'admin_rrhh')
);

-- Asegurar que el permiso usuarios.gestionar existe en rol admin
UPDATE public.rol_definiciones
SET permisos_json = permisos_json || '{"usuarios.gestionar": true}'::jsonb
WHERE rol_sistema = 'admin';
