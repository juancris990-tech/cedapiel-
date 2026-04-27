import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create client with user's auth token for RLS
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // GET /citas-canceladas - List all with filters
    if (method === 'GET' && pathParts.length === 1) {
      const sucursal = url.searchParams.get('sucursal');
      const profesional = url.searchParams.get('profesional');
      const estado = url.searchParams.get('estado');
      const servicio = url.searchParams.get('servicio');
      const fecha_inicio = url.searchParams.get('fecha_inicio');
      const fecha_fin = url.searchParams.get('fecha_fin');
      const search = url.searchParams.get('search');
      const order_by = url.searchParams.get('order_by') || 'fecha_cita';
      const order_dir = url.searchParams.get('order_dir') || 'desc';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');

      let query = supabase
        .from('citas_canceladas')
        .select('*', { count: 'exact' });

      // Apply filters
      if (sucursal) query = query.eq('sucursal', sucursal);
      if (profesional) query = query.eq('profesional', profesional);
      if (estado) query = query.eq('estado', estado);
      if (servicio) query = query.ilike('servicio', `%${servicio}%`);
      if (fecha_inicio) query = query.gte('fecha_cita', fecha_inicio);
      if (fecha_fin) query = query.lte('fecha_cita', fecha_fin);
      
      if (search) {
        query = query.or(`cliente.ilike.%${search}%,profesional.ilike.%${search}%,servicio.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Apply ordering
      query = query.order(order_by, { ascending: order_dir === 'asc' });

      // Apply pagination
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({
        data,
        count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /citas-canceladas/{id} - Get by ID
    if (method === 'GET' && pathParts.length === 2) {
      const id = pathParts[1];
      
      const { data, error } = await supabase
        .from('citas_canceladas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // POST /citas-canceladas - Create new record
    if (method === 'POST' && pathParts.length === 1) {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('citas_canceladas')
        .insert(body)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /citas-canceladas/{id} - Update record
    if (method === 'PUT' && pathParts.length === 2) {
      const id = pathParts[1];
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('citas_canceladas')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /citas-canceladas/{id} - Delete record
    if (method === 'DELETE' && pathParts.length === 2) {
      const id = pathParts[1];
      
      const { error } = await supabase
        .from('citas_canceladas')
        .delete()
        .eq('id', id);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});