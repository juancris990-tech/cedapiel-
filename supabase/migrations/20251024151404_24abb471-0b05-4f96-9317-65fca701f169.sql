-- 1. Crear tipo ENUM para estado de permiso
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
  EXECUTE FUNCTION public.set_updated_at();