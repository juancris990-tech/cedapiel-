-- Mejorar el trigger para manejar casos donde precio_final_mxn es NULL
CREATE OR REPLACE FUNCTION public.registrar_comision_automatica()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_item RECORD;
  v_regla RECORD;
  v_id_empleado BIGINT;
  v_id_servicio BIGINT;
  v_id_categoria BIGINT;
  v_base_mxn NUMERIC;
  v_porcentaje NUMERIC;
  v_comision_mxn NUMERIC;
  v_fecha_ingreso DATE;
  v_precio_final NUMERIC;
BEGIN
  -- Obtener la fecha del ingreso
  v_fecha_ingreso := NEW.fecha::date;
  
  -- Si el ingreso viene de una venta, procesar sus items
  IF NEW.id_venta IS NOT NULL THEN
    FOR v_item IN 
      SELECT 
        vi.id,
        vi.id_servicio,
        vi.id_empleado,
        vi.precio_final_mxn,
        vi.precio_unitario,
        vi.cantidad,
        s.id_categoria
      FROM venta_items vi
      LEFT JOIN servicios s ON s.id = vi.id_servicio
      WHERE vi.id_venta = NEW.id_venta
    LOOP
      -- Determinar empleado: del item o de la cita
      v_id_empleado := v_item.id_empleado;
      IF v_id_empleado IS NULL AND NEW.id_cita IS NOT NULL THEN
        SELECT id_empleado INTO v_id_empleado
        FROM agendas
        WHERE id = NEW.id_cita;
      END IF;
      
      -- Si no hay empleado asignado, no se puede calcular comisión
      CONTINUE WHEN v_id_empleado IS NULL;
      
      v_id_servicio := v_item.id_servicio;
      v_id_categoria := v_item.id_categoria;
      
      -- Usar precio_final_mxn si existe, sino usar precio_unitario
      v_precio_final := COALESCE(v_item.precio_final_mxn, v_item.precio_unitario);
      v_base_mxn := v_precio_final * COALESCE(v_item.cantidad, 1);
      
      -- Resolver regla de comisión aplicable
      SELECT * INTO v_regla
      FROM resolver_regla_comision(
        v_id_empleado,
        v_id_servicio,
        v_id_categoria,
        v_fecha_ingreso
      );
      
      -- Si hay regla aplicable, calcular comisión
      IF FOUND THEN
        v_porcentaje := v_regla.porcentaje;
        v_comision_mxn := ROUND((v_base_mxn * v_porcentaje / 100)::numeric, 2);
        
        -- Insertar registro de comisión
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
          v_fecha_ingreso,
          v_fecha_ingreso,
          'pendiente',
          'Comisión generada automáticamente - Regla ID: ' || v_regla.id_regla
        );
        
        RAISE NOTICE 'Comisión generada: empleado=%, monto=%, porcentaje=%', v_id_empleado, v_comision_mxn, v_porcentaje;
      ELSE
        RAISE NOTICE 'No se encontró regla de comisión para: empleado=%, servicio=%, categoria=%, fecha=%', 
          v_id_empleado, v_id_servicio, v_id_categoria, v_fecha_ingreso;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION registrar_comision_automatica() IS 'Registra automáticamente comisiones cuando se reconoce un ingreso. Maneja precio_final_mxn NULL usando precio_unitario como fallback';