-- Enums para inventario
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
  );