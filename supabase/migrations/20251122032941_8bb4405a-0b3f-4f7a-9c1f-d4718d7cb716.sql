-- Primero, eliminar todos los datos existentes de la tabla
DELETE FROM resumen_productividad_personal;

-- Eliminar la tabla actual para recrearla con la estructura simplificada
DROP TABLE IF EXISTS resumen_productividad_personal;

-- Crear la tabla simplificada con solo las columnas esenciales
CREATE TABLE resumen_productividad_personal (
  id BIGSERIAL PRIMARY KEY,
  profesional TEXT NOT NULL,
  servicio TEXT NOT NULL,
  completadas INTEGER DEFAULT 0,
  no_show INTEGER DEFAULT 0,
  canceladas INTEGER DEFAULT 0,
  facturado_mxn NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE resumen_productividad_personal ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Usuarios autenticados pueden leer productividad"
  ON resumen_productividad_personal
  FOR SELECT
  USING (true);

CREATE POLICY "Admin y gerencia pueden crear productividad"
  ON resumen_productividad_personal
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Admin y gerencia pueden actualizar productividad"
  ON resumen_productividad_personal
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'gerencia') OR 
    has_role(auth.uid(), 'direccion')
  );

CREATE POLICY "Solo admin puede eliminar productividad"
  ON resumen_productividad_personal
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));