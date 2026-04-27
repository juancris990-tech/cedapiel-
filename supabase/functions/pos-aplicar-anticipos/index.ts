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

    const { id_venta, automatico = true, items = [] } = await req.json();

    if (!id_venta) {
      return new Response(JSON.stringify({ error: 'id_venta requerido' }), {
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

    // Obtener anticipos disponibles del cliente
    const { data: anticipos, error: anticiposError } = await supabaseClient
      .from('anticipos')
      .select('*')
      .eq('id_cliente', venta.id_cliente)
      .gt('saldo_disponible_mxn', 0)
      .order('fecha_pago', { ascending: true });

    if (anticiposError || !anticipos || anticipos.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No hay anticipos disponibles',
        anticipos_aplicados: [],
        monto_total_aplicado: 0
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const saldoPendiente = Number(venta.monto_final_mxn || 0) - Number(venta.anticipo_aplicado_mxn || 0) - Number(venta.total_pagado_mxn || 0);
    
    let anticiposAplicar = [];
    
    if (automatico) {
      // Modo automático: aplicar anticipos en orden hasta cubrir el saldo
      let restante = saldoPendiente;
      
      for (const anticipo of anticipos) {
        if (restante <= 0) break;
        
        const saldoDisp = Number(anticipo.saldo_disponible_mxn);
        const montoAplicar = Math.min(saldoDisp, restante);
        
        anticiposAplicar.push({
          id_anticipo: anticipo.id,
          monto: montoAplicar
        });
        
        restante -= montoAplicar;
      }
    } else {
      // Modo manual: aplicar los anticipos especificados
      anticiposAplicar = items;
    }

    // Aplicar cada anticipo
    const aplicaciones = [];
    let montoTotalAplicado = 0;

    for (const item of anticiposAplicar) {
      const { id_anticipo, monto } = item;
      const montoNum = Number(monto);

      if (montoNum <= 0) continue;

      // Obtener anticipo
      const { data: anticipo } = await supabaseClient
        .from('anticipos')
        .select('*')
        .eq('id', id_anticipo)
        .single();

      if (!anticipo) continue;

      // Validar saldo disponible
      if (montoNum > Number(anticipo.saldo_disponible_mxn)) {
        return new Response(JSON.stringify({ 
          error: `Anticipo #${id_anticipo}: monto ${montoNum} excede saldo disponible ${anticipo.saldo_disponible_mxn}` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Crear aplicación
      const { data: aplicacion, error: aplicacionError } = await supabaseClient
        .from('aplicacion_anticipo')
        .insert({
          id_anticipo,
          id_venta,
          monto_aplicado_mxn: montoNum.toFixed(2),
          usuario_aplico: user.id
        })
        .select()
        .single();

      if (aplicacionError) {
        console.error('Error creando aplicación:', aplicacionError);
        return new Response(JSON.stringify({ error: aplicacionError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Actualizar saldo del anticipo
      const nuevoSaldoAnticipo = Number(anticipo.saldo_disponible_mxn) - montoNum;
      let nuevoEstado = anticipo.estado;
      
      if (nuevoSaldoAnticipo === 0) {
        nuevoEstado = 'aplicado_total';
      } else if (nuevoSaldoAnticipo < Number(anticipo.monto_mxn)) {
        nuevoEstado = 'aplicado_parcial';
      }

      await supabaseClient
        .from('anticipos')
        .update({
          saldo_disponible_mxn: nuevoSaldoAnticipo.toFixed(2),
          estado: nuevoEstado
        })
        .eq('id', id_anticipo);

      // Registrar en libro de diferidos (reducción de pasivo)
      await supabaseClient
        .from('libro_diferidos')
        .insert({
          id_sucursal: venta.id_sucursal,
          id_cliente: venta.id_cliente,
          tipo: 'aplicacion',
          monto_mxn: -montoNum.toFixed(2),
          id_referencia: aplicacion.id,
          nota: `Aplicado a venta #${id_venta}`
        });

      aplicaciones.push(aplicacion);
      montoTotalAplicado += montoNum;
    }

    // Actualizar totales de la venta
    const nuevoAnticipoAplicado = Number(venta.anticipo_aplicado_mxn || 0) + montoTotalAplicado;
    const nuevoSaldoPendiente = Number(venta.monto_final_mxn || 0) - nuevoAnticipoAplicado - Number(venta.total_pagado_mxn || 0);

    await supabaseClient
      .from('ventas')
      .update({
        anticipo_aplicado_mxn: nuevoAnticipoAplicado.toFixed(2),
        saldo_pendiente_mxn: nuevoSaldoPendiente.toFixed(2)
      })
      .eq('id', id_venta);

    // Actualizar saldo del cliente
    const { data: cliente } = await supabaseClient
      .from('clientes')
      .select('saldo_favor')
      .eq('id', venta.id_cliente)
      .single();

    const nuevoSaldoCliente = Number(cliente?.saldo_favor || 0) - montoTotalAplicado;

    await supabaseClient
      .from('clientes')
      .update({ saldo_favor: nuevoSaldoCliente.toFixed(2) })
      .eq('id', venta.id_cliente);

    // Registrar en bitácora
    await supabaseClient
      .from('bitacora_accion')
      .insert({
        entidad: 'ventas',
        accion: 'aplicar_anticipos',
        id_entidad: id_venta,
        usuario: user.id,
        detalle_json: {
          automatico,
          monto_total: montoTotalAplicado,
          num_anticipos: aplicaciones.length
        }
      });

    console.log(`Aplicados ${aplicaciones.length} anticipos por total de ${montoTotalAplicado}`);

    return new Response(JSON.stringify({
      success: true,
      anticipos_aplicados: aplicaciones,
      monto_total_aplicado: montoTotalAplicado,
      nuevo_saldo_pendiente: nuevoSaldoPendiente,
      nuevo_saldo_cliente: nuevoSaldoCliente
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en pos-aplicar-anticipos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});