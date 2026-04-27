import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: authHeader
          } 
        } 
      }
    );

    const url = new URL(req.url);
    const path = url.pathname.replace('/clientes-reporte-api', '');
    const method = req.method;

    // GET /clientes → lista completa
    if (method === 'GET' && path === '/clientes') {
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /clientes/:id → detalle
    const matchDetail = path.match(/^\/clientes\/(\d+)$/);
    if (method === 'GET' && matchDetail) {
      const id = parseInt(matchDetail[1]);
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /clientes/vip → solo clientes VIP
    if (method === 'GET' && path === '/clientes/vip') {
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('*')
        .eq('es_vip', true)
        .order('cantidad_citas', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /clientes/ausentes/:semanas
    const matchAusentes = path.match(/^\/clientes\/ausentes\/(\d+)$/);
    if (method === 'GET' && matchAusentes) {
      const semanas = parseInt(matchAusentes[1]);
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('*')
        .gte('semanas_ausente', semanas)
        .order('semanas_ausente', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /clientes/profesional/:nombre
    const matchProfesional = path.match(/^\/clientes\/profesional\/(.+)$/);
    if (method === 'GET' && matchProfesional) {
      const nombre = decodeURIComponent(matchProfesional[1]);
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('*')
        .eq('profesional_ultimo_servicio', nombre)
        .order('fecha_ultimo_servicio', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /clientes/ciudad/:nombre
    const matchCiudad = path.match(/^\/clientes\/ciudad\/(.+)$/);
    if (method === 'GET' && matchCiudad) {
      const ciudad = decodeURIComponent(matchCiudad[1]);
      const { data, error } = await supabase
        .from('clientes_reporte')
        .select('*')
        .eq('ciudad', ciudad)
        .order('nombre_completo');

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /clientes/:id → actualizar
    const matchUpdate = path.match(/^\/clientes\/(\d+)$/);
    if (method === 'PUT' && matchUpdate) {
      const id = parseInt(matchUpdate[1]);
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('clientes_reporte')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /clientes/:id → eliminar
    const matchDelete = path.match(/^\/clientes\/(\d+)$/);
    if (method === 'DELETE' && matchDelete) {
      const id = parseInt(matchDelete[1]);
      const { error } = await supabase
        .from('clientes_reporte')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(
      JSON.stringify({ error: 'Ruta no encontrada' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});