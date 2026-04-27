-- Eliminar el trigger y función con CASCADE
DROP FUNCTION IF EXISTS update_venta_items_updated_at() CASCADE;

-- Agregar columna updated_at si no existe
ALTER TABLE venta_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Recrear la función y trigger correctamente  
CREATE OR REPLACE FUNCTION update_venta_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_venta_items_updated_at_trigger
BEFORE UPDATE ON venta_items
FOR EACH ROW
EXECUTE FUNCTION update_venta_items_updated_at();