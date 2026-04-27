import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to parse date from format "DD MMM YYYY hh:mm AM/PM" to ISO
function parseDateFromCSV(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  try {
    // Format: "23 Oct 2023 6:00 PM"
    const months: { [key: string]: string } = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = dateStr.trim().split(' ');
    if (parts.length < 5) return null;
    
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1]];
    const year = parts[2];
    let time = parts[3];
    const ampm = parts[4];
    
    if (!month) return null;
    
    // Convert to 24-hour format
    const [hours, minutes] = time.split(':');
    let hour24 = parseInt(hours);
    
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    const hour24Str = hour24.toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hour24Str}:${minutes}:00`;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value);
  return isNaN(num) ? 0 : num;
}

function parseInteger(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'string' ? parseInt(value, 10) : Number(value);
  return isNaN(num) ? null : num;
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user roles
    const { data: roles } = await supabase.rpc('get_user_roles', { _user_id: user.id });
    const hasPermission = roles && (
      roles.includes('admin') || 
      roles.includes('gerencia') || 
      roles.includes('direccion')
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para importar datos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON body (CSV data converted to JSON)
    const { data: csvData } = await req.json();

    if (!Array.isArray(csvData) || csvData.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron datos para importar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Procesando ${csvData.length} registros`);

    // Map CSV data to database format
    const records = csvData.map((row: any) => ({
      profesional: row.StaffName1 || row.profesional || '',
      cliente: row.CustomerName || row.cliente || '',
      email: row.Email || row.email || null,
      numero_sms: row.SmsNumber || row.numero_sms || null,
      telefono: row.Telephone || row.telefono || null,
      ultima_cita: parseDateFromCSV(row.LastBookingDate || row.ultima_cita),
      dias_sin_volver: parseInteger(row.DaysSinceLastBooking || row.dias_sin_volver),
      ultimo_servicio: row.ServiceName || row.ultimo_servicio || null,
      estado: row.Textbox4 || row.estado || null,
      gasto_total_mxn: parseNumber(row.TotalSpend || row.gasto_total_mxn)
    }));

    // Validate required fields
    const validRecords = records.filter(r => r.profesional && r.cliente);
    
    console.log(`${validRecords.length} registros válidos de ${records.length} total`);

    if (validRecords.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No hay registros válidos para importar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert in batches to avoid timeouts
    const batchSize = 100;
    let insertedCount = 0;
    let errors = [];

    for (let i = 0; i < validRecords.length; i += batchSize) {
      const batch = validRecords.slice(i, i + batchSize);
      const { error: insertError, count } = await supabase
        .from('clientes_inactivos')
        .insert(batch);

      if (insertError) {
        console.error('Error en batch:', insertError);
        errors.push(`Batch ${i / batchSize + 1}: ${insertError.message}`);
      } else {
        insertedCount += batch.length;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importación completada: ${insertedCount} registros insertados`,
        total: csvData.length,
        valid: validRecords.length,
        inserted: insertedCount,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error en importación:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Error al procesar la importación' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
