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
    const leadId = pathParts[pathParts.length - 1];
    const action = pathParts[pathParts.length - 2];

    // GET /api/crm/leads - List leads
    if (req.method === 'GET' && (leadId === 'leads' || !leadId)) {
      const pipeline_stage = url.searchParams.get('pipeline_stage');
      
      let query = supabase
        .from('leads')
        .select(`
          *,
          tags:lead_tags(tag:tags(*)),
          cita:agendas(id, fecha, hora_inicio, estado)
        `)
        .order('created_at', { ascending: false });

      if (pipeline_stage) {
        query = query.eq('pipeline_stage', pipeline_stage);
      }

      const { data: leads, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ leads, total: leads.length }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /api/crm/leads/:id - Get single lead
    if (req.method === 'GET' && leadId && leadId !== 'leads') {
      const { data: lead, error } = await supabase
        .from('leads')
        .select(`
          *,
          tags:lead_tags(tag:tags(*)),
          cita:agendas(*)
        `)
        .eq('id', parseInt(leadId))
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(lead), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /api/crm/leads - Create lead
    if (req.method === 'POST') {
      const body = await req.json();
      const { nombre, telefono, email, canal_origen, pipeline_stage = 'lead_nuevo', cita_id } = body;

      if (!nombre) {
        return new Response(JSON.stringify({ error: 'nombre es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: newLead, error } = await supabase
        .from('leads')
        .insert({
          nombre,
          telefono,
          email,
          canal_origen,
          pipeline_stage,
          cita_id
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(newLead), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /api/crm/leads/:id - Update lead
    if (req.method === 'PATCH' && leadId && action !== 'tags') {
      const body = await req.json();
      const oldPipelineStage = body._old_pipeline_stage;
      delete body._old_pipeline_stage;

      const { data: updated, error } = await supabase
        .from('leads')
        .update(body)
        .eq('id', parseInt(leadId))
        .select()
        .single();

      if (error) throw error;

      // Trigger automation if pipeline stage changed
      if (body.pipeline_stage && body.pipeline_stage !== oldPipelineStage) {
        await triggerAutomation(supabase, 'on_pipeline_stage_changed', {
          lead_id: updated.id,
          old_stage: oldPipelineStage,
          new_stage: body.pipeline_stage
        });
      }

      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /api/crm/leads/:id/tags - Manage tags
    if (req.method === 'PATCH' && action === 'tags') {
      const body = await req.json();
      const { add = [], remove = [] } = body;

      // Add tags
      for (const tagName of add) {
        // Get or create tag
        let { data: tag } = await supabase
          .from('tags')
          .select('id')
          .eq('nombre', tagName)
          .single();

        if (!tag) {
          const { data: newTag } = await supabase
            .from('tags')
            .insert({ nombre: tagName })
            .select()
            .single();
          tag = newTag;
        }

        if (tag) {
          await supabase
            .from('lead_tags')
            .upsert({ lead_id: parseInt(leadId), tag_id: tag.id }, { onConflict: 'lead_id,tag_id', ignoreDuplicates: true });

          // Trigger automation
          await triggerAutomation(supabase, 'on_tag_added', {
            lead_id: parseInt(leadId),
            tag: tagName
          });
        }
      }

      // Remove tags
      for (const tagName of remove) {
        const { data: tag } = await supabase
          .from('tags')
          .select('id')
          .eq('nombre', tagName)
          .single();

        if (tag) {
          await supabase
            .from('lead_tags')
            .delete()
            .eq('lead_id', parseInt(leadId))
            .eq('tag_id', tag.id);

          // Trigger automation
          await triggerAutomation(supabase, 'on_tag_removed', {
            lead_id: parseInt(leadId),
            tag: tagName
          });
        }
      }

      // Get updated lead with tags
      const { data: updatedLead } = await supabase
        .from('leads')
        .select(`*, tags:lead_tags(tag:tags(*))`)
        .eq('id', parseInt(leadId))
        .single();

      return new Response(JSON.stringify(updatedLead), {
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
      // Check if trigger config matches
      const configMatches = Object.keys(rule.trigger_config).every(key => {
        return rule.trigger_config[key] === data[key];
      });

      if (configMatches || Object.keys(rule.trigger_config).length === 0) {
        await executeAutomation(supabase, rule, data);
      }
    }
  } catch (error) {
    console.error('Automation trigger error:', error);
  }
}

async function executeAutomation(supabase: any, rule: any, triggerData: any) {
  try {
    const actionsExecuted = [];
    
    for (const action of rule.actions) {
      if (action.type === 'update_lead_stage') {
        await supabase
          .from('leads')
          .update({ pipeline_stage: action.stage })
          .eq('id', triggerData.lead_id);
        actionsExecuted.push({ type: 'update_lead_stage', status: 'success' });
      } else if (action.type === 'add_tag') {
        const { data: tag } = await supabase
          .from('tags')
          .select('id')
          .eq('nombre', action.tag)
          .single();

        if (tag) {
          await supabase
            .from('lead_tags')
            .insert({ lead_id: triggerData.lead_id, tag_id: tag.id })
            .onConflict('lead_id,tag_id')
            .ignore();
          actionsExecuted.push({ type: 'add_tag', status: 'success' });
        }
      } else if (action.type === 'update_appointment') {
        const { data: lead } = await supabase
          .from('leads')
          .select('cita_id')
          .eq('id', triggerData.lead_id)
          .single();

        if (lead?.cita_id) {
          await supabase
            .from('agendas')
            .update({ estado: action.estado })
            .eq('id', lead.cita_id);
          actionsExecuted.push({ type: 'update_appointment', status: 'success' });
        }
      }
    }

    await supabase.from('automation_logs').insert({
      automation_rule_id: rule.id,
      trigger_event: rule.trigger_type,
      trigger_data: triggerData,
      actions_executed: actionsExecuted,
      success: true
    });
  } catch (error) {
    console.error('Automation execution error:', error);
  }
}
