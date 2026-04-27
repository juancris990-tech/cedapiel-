import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No se proporcionó token de autorización' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear cliente Supabase con service role para validar el token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extraer el token del header "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Verificar el usuario con el token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Error de autenticación:', userError);
      return new Response(
        JSON.stringify({ error: 'Token inválido o sesión expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuario autenticado:', user.id);

    // Ahora crear cliente con el token del usuario para las operaciones de datos
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { 
            Authorization: authHeader
          } 
        } 
      }
    );

    const url = new URL(req.url);
    const { searchParams } = url;

    // Construir query base
    let query = supabase
      .from('citas_agendadas')
      .select('*', { count: 'exact' });

    // Filtros
    const sucursal = searchParams.get('sucursal');
    if (sucursal) {
      query = query.ilike('sucursal', `%${sucursal}%`);
    }

    const profesional = searchParams.get('profesional');
    if (profesional) {
      query = query.ilike('profesional', `%${profesional}%`);
    }

    const servicio = searchParams.get('servicio');
    if (servicio) {
      query = query.ilike('servicio', `%${servicio}%`);
    }

    const estado = searchParams.get('estado');
    if (estado) {
      query = query.ilike('estado', `%${estado}%`);
    }

    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    if (fechaInicio) {
      query = query.gte('fecha', fechaInicio);
    }
    if (fechaFin) {
      query = query.lte('fecha', fechaFin);
    }

    const retencion = searchParams.get('retencion');
    if (retencion) {
      query = query.eq('retencion', retencion);
    }

    const reagendado = searchParams.get('reagendado');
    if (reagendado) {
      query = query.eq('reagendado', reagendado);
    }

    const facturado = searchParams.get('facturado');
    if (facturado) {
      query = query.eq('facturado', facturado);
    }

    // Búsqueda general
    const search = searchParams.get('search');
    if (search) {
      query = query.or(`cliente.ilike.%${search}%,profesional.ilike.%${search}%,servicio.ilike.%${search}%,telefono.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Ordenamiento
    const orderBy = searchParams.get('orderBy') || 'fecha';
    const orderDir = searchParams.get('orderDir') || 'desc';
    query = query.order(orderBy, { ascending: orderDir === 'asc' });

    // Paginación
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Calcular estadísticas
    const { data: stats } = await supabase
      .from('citas_agendadas')
      .select('estado, valor_mxn, retencion, reagendado, sucursal, profesional');

    const totalCitas = stats?.length || 0;
    const citasCompletadas = stats?.filter(s => s.estado === 'Completed').length || 0;
    const valorTotal = stats?.filter(s => s.estado === 'Completed').reduce((sum, s) => sum + (s.valor_mxn || 0), 0) || 0;
    const valorPromedio = totalCitas > 0 ? valorTotal / totalCitas : 0;
    const retenidos = stats?.filter(s => s.retencion === 'Y').length || 0;
    const reagendados = stats?.filter(s => s.reagendado === 'Y').length || 0;
    const porcentajeRetencion = totalCitas > 0 ? (retenidos / totalCitas) * 100 : 0;
    const porcentajeReagendados = totalCitas > 0 ? (reagendados / totalCitas) * 100 : 0;

    // Agrupar por sucursal
    const porSucursal: { [key: string]: number } = {};
    stats?.forEach(s => {
      if (s.sucursal) {
        porSucursal[s.sucursal] = (porSucursal[s.sucursal] || 0) + 1;
      }
    });

    // Agrupar por profesional
    const porProfesional: { [key: string]: number } = {};
    stats?.forEach(s => {
      if (s.profesional) {
        porProfesional[s.profesional] = (porProfesional[s.profesional] || 0) + 1;
      }
    });

    return new Response(
      JSON.stringify({
        data,
        count,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
        stats: {
          totalCitas,
          citasCompletadas,
          valorTotal: valorTotal.toFixed(2),
          valorPromedio: valorPromedio.toFixed(2),
          porcentajeRetencion: porcentajeRetencion.toFixed(2),
          porcentajeReagendados: porcentajeReagendados.toFixed(2),
          porSucursal,
          porProfesional
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});