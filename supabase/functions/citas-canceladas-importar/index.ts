import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.1';

// Helper: parse date from CSV format (DD MMM YYYY or similar)
function parseDateFromCSV(dateStr: any): string | null {
  if (!dateStr) return null;
  
  try {
    // Si es un objeto Date de JavaScript
    if (dateStr instanceof Date) {
      const year = dateStr.getFullYear();
      const month = (dateStr.getMonth() + 1).toString().padStart(2, '0');
      const day = dateStr.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Si es un número (formato de fecha de Excel)
    if (typeof dateStr === 'number') {
      // Excel serial date (días desde 1900-01-01)
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateStr - 2) * 86400000);
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // Si es un string
    if (typeof dateStr === 'string') {
      const trimmed = dateStr.trim();
      if (trimmed === '') return null;
      
      // Format: "20 Nov 2025"
      const monthMap: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      const parts = trimmed.split(' ');
      if (parts.length >= 3) {
        const day = parts[0].padStart(2, '0');
        const month = monthMap[parts[1]];
        const year = parts[2];
        
        if (month && year) {
          return `${year}-${month}-${day}`;
        }
      }
      
      // Try ISO format
      if (trimmed.match(/^\d{4}-\d{2}-\d{2}/)) {
        return trimmed.split('T')[0];
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing date:', dateStr, error);
    return null;
  }
}

// Helper: parse time from CSV format
function parseTime(timeStr: any): string | null {
  if (!timeStr) return null;
  
  try {
    // Si es un objeto Date
    if (timeStr instanceof Date) {
      const hours = timeStr.getHours().toString().padStart(2, '0');
      const minutes = timeStr.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}:00`;
    }
    
    // Si es un número (fracción de día de Excel)
    if (typeof timeStr === 'number') {
      const totalMinutes = Math.round(timeStr * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    }
    
    // Si es un string
    if (typeof timeStr === 'string') {
      const cleanTime = timeStr.trim();
      if (cleanTime === '') return null;
      
      // Format: "10:00 AM" or "1:30 PM"
      const parts = cleanTime.split(' ');
      
      if (parts.length === 2) {
        const [time, period] = parts;
        const [hours, minutes] = time.split(':').map(Number);
        
        let hour24 = hours;
        if (period.toUpperCase() === 'PM' && hours !== 12) {
          hour24 = hours + 12;
        } else if (period.toUpperCase() === 'AM' && hours === 12) {
          hour24 = 0;
        }
        
        return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
      }
      
      // Format: "HH:MM" or "HH:MM:SS"
      if (cleanTime.match(/^\d{1,2}:\d{2}/)) {
        return cleanTime.length === 5 ? `${cleanTime}:00` : cleanTime;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error parsing time:', timeStr, error);
    return null;
  }
}

// Helper: parse number
function parseNumber(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const cleanValue = value.toString().replace(/,/g, '');
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper: parse boolean
function parseBoolean(value: any): boolean {
  if (!value) return false;
  const strValue = String(value).trim().toUpperCase();
  return strValue === 'Y';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check user roles using admin client to bypass RLS
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    console.log('User ID:', user.id);
    console.log('Roles found:', roles);
    console.log('Roles error:', rolesError);

    const userRoles = roles?.map(r => r.role) || [];
    const canImport = userRoles.some(role => 
      ['admin', 'gerencia', 'direccion'].includes(role)
    );

    if (!canImport) {
      return new Response(JSON.stringify({ 
        error: 'No tiene permisos para importar',
        details: `Roles encontrados: ${userRoles.join(', ') || 'ninguno'}`
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const body = await req.json();
    const { data: csvData } = body;

    if (!csvData || !Array.isArray(csvData)) {
      return new Response(JSON.stringify({ error: 'Datos inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Map and validate data
    const records = csvData.map((row: any) => {
      return {
        fecha_cita: parseDateFromCSV(row.Date),
        cliente: row.Customer || '',
        email: row.Email || null,
        telefono: row.Telephone || null,
        numero_sms: row.SmsNumber || null,
        sucursal: row.Location || '',
        estado: row.Status || null,
        fecha_creacion: parseDateFromCSV(row.DateCreated),
        staff_registro: row.StaffAdded || null,
        hora_inicio: parseTime(row.StartDate),
        hora_fin: parseTime(row.EndDate),
        profesional: row.StaffName || null,
        servicio: row.ServiceName || null,
        equipo: row.Textbox8 || null,
        retenido: parseBoolean(row.Retained),
        reagendado: parseBoolean(row.Rebooked),
        facturado: parseBoolean(row.Invoiced),
        valor_mxn: parseNumber(row.Value)
      };
    }).filter(record => record.fecha_cita && record.cliente && record.sucursal);

    console.log('Total registros recibidos:', csvData.length);
    console.log('Registros válidos después del filtro:', records.length);
    if (records.length > 0) {
      console.log('Primer registro:', records[0]);
    }

    if (records.length === 0) {
      return new Response(JSON.stringify({ 
        error: 'No se encontraron registros válidos',
        total: csvData.length,
        valid: 0,
        details: 'Verifique que el archivo tenga las columnas: Date, Customer, Location'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert in batches using admin client to bypass RLS
    const batchSize = 100;
    let inserted = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error: insertError } = await supabaseAdmin
        .from('citas_canceladas')
        .insert(batch);

      if (insertError) {
        console.error(`Error insertando batch ${Math.floor(i / batchSize) + 1}:`, insertError);
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${insertError.message}`);
      } else {
        inserted += batch.length;
        console.log(`Batch ${Math.floor(i / batchSize) + 1} insertado correctamente: ${batch.length} registros`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Importación completada`,
      total: csvData.length,
      valid: records.length,
      inserted,
      errors: errors.length > 0 ? errors : undefined
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error en importación:', error);
    return new Response(JSON.stringify({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});