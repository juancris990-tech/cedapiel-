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

    const { id_cita, aplicar_anticipo_automatico = true } = await req.json();

    if (!id_cita) {
      return new Response(JSON.stringify({ error: 'id_cita requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar idempotencia: si ya existe venta para esta cita, retornarla
    const { data: ventaExistente } = await supabaseClient
      .from('ventas')
      .select('*')
      .eq('id_cita', id_cita)
      .maybeSingle();

    if (ventaExistente) {
      console.log('Venta ya existía para cita:', id_cita);
      return new Response(JSON.stringify({
        success: true,
        venta: ventaExistente,
        note: 'Venta ya existía para esta cita (idempotente).',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obtener datos de la cita
    const { data: cita, error: citaError } = await supabaseClient
      .from('agendas')
      .select(`
        *,
        servicios(id, nombre, precio, id_categoria),
        clientes(id, nombre, apellidos, saldo_favor)
      `)
      .eq('id', id_cita)
      .single();

    if (citaError || !cita) {
      return new Response(JSON.stringify({ error: 'Cita no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar que la cita tenga servicio
    if (!cita.servicios) {
      return new Response(JSON.stringify({ error: 'La cita no tiene servicio asociado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const precioServicio = Number(cita.servicios.precio);
    const totalVenta = precioServicio;

    // Crear la venta
    const { data: venta, error: ventaError } = await supabaseClient
      .from('ventas')
      .insert({
        id_cliente: cita.id_cliente,
        id_sucursal: cita.id_sucursal,
        id_cita: id_cita,
        fecha: new Date().toISOString(),
        origen: 'cita',
        total: totalVenta,
        monto_original_mxn: totalVenta,
        monto_descuento_mxn: 0,
        monto_final_mxn: totalVenta,
        anticipo_aplicado_mxn: 0,
        total_pagado_mxn: 0,
        saldo_pendiente_mxn: totalVenta,
        estado_venta: 'borrador'
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

    // Crear item de venta
    const { error: itemError } = await supabaseClient
      .from('venta_items')
      .insert({
        id_venta: venta.id,
        id_servicio: cita.servicios.id,
        cantidad: 1,
        precio_unitario: precioServicio,
        precio_final_mxn: precioServicio,
        subtotal: precioServicio,
        descuento_tipo: 'ninguno',
        descuento_valor: 0,
        id_empleado: cita.id_empleado
      });

    if (itemError) {
      console.error('Error creando item de venta:', itemError);
      // Revertir venta
      await supabaseClient.from('ventas').delete().eq('id', venta.id);
      return new Response(JSON.stringify({ error: itemError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let montoAplicado = 0;
    const aplicaciones: any[] = [];

    // Aplicar anticipos si está habilitado y hay saldo disponible
    if (aplicar_anticipo_automatico && Number(cita.clientes.saldo_favor) > 0) {
      // Obtener anticipos disponibles
      const { data: anticipos } = await supabaseClient
        .from('anticipos')
        .select('*')
        .eq('id_cliente', cita.id_cliente)
        .gt('saldo_disponible_mxn', 0)
        .order('fecha_pago', { ascending: true });

      if (anticipos && anticipos.length > 0) {
        let restante = totalVenta;

        for (const anticipo of anticipos) {
          if (restante <= 0) break;

          const disponible = Number(anticipo.saldo_disponible_mxn);
          const aAplicar = Math.min(disponible, restante);

          // Crear aplicación
          const { data: aplicacion, error: aplicacionError } = await supabaseClient
            .from('aplicacion_anticipo')
            .insert({
              id_anticipo: anticipo.id,
              id_venta: venta.id,
              monto_aplicado_mxn: aAplicar.toFixed(2),
              usuario_aplico: user.id
            })
            .select()
            .single();

          if (!aplicacionError && aplicacion) {
            // Actualizar saldo del anticipo
            const nuevoSaldo = disponible - aAplicar;
            let nuevoEstado = anticipo.estado;
            
            if (nuevoSaldo === 0) {
              nuevoEstado = 'aplicado_total';
            } else if (nuevoSaldo < Number(anticipo.monto_mxn)) {
              nuevoEstado = 'aplicado_parcial';
            }

            await supabaseClient
              .from('anticipos')
              .update({
                saldo_disponible_mxn: nuevoSaldo.toFixed(2),
                estado: nuevoEstado
              })
              .eq('id', anticipo.id);

            // Registrar en libro de diferidos (reducción de pasivo)
            await supabaseClient
              .from('libro_diferidos')
              .insert({
                id_sucursal: cita.id_sucursal,
                id_cliente: cita.id_cliente,
                tipo: 'aplicacion',
                monto_mxn: (-aAplicar).toFixed(2),
                id_referencia: aplicacion.id,
                nota: `Aplicado a venta #${venta.id} desde cita #${id_cita}`
              });

            aplicaciones.push({
              id_anticipo: anticipo.id,
              monto_aplicado: aAplicar
            });

            montoAplicado += aAplicar;
            restante -= aAplicar;
          }
        }

        // Actualizar saldo del cliente y totales de venta
        const nuevoSaldoCliente = Number(cita.clientes.saldo_favor) - montoAplicado;
        await supabaseClient
          .from('clientes')
          .update({ saldo_favor: nuevoSaldoCliente.toFixed(2) })
          .eq('id', cita.id_cliente);

        // Actualizar venta con anticipo aplicado
        await supabaseClient
          .from('ventas')
          .update({
            anticipo_aplicado_mxn: montoAplicado.toFixed(2),
            saldo_pendiente_mxn: (totalVenta - montoAplicado).toFixed(2)
          })
          .eq('id', venta.id);
      }
    }

    // Cerrar la venta automáticamente
    await supabaseClient
      .from('ventas')
      .update({
        estado_venta: 'cerrada',
        saldo_pendiente_mxn: 0
      })
      .eq('id', venta.id);

    // Registrar ingreso reconocido
    await supabaseClient
      .from('libro_ingresos')
      .insert({
        id_sucursal: cita.id_sucursal,
        id_cliente: cita.id_cliente,
        id_venta: venta.id,
        id_cita: id_cita,
        monto_mxn: totalVenta.toFixed(2),
        nota: `Ingreso reconocido por cita #${id_cita} - ${cita.servicios.nombre}`
      });

    // Registrar en bitácora
    await supabaseClient
      .from('bitacora_accion')
      .insert({
        entidad: 'ventas',
        accion: 'crear_venta_desde_cita',
        id_entidad: venta.id,
        usuario: user.id,
        detalle_json: {
          id_cita,
          total_venta: totalVenta,
          anticipo_aplicado: montoAplicado,
          num_aplicaciones: aplicaciones.length
        }
      });

    return new Response(JSON.stringify({
      success: true,
      venta,
      anticipo_aplicado: montoAplicado,
      restante_por_pagar: totalVenta - montoAplicado,
      aplicaciones
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en función venta-desde-cita:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});