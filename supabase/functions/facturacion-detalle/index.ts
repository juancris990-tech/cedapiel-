import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const method = req.method;
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // GET /facturacion-detalle - Listar todos
    // GET /facturacion-detalle?id_factura=X - Filtrar por id_factura
    // GET /facturacion-detalle?fecha_inicio=X&fecha_fin=Y - Filtrar por rango de fechas
    if (method === 'GET' && pathSegments.length === 1) {
      const idFactura = url.searchParams.get('id_factura');
      const fechaInicio = url.searchParams.get('fecha_inicio');
      const fechaFin = url.searchParams.get('fecha_fin');
      const cliente = url.searchParams.get('cliente');
      const clienteId = url.searchParams.get('cliente_id');
      const sucursal = url.searchParams.get('sucursal');
      const tipo = url.searchParams.get('tipo');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('facturacion_detalle')
        .select('*', { count: 'exact' });

      if (idFactura) query = query.eq('id_factura', idFactura);
      if (fechaInicio) query = query.gte('fecha', fechaInicio);
      if (fechaFin) query = query.lte('fecha', fechaFin);
      if (cliente) query = query.ilike('cliente', `%${cliente}%`);
      
      // Si se proporciona clienteId, buscar el nombre del cliente en clientes_reporte
      if (clienteId) {
        const { data: clienteData } = await supabase
          .from('clientes_reporte')
          .select('nombre_completo')
          .eq('cliente_id', clienteId)
          .single();
        
        if (clienteData?.nombre_completo) {
          query = query.ilike('cliente', `%${clienteData.nombre_completo}%`);
        }
      }
      
      if (sucursal) query = query.ilike('sucursal', `%${sucursal}%`);
      if (tipo) query = query.eq('tipo', tipo);

      query = query
        .order('fecha', { ascending: false })
        .order('id_factura', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ 
          data, 
          count,
          page,
          limit,
          total_pages: Math.ceil((count || 0) / limit)
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /facturacion-detalle/:id - Obtener por ID
    if (method === 'GET' && pathSegments.length === 2) {
      const id = pathSegments[1];
      const { data, error } = await supabase
        .from('facturacion_detalle')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /facturacion-detalle - Crear nuevo registro
    if (method === 'POST' && pathSegments.length === 1) {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('facturacion_detalle')
        .insert(body)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /facturacion-detalle/:id - Actualizar registro
    if (method === 'PUT' && pathSegments.length === 2) {
      const id = pathSegments[1];
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('facturacion_detalle')
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

    // DELETE /facturacion-detalle/:id - Eliminar registro
    if (method === 'DELETE' && pathSegments.length === 2) {
      const id = pathSegments[1];
      
      const { error } = await supabase
        .from('facturacion_detalle')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: 'Registro eliminado exitosamente' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ruta no encontrada
    return new Response(
      JSON.stringify({ error: 'Ruta no encontrada' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
