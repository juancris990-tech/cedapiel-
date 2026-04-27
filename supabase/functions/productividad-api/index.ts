import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuario no autenticado');
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    const method = req.method;

    // GET /productividad - Lista completa
    if (method === 'GET' && pathParts.length === 0) {
      const { data, error } = await supabase
        .from('resumen_productividad_personal')
        .select('id, profesional, servicio, completadas, no_show, canceladas, facturado_mxn, created_at')
        .order('facturado_mxn', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /productividad/{id}
    if (method === 'GET' && pathParts.length === 1 && !isNaN(Number(pathParts[0]))) {
      const id = parseInt(pathParts[0]);
      const { data, error } = await supabase
        .from('resumen_productividad_personal')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /productividad/profesional/{nombre}
    if (method === 'GET' && pathParts[0] === 'profesional' && pathParts.length === 2) {
      const nombre = decodeURIComponent(pathParts[1]);
      const { data, error } = await supabase
        .from('resumen_productividad_personal')
        .select('*')
        .eq('profesional', nombre)
        .order('facturado_mxn', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /productividad/servicio/{servicio}
    if (method === 'GET' && pathParts[0] === 'servicio' && pathParts.length === 2) {
      const servicio = decodeURIComponent(pathParts[1]);
      const { data, error } = await supabase
        .from('resumen_productividad_personal')
        .select('*')
        .eq('servicio', servicio)
        .order('facturado_mxn', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /productividad/top/ingresos
    if (method === 'GET' && pathParts[0] === 'top' && pathParts[1] === 'ingresos') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      
      const { data, error } = await supabase
        .from('resumen_productividad_personal')
        .select('profesional, servicio, facturado_mxn, completadas')
        .order('facturado_mxn', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /productividad/top/completadas
    if (method === 'GET' && pathParts[0] === 'top' && pathParts[1] === 'completadas') {
      const limit = parseInt(url.searchParams.get('limit') || '10');
      
      const { data, error } = await supabase
        .from('resumen_productividad_personal')
        .select('profesional, servicio, completadas, facturado_mxn')
        .order('completadas', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /productividad/{id}
    if (method === 'PUT' && pathParts.length === 1) {
      const id = parseInt(pathParts[0]);
      const body = await req.json();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasPermission = roles?.some(r => 
        ['admin', 'gerencia', 'direccion'].includes(r.role)
      );

      if (!hasPermission) {
        return new Response(
          JSON.stringify({ error: 'No tienes permisos para actualizar' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('resumen_productividad_personal')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /productividad/{id}
    if (method === 'DELETE' && pathParts.length === 1) {
      const id = parseInt(pathParts[0]);

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasPermission = roles?.some(r => r.role === 'admin');

      if (!hasPermission) {
        return new Response(
          JSON.stringify({ error: 'Solo admin puede eliminar' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('resumen_productividad_personal')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ruta no encontrada' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error en API:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error desconocido',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
