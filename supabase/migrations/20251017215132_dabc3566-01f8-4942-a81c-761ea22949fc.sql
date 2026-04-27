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
('Laura', 'Martínez', 'laura.martinez@email.com', '5555554321', '1992-03-10', 'Femenino');