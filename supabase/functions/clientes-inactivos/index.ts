import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const id = pathParts[pathParts.length - 1];

    // GET - List all or get by ID
    if (req.method === 'GET') {
      // Get single record by ID
      if (id && id !== 'clientes-inactivos' && !isNaN(Number(id))) {
        const { data, error } = await supabase
          .from('clientes_inactivos')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify(data),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // List with filters and pagination
      let query = supabase.from('clientes_inactivos').select('*', { count: 'exact' });

      // Filters
      const profesional = url.searchParams.get('profesional');
      const dias_min = url.searchParams.get('dias_min');
      const dias_max = url.searchParams.get('dias_max');
      const ultimo_servicio = url.searchParams.get('ultimo_servicio');
      const estado = url.searchParams.get('estado');
      const search = url.searchParams.get('search');

      if (profesional) {
        query = query.eq('profesional', profesional);
      }
      if (dias_min) {
        query = query.gte('dias_sin_volver', parseInt(dias_min));
      }
      if (dias_max) {
        query = query.lte('dias_sin_volver', parseInt(dias_max));
      }
      if (ultimo_servicio) {
        query = query.ilike('ultimo_servicio', `%${ultimo_servicio}%`);
      }
      if (estado) {
        query = query.eq('estado', estado);
      }
      if (search) {
        query = query.or(`cliente.ilike.%${search}%,email.ilike.%${search}%,telefono.ilike.%${search}%,numero_sms.ilike.%${search}%`);
      }

      // Sorting
      const orderBy = url.searchParams.get('order_by') || 'dias_sin_volver';
      const orderDir = url.searchParams.get('order_dir') || 'desc';
      query = query.order(orderBy, { ascending: orderDir === 'asc' });

      // Pagination
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          data,
          pagination: {
            page,
            limit,
            total: count,
            pages: Math.ceil((count || 0) / limit)
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Create new record
    if (req.method === 'POST') {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('clientes_inactivos')
        .insert(body)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT - Update record
    if (req.method === 'PUT') {
      if (!id || isNaN(Number(id))) {
        return new Response(
          JSON.stringify({ error: 'ID requerido para actualizar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      
      const { data, error } = await supabase
        .from('clientes_inactivos')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Delete record
    if (req.method === 'DELETE') {
      if (!id || isNaN(Number(id))) {
        return new Response(
          JSON.stringify({ error: 'ID requerido para eliminar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('clientes_inactivos')
        .delete()
        .eq('id', id);

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Registro eliminado exitosamente' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Método no permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
