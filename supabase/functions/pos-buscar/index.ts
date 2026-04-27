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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const tipo = url.searchParams.get('tipo');
    const q = url.searchParams.get('q') || '';
    const categoria = url.searchParams.get('categoria');

    console.log('POS Búsqueda:', { tipo, q, categoria, pathname: url.pathname });

    let results: any[] = [];

    if (tipo === 'servicio') {
      let query = supabaseClient
        .from('servicios')
        .select(`
          id,
          nombre,
          precio,
          id_categoria,
          activo
        `)
        .eq('activo', true);

      if (q) {
        query = query.ilike('nombre', `%${q}%`);
      }

      if (categoria) {
        query = query.eq('id_categoria', parseInt(categoria));
      }

      const { data, error } = await query.order('nombre');

      if (error) {
        console.error('Error buscando servicios:', error);
        throw error;
      }

      results = (data || []).map((item: any) => ({
        id: item.id,
        tipo: 'servicio',
        nombre: item.nombre,
        precio_lista_mxn: item.precio,
        categoria: 'Servicio',
        stock: null
      }));

    } else if (tipo === 'producto') {
      let query = supabaseClient
        .from('productos')
        .select(`
          id,
          nombre,
          sku,
          categoria,
          esta_activo,
          precio_venta_mxn
        `)
        .eq('esta_activo', true);

      if (q) {
        query = query.or(`nombre.ilike.%${q}%,sku.ilike.%${q}%`);
      }

      if (categoria) {
        query = query.eq('categoria', categoria);
      }

      const { data, error } = await query.order('nombre');

      if (error) {
        console.error('Error buscando productos:', error);
        throw error;
      }

      // Obtener stock para cada producto
      const productosConInfo = await Promise.all(
        (data || []).map(async (item: any) => {
          // Obtener stock total
          const { data: stockData } = await supabaseClient
            .from('stock_actual')
            .select('cantidad_actual')
            .eq('id_producto', item.id);

          const stockTotal = stockData?.reduce(
            (sum: number, s: any) => sum + (parseFloat(s.cantidad_actual) || 0),
            0
          ) || 0;

          // Si no tiene precio de venta, obtener costo del lote como fallback
          let precio = item.precio_venta_mxn || 0;
          if (!precio || precio === 0) {
            const { data: loteData } = await supabaseClient
              .from('lotes_producto')
              .select('costo_unitario_mxn')
              .eq('id_producto', item.id)
              .order('fecha_registro_lote', { ascending: false })
              .limit(1)
              .single();
            precio = loteData?.costo_unitario_mxn || 0;
          }

          return {
            id: item.id,
            tipo: 'producto',
            nombre: item.nombre,
            sku: item.sku,
            precio_lista_mxn: precio,
            categoria: item.categoria || 'Sin categoría',
            stock: Math.floor(stockTotal)
          };
        })
      );

      results = productosConInfo;
    } else {
      return new Response(JSON.stringify({ error: 'Tipo debe ser servicio o producto' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ items: results }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en pos-buscar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
