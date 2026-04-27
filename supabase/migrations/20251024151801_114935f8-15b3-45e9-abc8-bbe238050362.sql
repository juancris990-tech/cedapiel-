-- 1. Ampliar tabla clientes con expediente y saldos
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

-- Continúa en el siguiente bloque...