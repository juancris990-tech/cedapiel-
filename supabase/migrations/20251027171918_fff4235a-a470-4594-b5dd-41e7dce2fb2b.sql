-- ============================================
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
EXECUTE FUNCTION public.actualizar_updated_at_tarjetas();