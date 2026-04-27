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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Crear cliente con auth token del usuario
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const searchTerm = url.searchParams.get('search') || '';
    const sortBy = url.searchParams.get('sortBy') || 'monto_facturado_final_mxn';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    
    // Filtros
    const montoMin = url.searchParams.get('montoMin');
    const montoMax = url.searchParams.get('montoMax');
    const citasMin = url.searchParams.get('citasMin');
    const citasMax = url.searchParams.get('citasMax');
    const conEmail = url.searchParams.get('conEmail');

    let query = supabase
      .from('gasto_clientes_periodo')
      .select('*', { count: 'exact' });

    // Búsqueda
    if (searchTerm) {
      query = query.or(`cliente.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefono.ilike.%${searchTerm}%`);
    }

    // Filtros
    if (montoMin) {
      query = query.gte('monto_facturado_final_mxn', parseFloat(montoMin));
    }
    if (montoMax) {
      query = query.lte('monto_facturado_final_mxn', parseFloat(montoMax));
    }
    if (citasMin) {
      query = query.gte('cantidad_citas_periodo', parseInt(citasMin));
    }
    if (citasMax) {
      query = query.lte('cantidad_citas_periodo', parseInt(citasMax));
    }
    if (conEmail === 'true') {
      query = query.not('email', 'is', null);
    } else if (conEmail === 'false') {
      query = query.is('email', null);
    }

    // Acción especial: top gastadores o más citas
    if (action === 'top-gasto') {
      query = query.order('monto_facturado_final_mxn', { ascending: false }).limit(10);
    } else if (action === 'mas-citas') {
      query = query.order('cantidad_citas_periodo', { ascending: false }).limit(10);
    } else {
      // Ordenamiento y paginación normal
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range((page - 1) * limit, page * limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error consultando datos:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        data,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: count ? Math.ceil(count / limit) : 0
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error en consulta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        error: 'Error al procesar la consulta',
        details: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
