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

    // POST /api/webhooks/events - Emit webhook event
    if (req.method === 'POST') {
      const body = await req.json();
      const { event, ...payload } = body;

      if (!event) {
        return new Response(JSON.stringify({ error: 'event es requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get active webhooks that listen to this event
      const { data: webhooks, error: webhooksError } = await supabase
        .from('webhook_configs')
        .select('*')
        .eq('activo', true)
        .contains('eventos', [event]);

      if (webhooksError) throw webhooksError;

      const results = [];

      // Send to all matching webhooks
      for (const webhook of webhooks || []) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...webhook.headers
          };

          const response = await fetch(webhook.url, {
            method: 'POST',
            headers,
            body: JSON.stringify({ event, timestamp: new Date().toISOString(), ...payload })
          });

          const responseBody = await response.text();

          // Log the webhook delivery
          await supabase.from('webhook_logs').insert({
            webhook_config_id: webhook.id,
            evento: event,
            payload,
            status_code: response.status,
            response_body: responseBody
          });

          results.push({
            webhook_id: webhook.id,
            webhook_name: webhook.nombre,
            status: response.status,
            success: response.ok
          });

        } catch (error) {
          // Log failed webhook delivery
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await supabase.from('webhook_logs').insert({
            webhook_config_id: webhook.id,
            evento: event,
            payload,
            error_message: errorMessage
          });

          results.push({
            webhook_id: webhook.id,
            webhook_name: webhook.nombre,
            success: false,
            error: errorMessage
          });
        }
      }

      return new Response(JSON.stringify({
        event,
        webhooks_notified: results.length,
        results
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /api/webhooks/configs - List webhook configurations (admin only)
    if (req.method === 'GET') {
      const { data: webhooks, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ webhooks }), {
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
