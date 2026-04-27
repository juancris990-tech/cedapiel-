-- ============================================
-- MÓDULO DE CONTROL DE ACCESO - CEDAPIEL (PARTE 1: Enum y Tablas)
-- ============================================

-- 1. Agregar nuevos valores al enum de roles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'direccion' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'direccion';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin_rrhh' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'admin_rrhh';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'jefe_sucursal' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'jefe_sucursal';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'colaborador' AND enumtypid = 'app_role'::regtype) THEN
    ALTER TYPE app_role ADD VALUE 'colaborador';
  END IF;
END $$;

-- 2. Tabla de definiciones de roles con permisos granulares
CREATE TABLE IF NOT EXISTS public.rol_definiciones (
  rol_sistema VARCHAR PRIMARY KEY,
  descripcion_rol TEXT NOT NULL,
  permisos_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Extender tabla profiles para incluir campos de control de acceso
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS id_empleado BIGINT,
  ADD COLUMN IF NOT EXISTS telefono VARCHAR,
  ADD COLUMN IF NOT EXISTS id_sucursal BIGINT,
  ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP WITH TIME ZONE;

-- Agregar foreign keys después
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_empleado_fkey'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_empleado_fkey 
      FOREIGN KEY (id_empleado) REFERENCES public.empleados(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_id_sucursal_fkey'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_sucursal_fkey 
      FOREIGN KEY (id_sucursal) REFERENCES public.sucursales(id);
  END IF;
END $$;

-- 4. Tabla de bitácora de acceso
CREATE TABLE IF NOT EXISTS public.bitacora_acceso (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario_responsable UUID NOT NULL REFERENCES auth.users(id),
  id_usuario_afectado UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accion VARCHAR NOT NULL,
  detalle_json JSONB,
  motivo TEXT,
  ip_address VARCHAR,
  user_agent TEXT
);

-- 5. Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_bitacora_acceso_responsable ON public.bitacora_acceso(id_usuario_responsable);
CREATE INDEX IF NOT EXISTS idx_bitacora_acceso_afectado ON public.bitacora_acceso(id_usuario_afectado);
CREATE INDEX IF NOT EXISTS idx_bitacora_acceso_timestamp ON public.bitacora_acceso(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_id_empleado ON public.profiles(id_empleado);
CREATE INDEX IF NOT EXISTS idx_profiles_id_sucursal ON public.profiles(id_sucursal);
CREATE INDEX IF NOT EXISTS idx_profiles_activo ON public.profiles(activo);