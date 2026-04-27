-- Función global para actualizar updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- TABLA: sucursales (Branches)
-- =========================================================
CREATE TABLE sucursales (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    direccion VARCHAR(150) NOT NULL,
    municipio VARCHAR(80),
    estado VARCHAR(80),
    telefono VARCHAR(20),
    correo_contacto VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_sucursales_updated_at
BEFORE UPDATE ON sucursales
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: clientes (Clients)
-- =========================================================
CREATE TABLE clientes (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(60) NOT NULL,
    apellidos VARCHAR(80),
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    fecha_nacimiento DATE,
    genero VARCHAR(20) CHECK (genero IN ('Masculino', 'Femenino', 'No binario', 'Prefiero no decir')),
    direccion VARCHAR(120),
    notas TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_clientes_updated_at
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: empleados (Employees)
-- =========================================================
CREATE TABLE empleados (
    id BIGSERIAL PRIMARY KEY,
    id_sucursal BIGINT REFERENCES sucursales(id) ON DELETE RESTRICT,
    nombre VARCHAR(60) NOT NULL,
    apellidos VARCHAR(80),
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    especialidad VARCHAR(80),
    es_profesional BOOLEAN DEFAULT FALSE,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_empleados_updated_at
BEFORE UPDATE ON empleados
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: categoria_servicio (Service Categories)
-- =========================================================
CREATE TABLE categoria_servicio (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(80) UNIQUE NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_categoria_servicio_updated_at
BEFORE UPDATE ON categoria_servicio
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: servicios (Services)
-- =========================================================
CREATE TABLE servicios (
    id BIGSERIAL PRIMARY KEY,
    id_categoria BIGINT REFERENCES categoria_servicio(id) ON DELETE SET NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10,2) NOT NULL,
    duracion_minutos SMALLINT DEFAULT 30,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_servicios_updated_at
BEFORE UPDATE ON servicios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: agendas (Appointments)
-- =========================================================
CREATE TABLE agendas (
    id BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    id_empleado BIGINT REFERENCES empleados(id) ON DELETE SET NULL,
    id_sucursal BIGINT NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    id_servicio BIGINT REFERENCES servicios(id) ON DELETE SET NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (
        estado IN ('pendiente','confirmada','en_atencion','finalizada','cancelada','no_asiste')
    ),
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_agendas_updated_at
BEFORE UPDATE ON agendas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: ventas (Sales)
-- =========================================================
CREATE TABLE ventas (
    id BIGSERIAL PRIMARY KEY,
    id_cliente BIGINT NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    id_sucursal BIGINT NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    fecha TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    estado_venta VARCHAR(12) NOT NULL CHECK (estado_venta IN ('Pagada', 'Pendiente')),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    descuento NUMERIC(12,2) DEFAULT 0,
    impuestos NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_ventas_updated_at
BEFORE UPDATE ON ventas
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- TABLA: venta_items (Sale Items)
-- =========================================================
CREATE TABLE venta_items (
    id BIGSERIAL PRIMARY KEY,
    id_venta BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    id_servicio BIGINT REFERENCES servicios(id) ON DELETE SET NULL,
    cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
    precio_unitario NUMERIC(12,2) NOT NULL,
    subtotal NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- TABLA: profiles (User Profiles for Authentication)
-- =========================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    nombre_completo TEXT,
    rol VARCHAR(20) DEFAULT 'recepcionista' CHECK (rol IN ('administrador', 'recepcionista', 'profesional')),
    id_sucursal BIGINT REFERENCES sucursales(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- =========================================================
-- RLS POLICIES
-- =========================================================

-- Enable RLS on all tables
ALTER TABLE sucursales ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE categoria_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE venta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Sucursales policies (all authenticated users can read)
CREATE POLICY "Authenticated users can read branches"
ON sucursales FOR SELECT
TO authenticated
USING (true);

-- Clientes policies
CREATE POLICY "Authenticated users can read clients"
ON clientes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create clients"
ON clientes FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update clients"
ON clientes FOR UPDATE
TO authenticated
USING (true);

-- Empleados policies
CREATE POLICY "Authenticated users can read employees"
ON empleados FOR SELECT
TO authenticated
USING (true);

-- Categoria_servicio policies
CREATE POLICY "Authenticated users can read service categories"
ON categoria_servicio FOR SELECT
TO authenticated
USING (true);

-- Servicios policies
CREATE POLICY "Authenticated users can read services"
ON servicios FOR SELECT
TO authenticated
USING (true);

-- Agendas policies
CREATE POLICY "Authenticated users can read appointments"
ON agendas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create appointments"
ON agendas FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update appointments"
ON agendas FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete appointments"
ON agendas FOR DELETE
TO authenticated
USING (true);

-- Ventas policies
CREATE POLICY "Authenticated users can read sales"
ON ventas FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create sales"
ON ventas FOR INSERT
TO authenticated
WITH CHECK (true);

-- Venta_items policies
CREATE POLICY "Authenticated users can read sale items"
ON venta_items FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create sale items"
ON venta_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- =========================================================
-- TRIGGER: Auto-create profile on user signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nombre_completo, rol)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'nombre_completo', ''),
    'recepcionista'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- =========================================================
-- DATOS INICIALES (Sample Data)
-- =========================================================

-- Insert sample branches
INSERT INTO sucursales (nombre, direccion, municipio, estado, telefono) VALUES
('Polanco', 'Av. Presidente Masaryk 111', 'Miguel Hidalgo', 'Ciudad de México', '5555551234'),
('Guadalajara', 'Av. Chapultepec 200', 'Guadalajara', 'Jalisco', '3333334567');

-- Insert sample service categories
INSERT INTO categoria_servicio (nombre, descripcion) VALUES
('Dermatología', 'Servicios dermatológicos generales'),
('Estética Facial', 'Tratamientos de estética facial'),
('Depilación Láser', 'Servicios de depilación láser'),
('Corporal', 'Tratamientos corporales');

-- Insert sample services
INSERT INTO servicios (id_categoria, nombre, descripcion, precio, duracion_minutos) VALUES
(1, 'Consulta Dermatológica', 'Consulta general de dermatología', 800.00, 30),
(2, 'Limpieza Facial', 'Limpieza facial profunda', 1200.00, 60),
(3, 'Depilación Láser Completa', 'Sesión de depilación láser', 2500.00, 90),
(4, 'Masaje Reductivo', 'Masaje para reducción de medidas', 1500.00, 60);

-- Insert sample employees
INSERT INTO empleados (id_sucursal, nombre, apellidos, email, especialidad, es_profesional) VALUES
(1, 'Dr. Carlos', 'Méndez', 'carlos.mendez@cedapiel.com', 'Dermatología', true),
(1, 'Dra. Ana', 'García', 'ana.garcia@cedapiel.com', 'Estética', true),
(2, 'Dr. Luis', 'Rodríguez', 'luis.rodriguez@cedapiel.com', 'Dermatología', true);

-- Insert sample clients
INSERT INTO clientes (nombre, apellidos, email, telefono, fecha_nacimiento, genero) VALUES
('María', 'López', 'maria.lopez@email.com', '5551234567', '1990-05-15', 'Femenino'),
('Juan', 'Pérez', 'juan.perez@email.com', '5559876543', '1985-08-22', 'Masculino'),
('Laura', 'Martínez', 'laura.martinez@email.com', '5555554321', '1992-03-10', 'Femenino');-- ============================================
-- MIGRACIÓN: MÓDULO AGENDA Y CITAS COMPLETO
-- ============================================

-- 1. Crear ENUM para estados de cita
CREATE TYPE public.cita_estado_enum AS ENUM (
  'agendada',
  'confirmada', 
  'presentado',
  'completada',
  'cancelada',
  'no_show'
);

-- 2. Eliminar constraint check existente y default antes de convertir
ALTER TABLE public.agendas DROP CONSTRAINT IF EXISTS agendas_estado_check;
ALTER TABLE public.agendas ALTER COLUMN estado DROP DEFAULT;

-- 3. Convertir tipo de columna
ALTER TABLE public.agendas 
  ALTER COLUMN estado TYPE public.cita_estado_enum 
  USING CASE
    WHEN estado = 'pendiente' THEN 'agendada'::public.cita_estado_enum
    WHEN estado = 'en_atencion' THEN 'presentado'::public.cita_estado_enum
    WHEN estado = 'finalizada' THEN 'completada'::public.cita_estado_enum
    WHEN estado = 'no_asiste' THEN 'no_show'::public.cita_estado_enum
    WHEN estado = 'confirmada' THEN 'confirmada'::public.cita_estado_enum
    WHEN estado = 'cancelada' THEN 'cancelada'::public.cita_estado_enum
    ELSE 'agendada'::public.cita_estado_enum
  END;

-- 4. Establecer nuevo default
ALTER TABLE public.agendas 
  ALTER COLUMN estado SET DEFAULT 'agendada'::public.cita_estado_enum;

-- 5. Agregar campos de check-in/check-out y cancelación
ALTER TABLE public.agendas 
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS cambiado_por UUID REFERENCES auth.users(id);

-- 6. Tabla de notas de clientes
CREATE TABLE IF NOT EXISTS public.notas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Tabla de notas de citas
CREATE TABLE IF NOT EXISTS public.notas_citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita BIGINT NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Tabla de historial de estados (auditoría)
CREATE TABLE IF NOT EXISTS public.citas_historial_estado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita BIGINT NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  estado_anterior public.cita_estado_enum,
  estado_nuevo public.cita_estado_enum NOT NULL,
  motivo TEXT,
  cambiado_por UUID NOT NULL REFERENCES auth.users(id),
  cambiado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_agendas_fecha_estado ON public.agendas(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_agendas_empleado_fecha ON public.agendas(id_empleado, fecha);
CREATE INDEX IF NOT EXISTS idx_agendas_sucursal_fecha ON public.agendas(id_sucursal, fecha);
CREATE INDEX IF NOT EXISTS idx_notas_clientes_lookup ON public.notas_clientes(id_cliente, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notas_citas_lookup ON public.notas_citas(id_cita, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_historial_cita ON public.citas_historial_estado(id_cita, cambiado_en DESC);

-- 10. Trigger para auditar cambios de estado
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.citas_historial_estado (
      id_cita,
      estado_anterior,
      estado_nuevo,
      motivo,
      cambiado_por,
      cambiado_en
    ) VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      NEW.motivo_cancelacion,
      NEW.cambiado_por,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_auditar_estado
  AFTER UPDATE ON public.agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_cambio_estado();

-- 11. Función para validar transiciones de estado
CREATE OR REPLACE FUNCTION public.validar_transicion_estado(
  estado_actual public.cita_estado_enum,
  estado_nuevo public.cita_estado_enum
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE
    -- Desde agendada
    WHEN estado_actual = 'agendada' THEN 
      estado_nuevo IN ('confirmada', 'cancelada')
    -- Desde confirmada
    WHEN estado_actual = 'confirmada' THEN 
      estado_nuevo IN ('presentado', 'cancelada', 'no_show')
    -- Desde presentado
    WHEN estado_actual = 'presentado' THEN 
      estado_nuevo IN ('completada', 'cancelada')
    -- Otros casos no permitidos por defecto
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 12. Trigger para validar transiciones antes de actualizar
CREATE OR REPLACE FUNCTION public.validar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    IF NOT public.validar_transicion_estado(OLD.estado, NEW.estado) THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    -- Si cambia a 'presentado', registrar check_in
    IF NEW.estado = 'presentado' AND NEW.check_in_at IS NULL THEN
      NEW.check_in_at := now();
    END IF;
    
    -- Si cambia a 'completada', registrar check_out
    IF NEW.estado = 'completada' AND NEW.check_out_at IS NULL THEN
      NEW.check_out_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_validar_transicion
  BEFORE UPDATE ON public.agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_cambio_estado();

-- 13. RLS Policies para notas_clientes
ALTER TABLE public.notas_clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer notas de clientes"
  ON public.notas_clientes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear notas de clientes"
  ON public.notas_clientes FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

-- 14. RLS Policies para notas_citas
ALTER TABLE public.notas_citas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer notas de citas"
  ON public.notas_citas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear notas de citas"
  ON public.notas_citas FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

-- 15. RLS Policies para historial de estados
ALTER TABLE public.citas_historial_estado ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer historial"
  ON public.citas_historial_estado FOR SELECT
  TO authenticated
  USING (true);-- ============================================
-- MIGRACIÓN: MÓDULO AGENDA Y CITAS COMPLETO
-- ============================================

-- 1. Crear ENUM para estados de cita (solo si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cita_estado_enum') THEN
    CREATE TYPE public.cita_estado_enum AS ENUM (
      'agendada',
      'confirmada', 
      'presentado',
      'completada',
      'cancelada',
      'no_show'
    );
  END IF;
END $$;

-- 2. Convertir columna solo si aún no es del tipo enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agendas' 
    AND column_name = 'estado' 
    AND udt_name != 'cita_estado_enum'
  ) THEN
    -- Eliminar constraint check y default
    ALTER TABLE public.agendas DROP CONSTRAINT IF EXISTS agendas_estado_check;
    ALTER TABLE public.agendas ALTER COLUMN estado DROP DEFAULT;
    
    -- Convertir tipo de columna
    ALTER TABLE public.agendas 
      ALTER COLUMN estado TYPE public.cita_estado_enum 
      USING CASE
        WHEN estado = 'pendiente' THEN 'agendada'::public.cita_estado_enum
        WHEN estado = 'en_atencion' THEN 'presentado'::public.cita_estado_enum
        WHEN estado = 'finalizada' THEN 'completada'::public.cita_estado_enum
        WHEN estado = 'no_asiste' THEN 'no_show'::public.cita_estado_enum
        WHEN estado = 'confirmada' THEN 'confirmada'::public.cita_estado_enum
        WHEN estado = 'cancelada' THEN 'cancelada'::public.cita_estado_enum
        ELSE 'agendada'::public.cita_estado_enum
      END;
      
    -- Establecer nuevo default
    ALTER TABLE public.agendas 
      ALTER COLUMN estado SET DEFAULT 'agendada'::public.cita_estado_enum;
  END IF;
END $$;

-- 3. Agregar campos de check-in/check-out y cancelación
ALTER TABLE public.agendas 
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS cambiado_por UUID REFERENCES auth.users(id);

-- 4. Tabla de notas de clientes
CREATE TABLE IF NOT EXISTS public.notas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabla de notas de citas
CREATE TABLE IF NOT EXISTS public.notas_citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita BIGINT NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabla de historial de estados (auditoría)
CREATE TABLE IF NOT EXISTS public.citas_historial_estado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita BIGINT NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  estado_anterior public.cita_estado_enum,
  estado_nuevo public.cita_estado_enum NOT NULL,
  motivo TEXT,
  cambiado_por UUID NOT NULL REFERENCES auth.users(id),
  cambiado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_agendas_fecha_estado ON public.agendas(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_agendas_empleado_fecha ON public.agendas(id_empleado, fecha);
CREATE INDEX IF NOT EXISTS idx_agendas_sucursal_fecha ON public.agendas(id_sucursal, fecha);
CREATE INDEX IF NOT EXISTS idx_notas_clientes_lookup ON public.notas_clientes(id_cliente, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notas_citas_lookup ON public.notas_citas(id_cita, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_historial_cita ON public.citas_historial_estado(id_cita, cambiado_en DESC);

-- 8. Trigger para auditar cambios de estado
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.citas_historial_estado (
      id_cita,
      estado_anterior,
      estado_nuevo,
      motivo,
      cambiado_por,
      cambiado_en
    ) VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      NEW.motivo_cancelacion,
      NEW.cambiado_por,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auditar_estado ON public.agendas;
CREATE TRIGGER trigger_auditar_estado
  AFTER UPDATE ON public.agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_cambio_estado();

-- 9. Función para validar transiciones de estado
CREATE OR REPLACE FUNCTION public.validar_transicion_estado(
  estado_actual public.cita_estado_enum,
  estado_nuevo public.cita_estado_enum
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE
    -- Desde agendada
    WHEN estado_actual = 'agendada' THEN 
      estado_nuevo IN ('confirmada', 'cancelada')
    -- Desde confirmada
    WHEN estado_actual = 'confirmada' THEN 
      estado_nuevo IN ('presentado', 'cancelada', 'no_show')
    -- Desde presentado
    WHEN estado_actual = 'presentado' THEN 
      estado_nuevo IN ('completada', 'cancelada')
    -- Otros casos no permitidos por defecto
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Trigger para validar transiciones antes de actualizar
CREATE OR REPLACE FUNCTION public.validar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    IF NOT public.validar_transicion_estado(OLD.estado, NEW.estado) THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    -- Si cambia a 'presentado', registrar check_in
    IF NEW.estado = 'presentado' AND NEW.check_in_at IS NULL THEN
      NEW.check_in_at := now();
    END IF;
    
    -- Si cambia a 'completada', registrar check_out
    IF NEW.estado = 'completada' AND NEW.check_out_at IS NULL THEN
      NEW.check_out_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_validar_transicion ON public.agendas;
CREATE TRIGGER trigger_validar_transicion
  BEFORE UPDATE ON public.agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_cambio_estado();

-- 11. RLS Policies para notas_clientes
ALTER TABLE public.notas_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer notas de clientes" ON public.notas_clientes;
CREATE POLICY "Usuarios autenticados pueden leer notas de clientes"
  ON public.notas_clientes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear notas de clientes" ON public.notas_clientes;
CREATE POLICY "Usuarios autenticados pueden crear notas de clientes"
  ON public.notas_clientes FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

-- 12. RLS Policies para notas_citas
ALTER TABLE public.notas_citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer notas de citas" ON public.notas_citas;
CREATE POLICY "Usuarios autenticados pueden leer notas de citas"
  ON public.notas_citas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear notas de citas" ON public.notas_citas;
CREATE POLICY "Usuarios autenticados pueden crear notas de citas"
  ON public.notas_citas FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

-- 13. RLS Policies para historial de estados
ALTER TABLE public.citas_historial_estado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer historial" ON public.citas_historial_estado;
CREATE POLICY "Usuarios autenticados pueden leer historial"
  ON public.citas_historial_estado FOR SELECT
  TO authenticated
  USING (true);-- ============================================
-- MIGRACIÓN: MÓDULO AGENDA Y CITAS COMPLETO
-- ============================================

-- 1. Crear ENUM para estados de cita (solo si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cita_estado_enum') THEN
    CREATE TYPE public.cita_estado_enum AS ENUM (
      'agendada',
      'confirmada', 
      'presentado',
      'completada',
      'cancelada',
      'no_show'
    );
  END IF;
END $$;

-- 2. Convertir columna solo si aún no es del tipo enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'agendas' 
    AND column_name = 'estado' 
    AND udt_name != 'cita_estado_enum'
  ) THEN
    -- Eliminar constraint check y default
    ALTER TABLE public.agendas DROP CONSTRAINT IF EXISTS agendas_estado_check;
    ALTER TABLE public.agendas ALTER COLUMN estado DROP DEFAULT;
    
    -- Convertir tipo de columna
    ALTER TABLE public.agendas 
      ALTER COLUMN estado TYPE public.cita_estado_enum 
      USING CASE
        WHEN estado = 'pendiente' THEN 'agendada'::public.cita_estado_enum
        WHEN estado = 'en_atencion' THEN 'presentado'::public.cita_estado_enum
        WHEN estado = 'finalizada' THEN 'completada'::public.cita_estado_enum
        WHEN estado = 'no_asiste' THEN 'no_show'::public.cita_estado_enum
        WHEN estado = 'confirmada' THEN 'confirmada'::public.cita_estado_enum
        WHEN estado = 'cancelada' THEN 'cancelada'::public.cita_estado_enum
        ELSE 'agendada'::public.cita_estado_enum
      END;
      
    -- Establecer nuevo default
    ALTER TABLE public.agendas 
      ALTER COLUMN estado SET DEFAULT 'agendada'::public.cita_estado_enum;
  END IF;
END $$;

-- 3. Agregar campos de check-in/check-out y cancelación
ALTER TABLE public.agendas 
  ADD COLUMN IF NOT EXISTS check_in_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS check_out_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT,
  ADD COLUMN IF NOT EXISTS cambiado_por UUID REFERENCES auth.users(id);

-- 4. Tabla de notas de clientes
CREATE TABLE IF NOT EXISTS public.notas_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Tabla de notas de citas
CREATE TABLE IF NOT EXISTS public.notas_citas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita BIGINT NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  nota TEXT NOT NULL,
  creado_por UUID NOT NULL REFERENCES auth.users(id),
  creado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabla de historial de estados (auditoría)
CREATE TABLE IF NOT EXISTS public.citas_historial_estado (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cita BIGINT NOT NULL REFERENCES public.agendas(id) ON DELETE CASCADE,
  estado_anterior public.cita_estado_enum,
  estado_nuevo public.cita_estado_enum NOT NULL,
  motivo TEXT,
  cambiado_por UUID NOT NULL REFERENCES auth.users(id),
  cambiado_en TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_agendas_fecha_estado ON public.agendas(fecha, estado);
CREATE INDEX IF NOT EXISTS idx_agendas_empleado_fecha ON public.agendas(id_empleado, fecha);
CREATE INDEX IF NOT EXISTS idx_agendas_sucursal_fecha ON public.agendas(id_sucursal, fecha);
CREATE INDEX IF NOT EXISTS idx_notas_clientes_lookup ON public.notas_clientes(id_cliente, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_notas_citas_lookup ON public.notas_citas(id_cita, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_historial_cita ON public.citas_historial_estado(id_cita, cambiado_en DESC);

-- 8. Trigger para auditar cambios de estado
CREATE OR REPLACE FUNCTION public.registrar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    INSERT INTO public.citas_historial_estado (
      id_cita,
      estado_anterior,
      estado_nuevo,
      motivo,
      cambiado_por,
      cambiado_en
    ) VALUES (
      NEW.id,
      OLD.estado,
      NEW.estado,
      NEW.motivo_cancelacion,
      NEW.cambiado_por,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_auditar_estado ON public.agendas;
CREATE TRIGGER trigger_auditar_estado
  AFTER UPDATE ON public.agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_cambio_estado();

-- 9. Función para validar transiciones de estado
CREATE OR REPLACE FUNCTION public.validar_transicion_estado(
  estado_actual public.cita_estado_enum,
  estado_nuevo public.cita_estado_enum
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE
    -- Desde agendada
    WHEN estado_actual = 'agendada' THEN 
      estado_nuevo IN ('confirmada', 'cancelada')
    -- Desde confirmada
    WHEN estado_actual = 'confirmada' THEN 
      estado_nuevo IN ('presentado', 'cancelada', 'no_show')
    -- Desde presentado
    WHEN estado_actual = 'presentado' THEN 
      estado_nuevo IN ('completada', 'cancelada')
    -- Otros casos no permitidos por defecto
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 10. Trigger para validar transiciones antes de actualizar
CREATE OR REPLACE FUNCTION public.validar_cambio_estado()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    IF NOT public.validar_transicion_estado(OLD.estado, NEW.estado) THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    -- Si cambia a 'presentado', registrar check_in
    IF NEW.estado = 'presentado' AND NEW.check_in_at IS NULL THEN
      NEW.check_in_at := now();
    END IF;
    
    -- Si cambia a 'completada', registrar check_out
    IF NEW.estado = 'completada' AND NEW.check_out_at IS NULL THEN
      NEW.check_out_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_validar_transicion ON public.agendas;
CREATE TRIGGER trigger_validar_transicion
  BEFORE UPDATE ON public.agendas
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_cambio_estado();

-- 11. RLS Policies para notas_clientes
ALTER TABLE public.notas_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer notas de clientes" ON public.notas_clientes;
CREATE POLICY "Usuarios autenticados pueden leer notas de clientes"
  ON public.notas_clientes FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear notas de clientes" ON public.notas_clientes;
CREATE POLICY "Usuarios autenticados pueden crear notas de clientes"
  ON public.notas_clientes FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

-- 12. RLS Policies para notas_citas
ALTER TABLE public.notas_citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer notas de citas" ON public.notas_citas;
CREATE POLICY "Usuarios autenticados pueden leer notas de citas"
  ON public.notas_citas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear notas de citas" ON public.notas_citas;
CREATE POLICY "Usuarios autenticados pueden crear notas de citas"
  ON public.notas_citas FOR INSERT
  TO authenticated
  WITH CHECK (creado_por = auth.uid());

-- 13. RLS Policies para historial de estados
ALTER TABLE public.citas_historial_estado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer historial" ON public.citas_historial_estado;
CREATE POLICY "Usuarios autenticados pueden leer historial"
  ON public.citas_historial_estado FOR SELECT
  TO authenticated
  USING (true);-- Crear enum de roles de aplicación
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
    -- Obtener id_empleado del profesional desde profiles
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

-- Políticas RLS para user_roles
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

-- Comentarios
COMMENT ON TABLE public.user_roles IS 'Tabla de roles de usuario para control de acceso';
COMMENT ON FUNCTION public.has_role IS 'Verifica si un usuario tiene un rol específico';
COMMENT ON FUNCTION public.get_user_roles IS 'Obtiene todos los roles de un usuario';
COMMENT ON FUNCTION public.puede_cambiar_estado_cita IS 'Verifica si un usuario puede cambiar el estado de una cita según su rol';-- Crear enum de roles de aplicación (si no existe)
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
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);-- 1. Crear tipo ENUM para tipo de pago
DO $$ BEGIN
  CREATE TYPE tipo_pago_enum AS ENUM ('venta', 'anticipo', 'abono', 'giftcard');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Crear tabla parametros_sistema
CREATE TABLE IF NOT EXISTS public.parametros_sistema (
  id BIGSERIAL PRIMARY KEY,
  pais VARCHAR(100) NOT NULL DEFAULT 'México',
  moneda VARCHAR(10) NOT NULL DEFAULT 'MXN',
  formato_monetario VARCHAR(50) NOT NULL DEFAULT '$1,000.00',
  iva_incluido BOOLEAN NOT NULL DEFAULT TRUE,
  tasa_iva NUMERIC(5,2) NOT NULL DEFAULT 16.00,
  periodo_comision_inicio VARCHAR(20) NOT NULL DEFAULT 'sábado',
  periodo_comision_fin VARCHAR(20) NOT NULL DEFAULT 'viernes',
  semana_laboral VARCHAR(100) NOT NULL DEFAULT 'lunes,martes,miércoles,jueves,viernes,sábado',
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Insertar configuración por defecto si no existe
INSERT INTO public.parametros_sistema (
  pais, moneda, formato_monetario, iva_incluido, tasa_iva,
  periodo_comision_inicio, periodo_comision_fin, semana_laboral, activo
)
SELECT 'México', 'MXN', '$1,000.00', TRUE, 16.00, 'sábado', 'viernes', 
       'lunes,martes,miércoles,jueves,viernes,sábado', TRUE
WHERE NOT EXISTS (SELECT 1 FROM public.parametros_sistema WHERE activo = TRUE);

-- 3. Crear vista de parámetros activos
CREATE OR REPLACE VIEW public.vw_parametros_activos AS
SELECT 
  id,
  pais,
  moneda,
  formato_monetario,
  iva_incluido,
  tasa_iva,
  periodo_comision_inicio,
  periodo_comision_fin,
  semana_laboral
FROM public.parametros_sistema
WHERE activo = TRUE
ORDER BY created_at DESC
LIMIT 1;

-- 4. Agregar campos de descuento a venta_items
ALTER TABLE public.venta_items 
  ADD COLUMN IF NOT EXISTS precio_original NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS descuento_porcentaje NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS precio_final NUMERIC(12,2);

-- Actualizar registros existentes
UPDATE public.venta_items 
SET 
  precio_original = precio_unitario,
  precio_final = precio_unitario,
  descuento_porcentaje = 0
WHERE precio_original IS NULL;

-- 5. Crear tabla pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id BIGSERIAL PRIMARY KEY,
  id_venta BIGINT REFERENCES public.ventas(id),
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  tipo_pago tipo_pago_enum NOT NULL DEFAULT 'venta',
  monto NUMERIC(12,2) NOT NULL,
  es_ingreso_diferido BOOLEAN DEFAULT FALSE,
  fecha_pago TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metodo_pago VARCHAR(50),
  referencia VARCHAR(100),
  notas TEXT,
  aplicado_a_venta BOOLEAN DEFAULT FALSE,
  fecha_aplicacion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 6. Crear vista de ingresos diferidos
CREATE OR REPLACE VIEW public.vw_ingresos_diferidos AS
SELECT 
  p.id_cliente,
  c.nombre,
  c.apellidos,
  p.id_sucursal,
  s.nombre AS sucursal,
  SUM(p.monto) AS saldo_total,
  COUNT(*) AS cantidad_anticipos,
  MIN(p.fecha_pago) AS fecha_primer_anticipo,
  MAX(p.fecha_pago) AS fecha_ultimo_anticipo
FROM public.pagos p
JOIN public.clientes c ON p.id_cliente = c.id
JOIN public.sucursales s ON p.id_sucursal = s.id
WHERE p.tipo_pago = 'anticipo' 
  AND p.es_ingreso_diferido = TRUE
  AND p.aplicado_a_venta = FALSE
GROUP BY p.id_cliente, c.nombre, c.apellidos, p.id_sucursal, s.nombre;

-- 7. Crear tabla comisiones
CREATE TABLE IF NOT EXISTS public.comisiones (
  id BIGSERIAL PRIMARY KEY,
  id_empleado BIGINT NOT NULL REFERENCES public.empleados(id),
  id_venta BIGINT REFERENCES public.ventas(id),
  id_venta_item BIGINT REFERENCES public.venta_items(id),
  id_categoria_servicio BIGINT REFERENCES public.categoria_servicio(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  monto_base NUMERIC(12,2) NOT NULL,
  porcentaje_comision NUMERIC(5,2) NOT NULL,
  monto_comision NUMERIC(12,2) NOT NULL,
  id_empleado_secundario BIGINT REFERENCES public.empleados(id),
  porcentaje_split NUMERIC(5,2) DEFAULT 0,
  monto_comision_secundario NUMERIC(12,2) DEFAULT 0,
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,
  fecha_pago DATE,
  estado VARCHAR(50) DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 8. Habilitar RLS en nuevas tablas
ALTER TABLE public.parametros_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comisiones ENABLE ROW LEVEL SECURITY;

-- 9. Políticas RLS para parametros_sistema
CREATE POLICY "Usuarios autenticados pueden leer parámetros" 
  ON public.parametros_sistema FOR SELECT 
  USING (true);

CREATE POLICY "Solo admins pueden modificar parámetros" 
  ON public.parametros_sistema FOR ALL 
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. Políticas RLS para pagos
CREATE POLICY "Usuarios autenticados pueden leer pagos" 
  ON public.pagos FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear pagos" 
  ON public.pagos FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar pagos" 
  ON public.pagos FOR UPDATE 
  USING (true);

-- 11. Políticas RLS para comisiones
CREATE POLICY "Usuarios autenticados pueden leer comisiones" 
  ON public.comisiones FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear comisiones" 
  ON public.comisiones FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar comisiones" 
  ON public.comisiones FOR UPDATE 
  USING (true);

-- 12. Triggers para updated_at
CREATE TRIGGER set_updated_at_parametros
  BEFORE UPDATE ON public.parametros_sistema
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_pagos
  BEFORE UPDATE ON public.pagos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_comisiones
  BEFORE UPDATE ON public.comisiones
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();-- 1. Crear tipo ENUM para estado de permiso
DO $$ BEGIN
  CREATE TYPE estado_permiso_enum AS ENUM ('Aprobado', 'Denegado', 'En proceso');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Ampliar tabla empleados con datos laborales
ALTER TABLE public.empleados 
  ADD COLUMN IF NOT EXISTS tipo_jornada VARCHAR(20),
  ADD COLUMN IF NOT EXISTS horas_semana NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS salario_hora NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS vigencia_salario DATE,
  ADD COLUMN IF NOT EXISTS vacaciones_disponibles NUMERIC(4,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_contratacion DATE,
  ADD COLUMN IF NOT EXISTS fecha_termino DATE;

-- 3. Crear tabla asistencias
CREATE TABLE IF NOT EXISTS public.asistencias (
  id BIGSERIAL PRIMARY KEY,
  id_empleado BIGINT NOT NULL REFERENCES public.empleados(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  fecha DATE NOT NULL,
  hora_checkin TIME,
  hora_checkout TIME,
  tipo_turno VARCHAR(20),
  horas_trabajadas NUMERIC(5,2),
  notas TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  UNIQUE(id_empleado, fecha)
);

-- 4. Crear tabla permisos
CREATE TABLE IF NOT EXISTS public.permisos (
  id BIGSERIAL PRIMARY KEY,
  id_empleado BIGINT NOT NULL REFERENCES public.empleados(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  tipo VARCHAR(30) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  aprobado_por BIGINT REFERENCES public.empleados(id),
  estado estado_permiso_enum NOT NULL DEFAULT 'En proceso',
  motivo TEXT,
  notas_aprobacion TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 5. Crear tabla gastos_sucursal
CREATE TABLE IF NOT EXISTS public.gastos_sucursal (
  id BIGSERIAL PRIMARY KEY,
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  categoria VARCHAR(50) NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  fecha DATE NOT NULL,
  descripcion TEXT,
  id_empleado_registro BIGINT REFERENCES public.empleados(id),
  referencia VARCHAR(100),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 6. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_asistencias_empleado_fecha 
  ON public.asistencias(id_empleado, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_asistencias_sucursal_fecha 
  ON public.asistencias(id_sucursal, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_permisos_empleado 
  ON public.permisos(id_empleado, fecha_inicio, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_gastos_sucursal_fecha 
  ON public.gastos_sucursal(id_sucursal, fecha DESC);

-- 7. Crear trigger para calcular horas trabajadas automáticamente
CREATE OR REPLACE FUNCTION public.calcular_horas_trabajadas()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.hora_checkin IS NOT NULL AND NEW.hora_checkout IS NOT NULL THEN
    NEW.horas_trabajadas := EXTRACT(EPOCH FROM (NEW.hora_checkout - NEW.hora_checkin)) / 3600;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_calcular_horas_trabajadas
  BEFORE INSERT OR UPDATE ON public.asistencias
  FOR EACH ROW
  EXECUTE FUNCTION public.calcular_horas_trabajadas();

-- 8. Crear vista de rentabilidad por sucursal
CREATE OR REPLACE VIEW public.vw_rentabilidad_sucursal AS
WITH ventas_sucursal AS (
  SELECT 
    v.id_sucursal,
    DATE_TRUNC('month', v.fecha) AS mes,
    SUM(v.total) AS total_ventas,
    COUNT(v.id) AS cantidad_ventas
  FROM public.ventas v
  GROUP BY v.id_sucursal, DATE_TRUNC('month', v.fecha)
),
comisiones_sucursal AS (
  SELECT 
    c.id_sucursal,
    DATE_TRUNC('month', c.created_at) AS mes,
    SUM(c.monto_comision + COALESCE(c.monto_comision_secundario, 0)) AS total_comisiones
  FROM public.comisiones c
  GROUP BY c.id_sucursal, DATE_TRUNC('month', c.created_at)
),
gastos_sucursal_mes AS (
  SELECT 
    g.id_sucursal,
    DATE_TRUNC('month', g.fecha) AS mes,
    SUM(CASE WHEN g.categoria = 'Renta' THEN g.monto ELSE 0 END) AS gastos_renta,
    SUM(CASE WHEN g.categoria = 'Mantenimiento' THEN g.monto ELSE 0 END) AS gastos_mantenimiento,
    SUM(CASE WHEN g.categoria = 'Servicios' THEN g.monto ELSE 0 END) AS gastos_servicios,
    SUM(CASE WHEN g.categoria = 'Seguros' THEN g.monto ELSE 0 END) AS gastos_seguros,
    SUM(CASE WHEN g.categoria = 'Marketing' THEN g.monto ELSE 0 END) AS gastos_marketing,
    SUM(CASE WHEN g.categoria = 'Asesorías' THEN g.monto ELSE 0 END) AS gastos_asesorias,
    SUM(CASE WHEN g.categoria = 'Sueldos' THEN g.monto ELSE 0 END) AS gastos_sueldos,
    SUM(CASE WHEN g.categoria = 'Equipos' THEN g.monto ELSE 0 END) AS gastos_equipos,
    SUM(g.monto) AS total_gastos
  FROM public.gastos_sucursal g
  GROUP BY g.id_sucursal, DATE_TRUNC('month', g.fecha)
)
SELECT 
  s.id,
  s.nombre AS sucursal,
  vs.mes,
  COALESCE(vs.total_ventas, 0) AS total_ventas,
  COALESCE(vs.cantidad_ventas, 0) AS cantidad_ventas,
  COALESCE(cs.total_comisiones, 0) AS total_comisiones,
  COALESCE(gs.gastos_renta, 0) AS gastos_renta,
  COALESCE(gs.gastos_mantenimiento, 0) AS gastos_mantenimiento,
  COALESCE(gs.gastos_servicios, 0) AS gastos_servicios,
  COALESCE(gs.gastos_seguros, 0) AS gastos_seguros,
  COALESCE(gs.gastos_marketing, 0) AS gastos_marketing,
  COALESCE(gs.gastos_asesorias, 0) AS gastos_asesorias,
  COALESCE(gs.gastos_sueldos, 0) AS gastos_sueldos,
  COALESCE(gs.gastos_equipos, 0) AS gastos_equipos,
  COALESCE(gs.total_gastos, 0) AS total_gastos,
  COALESCE(vs.total_ventas, 0) - (COALESCE(cs.total_comisiones, 0) + COALESCE(gs.total_gastos, 0)) AS resultado_neto,
  CASE 
    WHEN COALESCE(vs.total_ventas, 0) > 0 
    THEN ROUND(((COALESCE(vs.total_ventas, 0) - (COALESCE(cs.total_comisiones, 0) + COALESCE(gs.total_gastos, 0))) / vs.total_ventas * 100), 2)
    ELSE 0 
  END AS margen_neto_porcentaje
FROM public.sucursales s
CROSS JOIN (
  SELECT DISTINCT mes FROM ventas_sucursal
  UNION
  SELECT DISTINCT mes FROM comisiones_sucursal
  UNION
  SELECT DISTINCT mes FROM gastos_sucursal_mes
) periodos
LEFT JOIN ventas_sucursal vs ON s.id = vs.id_sucursal AND periodos.mes = vs.mes
LEFT JOIN comisiones_sucursal cs ON s.id = cs.id_sucursal AND periodos.mes = cs.mes
LEFT JOIN gastos_sucursal_mes gs ON s.id = gs.id_sucursal AND periodos.mes = gs.mes
WHERE s.activo = TRUE
ORDER BY s.nombre, periodos.mes DESC;

-- 9. Crear vista de productividad por empleado
CREATE OR REPLACE VIEW public.vw_productividad_empleado AS
WITH horas_empleado AS (
  SELECT 
    a.id_empleado,
    DATE_TRUNC('week', a.fecha) AS semana,
    SUM(COALESCE(a.horas_trabajadas, 0)) AS total_horas_trabajadas,
    COUNT(DISTINCT a.fecha) AS dias_asistidos
  FROM public.asistencias a
  WHERE a.horas_trabajadas IS NOT NULL
  GROUP BY a.id_empleado, DATE_TRUNC('week', a.fecha)
),
ingresos_empleado AS (
  SELECT 
    ag.id_empleado,
    DATE_TRUNC('week', v.fecha) AS semana,
    SUM(v.total) AS total_ingresos_generados,
    COUNT(DISTINCT v.id) AS cantidad_ventas
  FROM public.ventas v
  JOIN public.agendas ag ON v.id_cliente = ag.id_cliente 
    AND DATE(v.fecha) = ag.fecha
  GROUP BY ag.id_empleado, DATE_TRUNC('week', v.fecha)
),
comisiones_empleado AS (
  SELECT 
    c.id_empleado,
    DATE_TRUNC('week', c.created_at) AS semana,
    SUM(c.monto_comision) AS total_comisiones_ganadas
  FROM public.comisiones c
  GROUP BY c.id_empleado, DATE_TRUNC('week', c.created_at)
)
SELECT 
  e.id,
  e.nombre,
  e.apellidos,
  e.especialidad,
  e.id_sucursal,
  s.nombre AS sucursal,
  he.semana,
  COALESCE(he.total_horas_trabajadas, 0) AS horas_trabajadas,
  COALESCE(he.dias_asistidos, 0) AS dias_asistidos,
  COALESCE(ie.total_ingresos_generados, 0) AS ingresos_generados,
  COALESCE(ie.cantidad_ventas, 0) AS cantidad_ventas,
  COALESCE(ce.total_comisiones_ganadas, 0) AS comisiones_ganadas,
  CASE 
    WHEN COALESCE(he.total_horas_trabajadas, 0) > 0 
    THEN ROUND(COALESCE(ie.total_ingresos_generados, 0) / he.total_horas_trabajadas, 2)
    ELSE 0 
  END AS productividad_hora,
  CASE 
    WHEN COALESCE(ie.cantidad_ventas, 0) > 0 
    THEN ROUND(COALESCE(ie.total_ingresos_generados, 0) / ie.cantidad_ventas, 2)
    ELSE 0 
  END AS ticket_promedio
FROM public.empleados e
LEFT JOIN public.sucursales s ON e.id_sucursal = s.id
LEFT JOIN horas_empleado he ON e.id = he.id_empleado
LEFT JOIN ingresos_empleado ie ON e.id = ie.id_empleado AND he.semana = ie.semana
LEFT JOIN comisiones_empleado ce ON e.id = ce.id_empleado AND he.semana = ce.semana
WHERE e.activo = TRUE
ORDER BY e.nombre, e.apellidos, he.semana DESC;

-- 10. Habilitar RLS en nuevas tablas
ALTER TABLE public.asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos_sucursal ENABLE ROW LEVEL SECURITY;

-- 11. Políticas RLS para asistencias
CREATE POLICY "Usuarios autenticados pueden leer asistencias" 
  ON public.asistencias FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear asistencias" 
  ON public.asistencias FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar asistencias" 
  ON public.asistencias FOR UPDATE 
  USING (true);

-- 12. Políticas RLS para permisos
CREATE POLICY "Usuarios autenticados pueden leer permisos" 
  ON public.permisos FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear permisos" 
  ON public.permisos FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar permisos" 
  ON public.permisos FOR UPDATE 
  USING (true);

-- 13. Políticas RLS para gastos_sucursal
CREATE POLICY "Usuarios autenticados pueden leer gastos" 
  ON public.gastos_sucursal FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear gastos" 
  ON public.gastos_sucursal FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar gastos" 
  ON public.gastos_sucursal FOR UPDATE 
  USING (true);

-- 14. Triggers para updated_at
CREATE TRIGGER set_updated_at_asistencias
  BEFORE UPDATE ON public.asistencias
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_permisos
  BEFORE UPDATE ON public.permisos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_gastos_sucursal
  BEFORE UPDATE ON public.gastos_sucursal
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();-- 1. Ampliar tabla clientes con expediente y saldos
ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS numero_expediente VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS saldo_favor NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_contra NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_ultima_visita DATE;

-- 2. Crear índice único para expediente
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_expediente 
  ON public.clientes(numero_expediente) 
  WHERE numero_expediente IS NOT NULL;

-- 3. Crear tabla campanias_marketing
CREATE TABLE IF NOT EXISTS public.campanias_marketing (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  segmento TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  presupuesto NUMERIC(12,2),
  gasto_real NUMERIC(12,2) DEFAULT 0,
  responsable BIGINT REFERENCES public.empleados(id),
  id_sucursal BIGINT REFERENCES public.sucursales(id),
  estado VARCHAR(30) DEFAULT 'Planificada',
  objetivo TEXT,
  resultados TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla mensajes_enviados
CREATE TABLE IF NOT EXISTS public.mensajes_enviados (
  id BIGSERIAL PRIMARY KEY,
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id),
  id_campania BIGINT REFERENCES public.campanias_marketing(id),
  canal VARCHAR(30) NOT NULL,
  contenido TEXT,
  fecha_envio TIMESTAMP NOT NULL DEFAULT NOW(),
  estado VARCHAR(30) DEFAULT 'Enviado',
  abierto BOOLEAN DEFAULT FALSE,
  fecha_apertura TIMESTAMP,
  respondido BOOLEAN DEFAULT FALSE,
  fecha_respuesta TIMESTAMP,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 5. Crear tabla encuestas_satisfaccion (si no existe)
CREATE TABLE IF NOT EXISTS public.encuestas_satisfaccion (
  id BIGSERIAL PRIMARY KEY,
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id),
  id_cita BIGINT REFERENCES public.agendas(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  calificacion_servicio INTEGER CHECK (calificacion_servicio >= 1 AND calificacion_servicio <= 5),
  calificacion_instalaciones INTEGER CHECK (calificacion_instalaciones >= 1 AND calificacion_instalaciones <= 5),
  comentarios TEXT,
  fecha_encuesta DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 6. Vista: No Show Rate
CREATE OR REPLACE VIEW public.vw_no_show_rate AS
WITH citas_por_periodo AS (
  SELECT 
    id_sucursal,
    DATE_TRUNC('month', fecha) AS mes,
    COUNT(*) AS total_citas,
    COUNT(*) FILTER (WHERE estado = 'no_show') AS total_no_show,
    COUNT(*) FILTER (WHERE estado = 'completada') AS total_completadas,
    COUNT(*) FILTER (WHERE estado = 'cancelada') AS total_canceladas
  FROM public.agendas
  GROUP BY id_sucursal, DATE_TRUNC('month', fecha)
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  c.mes,
  c.total_citas,
  c.total_no_show,
  c.total_completadas,
  c.total_canceladas,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.total_no_show::NUMERIC / c.total_citas * 100), 2)
    ELSE 0 
  END AS no_show_rate_porcentaje,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.total_completadas::NUMERIC / c.total_citas * 100), 2)
    ELSE 0 
  END AS tasa_completadas_porcentaje
FROM public.sucursales s
LEFT JOIN citas_por_periodo c ON s.id = c.id_sucursal
WHERE s.activo = TRUE
ORDER BY s.nombre, c.mes DESC;

-- 7. Vista: Ocupación de cabinas (asumiendo jornada de 8:00 a 20:00, lunes a sábado)
CREATE OR REPLACE VIEW public.vw_ocupacion_cabinas AS
WITH minutos_reservados AS (
  SELECT 
    id_sucursal,
    DATE_TRUNC('month', fecha) AS mes,
    COUNT(*) AS total_citas,
    SUM(
      EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 60
    ) AS minutos_reservados
  FROM public.agendas
  WHERE estado IN ('confirmada', 'presentado', 'completada')
  GROUP BY id_sucursal, DATE_TRUNC('month', fecha)
),
dias_habiles AS (
  SELECT 
    s.id AS id_sucursal,
    DATE_TRUNC('month', d.fecha) AS mes,
    COUNT(*) AS dias_laborables
  FROM public.sucursales s
  CROSS JOIN (
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months'),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS fecha
  ) d
  WHERE EXTRACT(DOW FROM d.fecha) BETWEEN 1 AND 6
  GROUP BY s.id, DATE_TRUNC('month', d.fecha)
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  mr.mes,
  COALESCE(mr.total_citas, 0) AS total_citas,
  COALESCE(mr.minutos_reservados, 0) AS minutos_reservados,
  (dh.dias_laborables * 12 * 60) AS minutos_disponibles,
  CASE 
    WHEN dh.dias_laborables > 0 
    THEN ROUND((COALESCE(mr.minutos_reservados, 0) / (dh.dias_laborables * 12 * 60)::NUMERIC * 100), 2)
    ELSE 0 
  END AS porcentaje_ocupacion
FROM public.sucursales s
LEFT JOIN minutos_reservados mr ON s.id = mr.id_sucursal
LEFT JOIN dias_habiles dh ON s.id = dh.id_sucursal AND mr.mes = dh.mes
WHERE s.activo = TRUE
ORDER BY s.nombre, mr.mes DESC;

-- 8. Vista: Satisfacción (NPS)
CREATE OR REPLACE VIEW public.vw_satisfaccion AS
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  DATE_TRUNC('month', e.fecha_encuesta) AS mes,
  COUNT(*) AS total_encuestas,
  ROUND(AVG(e.nps_score), 2) AS nps_promedio,
  ROUND(AVG(e.calificacion_servicio), 2) AS calificacion_servicio_promedio,
  ROUND(AVG(e.calificacion_instalaciones), 2) AS calificacion_instalaciones_promedio,
  COUNT(*) FILTER (WHERE e.nps_score >= 9) AS promotores,
  COUNT(*) FILTER (WHERE e.nps_score >= 7 AND e.nps_score <= 8) AS pasivos,
  COUNT(*) FILTER (WHERE e.nps_score <= 6) AS detractores,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND(
      ((COUNT(*) FILTER (WHERE e.nps_score >= 9)::NUMERIC / COUNT(*)) - 
       (COUNT(*) FILTER (WHERE e.nps_score <= 6)::NUMERIC / COUNT(*))) * 100, 
      2
    )
    ELSE 0 
  END AS nps_score
FROM public.sucursales s
LEFT JOIN public.encuestas_satisfaccion e ON s.id = e.id_sucursal
WHERE s.activo = TRUE
GROUP BY s.id, s.nombre, DATE_TRUNC('month', e.fecha_encuesta)
ORDER BY s.nombre, DATE_TRUNC('month', e.fecha_encuesta) DESC;

-- 9. Vista: Tiempos de ciclo
CREATE OR REPLACE VIEW public.vw_tiempos_ciclo AS
SELECT 
  a.id AS id_cita,
  a.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') AS cliente,
  a.id_empleado,
  e.nombre || ' ' || COALESCE(e.apellidos, '') AS empleado,
  a.id_sucursal,
  s.nombre AS sucursal,
  a.fecha,
  a.hora_inicio,
  a.hora_fin,
  a.check_in_at,
  a.check_out_at,
  CASE 
    WHEN a.check_in_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_in_at::time - a.hora_inicio)) / 60
    ELSE NULL 
  END AS minutos_retraso_checkin,
  CASE 
    WHEN a.check_in_at IS NOT NULL AND a.check_out_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_out_at - a.check_in_at)) / 60
    ELSE NULL 
  END AS duracion_servicio_minutos,
  CASE 
    WHEN a.check_out_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_out_at::time - a.hora_fin)) / 60
    ELSE NULL 
  END AS minutos_diferencia_programado
FROM public.agendas a
JOIN public.clientes c ON a.id_cliente = c.id
LEFT JOIN public.empleados e ON a.id_empleado = e.id
JOIN public.sucursales s ON a.id_sucursal = s.id
WHERE a.estado IN ('presentado', 'completada')
  AND a.check_in_at IS NOT NULL
ORDER BY a.fecha DESC, a.hora_inicio DESC;

-- 10. Vista: Clientes recompra
CREATE OR REPLACE VIEW public.vw_clientes_recompra AS
WITH ultima_cita AS (
  SELECT 
    id_cliente,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE estado = 'completada'
  GROUP BY id_cliente
),
clasificacion_recompra AS (
  SELECT 
    c.id,
    c.nombre,
    c.apellidos,
    c.email,
    c.telefono,
    uc.fecha_ultima_cita,
    CURRENT_DATE - uc.fecha_ultima_cita AS dias_desde_ultima_cita,
    CASE 
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 30 THEN 'Activo (0-30 días)'
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 60 THEN 'Reciente (31-60 días)'
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 90 THEN 'En riesgo (61-90 días)'
      ELSE 'Inactivo (>90 días)'
    END AS segmento_recompra
  FROM public.clientes c
  LEFT JOIN ultima_cita uc ON c.id = uc.id_cliente
  WHERE c.activo = TRUE
)
SELECT * FROM clasificacion_recompra
ORDER BY dias_desde_ultima_cita DESC;

-- 11. Vista: Clientes ausentes (sin citas en los últimos 90 días)
CREATE OR REPLACE VIEW public.vw_clientes_ausentes AS
WITH ultima_cita AS (
  SELECT 
    id_cliente,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE estado IN ('completada', 'confirmada', 'presentado')
  GROUP BY id_cliente
)
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  uc.fecha_ultima_cita,
  CURRENT_DATE - COALESCE(uc.fecha_ultima_cita, c.created_at::date) AS dias_sin_citas,
  COUNT(a.id) AS total_citas_historicas
FROM public.clientes c
LEFT JOIN ultima_cita uc ON c.id = uc.id_cliente
LEFT JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = TRUE
  AND (uc.fecha_ultima_cita IS NULL OR uc.fecha_ultima_cita < CURRENT_DATE - INTERVAL '90 days')
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita, uc.fecha_ultima_cita
ORDER BY dias_sin_citas DESC;

-- 12. Vista: Clientes no retenidos (con citas pero sin reservas futuras)
CREATE OR REPLACE VIEW public.vw_clientes_no_retenidos AS
WITH citas_pasadas AS (
  SELECT 
    id_cliente,
    COUNT(*) AS total_citas_pasadas,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE fecha < CURRENT_DATE
    AND estado = 'completada'
  GROUP BY id_cliente
),
citas_futuras AS (
  SELECT 
    id_cliente,
    COUNT(*) AS total_citas_futuras,
    MIN(fecha) AS fecha_proxima_cita
  FROM public.agendas
  WHERE fecha >= CURRENT_DATE
    AND estado IN ('agendada', 'confirmada')
  GROUP BY id_cliente
)
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  cp.total_citas_pasadas,
  cp.fecha_ultima_cita,
  CURRENT_DATE - cp.fecha_ultima_cita AS dias_desde_ultima_cita,
  COALESCE(cf.total_citas_futuras, 0) AS citas_futuras
FROM public.clientes c
JOIN citas_pasadas cp ON c.id = cp.id_cliente
LEFT JOIN citas_futuras cf ON c.id = cf.id_cliente
WHERE c.activo = TRUE
  AND COALESCE(cf.total_citas_futuras, 0) = 0
  AND cp.total_citas_pasadas > 0
ORDER BY cp.fecha_ultima_cita DESC;

-- 13. Vista: Clientes duplicados
CREATE OR REPLACE VIEW public.vw_clientes_duplicados AS
WITH duplicados_email AS (
  SELECT 
    email,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE email IS NOT NULL 
    AND email != ''
    AND activo = TRUE
  GROUP BY email
  HAVING COUNT(*) > 1
),
duplicados_telefono AS (
  SELECT 
    telefono,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE telefono IS NOT NULL 
    AND telefono != ''
    AND activo = TRUE
  GROUP BY telefono
  HAVING COUNT(*) > 1
),
duplicados_nombre AS (
  SELECT 
    LOWER(TRIM(nombre)) AS nombre_normalizado,
    LOWER(TRIM(COALESCE(apellidos, ''))) AS apellidos_normalizado,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE activo = TRUE
  GROUP BY LOWER(TRIM(nombre)), LOWER(TRIM(COALESCE(apellidos, '')))
  HAVING COUNT(*) > 1
)
SELECT 
  'Email' AS tipo_duplicado,
  de.email AS valor,
  de.cantidad,
  de.ids_clientes
FROM duplicados_email de
UNION ALL
SELECT 
  'Teléfono' AS tipo_duplicado,
  dt.telefono AS valor,
  dt.cantidad,
  dt.ids_clientes
FROM duplicados_telefono dt
UNION ALL
SELECT 
  'Nombre' AS tipo_duplicado,
  dn.nombre_normalizado || ' ' || dn.apellidos_normalizado AS valor,
  dn.cantidad,
  dn.ids_clientes
FROM duplicados_nombre dn
ORDER BY cantidad DESC, tipo_duplicado;

-- 14. Vista: Clientes eliminados
CREATE OR REPLACE VIEW public.vw_clientes_eliminados AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.created_at AS fecha_registro,
  c.updated_at AS fecha_ultima_modificacion,
  COUNT(a.id) AS total_citas_historicas,
  COALESCE(SUM(v.total), 0) AS total_gastado
FROM public.clientes c
LEFT JOIN public.agendas a ON c.id = a.id_cliente
LEFT JOIN public.ventas v ON c.id = v.id_cliente
WHERE c.activo = FALSE
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.created_at, c.updated_at
ORDER BY c.updated_at DESC;

-- 15. Vista: Clientes saldos
CREATE OR REPLACE VIEW public.vw_clientes_saldos AS
WITH anticipos_cliente AS (
  SELECT 
    p.id_cliente,
    SUM(CASE WHEN p.tipo_pago = 'anticipo' AND p.aplicado_a_venta = FALSE THEN p.monto ELSE 0 END) AS total_anticipos,
    SUM(CASE WHEN p.tipo_pago = 'abono' THEN p.monto ELSE 0 END) AS total_abonos
  FROM public.pagos p
  GROUP BY p.id_cliente
),
consumos_cliente AS (
  SELECT 
    v.id_cliente,
    SUM(v.total) AS total_consumido,
    COUNT(*) AS cantidad_compras
  FROM public.ventas v
  GROUP BY v.id_cliente
)
SELECT 
  c.id,
  c.numero_expediente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  COALESCE(ac.total_anticipos, 0) AS anticipos_disponibles,
  COALESCE(ac.total_abonos, 0) AS abonos_realizados,
  COALESCE(cc.total_consumido, 0) AS total_consumido,
  COALESCE(cc.cantidad_compras, 0) AS cantidad_compras,
  c.saldo_favor,
  c.saldo_contra,
  COALESCE(ac.total_anticipos, 0) - COALESCE(cc.total_consumido, 0) + c.saldo_favor - c.saldo_contra AS saldo_neto
FROM public.clientes c
LEFT JOIN anticipos_cliente ac ON c.id = ac.id_cliente
LEFT JOIN consumos_cliente cc ON c.id = cc.id_cliente
WHERE c.activo = TRUE
ORDER BY saldo_neto DESC;

-- 16. Vista: Comparativo financiero
CREATE OR REPLACE VIEW public.vw_comparativo_financiero AS
WITH ventas_mes_actual AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total,
    SUM(subtotal) AS facturacion_neta,
    SUM(descuento) AS total_descuentos,
    AVG(total) AS ticket_promedio
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY id_sucursal
),
ventas_mes_anterior AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total,
    SUM(subtotal) AS facturacion_neta,
    AVG(total) AS ticket_promedio
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  GROUP BY id_sucursal
),
ventas_anio_pasado AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total,
    SUM(subtotal) AS facturacion_neta,
    AVG(total) AS ticket_promedio
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 year')
  GROUP BY id_sucursal
),
mix_productos AS (
  SELECT 
    v.id_sucursal,
    SUM(CASE WHEN vi.id_servicio IS NOT NULL THEN vi.subtotal ELSE 0 END) AS ingresos_servicios,
    SUM(CASE WHEN vi.id_servicio IS NULL THEN vi.subtotal ELSE 0 END) AS ingresos_productos
  FROM public.ventas v
  JOIN public.venta_items vi ON v.id = vi.id_venta
  WHERE DATE_TRUNC('month', v.fecha) = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY v.id_sucursal
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  CURRENT_DATE AS fecha_reporte,
  
  -- Mes actual
  COALESCE(vma.total_ventas, 0) AS ventas_mes_actual,
  COALESCE(vma.facturacion_total, 0) AS facturacion_mes_actual,
  COALESCE(vma.facturacion_neta, 0) AS facturacion_neta_mes_actual,
  COALESCE(vma.total_descuentos, 0) AS descuentos_mes_actual,
  COALESCE(vma.ticket_promedio, 0) AS ticket_promedio_actual,
  
  -- Mes anterior
  COALESCE(vme.total_ventas, 0) AS ventas_mes_anterior,
  COALESCE(vme.facturacion_total, 0) AS facturacion_mes_anterior,
  
  -- Año pasado
  COALESCE(vap.total_ventas, 0) AS ventas_anio_pasado,
  COALESCE(vap.facturacion_total, 0) AS facturacion_anio_pasado,
  
  -- Comparativos MoM (Month over Month)
  CASE 
    WHEN COALESCE(vme.facturacion_total, 0) > 0 
    THEN ROUND(((vma.facturacion_total - vme.facturacion_total) / vme.facturacion_total * 100), 2)
    ELSE 0 
  END AS variacion_mom_porcentaje,
  
  -- Comparativos YoY (Year over Year)
  CASE 
    WHEN COALESCE(vap.facturacion_total, 0) > 0 
    THEN ROUND(((vma.facturacion_total - vap.facturacion_total) / vap.facturacion_total * 100), 2)
    ELSE 0 
  END AS variacion_yoy_porcentaje,
  
  -- Mix servicios/productos
  COALESCE(mp.ingresos_servicios, 0) AS ingresos_servicios,
  COALESCE(mp.ingresos_productos, 0) AS ingresos_productos,
  CASE 
    WHEN (COALESCE(mp.ingresos_servicios, 0) + COALESCE(mp.ingresos_productos, 0)) > 0 
    THEN ROUND((mp.ingresos_servicios / (mp.ingresos_servicios + mp.ingresos_productos) * 100), 2)
    ELSE 0 
  END AS porcentaje_servicios,
  
  -- % Descuentos
  CASE 
    WHEN COALESCE(vma.facturacion_total, 0) > 0 
    THEN ROUND((vma.total_descuentos / vma.facturacion_total * 100), 2)
    ELSE 0 
  END AS porcentaje_descuentos
FROM public.sucursales s
LEFT JOIN ventas_mes_actual vma ON s.id = vma.id_sucursal
LEFT JOIN ventas_mes_anterior vme ON s.id = vme.id_sucursal
LEFT JOIN ventas_anio_pasado vap ON s.id = vap.id_sucursal
LEFT JOIN mix_productos mp ON s.id = mp.id_sucursal
WHERE s.activo = TRUE
ORDER BY s.nombre;

-- 17. Habilitar RLS en nuevas tablas
ALTER TABLE public.campanias_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_enviados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuestas_satisfaccion ENABLE ROW LEVEL SECURITY;

-- 18. Políticas RLS para campanias_marketing
CREATE POLICY "Usuarios autenticados pueden leer campañas" 
  ON public.campanias_marketing FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear campañas" 
  ON public.campanias_marketing FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar campañas" 
  ON public.campanias_marketing FOR UPDATE 
  USING (true);

-- 19. Políticas RLS para mensajes_enviados
CREATE POLICY "Usuarios autenticados pueden leer mensajes" 
  ON public.mensajes_enviados FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear mensajes" 
  ON public.mensajes_enviados FOR INSERT 
  WITH CHECK (true);

-- 20. Políticas RLS para encuestas_satisfaccion
CREATE POLICY "Usuarios autenticados pueden leer encuestas" 
  ON public.encuestas_satisfaccion FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear encuestas" 
  ON public.encuestas_satisfaccion FOR INSERT 
  WITH CHECK (true);

-- 21. Triggers para updated_at
CREATE TRIGGER set_updated_at_campanias
  BEFORE UPDATE ON public.campanias_marketing
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 22. Índices para mejorar performance de vistas
CREATE INDEX IF NOT EXISTS idx_mensajes_cliente_fecha 
  ON public.mensajes_enviados(id_cliente, fecha_envio DESC);

CREATE INDEX IF NOT EXISTS idx_encuestas_sucursal_fecha 
  ON public.encuestas_satisfaccion(id_sucursal, fecha_encuesta DESC);

CREATE INDEX IF NOT EXISTS idx_campanias_fechas 
  ON public.campanias_marketing(fecha_inicio, fecha_fin);-- 1. Ampliar tabla clientes con expediente y saldos
ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS numero_expediente VARCHAR(20),
  ADD COLUMN IF NOT EXISTS saldo_favor NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_contra NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_ultima_visita DATE;

-- 2. Crear índice único para expediente (solo si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_clientes_expediente'
  ) THEN
    CREATE UNIQUE INDEX idx_clientes_expediente 
      ON public.clientes(numero_expediente) 
      WHERE numero_expediente IS NOT NULL;
  END IF;
END $$;

-- 3. Crear tabla campanias_marketing
CREATE TABLE IF NOT EXISTS public.campanias_marketing (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  segmento TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  presupuesto NUMERIC(12,2),
  gasto_real NUMERIC(12,2) DEFAULT 0,
  responsable BIGINT REFERENCES public.empleados(id),
  id_sucursal BIGINT REFERENCES public.sucursales(id),
  estado VARCHAR(30) DEFAULT 'Planificada',
  objetivo TEXT,
  resultados TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla mensajes_enviados
CREATE TABLE IF NOT EXISTS public.mensajes_enviados (
  id BIGSERIAL PRIMARY KEY,
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id),
  id_campania BIGINT REFERENCES public.campanias_marketing(id),
  canal VARCHAR(30) NOT NULL,
  contenido TEXT,
  fecha_envio TIMESTAMP NOT NULL DEFAULT NOW(),
  estado VARCHAR(30) DEFAULT 'Enviado',
  abierto BOOLEAN DEFAULT FALSE,
  fecha_apertura TIMESTAMP,
  respondido BOOLEAN DEFAULT FALSE,
  fecha_respuesta TIMESTAMP,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 5. Crear tabla encuestas_satisfaccion
CREATE TABLE IF NOT EXISTS public.encuestas_satisfaccion (
  id BIGSERIAL PRIMARY KEY,
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id),
  id_cita BIGINT REFERENCES public.agendas(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  calificacion_servicio INTEGER CHECK (calificacion_servicio >= 1 AND calificacion_servicio <= 5),
  calificacion_instalaciones INTEGER CHECK (calificacion_instalaciones >= 1 AND calificacion_instalaciones <= 5),
  comentarios TEXT,
  fecha_encuesta DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 6. Vista: No Show Rate
CREATE OR REPLACE VIEW public.vw_no_show_rate AS
WITH citas_por_periodo AS (
  SELECT 
    id_sucursal,
    DATE_TRUNC('month', fecha) AS mes,
    COUNT(*) AS total_citas,
    COUNT(*) FILTER (WHERE estado = 'no_show') AS total_no_show,
    COUNT(*) FILTER (WHERE estado = 'completada') AS total_completadas,
    COUNT(*) FILTER (WHERE estado = 'cancelada') AS total_canceladas
  FROM public.agendas
  GROUP BY id_sucursal, DATE_TRUNC('month', fecha)
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  c.mes,
  c.total_citas,
  c.total_no_show,
  c.total_completadas,
  c.total_canceladas,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.total_no_show::NUMERIC / c.total_citas * 100), 2)
    ELSE 0 
  END AS no_show_rate_porcentaje,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.total_completadas::NUMERIC / c.total_citas * 100), 2)
    ELSE 0 
  END AS tasa_completadas_porcentaje
FROM public.sucursales s
LEFT JOIN citas_por_periodo c ON s.id = c.id_sucursal
WHERE s.activo = TRUE
ORDER BY s.nombre, c.mes DESC;

-- 7. Vista: Ocupación de cabinas
CREATE OR REPLACE VIEW public.vw_ocupacion_cabinas AS
WITH minutos_reservados AS (
  SELECT 
    id_sucursal,
    DATE_TRUNC('month', fecha) AS mes,
    COUNT(*) AS total_citas,
    SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 60) AS minutos_reservados
  FROM public.agendas
  WHERE estado IN ('confirmada', 'presentado', 'completada')
  GROUP BY id_sucursal, DATE_TRUNC('month', fecha)
),
dias_habiles AS (
  SELECT 
    s.id AS id_sucursal,
    DATE_TRUNC('month', d.fecha) AS mes,
    COUNT(*) AS dias_laborables
  FROM public.sucursales s
  CROSS JOIN (
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months'),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS fecha
  ) d
  WHERE EXTRACT(DOW FROM d.fecha) BETWEEN 1 AND 6
  GROUP BY s.id, DATE_TRUNC('month', d.fecha)
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  mr.mes,
  COALESCE(mr.total_citas, 0) AS total_citas,
  COALESCE(mr.minutos_reservados, 0) AS minutos_reservados,
  (dh.dias_laborables * 12 * 60) AS minutos_disponibles,
  CASE 
    WHEN dh.dias_laborables > 0 
    THEN ROUND((COALESCE(mr.minutos_reservados, 0) / (dh.dias_laborables * 12 * 60)::NUMERIC * 100), 2)
    ELSE 0 
  END AS porcentaje_ocupacion
FROM public.sucursales s
LEFT JOIN minutos_reservados mr ON s.id = mr.id_sucursal
LEFT JOIN dias_habiles dh ON s.id = dh.id_sucursal AND mr.mes = dh.mes
WHERE s.activo = TRUE
ORDER BY s.nombre, mr.mes DESC;

-- 8. Vista: Satisfacción (NPS)
CREATE OR REPLACE VIEW public.vw_satisfaccion AS
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  DATE_TRUNC('month', e.fecha_encuesta) AS mes,
  COUNT(*) AS total_encuestas,
  ROUND(AVG(e.nps_score), 2) AS nps_promedio,
  ROUND(AVG(e.calificacion_servicio), 2) AS calificacion_servicio_promedio,
  ROUND(AVG(e.calificacion_instalaciones), 2) AS calificacion_instalaciones_promedio,
  COUNT(*) FILTER (WHERE e.nps_score >= 9) AS promotores,
  COUNT(*) FILTER (WHERE e.nps_score >= 7 AND e.nps_score <= 8) AS pasivos,
  COUNT(*) FILTER (WHERE e.nps_score <= 6) AS detractores,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND(
      ((COUNT(*) FILTER (WHERE e.nps_score >= 9)::NUMERIC / COUNT(*)) - 
       (COUNT(*) FILTER (WHERE e.nps_score <= 6)::NUMERIC / COUNT(*))) * 100, 
      2
    )
    ELSE 0 
  END AS nps_score
FROM public.sucursales s
LEFT JOIN public.encuestas_satisfaccion e ON s.id = e.id_sucursal
WHERE s.activo = TRUE
GROUP BY s.id, s.nombre, DATE_TRUNC('month', e.fecha_encuesta)
ORDER BY s.nombre, DATE_TRUNC('month', e.fecha_encuesta) DESC;

-- 9. Vista: Tiempos de ciclo
CREATE OR REPLACE VIEW public.vw_tiempos_ciclo AS
SELECT 
  a.id AS id_cita,
  a.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') AS cliente,
  a.id_empleado,
  e.nombre || ' ' || COALESCE(e.apellidos, '') AS empleado,
  a.id_sucursal,
  s.nombre AS sucursal,
  a.fecha,
  a.hora_inicio,
  a.hora_fin,
  a.check_in_at,
  a.check_out_at,
  CASE 
    WHEN a.check_in_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_in_at::time - a.hora_inicio)) / 60
    ELSE NULL 
  END AS minutos_retraso_checkin,
  CASE 
    WHEN a.check_in_at IS NOT NULL AND a.check_out_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_out_at - a.check_in_at)) / 60
    ELSE NULL 
  END AS duracion_servicio_minutos,
  CASE 
    WHEN a.check_out_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_out_at::time - a.hora_fin)) / 60
    ELSE NULL 
  END AS minutos_diferencia_programado
FROM public.agendas a
JOIN public.clientes c ON a.id_cliente = c.id
LEFT JOIN public.empleados e ON a.id_empleado = e.id
JOIN public.sucursales s ON a.id_sucursal = s.id
WHERE a.estado IN ('presentado', 'completada')
  AND a.check_in_at IS NOT NULL
ORDER BY a.fecha DESC, a.hora_inicio DESC;

-- 10. Vista: Clientes recompra
CREATE OR REPLACE VIEW public.vw_clientes_recompra AS
WITH ultima_cita AS (
  SELECT 
    id_cliente,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE estado = 'completada'
  GROUP BY id_cliente
),
clasificacion_recompra AS (
  SELECT 
    c.id,
    c.nombre,
    c.apellidos,
    c.email,
    c.telefono,
    uc.fecha_ultima_cita,
    CURRENT_DATE - uc.fecha_ultima_cita AS dias_desde_ultima_cita,
    CASE 
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 30 THEN 'Activo (0-30 días)'
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 60 THEN 'Reciente (31-60 días)'
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 90 THEN 'En riesgo (61-90 días)'
      ELSE 'Inactivo (>90 días)'
    END AS segmento_recompra
  FROM public.clientes c
  LEFT JOIN ultima_cita uc ON c.id = uc.id_cliente
  WHERE c.activo = TRUE
)
SELECT * FROM clasificacion_recompra
ORDER BY dias_desde_ultima_cita DESC;

-- Continúa en el siguiente bloque...-- 1. Ampliar tabla clientes con expediente y saldos
ALTER TABLE public.clientes 
  ADD COLUMN IF NOT EXISTS numero_expediente VARCHAR(20),
  ADD COLUMN IF NOT EXISTS saldo_favor NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS saldo_contra NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fecha_ultima_visita DATE;

-- 2. Crear índice único para expediente (solo si no existe)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_clientes_expediente'
  ) THEN
    CREATE UNIQUE INDEX idx_clientes_expediente 
      ON public.clientes(numero_expediente) 
      WHERE numero_expediente IS NOT NULL;
  END IF;
END $$;

-- 3. Crear tabla campanias_marketing
CREATE TABLE IF NOT EXISTS public.campanias_marketing (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  segmento TEXT,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  presupuesto NUMERIC(12,2),
  gasto_real NUMERIC(12,2) DEFAULT 0,
  responsable BIGINT REFERENCES public.empleados(id),
  id_sucursal BIGINT REFERENCES public.sucursales(id),
  estado VARCHAR(30) DEFAULT 'Planificada',
  objetivo TEXT,
  resultados TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 4. Crear tabla mensajes_enviados
CREATE TABLE IF NOT EXISTS public.mensajes_enviados (
  id BIGSERIAL PRIMARY KEY,
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id),
  id_campania BIGINT REFERENCES public.campanias_marketing(id),
  canal VARCHAR(30) NOT NULL,
  contenido TEXT,
  fecha_envio TIMESTAMP NOT NULL DEFAULT NOW(),
  estado VARCHAR(30) DEFAULT 'Enviado',
  abierto BOOLEAN DEFAULT FALSE,
  fecha_apertura TIMESTAMP,
  respondido BOOLEAN DEFAULT FALSE,
  fecha_respuesta TIMESTAMP,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 5. Crear tabla encuestas_satisfaccion
CREATE TABLE IF NOT EXISTS public.encuestas_satisfaccion (
  id BIGSERIAL PRIMARY KEY,
  id_cliente BIGINT NOT NULL REFERENCES public.clientes(id),
  id_cita BIGINT REFERENCES public.agendas(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),
  calificacion_servicio INTEGER CHECK (calificacion_servicio >= 1 AND calificacion_servicio <= 5),
  calificacion_instalaciones INTEGER CHECK (calificacion_instalaciones >= 1 AND calificacion_instalaciones <= 5),
  comentarios TEXT,
  fecha_encuesta DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 6. Vista: No Show Rate
CREATE OR REPLACE VIEW public.vw_no_show_rate AS
WITH citas_por_periodo AS (
  SELECT 
    id_sucursal,
    DATE_TRUNC('month', fecha) AS mes,
    COUNT(*) AS total_citas,
    COUNT(*) FILTER (WHERE estado = 'no_show') AS total_no_show,
    COUNT(*) FILTER (WHERE estado = 'completada') AS total_completadas,
    COUNT(*) FILTER (WHERE estado = 'cancelada') AS total_canceladas
  FROM public.agendas
  GROUP BY id_sucursal, DATE_TRUNC('month', fecha)
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  c.mes,
  c.total_citas,
  c.total_no_show,
  c.total_completadas,
  c.total_canceladas,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.total_no_show::NUMERIC / c.total_citas * 100), 2)
    ELSE 0 
  END AS no_show_rate_porcentaje,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.total_completadas::NUMERIC / c.total_citas * 100), 2)
    ELSE 0 
  END AS tasa_completadas_porcentaje
FROM public.sucursales s
LEFT JOIN citas_por_periodo c ON s.id = c.id_sucursal
WHERE s.activo = TRUE
ORDER BY s.nombre, c.mes DESC;

-- 7. Vista: Ocupación de cabinas
CREATE OR REPLACE VIEW public.vw_ocupacion_cabinas AS
WITH minutos_reservados AS (
  SELECT 
    id_sucursal,
    DATE_TRUNC('month', fecha) AS mes,
    COUNT(*) AS total_citas,
    SUM(EXTRACT(EPOCH FROM (hora_fin - hora_inicio)) / 60) AS minutos_reservados
  FROM public.agendas
  WHERE estado IN ('confirmada', 'presentado', 'completada')
  GROUP BY id_sucursal, DATE_TRUNC('month', fecha)
),
dias_habiles AS (
  SELECT 
    s.id AS id_sucursal,
    DATE_TRUNC('month', d.fecha) AS mes,
    COUNT(*) AS dias_laborables
  FROM public.sucursales s
  CROSS JOIN (
    SELECT generate_series(
      DATE_TRUNC('month', CURRENT_DATE - INTERVAL '12 months'),
      CURRENT_DATE,
      '1 day'::interval
    )::date AS fecha
  ) d
  WHERE EXTRACT(DOW FROM d.fecha) BETWEEN 1 AND 6
  GROUP BY s.id, DATE_TRUNC('month', d.fecha)
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  mr.mes,
  COALESCE(mr.total_citas, 0) AS total_citas,
  COALESCE(mr.minutos_reservados, 0) AS minutos_reservados,
  (dh.dias_laborables * 12 * 60) AS minutos_disponibles,
  CASE 
    WHEN dh.dias_laborables > 0 
    THEN ROUND((COALESCE(mr.minutos_reservados, 0) / (dh.dias_laborables * 12 * 60)::NUMERIC * 100), 2)
    ELSE 0 
  END AS porcentaje_ocupacion
FROM public.sucursales s
LEFT JOIN minutos_reservados mr ON s.id = mr.id_sucursal
LEFT JOIN dias_habiles dh ON s.id = dh.id_sucursal AND mr.mes = dh.mes
WHERE s.activo = TRUE
ORDER BY s.nombre, mr.mes DESC;

-- 8. Vista: Satisfacción (NPS)
CREATE OR REPLACE VIEW public.vw_satisfaccion AS
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  DATE_TRUNC('month', e.fecha_encuesta) AS mes,
  COUNT(*) AS total_encuestas,
  ROUND(AVG(e.nps_score), 2) AS nps_promedio,
  ROUND(AVG(e.calificacion_servicio), 2) AS calificacion_servicio_promedio,
  ROUND(AVG(e.calificacion_instalaciones), 2) AS calificacion_instalaciones_promedio,
  COUNT(*) FILTER (WHERE e.nps_score >= 9) AS promotores,
  COUNT(*) FILTER (WHERE e.nps_score >= 7 AND e.nps_score <= 8) AS pasivos,
  COUNT(*) FILTER (WHERE e.nps_score <= 6) AS detractores,
  CASE 
    WHEN COUNT(*) > 0 
    THEN ROUND(
      ((COUNT(*) FILTER (WHERE e.nps_score >= 9)::NUMERIC / COUNT(*)) - 
       (COUNT(*) FILTER (WHERE e.nps_score <= 6)::NUMERIC / COUNT(*))) * 100, 
      2
    )
    ELSE 0 
  END AS nps_score
FROM public.sucursales s
LEFT JOIN public.encuestas_satisfaccion e ON s.id = e.id_sucursal
WHERE s.activo = TRUE
GROUP BY s.id, s.nombre, DATE_TRUNC('month', e.fecha_encuesta)
ORDER BY s.nombre, DATE_TRUNC('month', e.fecha_encuesta) DESC;

-- 9. Vista: Tiempos de ciclo
CREATE OR REPLACE VIEW public.vw_tiempos_ciclo AS
SELECT 
  a.id AS id_cita,
  a.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') AS cliente,
  a.id_empleado,
  e.nombre || ' ' || COALESCE(e.apellidos, '') AS empleado,
  a.id_sucursal,
  s.nombre AS sucursal,
  a.fecha,
  a.hora_inicio,
  a.hora_fin,
  a.check_in_at,
  a.check_out_at,
  CASE 
    WHEN a.check_in_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_in_at::time - a.hora_inicio)) / 60
    ELSE NULL 
  END AS minutos_retraso_checkin,
  CASE 
    WHEN a.check_in_at IS NOT NULL AND a.check_out_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_out_at - a.check_in_at)) / 60
    ELSE NULL 
  END AS duracion_servicio_minutos,
  CASE 
    WHEN a.check_out_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_out_at::time - a.hora_fin)) / 60
    ELSE NULL 
  END AS minutos_diferencia_programado
FROM public.agendas a
JOIN public.clientes c ON a.id_cliente = c.id
LEFT JOIN public.empleados e ON a.id_empleado = e.id
JOIN public.sucursales s ON a.id_sucursal = s.id
WHERE a.estado IN ('presentado', 'completada')
  AND a.check_in_at IS NOT NULL
ORDER BY a.fecha DESC, a.hora_inicio DESC;

-- 10. Vista: Clientes recompra
CREATE OR REPLACE VIEW public.vw_clientes_recompra AS
WITH ultima_cita AS (
  SELECT 
    id_cliente,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE estado = 'completada'
  GROUP BY id_cliente
),
clasificacion_recompra AS (
  SELECT 
    c.id,
    c.nombre,
    c.apellidos,
    c.email,
    c.telefono,
    uc.fecha_ultima_cita,
    CURRENT_DATE - uc.fecha_ultima_cita AS dias_desde_ultima_cita,
    CASE 
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 30 THEN 'Activo (0-30 días)'
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 60 THEN 'Reciente (31-60 días)'
      WHEN CURRENT_DATE - uc.fecha_ultima_cita <= 90 THEN 'En riesgo (61-90 días)'
      ELSE 'Inactivo (>90 días)'
    END AS segmento_recompra
  FROM public.clientes c
  LEFT JOIN ultima_cita uc ON c.id = uc.id_cliente
  WHERE c.activo = TRUE
)
SELECT * FROM clasificacion_recompra
ORDER BY dias_desde_ultima_cita DESC;

-- Continúa en el siguiente bloque...-- 11. Vista: Clientes ausentes
CREATE OR REPLACE VIEW public.vw_clientes_ausentes AS
WITH ultima_cita AS (
  SELECT 
    id_cliente,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE estado IN ('completada', 'confirmada', 'presentado')
  GROUP BY id_cliente
)
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  uc.fecha_ultima_cita,
  CURRENT_DATE - COALESCE(uc.fecha_ultima_cita, c.created_at::date) AS dias_sin_citas,
  COUNT(a.id) AS total_citas_historicas
FROM public.clientes c
LEFT JOIN ultima_cita uc ON c.id = uc.id_cliente
LEFT JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = TRUE
  AND (uc.fecha_ultima_cita IS NULL OR uc.fecha_ultima_cita < CURRENT_DATE - INTERVAL '90 days')
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita, uc.fecha_ultima_cita
ORDER BY dias_sin_citas DESC;

-- 12. Vista: Clientes no retenidos
CREATE OR REPLACE VIEW public.vw_clientes_no_retenidos AS
WITH citas_pasadas AS (
  SELECT 
    id_cliente,
    COUNT(*) AS total_citas_pasadas,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE fecha < CURRENT_DATE AND estado = 'completada'
  GROUP BY id_cliente
),
citas_futuras AS (
  SELECT 
    id_cliente,
    COUNT(*) AS total_citas_futuras,
    MIN(fecha) AS fecha_proxima_cita
  FROM public.agendas
  WHERE fecha >= CURRENT_DATE AND estado IN ('agendada', 'confirmada')
  GROUP BY id_cliente
)
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  cp.total_citas_pasadas,
  cp.fecha_ultima_cita,
  CURRENT_DATE - cp.fecha_ultima_cita AS dias_desde_ultima_cita,
  COALESCE(cf.total_citas_futuras, 0) AS citas_futuras
FROM public.clientes c
JOIN citas_pasadas cp ON c.id = cp.id_cliente
LEFT JOIN citas_futuras cf ON c.id = cf.id_cliente
WHERE c.activo = TRUE
  AND COALESCE(cf.total_citas_futuras, 0) = 0
  AND cp.total_citas_pasadas > 0
ORDER BY cp.fecha_ultima_cita DESC;

-- 13. Vista: Clientes duplicados
CREATE OR REPLACE VIEW public.vw_clientes_duplicados AS
WITH duplicados_email AS (
  SELECT 
    email,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE email IS NOT NULL AND email != '' AND activo = TRUE
  GROUP BY email
  HAVING COUNT(*) > 1
),
duplicados_telefono AS (
  SELECT 
    telefono,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE telefono IS NOT NULL AND telefono != '' AND activo = TRUE
  GROUP BY telefono
  HAVING COUNT(*) > 1
),
duplicados_nombre AS (
  SELECT 
    LOWER(TRIM(nombre)) AS nombre_normalizado,
    LOWER(TRIM(COALESCE(apellidos, ''))) AS apellidos_normalizado,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE activo = TRUE
  GROUP BY LOWER(TRIM(nombre)), LOWER(TRIM(COALESCE(apellidos, '')))
  HAVING COUNT(*) > 1
)
SELECT 
  'Email' AS tipo_duplicado,
  de.email AS valor,
  de.cantidad,
  de.ids_clientes
FROM duplicados_email de
UNION ALL
SELECT 
  'Teléfono' AS tipo_duplicado,
  dt.telefono AS valor,
  dt.cantidad,
  dt.ids_clientes
FROM duplicados_telefono dt
UNION ALL
SELECT 
  'Nombre' AS tipo_duplicado,
  dn.nombre_normalizado || ' ' || dn.apellidos_normalizado AS valor,
  dn.cantidad,
  dn.ids_clientes
FROM duplicados_nombre dn
ORDER BY cantidad DESC, tipo_duplicado;

-- 14. Vista: Clientes eliminados
CREATE OR REPLACE VIEW public.vw_clientes_eliminados AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.created_at AS fecha_registro,
  c.updated_at AS fecha_ultima_modificacion,
  COUNT(a.id) AS total_citas_historicas,
  COALESCE(SUM(v.total), 0) AS total_gastado
FROM public.clientes c
LEFT JOIN public.agendas a ON c.id = a.id_cliente
LEFT JOIN public.ventas v ON c.id = v.id_cliente
WHERE c.activo = FALSE
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.created_at, c.updated_at
ORDER BY c.updated_at DESC;

-- 15. Vista: Clientes saldos
CREATE OR REPLACE VIEW public.vw_clientes_saldos AS
WITH anticipos_cliente AS (
  SELECT 
    p.id_cliente,
    SUM(CASE WHEN p.tipo_pago = 'anticipo' AND p.aplicado_a_venta = FALSE THEN p.monto ELSE 0 END) AS total_anticipos,
    SUM(CASE WHEN p.tipo_pago = 'abono' THEN p.monto ELSE 0 END) AS total_abonos
  FROM public.pagos p
  GROUP BY p.id_cliente
),
consumos_cliente AS (
  SELECT 
    v.id_cliente,
    SUM(v.total) AS total_consumido,
    COUNT(*) AS cantidad_compras
  FROM public.ventas v
  GROUP BY v.id_cliente
)
SELECT 
  c.id,
  c.numero_expediente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  COALESCE(ac.total_anticipos, 0) AS anticipos_disponibles,
  COALESCE(ac.total_abonos, 0) AS abonos_realizados,
  COALESCE(cc.total_consumido, 0) AS total_consumido,
  COALESCE(cc.cantidad_compras, 0) AS cantidad_compras,
  c.saldo_favor,
  c.saldo_contra,
  COALESCE(ac.total_anticipos, 0) - COALESCE(cc.total_consumido, 0) + c.saldo_favor - c.saldo_contra AS saldo_neto
FROM public.clientes c
LEFT JOIN anticipos_cliente ac ON c.id = ac.id_cliente
LEFT JOIN consumos_cliente cc ON c.id = cc.id_cliente
WHERE c.activo = TRUE
ORDER BY saldo_neto DESC;

-- 16. Vista: Comparativo financiero
CREATE OR REPLACE VIEW public.vw_comparativo_financiero AS
WITH ventas_mes_actual AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total,
    SUM(subtotal) AS facturacion_neta,
    SUM(descuento) AS total_descuentos,
    AVG(total) AS ticket_promedio
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY id_sucursal
),
ventas_mes_anterior AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  GROUP BY id_sucursal
),
ventas_anio_pasado AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 year')
  GROUP BY id_sucursal
),
mix_productos AS (
  SELECT 
    v.id_sucursal,
    SUM(CASE WHEN vi.id_servicio IS NOT NULL THEN vi.subtotal ELSE 0 END) AS ingresos_servicios,
    SUM(CASE WHEN vi.id_servicio IS NULL THEN vi.subtotal ELSE 0 END) AS ingresos_productos
  FROM public.ventas v
  JOIN public.venta_items vi ON v.id = vi.id_venta
  WHERE DATE_TRUNC('month', v.fecha) = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY v.id_sucursal
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  CURRENT_DATE AS fecha_reporte,
  COALESCE(vma.total_ventas, 0) AS ventas_mes_actual,
  COALESCE(vma.facturacion_total, 0) AS facturacion_mes_actual,
  COALESCE(vma.facturacion_neta, 0) AS facturacion_neta_mes_actual,
  COALESCE(vma.total_descuentos, 0) AS descuentos_mes_actual,
  COALESCE(vma.ticket_promedio, 0) AS ticket_promedio_actual,
  COALESCE(vme.total_ventas, 0) AS ventas_mes_anterior,
  COALESCE(vme.facturacion_total, 0) AS facturacion_mes_anterior,
  COALESCE(vap.total_ventas, 0) AS ventas_anio_pasado,
  COALESCE(vap.facturacion_total, 0) AS facturacion_anio_pasado,
  CASE 
    WHEN COALESCE(vme.facturacion_total, 0) > 0 
    THEN ROUND(((vma.facturacion_total - vme.facturacion_total) / vme.facturacion_total * 100), 2)
    ELSE 0 
  END AS variacion_mom_porcentaje,
  CASE 
    WHEN COALESCE(vap.facturacion_total, 0) > 0 
    THEN ROUND(((vma.facturacion_total - vap.facturacion_total) / vap.facturacion_total * 100), 2)
    ELSE 0 
  END AS variacion_yoy_porcentaje,
  COALESCE(mp.ingresos_servicios, 0) AS ingresos_servicios,
  COALESCE(mp.ingresos_productos, 0) AS ingresos_productos,
  CASE 
    WHEN (COALESCE(mp.ingresos_servicios, 0) + COALESCE(mp.ingresos_productos, 0)) > 0 
    THEN ROUND((mp.ingresos_servicios / (mp.ingresos_servicios + mp.ingresos_productos) * 100), 2)
    ELSE 0 
  END AS porcentaje_servicios,
  CASE 
    WHEN COALESCE(vma.facturacion_total, 0) > 0 
    THEN ROUND((vma.total_descuentos / vma.facturacion_total * 100), 2)
    ELSE 0 
  END AS porcentaje_descuentos
FROM public.sucursales s
LEFT JOIN ventas_mes_actual vma ON s.id = vma.id_sucursal
LEFT JOIN ventas_mes_anterior vme ON s.id = vme.id_sucursal
LEFT JOIN ventas_anio_pasado vap ON s.id = vap.id_sucursal
LEFT JOIN mix_productos mp ON s.id = mp.id_sucursal
WHERE s.activo = TRUE
ORDER BY s.nombre;

-- 17. Habilitar RLS en nuevas tablas
ALTER TABLE public.campanias_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_enviados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuestas_satisfaccion ENABLE ROW LEVEL SECURITY;

-- 18. Eliminar políticas existentes si existen
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Usuarios autenticados pueden leer campañas" ON public.campanias_marketing;
  DROP POLICY IF EXISTS "Usuarios autenticados pueden crear campañas" ON public.campanias_marketing;
  DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar campañas" ON public.campanias_marketing;
  DROP POLICY IF EXISTS "Usuarios autenticados pueden leer mensajes" ON public.mensajes_enviados;
  DROP POLICY IF EXISTS "Usuarios autenticados pueden crear mensajes" ON public.mensajes_enviados;
  DROP POLICY IF EXISTS "Usuarios autenticados pueden leer encuestas" ON public.encuestas_satisfaccion;
  DROP POLICY IF EXISTS "Usuarios autenticados pueden crear encuestas" ON public.encuestas_satisfaccion;
END $$;

-- 19. Políticas RLS para campanias_marketing
CREATE POLICY "Usuarios autenticados pueden leer campañas" 
  ON public.campanias_marketing FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear campañas" 
  ON public.campanias_marketing FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar campañas" 
  ON public.campanias_marketing FOR UPDATE 
  USING (true);

-- 20. Políticas RLS para mensajes_enviados
CREATE POLICY "Usuarios autenticados pueden leer mensajes" 
  ON public.mensajes_enviados FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear mensajes" 
  ON public.mensajes_enviados FOR INSERT 
  WITH CHECK (true);

-- 21. Políticas RLS para encuestas_satisfaccion
CREATE POLICY "Usuarios autenticados pueden leer encuestas" 
  ON public.encuestas_satisfaccion FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear encuestas" 
  ON public.encuestas_satisfaccion FOR INSERT 
  WITH CHECK (true);

-- 22. Triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at_campanias ON public.campanias_marketing;
CREATE TRIGGER set_updated_at_campanias
  BEFORE UPDATE ON public.campanias_marketing
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 23. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_mensajes_cliente_fecha 
  ON public.mensajes_enviados(id_cliente, fecha_envio DESC);

CREATE INDEX IF NOT EXISTS idx_encuestas_sucursal_fecha 
  ON public.encuestas_satisfaccion(id_sucursal, fecha_encuesta DESC);

CREATE INDEX IF NOT EXISTS idx_campanias_fechas 
  ON public.campanias_marketing(fecha_inicio, fecha_fin);-- 11. Vista: Clientes ausentes
CREATE OR REPLACE VIEW public.vw_clientes_ausentes AS
WITH ultima_cita AS (
  SELECT 
    id_cliente,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE estado IN ('completada', 'confirmada', 'presentado')
  GROUP BY id_cliente
)
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  uc.fecha_ultima_cita,
  CURRENT_DATE - COALESCE(uc.fecha_ultima_cita, c.created_at::date) AS dias_sin_citas,
  COUNT(a.id) AS total_citas_historicas
FROM public.clientes c
LEFT JOIN ultima_cita uc ON c.id = uc.id_cliente
LEFT JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = TRUE
  AND (uc.fecha_ultima_cita IS NULL OR uc.fecha_ultima_cita < CURRENT_DATE - INTERVAL '90 days')
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita, uc.fecha_ultima_cita
ORDER BY dias_sin_citas DESC;

-- 12. Vista: Clientes no retenidos
CREATE OR REPLACE VIEW public.vw_clientes_no_retenidos AS
WITH citas_pasadas AS (
  SELECT 
    id_cliente,
    COUNT(*) AS total_citas_pasadas,
    MAX(fecha) AS fecha_ultima_cita
  FROM public.agendas
  WHERE fecha < CURRENT_DATE
    AND estado = 'completada'
  GROUP BY id_cliente
),
citas_futuras AS (
  SELECT 
    id_cliente,
    COUNT(*) AS total_citas_futuras,
    MIN(fecha) AS fecha_proxima_cita
  FROM public.agendas
  WHERE fecha >= CURRENT_DATE
    AND estado IN ('agendada', 'confirmada')
  GROUP BY id_cliente
)
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  cp.total_citas_pasadas,
  cp.fecha_ultima_cita,
  CURRENT_DATE - cp.fecha_ultima_cita AS dias_desde_ultima_cita,
  COALESCE(cf.total_citas_futuras, 0) AS citas_futuras
FROM public.clientes c
JOIN citas_pasadas cp ON c.id = cp.id_cliente
LEFT JOIN citas_futuras cf ON c.id = cf.id_cliente
WHERE c.activo = TRUE
  AND COALESCE(cf.total_citas_futuras, 0) = 0
  AND cp.total_citas_pasadas > 0
ORDER BY cp.fecha_ultima_cita DESC;

-- 13. Vista: Clientes duplicados
CREATE OR REPLACE VIEW public.vw_clientes_duplicados AS
WITH duplicados_email AS (
  SELECT 
    email,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE email IS NOT NULL 
    AND email != ''
    AND activo = TRUE
  GROUP BY email
  HAVING COUNT(*) > 1
),
duplicados_telefono AS (
  SELECT 
    telefono,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE telefono IS NOT NULL 
    AND telefono != ''
    AND activo = TRUE
  GROUP BY telefono
  HAVING COUNT(*) > 1
),
duplicados_nombre AS (
  SELECT 
    LOWER(TRIM(nombre)) AS nombre_normalizado,
    LOWER(TRIM(COALESCE(apellidos, ''))) AS apellidos_normalizado,
    COUNT(*) AS cantidad,
    STRING_AGG(id::text, ', ' ORDER BY id) AS ids_clientes
  FROM public.clientes
  WHERE activo = TRUE
  GROUP BY LOWER(TRIM(nombre)), LOWER(TRIM(COALESCE(apellidos, '')))
  HAVING COUNT(*) > 1
)
SELECT 
  'Email' AS tipo_duplicado,
  de.email AS valor,
  de.cantidad,
  de.ids_clientes
FROM duplicados_email de
UNION ALL
SELECT 
  'Teléfono' AS tipo_duplicado,
  dt.telefono AS valor,
  dt.cantidad,
  dt.ids_clientes
FROM duplicados_telefono dt
UNION ALL
SELECT 
  'Nombre' AS tipo_duplicado,
  dn.nombre_normalizado || ' ' || dn.apellidos_normalizado AS valor,
  dn.cantidad,
  dn.ids_clientes
FROM duplicados_nombre dn
ORDER BY cantidad DESC, tipo_duplicado;

-- 14. Vista: Clientes eliminados
CREATE OR REPLACE VIEW public.vw_clientes_eliminados AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.created_at AS fecha_registro,
  c.updated_at AS fecha_ultima_modificacion,
  COUNT(a.id) AS total_citas_historicas,
  COALESCE(SUM(v.total), 0) AS total_gastado
FROM public.clientes c
LEFT JOIN public.agendas a ON c.id = a.id_cliente
LEFT JOIN public.ventas v ON c.id = v.id_cliente
WHERE c.activo = FALSE
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.created_at, c.updated_at
ORDER BY c.updated_at DESC;

-- 15. Vista: Clientes saldos
CREATE OR REPLACE VIEW public.vw_clientes_saldos AS
WITH anticipos_cliente AS (
  SELECT 
    p.id_cliente,
    SUM(CASE WHEN p.tipo_pago = 'anticipo' AND p.aplicado_a_venta = FALSE THEN p.monto ELSE 0 END) AS total_anticipos,
    SUM(CASE WHEN p.tipo_pago = 'abono' THEN p.monto ELSE 0 END) AS total_abonos
  FROM public.pagos p
  GROUP BY p.id_cliente
),
consumos_cliente AS (
  SELECT 
    v.id_cliente,
    SUM(v.total) AS total_consumido,
    COUNT(*) AS cantidad_compras
  FROM public.ventas v
  GROUP BY v.id_cliente
)
SELECT 
  c.id,
  c.numero_expediente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  COALESCE(ac.total_anticipos, 0) AS anticipos_disponibles,
  COALESCE(ac.total_abonos, 0) AS abonos_realizados,
  COALESCE(cc.total_consumido, 0) AS total_consumido,
  COALESCE(cc.cantidad_compras, 0) AS cantidad_compras,
  c.saldo_favor,
  c.saldo_contra,
  COALESCE(ac.total_anticipos, 0) - COALESCE(cc.total_consumido, 0) + c.saldo_favor - c.saldo_contra AS saldo_neto
FROM public.clientes c
LEFT JOIN anticipos_cliente ac ON c.id = ac.id_cliente
LEFT JOIN consumos_cliente cc ON c.id = cc.id_cliente
WHERE c.activo = TRUE
ORDER BY saldo_neto DESC;

-- 16. Vista: Comparativo financiero
CREATE OR REPLACE VIEW public.vw_comparativo_financiero AS
WITH ventas_mes_actual AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total,
    SUM(subtotal) AS facturacion_neta,
    SUM(descuento) AS total_descuentos,
    AVG(total) AS ticket_promedio
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY id_sucursal
),
ventas_mes_anterior AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total,
    SUM(subtotal) AS facturacion_neta,
    AVG(total) AS ticket_promedio
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  GROUP BY id_sucursal
),
ventas_anio_pasado AS (
  SELECT 
    id_sucursal,
    COUNT(*) AS total_ventas,
    SUM(total) AS facturacion_total,
    SUM(subtotal) AS facturacion_neta,
    AVG(total) AS ticket_promedio
  FROM public.ventas
  WHERE DATE_TRUNC('month', fecha) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 year')
  GROUP BY id_sucursal
),
mix_productos AS (
  SELECT 
    v.id_sucursal,
    SUM(CASE WHEN vi.id_servicio IS NOT NULL THEN vi.subtotal ELSE 0 END) AS ingresos_servicios,
    SUM(CASE WHEN vi.id_servicio IS NULL THEN vi.subtotal ELSE 0 END) AS ingresos_productos
  FROM public.ventas v
  JOIN public.venta_items vi ON v.id = vi.id_venta
  WHERE DATE_TRUNC('month', v.fecha) = DATE_TRUNC('month', CURRENT_DATE)
  GROUP BY v.id_sucursal
)
SELECT 
  s.id AS id_sucursal,
  s.nombre AS sucursal,
  CURRENT_DATE AS fecha_reporte,
  COALESCE(vma.total_ventas, 0) AS ventas_mes_actual,
  COALESCE(vma.facturacion_total, 0) AS facturacion_mes_actual,
  COALESCE(vma.facturacion_neta, 0) AS facturacion_neta_mes_actual,
  COALESCE(vma.total_descuentos, 0) AS descuentos_mes_actual,
  COALESCE(vma.ticket_promedio, 0) AS ticket_promedio_actual,
  COALESCE(vme.total_ventas, 0) AS ventas_mes_anterior,
  COALESCE(vme.facturacion_total, 0) AS facturacion_mes_anterior,
  COALESCE(vap.total_ventas, 0) AS ventas_anio_pasado,
  COALESCE(vap.facturacion_total, 0) AS facturacion_anio_pasado,
  CASE 
    WHEN COALESCE(vme.facturacion_total, 0) > 0 
    THEN ROUND(((vma.facturacion_total - vme.facturacion_total) / vme.facturacion_total * 100), 2)
    ELSE 0 
  END AS variacion_mom_porcentaje,
  CASE 
    WHEN COALESCE(vap.facturacion_total, 0) > 0 
    THEN ROUND(((vma.facturacion_total - vap.facturacion_total) / vap.facturacion_total * 100), 2)
    ELSE 0 
  END AS variacion_yoy_porcentaje,
  COALESCE(mp.ingresos_servicios, 0) AS ingresos_servicios,
  COALESCE(mp.ingresos_productos, 0) AS ingresos_productos,
  CASE 
    WHEN (COALESCE(mp.ingresos_servicios, 0) + COALESCE(mp.ingresos_productos, 0)) > 0 
    THEN ROUND((mp.ingresos_servicios / (mp.ingresos_servicios + mp.ingresos_productos) * 100), 2)
    ELSE 0 
  END AS porcentaje_servicios,
  CASE 
    WHEN COALESCE(vma.facturacion_total, 0) > 0 
    THEN ROUND((vma.total_descuentos / vma.facturacion_total * 100), 2)
    ELSE 0 
  END AS porcentaje_descuentos
FROM public.sucursales s
LEFT JOIN ventas_mes_actual vma ON s.id = vma.id_sucursal
LEFT JOIN ventas_mes_anterior vme ON s.id = vme.id_sucursal
LEFT JOIN ventas_anio_pasado vap ON s.id = vap.id_sucursal
LEFT JOIN mix_productos mp ON s.id = mp.id_sucursal
WHERE s.activo = TRUE
ORDER BY s.nombre;

-- 17. Habilitar RLS en nuevas tablas
ALTER TABLE public.campanias_marketing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_enviados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuestas_satisfaccion ENABLE ROW LEVEL SECURITY;

-- 18. Eliminar políticas existentes si existen y crear nuevas para campanias_marketing
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer campañas" ON public.campanias_marketing;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear campañas" ON public.campanias_marketing;
DROP POLICY IF EXISTS "Usuarios autenticados pueden actualizar campañas" ON public.campanias_marketing;

CREATE POLICY "Usuarios autenticados leen campañas" 
  ON public.campanias_marketing FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados crean campañas" 
  ON public.campanias_marketing FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados actualizan campañas" 
  ON public.campanias_marketing FOR UPDATE 
  USING (true);

-- 19. Políticas RLS para mensajes_enviados
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer mensajes" ON public.mensajes_enviados;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear mensajes" ON public.mensajes_enviados;

CREATE POLICY "Usuarios autenticados leen mensajes" 
  ON public.mensajes_enviados FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados crean mensajes" 
  ON public.mensajes_enviados FOR INSERT 
  WITH CHECK (true);

-- 20. Políticas RLS para encuestas_satisfaccion
DROP POLICY IF EXISTS "Usuarios autenticados pueden leer encuestas" ON public.encuestas_satisfaccion;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear encuestas" ON public.encuestas_satisfaccion;

CREATE POLICY "Usuarios autenticados leen encuestas" 
  ON public.encuestas_satisfaccion FOR SELECT 
  USING (true);

CREATE POLICY "Usuarios autenticados crean encuestas" 
  ON public.encuestas_satisfaccion FOR INSERT 
  WITH CHECK (true);

-- 21. Triggers para updated_at
DROP TRIGGER IF EXISTS set_updated_at_campanias ON public.campanias_marketing;
CREATE TRIGGER set_updated_at_campanias
  BEFORE UPDATE ON public.campanias_marketing
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 22. Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_mensajes_cliente_fecha 
  ON public.mensajes_enviados(id_cliente, fecha_envio DESC);

CREATE INDEX IF NOT EXISTS idx_encuestas_sucursal_fecha 
  ON public.encuestas_satisfaccion(id_sucursal, fecha_encuesta DESC);

CREATE INDEX IF NOT EXISTS idx_campanias_fechas 
  ON public.campanias_marketing(fecha_inicio, fecha_fin);-- Crear tabla para logs de cambios de configuración
CREATE TABLE IF NOT EXISTS public.configuracion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campo_modificado varchar NOT NULL,
  valor_anterior text,
  valor_nuevo text,
  modificado_por uuid NOT NULL REFERENCES auth.users(id),
  modificado_en timestamp with time zone NOT NULL DEFAULT now(),
  notas text
);

-- Habilitar RLS
ALTER TABLE public.configuracion_logs ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan leer logs
CREATE POLICY "Usuarios autenticados pueden leer logs de configuración"
ON public.configuracion_logs
FOR SELECT
TO authenticated
USING (true);

-- Política para que solo admins puedan insertar logs
CREATE POLICY "Solo admins pueden insertar logs de configuración"
ON public.configuracion_logs
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Crear índice para mejorar el rendimiento
CREATE INDEX idx_configuracion_logs_modificado_en ON public.configuracion_logs(modificado_en DESC);
CREATE INDEX idx_configuracion_logs_modificado_por ON public.configuracion_logs(modificado_por);-- Agregar campos faltantes a venta_items si no existen
DO $$ 
BEGIN
  -- Agregar precio_original si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venta_items' 
    AND column_name = 'precio_original'
  ) THEN
    ALTER TABLE public.venta_items ADD COLUMN precio_original numeric;
  END IF;

  -- Agregar descuento_porcentaje si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venta_items' 
    AND column_name = 'descuento_porcentaje'
  ) THEN
    ALTER TABLE public.venta_items ADD COLUMN descuento_porcentaje numeric DEFAULT 0;
  END IF;

  -- Agregar precio_final si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'venta_items' 
    AND column_name = 'precio_final'
  ) THEN
    ALTER TABLE public.venta_items ADD COLUMN precio_final numeric;
  END IF;
END $$;

-- Crear ENUM tipo_pago si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_pago_enum') THEN
    CREATE TYPE public.tipo_pago_enum AS ENUM ('venta', 'anticipo', 'abono', 'giftcard');
  END IF;
END $$;

-- Agregar campos a pagos si no existen
DO $$ 
BEGIN
  -- Agregar tipo_pago si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pagos' 
    AND column_name = 'tipo_pago'
  ) THEN
    ALTER TABLE public.pagos ADD COLUMN tipo_pago tipo_pago_enum NOT NULL DEFAULT 'venta'::tipo_pago_enum;
  END IF;

  -- Agregar es_ingreso_diferido si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pagos' 
    AND column_name = 'es_ingreso_diferido'
  ) THEN
    ALTER TABLE public.pagos ADD COLUMN es_ingreso_diferido boolean DEFAULT false;
  END IF;

  -- Agregar fecha_aplicacion si no existe (para anticipos)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pagos' 
    AND column_name = 'fecha_aplicacion'
  ) THEN
    ALTER TABLE public.pagos ADD COLUMN fecha_aplicacion timestamp with time zone;
  END IF;

  -- Agregar aplicado_a_venta si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pagos' 
    AND column_name = 'aplicado_a_venta'
  ) THEN
    ALTER TABLE public.pagos ADD COLUMN aplicado_a_venta boolean DEFAULT false;
  END IF;
END $$;

-- Crear vista para desglose de ventas con descuentos
CREATE OR REPLACE VIEW public.vw_ventas_desglose AS
SELECT 
  v.id,
  v.fecha,
  v.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  v.id_sucursal,
  s.nombre as sucursal,
  v.subtotal,
  v.descuento,
  v.impuestos,
  v.total,
  v.estado_venta,
  -- Cálculos de items
  COALESCE(SUM(vi.precio_original * vi.cantidad), 0) as total_precio_original,
  COALESCE(SUM((vi.precio_original - vi.precio_final) * vi.cantidad), 0) as total_descuento_items,
  COALESCE(AVG(vi.descuento_porcentaje), 0) as promedio_descuento_porcentaje,
  -- Información de pagos
  COALESCE(
    (SELECT SUM(p.monto) 
     FROM public.pagos p 
     WHERE p.id_venta = v.id 
     AND p.tipo_pago = 'venta'::tipo_pago_enum), 
    0
  ) as total_pagado,
  COALESCE(
    (SELECT SUM(p.monto) 
     FROM public.pagos p 
     WHERE p.id_venta = v.id 
     AND p.tipo_pago = 'anticipo'::tipo_pago_enum 
     AND p.aplicado_a_venta = true), 
    0
  ) as anticipos_aplicados,
  COALESCE(
    (SELECT string_agg(DISTINCT p.metodo_pago, ', ') 
     FROM public.pagos p 
     WHERE p.id_venta = v.id), 
    'Sin pagos'
  ) as metodos_pago,
  v.created_at,
  v.updated_at
FROM public.ventas v
LEFT JOIN public.clientes c ON v.id_cliente = c.id
LEFT JOIN public.sucursales s ON v.id_sucursal = s.id
LEFT JOIN public.venta_items vi ON v.id = vi.id_venta
GROUP BY v.id, c.nombre, c.apellidos, s.nombre;

-- Crear vista para anticipos pendientes
CREATE OR REPLACE VIEW public.vw_anticipos_pendientes AS
SELECT 
  p.id,
  p.fecha_pago,
  p.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  c.telefono,
  c.email,
  p.id_sucursal,
  s.nombre as sucursal,
  p.monto,
  p.metodo_pago,
  p.referencia,
  p.notas,
  p.created_at,
  -- Calcular días desde el anticipo
  EXTRACT(DAY FROM (now() - p.fecha_pago))::integer as dias_desde_anticipo
FROM public.pagos p
LEFT JOIN public.clientes c ON p.id_cliente = c.id
LEFT JOIN public.sucursales s ON p.id_sucursal = s.id
WHERE p.tipo_pago = 'anticipo'::tipo_pago_enum
  AND (p.aplicado_a_venta = false OR p.aplicado_a_venta IS NULL)
  AND p.es_ingreso_diferido = true
ORDER BY p.fecha_pago DESC;

-- Habilitar RLS en las vistas (heredan permisos de las tablas base)
ALTER VIEW public.vw_ventas_desglose SET (security_invoker = true);
ALTER VIEW public.vw_anticipos_pendientes SET (security_invoker = true);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_venta_items_precio_original ON public.venta_items(precio_original);
CREATE INDEX IF NOT EXISTS idx_venta_items_descuento ON public.venta_items(descuento_porcentaje);
CREATE INDEX IF NOT EXISTS idx_venta_items_precio_final ON public.venta_items(precio_final);
CREATE INDEX IF NOT EXISTS idx_pagos_tipo_pago ON public.pagos(tipo_pago);
CREATE INDEX IF NOT EXISTS idx_pagos_es_ingreso_diferido ON public.pagos(es_ingreso_diferido);
CREATE INDEX IF NOT EXISTS idx_pagos_aplicado_a_venta ON public.pagos(aplicado_a_venta);-- Vista resumen ejecutivo consolidada
CREATE OR REPLACE VIEW vw_resumen_ejecutivo AS
WITH periodo_actual AS (
  SELECT 
    DATE_TRUNC('month', CURRENT_DATE) as mes,
    COUNT(DISTINCT a.id_cliente) as clientes_totales,
    COUNT(a.id) as total_citas,
    COUNT(CASE WHEN a.estado = 'completada' THEN 1 END) as citas_completadas,
    COUNT(CASE WHEN a.estado = 'no_show' THEN 1 END) as no_shows,
    COUNT(CASE WHEN a.estado = 'cancelada' THEN 1 END) as canceladas,
    a.id_sucursal,
    s.nombre as sucursal
  FROM agendas a
  JOIN sucursales s ON s.id = a.id_sucursal
  WHERE a.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND a.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY a.id_sucursal, s.nombre
),
facturacion_actual AS (
  SELECT
    v.id_sucursal,
    COUNT(v.id) as cantidad_ventas,
    SUM(v.total) as facturacion_total,
    AVG(v.total) as ticket_promedio
  FROM ventas v
  WHERE v.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND v.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY v.id_sucursal
),
retencion_calc AS (
  SELECT
    a.id_sucursal,
    COUNT(DISTINCT CASE 
      WHEN EXISTS (
        SELECT 1 FROM agendas a2 
        WHERE a2.id_cliente = a.id_cliente 
        AND a2.fecha < DATE_TRUNC('month', CURRENT_DATE)
      ) THEN a.id_cliente 
    END) as clientes_retenidos,
    COUNT(DISTINCT a.id_cliente) as total_clientes_periodo
  FROM agendas a
  WHERE a.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND a.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY a.id_sucursal
)
SELECT
  p.id_sucursal,
  p.sucursal,
  p.mes,
  p.clientes_totales,
  p.total_citas,
  p.citas_completadas,
  p.no_shows,
  p.canceladas,
  CASE 
    WHEN p.total_citas > 0 
    THEN ROUND((p.no_shows::numeric / p.total_citas * 100), 2)
    ELSE 0
  END as no_show_rate_porcentaje,
  CASE 
    WHEN p.total_citas > 0 
    THEN ROUND((p.citas_completadas::numeric / p.total_citas * 100), 2)
    ELSE 0
  END as tasa_completadas_porcentaje,
  COALESCE(f.facturacion_total, 0) as facturacion_total,
  COALESCE(f.ticket_promedio, 0) as ticket_promedio,
  COALESCE(f.cantidad_ventas, 0) as cantidad_ventas,
  CASE 
    WHEN r.total_clientes_periodo > 0 
    THEN ROUND((r.clientes_retenidos::numeric / r.total_clientes_periodo * 100), 2)
    ELSE 0
  END as tasa_retencion_porcentaje
FROM periodo_actual p
LEFT JOIN facturacion_actual f ON f.id_sucursal = p.id_sucursal
LEFT JOIN retencion_calc r ON r.id_sucursal = p.id_sucursal;

-- Vista operación clínica consolidada
CREATE OR REPLACE VIEW vw_operacion_clinica AS
WITH asistencia_mes AS (
  SELECT
    a.id_sucursal,
    s.nombre as sucursal,
    DATE_TRUNC('month', a.fecha) as mes,
    COUNT(a.id) as total_registros,
    SUM(a.horas_trabajadas) as total_horas_trabajadas,
    COUNT(DISTINCT a.id_empleado) as empleados_activos
  FROM asistencias a
  JOIN sucursales s ON s.id = a.id_sucursal
  WHERE a.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND a.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY a.id_sucursal, s.nombre, DATE_TRUNC('month', a.fecha)
),
citas_mes AS (
  SELECT
    ag.id_sucursal,
    DATE_TRUNC('month', ag.fecha) as mes,
    COUNT(ag.id) as total_citas,
    COUNT(CASE WHEN ag.estado = 'completada' THEN 1 END) as completadas,
    COUNT(CASE WHEN ag.estado = 'no_show' THEN 1 END) as no_shows,
    COUNT(CASE WHEN ag.estado = 'cancelada' THEN 1 END) as canceladas,
    SUM(COALESCE(serv.duracion_minutos, 30)) as minutos_programados
  FROM agendas ag
  LEFT JOIN servicios serv ON serv.id = ag.id_servicio
  WHERE ag.fecha >= DATE_TRUNC('month', CURRENT_DATE)
    AND ag.fecha < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY ag.id_sucursal, DATE_TRUNC('month', ag.fecha)
),
satisfaccion_mes AS (
  SELECT
    e.id_sucursal,
    DATE_TRUNC('month', e.fecha_encuesta) as mes,
    COUNT(e.id) as total_encuestas,
    AVG(e.calificacion_servicio) as calificacion_servicio_promedio,
    AVG(e.calificacion_instalaciones) as calificacion_instalaciones_promedio,
    AVG(e.nps_score) as nps_promedio
  FROM encuestas_satisfaccion e
  WHERE e.fecha_encuesta >= DATE_TRUNC('month', CURRENT_DATE)
    AND e.fecha_encuesta < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY e.id_sucursal, DATE_TRUNC('month', e.fecha_encuesta)
)
SELECT
  a.id_sucursal,
  a.sucursal,
  a.mes,
  COALESCE(a.total_registros, 0) as registros_asistencia,
  COALESCE(a.total_horas_trabajadas, 0) as horas_trabajadas_totales,
  COALESCE(a.empleados_activos, 0) as empleados_activos,
  COALESCE(c.total_citas, 0) as total_citas,
  COALESCE(c.completadas, 0) as citas_completadas,
  COALESCE(c.no_shows, 0) as no_shows,
  COALESCE(c.canceladas, 0) as citas_canceladas,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.no_shows::numeric / c.total_citas * 100), 2)
    ELSE 0
  END as no_show_rate_porcentaje,
  CASE 
    WHEN c.total_citas > 0 
    THEN ROUND((c.completadas::numeric / c.total_citas * 100), 2)
    ELSE 0
  END as tasa_completadas_porcentaje,
  COALESCE(c.minutos_programados, 0) as minutos_programados,
  -- Ocupación estimada (asumiendo 6 cabinas, 10 horas/día, 26 días/mes)
  CASE 
    WHEN (6 * 10 * 60 * 26) > 0 
    THEN ROUND((c.minutos_programados::numeric / (6 * 10 * 60 * 26) * 100), 2)
    ELSE 0
  END as porcentaje_ocupacion_estimado,
  COALESCE(sat.total_encuestas, 0) as encuestas_satisfaccion,
  COALESCE(sat.calificacion_servicio_promedio, 0) as calificacion_servicio_promedio,
  COALESCE(sat.calificacion_instalaciones_promedio, 0) as calificacion_instalaciones_promedio,
  COALESCE(sat.nps_promedio, 0) as nps_promedio
FROM asistencia_mes a
LEFT JOIN citas_mes c ON c.id_sucursal = a.id_sucursal AND c.mes = a.mes
LEFT JOIN satisfaccion_mes sat ON sat.id_sucursal = a.id_sucursal AND sat.mes = a.mes;

-- Asegurar que las vistas existentes permanezcan
-- Las vistas vw_clientes_recompra, vw_clientes_ausentes, vw_clientes_no_retenidos ya existen-- Enums para inventario
CREATE TYPE tipo_ubicacion_enum AS ENUM ('sucursal', 'bodega');
CREATE TYPE tipo_movimiento_inventario_enum AS ENUM (
  'entrada_compra',
  'salida_consumo',
  'salida_venta',
  'merma_caducado',
  'transferencia'
);
CREATE TYPE categoria_producto_enum AS ENUM (
  'toxina',
  'relleno',
  'anestesia',
  'guantes',
  'mascarillas',
  'jeringas',
  'suturas',
  'vendas',
  'antisepticos',
  'cremas',
  'otros'
);

-- Tabla de productos
CREATE TABLE public.productos (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  categoria categoria_producto_enum NOT NULL,
  proveedor VARCHAR(255),
  unidad_medida VARCHAR(50) NOT NULL DEFAULT 'unidades',
  esta_activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de lotes de producto
CREATE TABLE public.lotes_producto (
  id BIGSERIAL PRIMARY KEY,
  id_producto BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  numero_lote VARCHAR(100) NOT NULL,
  fecha_caducidad DATE NOT NULL,
  costo_unitario_mxn NUMERIC(10,2) NOT NULL,
  fecha_registro_lote TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(id_producto, numero_lote)
);

-- Tabla de ubicaciones (almacenes/sucursales)
CREATE TABLE public.ubicaciones (
  id BIGSERIAL PRIMARY KEY,
  nombre_ubicacion VARCHAR(255) NOT NULL,
  tipo_ubicacion tipo_ubicacion_enum NOT NULL,
  id_sucursal BIGINT REFERENCES public.sucursales(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabla de stock actual por lote y ubicación
CREATE TABLE public.stock_actual (
  id BIGSERIAL PRIMARY KEY,
  id_lote BIGINT NOT NULL REFERENCES public.lotes_producto(id) ON DELETE CASCADE,
  id_producto BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  id_ubicacion BIGINT NOT NULL REFERENCES public.ubicaciones(id) ON DELETE CASCADE,
  cantidad_actual NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_minimo_configurado NUMERIC(10,2) NOT NULL DEFAULT 0,
  stock_maximo_configurado NUMERIC(10,2) NOT NULL DEFAULT 1000,
  ultima_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(id_lote, id_ubicacion)
);

-- Tabla de movimientos de inventario (auditoría completa)
CREATE TABLE public.movimientos_inventario (
  id BIGSERIAL PRIMARY KEY,
  timestamp_movimiento TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  id_producto BIGINT NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  id_lote BIGINT NOT NULL REFERENCES public.lotes_producto(id) ON DELETE RESTRICT,
  id_origen BIGINT REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
  id_destino BIGINT REFERENCES public.ubicaciones(id) ON DELETE SET NULL,
  tipo_movimiento tipo_movimiento_inventario_enum NOT NULL,
  cantidad NUMERIC(10,2) NOT NULL CHECK (cantidad > 0),
  costo_unitario_mxn NUMERIC(10,2) NOT NULL,
  nota TEXT,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar performance
CREATE INDEX idx_lotes_producto_id ON lotes_producto(id_producto);
CREATE INDEX idx_lotes_caducidad ON lotes_producto(fecha_caducidad);
CREATE INDEX idx_stock_actual_producto ON stock_actual(id_producto);
CREATE INDEX idx_stock_actual_ubicacion ON stock_actual(id_ubicacion);
CREATE INDEX idx_movimientos_timestamp ON movimientos_inventario(timestamp_movimiento);
CREATE INDEX idx_movimientos_producto ON movimientos_inventario(id_producto);
CREATE INDEX idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);

-- Función para actualizar stock automáticamente después de un movimiento
CREATE OR REPLACE FUNCTION public.actualizar_stock_por_movimiento()
RETURNS TRIGGER AS $$
BEGIN
  -- Validar que origen y destino según tipo de movimiento
  IF NEW.tipo_movimiento = 'entrada_compra' THEN
    IF NEW.id_origen IS NOT NULL THEN
      RAISE EXCEPTION 'Entrada por compra no puede tener origen';
    END IF;
    IF NEW.id_destino IS NULL THEN
      RAISE EXCEPTION 'Entrada por compra requiere destino';
    END IF;
  ELSIF NEW.tipo_movimiento IN ('salida_consumo', 'salida_venta', 'merma_caducado') THEN
    IF NEW.id_origen IS NULL THEN
      RAISE EXCEPTION 'Salida requiere origen';
    END IF;
    IF NEW.id_destino IS NOT NULL THEN
      RAISE EXCEPTION 'Salida no puede tener destino';
    END IF;
  ELSIF NEW.tipo_movimiento = 'transferencia' THEN
    IF NEW.id_origen IS NULL OR NEW.id_destino IS NULL THEN
      RAISE EXCEPTION 'Transferencia requiere origen y destino';
    END IF;
    IF NEW.id_origen = NEW.id_destino THEN
      RAISE EXCEPTION 'Origen y destino no pueden ser iguales en transferencia';
    END IF;
  END IF;

  -- Validar stock disponible en salidas
  IF NEW.tipo_movimiento IN ('salida_consumo', 'salida_venta', 'merma_caducado', 'transferencia') THEN
    DECLARE
      stock_disponible NUMERIC;
    BEGIN
      SELECT cantidad_actual INTO stock_disponible
      FROM public.stock_actual
      WHERE id_lote = NEW.id_lote AND id_ubicacion = NEW.id_origen;
      
      IF stock_disponible IS NULL OR stock_disponible < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente en ubicación origen para el lote especificado';
      END IF;
    END;
  END IF;

  -- Actualizar stock en origen (restar)
  IF NEW.id_origen IS NOT NULL THEN
    UPDATE public.stock_actual
    SET cantidad_actual = cantidad_actual - NEW.cantidad,
        ultima_actualizacion = now()
    WHERE id_lote = NEW.id_lote AND id_ubicacion = NEW.id_origen;
  END IF;

  -- Actualizar stock en destino (sumar)
  IF NEW.id_destino IS NOT NULL THEN
    -- Intentar actualizar si existe
    UPDATE public.stock_actual
    SET cantidad_actual = cantidad_actual + NEW.cantidad,
        ultima_actualizacion = now()
    WHERE id_lote = NEW.id_lote AND id_ubicacion = NEW.id_destino;
    
    -- Si no existe, crear nuevo registro
    IF NOT FOUND THEN
      INSERT INTO public.stock_actual (
        id_lote, id_producto, id_ubicacion, cantidad_actual, ultima_actualizacion
      ) VALUES (
        NEW.id_lote, NEW.id_producto, NEW.id_destino, NEW.cantidad, now()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar stock automáticamente
CREATE TRIGGER trigger_actualizar_stock
BEFORE INSERT ON public.movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_stock_por_movimiento();

-- Vista para reportes de caducidad
CREATE OR REPLACE VIEW public.vw_reporte_caducidad AS
SELECT 
  p.id as id_producto,
  p.nombre as nombre_producto,
  lp.numero_lote,
  lp.fecha_caducidad,
  (lp.fecha_caducidad - CURRENT_DATE) as dias_hasta_caducar,
  sa.id_ubicacion,
  u.nombre_ubicacion,
  sa.cantidad_actual as cantidad_en_riesgo,
  lp.costo_unitario_mxn
FROM public.stock_actual sa
JOIN public.lotes_producto lp ON sa.id_lote = lp.id
JOIN public.productos p ON sa.id_producto = p.id
JOIN public.ubicaciones u ON sa.id_ubicacion = u.id
WHERE sa.cantidad_actual > 0 
  AND lp.fecha_caducidad >= CURRENT_DATE
ORDER BY dias_hasta_caducar ASC;

-- Vista para reportes de stock mínimo
CREATE OR REPLACE VIEW public.vw_reporte_stock_minimo AS
SELECT 
  u.nombre_ubicacion as sucursal,
  p.nombre as producto,
  lp.numero_lote as lote,
  sa.cantidad_actual,
  sa.stock_minimo_configurado,
  (sa.stock_minimo_configurado - sa.cantidad_actual) as diferencia,
  CASE 
    WHEN sa.cantidad_actual <= sa.stock_minimo_configurado * 0.5 THEN 'ALTA'
    WHEN sa.cantidad_actual <= sa.stock_minimo_configurado THEN 'MEDIA'
    ELSE 'NORMAL'
  END as prioridad_alerta,
  sa.id_ubicacion,
  sa.id_producto,
  sa.id_lote
FROM public.stock_actual sa
JOIN public.productos p ON sa.id_producto = p.id
JOIN public.lotes_producto lp ON sa.id_lote = lp.id
JOIN public.ubicaciones u ON sa.id_ubicacion = u.id
WHERE sa.cantidad_actual <= sa.stock_minimo_configurado
ORDER BY prioridad_alerta DESC, diferencia DESC;

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_productos
BEFORE UPDATE ON public.productos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_ubicaciones
BEFORE UPDATE ON public.ubicaciones
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies

-- Productos
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer productos"
  ON public.productos FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores pueden crear productos"
  ON public.productos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'gerencia')
    )
  );

CREATE POLICY "Administradores pueden actualizar productos"
  ON public.productos FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'gerencia')
    )
  );

-- Lotes producto
ALTER TABLE public.lotes_producto ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer lotes"
  ON public.lotes_producto FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores pueden crear lotes"
  ON public.lotes_producto FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'gerencia')
    )
  );

-- Ubicaciones
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer ubicaciones"
  ON public.ubicaciones FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores pueden gestionar ubicaciones"
  ON public.ubicaciones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'gerencia')
    )
  );

-- Stock actual
ALTER TABLE public.stock_actual ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer stock"
  ON public.stock_actual FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Administradores pueden actualizar stock"
  ON public.stock_actual FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'gerencia', 'recepcion')
    )
  );

-- Movimientos inventario
ALTER TABLE public.movimientos_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer movimientos"
  ON public.movimientos_inventario FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autorizados pueden crear movimientos"
  ON public.movimientos_inventario FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'gerencia', 'recepcion', 'profesional')
    )
  );-- Agregar columna SKU a la tabla productos
ALTER TABLE public.productos 
ADD COLUMN sku character varying UNIQUE;

-- Crear índice para búsquedas rápidas por SKU
CREATE INDEX idx_productos_sku ON public.productos(sku);

-- Función para generar SKU automático si no se proporciona
CREATE OR REPLACE FUNCTION public.generar_sku_producto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    -- Generar SKU basado en prefijo de categoría + ID
    NEW.sku := UPPER(SUBSTRING(NEW.categoria::text, 1, 3)) || '-' || LPAD(NEW.id::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para generar SKU automáticamente
CREATE TRIGGER trigger_generar_sku
  BEFORE INSERT ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_sku_producto();

-- Comentario en la columna
COMMENT ON COLUMN public.productos.sku IS 'Código único de producto (SKU). Se genera automáticamente si no se proporciona.';-- Corregir función generar_sku_producto para incluir search_path
-- Primero eliminar el trigger
DROP TRIGGER IF EXISTS trigger_generar_sku ON public.productos;

-- Eliminar la función
DROP FUNCTION IF EXISTS public.generar_sku_producto();

-- Recrear la función con search_path configurado
CREATE OR REPLACE FUNCTION public.generar_sku_producto()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    -- Generar SKU basado en prefijo de categoría + ID
    NEW.sku := UPPER(SUBSTRING(NEW.categoria::text, 1, 3)) || '-' || LPAD(NEW.id::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_generar_sku
  BEFORE INSERT ON public.productos
  FOR EACH ROW
  EXECUTE FUNCTION public.generar_sku_producto();-- Actualizar política de INSERT en productos para incluir a recepción
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
);-- ============================================
-- MÓDULO DE CLIENTES Y REPORTES - CEDAPIEL (CORREGIDO)
-- ============================================

-- 1. Eliminar vistas existentes que pueden tener conflictos
DROP VIEW IF EXISTS public.vw_clientes_ausentes CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_no_retenidos CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_duplicados CASCADE;
DROP VIEW IF EXISTS public.vw_anticipos_pendientes CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_saldos CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_recompra CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_eliminados CASCADE;

-- 2. Actualizar tabla clientes con campos adicionales
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS sucursal_preferida bigint REFERENCES public.sucursales(id),
ADD COLUMN IF NOT EXISTS fecha_alta timestamp with time zone DEFAULT now();

-- Si created_at ya existe, copiar a fecha_alta para datos históricos
UPDATE public.clientes 
SET fecha_alta = created_at 
WHERE fecha_alta IS NULL AND created_at IS NOT NULL;

-- 3. Crear tabla de saldos de clientes
CREATE TABLE IF NOT EXISTS public.saldos_clientes (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  id_cliente bigint NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  saldo_a_favor_mxn numeric(10,2) DEFAULT 0 CHECK (saldo_a_favor_mxn >= 0),
  saldo_en_contra_mxn numeric(10,2) DEFAULT 0 CHECK (saldo_en_contra_mxn >= 0),
  ultima_actualizacion timestamp with time zone DEFAULT now(),
  UNIQUE(id_cliente)
);

ALTER TABLE public.saldos_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer saldos" ON public.saldos_clientes;
CREATE POLICY "Usuarios autenticados pueden leer saldos"
ON public.saldos_clientes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuarios autorizados pueden actualizar saldos" ON public.saldos_clientes;
CREATE POLICY "Usuarios autorizados pueden actualizar saldos"
ON public.saldos_clientes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role, 'recepcion'::app_role])
  )
);

DROP POLICY IF EXISTS "Usuarios autorizados pueden crear saldos" ON public.saldos_clientes;
CREATE POLICY "Usuarios autorizados pueden crear saldos"
ON public.saldos_clientes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role, 'recepcion'::app_role])
  )
);

-- 4. Crear tabla de tarjetas de regalo
CREATE TABLE IF NOT EXISTS public.tarjetas_regalo (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo_tarjeta varchar(50) UNIQUE NOT NULL,
  comprador_nombre varchar(255) NOT NULL,
  comprador_contacto varchar(255),
  id_cliente_beneficiario bigint REFERENCES public.clientes(id) ON DELETE SET NULL,
  monto_original_mxn numeric(10,2) NOT NULL CHECK (monto_original_mxn > 0),
  monto_disponible_mxn numeric(10,2) NOT NULL CHECK (monto_disponible_mxn >= 0),
  fecha_emision timestamp with time zone DEFAULT now(),
  fecha_uso_total timestamp with time zone,
  sucursal_emision bigint REFERENCES public.sucursales(id),
  activa boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.tarjetas_regalo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer tarjetas" ON public.tarjetas_regalo;
CREATE POLICY "Usuarios autenticados pueden leer tarjetas"
ON public.tarjetas_regalo FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Administradores pueden crear tarjetas" ON public.tarjetas_regalo;
CREATE POLICY "Administradores pueden crear tarjetas"
ON public.tarjetas_regalo FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role])
  )
);

DROP POLICY IF EXISTS "Administradores pueden actualizar tarjetas" ON public.tarjetas_regalo;
CREATE POLICY "Administradores pueden actualizar tarjetas"
ON public.tarjetas_regalo FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role, 'recepcion'::app_role])
  )
);

-- 5. Crear tabla de clientes eliminados
CREATE TABLE IF NOT EXISTS public.clientes_eliminados (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  id_cliente_original bigint NOT NULL,
  nombre varchar(255),
  apellidos varchar(255),
  telefono varchar(50),
  email varchar(255),
  fecha_eliminacion timestamp with time zone DEFAULT now(),
  motivo_eliminacion text,
  usuario_responsable uuid REFERENCES auth.users(id),
  datos_completos jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.clientes_eliminados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo administradores pueden ver clientes eliminados" ON public.clientes_eliminados;
CREATE POLICY "Solo administradores pueden ver clientes eliminados"
ON public.clientes_eliminados FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role])
  )
);

-- 6. Crear tabla de log de fusión de duplicados
CREATE TABLE IF NOT EXISTS public.merge_duplicados_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  id_cliente_final bigint NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ids_clientes_fusionados bigint[] NOT NULL,
  criterios text,
  timestamp_merge timestamp with time zone DEFAULT now(),
  usuario_responsable uuid REFERENCES auth.users(id),
  detalles_fusion jsonb
);

ALTER TABLE public.merge_duplicados_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo administradores pueden ver log de fusiones" ON public.merge_duplicados_log;
CREATE POLICY "Solo administradores pueden ver log de fusiones"
ON public.merge_duplicados_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role])
  )
);

-- 7. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON public.clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON public.clientes(activo);
CREATE INDEX IF NOT EXISTS idx_agendas_cliente_fecha ON public.agendas(id_cliente, fecha);
CREATE INDEX IF NOT EXISTS idx_agendas_estado ON public.agendas(estado);
CREATE INDEX IF NOT EXISTS idx_saldos_cliente ON public.saldos_clientes(id_cliente);
CREATE INDEX IF NOT EXISTS idx_tarjetas_codigo ON public.tarjetas_regalo(codigo_tarjeta);
CREATE INDEX IF NOT EXISTS idx_tarjetas_beneficiario ON public.tarjetas_regalo(id_cliente_beneficiario);

-- 8. Crear función para calcular indicador de riesgo de no-show
CREATE OR REPLACE FUNCTION public.calcular_riesgo_no_show(
  p_id_cliente bigint,
  p_dias_atras int DEFAULT 90
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_no_show int;
  v_count_canceladas int;
BEGIN
  SELECT COUNT(*)
  INTO v_count_no_show
  FROM public.agendas
  WHERE id_cliente = p_id_cliente
    AND estado = 'no_show'
    AND fecha >= CURRENT_DATE - p_dias_atras;
  
  SELECT COUNT(*)
  INTO v_count_canceladas
  FROM public.agendas
  WHERE id_cliente = p_id_cliente
    AND estado = 'cancelada'
    AND fecha >= CURRENT_DATE - p_dias_atras;
  
  IF v_count_no_show >= 2 THEN
    RETURN 'ALTO';
  ELSIF v_count_no_show = 1 OR v_count_canceladas >= 3 THEN
    RETURN 'MEDIO';
  ELSE
    RETURN 'BAJO';
  END IF;
END;
$$;

-- 9. Crear vista para clientes ausentes
CREATE VIEW public.vw_clientes_ausentes AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  MAX(a.fecha) as fecha_ultima_cita,
  CURRENT_DATE - MAX(a.fecha) as dias_sin_citas,
  COUNT(a.id) as total_citas_historicas
FROM public.clientes c
LEFT JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita
HAVING MAX(a.fecha) IS NOT NULL
  AND MAX(a.fecha) < CURRENT_DATE - INTERVAL '60 days';

-- 10. Crear vista para clientes no retenidos
CREATE VIEW public.vw_clientes_no_retenidos AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  MAX(a.fecha) as fecha_ultima_cita,
  CURRENT_DATE - MAX(a.fecha) as dias_desde_ultima_cita,
  COUNT(CASE WHEN a.fecha < CURRENT_DATE THEN 1 END) as total_citas_pasadas,
  COUNT(CASE WHEN a.fecha >= CURRENT_DATE THEN 1 END) as citas_futuras
FROM public.clientes c
LEFT JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono
HAVING COUNT(CASE WHEN a.fecha < CURRENT_DATE THEN 1 END) > 0
  AND COUNT(CASE WHEN a.fecha >= CURRENT_DATE THEN 1 END) = 0
  AND MAX(a.fecha) < CURRENT_DATE - INTERVAL '90 days';

-- 11. Crear vista para detectar duplicados
CREATE VIEW public.vw_clientes_duplicados AS
SELECT 
  'email' as tipo_duplicado,
  email as valor,
  COUNT(*) as cantidad,
  string_agg(id::text, ',') as ids_clientes
FROM public.clientes
WHERE email IS NOT NULL 
  AND email != ''
  AND activo = true
GROUP BY email
HAVING COUNT(*) > 1
UNION ALL
SELECT 
  'telefono' as tipo_duplicado,
  telefono as valor,
  COUNT(*) as cantidad,
  string_agg(id::text, ',') as ids_clientes
FROM public.clientes
WHERE telefono IS NOT NULL 
  AND telefono != ''
  AND activo = true
GROUP BY telefono
HAVING COUNT(*) > 1;

-- 12. Crear vista para anticipos pendientes
CREATE VIEW public.vw_anticipos_pendientes AS
SELECT 
  p.id,
  p.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  c.telefono,
  c.email,
  p.monto,
  p.fecha_pago,
  p.metodo_pago,
  p.referencia,
  p.notas,
  p.id_sucursal,
  s.nombre as sucursal,
  p.created_at,
  CURRENT_DATE - p.fecha_pago::date as dias_desde_anticipo
FROM public.pagos p
JOIN public.clientes c ON p.id_cliente = c.id
LEFT JOIN public.sucursales s ON p.id_sucursal = s.id
WHERE p.tipo_pago = 'anticipo'
  AND p.aplicado_a_venta = false
  AND c.activo = true
ORDER BY p.fecha_pago DESC;

-- 13. Crear vista para clientes con saldos
CREATE VIEW public.vw_clientes_saldos AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.numero_expediente,
  c.telefono,
  c.email,
  COALESCE(sc.saldo_a_favor_mxn, 0) as saldo_favor,
  COALESCE(sc.saldo_en_contra_mxn, 0) as saldo_contra,
  COALESCE(sc.saldo_a_favor_mxn, 0) - COALESCE(sc.saldo_en_contra_mxn, 0) as saldo_neto,
  (SELECT SUM(monto) FROM public.pagos WHERE id_cliente = c.id AND tipo_pago = 'anticipo' AND aplicado_a_venta = false) as anticipos_disponibles,
  (SELECT SUM(monto) FROM public.pagos WHERE id_cliente = c.id AND tipo_pago = 'abono') as abonos_realizados,
  (SELECT SUM(total) FROM public.ventas WHERE id_cliente = c.id) as total_consumido,
  (SELECT COUNT(*) FROM public.ventas WHERE id_cliente = c.id) as cantidad_compras
FROM public.clientes c
LEFT JOIN public.saldos_clientes sc ON c.id = sc.id_cliente
WHERE c.activo = true;

-- 14. Crear vista para clientes por segmento de recompra
CREATE VIEW public.vw_clientes_recompra AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  MAX(a.fecha) as fecha_ultima_cita,
  CURRENT_DATE - MAX(a.fecha) as dias_desde_ultima_cita,
  CASE 
    WHEN CURRENT_DATE - MAX(a.fecha) <= 30 THEN 'ACTIVO'
    WHEN CURRENT_DATE - MAX(a.fecha) <= 60 THEN 'EN_RIESGO'
    WHEN CURRENT_DATE - MAX(a.fecha) <= 90 THEN 'ALTO_RIESGO'
    ELSE 'PERDIDO'
  END as segmento_recompra
FROM public.clientes c
JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = true
  AND a.estado IN ('completada', 'presentado')
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono;

-- 15. Crear vista para clientes eliminados (auditoría)
CREATE VIEW public.vw_clientes_eliminados AS
SELECT 
  ce.id,
  ce.id_cliente_original,
  ce.nombre,
  ce.apellidos,
  ce.email,
  ce.telefono,
  ce.fecha_eliminacion,
  ce.motivo_eliminacion,
  p.nombre_completo as usuario_responsable,
  ce.fecha_eliminacion - (ce.datos_completos->>'created_at')::timestamp as tiempo_vida_cliente,
  (SELECT SUM(total) FROM public.ventas WHERE id_cliente = ce.id_cliente_original) as total_gastado,
  (SELECT COUNT(*) FROM public.agendas WHERE id_cliente = ce.id_cliente_original) as total_citas_historicas,
  ce.datos_completos->>'created_at' as fecha_registro
FROM public.clientes_eliminados ce
LEFT JOIN public.profiles p ON ce.usuario_responsable = p.id
ORDER BY ce.fecha_eliminacion DESC;

-- 16. Crear función para generar código único de tarjeta de regalo
CREATE OR REPLACE FUNCTION public.generar_codigo_tarjeta()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_codigo text;
  v_existe boolean;
BEGIN
  LOOP
    v_codigo := 'GC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.tarjetas_regalo WHERE codigo_tarjeta = v_codigo) INTO v_existe;
    EXIT WHEN NOT v_existe;
  END LOOP;
  RETURN v_codigo;
END;
$$;

-- 17. Trigger para actualizar fecha de última visita en clientes
CREATE OR REPLACE FUNCTION public.actualizar_fecha_ultima_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado IN ('completada', 'presentado') THEN
    UPDATE public.clientes
    SET fecha_ultima_visita = NEW.fecha
    WHERE id = NEW.id_cliente
      AND (fecha_ultima_visita IS NULL OR fecha_ultima_visita < NEW.fecha);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_ultima_visita ON public.agendas;
CREATE TRIGGER trigger_actualizar_fecha_ultima_visita
AFTER INSERT OR UPDATE ON public.agendas
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_fecha_ultima_visita();

-- 18. Trigger para actualizar timestamp de tarjetas de regalo
CREATE OR REPLACE FUNCTION public.actualizar_updated_at_tarjetas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_updated_at_tarjetas ON public.tarjetas_regalo;
CREATE TRIGGER trigger_updated_at_tarjetas
BEFORE UPDATE ON public.tarjetas_regalo
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_updated_at_tarjetas();-- ============================================
-- MÓDULO DE CLIENTES Y REPORTES - CEDAPIEL (CORREGIDO)
-- ============================================

-- 1. Eliminar vistas existentes que pueden tener conflictos
DROP VIEW IF EXISTS public.vw_clientes_ausentes CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_no_retenidos CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_duplicados CASCADE;
DROP VIEW IF EXISTS public.vw_anticipos_pendientes CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_saldos CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_recompra CASCADE;
DROP VIEW IF EXISTS public.vw_clientes_eliminados CASCADE;

-- 2. Actualizar tabla clientes con campos adicionales
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS sucursal_preferida bigint REFERENCES public.sucursales(id),
ADD COLUMN IF NOT EXISTS fecha_alta timestamp with time zone DEFAULT now();

-- Si created_at ya existe, copiar a fecha_alta para datos históricos
UPDATE public.clientes 
SET fecha_alta = created_at 
WHERE fecha_alta IS NULL AND created_at IS NOT NULL;

-- 3. Crear tabla de saldos de clientes
CREATE TABLE IF NOT EXISTS public.saldos_clientes (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  id_cliente bigint NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  saldo_a_favor_mxn numeric(10,2) DEFAULT 0 CHECK (saldo_a_favor_mxn >= 0),
  saldo_en_contra_mxn numeric(10,2) DEFAULT 0 CHECK (saldo_en_contra_mxn >= 0),
  ultima_actualizacion timestamp with time zone DEFAULT now(),
  UNIQUE(id_cliente)
);

ALTER TABLE public.saldos_clientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer saldos" ON public.saldos_clientes;
CREATE POLICY "Usuarios autenticados pueden leer saldos"
ON public.saldos_clientes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Usuarios autorizados pueden actualizar saldos" ON public.saldos_clientes;
CREATE POLICY "Usuarios autorizados pueden actualizar saldos"
ON public.saldos_clientes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role, 'recepcion'::app_role])
  )
);

DROP POLICY IF EXISTS "Usuarios autorizados pueden crear saldos" ON public.saldos_clientes;
CREATE POLICY "Usuarios autorizados pueden crear saldos"
ON public.saldos_clientes FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role, 'recepcion'::app_role])
  )
);

-- 4. Crear tabla de tarjetas de regalo
CREATE TABLE IF NOT EXISTS public.tarjetas_regalo (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo_tarjeta varchar(50) UNIQUE NOT NULL,
  comprador_nombre varchar(255) NOT NULL,
  comprador_contacto varchar(255),
  id_cliente_beneficiario bigint REFERENCES public.clientes(id) ON DELETE SET NULL,
  monto_original_mxn numeric(10,2) NOT NULL CHECK (monto_original_mxn > 0),
  monto_disponible_mxn numeric(10,2) NOT NULL CHECK (monto_disponible_mxn >= 0),
  fecha_emision timestamp with time zone DEFAULT now(),
  fecha_uso_total timestamp with time zone,
  sucursal_emision bigint REFERENCES public.sucursales(id),
  activa boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.tarjetas_regalo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer tarjetas" ON public.tarjetas_regalo;
CREATE POLICY "Usuarios autenticados pueden leer tarjetas"
ON public.tarjetas_regalo FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Administradores pueden crear tarjetas" ON public.tarjetas_regalo;
CREATE POLICY "Administradores pueden crear tarjetas"
ON public.tarjetas_regalo FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role])
  )
);

DROP POLICY IF EXISTS "Administradores pueden actualizar tarjetas" ON public.tarjetas_regalo;
CREATE POLICY "Administradores pueden actualizar tarjetas"
ON public.tarjetas_regalo FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role, 'recepcion'::app_role])
  )
);

-- 5. Crear tabla de clientes eliminados
CREATE TABLE IF NOT EXISTS public.clientes_eliminados (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  id_cliente_original bigint NOT NULL,
  nombre varchar(255),
  apellidos varchar(255),
  telefono varchar(50),
  email varchar(255),
  fecha_eliminacion timestamp with time zone DEFAULT now(),
  motivo_eliminacion text,
  usuario_responsable uuid REFERENCES auth.users(id),
  datos_completos jsonb,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.clientes_eliminados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo administradores pueden ver clientes eliminados" ON public.clientes_eliminados;
CREATE POLICY "Solo administradores pueden ver clientes eliminados"
ON public.clientes_eliminados FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role])
  )
);

-- 6. Crear tabla de log de fusión de duplicados
CREATE TABLE IF NOT EXISTS public.merge_duplicados_log (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  id_cliente_final bigint NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  ids_clientes_fusionados bigint[] NOT NULL,
  criterios text,
  timestamp_merge timestamp with time zone DEFAULT now(),
  usuario_responsable uuid REFERENCES auth.users(id),
  detalles_fusion jsonb
);

ALTER TABLE public.merge_duplicados_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Solo administradores pueden ver log de fusiones" ON public.merge_duplicados_log;
CREATE POLICY "Solo administradores pueden ver log de fusiones"
ON public.merge_duplicados_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = ANY (ARRAY['admin'::app_role, 'gerencia'::app_role])
  )
);

-- 7. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_email ON public.clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON public.clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON public.clientes(activo);
CREATE INDEX IF NOT EXISTS idx_agendas_cliente_fecha ON public.agendas(id_cliente, fecha);
CREATE INDEX IF NOT EXISTS idx_agendas_estado ON public.agendas(estado);
CREATE INDEX IF NOT EXISTS idx_saldos_cliente ON public.saldos_clientes(id_cliente);
CREATE INDEX IF NOT EXISTS idx_tarjetas_codigo ON public.tarjetas_regalo(codigo_tarjeta);
CREATE INDEX IF NOT EXISTS idx_tarjetas_beneficiario ON public.tarjetas_regalo(id_cliente_beneficiario);

-- 8. Crear función para calcular indicador de riesgo de no-show
CREATE OR REPLACE FUNCTION public.calcular_riesgo_no_show(
  p_id_cliente bigint,
  p_dias_atras int DEFAULT 90
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count_no_show int;
  v_count_canceladas int;
BEGIN
  SELECT COUNT(*)
  INTO v_count_no_show
  FROM public.agendas
  WHERE id_cliente = p_id_cliente
    AND estado = 'no_show'
    AND fecha >= CURRENT_DATE - p_dias_atras;
  
  SELECT COUNT(*)
  INTO v_count_canceladas
  FROM public.agendas
  WHERE id_cliente = p_id_cliente
    AND estado = 'cancelada'
    AND fecha >= CURRENT_DATE - p_dias_atras;
  
  IF v_count_no_show >= 2 THEN
    RETURN 'ALTO';
  ELSIF v_count_no_show = 1 OR v_count_canceladas >= 3 THEN
    RETURN 'MEDIO';
  ELSE
    RETURN 'BAJO';
  END IF;
END;
$$;

-- 9. Crear vista para clientes ausentes
CREATE VIEW public.vw_clientes_ausentes AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  MAX(a.fecha) as fecha_ultima_cita,
  CURRENT_DATE - MAX(a.fecha) as dias_sin_citas,
  COUNT(a.id) as total_citas_historicas
FROM public.clientes c
LEFT JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita
HAVING MAX(a.fecha) IS NOT NULL
  AND MAX(a.fecha) < CURRENT_DATE - INTERVAL '60 days';

-- 10. Crear vista para clientes no retenidos
CREATE VIEW public.vw_clientes_no_retenidos AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  MAX(a.fecha) as fecha_ultima_cita,
  CURRENT_DATE - MAX(a.fecha) as dias_desde_ultima_cita,
  COUNT(CASE WHEN a.fecha < CURRENT_DATE THEN 1 END) as total_citas_pasadas,
  COUNT(CASE WHEN a.fecha >= CURRENT_DATE THEN 1 END) as citas_futuras
FROM public.clientes c
LEFT JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono
HAVING COUNT(CASE WHEN a.fecha < CURRENT_DATE THEN 1 END) > 0
  AND COUNT(CASE WHEN a.fecha >= CURRENT_DATE THEN 1 END) = 0
  AND MAX(a.fecha) < CURRENT_DATE - INTERVAL '90 days';

-- 11. Crear vista para detectar duplicados
CREATE VIEW public.vw_clientes_duplicados AS
SELECT 
  'email' as tipo_duplicado,
  email as valor,
  COUNT(*) as cantidad,
  string_agg(id::text, ',') as ids_clientes
FROM public.clientes
WHERE email IS NOT NULL 
  AND email != ''
  AND activo = true
GROUP BY email
HAVING COUNT(*) > 1
UNION ALL
SELECT 
  'telefono' as tipo_duplicado,
  telefono as valor,
  COUNT(*) as cantidad,
  string_agg(id::text, ',') as ids_clientes
FROM public.clientes
WHERE telefono IS NOT NULL 
  AND telefono != ''
  AND activo = true
GROUP BY telefono
HAVING COUNT(*) > 1;

-- 12. Crear vista para anticipos pendientes
CREATE VIEW public.vw_anticipos_pendientes AS
SELECT 
  p.id,
  p.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  c.telefono,
  c.email,
  p.monto,
  p.fecha_pago,
  p.metodo_pago,
  p.referencia,
  p.notas,
  p.id_sucursal,
  s.nombre as sucursal,
  p.created_at,
  CURRENT_DATE - p.fecha_pago::date as dias_desde_anticipo
FROM public.pagos p
JOIN public.clientes c ON p.id_cliente = c.id
LEFT JOIN public.sucursales s ON p.id_sucursal = s.id
WHERE p.tipo_pago = 'anticipo'
  AND p.aplicado_a_venta = false
  AND c.activo = true
ORDER BY p.fecha_pago DESC;

-- 13. Crear vista para clientes con saldos
CREATE VIEW public.vw_clientes_saldos AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.numero_expediente,
  c.telefono,
  c.email,
  COALESCE(sc.saldo_a_favor_mxn, 0) as saldo_favor,
  COALESCE(sc.saldo_en_contra_mxn, 0) as saldo_contra,
  COALESCE(sc.saldo_a_favor_mxn, 0) - COALESCE(sc.saldo_en_contra_mxn, 0) as saldo_neto,
  (SELECT SUM(monto) FROM public.pagos WHERE id_cliente = c.id AND tipo_pago = 'anticipo' AND aplicado_a_venta = false) as anticipos_disponibles,
  (SELECT SUM(monto) FROM public.pagos WHERE id_cliente = c.id AND tipo_pago = 'abono') as abonos_realizados,
  (SELECT SUM(total) FROM public.ventas WHERE id_cliente = c.id) as total_consumido,
  (SELECT COUNT(*) FROM public.ventas WHERE id_cliente = c.id) as cantidad_compras
FROM public.clientes c
LEFT JOIN public.saldos_clientes sc ON c.id = sc.id_cliente
WHERE c.activo = true;

-- 14. Crear vista para clientes por segmento de recompra
CREATE VIEW public.vw_clientes_recompra AS
SELECT 
  c.id,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  MAX(a.fecha) as fecha_ultima_cita,
  CURRENT_DATE - MAX(a.fecha) as dias_desde_ultima_cita,
  CASE 
    WHEN CURRENT_DATE - MAX(a.fecha) <= 30 THEN 'ACTIVO'
    WHEN CURRENT_DATE - MAX(a.fecha) <= 60 THEN 'EN_RIESGO'
    WHEN CURRENT_DATE - MAX(a.fecha) <= 90 THEN 'ALTO_RIESGO'
    ELSE 'PERDIDO'
  END as segmento_recompra
FROM public.clientes c
JOIN public.agendas a ON c.id = a.id_cliente
WHERE c.activo = true
  AND a.estado IN ('completada', 'presentado')
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono;

-- 15. Crear vista para clientes eliminados (auditoría)
CREATE VIEW public.vw_clientes_eliminados AS
SELECT 
  ce.id,
  ce.id_cliente_original,
  ce.nombre,
  ce.apellidos,
  ce.email,
  ce.telefono,
  ce.fecha_eliminacion,
  ce.motivo_eliminacion,
  p.nombre_completo as usuario_responsable,
  ce.fecha_eliminacion - (ce.datos_completos->>'created_at')::timestamp as tiempo_vida_cliente,
  (SELECT SUM(total) FROM public.ventas WHERE id_cliente = ce.id_cliente_original) as total_gastado,
  (SELECT COUNT(*) FROM public.agendas WHERE id_cliente = ce.id_cliente_original) as total_citas_historicas,
  ce.datos_completos->>'created_at' as fecha_registro
FROM public.clientes_eliminados ce
LEFT JOIN public.profiles p ON ce.usuario_responsable = p.id
ORDER BY ce.fecha_eliminacion DESC;

-- 16. Crear función para generar código único de tarjeta de regalo
CREATE OR REPLACE FUNCTION public.generar_codigo_tarjeta()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_codigo text;
  v_existe boolean;
BEGIN
  LOOP
    v_codigo := 'GC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.tarjetas_regalo WHERE codigo_tarjeta = v_codigo) INTO v_existe;
    EXIT WHEN NOT v_existe;
  END LOOP;
  RETURN v_codigo;
END;
$$;

-- 17. Trigger para actualizar fecha de última visita en clientes
CREATE OR REPLACE FUNCTION public.actualizar_fecha_ultima_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado IN ('completada', 'presentado') THEN
    UPDATE public.clientes
    SET fecha_ultima_visita = NEW.fecha
    WHERE id = NEW.id_cliente
      AND (fecha_ultima_visita IS NULL OR fecha_ultima_visita < NEW.fecha);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_actualizar_fecha_ultima_visita ON public.agendas;
CREATE TRIGGER trigger_actualizar_fecha_ultima_visita
AFTER INSERT OR UPDATE ON public.agendas
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_fecha_ultima_visita();

-- 18. Trigger para actualizar timestamp de tarjetas de regalo
CREATE OR REPLACE FUNCTION public.actualizar_updated_at_tarjetas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_updated_at_tarjetas ON public.tarjetas_regalo;
CREATE TRIGGER trigger_updated_at_tarjetas
BEFORE UPDATE ON public.tarjetas_regalo
FOR EACH ROW
EXECUTE FUNCTION public.actualizar_updated_at_tarjetas();-- Corregir funciones sin search_path configurado

CREATE OR REPLACE FUNCTION public.generar_codigo_tarjeta()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo text;
  v_existe boolean;
BEGIN
  LOOP
    v_codigo := 'GC-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.tarjetas_regalo WHERE codigo_tarjeta = v_codigo) INTO v_existe;
    EXIT WHEN NOT v_existe;
  END LOOP;
  RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.actualizar_updated_at_tarjetas()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;-- ==========================================
-- MÓDULO RRHH / PRODUCTIVIDAD / NÓMINA (CORREGIDO)
-- ==========================================

-- Eliminar vistas existentes si existen
DROP VIEW IF EXISTS public.vw_produccion_empleado CASCADE;
DROP VIEW IF EXISTS public.vw_productividad_empleado CASCADE;

-- 1) Actualizar tabla empleados con campos faltantes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empleados' AND column_name='rut_o_rfc') THEN
    ALTER TABLE public.empleados ADD COLUMN rut_o_rfc VARCHAR(50);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='empleados' AND column_name='cargo') THEN
    ALTER TABLE public.empleados ADD COLUMN cargo VARCHAR(100);
  END IF;
END $$;

-- 2) Tabla: Jornada Laboral
CREATE TABLE IF NOT EXISTS public.jornada_laboral (
  id BIGSERIAL PRIMARY KEY,
  id_empleado BIGINT NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  id_sucursal BIGINT REFERENCES public.sucursales(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_horario CHECK (hora_fin > hora_inicio)
);

-- 3) Actualizar asistencias
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='asistencias' AND column_name='estado') THEN
    ALTER TABLE public.asistencias ADD COLUMN estado VARCHAR(20) DEFAULT 'presente';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='asistencias' AND column_name='observaciones') THEN
    ALTER TABLE public.asistencias ADD COLUMN observaciones TEXT;
  END IF;
END $$;

-- 4) Tabla: Parámetros de Comisión
CREATE TABLE IF NOT EXISTS public.parametros_comision (
  id BIGSERIAL PRIMARY KEY,
  id_empleado BIGINT REFERENCES public.empleados(id) ON DELETE CASCADE,
  id_categoria_servicio BIGINT REFERENCES public.categoria_servicio(id) ON DELETE CASCADE,
  porcentaje_comision NUMERIC(5,2) NOT NULL CHECK (porcentaje_comision >= 0 AND porcentaje_comision <= 100),
  vigencia_desde DATE NOT NULL,
  vigencia_hasta DATE,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_vigencia CHECK (vigencia_hasta IS NULL OR vigencia_hasta >= vigencia_desde)
);

-- 5) Tabla: Metas de Productividad
CREATE TABLE IF NOT EXISTS public.metas_productividad (
  id BIGSERIAL PRIMARY KEY,
  id_empleado BIGINT REFERENCES public.empleados(id) ON DELETE CASCADE,
  id_sucursal BIGINT REFERENCES public.sucursales(id) ON DELETE CASCADE,
  tipo_meta VARCHAR(50) NOT NULL,
  valor_objetivo NUMERIC(12,2) NOT NULL,
  periodo VARCHAR(20) NOT NULL,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6) Tabla: Liquidación Semanal
CREATE TABLE IF NOT EXISTS public.liquidacion_semanal (
  id BIGSERIAL PRIMARY KEY,
  id_empleado BIGINT NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  semana_inicio DATE NOT NULL,
  semana_fin DATE NOT NULL,
  ingresos_reconocidos_mxn NUMERIC(12,2) DEFAULT 0,
  comision_mxn NUMERIC(10,2) DEFAULT 0,
  horas_trabajadas NUMERIC(8,2) DEFAULT 0,
  salario_base_mxn NUMERIC(10,2) DEFAULT 0,
  ajustes_mxn NUMERIC(10,2) DEFAULT 0,
  motivo_ajuste TEXT,
  total_a_pagar_mxn NUMERIC(12,2) GENERATED ALWAYS AS (salario_base_mxn + comision_mxn + ajustes_mxn) STORED,
  estado VARCHAR(20) DEFAULT 'calculada',
  aprobada_por UUID REFERENCES auth.users(id),
  pagada_por UUID REFERENCES auth.users(id),
  fecha_pago DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_periodo CHECK (semana_fin >= semana_inicio)
);

-- 7) Tabla: Detalle de Liquidación
CREATE TABLE IF NOT EXISTS public.liquidacion_detalle (
  id BIGSERIAL PRIMARY KEY,
  id_liquidacion BIGINT NOT NULL REFERENCES public.liquidacion_semanal(id) ON DELETE CASCADE,
  id_cita BIGINT REFERENCES public.agendas(id),
  id_venta_item BIGINT REFERENCES public.venta_items(id),
  id_servicio BIGINT REFERENCES public.servicios(id),
  fecha_servicio DATE NOT NULL,
  monto_venta_mxn NUMERIC(10,2) NOT NULL,
  porcentaje_comision NUMERIC(5,2) NOT NULL,
  comision_item_mxn NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8) Tabla: Bitácora de Acciones
CREATE TABLE IF NOT EXISTS public.bitacora_accion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario UUID REFERENCES auth.users(id),
  timestamp TIMESTAMPTZ DEFAULT now(),
  accion VARCHAR(50) NOT NULL,
  entidad VARCHAR(50) NOT NULL,
  id_entidad BIGINT,
  detalle_json JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 9) Vista: Productividad semanal detallada
CREATE OR REPLACE VIEW public.vw_productividad_empleado AS
SELECT 
  e.id AS id_empleado,
  e.nombre || ' ' || COALESCE(e.apellidos, '') AS empleado_nombre,
  s.nombre AS sucursal,
  DATE_TRUNC('week', a.fecha)::DATE AS semana_inicio,
  COUNT(DISTINCT ag.id) FILTER (WHERE ag.estado IN ('presentado', 'completada')) AS sesiones_realizadas,
  COALESCE(SUM(asi.horas_trabajadas), 0) AS horas_trabajadas,
  COALESCE(SUM(v.total), 0) AS ingresos_reconocidos_mxn,
  COALESCE(SUM(c.monto_comision), 0) AS comision_mxn,
  e.salario_hora AS salario_por_hora_mxn,
  (COALESCE(SUM(asi.horas_trabajadas), 0) * COALESCE(e.salario_hora, 0)) AS salario_base_mxn
FROM public.empleados e
LEFT JOIN public.sucursales s ON e.id_sucursal = s.id
LEFT JOIN public.asistencias a ON e.id = a.id_empleado
LEFT JOIN public.asistencias asi ON e.id = asi.id_empleado AND a.fecha = asi.fecha
LEFT JOIN public.agendas ag ON e.id = ag.id_empleado AND a.fecha = ag.fecha
LEFT JOIN public.ventas v ON ag.id_cliente = v.id_cliente AND ag.fecha = v.fecha::DATE
LEFT JOIN public.comisiones c ON e.id = c.id_empleado AND DATE_TRUNC('week', a.fecha)::DATE = DATE_TRUNC('week', c.periodo_inicio)::DATE
WHERE e.activo = true
  AND a.fecha >= CURRENT_DATE - INTERVAL '12 weeks'
GROUP BY e.id, e.nombre, e.apellidos, s.nombre, semana_inicio, e.salario_hora
ORDER BY semana_inicio DESC, empleado_nombre;

-- Índices
CREATE INDEX IF NOT EXISTS idx_jornada_empleado ON public.jornada_laboral(id_empleado);
CREATE INDEX IF NOT EXISTS idx_parametros_comision_empleado ON public.parametros_comision(id_empleado);
CREATE INDEX IF NOT EXISTS idx_parametros_comision_categoria ON public.parametros_comision(id_categoria_servicio);
CREATE INDEX IF NOT EXISTS idx_liquidacion_empleado_periodo ON public.liquidacion_semanal(id_empleado, semana_inicio, semana_fin);
CREATE INDEX IF NOT EXISTS idx_liquidacion_detalle ON public.liquidacion_detalle(id_liquidacion);
CREATE INDEX IF NOT EXISTS idx_bitacora_entidad ON public.bitacora_accion(entidad, id_entidad);
CREATE INDEX IF NOT EXISTS idx_bitacora_usuario ON public.bitacora_accion(usuario);
CREATE INDEX IF NOT EXISTS idx_asistencias_empleado_fecha ON public.asistencias(id_empleado, fecha);

-- Triggers
DROP TRIGGER IF EXISTS trigger_jornada_updated_at ON public.jornada_laboral;
DROP TRIGGER IF EXISTS trigger_parametros_comision_updated_at ON public.parametros_comision;
DROP TRIGGER IF EXISTS trigger_liquidacion_updated_at ON public.liquidacion_semanal;

CREATE TRIGGER trigger_jornada_updated_at
  BEFORE UPDATE ON public.jornada_laboral
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_parametros_comision_updated_at
  BEFORE UPDATE ON public.parametros_comision
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trigger_liquidacion_updated_at
  BEFORE UPDATE ON public.liquidacion_semanal
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS Policies
ALTER TABLE public.jornada_laboral ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_comision ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metas_productividad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidacion_semanal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liquidacion_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bitacora_accion ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jornada_laboral' AND policyname='Usuarios autenticados pueden leer jornadas') THEN
    CREATE POLICY "Usuarios autenticados pueden leer jornadas" ON public.jornada_laboral FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='jornada_laboral' AND policyname='Admin y gerencia pueden gestionar jornadas') THEN
    CREATE POLICY "Admin y gerencia pueden gestionar jornadas" ON public.jornada_laboral FOR ALL USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parametros_comision' AND policyname='Usuarios autenticados pueden leer parámetros comisión') THEN
    CREATE POLICY "Usuarios autenticados pueden leer parámetros comisión" ON public.parametros_comision FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='parametros_comision' AND policyname='Admin y gerencia pueden gestionar parámetros comisión') THEN
    CREATE POLICY "Admin y gerencia pueden gestionar parámetros comisión" ON public.parametros_comision FOR ALL USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='metas_productividad' AND policyname='Usuarios autenticados pueden leer metas') THEN
    CREATE POLICY "Usuarios autenticados pueden leer metas" ON public.metas_productividad FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='metas_productividad' AND policyname='Admin y gerencia pueden gestionar metas') THEN
    CREATE POLICY "Admin y gerencia pueden gestionar metas" ON public.metas_productividad FOR ALL USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='liquidacion_semanal' AND policyname='Usuarios autenticados pueden leer liquidaciones') THEN
    CREATE POLICY "Usuarios autenticados pueden leer liquidaciones" ON public.liquidacion_semanal FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='liquidacion_semanal' AND policyname='Admin y gerencia pueden gestionar liquidaciones') THEN
    CREATE POLICY "Admin y gerencia pueden gestionar liquidaciones" ON public.liquidacion_semanal FOR ALL USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='liquidacion_detalle' AND policyname='Usuarios autenticados pueden leer detalle liquidación') THEN
    CREATE POLICY "Usuarios autenticados pueden leer detalle liquidación" ON public.liquidacion_detalle FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='liquidacion_detalle' AND policyname='Admin y gerencia pueden crear detalle liquidación') THEN
    CREATE POLICY "Admin y gerencia pueden crear detalle liquidación" ON public.liquidacion_detalle FOR INSERT WITH CHECK (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bitacora_accion' AND policyname='Usuarios autenticados pueden leer bitácora') THEN
    CREATE POLICY "Usuarios autenticados pueden leer bitácora" ON public.bitacora_accion FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='bitacora_accion' AND policyname='Cualquier usuario autenticado puede insertar en bitácora') THEN
    CREATE POLICY "Cualquier usuario autenticado puede insertar en bitácora" ON public.bitacora_accion FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='empleados' AND policyname='Admin y gerencia pueden gestionar empleados') THEN
    CREATE POLICY "Admin y gerencia pueden gestionar empleados" ON public.empleados FOR ALL USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='asistencias' AND policyname='Admin y gerencia pueden eliminar asistencias') THEN
    CREATE POLICY "Admin y gerencia pueden eliminar asistencias" ON public.asistencias FOR DELETE USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia')
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='permisos' AND policyname='Admin y gerencia pueden eliminar permisos') THEN
    CREATE POLICY "Admin y gerencia pueden eliminar permisos" ON public.permisos FOR DELETE USING (
      has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'gerencia')
    );
  END IF;
END $$;-- ============================================
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
CREATE INDEX IF NOT EXISTS idx_profiles_activo ON public.profiles(activo);-- ============================================
-- MÓDULO DE CONTROL DE ACCESO - CEDAPIEL (PARTE 2: Funciones, RLS y Seed)
-- ============================================

-- 1. Función para obtener permisos efectivos de un usuario
CREATE OR REPLACE FUNCTION public.get_permisos_usuario(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permisos JSONB := '{}'::jsonb;
  v_rol VARCHAR;
BEGIN
  -- Obtener todos los roles del usuario y merge sus permisos
  FOR v_rol IN 
    SELECT role::text FROM public.user_roles WHERE user_id = _user_id
  LOOP
    SELECT v_permisos || COALESCE(rd.permisos_json, '{}'::jsonb)
    INTO v_permisos
    FROM public.rol_definiciones rd
    WHERE rd.rol_sistema = v_rol AND rd.activo = true;
  END LOOP;
  
  RETURN v_permisos;
END;
$$;

-- 2. Función para verificar permiso específico
CREATE OR REPLACE FUNCTION public.tiene_permiso(_user_id UUID, _permiso TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_permisos JSONB;
BEGIN
  v_permisos := public.get_permisos_usuario(_user_id);
  RETURN COALESCE((v_permisos->>_permiso)::boolean, false);
END;
$$;

-- 3. Función para verificar alcance de sucursal
CREATE OR REPLACE FUNCTION public.puede_acceder_sucursal(_user_id UUID, _id_sucursal BIGINT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sucursal_usuario BIGINT;
BEGIN
  -- Admin y dirección tienen acceso global
  IF public.has_role(_user_id, 'admin') OR 
     public.has_role(_user_id, 'direccion') OR
     public.has_role(_user_id, 'admin_rrhh') OR
     public.has_role(_user_id, 'gerencia') THEN
    RETURN true;
  END IF;
  
  -- Obtener sucursal del usuario
  SELECT id_sucursal INTO v_sucursal_usuario
  FROM public.profiles
  WHERE id = _user_id;
  
  -- Si no tiene sucursal asignada, no tiene acceso
  IF v_sucursal_usuario IS NULL THEN
    RETURN false;
  END IF;
  
  -- Solo puede acceder a su sucursal
  RETURN v_sucursal_usuario = _id_sucursal;
END;
$$;

-- 4. Función para registrar acción en bitácora
CREATE OR REPLACE FUNCTION public.registrar_accion_acceso(
  _user_id UUID,
  _accion VARCHAR,
  _id_afectado UUID DEFAULT NULL,
  _detalle JSONB DEFAULT NULL,
  _motivo TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.bitacora_acceso (
    id_usuario_responsable,
    id_usuario_afectado,
    accion,
    detalle_json,
    motivo
  ) VALUES (
    _user_id,
    _id_afectado,
    _accion,
    _detalle,
    _motivo
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- 5. Trigger para actualizar updated_at en rol_definiciones
CREATE OR REPLACE FUNCTION public.update_rol_definiciones_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_rol_definiciones_updated_at ON public.rol_definiciones;
CREATE TRIGGER trigger_update_rol_definiciones_updated_at
  BEFORE UPDATE ON public.rol_definiciones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_rol_definiciones_updated_at();

-- 6. RLS Policies para rol_definiciones
ALTER TABLE public.rol_definiciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios autenticados pueden leer roles" ON public.rol_definiciones;
CREATE POLICY "Usuarios autenticados pueden leer roles"
  ON public.rol_definiciones FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Solo admin puede modificar roles" ON public.rol_definiciones;
CREATE POLICY "Solo admin puede modificar roles"
  ON public.rol_definiciones FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. RLS Policies para bitacora_acceso
ALTER TABLE public.bitacora_acceso ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios pueden ver su bitácora" ON public.bitacora_acceso;
CREATE POLICY "Usuarios pueden ver su bitácora"
  ON public.bitacora_acceso FOR SELECT
  USING (
    id_usuario_responsable = auth.uid() OR 
    id_usuario_afectado = auth.uid()
  );

DROP POLICY IF EXISTS "Admins pueden ver toda la bitácora" ON public.bitacora_acceso;
CREATE POLICY "Admins pueden ver toda la bitácora"
  ON public.bitacora_acceso FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'direccion') OR
    public.has_role(auth.uid(), 'admin_rrhh')
  );

DROP POLICY IF EXISTS "Sistema puede insertar en bitácora" ON public.bitacora_acceso;
CREATE POLICY "Sistema puede insertar en bitácora"
  ON public.bitacora_acceso FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 8. Actualizar RLS Policies de profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'direccion') OR
    public.has_role(auth.uid(), 'admin_rrhh')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'direccion') OR
    public.has_role(auth.uid(), 'admin_rrhh')
  );

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'direccion') OR
    public.has_role(auth.uid(), 'admin_rrhh')
  );

-- 9. Seed inicial de roles con permisos
INSERT INTO public.rol_definiciones (rol_sistema, descripcion_rol, permisos_json) VALUES
('admin', 'Administrador del Sistema', '{
  "asistencia.ver": true,
  "asistencia.editar": true,
  "asistencia.ver_global": true,
  "liquidacion.ver_todos": true,
  "liquidacion.aprobar": true,
  "liquidacion.pagar": true,
  "clientes.ver_saldos": true,
  "clientes.fusionar": true,
  "clientes.ver_eliminados": true,
  "inventario.ver_global": true,
  "inventario.transferir": true,
  "reportes.estrategicos": true,
  "reportes.productividad": true,
  "usuarios.gestionar": true,
  "configuracion.modificar": true
}'::jsonb),

('direccion', 'Dirección / Dueño', '{
  "asistencia.ver": true,
  "asistencia.editar": true,
  "asistencia.ver_global": true,
  "liquidacion.ver_todos": true,
  "liquidacion.aprobar": true,
  "liquidacion.pagar": true,
  "clientes.ver_saldos": true,
  "clientes.fusionar": true,
  "clientes.ver_eliminados": true,
  "inventario.ver_global": true,
  "inventario.transferir": true,
  "reportes.estrategicos": true,
  "reportes.productividad": true,
  "usuarios.gestionar": true
}'::jsonb),

('admin_rrhh', 'Administrador de RRHH', '{
  "asistencia.ver": true,
  "asistencia.editar": true,
  "asistencia.ver_global": true,
  "liquidacion.ver_todos": true,
  "liquidacion.aprobar": true,
  "liquidacion.pagar": true,
  "clientes.ver_saldos": true,
  "reportes.productividad": true,
  "usuarios.gestionar": true
}'::jsonb),

('gerencia', 'Gerencia', '{
  "asistencia.ver": true,
  "asistencia.editar": true,
  "asistencia.ver_global": true,
  "liquidacion.ver_todos": true,
  "liquidacion.aprobar": true,
  "clientes.ver_saldos": true,
  "clientes.fusionar": true,
  "inventario.ver_global": true,
  "inventario.transferir": true,
  "reportes.productividad": true
}'::jsonb),

('jefe_sucursal', 'Jefe de Sucursal', '{
  "asistencia.ver": true,
  "asistencia.editar": true,
  "asistencia.ver_solo_sucursal": true,
  "liquidacion.ver_sucursal": true,
  "clientes.ver_saldos": true,
  "inventario.ver_sucursal": true,
  "inventario.transferir": true,
  "reportes.productividad": true
}'::jsonb),

('recepcion', 'Recepción', '{
  "asistencia.ver": true,
  "asistencia.ver_solo_sucursal": true,
  "clientes.ver_saldos": true,
  "clientes.editar": true,
  "inventario.ver_sucursal": true
}'::jsonb),

('profesional', 'Profesional / Colaborador', '{
  "asistencia.ver_solo_propio": true,
  "asistencia.marcar_propio": true,
  "liquidacion.ver_solo_propio": true
}'::jsonb),

('colaborador', 'Colaborador', '{
  "asistencia.ver_solo_propio": true,
  "asistencia.marcar_propio": true,
  "liquidacion.ver_solo_propio": true
}'::jsonb)
ON CONFLICT (rol_sistema) DO UPDATE SET
  descripcion_rol = EXCLUDED.descripcion_rol,
  permisos_json = EXCLUDED.permisos_json,
  updated_at = now();

-- 10. Vista para consulta rápida de usuarios con roles
CREATE OR REPLACE VIEW public.vw_usuarios_sistema AS
SELECT 
  p.id,
  p.email,
  p.nombre_completo,
  p.telefono,
  p.id_empleado,
  p.id_sucursal,
  p.activo,
  p.ultimo_login,
  p.created_at,
  s.nombre as sucursal_nombre,
  e.nombre as empleado_nombre,
  e.cargo as empleado_cargo,
  ARRAY_AGG(DISTINCT ur.role) FILTER (WHERE ur.role IS NOT NULL) as roles,
  STRING_AGG(DISTINCT rd.descripcion_rol, ', ') FILTER (WHERE rd.descripcion_rol IS NOT NULL) as roles_descripcion
FROM public.profiles p
LEFT JOIN public.sucursales s ON p.id_sucursal = s.id
LEFT JOIN public.empleados e ON p.id_empleado = e.id
LEFT JOIN public.user_roles ur ON p.id = ur.user_id
LEFT JOIN public.rol_definiciones rd ON ur.role::text = rd.rol_sistema
GROUP BY p.id, p.email, p.nombre_completo, p.telefono, p.id_empleado, 
         p.id_sucursal, p.activo, p.ultimo_login, p.created_at,
         s.nombre, e.nombre, e.cargo;-- ============================================
-- MIGRACIÓN: Sistema de Estados Extendidos de Citas (v7 - RESUELTA)
-- ============================================

-- 1. Eliminar TODAS las vistas
DROP VIEW IF EXISTS vw_no_show_rate CASCADE;
DROP VIEW IF EXISTS vw_ocupacion_cabinas CASCADE;
DROP VIEW IF EXISTS vw_productividad_profesional CASCADE;
DROP VIEW IF EXISTS vw_ingresos_diarios CASCADE;
DROP VIEW IF EXISTS vw_tiempos_ciclo CASCADE;
DROP VIEW IF EXISTS vw_operacion_clinica CASCADE;
DROP VIEW IF EXISTS vw_productividad_empleado CASCADE;
DROP VIEW IF EXISTS vw_resumen_ejecutivo CASCADE;
DROP VIEW IF EXISTS vw_rentabilidad_sucursal CASCADE;
DROP VIEW IF EXISTS vw_comparativo_financiero CASCADE;
DROP VIEW IF EXISTS vw_anticipos_pendientes CASCADE;
DROP VIEW IF EXISTS vw_clientes_ausentes CASCADE;
DROP VIEW IF EXISTS vw_ingresos_diferidos CASCADE;
DROP VIEW IF EXISTS vw_clientes_recompra CASCADE;
DROP VIEW IF EXISTS vw_clientes_no_retenidos CASCADE;
DROP VIEW IF EXISTS vw_clientes_saldos CASCADE;
DROP VIEW IF EXISTS vw_clientes_duplicados CASCADE;
DROP VIEW IF EXISTS vw_clientes_eliminados CASCADE;
DROP VIEW IF EXISTS vw_parametros_activos CASCADE;
DROP VIEW IF EXISTS vw_reporte_caducidad CASCADE;
DROP VIEW IF EXISTS vw_reporte_stock_minimo CASCADE;
DROP VIEW IF EXISTS vw_satisfaccion CASCADE;
DROP VIEW IF EXISTS vw_usuarios_sistema CASCADE;
DROP VIEW IF EXISTS vw_ventas_desglose CASCADE;

-- 2. Eliminar funciones que dependen del enum
DROP FUNCTION IF EXISTS public.validar_transicion_estado(cita_estado_enum, cita_estado_enum);
DROP FUNCTION IF EXISTS public.puede_cambiar_estado_cita(uuid, bigint, cita_estado_enum, cita_estado_enum);

-- 3. Eliminar el valor por defecto
ALTER TABLE public.agendas 
  ALTER COLUMN estado DROP DEFAULT;

-- 4. Renombrar el enum
ALTER TYPE cita_estado_enum RENAME TO cita_estado_enum_old;

-- 5. Crear el nuevo enum
CREATE TYPE cita_estado_enum AS ENUM (
  'reservada',
  'confirmada',
  'llego_paciente',
  'asistida',
  'no_show',
  'cancelada_cliente',
  'cancelada_clinica'
);

-- 6. Actualizar la columna estado en agendas
ALTER TABLE public.agendas 
  ALTER COLUMN estado TYPE cita_estado_enum 
  USING (
    CASE estado::text
      WHEN 'agendada' THEN 'reservada'::cita_estado_enum
      WHEN 'confirmada' THEN 'confirmada'::cita_estado_enum
      WHEN 'presentado' THEN 'llego_paciente'::cita_estado_enum
      WHEN 'completada' THEN 'asistida'::cita_estado_enum
      WHEN 'cancelada' THEN 'cancelada_cliente'::cita_estado_enum
      WHEN 'no_show' THEN 'no_show'::cita_estado_enum
      ELSE 'reservada'::cita_estado_enum
    END
  );

-- 7. Establecer el nuevo valor por defecto
ALTER TABLE public.agendas 
  ALTER COLUMN estado SET DEFAULT 'reservada'::cita_estado_enum;

-- 8. Actualizar el historial de estados
ALTER TABLE public.citas_historial_estado
  ALTER COLUMN estado_anterior TYPE cita_estado_enum
  USING (
    CASE estado_anterior::text
      WHEN 'agendada' THEN 'reservada'::cita_estado_enum
      WHEN 'confirmada' THEN 'confirmada'::cita_estado_enum
      WHEN 'presentado' THEN 'llego_paciente'::cita_estado_enum
      WHEN 'completada' THEN 'asistida'::cita_estado_enum
      WHEN 'cancelada' THEN 'cancelada_cliente'::cita_estado_enum
      WHEN 'no_show' THEN 'no_show'::cita_estado_enum
      ELSE NULL
    END
  );

ALTER TABLE public.citas_historial_estado
  ALTER COLUMN estado_nuevo TYPE cita_estado_enum
  USING (
    CASE estado_nuevo::text
      WHEN 'agendada' THEN 'reservada'::cita_estado_enum
      WHEN 'confirmada' THEN 'confirmada'::cita_estado_enum
      WHEN 'presentado' THEN 'llego_paciente'::cita_estado_enum
      WHEN 'completada' THEN 'asistida'::cita_estado_enum
      WHEN 'cancelada' THEN 'cancelada_cliente'::cita_estado_enum
      WHEN 'no_show' THEN 'no_show'::cita_estado_enum
      ELSE 'reservada'::cita_estado_enum
    END
  );

-- 9. Eliminar el enum antiguo
DROP TYPE cita_estado_enum_old;

-- 10. Agregar nuevos campos
ALTER TABLE public.agendas
  ADD COLUMN IF NOT EXISTS confirmacion_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS checkin_timestamp TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cerrada_por_usuario UUID REFERENCES auth.users(id);

-- 11. Recrear función de validación de transiciones
CREATE OR REPLACE FUNCTION public.validar_transicion_estado(
  estado_actual cita_estado_enum, 
  estado_nuevo cita_estado_enum
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN estado_actual = 'reservada' THEN 
      estado_nuevo IN ('confirmada', 'cancelada_cliente', 'cancelada_clinica', 'no_show')
    WHEN estado_actual = 'confirmada' THEN 
      estado_nuevo IN ('llego_paciente', 'cancelada_cliente', 'cancelada_clinica', 'no_show')
    WHEN estado_actual = 'llego_paciente' THEN 
      estado_nuevo IN ('asistida', 'cancelada_clinica')
    WHEN estado_actual IN ('asistida', 'no_show', 'cancelada_cliente', 'cancelada_clinica') THEN
      FALSE
    ELSE FALSE
  END;
END;
$$;

-- 12. Recrear función de permisos
CREATE OR REPLACE FUNCTION public.puede_cambiar_estado_cita(
  _user_id uuid,
  _cita_id bigint,
  _estado_actual cita_estado_enum,
  _estado_nuevo cita_estado_enum
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _es_admin BOOLEAN;
  _es_gerencia BOOLEAN;
  _es_direccion BOOLEAN;
  _es_admin_rrhh BOOLEAN;
  _es_recepcion BOOLEAN;
  _es_profesional BOOLEAN;
  _empleado_id BIGINT;
  _cita_empleado_id BIGINT;
  _cita_sucursal_id BIGINT;
  _user_sucursal_id BIGINT;
BEGIN
  _es_admin := public.has_role(_user_id, 'admin');
  _es_gerencia := public.has_role(_user_id, 'gerencia');
  _es_direccion := public.has_role(_user_id, 'direccion');
  _es_admin_rrhh := public.has_role(_user_id, 'admin_rrhh');
  _es_recepcion := public.has_role(_user_id, 'recepcion');
  _es_profesional := public.has_role(_user_id, 'profesional');
  
  IF _es_admin OR _es_direccion OR _es_admin_rrhh THEN
    RETURN TRUE;
  END IF;
  
  SELECT id_empleado, id_sucursal 
  INTO _cita_empleado_id, _cita_sucursal_id
  FROM public.agendas
  WHERE id = _cita_id;
  
  SELECT id_sucursal INTO _user_sucursal_id
  FROM public.profiles
  WHERE id = _user_id;
  
  IF _es_gerencia THEN
    IF _user_sucursal_id IS NULL OR _cita_sucursal_id = _user_sucursal_id THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  IF _es_recepcion THEN
    IF _user_sucursal_id IS NOT NULL AND _cita_sucursal_id != _user_sucursal_id THEN
      RETURN FALSE;
    END IF;
    
    IF (_estado_actual = 'reservada' AND _estado_nuevo IN ('confirmada', 'cancelada_cliente', 'cancelada_clinica', 'no_show')) OR
       (_estado_actual = 'confirmada' AND _estado_nuevo IN ('llego_paciente', 'cancelada_cliente', 'cancelada_clinica', 'no_show')) OR
       (_estado_actual = 'llego_paciente' AND _estado_nuevo = 'cancelada_clinica') THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  IF _es_profesional THEN
    SELECT id INTO _empleado_id
    FROM public.empleados
    WHERE email = (SELECT email FROM auth.users WHERE id = _user_id);
    
    IF _empleado_id = _cita_empleado_id THEN
      IF _estado_actual = 'llego_paciente' AND _estado_nuevo = 'asistida' THEN
        RETURN TRUE;
      END IF;
    END IF;
    RETURN FALSE;
  END IF;
  
  RETURN FALSE;
END;
$$;

-- 13. Recrear vw_no_show_rate
CREATE OR REPLACE VIEW vw_no_show_rate AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  COUNT(*) FILTER (WHERE a.estado = 'no_show' AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') as no_shows_90_dias,
  COUNT(*) FILTER (WHERE a.estado IN ('cancelada_cliente', 'cancelada_clinica') AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') as cancelaciones_90_dias,
  COUNT(*) FILTER (WHERE a.fecha >= CURRENT_DATE - INTERVAL '90 days') as total_citas_90_dias,
  CASE
    WHEN COUNT(*) FILTER (WHERE a.estado = 'no_show' AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') >= 2 THEN 'ALTO'
    WHEN COUNT(*) FILTER (WHERE a.estado = 'no_show' AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') = 1 
      OR COUNT(*) FILTER (WHERE a.estado IN ('cancelada_cliente', 'cancelada_clinica') AND a.fecha >= CURRENT_DATE - INTERVAL '90 days') >= 3 THEN 'MEDIO'
    ELSE 'BAJO'
  END as riesgo_no_show
FROM public.clientes c
LEFT JOIN public.agendas a ON a.id_cliente = c.id
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellidos;

-- 14. Recrear vw_ocupacion_cabinas
CREATE OR REPLACE VIEW vw_ocupacion_cabinas AS
SELECT 
  a.fecha,
  a.id_sucursal,
  s.nombre as sucursal_nombre,
  COUNT(*) as total_citas,
  COUNT(*) FILTER (WHERE a.estado = 'asistida') as citas_atendidas,
  COUNT(*) FILTER (WHERE a.estado IN ('cancelada_cliente', 'cancelada_clinica')) as citas_canceladas,
  COUNT(*) FILTER (WHERE a.estado = 'no_show') as no_shows,
  ROUND(COUNT(*) FILTER (WHERE a.estado = 'asistida')::numeric / NULLIF(COUNT(*), 0) * 100, 2) as porcentaje_ocupacion
FROM public.agendas a
JOIN public.sucursales s ON s.id = a.id_sucursal
GROUP BY a.fecha, a.id_sucursal, s.nombre;

-- 15. Recrear vw_tiempos_ciclo
CREATE OR REPLACE VIEW vw_tiempos_ciclo AS
SELECT 
  a.id,
  a.fecha,
  a.id_sucursal,
  a.id_empleado,
  a.id_cliente,
  a.estado,
  a.confirmacion_timestamp,
  a.checkin_timestamp,
  a.check_in_at,
  a.check_out_at,
  CASE 
    WHEN a.checkin_timestamp IS NOT NULL AND a.confirmacion_timestamp IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.checkin_timestamp - a.confirmacion_timestamp)) / 60
    ELSE NULL
  END as minutos_confirmacion_a_llegada,
  CASE 
    WHEN a.check_out_at IS NOT NULL AND a.checkin_timestamp IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (a.check_out_at - a.checkin_timestamp)) / 60
    ELSE NULL
  END as minutos_llegada_a_atencion
FROM public.agendas a
WHERE a.estado IN ('asistida', 'llego_paciente');-- ============================================
-- RECREAR VISTAS ESENCIALES ELIMINADAS
-- ============================================

-- 1. Recrear vw_clientes_saldos
CREATE OR REPLACE VIEW vw_clientes_saldos AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.saldo_favor,
  c.saldo_contra,
  (c.saldo_favor - c.saldo_contra) as saldo_neto,
  c.fecha_ultima_visita
FROM public.clientes c
WHERE c.activo = true;

-- 2. Recrear vw_clientes_duplicados
CREATE OR REPLACE VIEW vw_clientes_duplicados AS
SELECT 
  c1.id AS id_cliente_1,
  c2.id AS id_cliente_2,
  c1.nombre,
  c1.apellidos,
  c1.telefono,
  c1.email,
  c1.fecha_alta AS fecha_alta_1,
  c2.fecha_alta AS fecha_alta_2,
  'telefono' AS criterio_duplicado
FROM public.clientes c1
JOIN public.clientes c2 ON c1.telefono = c2.telefono AND c1.id < c2.id
WHERE c1.activo = true AND c2.activo = true AND c1.telefono IS NOT NULL
UNION ALL
SELECT 
  c1.id AS id_cliente_1,
  c2.id AS id_cliente_2,
  c1.nombre,
  c1.apellidos,
  c1.telefono,
  c1.email,
  c1.fecha_alta AS fecha_alta_1,
  c2.fecha_alta AS fecha_alta_2,
  'email' AS criterio_duplicado
FROM public.clientes c1
JOIN public.clientes c2 ON c1.email = c2.email AND c1.id < c2.id
WHERE c1.activo = true AND c2.activo = true AND c1.email IS NOT NULL;

-- 3. Recrear vw_clientes_eliminados
CREATE OR REPLACE VIEW vw_clientes_eliminados AS
SELECT 
  id,
  id_cliente_original,
  nombre,
  apellidos,
  email,
  telefono,
  fecha_eliminacion,
  motivo_eliminacion,
  usuario_responsable,
  datos_completos
FROM public.clientes_eliminados
ORDER BY fecha_eliminacion DESC;

-- 4. Recrear vw_clientes_ausentes
CREATE OR REPLACE VIEW vw_clientes_ausentes AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  CURRENT_DATE - c.fecha_ultima_visita AS dias_desde_ultima_visita,
  COUNT(a.id) as total_citas_historicas
FROM public.clientes c
LEFT JOIN public.agendas a ON a.id_cliente = c.id
WHERE c.activo = true
  AND c.fecha_ultima_visita < CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita;

-- 5. Recrear vw_clientes_no_retenidos
CREATE OR REPLACE VIEW vw_clientes_no_retenidos AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_alta,
  c.fecha_ultima_visita,
  COUNT(a.id) as total_citas
FROM public.clientes c
LEFT JOIN public.agendas a ON a.id_cliente = c.id
WHERE c.activo = true
  AND c.fecha_alta < CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_alta, c.fecha_ultima_visita
HAVING COUNT(a.id) = 1;

-- 6. Recrear vw_clientes_recompra
CREATE OR REPLACE VIEW vw_clientes_recompra AS
SELECT 
  c.id AS id_cliente,
  c.nombre,
  c.apellidos,
  c.email,
  c.telefono,
  c.fecha_ultima_visita,
  COUNT(a.id) as total_citas,
  COUNT(a.id) FILTER (WHERE a.fecha >= CURRENT_DATE - INTERVAL '30 days') as citas_ultimo_mes,
  COUNT(a.id) FILTER (WHERE a.fecha >= CURRENT_DATE - INTERVAL '90 days') as citas_ultimo_trimestre
FROM public.clientes c
LEFT JOIN public.agendas a ON a.id_cliente = c.id AND a.estado = 'asistida'
WHERE c.activo = true
GROUP BY c.id, c.nombre, c.apellidos, c.email, c.telefono, c.fecha_ultima_visita
HAVING COUNT(a.id) >= 2;

-- 7. Recrear vw_productividad_empleado  
CREATE OR REPLACE VIEW vw_productividad_empleado AS
SELECT 
  e.id AS id_empleado,
  e.nombre || ' ' || COALESCE(e.apellidos, '') AS empleado_nombre,
  e.id_sucursal,
  s.nombre AS sucursal_nombre,
  COUNT(a.id) FILTER (WHERE a.estado = 'asistida' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days') as citas_completadas_mes,
  SUM(ser.precio) FILTER (WHERE a.estado = 'asistida' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days') as ingresos_reconocidos_mxn,
  SUM(ser.duracion_minutos) FILTER (WHERE a.estado = 'asistida' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days') as minutos_productivos,
  ROUND(SUM(ser.duracion_minutos) FILTER (WHERE a.estado = 'asistida' AND a.fecha >= CURRENT_DATE - INTERVAL '30 days') / 60.0, 2) as horas_trabajadas,
  0 as comision_mxn
FROM public.empleados e
LEFT JOIN public.sucursales s ON s.id = e.id_sucursal
LEFT JOIN public.agendas a ON a.id_empleado = e.id
LEFT JOIN public.servicios ser ON ser.id = a.id_servicio
WHERE e.activo = true AND e.es_profesional = true
GROUP BY e.id, e.nombre, e.apellidos, e.id_sucursal, s.nombre;
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
-- Crear enum para tipo de descuento
DO $$ BEGIN
  CREATE TYPE tipo_descuento_enum AS ENUM ('porcentaje', 'monto', 'ninguno');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Renombrar campos existentes si es necesario y agregar los faltantes
DO $$ BEGIN
  ALTER TABLE public.venta_items RENAME COLUMN precio_original TO precio_original_mxn;
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE public.venta_items RENAME COLUMN precio_final TO precio_final_mxn;
EXCEPTION
  WHEN undefined_column THEN null;
  WHEN duplicate_column THEN null;
END $$;

-- Agregar nuevos campos
ALTER TABLE public.venta_items
  ADD COLUMN IF NOT EXISTS descuento_tipo tipo_descuento_enum NOT NULL DEFAULT 'ninguno',
  ADD COLUMN IF NOT EXISTS descuento_valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS codigo_promocion VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notas_descuento TEXT,
  ADD COLUMN IF NOT EXISTS id_empleado BIGINT;

-- Migrar descuento_porcentaje a descuento_tipo/valor si existe la columna
DO $$ BEGIN
  UPDATE public.venta_items
  SET 
    descuento_tipo = CASE 
      WHEN descuento_porcentaje > 0 THEN 'porcentaje'::tipo_descuento_enum 
      ELSE 'ninguno'::tipo_descuento_enum 
    END,
    descuento_valor = COALESCE(descuento_porcentaje, 0)
  WHERE descuento_tipo = 'ninguno';
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- Si no existen los campos renombrados, crearlos
ALTER TABLE public.venta_items
  ADD COLUMN IF NOT EXISTS precio_original_mxn NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.venta_items
  ADD COLUMN IF NOT EXISTS precio_final_mxn NUMERIC(10,2) NOT NULL DEFAULT 0;

-- Actualizar campos si están vacíos
UPDATE public.venta_items
SET precio_original_mxn = COALESCE(precio_unitario, 0)
WHERE precio_original_mxn = 0;

UPDATE public.venta_items
SET precio_final_mxn = COALESCE(precio_unitario, 0)
WHERE precio_final_mxn = 0;

-- Crear índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_venta_items_descuento_tipo ON public.venta_items(descuento_tipo);
CREATE INDEX IF NOT EXISTS idx_venta_items_codigo_promocion ON public.venta_items(codigo_promocion) WHERE codigo_promocion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_venta_items_empleado ON public.venta_items(id_empleado) WHERE id_empleado IS NOT NULL;

-- Crear vista detallada de ventas con descuentos
CREATE OR REPLACE VIEW public.vw_ventas_detalle_descuentos AS
SELECT 
  v.id as id_venta,
  v.fecha as fecha_venta,
  v.id_sucursal,
  s.nombre as sucursal_nombre,
  v.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente_nombre,
  vi.id as id_item,
  vi.id_servicio,
  srv.nombre as servicio_nombre,
  vi.id_empleado,
  e.nombre || ' ' || COALESCE(e.apellidos, '') as profesional_nombre,
  vi.cantidad,
  vi.precio_original_mxn,
  vi.descuento_tipo,
  vi.descuento_valor,
  vi.precio_final_mxn,
  vi.codigo_promocion,
  vi.notas_descuento,
  (vi.precio_original_mxn * vi.cantidad) as subtotal_original_mxn,
  CASE 
    WHEN vi.descuento_tipo = 'porcentaje' THEN 
      ROUND((vi.precio_original_mxn * vi.cantidad * vi.descuento_valor / 100), 2)
    WHEN vi.descuento_tipo = 'monto' THEN 
      (vi.descuento_valor * vi.cantidad)
    ELSE 0
  END as descuento_total_mxn,
  (vi.precio_final_mxn * vi.cantidad) as subtotal_final_mxn,
  CASE 
    WHEN vi.precio_original_mxn > 0 THEN
      ROUND(((vi.precio_original_mxn - vi.precio_final_mxn) / vi.precio_original_mxn * 100), 2)
    ELSE 0
  END as descuento_porcentaje_efectivo,
  cs.nombre as categoria_servicio,
  v.estado_venta,
  v.created_at
FROM public.venta_items vi
INNER JOIN public.ventas v ON vi.id_venta = v.id
LEFT JOIN public.sucursales s ON v.id_sucursal = s.id
LEFT JOIN public.clientes c ON v.id_cliente = c.id
LEFT JOIN public.servicios srv ON vi.id_servicio = srv.id
LEFT JOIN public.empleados e ON vi.id_empleado = e.id
LEFT JOIN public.categoria_servicio cs ON srv.id_categoria = cs.id
WHERE v.estado_venta != 'cancelada';

-- Crear vista de reporte de descuentos agregado
CREATE OR REPLACE VIEW public.vw_reporte_descuentos AS
SELECT 
  fecha_venta::date as fecha,
  id_sucursal,
  sucursal_nombre,
  id_empleado,
  profesional_nombre,
  categoria_servicio,
  codigo_promocion,
  COUNT(DISTINCT id_venta) as num_ventas,
  COUNT(id_item) as num_items,
  SUM(subtotal_original_mxn) as total_original_mxn,
  SUM(descuento_total_mxn) as total_descuento_mxn,
  SUM(subtotal_final_mxn) as total_final_mxn,
  CASE 
    WHEN SUM(subtotal_original_mxn) > 0 THEN
      ROUND((SUM(descuento_total_mxn) / SUM(subtotal_original_mxn) * 100), 2)
    ELSE 0
  END as descuento_promedio_pct
FROM public.vw_ventas_detalle_descuentos
GROUP BY fecha, id_sucursal, sucursal_nombre, id_empleado, profesional_nombre, categoria_servicio, codigo_promocion;

-- Función de validación para descuentos
CREATE OR REPLACE FUNCTION public.validar_descuento_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Validar descuento_valor no negativo
  IF NEW.descuento_valor < 0 THEN
    RAISE EXCEPTION 'El valor del descuento no puede ser negativo';
  END IF;

  -- Validar porcentaje no mayor a 100
  IF NEW.descuento_tipo = 'porcentaje' AND NEW.descuento_valor > 100 THEN
    RAISE EXCEPTION 'El porcentaje de descuento no puede ser mayor a 100';
  END IF;

  -- Validar precio_final_mxn no negativo
  IF NEW.precio_final_mxn < 0 THEN
    RAISE EXCEPTION 'El precio final no puede ser negativo';
  END IF;

  -- Calcular precio_final_mxn si no viene calculado correctamente
  IF NEW.descuento_tipo = 'porcentaje' THEN
    NEW.precio_final_mxn := ROUND(NEW.precio_original_mxn * (1 - NEW.descuento_valor / 100), 2);
  ELSIF NEW.descuento_tipo = 'monto' THEN
    NEW.precio_final_mxn := GREATEST(ROUND(NEW.precio_original_mxn - NEW.descuento_valor, 2), 0);
  ELSE
    NEW.precio_final_mxn := NEW.precio_original_mxn;
  END IF;

  RETURN NEW;
END;
$function$;

-- Crear trigger de validación
DROP TRIGGER IF EXISTS trigger_validar_descuento_item ON public.venta_items;
CREATE TRIGGER trigger_validar_descuento_item
  BEFORE INSERT OR UPDATE ON public.venta_items
  FOR EACH ROW
  EXECUTE FUNCTION public.validar_descuento_item();

-- RLS policies para las vistas
ALTER VIEW public.vw_ventas_detalle_descuentos SET (security_invoker = on);
ALTER VIEW public.vw_reporte_descuentos SET (security_invoker = on);

-- Registrar en bitácora cuando se aplique descuento
CREATE OR REPLACE FUNCTION public.registrar_descuento_bitacora()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.descuento_tipo != 'ninguno' AND (TG_OP = 'INSERT' OR OLD.descuento_valor != NEW.descuento_valor) THEN
    INSERT INTO public.bitacora_accion (
      entidad,
      accion,
      id_entidad,
      usuario,
      detalle_json
    ) VALUES (
      'venta_items',
      CASE WHEN TG_OP = 'INSERT' THEN 'aplicar_descuento_item' ELSE 'editar_descuento_item' END,
      NEW.id,
      auth.uid(),
      jsonb_build_object(
        'id_venta', NEW.id_venta,
        'descuento_tipo', NEW.descuento_tipo,
        'descuento_valor', NEW.descuento_valor,
        'precio_original', NEW.precio_original_mxn,
        'precio_final', NEW.precio_final_mxn,
        'codigo_promocion', NEW.codigo_promocion,
        'notas', NEW.notas_descuento
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_registrar_descuento_bitacora ON public.venta_items;
CREATE TRIGGER trigger_registrar_descuento_bitacora
  AFTER INSERT OR UPDATE ON public.venta_items
  FOR EACH ROW
  EXECUTE FUNCTION public.registrar_descuento_bitacora();

-- Asegurar que comisiones usen precio_final_mxn
COMMENT ON COLUMN public.venta_items.precio_final_mxn IS 'Precio final con IVA incluido después de aplicar descuentos. Base para cálculo de comisiones.';-- Crear enum para estado de anticipos
CREATE TYPE estado_anticipo_enum AS ENUM (
  'registrado',
  'aplicado_parcial', 
  'aplicado_total',
  'reembolsado'
);

-- Crear enum para tipo de movimiento en libro diferidos
CREATE TYPE tipo_movimiento_diferido_enum AS ENUM (
  'alta_anticipo',
  'aplicacion',
  'reembolso',
  'ajuste'
);

-- Tabla de anticipos
CREATE TABLE public.anticipos (
  id bigserial PRIMARY KEY,
  id_cliente bigint NOT NULL REFERENCES public.clientes(id),
  id_sucursal bigint NOT NULL REFERENCES public.sucursales(id),
  monto_mxn numeric(10,2) NOT NULL CHECK (monto_mxn > 0),
  metodo_pago varchar NOT NULL,
  fecha_pago timestamp with time zone NOT NULL DEFAULT now(),
  referencia_pago varchar,
  observacion text,
  estado estado_anticipo_enum NOT NULL DEFAULT 'registrado',
  saldo_disponible_mxn numeric(10,2) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabla de aplicaciones de anticipo
CREATE TABLE public.aplicacion_anticipo (
  id bigserial PRIMARY KEY,
  id_anticipo bigint NOT NULL REFERENCES public.anticipos(id),
  id_venta bigint NOT NULL REFERENCES public.ventas(id),
  monto_aplicado_mxn numeric(10,2) NOT NULL CHECK (monto_aplicado_mxn > 0),
  fecha_aplicacion timestamp with time zone NOT NULL DEFAULT now(),
  usuario_aplico uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla libro de diferidos (pasivo)
CREATE TABLE public.libro_diferidos (
  id bigserial PRIMARY KEY,
  id_sucursal bigint NOT NULL REFERENCES public.sucursales(id),
  id_cliente bigint NOT NULL REFERENCES public.clientes(id),
  tipo tipo_movimiento_diferido_enum NOT NULL,
  monto_mxn numeric(10,2) NOT NULL,
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  id_referencia bigint,
  nota text,
  created_at timestamp with time zone DEFAULT now()
);

-- Tabla libro de ingresos reconocidos
CREATE TABLE public.libro_ingresos (
  id bigserial PRIMARY KEY,
  id_sucursal bigint NOT NULL REFERENCES public.sucursales(id),
  id_cliente bigint NOT NULL REFERENCES public.clientes(id),
  id_venta bigint REFERENCES public.ventas(id),
  monto_mxn numeric(10,2) NOT NULL CHECK (monto_mxn >= 0),
  fecha timestamp with time zone NOT NULL DEFAULT now(),
  id_cita bigint REFERENCES public.agendas(id),
  nota text,
  created_at timestamp with time zone DEFAULT now()
);

-- Índices para mejor performance
CREATE INDEX idx_anticipos_cliente ON public.anticipos(id_cliente);
CREATE INDEX idx_anticipos_sucursal ON public.anticipos(id_sucursal);
CREATE INDEX idx_anticipos_estado ON public.anticipos(estado);
CREATE INDEX idx_anticipos_fecha ON public.anticipos(fecha_pago);

CREATE INDEX idx_aplicacion_anticipo ON public.aplicacion_anticipo(id_anticipo);
CREATE INDEX idx_aplicacion_venta ON public.aplicacion_anticipo(id_venta);

CREATE INDEX idx_libro_diferidos_sucursal ON public.libro_diferidos(id_sucursal);
CREATE INDEX idx_libro_diferidos_cliente ON public.libro_diferidos(id_cliente);
CREATE INDEX idx_libro_diferidos_fecha ON public.libro_diferidos(fecha);

CREATE INDEX idx_libro_ingresos_sucursal ON public.libro_ingresos(id_sucursal);
CREATE INDEX idx_libro_ingresos_venta ON public.libro_ingresos(id_venta);
CREATE INDEX idx_libro_ingresos_fecha ON public.libro_ingresos(fecha);

-- Trigger para actualizar updated_at en anticipos
CREATE TRIGGER update_anticipos_updated_at
  BEFORE UPDATE ON public.anticipos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Vista para anticipos detalle
CREATE OR REPLACE VIEW public.vw_anticipos_detalle AS
SELECT 
  a.id,
  a.id_cliente,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  a.id_sucursal,
  s.nombre as sucursal,
  a.monto_mxn,
  a.saldo_disponible_mxn,
  a.metodo_pago,
  a.fecha_pago,
  a.referencia_pago,
  a.observacion,
  a.estado,
  (CURRENT_DATE - a.fecha_pago::date) as dias_desde_registro,
  (
    SELECT COUNT(*)
    FROM public.aplicacion_anticipo aa
    WHERE aa.id_anticipo = a.id
  ) as num_aplicaciones,
  a.created_at,
  a.updated_at
FROM public.anticipos a
JOIN public.clientes c ON a.id_cliente = c.id
JOIN public.sucursales s ON a.id_sucursal = s.id
ORDER BY a.fecha_pago DESC;

-- Vista para reporte de diferidos
CREATE OR REPLACE VIEW public.vw_reporte_diferidos AS
SELECT 
  ld.id_sucursal,
  s.nombre as sucursal,
  ld.tipo,
  SUM(ld.monto_mxn) as total_monto,
  COUNT(*) as num_movimientos,
  DATE(ld.fecha) as fecha
FROM public.libro_diferidos ld
JOIN public.sucursales s ON ld.id_sucursal = s.id
GROUP BY ld.id_sucursal, s.nombre, ld.tipo, DATE(ld.fecha)
ORDER BY fecha DESC, s.nombre;

-- Vista para pasivo de diferidos por sucursal
CREATE OR REPLACE VIEW public.vw_pasivo_diferidos_sucursal AS
SELECT 
  s.id as id_sucursal,
  s.nombre as sucursal,
  COALESCE(SUM(ld.monto_mxn), 0) as pasivo_total_mxn
FROM public.sucursales s
LEFT JOIN public.libro_diferidos ld ON s.id = ld.id_sucursal
WHERE s.activo = true
GROUP BY s.id, s.nombre
ORDER BY s.nombre;

-- RLS Policies para anticipos
ALTER TABLE public.anticipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer anticipos"
  ON public.anticipos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autorizados pueden crear anticipos"
  ON public.anticipos FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'gerencia') OR
    has_role(auth.uid(), 'recepcion') OR
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Usuarios autorizados pueden actualizar anticipos"
  ON public.anticipos FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'gerencia') OR
    has_role(auth.uid(), 'direccion')
  );

-- RLS Policies para aplicacion_anticipo
ALTER TABLE public.aplicacion_anticipo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer aplicaciones"
  ON public.aplicacion_anticipo FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autorizados pueden crear aplicaciones"
  ON public.aplicacion_anticipo FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'gerencia') OR
    has_role(auth.uid(), 'recepcion') OR
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Usuarios autorizados pueden eliminar aplicaciones"
  ON public.aplicacion_anticipo FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'direccion')
  );

-- RLS Policies para libro_diferidos
ALTER TABLE public.libro_diferidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer libro diferidos"
  ON public.libro_diferidos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede insertar en libro diferidos"
  ON public.libro_diferidos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies para libro_ingresos
ALTER TABLE public.libro_ingresos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer libro ingresos"
  ON public.libro_ingresos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sistema puede insertar en libro ingresos"
  ON public.libro_ingresos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);-- Extender tabla parametros_comision para soportar servicios específicos y auditoría
ALTER TABLE public.parametros_comision
ADD COLUMN IF NOT EXISTS id_servicio BIGINT REFERENCES public.servicios(id),
ADD COLUMN IF NOT EXISTS prioridad SMALLINT NOT NULL DEFAULT 5,
ADD COLUMN IF NOT EXISTS creado_por UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS actualizado_por UUID REFERENCES auth.users(id);

-- Renombrar columnas para consistencia con el prompt
ALTER TABLE public.parametros_comision
RENAME COLUMN vigencia_desde TO fecha_inicio;

ALTER TABLE public.parametros_comision
RENAME COLUMN vigencia_hasta TO fecha_fin;

ALTER TABLE public.parametros_comision
RENAME COLUMN porcentaje_comision TO porcentaje;

-- Crear tabla de bitácora para reglas de comisión
CREATE TABLE IF NOT EXISTS public.bitacora_regla_comision (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_regla BIGINT NOT NULL REFERENCES public.parametros_comision(id),
  accion VARCHAR NOT NULL CHECK (accion IN ('crear', 'actualizar', 'desactivar')),
  usuario_responsable UUID NOT NULL REFERENCES auth.users(id),
  antes_json JSONB,
  despues_json JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para parametros_comision
CREATE INDEX IF NOT EXISTS idx_parametros_comision_lookup 
ON public.parametros_comision(id_empleado, id_servicio, id_categoria_servicio, fecha_inicio, fecha_fin, activo);

-- Función para calcular prioridad automáticamente
CREATE OR REPLACE FUNCTION public.calcular_prioridad_comision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Empleado + Servicio = 1
  IF NEW.id_empleado IS NOT NULL AND NEW.id_servicio IS NOT NULL THEN
    NEW.prioridad := 1;
  -- Empleado + Categoría = 2
  ELSIF NEW.id_empleado IS NOT NULL AND NEW.id_categoria_servicio IS NOT NULL THEN
    NEW.prioridad := 2;
  -- Empleado genérica = 3
  ELSIF NEW.id_empleado IS NOT NULL AND NEW.id_servicio IS NULL AND NEW.id_categoria_servicio IS NULL THEN
    NEW.prioridad := 3;
  -- Genérica por Servicio = 4
  ELSIF NEW.id_empleado IS NULL AND NEW.id_servicio IS NOT NULL THEN
    NEW.prioridad := 4;
  -- Genérica por Categoría = 5
  ELSIF NEW.id_empleado IS NULL AND NEW.id_categoria_servicio IS NOT NULL THEN
    NEW.prioridad := 5;
  ELSE
    RAISE EXCEPTION 'Configuración inválida de regla de comisión';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para calcular prioridad antes de insertar/actualizar
DROP TRIGGER IF EXISTS trg_calcular_prioridad_comision ON public.parametros_comision;
CREATE TRIGGER trg_calcular_prioridad_comision
BEFORE INSERT OR UPDATE ON public.parametros_comision
FOR EACH ROW
EXECUTE FUNCTION public.calcular_prioridad_comision();

-- Función para validar no solapamiento de vigencias
CREATE OR REPLACE FUNCTION public.validar_no_solape_comision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  -- Construir la llave lógica según la especificidad
  SELECT COUNT(*)
  INTO v_count
  FROM public.parametros_comision
  WHERE id != COALESCE(NEW.id, -1)
    AND activo = true
    AND (
      -- Misma llave lógica
      (COALESCE(id_empleado, -1) = COALESCE(NEW.id_empleado, -1) 
       AND COALESCE(id_servicio, -1) = COALESCE(NEW.id_servicio, -1)
       AND (NEW.id_servicio IS NOT NULL OR COALESCE(id_categoria_servicio, -1) = COALESCE(NEW.id_categoria_servicio, -1)))
    )
    AND (
      -- Rango se solapa
      (NEW.fecha_inicio <= COALESCE(fecha_fin, '9999-12-31'::date))
      AND (COALESCE(NEW.fecha_fin, '9999-12-31'::date) >= fecha_inicio)
    );
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Ya existe una regla activa con la misma configuración en el rango de fechas especificado';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger para validar no solapamiento
DROP TRIGGER IF EXISTS trg_validar_no_solape_comision ON public.parametros_comision;
CREATE TRIGGER trg_validar_no_solape_comision
BEFORE INSERT OR UPDATE ON public.parametros_comision
FOR EACH ROW
EXECUTE FUNCTION public.validar_no_solape_comision();

-- Función para auditar cambios en reglas
CREATE OR REPLACE FUNCTION public.auditar_regla_comision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accion VARCHAR;
  v_antes JSONB;
  v_despues JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_accion := 'crear';
    v_antes := NULL;
    v_despues := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.activo = false AND OLD.activo = true THEN
      v_accion := 'desactivar';
    ELSE
      v_accion := 'actualizar';
    END IF;
    v_antes := to_jsonb(OLD);
    v_despues := to_jsonb(NEW);
  END IF;
  
  INSERT INTO public.bitacora_regla_comision (
    id_regla,
    accion,
    usuario_responsable,
    antes_json,
    despues_json
  ) VALUES (
    NEW.id,
    v_accion,
    COALESCE(NEW.actualizado_por, NEW.creado_por, auth.uid()),
    v_antes,
    v_despues
  );
  
  RETURN NEW;
END;
$$;

-- Trigger para auditoría
DROP TRIGGER IF EXISTS trg_auditar_regla_comision ON public.parametros_comision;
CREATE TRIGGER trg_auditar_regla_comision
AFTER INSERT OR UPDATE ON public.parametros_comision
FOR EACH ROW
EXECUTE FUNCTION public.auditar_regla_comision();

-- RLS para bitacora_regla_comision
ALTER TABLE public.bitacora_regla_comision ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios con permisos pueden leer bitácora de reglas"
ON public.bitacora_regla_comision
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'direccion') OR 
  has_role(auth.uid(), 'admin_rrhh')
);

-- Función para resolver regla de comisión aplicable
CREATE OR REPLACE FUNCTION public.resolver_regla_comision(
  _id_empleado BIGINT,
  _id_servicio BIGINT,
  _id_categoria BIGINT,
  _fecha DATE
)
RETURNS TABLE (
  id_regla BIGINT,
  porcentaje NUMERIC,
  prioridad SMALLINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.porcentaje,
    pc.prioridad
  FROM public.parametros_comision pc
  WHERE pc.activo = true
    AND pc.fecha_inicio <= _fecha
    AND (pc.fecha_fin IS NULL OR pc.fecha_fin >= _fecha)
    AND (
      -- Empleado + Servicio (prioridad 1)
      (pc.id_empleado = _id_empleado AND pc.id_servicio = _id_servicio)
      OR
      -- Empleado + Categoría (prioridad 2)
      (pc.id_empleado = _id_empleado AND pc.id_servicio IS NULL AND pc.id_categoria_servicio = _id_categoria)
      OR
      -- Empleado genérica (prioridad 3)
      (pc.id_empleado = _id_empleado AND pc.id_servicio IS NULL AND pc.id_categoria_servicio IS NULL)
      OR
      -- Genérica por Servicio (prioridad 4)
      (pc.id_empleado IS NULL AND pc.id_servicio = _id_servicio)
      OR
      -- Genérica por Categoría (prioridad 5)
      (pc.id_empleado IS NULL AND pc.id_servicio IS NULL AND pc.id_categoria_servicio = _id_categoria)
    )
  ORDER BY 
    pc.prioridad ASC,
    pc.fecha_inicio DESC
  LIMIT 1;
END;
$$;-- Agregar columnas para el sistema POS en la tabla ventas
ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'borrador',
ADD COLUMN IF NOT EXISTS origen VARCHAR(50) DEFAULT 'pos_manual',
ADD COLUMN IF NOT EXISTS observacion TEXT,
ADD COLUMN IF NOT EXISTS monto_original_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_descuento_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_final_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS anticipo_aplicado_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pagado_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_pendiente_mxn NUMERIC(10,2) DEFAULT 0;

-- Crear tabla venta_items si no existe
CREATE TABLE IF NOT EXISTS public.venta_items (
  id BIGSERIAL PRIMARY KEY,
  id_venta BIGINT NOT NULL REFERENCES public.ventas(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('servicio', 'producto')),
  id_servicio BIGINT REFERENCES public.servicios(id),
  id_producto BIGINT REFERENCES public.productos_inventario(id),
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  precio_original_mxn NUMERIC(10,2) NOT NULL,
  descuento_tipo VARCHAR(20) NOT NULL DEFAULT 'ninguno' CHECK (descuento_tipo IN ('porcentaje', 'monto', 'ninguno')),
  descuento_valor NUMERIC(10,2) DEFAULT 0,
  precio_final_mxn NUMERIC(10,2) NOT NULL,
  subtotal_final_mxn NUMERIC(10,2) NOT NULL,
  codigo_promocion VARCHAR(50),
  notas_descuento TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS en venta_items
ALTER TABLE public.venta_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para venta_items
CREATE POLICY "Usuarios autenticados pueden leer items"
  ON public.venta_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear items"
  ON public.venta_items FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar items"
  ON public.venta_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden eliminar items"
  ON public.venta_items FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_venta_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_venta_items_updated_at
  BEFORE UPDATE ON public.venta_items
  FOR EACH ROW
  EXECUTE FUNCTION update_venta_items_updated_at();-- Agregar columnas para el sistema POS en la tabla ventas
ALTER TABLE public.ventas 
ADD COLUMN IF NOT EXISTS estado VARCHAR(50) DEFAULT 'borrador',
ADD COLUMN IF NOT EXISTS origen VARCHAR(50) DEFAULT 'pos_manual',
ADD COLUMN IF NOT EXISTS observacion TEXT,
ADD COLUMN IF NOT EXISTS monto_original_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_descuento_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS monto_final_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS anticipo_aplicado_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_pagado_mxn NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS saldo_pendiente_mxn NUMERIC(10,2) DEFAULT 0;-- Fix check constraint to allow borrador, cerrada, anulada states
ALTER TABLE public.ventas 
DROP CONSTRAINT IF EXISTS ventas_estado_venta_check;

ALTER TABLE public.ventas
ADD CONSTRAINT ventas_estado_venta_check 
CHECK (estado IN ('borrador', 'cerrada', 'anulada'));-- Parte 1: Agregar valores al enum (debe ejecutarse primero)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='agendada'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'agendada';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='confirmada'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'confirmada';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='en_atencion'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'en_atencion';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='finalizada'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'finalizada';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='cancelada'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'cancelada';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid
    WHERE t.typname='cita_estado_enum' AND e.enumlabel='no_asiste'
  ) THEN
    ALTER TYPE cita_estado_enum ADD VALUE 'no_asiste';
  END IF;
END $$;-- 1) DEFAULT en agendas.estado
ALTER TABLE agendas
  ALTER COLUMN estado SET DEFAULT 'agendada'::cita_estado_enum;

-- 2) Backfill nulos
UPDATE agendas
SET estado = 'agendada'
WHERE estado IS NULL;

-- 3) Trigger de transiciones válidas
CREATE OR REPLACE FUNCTION fn_cita_transicion_valida()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado = OLD.estado THEN
    RETURN NEW; -- idempotente
  END IF;

  IF OLD.estado = 'agendada' AND NEW.estado IN ('confirmada','cancelada') THEN
    RETURN NEW;
  ELSIF OLD.estado = 'confirmada' AND NEW.estado IN ('en_atencion','cancelada','no_asiste') THEN
    RETURN NEW;
  ELSIF OLD.estado = 'en_atencion' AND NEW.estado IN ('finalizada') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Transición inválida de % a % para cita %', OLD.estado, NEW.estado, NEW.id;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_cita_transicion_valida ON agendas;
CREATE TRIGGER trg_cita_transicion_valida
BEFORE UPDATE ON agendas
FOR EACH ROW
WHEN (OLD.estado IS DISTINCT FROM NEW.estado)
EXECUTE FUNCTION fn_cita_transicion_valida();

-- 4) Agregar columna id_cita a ventas si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ventas'
    AND column_name = 'id_cita'
  ) THEN
    ALTER TABLE ventas ADD COLUMN id_cita BIGINT;
    ALTER TABLE ventas ADD CONSTRAINT fk_ventas_cita FOREIGN KEY (id_cita) REFERENCES agendas(id);
  END IF;
END $$;

-- 5) Idempotencia de ventas por cita
CREATE UNIQUE INDEX IF NOT EXISTS ux_ventas_id_cita ON ventas(id_cita) WHERE id_cita IS NOT NULL;-- Actualizar función actualizar_fecha_ultima_visita para usar nuevos estados
CREATE OR REPLACE FUNCTION public.actualizar_fecha_ultima_visita()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estado IN ('finalizada', 'en_atencion') THEN
    UPDATE public.clientes
    SET fecha_ultima_visita = NEW.fecha
    WHERE id = NEW.id_cliente
      AND (fecha_ultima_visita IS NULL OR fecha_ultima_visita < NEW.fecha);
  END IF;
  RETURN NEW;
END;
$$;

-- Actualizar función validar_cambio_estado para usar nuevos estados
CREATE OR REPLACE FUNCTION public.validar_cambio_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Validación básica: permitir cualquier transición desde los estados antiguos para migración
    IF OLD.estado IN ('reservada', 'presentado', 'completada', 'no_show', 'cancelada_cliente', 'cancelada_clinica') THEN
      -- Permitir transición desde estados antiguos a nuevos
      RETURN NEW;
    END IF;
    
    -- Si cambia a 'en_atencion', registrar check_in
    IF NEW.estado = 'en_atencion' AND NEW.check_in_at IS NULL THEN
      NEW.check_in_at := now();
    END IF;
    
    -- Si cambia a 'finalizada', registrar check_out
    IF NEW.estado = 'finalizada' AND NEW.check_out_at IS NULL THEN
      NEW.check_out_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Eliminar el trigger antiguo de validación para evitar conflictos con el nuevo
DROP TRIGGER IF EXISTS trigger_validar_transicion ON public.agendas;-- Habilitar realtime para la tabla ventas
ALTER TABLE public.ventas REPLICA IDENTITY FULL;

-- Crear vista de ventas con desglose si no existe
CREATE OR REPLACE VIEW public.vw_ventas_desglose AS
SELECT 
  v.id,
  v.fecha,
  v.total,
  v.estado_venta,
  v.monto_original_mxn as total_precio_original,
  v.monto_descuento_mxn as descuento,
  v.monto_final_mxn,
  COALESCE(v.monto_descuento_mxn * 100.0 / NULLIF(v.monto_original_mxn, 0), 0) as promedio_descuento_porcentaje,
  c.nombre || ' ' || COALESCE(c.apellidos, '') as cliente,
  s.nombre as sucursal,
  v.id_sucursal,
  v.id_cliente,
  COALESCE(
    (SELECT string_agg(DISTINCT p.metodo_pago, ', ')
     FROM pagos p
     WHERE p.id_venta = v.id AND p.aplicado_a_venta = true),
    'Sin pago'
  ) as metodos_pago
FROM public.ventas v
LEFT JOIN public.clientes c ON v.id_cliente = c.id
LEFT JOIN public.sucursales s ON v.id_sucursal = s.id
WHERE v.estado_venta IN ('cerrada', 'Completada')
ORDER BY v.fecha DESC;-- Agregar tabla ventas a la publicación de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.ventas;-- Eliminar el trigger y función con CASCADE
DROP FUNCTION IF EXISTS update_venta_items_updated_at() CASCADE;

-- Agregar columna updated_at si no existe
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Recrear la función y trigger correctamente  
CREATE OR REPLACE FUNCTION update_venta_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_venta_items_updated_at_trigger
BEFORE UPDATE ON venta_items
FOR EACH ROW
EXECUTE FUNCTION update_venta_items_updated_at();-- ============================================
-- CRM + AUTOMATION SYSTEM DATABASE SCHEMA
-- ============================================

-- 1. Leads Table (CRM lightweight)
CREATE TABLE IF NOT EXISTS public.leads (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  canal_origen VARCHAR(50),
  pipeline_stage VARCHAR(100) DEFAULT 'lead_nuevo',
  cita_id BIGINT REFERENCES public.agendas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Lead Tags Junction Table
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

-- 4. Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Webhook Configurations Table
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  eventos JSONB NOT NULL DEFAULT '[]',
  headers JSONB DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Webhook Logs Table
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  webhook_config_id BIGINT REFERENCES public.webhook_configs(id) ON DELETE SET NULL,
  evento VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  permisos JSONB NOT NULL DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 8. Automation Logs Table
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id BIGSERIAL PRIMARY KEY,
  automation_rule_id BIGINT REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  trigger_event VARCHAR(100) NOT NULL,
  trigger_data JSONB,
  actions_executed JSONB,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Add missing columns to agendas table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agendas' AND column_name='origen') THEN
    ALTER TABLE public.agendas ADD COLUMN origen VARCHAR(50) DEFAULT 'manual';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agendas' AND column_name='google_event_id') THEN
    ALTER TABLE public.agendas ADD COLUMN google_event_id VARCHAR(255);
  END IF;
END $$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_telefono ON public.leads(telefono);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON public.lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag_id ON public.lead_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_agendas_origen ON public.agendas(origen);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON public.webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Usuarios autenticados pueden leer leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (true);

-- Tags policies
CREATE POLICY "Usuarios autenticados pueden leer tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin puede gestionar tags"
  ON public.tags FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Lead tags policies
CREATE POLICY "Usuarios autenticados pueden leer lead_tags"
  ON public.lead_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar lead_tags"
  ON public.lead_tags FOR ALL
  TO authenticated
  USING (true);

-- Automation rules policies
CREATE POLICY "Usuarios autenticados pueden leer automation_rules"
  ON public.automation_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin puede gestionar automation_rules"
  ON public.automation_rules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Webhook configs policies
CREATE POLICY "Admin puede gestionar webhook_configs"
  ON public.webhook_configs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Webhook logs policies (read only)
CREATE POLICY "Usuarios autenticados pueden leer webhook_logs"
  ON public.webhook_logs FOR SELECT
  TO authenticated
  USING (true);

-- API keys policies (admin only)
CREATE POLICY "Admin puede gestionar api_keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Automation logs policies (read only)
CREATE POLICY "Usuarios autenticados pueden leer automation_logs"
  ON public.automation_logs FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default tags
INSERT INTO public.tags (nombre, descripcion, color) VALUES
  ('confirmado', 'Cita confirmada por el paciente', '#10b981'),
  ('pendiente', 'Esperando confirmación', '#f59e0b'),
  ('interesado', 'Mostró interés en agendar', '#3b82f6'),
  ('no_contactado', 'No se ha logrado contactar', '#6b7280'),
  ('cancelado', 'Canceló la cita', '#ef4444')
ON CONFLICT (nombre) DO NOTHING;

-- Insert default pipeline stages as automation rule examples
INSERT INTO public.automation_rules (nombre, trigger_type, trigger_config, actions, activo) VALUES
  (
    'Auto-confirmar cita cuando se agrega tag confirmado',
    'on_tag_added',
    '{"tag": "confirmado"}',
    '[{"type": "update_appointment", "estado": "confirmada"}]',
    true
  ),
  (
    'Mover lead a etapa confirmada cuando cita es confirmada',
    'on_appointment_confirmed',
    '{}',
    '[{"type": "update_lead_stage", "stage": "cita_confirmada"}, {"type": "add_tag", "tag": "confirmado"}]',
    true
  )
ON CONFLICT DO NOTHING;-- Crear tabla para bloqueos de agenda
CREATE TABLE public.bloqueos_agenda (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  id_empleado BIGINT REFERENCES public.empleados(id),
  id_sucursal BIGINT NOT NULL REFERENCES public.sucursales(id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  motivo TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_bloqueos_fecha ON public.bloqueos_agenda(fecha);
CREATE INDEX idx_bloqueos_empleado ON public.bloqueos_agenda(id_empleado);
CREATE INDEX idx_bloqueos_sucursal ON public.bloqueos_agenda(id_sucursal);

-- Enable RLS
ALTER TABLE public.bloqueos_agenda ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer bloqueos"
ON public.bloqueos_agenda
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden crear bloqueos"
ON public.bloqueos_agenda
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden actualizar bloqueos"
ON public.bloqueos_agenda
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados pueden eliminar bloqueos"
ON public.bloqueos_agenda
FOR DELETE
USING (auth.uid() IS NOT NULL);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_bloqueos_agenda_updated_at
BEFORE UPDATE ON public.bloqueos_agenda
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();-- Crear función para registrar comisión automáticamente
CREATE OR REPLACE FUNCTION public.registrar_comision_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_item RECORD;
  v_regla RECORD;
  v_id_empleado BIGINT;
  v_id_servicio BIGINT;
  v_id_categoria BIGINT;
  v_base_mxn NUMERIC;
  v_porcentaje NUMERIC;
  v_comision_mxn NUMERIC;
  v_fecha_ingreso DATE;
BEGIN
  -- Obtener la fecha del ingreso
  v_fecha_ingreso := NEW.fecha::date;
  
  -- Si el ingreso viene de una venta, procesar sus items
  IF NEW.id_venta IS NOT NULL THEN
    FOR v_item IN 
      SELECT 
        vi.id,
        vi.id_servicio,
        vi.id_empleado,
        vi.precio_final_mxn,
        vi.cantidad,
        s.id_categoria
      FROM venta_items vi
      LEFT JOIN servicios s ON s.id = vi.id_servicio
      WHERE vi.id_venta = NEW.id_venta
    LOOP
      -- Determinar empleado: del item o de la cita
      v_id_empleado := v_item.id_empleado;
      IF v_id_empleado IS NULL AND NEW.id_cita IS NOT NULL THEN
        SELECT id_empleado INTO v_id_empleado
        FROM agendas
        WHERE id = NEW.id_cita;
      END IF;
      
      -- Si no hay empleado asignado, no se puede calcular comisión
      CONTINUE WHEN v_id_empleado IS NULL;
      
      v_id_servicio := v_item.id_servicio;
      v_id_categoria := v_item.id_categoria;
      v_base_mxn := v_item.precio_final_mxn * v_item.cantidad;
      
      -- Resolver regla de comisión aplicable
      SELECT * INTO v_regla
      FROM resolver_regla_comision(
        v_id_empleado,
        v_id_servicio,
        v_id_categoria,
        v_fecha_ingreso
      );
      
      -- Si hay regla aplicable, calcular comisión
      IF FOUND THEN
        v_porcentaje := v_regla.porcentaje;
        v_comision_mxn := ROUND((v_base_mxn * v_porcentaje / 100)::numeric, 2);
        
        -- Insertar registro de comisión
        INSERT INTO comisiones (
          id_empleado,
          id_venta,
          id_venta_item,
          id_categoria_servicio,
          id_sucursal,
          monto_base,
          porcentaje_comision,
          monto_comision,
          periodo_inicio,
          periodo_fin,
          estado,
          notas
        ) VALUES (
          v_id_empleado,
          NEW.id_venta,
          v_item.id,
          v_id_categoria,
          NEW.id_sucursal,
          v_base_mxn,
          v_porcentaje,
          v_comision_mxn,
          v_fecha_ingreso,
          v_fecha_ingreso,
          'pendiente',
          'Comisión generada automáticamente - Regla ID: ' || v_regla.id_regla
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear trigger en libro_ingresos
DROP TRIGGER IF EXISTS trigger_registrar_comision_automatica ON libro_ingresos;
CREATE TRIGGER trigger_registrar_comision_automatica
  AFTER INSERT ON libro_ingresos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_comision_automatica();

COMMENT ON FUNCTION registrar_comision_automatica() IS 'Registra automáticamente comisiones cuando se reconoce un ingreso basándose en las reglas de comisión vigentes';-- Limpiar y consolidar políticas RLS duplicadas en venta_items
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
COMMENT ON POLICY "Usuarios autenticados pueden eliminar items" ON venta_items IS 'Permite a usuarios autenticados eliminar items de venta';-- Mejorar el trigger para manejar casos donde precio_final_mxn es NULL
CREATE OR REPLACE FUNCTION public.registrar_comision_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_item RECORD;
  v_regla RECORD;
  v_id_empleado BIGINT;
  v_id_servicio BIGINT;
  v_id_categoria BIGINT;
  v_base_mxn NUMERIC;
  v_porcentaje NUMERIC;
  v_comision_mxn NUMERIC;
  v_fecha_ingreso DATE;
  v_precio_final NUMERIC;
BEGIN
  -- Obtener la fecha del ingreso
  v_fecha_ingreso := NEW.fecha::date;
  
  -- Si el ingreso viene de una venta, procesar sus items
  IF NEW.id_venta IS NOT NULL THEN
    FOR v_item IN 
      SELECT 
        vi.id,
        vi.id_servicio,
        vi.id_empleado,
        vi.precio_final_mxn,
        vi.precio_unitario,
        vi.cantidad,
        s.id_categoria
      FROM venta_items vi
      LEFT JOIN servicios s ON s.id = vi.id_servicio
      WHERE vi.id_venta = NEW.id_venta
    LOOP
      -- Determinar empleado: del item o de la cita
      v_id_empleado := v_item.id_empleado;
      IF v_id_empleado IS NULL AND NEW.id_cita IS NOT NULL THEN
        SELECT id_empleado INTO v_id_empleado
        FROM agendas
        WHERE id = NEW.id_cita;
      END IF;
      
      -- Si no hay empleado asignado, no se puede calcular comisión
      CONTINUE WHEN v_id_empleado IS NULL;
      
      v_id_servicio := v_item.id_servicio;
      v_id_categoria := v_item.id_categoria;
      
      -- Usar precio_final_mxn si existe, sino usar precio_unitario
      v_precio_final := COALESCE(v_item.precio_final_mxn, v_item.precio_unitario);
      v_base_mxn := v_precio_final * COALESCE(v_item.cantidad, 1);
      
      -- Resolver regla de comisión aplicable
      SELECT * INTO v_regla
      FROM resolver_regla_comision(
        v_id_empleado,
        v_id_servicio,
        v_id_categoria,
        v_fecha_ingreso
      );
      
      -- Si hay regla aplicable, calcular comisión
      IF FOUND THEN
        v_porcentaje := v_regla.porcentaje;
        v_comision_mxn := ROUND((v_base_mxn * v_porcentaje / 100)::numeric, 2);
        
        -- Insertar registro de comisión
        INSERT INTO comisiones (
          id_empleado,
          id_venta,
          id_venta_item,
          id_categoria_servicio,
          id_sucursal,
          monto_base,
          porcentaje_comision,
          monto_comision,
          periodo_inicio,
          periodo_fin,
          estado,
          notas
        ) VALUES (
          v_id_empleado,
          NEW.id_venta,
          v_item.id,
          v_id_categoria,
          NEW.id_sucursal,
          v_base_mxn,
          v_porcentaje,
          v_comision_mxn,
          v_fecha_ingreso,
          v_fecha_ingreso,
          'pendiente',
          'Comisión generada automáticamente - Regla ID: ' || v_regla.id_regla
        );
        
        RAISE NOTICE 'Comisión generada: empleado=%, monto=%, porcentaje=%', v_id_empleado, v_comision_mxn, v_porcentaje;
      ELSE
        RAISE NOTICE 'No se encontró regla de comisión para: empleado=%, servicio=%, categoria=%, fecha=%', 
          v_id_empleado, v_id_servicio, v_id_categoria, v_fecha_ingreso;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION registrar_comision_automatica() IS 'Registra automáticamente comisiones cuando se reconoce un ingreso. Maneja precio_final_mxn NULL usando precio_unitario como fallback';-- Crear tabla facturacion_detalle
CREATE TABLE IF NOT EXISTS public.facturacion_detalle (
  id BIGSERIAL PRIMARY KEY,
  id_factura VARCHAR NOT NULL,
  fecha DATE NOT NULL,
  cliente VARCHAR NOT NULL,
  sucursal VARCHAR NOT NULL,
  profesional VARCHAR,
  tipo VARCHAR NOT NULL,
  descripcion TEXT,
  precio_unitario_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  cantidad NUMERIC(10,2) NOT NULL DEFAULT 1,
  impuesto_mxn NUMERIC(10,2) DEFAULT 0,
  responsabilidad_paquete_mxn NUMERIC(10,2) DEFAULT 0,
  monto_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  cantidad_extra NUMERIC(10,2) DEFAULT 0,
  impuesto_extra_mxn NUMERIC(10,2) DEFAULT 0,
  responsabilidad_paquete_total_mxn NUMERIC(10,2) DEFAULT 0,
  monto_total_mxn NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_id_factura ON public.facturacion_detalle(id_factura);
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_fecha ON public.facturacion_detalle(fecha);
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_cliente ON public.facturacion_detalle(cliente);
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_sucursal ON public.facturacion_detalle(sucursal);
CREATE INDEX IF NOT EXISTS idx_facturacion_detalle_tipo ON public.facturacion_detalle(tipo);

-- Habilitar RLS
ALTER TABLE public.facturacion_detalle ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Usuarios autenticados pueden leer
CREATE POLICY "Usuarios autenticados pueden leer facturacion_detalle"
  ON public.facturacion_detalle
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Políticas RLS: Admin y gerencia pueden insertar
CREATE POLICY "Admin y gerencia pueden crear facturacion_detalle"
  ON public.facturacion_detalle
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR
    has_role(auth.uid(), 'direccion'::app_role)
  );

-- Políticas RLS: Admin y gerencia pueden actualizar
CREATE POLICY "Admin y gerencia pueden actualizar facturacion_detalle"
  ON public.facturacion_detalle
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR
    has_role(auth.uid(), 'direccion'::app_role)
  );

-- Políticas RLS: Solo admin puede eliminar
CREATE POLICY "Solo admin puede eliminar facturacion_detalle"
  ON public.facturacion_detalle
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_facturacion_detalle_updated_at
  BEFORE UPDATE ON public.facturacion_detalle
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();-- Create clientes_inactivos table
CREATE TABLE IF NOT EXISTS public.clientes_inactivos (
  id BIGSERIAL PRIMARY KEY,
  profesional VARCHAR(255) NOT NULL,
  cliente VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  numero_sms VARCHAR(50),
  telefono VARCHAR(50),
  ultima_cita TIMESTAMP,
  dias_sin_volver INTEGER,
  ultimo_servicio VARCHAR(255),
  estado VARCHAR(100),
  gasto_total_mxn NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_clientes_inactivos_profesional ON public.clientes_inactivos(profesional);
CREATE INDEX idx_clientes_inactivos_dias_sin_volver ON public.clientes_inactivos(dias_sin_volver);
CREATE INDEX idx_clientes_inactivos_ultima_cita ON public.clientes_inactivos(ultima_cita);
CREATE INDEX idx_clientes_inactivos_cliente ON public.clientes_inactivos(cliente);

-- Enable RLS
ALTER TABLE public.clientes_inactivos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Usuarios autenticados pueden leer clientes inactivos"
  ON public.clientes_inactivos
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y gerencia pueden crear clientes inactivos"
  ON public.clientes_inactivos
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar clientes inactivos"
  ON public.clientes_inactivos
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar clientes inactivos"
  ON public.clientes_inactivos
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_clientes_inactivos_updated_at
  BEFORE UPDATE ON public.clientes_inactivos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();-- Crear tabla para citas canceladas
CREATE TABLE IF NOT EXISTS public.citas_canceladas (
  id BIGSERIAL PRIMARY KEY,
  fecha_cita DATE NOT NULL,
  cliente VARCHAR NOT NULL,
  email VARCHAR,
  telefono VARCHAR,
  numero_sms VARCHAR,
  sucursal VARCHAR NOT NULL,
  estado VARCHAR,
  fecha_creacion TIMESTAMP,
  staff_registro VARCHAR,
  hora_inicio TIME,
  hora_fin TIME,
  profesional VARCHAR,
  servicio VARCHAR,
  equipo VARCHAR,
  retenido BOOLEAN DEFAULT false,
  reagendado BOOLEAN DEFAULT false,
  facturado BOOLEAN DEFAULT false,
  valor_mxn NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear índices para mejorar búsquedas
CREATE INDEX idx_citas_canceladas_fecha ON public.citas_canceladas(fecha_cita);
CREATE INDEX idx_citas_canceladas_sucursal ON public.citas_canceladas(sucursal);
CREATE INDEX idx_citas_canceladas_profesional ON public.citas_canceladas(profesional);
CREATE INDEX idx_citas_canceladas_cliente ON public.citas_canceladas(cliente);
CREATE INDEX idx_citas_canceladas_estado ON public.citas_canceladas(estado);

-- Habilitar RLS
ALTER TABLE public.citas_canceladas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer citas canceladas"
  ON public.citas_canceladas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear citas canceladas"
  ON public.citas_canceladas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar citas canceladas"
  ON public.citas_canceladas
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar citas canceladas"
  ON public.citas_canceladas
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para updated_at
CREATE TRIGGER update_citas_canceladas_updated_at
  BEFORE UPDATE ON public.citas_canceladas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();-- Crear tabla para gasto de clientes por periodo
CREATE TABLE IF NOT EXISTS public.gasto_clientes_periodo (
  id BIGSERIAL PRIMARY KEY,
  cliente VARCHAR NOT NULL,
  email VARCHAR,
  telefono VARCHAR,
  numero_sms VARCHAR,
  visitas_registradas INTEGER DEFAULT 0,
  cantidad_citas INTEGER DEFAULT 0,
  valor_citas_mxn NUMERIC(10,2) DEFAULT 0,
  monto_servicios_facturados_mxn NUMERIC(10,2) DEFAULT 0,
  monto_productos_facturados_mxn NUMERIC(10,2) DEFAULT 0,
  monto_descuentos_mxn NUMERIC(10,2) DEFAULT 0,
  monto_facturado_total_mxn NUMERIC(10,2) DEFAULT 0,
  cantidad_grupos_citas INTEGER DEFAULT 0,
  cantidad_citas_periodo INTEGER DEFAULT 0,
  valor_citas_periodo_mxn NUMERIC(10,2) DEFAULT 0,
  monto_servicios_facturados_periodo_mxn NUMERIC(10,2) DEFAULT 0,
  cargo_adicional_mxn NUMERIC(10,2) DEFAULT 0,
  descuento_periodo_mxn NUMERIC(10,2) DEFAULT 0,
  monto_facturado_final_mxn NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.gasto_clientes_periodo ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
CREATE POLICY "Usuarios autenticados pueden leer gasto clientes"
  ON public.gasto_clientes_periodo
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y gerencia pueden insertar gasto clientes"
  ON public.gasto_clientes_periodo
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

CREATE POLICY "Admin y gerencia pueden actualizar gasto clientes"
  ON public.gasto_clientes_periodo
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

CREATE POLICY "Solo admin puede eliminar gasto clientes"
  ON public.gasto_clientes_periodo
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Crear índices para mejorar consultas
CREATE INDEX idx_gasto_clientes_cliente ON public.gasto_clientes_periodo(cliente);
CREATE INDEX idx_gasto_clientes_email ON public.gasto_clientes_periodo(email);
CREATE INDEX idx_gasto_clientes_telefono ON public.gasto_clientes_periodo(telefono);
CREATE INDEX idx_gasto_clientes_monto_final ON public.gasto_clientes_periodo(monto_facturado_final_mxn DESC);
CREATE INDEX idx_gasto_clientes_cantidad_citas ON public.gasto_clientes_periodo(cantidad_citas_periodo DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_gasto_clientes_periodo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gasto_clientes_periodo_timestamp
  BEFORE UPDATE ON public.gasto_clientes_periodo
  FOR EACH ROW
  EXECUTE FUNCTION update_gasto_clientes_periodo_updated_at();-- Crear tabla daysheet_citas para reportes de citas diarias
CREATE TABLE IF NOT EXISTS public.daysheet_citas (
  id BIGSERIAL PRIMARY KEY,
  fecha TEXT NOT NULL,
  cliente TEXT NOT NULL,
  telefono TEXT,
  recurso TEXT,
  simbolo TEXT,
  horario TEXT NOT NULL,
  estado TEXT NOT NULL,
  profesional TEXT,
  servicio TEXT,
  equipo TEXT,
  sucursal TEXT NOT NULL,
  precio_mxn NUMERIC(10,2) DEFAULT 0,
  notas_alertas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear índices para mejorar rendimiento en consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_daysheet_fecha ON public.daysheet_citas(fecha);
CREATE INDEX IF NOT EXISTS idx_daysheet_cliente ON public.daysheet_citas(cliente);
CREATE INDEX IF NOT EXISTS idx_daysheet_profesional ON public.daysheet_citas(profesional);
CREATE INDEX IF NOT EXISTS idx_daysheet_sucursal ON public.daysheet_citas(sucursal);
CREATE INDEX IF NOT EXISTS idx_daysheet_estado ON public.daysheet_citas(estado);
CREATE INDEX IF NOT EXISTS idx_daysheet_servicio ON public.daysheet_citas(servicio);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_daysheet_citas_updated_at
  BEFORE UPDATE ON public.daysheet_citas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.daysheet_citas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer daysheet_citas"
  ON public.daysheet_citas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear daysheet_citas"
  ON public.daysheet_citas FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar daysheet_citas"
  ON public.daysheet_citas FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar daysheet_citas"
  ON public.daysheet_citas FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));-- Crear tabla para citas agendadas
CREATE TABLE IF NOT EXISTS public.citas_agendadas (
  id BIGSERIAL PRIMARY KEY,
  recurso TEXT,
  fecha DATE NOT NULL,
  cliente TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  numero_sms TEXT,
  sucursal TEXT NOT NULL,
  estado TEXT NOT NULL,
  fecha_creacion DATE,
  creado_por TEXT,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  profesional TEXT,
  servicio TEXT,
  equipo TEXT,
  retencion TEXT,
  reagendado TEXT,
  facturado TEXT,
  valor_mxn NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.citas_agendadas ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer citas agendadas"
  ON public.citas_agendadas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear citas agendadas"
  ON public.citas_agendadas
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar citas agendadas"
  ON public.citas_agendadas
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar citas agendadas"
  ON public.citas_agendadas
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_citas_agendadas_updated_at
  BEFORE UPDATE ON public.citas_agendadas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para mejorar rendimiento
CREATE INDEX idx_citas_agendadas_fecha ON public.citas_agendadas(fecha);
CREATE INDEX idx_citas_agendadas_sucursal ON public.citas_agendadas(sucursal);
CREATE INDEX idx_citas_agendadas_profesional ON public.citas_agendadas(profesional);
CREATE INDEX idx_citas_agendadas_cliente ON public.citas_agendadas(cliente);
CREATE INDEX idx_citas_agendadas_estado ON public.citas_agendadas(estado);-- Crear tabla para reporte de clientes
CREATE TABLE IF NOT EXISTS public.clientes_reporte (
  id BIGSERIAL PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  nombre TEXT,
  apellido TEXT,
  cliente_id BIGINT UNIQUE,
  telefono_movil TEXT,
  telefono TEXT,
  email TEXT,
  empresa TEXT,
  direccion_1 TEXT,
  direccion_2 TEXT,
  suburbio TEXT,
  ciudad TEXT,
  estado TEXT,
  codigo_postal TEXT,
  fecha_ultimo_servicio TIMESTAMP WITH TIME ZONE,
  profesional_ultimo_servicio TEXT,
  estado_ultima_cita TEXT,
  ultimo_servicio TEXT,
  ultima_cita_reservada_via TEXT,
  fecha_registro TIMESTAMP WITH TIME ZONE,
  es_vip BOOLEAN DEFAULT FALSE,
  cantidad_citas INTEGER DEFAULT 0,
  semanas_ausente INTEGER DEFAULT 0,
  fecha_nacimiento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_nombre_completo ON public.clientes_reporte(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_email ON public.clientes_reporte(email);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_telefono_movil ON public.clientes_reporte(telefono_movil);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_cliente_id ON public.clientes_reporte(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_es_vip ON public.clientes_reporte(es_vip);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_semanas_ausente ON public.clientes_reporte(semanas_ausente);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_profesional ON public.clientes_reporte(profesional_ultimo_servicio);
CREATE INDEX IF NOT EXISTS idx_clientes_reporte_ciudad ON public.clientes_reporte(ciudad);

-- Trigger para updated_at
CREATE TRIGGER update_clientes_reporte_updated_at
  BEFORE UPDATE ON public.clientes_reporte
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.clientes_reporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer clientes_reporte"
  ON public.clientes_reporte
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden insertar clientes_reporte"
  ON public.clientes_reporte
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar clientes_reporte"
  ON public.clientes_reporte
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar clientes_reporte"
  ON public.clientes_reporte
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));-- Crear tabla para reporte de ventas detalladas
CREATE TABLE IF NOT EXISTS public.ventas_detalle (
  id BIGSERIAL PRIMARY KEY,
  id_factura TEXT NOT NULL,
  fecha_venta DATE NOT NULL,
  cliente TEXT NOT NULL,
  sucursal TEXT NOT NULL,
  profesional TEXT,
  tipo TEXT NOT NULL,
  descripcion TEXT,
  precio_unitario_mxn NUMERIC(10, 2) DEFAULT 0,
  cantidad NUMERIC(10, 2) DEFAULT 1,
  impuesto_mxn NUMERIC(10, 2) DEFAULT 0,
  responsabilidad_paquete_mxn NUMERIC(10, 2) DEFAULT 0,
  monto_linea_mxn NUMERIC(10, 2) DEFAULT 0,
  cantidad_aux NUMERIC(10, 2) DEFAULT 0,
  impuesto_aux_mxn NUMERIC(10, 2) DEFAULT 0,
  responsabilidad_paquete_total_mxn NUMERIC(10, 2) DEFAULT 0,
  monto_total_mxn NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas y filtros rápidos
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_id_factura ON public.ventas_detalle(id_factura);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_fecha_venta ON public.ventas_detalle(fecha_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_cliente ON public.ventas_detalle(cliente);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_sucursal ON public.ventas_detalle(sucursal);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_profesional ON public.ventas_detalle(profesional);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_tipo ON public.ventas_detalle(tipo);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_fecha_sucursal ON public.ventas_detalle(fecha_venta, sucursal);
CREATE INDEX IF NOT EXISTS idx_ventas_detalle_fecha_profesional ON public.ventas_detalle(fecha_venta, profesional);

-- Trigger para updated_at
CREATE TRIGGER update_ventas_detalle_updated_at
  BEFORE UPDATE ON public.ventas_detalle
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies
ALTER TABLE public.ventas_detalle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer ventas_detalle"
  ON public.ventas_detalle
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden insertar ventas_detalle"
  ON public.ventas_detalle
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar ventas_detalle"
  ON public.ventas_detalle
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar ventas_detalle"
  ON public.ventas_detalle
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));-- Crear tabla para resumen de productividad del personal
CREATE TABLE IF NOT EXISTS public.resumen_productividad_personal (
  id BIGSERIAL PRIMARY KEY,
  
  -- Identificación
  profesional TEXT NOT NULL,
  servicio TEXT NOT NULL,
  
  -- Confirmadas (primer grupo)
  confirmadas_2 INTEGER DEFAULT 0,
  monto_confirmadas_2_mxn NUMERIC(10,2) DEFAULT 0,
  monto_confirmadas_2_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Completadas (primer grupo)
  completadas INTEGER DEFAULT 0,
  monto_completadas_mxn NUMERIC(10,2) DEFAULT 0,
  monto_completadas_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Canceladas (primer grupo)
  canceladas INTEGER DEFAULT 0,
  monto_canceladas_mxn NUMERIC(10,2) DEFAULT 0,
  monto_canceladas_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Confirmadas (segundo grupo)
  confirmadas INTEGER DEFAULT 0,
  monto_confirmadas_mxn NUMERIC(10,2) DEFAULT 0,
  monto_confirmadas_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Completadas 2
  completadas_2 INTEGER DEFAULT 0,
  monto_completadas_2_mxn NUMERIC(10,2) DEFAULT 0,
  monto_completadas_2_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- No show
  no_show INTEGER DEFAULT 0,
  monto_no_show_mxn NUMERIC(10,2) DEFAULT 0,
  monto_no_show_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Canceladas 2
  canceladas_2 INTEGER DEFAULT 0,
  monto_canceladas_2_mxn NUMERIC(10,2) DEFAULT 0,
  monto_canceladas_2_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Confirmadas 3
  confirmadas_3 INTEGER DEFAULT 0,
  monto_confirmadas_3_mxn NUMERIC(10,2) DEFAULT 0,
  monto_confirmadas_3_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Completadas 1
  completadas_1 INTEGER DEFAULT 0,
  monto_completadas_1_mxn NUMERIC(10,2) DEFAULT 0,
  monto_completadas_1_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- No show 2
  no_show_2 INTEGER DEFAULT 0,
  monto_no_show_2_mxn NUMERIC(10,2) DEFAULT 0,
  monto_no_show_2_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Canceladas 1
  canceladas_1 INTEGER DEFAULT 0,
  monto_canceladas_1_mxn NUMERIC(10,2) DEFAULT 0,
  monto_canceladas_1_facturado_mxn NUMERIC(10,2) DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_productividad_profesional ON public.resumen_productividad_personal(profesional);
CREATE INDEX idx_productividad_servicio ON public.resumen_productividad_personal(servicio);
CREATE INDEX idx_productividad_completadas ON public.resumen_productividad_personal(completadas_1 DESC);
CREATE INDEX idx_productividad_ingresos ON public.resumen_productividad_personal(monto_completadas_1_facturado_mxn DESC);

-- RLS Policies
ALTER TABLE public.resumen_productividad_personal ENABLE ROW LEVEL SECURITY;

-- Usuarios autenticados pueden leer
CREATE POLICY "Usuarios autenticados pueden leer productividad"
  ON public.resumen_productividad_personal
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin y gerencia pueden insertar/actualizar
CREATE POLICY "Admin y gerencia pueden crear productividad"
  ON public.resumen_productividad_personal
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

CREATE POLICY "Admin y gerencia pueden actualizar productividad"
  ON public.resumen_productividad_personal
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

-- Solo admin puede eliminar
CREATE POLICY "Solo admin puede eliminar productividad"
  ON public.resumen_productividad_personal
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para updated_at
CREATE TRIGGER update_productividad_updated_at
  BEFORE UPDATE ON public.resumen_productividad_personal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();-- Primero, eliminar todos los datos existentes de la tabla
DELETE FROM resumen_productividad_personal;

-- Eliminar la tabla actual para recrearla con la estructura simplificada
DROP TABLE IF EXISTS resumen_productividad_personal;

-- Crear la tabla simplificada con solo las columnas esenciales
CREATE TABLE resumen_productividad_personal (
  id BIGSERIAL PRIMARY KEY,
  profesional TEXT NOT NULL,
  servicio TEXT NOT NULL,
  completadas INTEGER DEFAULT 0,
  no_show INTEGER DEFAULT 0,
  canceladas INTEGER DEFAULT 0,
  facturado_mxn NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE resumen_productividad_personal ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Usuarios autenticados pueden leer productividad"
  ON resumen_productividad_personal
  FOR SELECT
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear productividad"
  ON resumen_productividad_personal
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar productividad"
  ON resumen_productividad_personal
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar productividad"
  ON resumen_productividad_personal
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));-- Crear tabla para proyección de valor futuro
CREATE TABLE IF NOT EXISTS public.proyeccion_valor_futuro (
  id BIGSERIAL PRIMARY KEY,
  profesional TEXT NOT NULL,
  cantidad_clientes INTEGER,
  clientes_online INTEGER,
  clientes_totales INTEGER,
  cantidad_servicios INTEGER,
  reservas_online INTEGER,
  valor_futuro_mxn NUMERIC(10,2),
  porcentaje_clientes INTEGER,
  nuevos_clientes INTEGER,
  citas_agendadas INTEGER,
  servicios_agendados INTEGER,
  reservas_online2 INTEGER,
  valor_total_agendado_mxn NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.proyeccion_valor_futuro ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer proyecciones"
  ON public.proyeccion_valor_futuro
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear proyecciones"
  ON public.proyeccion_valor_futuro
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'gerencia'::app_role) OR 
    has_role(auth.uid(), 'direccion'::app_role)
  );

CREATE POLICY "Admin puede eliminar proyecciones"
  ON public.proyeccion_valor_futuro
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Índices para mejorar rendimiento
CREATE INDEX idx_proyeccion_profesional ON public.proyeccion_valor_futuro(profesional);
CREATE INDEX idx_proyeccion_valor_futuro ON public.proyeccion_valor_futuro(valor_futuro_mxn DESC);
CREATE INDEX idx_proyeccion_servicios ON public.proyeccion_valor_futuro(cantidad_servicios DESC);-- Agregar columna tipo a proyeccion_valor_futuro
ALTER TABLE public.proyeccion_valor_futuro
ADD COLUMN tipo TEXT NOT NULL DEFAULT 'profesional'
CHECK (tipo IN ('profesional', 'sucursal', 'servicio'));

-- Crear índice para filtrado por tipo
CREATE INDEX idx_proyeccion_tipo ON public.proyeccion_valor_futuro(tipo);

-- Comentario explicativo
COMMENT ON COLUMN public.proyeccion_valor_futuro.tipo IS 'Tipo de registro: profesional, sucursal o servicio';-- Crear tabla para ventas por categoría de servicio
CREATE TABLE IF NOT EXISTS public.ventas_por_categoria_servicio (
  id BIGSERIAL PRIMARY KEY,
  categoria_servicio TEXT NOT NULL,
  cantidad_servicios INTEGER NOT NULL DEFAULT 0,
  porcentaje_participacion NUMERIC(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ventas_por_categoria_servicio ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuarios autenticados pueden leer ventas por categoría"
  ON public.ventas_por_categoria_servicio
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y gerencia pueden crear ventas por categoría"
  ON public.ventas_por_categoria_servicio
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar ventas por categoría"
  ON public.ventas_por_categoria_servicio
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar ventas por categoría"
  ON public.ventas_por_categoria_servicio
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Índices para mejorar consultas
CREATE INDEX idx_ventas_categoria_servicio ON public.ventas_por_categoria_servicio(categoria_servicio);
CREATE INDEX idx_ventas_categoria_cantidad ON public.ventas_por_categoria_servicio(cantidad_servicios DESC);
CREATE INDEX idx_ventas_categoria_porcentaje ON public.ventas_por_categoria_servicio(porcentaje_participacion DESC);-- Borrar todos los datos de las tablas de reportes importados

DELETE FROM citas_agendadas;
DELETE FROM citas_canceladas;
DELETE FROM clientes_inactivos;
DELETE FROM clientes_reporte;
DELETE FROM resumen_productividad_personal;
DELETE FROM gasto_clientes_periodo;
DELETE FROM daysheet_citas;
DELETE FROM proyeccion_valor_futuro;
DELETE FROM ventas_por_categoria_servicio;
DELETE FROM facturacion_detalle;-- Borrar datos operacionales de las tablas principales

-- Tablas relacionadas con citas y agenda
DELETE FROM notas_citas;
DELETE FROM citas_historial_estado;
DELETE FROM bloqueos_agenda;
DELETE FROM agendas;

-- Tablas relacionadas con ventas y pagos
DELETE FROM comisiones;
DELETE FROM aplicacion_anticipo;
DELETE FROM pagos;
DELETE FROM venta_items;
DELETE FROM ventas;

-- Tablas de anticipos y libro contable
DELETE FROM anticipos;
DELETE FROM libro_ingresos;
DELETE FROM libro_diferidos;

-- Tablas de clientes (solo datos, no estructura)
DELETE FROM tarjetas_regalo;
DELETE FROM clientes;

-- Tablas de marketing y CRM
DELETE FROM mensajes_enviados;
DELETE FROM lead_tags;
DELETE FROM leads;
DELETE FROM encuestas_satisfaccion;

-- Tablas de RRHH
DELETE FROM liquidacion_detalle;
DELETE FROM liquidacion_semanal;
DELETE FROM asistencias;
DELETE FROM permisos;

-- Tablas de finanzas
DELETE FROM gastos_sucursal;

-- Bitácora (opcional, pero recomendado limpiar)
DELETE FROM bitacora_accion;-- Borrar datos de la tabla ventas_detalle
DELETE FROM ventas_detalle;-- Crear tabla agregada de clientes
CREATE TABLE IF NOT EXISTS public.clientes_agregados (
  cliente_id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR NOT NULL UNIQUE,
  primera_cita DATE,
  ultima_cita DATE,
  total_citas INTEGER DEFAULT 0,
  total_facturado NUMERIC(10,2) DEFAULT 0,
  es_recurrente BOOLEAN DEFAULT false,
  es_nuevo BOOLEAN DEFAULT false,
  telefono VARCHAR,
  email VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_clientes_agregados_nombre ON public.clientes_agregados(nombre);
CREATE INDEX idx_clientes_agregados_primera_cita ON public.clientes_agregados(primera_cita);
CREATE INDEX idx_clientes_agregados_es_recurrente ON public.clientes_agregados(es_recurrente);
CREATE INDEX idx_clientes_agregados_es_nuevo ON public.clientes_agregados(es_nuevo);

-- Función para actualizar la tabla agregada desde facturacion_detalle
CREATE OR REPLACE FUNCTION public.actualizar_clientes_agregados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Limpiar tabla
  TRUNCATE public.clientes_agregados;
  
  -- Insertar datos agregados
  INSERT INTO public.clientes_agregados (
    nombre,
    primera_cita,
    ultima_cita,
    total_citas,
    total_facturado,
    es_recurrente,
    es_nuevo
  )
  SELECT 
    fd.cliente AS nombre,
    MIN(fd.fecha) AS primera_cita,
    MAX(fd.fecha) AS ultima_cita,
    COUNT(DISTINCT fd.fecha) AS total_citas,
    COALESCE(SUM(CASE 
      WHEN fd.tipo IN ('Appointment', 'Service', 'Product') AND fd.monto_total_mxn > 0 
      THEN fd.monto_total_mxn 
      ELSE 0 
    END), 0) AS total_facturado,
    COUNT(DISTINCT fd.fecha) > 1 AS es_recurrente,
    COUNT(DISTINCT fd.fecha) = 1 AS es_nuevo
  FROM public.facturacion_detalle fd
  GROUP BY fd.cliente
  ORDER BY nombre;
END;
$$;

-- RLS Policies
ALTER TABLE public.clientes_agregados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden leer clientes agregados"
  ON public.clientes_agregados
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin y gerencia pueden actualizar clientes agregados"
  ON public.clientes_agregados
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden insertar clientes agregados"
  ON public.clientes_agregados
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar clientes agregados"
  ON public.clientes_agregados
  FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Trigger para actualizar updated_at
CREATE TRIGGER update_clientes_agregados_updated_at
  BEFORE UPDATE ON public.clientes_agregados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();-- Eliminar tabla y función de clientes agregados
DROP TRIGGER IF EXISTS update_clientes_agregados_updated_at ON public.clientes_agregados;
DROP FUNCTION IF EXISTS public.actualizar_clientes_agregados();
DROP TABLE IF EXISTS public.clientes_agregados CASCADE;-- Actualizar función para permitir regla completamente genérica
CREATE OR REPLACE FUNCTION public.calcular_prioridad_comision()
RETURNS TRIGGER AS $$
BEGIN
  -- Empleado + Servicio = 1
  IF NEW.id_empleado IS NOT NULL AND NEW.id_servicio IS NOT NULL THEN
    NEW.prioridad := 1;
  -- Empleado + Categoría = 2
  ELSIF NEW.id_empleado IS NOT NULL AND NEW.id_categoria_servicio IS NOT NULL THEN
    NEW.prioridad := 2;
  -- Empleado genérica = 3
  ELSIF NEW.id_empleado IS NOT NULL AND NEW.id_servicio IS NULL AND NEW.id_categoria_servicio IS NULL THEN
    NEW.prioridad := 3;
  -- Genérica por Servicio = 4
  ELSIF NEW.id_empleado IS NULL AND NEW.id_servicio IS NOT NULL THEN
    NEW.prioridad := 4;
  -- Genérica por Categoría = 5
  ELSIF NEW.id_empleado IS NULL AND NEW.id_categoria_servicio IS NOT NULL THEN
    NEW.prioridad := 5;
  -- Regla completamente genérica (todos los empleados, todas las categorías, todos los servicios) = 6
  ELSIF NEW.id_empleado IS NULL AND NEW.id_servicio IS NULL AND NEW.id_categoria_servicio IS NULL THEN
    NEW.prioridad := 6;
  ELSE
    RAISE EXCEPTION 'Configuración inválida de regla de comisión';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- Función para registrar comisiones automáticamente cuando se reconoce un ingreso
CREATE OR REPLACE FUNCTION registrar_comision_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_regla RECORD;
  v_id_empleado BIGINT;
  v_id_servicio BIGINT;
  v_id_categoria BIGINT;
  v_base_mxn NUMERIC;
  v_porcentaje NUMERIC;
  v_comision_mxn NUMERIC;
  v_periodo_inicio DATE;
  v_periodo_fin DATE;
BEGIN
  -- Obtener los items de la venta asociada al ingreso
  FOR v_item IN 
    SELECT 
      vi.*,
      s.id_categoria
    FROM venta_items vi
    LEFT JOIN servicios s ON s.id = vi.id_servicio
    WHERE vi.id_venta = NEW.id_venta
  LOOP
    -- Obtener id_empleado (del item o de la cita)
    v_id_empleado := v_item.id_empleado;
    
    IF v_id_empleado IS NULL AND NEW.id_cita IS NOT NULL THEN
      SELECT id_empleado INTO v_id_empleado
      FROM agendas
      WHERE id = NEW.id_cita;
    END IF;
    
    -- Si no hay empleado, saltar este item
    CONTINUE WHEN v_id_empleado IS NULL;
    
    v_id_servicio := v_item.id_servicio;
    v_id_categoria := v_item.id_categoria;
    v_base_mxn := v_item.precio_final_mxn * COALESCE(v_item.cantidad, 1);
    
    -- Resolver regla de comisión aplicable
    SELECT * INTO v_regla
    FROM resolver_regla_comision(
      v_id_empleado,
      v_id_servicio,
      v_id_categoria,
      NEW.fecha::date
    );
    
    v_porcentaje := COALESCE(v_regla.porcentaje, 0);
    v_comision_mxn := ROUND((v_base_mxn * v_porcentaje / 100)::numeric, 2);
    
    -- Calcular periodo de comisión (semana que contiene la fecha del ingreso)
    -- Asumiendo que la semana va de sábado a viernes según parametros_sistema
    v_periodo_inicio := NEW.fecha::date - ((EXTRACT(DOW FROM NEW.fecha::date) + 1) % 7)::integer;
    v_periodo_fin := v_periodo_inicio + 6;
    
    -- Insertar o actualizar comisión
    INSERT INTO comisiones (
      id_empleado,
      id_venta,
      id_venta_item,
      id_categoria_servicio,
      id_sucursal,
      monto_base,
      porcentaje_comision,
      monto_comision,
      periodo_inicio,
      periodo_fin,
      estado,
      notas
    ) VALUES (
      v_id_empleado,
      NEW.id_venta,
      v_item.id,
      v_id_categoria,
      NEW.id_sucursal,
      v_base_mxn,
      v_porcentaje,
      v_comision_mxn,
      v_periodo_inicio,
      v_periodo_fin,
      'pendiente',
      'Generada automáticamente desde libro_ingresos'
    )
    ON CONFLICT (id_venta_item) 
    DO UPDATE SET
      monto_base = EXCLUDED.monto_base,
      porcentaje_comision = EXCLUDED.porcentaje_comision,
      monto_comision = EXCLUDED.monto_comision,
      updated_at = now();
      
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para registrar comisiones automáticamente
DROP TRIGGER IF EXISTS trigger_registrar_comision_automatica ON libro_ingresos;
CREATE TRIGGER trigger_registrar_comision_automatica
  AFTER INSERT ON libro_ingresos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_comision_automatica();

-- Agregar constraint único para evitar duplicados
ALTER TABLE comisiones
DROP CONSTRAINT IF EXISTS comisiones_id_venta_item_unique;

ALTER TABLE comisiones
ADD CONSTRAINT comisiones_id_venta_item_unique UNIQUE (id_venta_item);

COMMENT ON TRIGGER trigger_registrar_comision_automatica ON libro_ingresos IS 
'Registra automáticamente comisiones en la tabla comisiones cuando se reconoce un ingreso';

-- Eliminar el constraint si existe de forma incorrecta
ALTER TABLE comisiones
DROP CONSTRAINT IF EXISTS comisiones_id_venta_item_unique;

-- Crear el constraint único correctamente solo para registros con id_venta_item no nulo
CREATE UNIQUE INDEX IF NOT EXISTS comisiones_id_venta_item_unique_idx
ON comisiones (id_venta_item)
WHERE id_venta_item IS NOT NULL;

-- Actualizar la función para manejar correctamente la inserción de comisiones
CREATE OR REPLACE FUNCTION registrar_comision_automatica()
RETURNS TRIGGER AS $$
DECLARE
  v_item RECORD;
  v_regla RECORD;
  v_id_empleado BIGINT;
  v_id_servicio BIGINT;
  v_id_categoria BIGINT;
  v_base_mxn NUMERIC;
  v_porcentaje NUMERIC;
  v_comision_mxn NUMERIC;
  v_fecha_ingreso DATE;
  v_precio_final NUMERIC;
  v_comision_existente BIGINT;
BEGIN
  RAISE NOTICE 'Trigger activado para libro_ingresos.id=%, id_venta=%', NEW.id, NEW.id_venta;
  
  v_fecha_ingreso := NEW.fecha::date;
  
  IF NEW.id_venta IS NOT NULL THEN
    RAISE NOTICE 'Procesando venta %', NEW.id_venta;
    
    FOR v_item IN 
      SELECT 
        vi.id,
        vi.id_servicio,
        vi.id_empleado,
        vi.precio_final_mxn,
        vi.precio_unitario,
        vi.cantidad,
        s.id_categoria
      FROM venta_items vi
      LEFT JOIN servicios s ON s.id = vi.id_servicio
      WHERE vi.id_venta = NEW.id_venta
    LOOP
      RAISE NOTICE 'Procesando item=%, servicio=%, empleado=%', v_item.id, v_item.id_servicio, v_item.id_empleado;
      
      v_id_empleado := v_item.id_empleado;
      IF v_id_empleado IS NULL AND NEW.id_cita IS NOT NULL THEN
        SELECT id_empleado INTO v_id_empleado FROM agendas WHERE id = NEW.id_cita;
        RAISE NOTICE 'Empleado tomado de cita: %', v_id_empleado;
      END IF;
      
      IF v_id_empleado IS NULL THEN
        RAISE NOTICE 'Sin empleado para item, saltando';
        CONTINUE;
      END IF;
      
      v_id_servicio := v_item.id_servicio;
      v_id_categoria := v_item.id_categoria;
      v_precio_final := COALESCE(v_item.precio_final_mxn, v_item.precio_unitario);
      v_base_mxn := v_precio_final * COALESCE(v_item.cantidad, 1);
      
      RAISE NOTICE 'Base calculada: %', v_base_mxn;
      
      SELECT id INTO v_comision_existente
      FROM comisiones WHERE id_venta_item = v_item.id LIMIT 1;
      
      IF v_comision_existente IS NOT NULL THEN
        RAISE NOTICE 'Ya existe comisión para item, saltando';
        CONTINUE;
      END IF;
      
      SELECT * INTO v_regla
      FROM resolver_regla_comision(v_id_empleado, v_id_servicio, v_id_categoria, v_fecha_ingreso);
      
      IF FOUND THEN
        v_porcentaje := v_regla.porcentaje;
        v_comision_mxn := ROUND((v_base_mxn * v_porcentaje / 100)::numeric, 2);
        
        RAISE NOTICE 'Regla encontrada con porcentaje=%, comision=%', v_porcentaje, v_comision_mxn;
        
        INSERT INTO comisiones (
          id_empleado, id_venta, id_venta_item, id_categoria_servicio, id_sucursal,
          monto_base, porcentaje_comision, monto_comision,
          periodo_inicio, periodo_fin, estado, notas
        ) VALUES (
          v_id_empleado, NEW.id_venta, v_item.id, v_id_categoria, NEW.id_sucursal,
          v_base_mxn, v_porcentaje, v_comision_mxn,
          v_fecha_ingreso, v_fecha_ingreso, 'pendiente',
          'Comisión generada automáticamente - Regla ID: ' || v_regla.id_regla
        );
        
        RAISE NOTICE 'Comisión insertada exitosamente';
      ELSE
        RAISE NOTICE 'No se encontró regla de comisión aplicable';
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error en trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION registrar_comision_automatica() IS 
'Registra automáticamente comisiones cuando se inserta un ingreso en libro_ingresos';

-- Arreglar la función resolver_regla_comision para que considere reglas genéricas (prioridad 6)
CREATE OR REPLACE FUNCTION resolver_regla_comision(
  _id_empleado BIGINT,
  _id_servicio BIGINT,
  _id_categoria BIGINT,
  _fecha DATE
)
RETURNS TABLE(id_regla BIGINT, porcentaje NUMERIC, prioridad SMALLINT)
LANGUAGE plpgsql
STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.id,
    pc.porcentaje,
    pc.prioridad
  FROM parametros_comision pc
  WHERE pc.activo = true
    AND pc.fecha_inicio <= _fecha
    AND (pc.fecha_fin IS NULL OR pc.fecha_fin >= _fecha)
    AND (
      -- Empleado + Servicio (prioridad 1)
      (pc.id_empleado = _id_empleado AND pc.id_servicio = _id_servicio)
      OR
      -- Empleado + Categoría (prioridad 2)
      (pc.id_empleado = _id_empleado AND pc.id_servicio IS NULL AND pc.id_categoria_servicio = _id_categoria)
      OR
      -- Empleado genérica (prioridad 3)
      (pc.id_empleado = _id_empleado AND pc.id_servicio IS NULL AND pc.id_categoria_servicio IS NULL)
      OR
      -- Genérica por Servicio (prioridad 4)
      (pc.id_empleado IS NULL AND pc.id_servicio = _id_servicio)
      OR
      -- Genérica por Categoría (prioridad 5)
      (pc.id_empleado IS NULL AND pc.id_servicio IS NULL AND pc.id_categoria_servicio = _id_categoria)
      OR
      -- Regla completamente genérica (prioridad 6) - ESTO FALTABA
      (pc.id_empleado IS NULL AND pc.id_servicio IS NULL AND pc.id_categoria_servicio IS NULL)
    )
  ORDER BY 
    pc.prioridad ASC,
    pc.fecha_inicio DESC
  LIMIT 1;
END;
$$;

COMMENT ON FUNCTION resolver_regla_comision IS 
'Encuentra la regla de comisión más específica aplicable según prioridad y fecha';
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
USING (true);-- Agregar tablas relacionadas a realtime para actualización automática de ventas
ALTER PUBLICATION supabase_realtime ADD TABLE venta_items;
ALTER PUBLICATION supabase_realtime ADD TABLE pagos;
ALTER PUBLICATION supabase_realtime ADD TABLE aplicacion_anticipo;-- Agregar política RLS UPDATE para la tabla ventas
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
USING (true);-- Enable realtime for dashboard tables
ALTER TABLE public.daysheet_citas REPLICA IDENTITY FULL;
ALTER TABLE public.facturacion_detalle REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.daysheet_citas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.facturacion_detalle;-- Enable realtime for sales tables (tables already in publication)
ALTER TABLE public.ventas REPLICA IDENTITY FULL;
ALTER TABLE public.venta_items REPLICA IDENTITY FULL;-- Agregar políticas RLS para que usuarios autenticados puedan insertar en lotes_producto y stock_actual

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
  USING (true);-- Agregar columna id_producto a venta_items para soportar productos
ALTER TABLE public.venta_items 
ADD COLUMN id_producto BIGINT REFERENCES public.productos(id);
-- Verificar si el trigger existe y recrearlo si es necesario
DROP TRIGGER IF EXISTS trigger_generar_comision_automatica ON libro_ingresos;

-- Recrear la función del trigger con mejor manejo de errores
CREATE OR REPLACE FUNCTION public.registrar_comision_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_regla RECORD;
  v_id_empleado BIGINT;
  v_id_servicio BIGINT;
  v_id_categoria BIGINT;
  v_base_mxn NUMERIC;
  v_porcentaje NUMERIC;
  v_comision_mxn NUMERIC;
  v_fecha_ingreso DATE;
  v_precio_final NUMERIC;
  v_comision_existente BIGINT;
BEGIN
  RAISE NOTICE 'Trigger activado para libro_ingresos.id=%, id_venta=%', NEW.id, NEW.id_venta;
  
  v_fecha_ingreso := NEW.fecha::date;
  
  IF NEW.id_venta IS NOT NULL THEN
    RAISE NOTICE 'Procesando venta %', NEW.id_venta;
    
    FOR v_item IN 
      SELECT 
        vi.id,
        vi.id_servicio,
        vi.id_empleado,
        vi.precio_final_mxn,
        vi.precio_unitario,
        vi.cantidad,
        s.id_categoria
      FROM venta_items vi
      LEFT JOIN servicios s ON s.id = vi.id_servicio
      WHERE vi.id_venta = NEW.id_venta
    LOOP
      RAISE NOTICE 'Procesando item=%, servicio=%, empleado=%', v_item.id, v_item.id_servicio, v_item.id_empleado;
      
      v_id_empleado := v_item.id_empleado;
      IF v_id_empleado IS NULL AND NEW.id_cita IS NOT NULL THEN
        SELECT id_empleado INTO v_id_empleado FROM agendas WHERE id = NEW.id_cita;
        RAISE NOTICE 'Empleado tomado de cita: %', v_id_empleado;
      END IF;
      
      IF v_id_empleado IS NULL THEN
        RAISE NOTICE 'Sin empleado para item, saltando';
        CONTINUE;
      END IF;
      
      v_id_servicio := v_item.id_servicio;
      v_id_categoria := v_item.id_categoria;
      v_precio_final := COALESCE(v_item.precio_final_mxn, v_item.precio_unitario);
      v_base_mxn := v_precio_final * COALESCE(v_item.cantidad, 1);
      
      RAISE NOTICE 'Base calculada: %', v_base_mxn;
      
      SELECT id INTO v_comision_existente
      FROM comisiones WHERE id_venta_item = v_item.id LIMIT 1;
      
      IF v_comision_existente IS NOT NULL THEN
        RAISE NOTICE 'Ya existe comisión para item, saltando';
        CONTINUE;
      END IF;
      
      SELECT * INTO v_regla
      FROM resolver_regla_comision(v_id_empleado, v_id_servicio, v_id_categoria, v_fecha_ingreso);
      
      IF FOUND THEN
        v_porcentaje := v_regla.porcentaje;
        v_comision_mxn := ROUND((v_base_mxn * v_porcentaje / 100)::numeric, 2);
        
        RAISE NOTICE 'Regla encontrada con porcentaje=%, comision=%', v_porcentaje, v_comision_mxn;
        
        INSERT INTO comisiones (
          id_empleado, id_venta, id_venta_item, id_categoria_servicio, id_sucursal,
          monto_base, porcentaje_comision, monto_comision,
          periodo_inicio, periodo_fin, estado, notas
        ) VALUES (
          v_id_empleado, NEW.id_venta, v_item.id, v_id_categoria, NEW.id_sucursal,
          v_base_mxn, v_porcentaje, v_comision_mxn,
          v_fecha_ingreso, v_fecha_ingreso, 'pendiente',
          'Comisión generada automáticamente - Regla ID: ' || v_regla.id_regla
        );
        
        RAISE NOTICE 'Comisión insertada exitosamente';
      ELSE
        RAISE NOTICE 'No se encontró regla de comisión aplicable';
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error en trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Crear el trigger que se ejecuta DESPUÉS de insertar en libro_ingresos
CREATE TRIGGER trigger_generar_comision_automatica
  AFTER INSERT ON libro_ingresos
  FOR EACH ROW
  EXECUTE FUNCTION registrar_comision_automatica();

COMMENT ON TRIGGER trigger_generar_comision_automatica ON libro_ingresos IS 
  'Genera comisiones automáticamente cuando se reconoce un ingreso';
-- Agregar columna de precio de venta a productos
ALTER TABLE public.productos
ADD COLUMN IF NOT EXISTS precio_venta_mxn numeric DEFAULT 0;

-- Comentario explicativo
COMMENT ON COLUMN public.productos.precio_venta_mxn IS 'Precio de venta al público en MXN';CREATE OR REPLACE FUNCTION public.puede_cambiar_estado_cita(_user_id uuid, _cita_id bigint, _estado_actual cita_estado_enum, _estado_nuevo cita_estado_enum)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _es_admin BOOLEAN;
  _es_gerencia BOOLEAN;
  _es_direccion BOOLEAN;
  _es_admin_rrhh BOOLEAN;
  _es_recepcion BOOLEAN;
  _es_profesional BOOLEAN;
  _empleado_id BIGINT;
  _cita_empleado_id BIGINT;
  _cita_sucursal_id BIGINT;
  _user_sucursal_id BIGINT;
BEGIN
  _es_admin := public.has_role(_user_id, 'admin');
  _es_gerencia := public.has_role(_user_id, 'gerencia');
  _es_direccion := public.has_role(_user_id, 'direccion');
  _es_admin_rrhh := public.has_role(_user_id, 'admin_rrhh');
  _es_recepcion := public.has_role(_user_id, 'recepcion');
  _es_profesional := public.has_role(_user_id, 'profesional');
  
  -- Admin, dirección y admin_rrhh pueden todo
  IF _es_admin OR _es_direccion OR _es_admin_rrhh THEN
    RETURN TRUE;
  END IF;
  
  SELECT id_empleado, id_sucursal 
  INTO _cita_empleado_id, _cita_sucursal_id
  FROM public.agendas
  WHERE id = _cita_id;
  
  SELECT id_sucursal INTO _user_sucursal_id
  FROM public.profiles
  WHERE id = _user_id;
  
  -- Gerencia puede todo en su sucursal
  IF _es_gerencia THEN
    IF _user_sucursal_id IS NULL OR _cita_sucursal_id = _user_sucursal_id THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Recepción (nuevos estados)
  IF _es_recepcion THEN
    -- Verificar sucursal
    IF _user_sucursal_id IS NOT NULL AND _cita_sucursal_id != _user_sucursal_id THEN
      RETURN FALSE;
    END IF;
    
    -- Transiciones permitidas para recepción (nuevos estados)
    IF (_estado_actual = 'agendada' AND _estado_nuevo IN ('confirmada', 'cancelada')) OR
       (_estado_actual = 'confirmada' AND _estado_nuevo IN ('en_atencion', 'cancelada', 'no_asiste')) OR
       (_estado_actual = 'en_atencion' AND _estado_nuevo = 'cancelada') OR
       -- Legacy states support
       (_estado_actual = 'reservada' AND _estado_nuevo IN ('confirmada', 'cancelada_cliente', 'cancelada_clinica', 'no_show')) OR
       (_estado_actual = 'confirmada' AND _estado_nuevo IN ('llego_paciente', 'cancelada_cliente', 'cancelada_clinica', 'no_show')) OR
       (_estado_actual = 'llego_paciente' AND _estado_nuevo = 'cancelada_clinica') THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Profesional (solo sus propias citas)
  IF _es_profesional THEN
    SELECT id INTO _empleado_id
    FROM public.empleados
    WHERE email = (SELECT email FROM auth.users WHERE id = _user_id);
    
    IF _empleado_id = _cita_empleado_id THEN
      -- Nuevos estados: en_atencion -> finalizada
      IF _estado_actual = 'en_atencion' AND _estado_nuevo = 'finalizada' THEN
        RETURN TRUE;
      END IF;
      -- Legacy: llego_paciente -> asistida
      IF _estado_actual = 'llego_paciente' AND _estado_nuevo = 'asistida' THEN
        RETURN TRUE;
      END IF;
    END IF;
    RETURN FALSE;
  END IF;
  
  RETURN FALSE;
END;
$function$;CREATE OR REPLACE FUNCTION public.validar_cambio_estado()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado THEN
    -- Permitir transiciones desde estados antiguos (legacy) para migración
    IF OLD.estado IN ('reservada', 'presentado', 'completada', 'no_show', 'cancelada_cliente', 'cancelada_clinica', 'llego_paciente', 'asistida') THEN
      RETURN NEW;
    END IF;
    
    -- Validar transiciones para nuevos estados
    IF OLD.estado = 'agendada' AND NEW.estado NOT IN ('confirmada', 'cancelada') THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    IF OLD.estado = 'confirmada' AND NEW.estado NOT IN ('en_atencion', 'cancelada', 'no_asiste') THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    IF OLD.estado = 'en_atencion' AND NEW.estado NOT IN ('finalizada', 'cancelada') THEN
      RAISE EXCEPTION 'Transición inválida de % a %', OLD.estado, NEW.estado;
    END IF;
    
    IF OLD.estado IN ('finalizada', 'cancelada', 'no_asiste') THEN
      RAISE EXCEPTION 'No se puede cambiar el estado de una cita %', OLD.estado;
    END IF;
    
    -- Si cambia a 'en_atencion', registrar check_in
    IF NEW.estado = 'en_atencion' AND NEW.check_in_at IS NULL THEN
      NEW.check_in_at := now();
    END IF;
    
    -- Si cambia a 'finalizada', registrar check_out
    IF NEW.estado = 'finalizada' AND NEW.check_out_at IS NULL THEN
      NEW.check_out_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;-- Ajustar validación de transición de estados para permitir cancelar desde 'en_atencion'

CREATE OR REPLACE FUNCTION public.fn_cita_transicion_valida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.estado = OLD.estado THEN
    RETURN NEW; -- idempotente
  END IF;

  IF OLD.estado = 'agendada' AND NEW.estado IN ('confirmada','cancelada') THEN
    RETURN NEW;
  ELSIF OLD.estado = 'confirmada' AND NEW.estado IN ('en_atencion','cancelada','no_asiste') THEN
    RETURN NEW;
  ELSIF OLD.estado = 'en_atencion' AND NEW.estado IN ('finalizada','cancelada') THEN
    RETURN NEW;
  ELSE
    RAISE EXCEPTION 'Transición inválida de % a % para cita %', OLD.estado, NEW.estado, NEW.id;
  END IF;
END;
$$;-- Agregar políticas faltantes para pagos (solo SELECT y DELETE si no existen)
DO $$
BEGIN
  -- Crear política SELECT si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pagos' 
    AND policyname = 'Usuarios autenticados pueden ver pagos'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden ver pagos"
    ON public.pagos FOR SELECT TO authenticated USING (true);
  END IF;

  -- Crear política INSERT si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pagos' 
    AND policyname = 'Usuarios autenticados pueden insertar pagos'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden insertar pagos"
    ON public.pagos FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  -- Crear política DELETE si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pagos' 
    AND policyname = 'Usuarios autenticados pueden eliminar pagos'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden eliminar pagos"
    ON public.pagos FOR DELETE TO authenticated USING (true);
  END IF;
END $$;
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
