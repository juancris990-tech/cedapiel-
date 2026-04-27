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

    // POST /anticipos - Registrar anticipo
    if (method === 'POST' && path.length === 2) {
      const body = await req.json();
      const { id_cliente, id_sucursal, monto_mxn, metodo_pago, referencia_pago, observacion } = body;

      // Validaciones
      if (!id_cliente || !id_sucursal || !monto_mxn || !metodo_pago) {
        return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (monto_mxn <= 0) {
        return new Response(JSON.stringify({ error: 'El monto debe ser mayor a 0' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Crear anticipo
      const { data: anticipo, error: anticipoError } = await supabaseClient
        .from('anticipos')
        .insert({
          id_cliente,
          id_sucursal,
          monto_mxn: Number(monto_mxn).toFixed(2),
          saldo_disponible_mxn: Number(monto_mxn).toFixed(2),
          metodo_pago,
          referencia_pago,
          observacion,
          estado: 'registrado'
        })
        .select()
        .single();

      if (anticipoError) {
        console.error('Error creando anticipo:', anticipoError);
        return new Response(JSON.stringify({ error: anticipoError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Registrar en libro de diferidos (pasivo)
      await supabaseClient
        .from('libro_diferidos')
        .insert({
          id_sucursal,
          id_cliente,
          tipo: 'alta_anticipo',
          monto_mxn: Number(monto_mxn).toFixed(2),
          id_referencia: anticipo.id,
          nota: `Anticipo registrado ${referencia_pago ? `- Ref: ${referencia_pago}` : ''}`
        });

      // Actualizar saldo a favor del cliente
      const { data: cliente } = await supabaseClient
        .from('clientes')
        .select('saldo_favor')
        .eq('id', id_cliente)
        .single();

      const nuevoSaldo = Number(cliente?.saldo_favor || 0) + Number(monto_mxn);

      await supabaseClient
        .from('clientes')
        .update({ saldo_favor: Number(nuevoSaldo).toFixed(2) })
        .eq('id', id_cliente);

      // Registrar en bitácora
      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'anticipos',
          accion: 'registrar_anticipo',
          id_entidad: anticipo.id,
          usuario: user.id,
          detalle_json: {
            id_cliente,
            id_sucursal,
            monto_mxn,
            metodo_pago,
            saldo_nuevo: nuevoSaldo
          }
        });

      return new Response(JSON.stringify({
        success: true,
        anticipo,
        saldo_cliente: nuevoSaldo
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /anticipos - Listar anticipos
    if (method === 'GET' && path.length === 2) {
      const cliente = url.searchParams.get('cliente');
      const sucursal = url.searchParams.get('sucursal');
      const estado = url.searchParams.get('estado');
      const fecha_desde = url.searchParams.get('fecha_desde');
      const fecha_hasta = url.searchParams.get('fecha_hasta');

      let query = supabaseClient.from('vw_anticipos_detalle').select('*');

      if (cliente) query = query.eq('id_cliente', cliente);
      if (sucursal) query = query.eq('id_sucursal', sucursal);
      if (estado) query = query.eq('estado', estado);
      if (fecha_desde) query = query.gte('fecha_pago', fecha_desde);
      if (fecha_hasta) query = query.lte('fecha_pago', fecha_hasta);

      const { data, error } = await query;

      if (error) {
        console.error('Error listando anticipos:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /anticipos/:id/reembolso - Reembolsar anticipo
    if (method === 'POST' && path.length === 4 && path[3] === 'reembolso') {
      const id_anticipo = parseInt(path[2]);
      const body = await req.json();
      const { monto_mxn, motivo } = body;

      if (!monto_mxn || !motivo) {
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

      // Validar que el monto no exceda el saldo disponible
      if (Number(monto_mxn) > Number(anticipo.saldo_disponible_mxn)) {
        return new Response(JSON.stringify({ error: 'Monto mayor al saldo disponible' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const nuevoSaldoAnticipo = Number(anticipo.saldo_disponible_mxn) - Number(monto_mxn);
      const nuevoEstado = nuevoSaldoAnticipo === 0 ? 'reembolsado' : 'aplicado_parcial';

      // Actualizar anticipo
      await supabaseClient
        .from('anticipos')
        .update({
          saldo_disponible_mxn: Number(nuevoSaldoAnticipo).toFixed(2),
          estado: nuevoEstado
        })
        .eq('id', id_anticipo);

      // Registrar en libro de diferidos (reducción de pasivo)
      await supabaseClient
        .from('libro_diferidos')
        .insert({
          id_sucursal: anticipo.id_sucursal,
          id_cliente: anticipo.id_cliente,
          tipo: 'reembolso',
          monto_mxn: -Number(monto_mxn).toFixed(2),
          id_referencia: id_anticipo,
          nota: `Reembolso: ${motivo}`
        });

      // Actualizar saldo del cliente
      const { data: cliente } = await supabaseClient
        .from('clientes')
        .select('saldo_favor')
        .eq('id', anticipo.id_cliente)
        .single();

      const nuevoSaldoCliente = Number(cliente?.saldo_favor || 0) - Number(monto_mxn);

      await supabaseClient
        .from('clientes')
        .update({ saldo_favor: Number(nuevoSaldoCliente).toFixed(2) })
        .eq('id', anticipo.id_cliente);

      // Registrar en bitácora
      await supabaseClient
        .from('bitacora_accion')
        .insert({
          entidad: 'anticipos',
          accion: 'reembolso_anticipo',
          id_entidad: id_anticipo,
          usuario: user.id,
          detalle_json: {
            monto_reembolsado: monto_mxn,
            motivo,
            saldo_anterior_anticipo: anticipo.saldo_disponible_mxn,
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
    console.error('Error en función anticipos:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});