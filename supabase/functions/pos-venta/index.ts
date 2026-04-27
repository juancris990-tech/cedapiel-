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
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extraer las partes después de 'pos-venta'
    const posVentaIndex = pathParts.indexOf('pos-venta');
    const segments = posVentaIndex >= 0 ? pathParts.slice(posVentaIndex + 1) : [];
    
    console.log('URL pathname:', url.pathname);
    console.log('Segments after pos-venta:', segments);
    console.log('Method:', req.method);
    
    // POST /pos-venta - Crear venta en borrador
    if (req.method === 'POST' && segments.length === 0) {
      const { id_cliente, id_sucursal } = await req.json();

      if (!id_cliente || !id_sucursal) {
        return new Response(JSON.stringify({ error: 'Cliente y sucursal son obligatorios' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: venta, error: ventaError } = await supabaseClient
        .from('ventas')
        .insert({
          id_cliente,
          id_sucursal,
          fecha: new Date().toISOString(),
          origen: 'pos_manual',
          estado_venta: 'borrador',
          total: 0,
          monto_original_mxn: 0,
          monto_descuento_mxn: 0,
          monto_final_mxn: 0,
          anticipo_aplicado_mxn: 0,
          total_pagado_mxn: 0,
          saldo_pendiente_mxn: 0
        })
        .select()
        .single();

      if (ventaError) {
        console.error('Error creando venta:', ventaError);
        return new Response(JSON.stringify({ error: ventaError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'ventas',
          accion: 'crear_venta_pos',
          id_entidad: venta.id,
          usuario: user.id,
          detalle_json: { id_cliente, id_sucursal, origen: 'pos_manual' }
        });

      console.log('Venta creada:', venta.id);

      return new Response(JSON.stringify({ venta }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /pos-venta/{id}/resumen - Obtener resumen de venta
    if (req.method === 'GET' && segments.length === 2 && segments[1] === 'resumen') {
      const idVenta = parseInt(segments[0]);
      
      console.log('Obteniendo resumen para venta:', idVenta);

      const { data: venta, error: ventaError } = await supabaseClient
        .from('ventas')
        .select('*, clientes(saldo_favor)')
        .eq('id', idVenta)
        .single();

      if (ventaError || !venta) {
        return new Response(JSON.stringify({ error: 'Venta no encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: items } = await supabaseClient
        .from('venta_items')
        .select('*')
        .eq('id_venta', idVenta);

      const totales = (items || []).reduce((acc, item) => {
        const cantidad = Number(item.cantidad || 1);
        const precioUnitario = Number(item.precio_unitario || 0);
        const precioFinal = Number(item.precio_final_mxn || item.precio_unitario || 0);
        const subtotalOriginal = precioUnitario * cantidad;
        const subtotalFinal = precioFinal * cantidad;
        
        return {
          monto_original: acc.monto_original + subtotalOriginal,
          monto_descuento: acc.monto_descuento + (subtotalOriginal - subtotalFinal),
          monto_final: acc.monto_final + subtotalFinal
        };
      }, { monto_original: 0, monto_descuento: 0, monto_final: 0 });

      // Actualizar totales en venta
      await supabaseClient
        .from('ventas')
        .update({
          monto_original_mxn: totales.monto_original,
          monto_descuento_mxn: totales.monto_descuento,
          monto_final_mxn: totales.monto_final,
          saldo_pendiente_mxn: totales.monto_final - Number(venta.anticipo_aplicado_mxn || 0) - Number(venta.total_pagado_mxn || 0),
          total: totales.monto_final
        })
        .eq('id', idVenta);

      const { data: anticipos } = await supabaseClient
        .from('anticipos')
        .select('*')
        .eq('id_cliente', venta.id_cliente)
        .gt('saldo_disponible_mxn', 0)
        .order('fecha_pago', { ascending: true });

      const saldoDisponible = anticipos?.reduce((sum, a) => sum + Number(a.saldo_disponible_mxn), 0) || 0;
      const anticipoSugerido = Math.min(saldoDisponible, totales.monto_final - Number(venta.anticipo_aplicado_mxn || 0));

      const a_pagar = totales.monto_final - Number(venta.anticipo_aplicado_mxn || 0) - Number(venta.total_pagado_mxn || 0);

      return new Response(JSON.stringify({
        monto_original_mxn: totales.monto_original,
        monto_descuento_mxn: totales.monto_descuento,
        monto_final_mxn: totales.monto_final,
        anticipo_aplicado_mxn: Number(venta.anticipo_aplicado_mxn || 0),
        total_pagado_mxn: Number(venta.total_pagado_mxn || 0),
        a_pagar_mxn: a_pagar,
        anticipos_disponibles: anticipos || []
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en pos-venta:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
