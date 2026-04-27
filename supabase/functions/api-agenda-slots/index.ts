import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate API key or auth token
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');
    
    if (!apiKey && !authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /api/agenda/slots-disponibles
    const url = new URL(req.url);
    const doctorId = url.searchParams.get('doctor_id');
    const sucursalId = url.searchParams.get('sucursal_id');
    const servicioId = url.searchParams.get('servicio_id');
    const fechaDesde = url.searchParams.get('fecha_desde');
    const fechaHasta = url.searchParams.get('fecha_hasta');

    if (!fechaDesde || !fechaHasta) {
      return new Response(JSON.stringify({ error: 'fecha_desde y fecha_hasta son requeridos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch existing appointments in the date range
    let query = supabase
      .from('agendas')
      .select('id, fecha, hora_inicio, hora_fin, duracion_minutos, id_empleado, id_sucursal')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
      .neq('estado', 'cancelada_cliente')
      .neq('estado', 'cancelada_clinica');

    if (doctorId) query = query.eq('id_empleado', parseInt(doctorId));
    if (sucursalId) query = query.eq('id_sucursal', parseInt(sucursalId));

    const { data: appointments, error } = await query;

    if (error) throw error;

    // Fetch bloqueos for the date range
    let bloqueoQuery = supabase
      .from('bloqueos_agenda')
      .select('id, fecha, hora_inicio, hora_fin, id_empleado, id_sucursal')
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta);

    if (doctorId) {
      bloqueoQuery = bloqueoQuery.or(`id_empleado.eq.${doctorId},id_empleado.is.null`);
    }
    if (sucursalId) bloqueoQuery = bloqueoQuery.eq('id_sucursal', parseInt(sucursalId));

    const { data: bloqueos, error: bloqueosError } = await bloqueoQuery;

    if (bloqueosError) throw bloqueosError;

    // Get service duration if servicioId provided
    let duracionServicio = 60; // default
    if (servicioId) {
      const { data: servicio } = await supabase
        .from('servicios')
        .select('duracion_minutos')
        .eq('id', parseInt(servicioId))
        .single();
      
      if (servicio) duracionServicio = servicio.duracion_minutos;
    }

    // Generate available slots (simple algorithm - can be enhanced)
    const slots = [];
    const workStart = 9; // 9 AM
    const workEnd = 20; // 8 PM
    
    const startDate = new Date(fechaDesde);
    const endDate = new Date(fechaHasta);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      
      for (let hour = workStart; hour < workEnd; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const slotStart = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotDateTime = `${dateStr}T${slotStart}:00`;
          
          // Check if slot overlaps with existing appointments
          const isOccupied = appointments?.some((apt: any) => {
            const aptDateTime = `${apt.fecha}T${apt.hora_inicio}`;
            return aptDateTime === slotDateTime;
          });

          // Check if slot is blocked
          const isBlocked = bloqueos?.some((bloqueo: any) => {
            if (bloqueo.fecha !== dateStr) return false;
            const bloqueStart = bloqueo.hora_inicio;
            const bloqueEnd = bloqueo.hora_fin;
            return slotStart >= bloqueStart && slotStart < bloqueEnd;
          });
          
          if (!isOccupied && !isBlocked) {
            slots.push({
              fecha: dateStr,
              hora_inicio: slotStart,
              duracion_minutos: duracionServicio,
              disponible: true
            });
          }
        }
      }
    }

    return new Response(JSON.stringify({ slots, total: slots.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
