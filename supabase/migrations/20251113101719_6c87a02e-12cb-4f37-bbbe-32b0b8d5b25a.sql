-- ============================================
-- CRM + AUTOMATION SYSTEM DATABASE SCHEMA
-- ============================================

-- 1. Leads Table (CRM lightweight)
CREATE TABLE IF NOT EXISTS public.leads (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(50),
  email VARCHAR(255),
  canal_origen VARCHAR(50),
  pipeline_stage VARCHAR(100) DEFAULT 'lead_nuevo',
  cita_id BIGINT REFERENCES public.agendas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tags Table
CREATE TABLE IF NOT EXISTS public.tags (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  color VARCHAR(7) DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Lead Tags Junction Table
CREATE TABLE IF NOT EXISTS public.lead_tags (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

-- 4. Automation Rules Table
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  trigger_type VARCHAR(100) NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '[]',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Webhook Configurations Table
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  eventos JSONB NOT NULL DEFAULT '[]',
  headers JSONB DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Webhook Logs Table
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id BIGSERIAL PRIMARY KEY,
  webhook_config_id BIGINT REFERENCES public.webhook_configs(id) ON DELETE SET NULL,
  evento VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
  id BIGSERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  permisos JSONB NOT NULL DEFAULT '{}',
  activo BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- 8. Automation Logs Table
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id BIGSERIAL PRIMARY KEY,
  automation_rule_id BIGINT REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  trigger_event VARCHAR(100) NOT NULL,
  trigger_data JSONB,
  actions_executed JSONB,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Add missing columns to agendas table if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agendas' AND column_name='origen') THEN
    ALTER TABLE public.agendas ADD COLUMN origen VARCHAR(50) DEFAULT 'manual';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='agendas' AND column_name='google_event_id') THEN
    ALTER TABLE public.agendas ADD COLUMN google_event_id VARCHAR(255);
  END IF;
END $$;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_telefono ON public.leads(telefono);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_pipeline_stage ON public.leads(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_lead_tags_lead_id ON public.lead_tags(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag_id ON public.lead_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.automation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_agendas_origen ON public.agendas(origen);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_configs_updated_at
  BEFORE UPDATE ON public.webhook_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Usuarios autenticados pueden leer leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear leads"
  ON public.leads FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (true);

-- Tags policies
CREATE POLICY "Usuarios autenticados pueden leer tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin puede gestionar tags"
  ON public.tags FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Lead tags policies
CREATE POLICY "Usuarios autenticados pueden leer lead_tags"
  ON public.lead_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar lead_tags"
  ON public.lead_tags FOR ALL
  TO authenticated
  USING (true);

-- Automation rules policies
CREATE POLICY "Usuarios autenticados pueden leer automation_rules"
  ON public.automation_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin puede gestionar automation_rules"
  ON public.automation_rules FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Webhook configs policies
CREATE POLICY "Admin puede gestionar webhook_configs"
  ON public.webhook_configs FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Webhook logs policies (read only)
CREATE POLICY "Usuarios autenticados pueden leer webhook_logs"
  ON public.webhook_logs FOR SELECT
  TO authenticated
  USING (true);

-- API keys policies (admin only)
CREATE POLICY "Admin puede gestionar api_keys"
  ON public.api_keys FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Automation logs policies (read only)
CREATE POLICY "Usuarios autenticados pueden leer automation_logs"
  ON public.automation_logs FOR SELECT
  TO authenticated
  USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default tags
INSERT INTO public.tags (nombre, descripcion, color) VALUES
  ('confirmado', 'Cita confirmada por el paciente', '#10b981'),
  ('pendiente', 'Esperando confirmación', '#f59e0b'),
  ('interesado', 'Mostró interés en agendar', '#3b82f6'),
  ('no_contactado', 'No se ha logrado contactar', '#6b7280'),
  ('cancelado', 'Canceló la cita', '#ef4444')
ON CONFLICT (nombre) DO NOTHING;

-- Insert default pipeline stages as automation rule examples
INSERT INTO public.automation_rules (nombre, trigger_type, trigger_config, actions, activo) VALUES
  (
    'Auto-confirmar cita cuando se agrega tag confirmado',
    'on_tag_added',
    '{"tag": "confirmado"}',
    '[{"type": "update_appointment", "estado": "confirmada"}]',
    true
  ),
  (
    'Mover lead a etapa confirmada cuando cita es confirmada',
    'on_appointment_confirmed',
    '{}',
    '[{"type": "update_lead_stage", "stage": "cita_confirmada"}, {"type": "add_tag", "tag": "confirmado"}]',
    true
  )
ON CONFLICT DO NOTHING;