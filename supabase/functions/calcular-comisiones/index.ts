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

    const url = new URL(req.url);
    const fechaDesde = url.searchParams.get('fecha_desde');
    const fechaHasta = url.searchParams.get('fecha_hasta');
    const sucursal = url.searchParams.get('sucursal');
    const empleado = url.searchParams.get('empleado');
    const categoria = url.searchParams.get('categoria');

    if (!fechaDesde || !fechaHasta) {
      return new Response(JSON.stringify({ error: 'Se requieren fecha_desde y fecha_hasta' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Obtener ingresos reconocidos del periodo desde libro_ingresos
    let queryIngresos = supabaseClient
      .from('libro_ingresos')
      .select(`
        *,
        venta:ventas!libro_ingresos_id_venta_fkey(
          id,
          id_cita,
          items:venta_items(
            id,
            id_empleado,
            id_servicio,
            precio_final_mxn,
            cantidad,
            servicio:servicios(id, nombre, id_categoria)
          )
        ),
        cita:agendas!libro_ingresos_id_cita_fkey(id, id_empleado),
        cliente:clientes(id, nombre, apellidos)
      `)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta);

    if (sucursal) {
      queryIngresos = queryIngresos.eq('id_sucursal', parseInt(sucursal));
    }

    const { data: ingresos, error: ingresosError } = await queryIngresos;

    if (ingresosError) throw ingresosError;

    // Procesar cada ingreso y calcular comisión
    const detalleComisiones: any[] = [];
    const resumenPorEmpleado: Map<number, any> = new Map();

    for (const ingreso of ingresos || []) {
      if (!ingreso.venta?.items) continue;

      for (const item of ingreso.venta.items) {
        // Obtener id_empleado del item o de la cita
        const idEmpleado = item.id_empleado || ingreso.cita?.id_empleado;
        
        if (!idEmpleado) continue;
        if (empleado && idEmpleado !== parseInt(empleado)) continue;

        const idServicio = item.id_servicio;
        const idCategoria = item.servicio?.id_categoria;
        
        if (categoria && idCategoria !== parseInt(categoria)) continue;

        const baseMxn = item.precio_final_mxn * (item.cantidad || 1);
        
        // Resolver regla aplicable
        const { data: regla } = await supabaseClient
          .rpc('resolver_regla_comision', {
            _id_empleado: idEmpleado,
            _id_servicio: idServicio,
            _id_categoria: idCategoria,
            _fecha: ingreso.fecha.split('T')[0]
          })
          .maybeSingle();

        const porcentajeAplicado = (regla as any)?.porcentaje || 0;
        const comisionMxn = Math.round((baseMxn * porcentajeAplicado / 100) * 100) / 100;

        detalleComisiones.push({
          fecha: ingreso.fecha,
          id_sucursal: ingreso.id_sucursal,
          id_empleado: idEmpleado,
          id_servicio: idServicio,
          id_categoria: idCategoria,
          servicio: item.servicio?.nombre,
          cliente: ingreso.cliente ? `${ingreso.cliente.nombre} ${ingreso.cliente.apellidos || ''}`.trim() : 'Sin cliente',
          base_mxn: baseMxn,
          porcentaje_aplicado: porcentajeAplicado,
          comision_mxn: comisionMxn,
          regla_origen: {
            id_regla: (regla as any)?.id_regla,
            prioridad: (regla as any)?.prioridad
          }
        });

        // Acumular en resumen por empleado
        if (!resumenPorEmpleado.has(idEmpleado)) {
          // Obtener info del empleado
          const { data: empleadoData } = await supabaseClient
            .from('empleados')
            .select('id, nombre, apellidos')
            .eq('id', idEmpleado)
            .single();

          resumenPorEmpleado.set(idEmpleado, {
            id_empleado: idEmpleado,
            nombre: empleadoData ? `${empleadoData.nombre} ${empleadoData.apellidos || ''}`.trim() : 'Desconocido',
            ingresos_reconocidos_mxn: 0,
            comision_total_mxn: 0,
            n_items: 0,
            suma_base_por_porcentaje: 0,
          });
        }

        const resumen = resumenPorEmpleado.get(idEmpleado);
        resumen.ingresos_reconocidos_mxn += baseMxn;
        resumen.comision_total_mxn += comisionMxn;
        resumen.n_items += 1;
        resumen.suma_base_por_porcentaje += baseMxn * porcentajeAplicado;
      }
    }

    // Calcular porcentaje promedio ponderado
    const resumenArray = Array.from(resumenPorEmpleado.values()).map(r => ({
      id_empleado: r.id_empleado,
      nombre: r.nombre,
      ingresos_reconocidos_mxn: Math.round(r.ingresos_reconocidos_mxn * 100) / 100,
      porcentaje_promedio_ponderado: r.ingresos_reconocidos_mxn > 0 
        ? Math.round((r.suma_base_por_porcentaje / r.ingresos_reconocidos_mxn) * 100) / 100
        : 0,
      comision_total_mxn: Math.round(r.comision_total_mxn * 100) / 100,
      n_items: r.n_items,
    }));

    console.log(`Comisiones calculadas: ${resumenArray.length} empleados, ${detalleComisiones.length} items`);

    return new Response(JSON.stringify({
      resumen: resumenArray,
      detalle: detalleComisiones,
      periodo: { desde: fechaDesde, hasta: fechaHasta },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en calcular-comisiones:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
