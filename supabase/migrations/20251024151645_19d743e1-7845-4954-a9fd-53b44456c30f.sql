-- 1. Ampliar tabla clientes con expediente y saldos
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
  ON public.campanias_marketing(fecha_inicio, fecha_fin);