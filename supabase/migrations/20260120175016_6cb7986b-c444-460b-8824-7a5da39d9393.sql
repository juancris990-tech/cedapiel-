-- Agregar políticas faltantes para pagos (solo SELECT y DELETE si no existen)
DO $$
BEGIN
  -- Crear política SELECT si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pagos' 
    AND policyname = 'Usuarios autenticados pueden ver pagos'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden ver pagos"
    ON public.pagos FOR SELECT TO authenticated USING (true);
  END IF;

  -- Crear política INSERT si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pagos' 
    AND policyname = 'Usuarios autenticados pueden insertar pagos'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden insertar pagos"
    ON public.pagos FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  -- Crear política DELETE si no existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'pagos' 
    AND policyname = 'Usuarios autenticados pueden eliminar pagos'
  ) THEN
    CREATE POLICY "Usuarios autenticados pueden eliminar pagos"
    ON public.pagos FOR DELETE TO authenticated USING (true);
  END IF;
END $$;