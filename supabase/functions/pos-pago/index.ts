import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Función auxiliar para recalcular totales de venta
async function recalcularTotalesVenta(supabaseClient: any, idVenta: number) {
  const { data: items } = await supabaseClient
    .from('venta_items')
    .select('precio_original_mxn, precio_final_mxn, cantidad')
    .eq('id_venta', idVenta);

  if (!items || items.length === 0) {
    await supabaseClient
      .from('ventas')
      .update({
        monto_original_mxn: 0,
        monto_descuento_mxn: 0,
        monto_final_mxn: 0,
        saldo_pendiente_mxn: 0
      })
      .eq('id', idVenta);
    return;
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

  const { data: venta } = await supabaseClient
    .from('ventas')
    .select('total_pagado_mxn, anticipo_aplicado_mxn')
    .eq('id', idVenta)
    .single();

  const totalPagado = Number(venta?.total_pagado_mxn || 0);
  const anticipoAplicado = Number(venta?.anticipo_aplicado_mxn || 0);
  const saldoPendiente = Math.round((totalFinal - anticipoAplicado - totalPagado) * 100) / 100;

  await supabaseClient
    .from('ventas')
    .update({
      monto_original_mxn: Math.round(totalOriginal * 100) / 100,
      monto_descuento_mxn: totalDescuento,
      monto_final_mxn: Math.round(totalFinal * 100) / 100,
      saldo_pendiente_mxn: saldoPendiente
    })
    .eq('id', idVenta);

  console.log(`Totales recalculados para venta ${idVenta}:`, {
    original: totalOriginal,
    descuento: totalDescuento,
    final: totalFinal,
    saldoPendiente
  });
}

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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id_venta, metodo, monto_mxn, referencia } = await req.json();

    if (!id_venta || !metodo || !monto_mxn) {
      return new Response(JSON.stringify({ error: 'id_venta, metodo y monto_mxn requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const monto = Number(monto_mxn);
    if (monto <= 0) {
      return new Response(JSON.stringify({ error: 'El monto debe ser mayor a cero' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obtener venta
    const { data: venta, error: ventaError } = await supabaseClient
      .from('ventas')
      .select('*')
      .eq('id', id_venta)
      .single();

    if (ventaError || !venta) {
      return new Response(JSON.stringify({ error: 'Venta no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PRIMERO recalcular totales para asegurar que estén actualizados
    console.log('Recalculando totales antes de registrar pago...');
    await recalcularTotalesVenta(supabaseClient, id_venta);

    // Volver a obtener la venta con los totales actualizados
    const { data: ventaActualizada } = await supabaseClient
      .from('ventas')
      .select('*')
      .eq('id', id_venta)
      .single();

    const ventaFinal = ventaActualizada || venta;

    // Crear pago
    const { data: pago, error: pagoError } = await supabaseClient
      .from('pagos')
      .insert({
        id_venta,
        id_cliente: venta.id_cliente,
        id_sucursal: venta.id_sucursal,
        tipo_pago: 'venta',
        metodo_pago: metodo,
        monto,
        referencia,
        fecha_pago: new Date().toISOString(),
        aplicado_a_venta: true
      })
      .select()
      .single();

    if (pagoError) {
      console.error('Error registrando pago:', pagoError);
      return new Response(JSON.stringify({ error: pagoError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Actualizar total pagado en venta
    const totalPagadoActual = Number(ventaFinal.total_pagado_mxn || 0);
    const nuevoTotalPagado = totalPagadoActual + monto;
    const montoFinal = Number(ventaFinal.monto_final_mxn || 0);
    const anticipoAplicado = Number(ventaFinal.anticipo_aplicado_mxn || 0);
    const saldoPendiente = montoFinal - anticipoAplicado - nuevoTotalPagado;

    await supabaseClient
      .from('ventas')
      .update({
        total_pagado_mxn: nuevoTotalPagado,
        saldo_pendiente_mxn: saldoPendiente
      })
      .eq('id', id_venta);

    await supabaseClient
      .from('bitacora_accion')
      .insert({
        entidad: 'pagos',
        accion: 'registrar_pago',
        id_entidad: pago.id,
        usuario: user.id,
        detalle_json: { id_venta, metodo, monto, referencia }
      });

    console.log('Pago registrado:', pago.id);

    // Si la venta queda completamente pagada (saldo = 0) y tiene monto > 0, cerrarla automáticamente
    let ventaCerrada = false;
    if (Math.abs(saldoPendiente) < 0.01 && ventaFinal.estado_venta === 'borrador' && montoFinal > 0) {
      console.log('Venta completamente pagada, cerrando automáticamente...');
      
      // Cambiar estado a cerrada
      await supabaseClient
        .from('ventas')
        .update({
          estado_venta: 'cerrada'
        })
        .eq('id', id_venta);

      // Registrar en libro de ingresos
      await supabaseClient
        .from('libro_ingresos')
        .insert({
          id_sucursal: ventaFinal.id_sucursal,
          id_cliente: ventaFinal.id_cliente,
          id_venta: id_venta,
          id_cita: ventaFinal.id_cita || null,
          monto_mxn: montoFinal,
          nota: `Ingreso reconocido por venta POS #${id_venta}`
        });
      
      console.log('Venta cerrada y registrada en libro de ingresos');

      // Bitácora de cierre
      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'ventas',
          accion: 'cerrar_venta_automatica',
          id_entidad: id_venta,
          usuario: user.id,
          detalle_json: { motivo: 'pago_completo', monto_final: montoFinal }
        });

      ventaCerrada = true;
    }

    return new Response(JSON.stringify({ 
      pago,
      total_pagado: nuevoTotalPagado,
      saldo_pendiente: saldoPendiente,
      venta_cerrada: ventaCerrada
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en pos-pago:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
