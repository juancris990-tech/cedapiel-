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
      console.log('No authorization header found');
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Auth header present, proceeding...');

    // Cliente con SERVICE_ROLE para bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar usuario usando el token del header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.log('User verification failed:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Usuario no válido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User verified:', user.id);

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { id_venta } = await req.json();

    if (!id_venta) {
      return new Response(
        JSON.stringify({ error: 'id_venta es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Eliminando venta ${id_venta} y registros relacionados...`);

    // 0. Obtener los IDs de venta_items para eliminar comisiones relacionadas
    const { data: ventaItems } = await supabaseAdmin
      .from('venta_items')
      .select('id')
      .eq('id_venta', id_venta);
    
    const itemIds = ventaItems?.map(item => item.id) || [];
    console.log(`Items encontrados: ${itemIds.length}`, itemIds);

    // 1. Eliminar comisiones por id_venta
    const { error: errorComisiones1 } = await supabaseAdmin
      .from('comisiones')
      .delete()
      .eq('id_venta', id_venta);
    
    if (errorComisiones1) {
      console.error('Error eliminando comisiones por id_venta:', errorComisiones1);
    } else {
      console.log('Comisiones por id_venta eliminadas');
    }

    // 2. Eliminar comisiones por id_venta_item
    if (itemIds.length > 0) {
      const { error: errorComisiones2 } = await supabaseAdmin
        .from('comisiones')
        .delete()
        .in('id_venta_item', itemIds);
      
      if (errorComisiones2) {
        console.error('Error eliminando comisiones por id_venta_item:', errorComisiones2);
      } else {
        console.log('Comisiones por id_venta_item eliminadas');
      }
    }

    // 3. Eliminar registros del libro de ingresos
    const { error: errorLibro } = await supabaseAdmin
      .from('libro_ingresos')
      .delete()
      .eq('id_venta', id_venta);
    
    if (errorLibro) {
      console.error('Error eliminando libro_ingresos:', errorLibro);
    } else {
      console.log('Libro de ingresos eliminado');
    }

    // 4. Eliminar aplicaciones de anticipo
    const { error: errorAnticipo } = await supabaseAdmin
      .from('aplicacion_anticipo')
      .delete()
      .eq('id_venta', id_venta);
    
    if (errorAnticipo) {
      console.error('Error eliminando aplicacion_anticipo:', errorAnticipo);
    } else {
      console.log('Aplicaciones de anticipo eliminadas');
    }

    // 5. Eliminar pagos
    const { error: errorPagos } = await supabaseAdmin
      .from('pagos')
      .delete()
      .eq('id_venta', id_venta);
    
    if (errorPagos) {
      console.error('Error eliminando pagos:', errorPagos);
      throw new Error(`Error eliminando pagos: ${errorPagos.message}`);
    } else {
      console.log('Pagos eliminados');
    }

    // 6. Eliminar items de venta
    const { error: errorItems } = await supabaseAdmin
      .from('venta_items')
      .delete()
      .eq('id_venta', id_venta);
    
    if (errorItems) {
      console.error('Error eliminando venta_items:', errorItems);
      throw new Error(`Error eliminando items: ${errorItems.message}`);
    } else {
      console.log('Items de venta eliminados');
    }

    // 7. Finalmente eliminar la venta
    const { error: errorVenta } = await supabaseAdmin
      .from('ventas')
      .delete()
      .eq('id', id_venta);
    
    if (errorVenta) {
      console.error('Error eliminando venta:', errorVenta);
      throw new Error(`Error eliminando venta: ${errorVenta.message}`);
    }

    // 8. Registrar en bitácora
    await supabaseAdmin.from('bitacora_accion').insert({
      entidad: 'ventas',
      accion: 'eliminar_venta',
      id_entidad: id_venta,
      usuario: user.id,
      detalle_json: { id_venta, fecha_eliminacion: new Date().toISOString() }
    });

    console.log(`Venta ${id_venta} eliminada exitosamente`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Venta ${id_venta} y sus registros relacionados han sido eliminados` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
