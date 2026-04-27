
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
