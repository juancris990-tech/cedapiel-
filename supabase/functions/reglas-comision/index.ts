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
    const method = req.method;
    const pathParts = url.pathname.split('/').filter(Boolean);
    const reglaId = pathParts[pathParts.length - 1];

    // GET /reglas-comision - Listar reglas con filtros
    if (method === 'GET' && !reglaId.match(/^\d+$/)) {
      const q = url.searchParams.get('q') || '';
      const empleado = url.searchParams.get('empleado');
      const categoria = url.searchParams.get('categoria');
      const servicio = url.searchParams.get('servicio');
      const vigentesEn = url.searchParams.get('vigentes_en');
      const activa = url.searchParams.get('activa');

      let query = supabaseClient
        .from('parametros_comision')
        .select(`
          *,
          empleado:empleados!parametros_comision_id_empleado_fkey(id, nombre, apellidos),
          categoria:categoria_servicio!parametros_comision_id_categoria_servicio_fkey(id, nombre),
          servicio:servicios!parametros_comision_id_servicio_fkey(id, nombre)
        `)
        .order('prioridad', { ascending: true })
        .order('fecha_inicio', { ascending: false });

      if (empleado) {
        query = query.eq('id_empleado', parseInt(empleado));
      }
      if (categoria) {
        query = query.eq('id_categoria_servicio', parseInt(categoria));
      }
      if (servicio) {
        query = query.eq('id_servicio', parseInt(servicio));
      }
      if (activa) {
        query = query.eq('activo', activa === 'true');
      }
      if (vigentesEn) {
        const fecha = new Date(vigentesEn).toISOString().split('T')[0];
        query = query.lte('fecha_inicio', fecha);
        query = query.or(`fecha_fin.is.null,fecha_fin.gte.${fecha}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST /reglas-comision - Crear nueva regla
    if (method === 'POST') {
      let body;
      try {
        body = await req.json();
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { id_empleado, id_categoria_servicio, id_servicio, porcentaje, fecha_inicio, fecha_fin } = body;

      // Validar porcentaje
      if (porcentaje < 0 || porcentaje > 100) {
        return new Response(JSON.stringify({ error: 'El porcentaje debe estar entre 0 y 100' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabaseClient
        .from('parametros_comision')
        .insert({
          id_empleado: id_empleado || null,
          id_categoria_servicio: id_categoria_servicio || null,
          id_servicio: id_servicio || null,
          porcentaje,
          fecha_inicio,
          fecha_fin: fecha_fin || null,
          creado_por: user.id,
          activo: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando regla:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Regla de comisión creada:', data.id);

      return new Response(JSON.stringify(data), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT /reglas-comision/:id - Actualizar regla
    if (method === 'PUT' && reglaId.match(/^\d+$/)) {
      let body;
      try {
        body = await req.json();
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { porcentaje, fecha_inicio, fecha_fin, activo } = body;

      if (porcentaje !== undefined && (porcentaje < 0 || porcentaje > 100)) {
        return new Response(JSON.stringify({ error: 'El porcentaje debe estar entre 0 y 100' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const updateData: any = { actualizado_por: user.id };
      if (porcentaje !== undefined) updateData.porcentaje = porcentaje;
      if (fecha_inicio !== undefined) updateData.fecha_inicio = fecha_inicio;
      if (fecha_fin !== undefined) updateData.fecha_fin = fecha_fin;
      if (activo !== undefined) updateData.activo = activo;

      const { data, error } = await supabaseClient
        .from('parametros_comision')
        .update(updateData)
        .eq('id', parseInt(reglaId))
        .select()
        .single();

      if (error) {
        console.error('Error actualizando regla:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Regla de comisión actualizada:', reglaId);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH /reglas-comision/:id/desactivar - Desactivar regla
    if (method === 'PATCH' && url.pathname.includes('/desactivar')) {
      const id = pathParts[pathParts.length - 2];
      
      const { data, error } = await supabaseClient
        .from('parametros_comision')
        .update({ activo: false, actualizado_por: user.id })
        .eq('id', parseInt(id))
        .select()
        .single();

      if (error) {
        console.error('Error desactivando regla:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Regla de comisión desactivada:', id);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error en reglas-comision:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
