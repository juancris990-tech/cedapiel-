import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido o sesión expirada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = roles?.some(r => 
      ['admin', 'gerencia', 'direccion'].includes(r.role)
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para importar clientes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (rawData.length < 2) {
      throw new Error('El archivo está vacío o no tiene datos');
    }

    // Función para parsear fecha "2025-11-19 9:15pm" a timestamp
    const parseFecha = (fechaInput: any): string | null => {
      if (!fechaInput) return null;
      
      try {
        // Si es número Excel
        if (typeof fechaInput === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          const days = fechaInput - 2;
          const fecha = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
          return fecha.toISOString();
        }
        
        // Si es string con formato "2025-11-19 9:15pm"
        if (typeof fechaInput === 'string') {
          const str = fechaInput.trim();
          
          // Parsear "2025-11-19 9:15pm"
          const match = str.match(/(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(am|pm)/i);
          if (match) {
            const [, fecha, hora, minutos, periodo] = match;
            let horas = parseInt(hora);
            if (periodo.toLowerCase() === 'pm' && horas !== 12) {
              horas += 12;
            } else if (periodo.toLowerCase() === 'am' && horas === 12) {
              horas = 0;
            }
            return `${fecha}T${String(horas).padStart(2, '0')}:${minutos}:00`;
          }
          
          // Formato solo fecha "2025-11-19"
          if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return `${str}T00:00:00`;
          }
        }
      } catch (e) {
        console.warn('Error parseando fecha:', fechaInput, e);
      }
      return null;
    };

    // Función para parsear booleano
    const parseBoolean = (value: any): boolean => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return false;
    };

    const records = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      // Mapeo de columnas según el CSV
      // [0]: Full name, [1]: First name, [2]: Last name, [3]: Client ID, [4]: Mobile, 
      // [5]: Phone, [6]: Email address, [7]: Company, [8]: Address 1, [9]: Address 2,
      // [10]: Suburb, [11]: City, [12]: State, [13]: Postcode, [14]: Last appt. date,
      // [15]: Last appt. staff, [16]: Last appt. status, [17]: Last appt. service,
      // [18]: Last appt. booked via, [19]: Date added, [20]: VIP, [21]: # of appts.,
      // [22]: Weeks absent, [23]: Date of birth
      
      const nombre_completo = row[0] ? String(row[0]).trim() : '';
      if (!nombre_completo) continue; // Saltar filas sin nombre
      
      const cliente_id = row[3] ? parseInt(String(row[3])) : null;
      
      records.push({
        nombre_completo,
        nombre: row[1] ? String(row[1]).trim() : null,
        apellido: row[2] ? String(row[2]).trim() : null,
        cliente_id,
        telefono_movil: row[4] ? String(row[4]).trim() : null,
        telefono: row[5] ? String(row[5]).trim() : null,
        email: row[6] ? String(row[6]).trim() : null,
        empresa: row[7] ? String(row[7]).trim() : null,
        direccion_1: row[8] ? String(row[8]).trim() : null,
        direccion_2: row[9] ? String(row[9]).trim() : null,
        suburbio: row[10] ? String(row[10]).trim() : null,
        ciudad: row[11] ? String(row[11]).trim() : null,
        estado: row[12] ? String(row[12]).trim() : null,
        codigo_postal: row[13] ? String(row[13]).trim() : null,
        fecha_ultimo_servicio: parseFecha(row[14]),
        profesional_ultimo_servicio: row[15] ? String(row[15]).trim() : null,
        estado_ultima_cita: row[16] ? String(row[16]).trim() : null,
        ultimo_servicio: row[17] ? String(row[17]).trim() : null,
        ultima_cita_reservada_via: row[18] ? String(row[18]).trim() : null,
        fecha_registro: parseFecha(row[19]),
        es_vip: parseBoolean(row[20]),
        cantidad_citas: row[21] ? parseInt(String(row[21])) : 0,
        semanas_ausente: row[22] ? parseInt(String(row[22])) : 0,
        fecha_nacimiento: parseFecha(row[23])?.split('T')[0] || null,
      });
    }

    if (records.length === 0) {
      throw new Error('No se encontraron registros válidos para importar');
    }

    // Insertar en lotes de 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('clientes_reporte')
        .upsert(batch, { onConflict: 'cliente_id' });

      if (insertError) {
        console.error('Error insertando lote:', insertError);
        throw insertError;
      }
      insertedCount += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${insertedCount} clientes correctamente`,
        count: insertedCount
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en importación:', error);
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