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
    const path = url.pathname.replace('/ventas-detalle-api', '');
    const method = req.method;

    // GET /ventas → lista completa (paginada)
    if (method === 'GET' && path === '/ventas') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '100');
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('ventas_detalle')
        .select('*', { count: 'exact' })
        .order('fecha_venta', { ascending: false })
        .order('id_factura', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return new Response(JSON.stringify({ 
        data, 
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /ventas/:id → detalle
    const matchDetail = path.match(/^\/ventas\/(\d+)$/);
    if (method === 'GET' && matchDetail) {
      const id = parseInt(matchDetail[1]);
      const { data, error } = await supabase
        .from('ventas_detalle')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /ventas/factura/:id_factura → todas las líneas de una factura
    const matchFactura = path.match(/^\/ventas\/factura\/(.+)$/);
    if (method === 'GET' && matchFactura) {
      const id_factura = decodeURIComponent(matchFactura[1]);
      const { data, error } = await supabase
        .from('ventas_detalle')
        .select('*')
        .eq('id_factura', id_factura)
        .order('id');

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /ventas/sucursal/:nombre
    const matchSucursal = path.match(/^\/ventas\/sucursal\/(.+)$/);
    if (method === 'GET' && matchSucursal) {
      const sucursal = decodeURIComponent(matchSucursal[1]);
      const { data, error } = await supabase
        .from('ventas_detalle')
        .select('*')
        .eq('sucursal', sucursal)
        .order('fecha_venta', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /ventas/profesional/:nombre
    const matchProfesional = path.match(/^\/ventas\/profesional\/(.+)$/);
    if (method === 'GET' && matchProfesional) {
      const profesional = decodeURIComponent(matchProfesional[1]);
      const { data, error } = await supabase
        .from('ventas_detalle')
        .select('*')
        .eq('profesional', profesional)
        .order('fecha_venta', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /ventas/tipo/:tipo
    const matchTipo = path.match(/^\/ventas\/tipo\/(.+)$/);
    if (method === 'GET' && matchTipo) {
      const tipo = decodeURIComponent(matchTipo[1]);
      const { data, error } = await supabase
        .from('ventas_detalle')
        .select('*')
        .eq('tipo', tipo)
        .order('fecha_venta', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // GET /ventas/cliente/:nombre
    const matchCliente = path.match(/^\/ventas\/cliente\/(.+)$/);
    if (method === 'GET' && matchCliente) {
      const cliente = decodeURIComponent(matchCliente[1]);
      const { data, error } = await supabase
        .from('ventas_detalle')
        .select('*')
        .ilike('cliente', `%${cliente}%`)
        .order('fecha_venta', { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PUT /ventas/:id → actualizar
    const matchUpdate = path.match(/^\/ventas\/(\d+)$/);
    if (method === 'PUT' && matchUpdate) {
      const id = parseInt(matchUpdate[1]);
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('ventas_detalle')
        .update(body)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // DELETE /ventas/:id → eliminar
    const matchDelete = path.match(/^\/ventas\/(\d+)$/);
    if (method === 'DELETE' && matchDelete) {
      const id = parseInt(matchDelete[1]);
      const { error } = await supabase
        .from('ventas_detalle')
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