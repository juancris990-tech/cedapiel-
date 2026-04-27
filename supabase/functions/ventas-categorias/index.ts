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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const pathname = url.pathname;

    // GET /ventas-categorias - lista completa
    if (req.method === 'GET' && pathname === '/ventas-categorias') {
      const { data, error } = await supabase
        .from('ventas_por_categoria_servicio')
        .select('*')
        .order('cantidad_servicios', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /ventas-categorias/top - top categorías por cantidad
    if (req.method === 'GET' && pathname.includes('/top')) {
      const limit = url.searchParams.get('limit') || '10';
      
      const { data, error } = await supabase
        .from('ventas_por_categoria_servicio')
        .select('*')
        .order('cantidad_servicios', { ascending: false })
        .limit(parseInt(limit));

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /ventas-categorias/{categoria} - detalle de categoría específica
    if (req.method === 'GET' && pathname.match(/\/ventas-categorias\/[^/]+$/)) {
      const categoria = decodeURIComponent(pathname.split('/ventas-categorias/')[1]);
      
      const { data, error } = await supabase
        .from('ventas_por_categoria_servicio')
        .select('*')
        .ilike('categoria_servicio', `%${categoria}%`);

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /ventas-categorias - eliminar todos los registros
    if (req.method === 'DELETE' && pathname === '/ventas-categorias') {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = roles?.some(r => r.role === 'admin');
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Solo administradores pueden eliminar todos los registros' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('ventas_por_categoria_servicio')
        .delete()
        .neq('id', 0);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true, message: 'Todos los registros eliminados' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /ventas-categorias/{id} - eliminar registro específico
    if (req.method === 'DELETE' && pathname.match(/\/ventas-categorias\/\d+/)) {
      const id = pathname.split('/').pop();
      
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const isAdmin = roles?.some(r => r.role === 'admin');
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: 'Solo administradores pueden eliminar' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase
        .from('ventas_por_categoria_servicio')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
