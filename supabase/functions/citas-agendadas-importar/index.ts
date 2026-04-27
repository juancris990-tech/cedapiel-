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

    // Verificar permisos
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = roles?.some(r => 
      ['admin', 'gerencia', 'direccion'].includes(r.role)
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para importar citas agendadas' }),
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

    // Función para convertir fecha Excel serial (45981) o string "20 Nov 2025" a "2025-11-20"
    const parseFecha = (fechaInput: any): string | null => {
      if (!fechaInput) return null;
      
      try {
        // Si es un número (serial de Excel)
        if (typeof fechaInput === 'number') {
          // Excel serial date: días desde 1900-01-01 (pero Excel tiene bug: cuenta 1900 como bisiesto)
          const excelEpoch = new Date(1900, 0, 1);
          const days = fechaInput - 2; // Ajuste por el bug de Excel
          const fecha = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
          const año = fecha.getFullYear();
          const mes = String(fecha.getMonth() + 1).padStart(2, '0');
          const dia = String(fecha.getDate()).padStart(2, '0');
          return `${año}-${mes}-${dia}`;
        }
        
        // Si es string, intentar parsear "20 Nov 2025"
        if (typeof fechaInput === 'string') {
          const meses: { [key: string]: string } = {
            'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
            'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
            'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
            'Ene': '01', 'Dic': '12'
          };
          const partes = String(fechaInput).trim().split(/\s+/);
          if (partes.length >= 3) {
            const dia = partes[0].padStart(2, '0');
            const mes = meses[partes[1]];
            const año = partes[2];
            if (mes && año && dia) {
              return `${año}-${mes}-${dia}`;
            }
          }
        }
      } catch (e) {
        console.warn('Error parseando fecha:', fechaInput, e);
      }
      return null;
    };

    // Función para convertir valor monetario "1,700.00" a decimal
    const parseValor = (valorStr: any): number => {
      if (!valorStr) return 0;
      try {
        const valorLimpio = String(valorStr).replace(/,/g, '').trim();
        const parsed = parseFloat(valorLimpio);
        return isNaN(parsed) ? 0 : parsed;
      } catch (e) {
        return 0;
      }
    };

    // Procesar filas (saltamos la primera que es el encabezado)
    const records = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      // Mapeo de columnas según el CSV
      // [0]: Textbox6 (Resource), [1]: Date, [2]: Customer, [3]: Email, [4]: Telephone,
      // [5]: SmsNumber, [6]: Location, [7]: Status, [8]: DateCreated, [9]: StaffAdded,
      // [10]: StartDate, [11]: EndDate, [12]: StaffName, [13]: ServiceName, [14]: Textbox8,
      // [15]: Retained, [16]: Rebooked, [17]: Invoiced, [18]: Value
      
      const recurso = row[0] ? String(row[0]).trim() : null;
      const fecha = parseFecha(row[1]);
      const cliente = row[2] ? String(row[2]).trim() : '';
      const email = row[3] ? String(row[3]).trim() : null;
      const telefono = row[4] ? String(row[4]).trim() : null;
      const numero_sms = row[5] ? String(row[5]).trim() : null;
      const sucursal = row[6] ? String(row[6]).trim() : '';
      const estado = row[7] ? String(row[7]).trim() : '';
      const fechaCreacionStr = row[8] ? row[8] : null;
      const fecha_creacion = fechaCreacionStr ? parseFecha(fechaCreacionStr) : null;
      const creado_por = row[9] ? String(row[9]).trim() : null;
      const hora_inicio = row[10] ? String(row[10]).trim() : '';
      const hora_fin = row[11] ? String(row[11]).trim() : '';
      const profesional = row[12] ? String(row[12]).trim() : null;
      const servicio = row[13] ? String(row[13]).trim() : null;
      const equipo = row[14] ? String(row[14]).trim() : null;
      const retencion = row[15] ? String(row[15]).trim() : null;
      const reagendado = row[16] ? String(row[16]).trim() : null;
      const facturado = row[17] ? String(row[17]).trim() : null;
      const valor_mxn = parseValor(row[18]);

      // Validar campos requeridos (solo los más críticos)
      if (!fecha || !cliente || !sucursal || !estado) {
        console.warn(`Fila ${i + 1} omitida: fecha=${fecha}, cliente=${cliente}, sucursal=${sucursal}, estado=${estado}`);
        continue;
      }
      
      // Validar que al menos tenga hora_inicio, hora_fin es opcional
      if (!hora_inicio) {
        console.warn(`Fila ${i + 1} omitida: falta hora_inicio`);
        continue;
      }

      records.push({
        recurso,
        fecha,
        cliente,
        email,
        telefono,
        numero_sms,
        sucursal,
        estado,
        fecha_creacion,
        creado_por,
        hora_inicio,
        hora_fin,
        profesional,
        servicio,
        equipo,
        retencion,
        reagendado,
        facturado,
        valor_mxn
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
        .from('citas_agendadas')
        .insert(batch);

      if (insertError) {
        console.error('Error insertando lote:', insertError);
        throw insertError;
      }
      insertedCount += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${insertedCount} citas agendadas correctamente`,
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