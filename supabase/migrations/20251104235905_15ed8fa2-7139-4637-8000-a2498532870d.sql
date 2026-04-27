-- Crear enum para estado de anticipos
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
  WITH CHECK (auth.uid() IS NOT NULL);