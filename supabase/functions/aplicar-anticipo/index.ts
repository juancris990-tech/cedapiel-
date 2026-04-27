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
    const path = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // POST /aplicar-anticipo - Aplicar anticipo a venta
    if (method === 'POST' && path.length === 2) {
      const body = await req.json();
      const { id_venta, id_anticipo, monto_aplicado_mxn } = body;

      if (!id_venta || !id_anticipo || !monto_aplicado_mxn) {
        return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Obtener anticipo
      const { data: anticipo, error: anticipoError } = await supabaseClient
        .from('anticipos')
        .select('*')
        .eq('id', id_anticipo)
        .single();

      if (anticipoError || !anticipo) {
        return new Response(JSON.stringify({ error: 'Anticipo no encontrado' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validar saldo disponible
      if (Number(monto_aplicado_mxn) > Number(anticipo.saldo_disponible_mxn)) {
        return new Response(JSON.stringify({ error: 'Monto mayor al saldo disponible' }), {
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

      // Validar que los clientes coincidan
      if (anticipo.id_cliente !== venta.id_cliente) {
        return new Response(JSON.stringify({ error: 'El anticipo no pertenece al cliente de la venta' }), {
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
          monto_aplicado_mxn: Number(monto_aplicado_mxn).toFixed(2),
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
      const nuevoSaldoAnticipo = Number(anticipo.saldo_disponible_mxn) - Number(monto_aplicado_mxn);
      let nuevoEstado = anticipo.estado;
      
      if (nuevoSaldoAnticipo === 0) {
        nuevoEstado = 'aplicado_total';
      } else if (nuevoSaldoAnticipo < Number(anticipo.monto_mxn)) {
        nuevoEstado = 'aplicado_parcial';
      }

      await supabaseClient
        .from('anticipos')
        .update({
          saldo_disponible_mxn: Number(nuevoSaldoAnticipo).toFixed(2),
          estado: nuevoEstado
        })
        .eq('id', id_anticipo);

      // Registrar en libro de diferidos (reducción de pasivo)
      // El ingreso se reconocerá cuando se cierre la venta, no al aplicar el anticipo
      await supabaseClient
        .from('libro_diferidos')
        .insert({
          id_sucursal: venta.id_sucursal,
          id_cliente: venta.id_cliente,
          tipo: 'aplicacion',
          monto_mxn: -Number(monto_aplicado_mxn).toFixed(2),
          id_referencia: aplicacion.id,
          nota: `Aplicado a venta #${id_venta}`
        });

      // Actualizar saldo del cliente
      const { data: cliente } = await supabaseClient
        .from('clientes')
        .select('saldo_favor')
        .eq('id', venta.id_cliente)
        .single();

      const nuevoSaldoCliente = Number(cliente?.saldo_favor || 0) - Number(monto_aplicado_mxn);

      await supabaseClient
        .from('clientes')
        .update({ saldo_favor: Number(nuevoSaldoCliente).toFixed(2) })
        .eq('id', venta.id_cliente);

      // Registrar en bitácora
      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'aplicacion_anticipo',
          accion: 'aplicar_anticipo',
          id_entidad: aplicacion.id,
          usuario: user.id,
          detalle_json: {
            id_anticipo,
            id_venta,
            monto_aplicado: monto_aplicado_mxn,
            saldo_anterior_anticipo: anticipo.saldo_disponible_mxn,
            saldo_nuevo_anticipo: nuevoSaldoAnticipo,
            saldo_nuevo_cliente: nuevoSaldoCliente
          }
        });

      return new Response(JSON.stringify({
        success: true,
        aplicacion,
        saldo_anticipo: nuevoSaldoAnticipo,
        saldo_cliente: nuevoSaldoCliente
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /aplicar-anticipo/:id - Revertir aplicación
    if (method === 'DELETE' && path.length === 3) {
      const id_aplicacion = parseInt(path[2]);
      const body = await req.json();
      const { motivo } = body;

      if (!motivo) {
        return new Response(JSON.stringify({ error: 'Motivo requerido' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Obtener aplicación
      const { data: aplicacion, error: aplicacionError } = await supabaseClient
        .from('aplicacion_anticipo')
        .select('*')
        .eq('id', id_aplicacion)
        .single();

      if (aplicacionError || !aplicacion) {
        return new Response(JSON.stringify({ error: 'Aplicación no encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Obtener anticipo y venta
      const { data: anticipo } = await supabaseClient
        .from('anticipos')
        .select('*')
        .eq('id', aplicacion.id_anticipo)
        .single();

      const { data: venta } = await supabaseClient
        .from('ventas')
        .select('*')
        .eq('id', aplicacion.id_venta)
        .single();

      // Eliminar aplicación
      await supabaseClient
        .from('aplicacion_anticipo')
        .delete()
        .eq('id', id_aplicacion);

      // Restaurar saldo del anticipo
      const nuevoSaldoAnticipo = Number(anticipo.saldo_disponible_mxn) + Number(aplicacion.monto_aplicado_mxn);
      
      await supabaseClient
        .from('anticipos')
        .update({
          saldo_disponible_mxn: Number(nuevoSaldoAnticipo).toFixed(2),
          estado: nuevoSaldoAnticipo === Number(anticipo.monto_mxn) ? 'registrado' : 'aplicado_parcial'
        })
        .eq('id', anticipo.id);

      // Registrar ajuste en libro de diferidos
      // Al revertir, restauramos el pasivo diferido
      await supabaseClient
        .from('libro_diferidos')
        .insert({
          id_sucursal: venta.id_sucursal,
          id_cliente: venta.id_cliente,
          tipo: 'ajuste',
          monto_mxn: Number(aplicacion.monto_aplicado_mxn).toFixed(2),
          id_referencia: id_aplicacion,
          nota: `Reversión de aplicación: ${motivo}`
        });

      // Restaurar saldo del cliente
      const { data: cliente } = await supabaseClient
        .from('clientes')
        .select('saldo_favor')
        .eq('id', venta.id_cliente)
        .single();

      const nuevoSaldoCliente = Number(cliente?.saldo_favor || 0) + Number(aplicacion.monto_aplicado_mxn);

      await supabaseClient
        .from('clientes')
        .update({ saldo_favor: Number(nuevoSaldoCliente).toFixed(2) })
        .eq('id', venta.id_cliente);

      // Registrar en bitácora
      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'aplicacion_anticipo',
          accion: 'revertir_aplicacion',
          id_entidad: id_aplicacion,
          usuario: user.id,
          detalle_json: {
            motivo,
            monto_revertido: aplicacion.monto_aplicado_mxn,
            saldo_nuevo_anticipo: nuevoSaldoAnticipo,
            saldo_nuevo_cliente: nuevoSaldoCliente
          }
        });

      return new Response(JSON.stringify({
        success: true,
        saldo_anticipo: nuevoSaldoAnticipo,
        saldo_cliente: nuevoSaldoCliente
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
    console.error('Error en función aplicar-anticipo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});