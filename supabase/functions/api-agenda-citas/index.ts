import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate API key or auth token
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');
    
    if (!apiKey && !authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const citaId = pathParts[pathParts.length - 1];
    const action = pathParts[pathParts.length - 2];

    // GET /api/agenda/citas/:id
    if (req.method === 'GET' && citaId && citaId !== 'citas') {
      const { data: cita, error } = await supabase
        .from('agendas')
        .select(`
          *,
          cliente:clientes(id, nombre, apellidos, telefono, email),
          empleado:empleados(id, nombre, apellidos, especialidad),
          sucursal:sucursales(id, nombre, direccion),
          servicio:servicios(id, nombre, precio_mxn, duracion_minutos)
        `)
        .eq('id', parseInt(citaId))
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(cita), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/agenda/citas - Create appointment
    if (req.method === 'POST') {
      const body = await req.json();
      const { cliente_id, doctor_id, sucursal_id, servicio_id, fecha_inicio, fecha_fin, origen = 'api' } = body;

      // Validation
      if (!cliente_id || !doctor_id || !sucursal_id || !servicio_id || !fecha_inicio) {
        return new Response(JSON.stringify({ error: 'Campos requeridos: cliente_id, doctor_id, sucursal_id, servicio_id, fecha_inicio' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract date and time from fecha_inicio
      const startDate = new Date(fecha_inicio);
      const fecha = startDate.toISOString().split('T')[0];
      const hora_inicio = startDate.toTimeString().slice(0, 5);

      // Calculate duration
      let hora_fin = '';
      let duracion_minutos = 60;

      if (fecha_fin) {
        const endDate = new Date(fecha_fin);
        hora_fin = endDate.toTimeString().slice(0, 5);
        duracion_minutos = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
      } else {
        // Get service duration
        const { data: servicio } = await supabase
          .from('servicios')
          .select('duracion_minutos')
          .eq('id', servicio_id)
          .single();
        
        if (servicio) {
          duracion_minutos = servicio.duracion_minutos;
          const endDate = new Date(startDate.getTime() + duracion_minutos * 60000);
          hora_fin = endDate.toTimeString().slice(0, 5);
        }
      }

      // Create appointment
      const { data: nuevaCita, error } = await supabase
        .from('agendas')
        .insert({
          id_cliente: cliente_id,
          id_empleado: doctor_id,
          id_sucursal: sucursal_id,
          id_servicio: servicio_id,
          fecha,
          hora_inicio,
          hora_fin,
          duracion_minutos,
          estado: 'reservada',
          origen,
        })
        .select()
        .single();

      if (error) throw error;

      // Log action
      await supabase.from('bitacora_accion').insert({
        entidad: 'agendas',
        accion: 'crear_cita_api',
        id_entidad: nuevaCita.id,
        detalle_json: { origen, cliente_id, doctor_id }
      });

      // Trigger automation: on_appointment_created
      await triggerAutomation(supabase, 'on_appointment_created', { appointment_id: nuevaCita.id });

      return new Response(JSON.stringify(nuevaCita), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /api/agenda/citas/:id - Update appointment
    if (req.method === 'PATCH' && citaId && action !== 'cancelar') {
      const body = await req.json();
      
      const { data: updated, error } = await supabase
        .from('agendas')
        .update(body)
        .eq('id', parseInt(citaId))
        .select()
        .single();

      if (error) throw error;

      // Trigger automation based on estado change
      if (body.estado === 'confirmada') {
        await triggerAutomation(supabase, 'on_appointment_confirmed', { appointment_id: updated.id });
      }

      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /api/agenda/citas/:id/cancelar - Cancel appointment
    if (req.method === 'PATCH' && action === 'cancelar') {
      const body = await req.json();
      const { motivo, comentario } = body;

      const estado = motivo === 'clinica' ? 'cancelada_clinica' : 'cancelada_cliente';

      const { data: updated, error } = await supabase
        .from('agendas')
        .update({ estado, motivo_cancelacion: comentario })
        .eq('id', parseInt(citaId))
        .select()
        .single();

      if (error) throw error;

      // Trigger automation
      await triggerAutomation(supabase, 'on_appointment_cancelled', { appointment_id: updated.id, motivo });

      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function triggerAutomation(supabase: any, triggerType: string, data: any) {
  try {
    const { data: rules } = await supabase
      .from('automation_rules')
      .select('*')
      .eq('activo', true)
      .eq('trigger_type', triggerType);

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
      await executeAutomation(supabase, rule, data);
    }
  } catch (error) {
    console.error('Automation trigger error:', error);
  }
}

async function executeAutomation(supabase: any, rule: any, triggerData: any) {
  try {
    const actionsExecuted = [];
    
    for (const action of rule.actions) {
      if (action.type === 'update_appointment') {
        await supabase
          .from('agendas')
          .update({ estado: action.estado })
          .eq('id', triggerData.appointment_id);
        actionsExecuted.push({ type: 'update_appointment', status: 'success' });
      } else if (action.type === 'webhook') {
        await emitWebhook(supabase, action.webhook_event, triggerData);
        actionsExecuted.push({ type: 'webhook', status: 'success' });
      }
    }

    // Log automation execution
    await supabase.from('automation_logs').insert({
      automation_rule_id: rule.id,
      trigger_event: rule.trigger_type,
      trigger_data: triggerData,
      actions_executed: actionsExecuted,
      success: true
    });
  } catch (error) {
    console.error('Automation execution error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await supabase.from('automation_logs').insert({
      automation_rule_id: rule.id,
      trigger_event: rule.trigger_type,
      trigger_data: triggerData,
      actions_executed: [],
      success: false,
      error_message: errorMessage
    });
  }
}

async function emitWebhook(supabase: any, event: string, payload: any) {
  const { data: webhooks } = await supabase
    .from('webhook_configs')
    .select('*')
    .eq('activo', true)
    .contains('eventos', [event]);

  if (!webhooks || webhooks.length === 0) return;

  for (const webhook of webhooks) {
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...webhook.headers
        },
        body: JSON.stringify({ event, ...payload })
      });

      await supabase.from('webhook_logs').insert({
        webhook_config_id: webhook.id,
        evento: event,
        payload,
        status_code: response.status,
        response_body: await response.text()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await supabase.from('webhook_logs').insert({
        webhook_config_id: webhook.id,
        evento: event,
        payload,
        error_message: errorMessage
      });
    }
  }
}
