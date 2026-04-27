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

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método no permitido' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { id_venta } = await req.json();

    if (!id_venta) {
      return new Response(JSON.stringify({ error: 'id_venta requerido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obtener venta con items
    const { data: venta, error: ventaError } = await supabaseClient
      .from('ventas')
      .select('*, venta_items(*)')
      .eq('id', id_venta)
      .single();

    if (ventaError || !venta) {
      return new Response(JSON.stringify({ error: 'Venta no encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validar que la venta esté en borrador
    if (venta.estado_venta !== 'borrador') {
      return new Response(JSON.stringify({ 
        error: `La venta ya está ${venta.estado_venta}. No se puede cerrar nuevamente.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calcular totales desde los items
    let montoFinal = 0;
    if (venta.venta_items && venta.venta_items.length > 0) {
      montoFinal = venta.venta_items.reduce((sum: number, item: any) => {
        const itemTotal = Number(item.precio_final_mxn || 0) * Number(item.cantidad || 1);
        return sum + itemTotal;
      }, 0);
      montoFinal = Math.round(montoFinal * 100) / 100;
    }

    // Obtener total pagado desde la tabla pagos
    const { data: pagos } = await supabaseClient
      .from('pagos')
      .select('monto')
      .eq('id_venta', id_venta)
      .eq('aplicado_a_venta', true);

    const totalPagado = pagos?.reduce((sum, p) => sum + Number(p.monto || 0), 0) || 0;
    const anticipoAplicado = Number(venta.anticipo_aplicado_mxn || 0);
    const aPagar = Math.round((montoFinal - anticipoAplicado - totalPagado) * 100) / 100;

    console.log('Validación de pago:', {
      montoFinal,
      anticipoAplicado,
      totalPagado,
      aPagar,
      pagosCount: pagos?.length || 0
    });

    // Solo validar que no falte dinero (pendiente)
    if (aPagar > 0.01) {
      return new Response(JSON.stringify({ 
        error: `Venta no pagada completamente. Pendiente: $${aPagar.toFixed(2)}`,
        a_pagar: aPagar,
        debug: {
          montoFinal,
          anticipoAplicado,
          totalPagado
        }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Si hay excedente de pago (pagaron de más), registrarlo como saldo a favor
    let saldoAFavor = 0;
    if (aPagar < -0.01) {
      saldoAFavor = Math.abs(aPagar);
      console.log(`Excedente de pago detectado: $${saldoAFavor.toFixed(2)} - se registrará como saldo a favor`);
      
      // Obtener saldo actual del cliente
      const { data: cliente } = await supabaseClient
        .from('clientes')
        .select('saldo_favor')
        .eq('id', venta.id_cliente)
        .single();
      
      const saldoActual = Number(cliente?.saldo_favor || 0);
      const nuevoSaldo = saldoActual + saldoAFavor;
      
      // Actualizar saldo a favor del cliente
      const { error: saldoError } = await supabaseClient
        .from('clientes')
        .update({ saldo_favor: nuevoSaldo })
        .eq('id', venta.id_cliente);
      
      if (saldoError) {
        console.error('Error actualizando saldo a favor:', saldoError);
      }
    }

    // Actualizar venta con totales y cambiar estado a cerrada
    const { error: updateError } = await supabaseClient
      .from('ventas')
      .update({
        estado_venta: 'cerrada',
        monto_original_mxn: montoFinal,
        monto_final_mxn: montoFinal,
        saldo_pendiente_mxn: 0
      })
      .eq('id', id_venta);

    if (updateError) {
      console.error('Error cerrando venta:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Registrar en libro de ingresos y generar comisiones
    if (montoFinal > 0 && venta.venta_items && venta.venta_items.length > 0) {
      console.log('Registrando ingreso en libro_ingresos:', {
        id_sucursal: venta.id_sucursal,
        id_cliente: venta.id_cliente,
        id_venta: id_venta,
        monto_mxn: montoFinal
      });
      
      const { data: ingreso, error: ingresoError } = await supabaseClient
        .from('libro_ingresos')
        .insert({
          id_sucursal: venta.id_sucursal,
          id_cliente: venta.id_cliente,
          id_venta: id_venta,
          id_cita: venta.id_cita || null,
          monto_mxn: montoFinal,
          nota: `Ingreso reconocido por venta POS #${id_venta}`
        })
        .select()
        .single();
      
      if (ingresoError) {
        console.error('Error registrando ingreso:', ingresoError);
      } else {
        console.log('Ingreso registrado exitosamente:', ingreso);
        
        // Generar comisiones por cada item
        const fechaHoy = new Date().toISOString().split('T')[0];
        const comisionesGeneradas: any[] = [];
        
        for (const item of venta.venta_items) {
          const idEmpleado = item.id_empleado;
          if (!idEmpleado) continue;
          
          const baseMxn = Number(item.precio_final_mxn || 0) * Number(item.cantidad || 1);
          if (baseMxn <= 0) continue;
          
          // Resolver regla de comisión
          const { data: regla } = await supabaseClient
            .rpc('resolver_regla_comision', {
              _id_empleado: idEmpleado,
              _id_servicio: item.id_servicio,
              _id_categoria: null,
              _fecha: fechaHoy
            })
            .maybeSingle();
          
          const porcentaje = Number((regla as any)?.porcentaje || 0);
          const comisionMxn = Math.round((baseMxn * porcentaje / 100) * 100) / 100;
          
          if (comisionMxn > 0) {
            const { data: comision, error: comisionError } = await supabaseClient
              .from('comisiones')
              .insert({
                id_empleado: idEmpleado,
                id_sucursal: venta.id_sucursal,
                id_venta: id_venta,
                id_venta_item: item.id,
                periodo_inicio: fechaHoy,
                periodo_fin: fechaHoy,
                monto_base: baseMxn,
                porcentaje_comision: porcentaje,
                monto_comision: comisionMxn,
                estado: 'pendiente'
              })
              .select()
              .single();
            
            if (comisionError) {
              console.error('Error creando comisión:', comisionError);
            } else {
              comisionesGeneradas.push(comision);
            }
          }
        }
        
        console.log('Comisiones generadas:', comisionesGeneradas.length, comisionesGeneradas);
      }
    }

    await supabaseClient
      .from('bitacora_accion')
      .insert({
        entidad: 'ventas',
        accion: 'cerrar_venta',
        id_entidad: id_venta,
        usuario: user.id,
        detalle_json: { 
          monto_final: montoFinal,
          anticipo_aplicado: anticipoAplicado,
          total_pagado: totalPagado
        }
      });

    console.log('Venta cerrada:', id_venta);

    return new Response(JSON.stringify({ 
      success: true,
      venta_id: id_venta,
      message: 'Venta cerrada exitosamente',
      saldo_a_favor: saldoAFavor > 0 ? saldoAFavor : undefined,
      recibo_url: `/recibo/${id_venta}` // Placeholder para PDF
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error en pos-cerrar:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
