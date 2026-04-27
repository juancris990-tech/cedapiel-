-- Crear enum de roles de aplicación (si no existe)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'gerencia', 'recepcion', 'profesional');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de roles de usuario
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  id_sucursal BIGINT REFERENCES public.sucursales(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Habilitar RLS en user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes antes de recrearlas
DROP POLICY IF EXISTS "Los usuarios pueden ver sus propios roles" ON public.user_roles;
DROP POLICY IF EXISTS "Los admins pueden ver todos los roles" ON public.user_roles;
DROP POLICY IF EXISTS "Los admins pueden insertar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Los admins pueden actualizar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Los admins pueden eliminar roles" ON public.user_roles;

-- Función security definer para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Función para obtener roles de un usuario
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Función para verificar si un usuario puede cambiar estado de cita
CREATE OR REPLACE FUNCTION public.puede_cambiar_estado_cita(
  _user_id UUID,
  _cita_id BIGINT,
  _estado_actual cita_estado_enum,
  _estado_nuevo cita_estado_enum
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _es_admin BOOLEAN;
  _es_gerencia BOOLEAN;
  _es_recepcion BOOLEAN;
  _es_profesional BOOLEAN;
  _empleado_id BIGINT;
  _cita_empleado_id BIGINT;
BEGIN
  -- Obtener roles del usuario
  _es_admin := public.has_role(_user_id, 'admin');
  _es_gerencia := public.has_role(_user_id, 'gerencia');
  _es_recepcion := public.has_role(_user_id, 'recepcion');
  _es_profesional := public.has_role(_user_id, 'profesional');
  
  -- Admin y gerencia pueden todo
  IF _es_admin OR _es_gerencia THEN
    RETURN TRUE;
  END IF;
  
  -- Obtener el empleado asociado a la cita
  SELECT id_empleado INTO _cita_empleado_id
  FROM public.agendas
  WHERE id = _cita_id;
  
  -- Recepción puede: agendada <-> confirmada, cancelar, marcar no_show
  IF _es_recepcion THEN
    IF (_estado_actual = 'agendada' AND _estado_nuevo IN ('confirmada', 'cancelada')) OR
       (_estado_actual = 'confirmada' AND _estado_nuevo IN ('agendada', 'cancelada', 'no_show')) THEN
      RETURN TRUE;
    END IF;
  END IF;
  
  -- Profesional puede: marcar presentado y completada en sus propias citas
  IF _es_profesional THEN
    -- Obtener id_empleado del profesional desde empleados (vinculado por email)
    SELECT id INTO _empleado_id
    FROM public.empleados
    WHERE email = (SELECT email FROM auth.users WHERE id = _user_id);
    
    IF _empleado_id = _cita_empleado_id THEN
      IF (_estado_actual = 'confirmada' AND _estado_nuevo = 'presentado') OR
         (_estado_actual = 'presentado' AND _estado_nuevo = 'completada') THEN
        RETURN TRUE;
      END IF;
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- Recrear políticas RLS para user_roles
CREATE POLICY "Los usuarios pueden ver sus propios roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Los admins pueden ver todos los roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Los admins pueden insertar roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Los admins pueden actualizar roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Los admins pueden eliminar roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);