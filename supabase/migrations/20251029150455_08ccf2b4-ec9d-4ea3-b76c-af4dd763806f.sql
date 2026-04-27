-- ============================================
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
         s.nombre, e.nombre, e.cargo;