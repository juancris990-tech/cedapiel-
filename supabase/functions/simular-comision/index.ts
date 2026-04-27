import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
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

    const body = await req.json();
    const { id_empleado, id_servicio, id_categoria, base_mxn, fecha } = body;

    if (!id_empleado || !base_mxn) {
      return new Response(JSON.stringify({ error: 'Se requieren id_empleado y base_mxn' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fechaSimulacion = fecha || new Date().toISOString().split('T')[0];

    // Resolver regla aplicable
    const { data: regla, error: reglaError } = await supabaseClient
      .rpc('resolver_regla_comision', {
        _id_empleado: id_empleado,
        _id_servicio: id_servicio || null,
        _id_categoria: id_categoria || null,
        _fecha: fechaSimulacion
      })
      .maybeSingle();

    if (reglaError && reglaError.code !== 'PGRST116') {
      throw reglaError;
    }

    const porcentajeAplicado = (regla as any)?.porcentaje || 0;
    const comisionMxn = Math.round((base_mxn * porcentajeAplicado / 100) * 100) / 100;

    // Obtener info de la regla para contexto
    let fuenteRegla = null;
    if ((regla as any)?.id_regla) {
      const { data: reglaDetalle } = await supabaseClient
        .from('parametros_comision')
        .select(`
          *,
          empleado:empleados(nombre, apellidos),
          categoria:categoria_servicio(nombre),
          servicio:servicios(nombre)
        `)
        .eq('id', (regla as any).id_regla)
        .single();

      fuenteRegla = reglaDetalle;
    }

    console.log(`Simulación: ${porcentajeAplicado}% sobre $${base_mxn} = $${comisionMxn}`);

    return new Response(JSON.stringify({
      porcentaje_aplicado: porcentajeAplicado,
      comision_mxn: comisionMxn,
      base_mxn: base_mxn,
      fecha_simulacion: fechaSimulacion,
      fuente_regla: fuenteRegla ? {
        id_regla: fuenteRegla.id,
        prioridad: fuenteRegla.prioridad,
        descripcion: `${fuenteRegla.empleado ? fuenteRegla.empleado.nombre : 'Genérica'} - ${fuenteRegla.servicio?.nombre || fuenteRegla.categoria?.nombre || 'Todas'}`,
        vigencia: `${fuenteRegla.fecha_inicio} - ${fuenteRegla.fecha_fin || 'Sin fin'}`,
      } : null,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en simular-comision:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
