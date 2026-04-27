-- ==========================================
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
END $$;