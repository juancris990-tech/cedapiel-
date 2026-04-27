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

    // Obtener todas las ventas en borrador
    const { data: ventas, error: ventasError } = await supabaseClient
      .from('ventas')
      .select('id')
      .eq('estado_venta', 'borrador');

    if (ventasError) {
      return new Response(JSON.stringify({ error: ventasError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let actualizadas = 0;

    for (const venta of ventas || []) {
      // Obtener items de la venta
      const { data: items } = await supabaseClient
        .from('venta_items')
        .select('precio_original_mxn, precio_final_mxn, cantidad')
        .eq('id_venta', venta.id);

      if (!items || items.length === 0) {
        // Si no hay items, poner todos los totales en 0
        await supabaseClient
          .from('ventas')
          .update({
            monto_original_mxn: 0,
            monto_descuento_mxn: 0,
            monto_final_mxn: 0,
            saldo_pendiente_mxn: 0
          })
          .eq('id', venta.id);
        continue;
      }

      const totalOriginal = items.reduce((sum: number, item: any) => {
        const precioOrig = Number(item.precio_original_mxn || item.precio_final_mxn || 0);
        return sum + (precioOrig * Number(item.cantidad || 1));
      }, 0);

      const totalFinal = items.reduce((sum: number, item: any) => {
        const precioFinal = Number(item.precio_final_mxn || item.precio_original_mxn || 0);
        return sum + (precioFinal * Number(item.cantidad || 1));
      }, 0);

      const totalDescuento = Math.round((totalOriginal - totalFinal) * 100) / 100;

      // Obtener pagos y anticipos actuales
      const { data: ventaActual } = await supabaseClient
        .from('ventas')
        .select('total_pagado_mxn, anticipo_aplicado_mxn')
        .eq('id', venta.id)
        .single();

      const totalPagado = Number(ventaActual?.total_pagado_mxn || 0);
      const anticipoAplicado = Number(ventaActual?.anticipo_aplicado_mxn || 0);
      const saldoPendiente = Math.round((totalFinal - anticipoAplicado - totalPagado) * 100) / 100;

      await supabaseClient
        .from('ventas')
        .update({
          monto_original_mxn: Math.round(totalOriginal * 100) / 100,
          monto_descuento_mxn: totalDescuento,
          monto_final_mxn: Math.round(totalFinal * 100) / 100,
          saldo_pendiente_mxn: saldoPendiente
        })
        .eq('id', venta.id);

      actualizadas++;
    }

    console.log(`Recalculadas ${actualizadas} ventas`);

    return new Response(JSON.stringify({ 
      success: true,
      ventas_actualizadas: actualizadas
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en recalcular-ventas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
