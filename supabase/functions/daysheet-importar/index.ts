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
        JSON.stringify({ error: 'Token inválido o sesión expirada. Por favor, recarga la página e intenta nuevamente.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuario autenticado correctamente:', user.id);

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
        JSON.stringify({ error: 'No tienes permisos para importar DaySheets' }),
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

    // Procesar filas
    const records = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      // Mapeo de columnas según el CSV
      // [0]: Fecha, [1]: Cliente, [2]: vacío, [3]: Teléfono, [4]: Recurso, [5]: Símbolo
      // [6]: Horario, [7]: Estado, [8]: Profesional, [9]: Servicio, [10]: Equipo
      // [11]: Sucursal, [12]: Precio, [13]: Notas/Alertas
      
      const fecha = row[0] ? String(row[0]).trim() : '';
      const cliente = row[1] ? String(row[1]).trim() : '';
      const telefono = row[3] ? String(row[3]).trim() : null;
      const recurso = row[4] ? String(row[4]).trim() : null;
      const simbolo = row[5] ? String(row[5]).trim() : null;
      const horario = row[6] ? String(row[6]).trim() : '';
      const estado = row[7] ? String(row[7]).trim() : '';
      const profesional = row[8] ? String(row[8]).trim() : null;
      const servicio = row[9] ? String(row[9]).trim() : null;
      const equipo = row[10] ? String(row[10]).trim() : null;
      const sucursal = row[11] ? String(row[11]).trim() : '';
      const notasAlertas = row[13] ? String(row[13]).trim() : null;

      // Parsear precio
      let precioMxn = 0;
      if (row[12]) {
        const precioStr = String(row[12]).replace(/,/g, '').trim();
        const parsed = parseFloat(precioStr);
        if (!isNaN(parsed)) {
          precioMxn = parsed;
        }
      }

      // Validar campos requeridos
      if (!fecha || !cliente || !horario || !estado || !sucursal) {
        console.warn(`Fila ${i + 1} omitida por campos requeridos faltantes`);
        continue;
      }

      records.push({
        fecha,
        cliente,
        telefono,
        recurso,
        simbolo,
        horario,
        estado,
        profesional,
        servicio,
        equipo,
        sucursal,
        precio_mxn: precioMxn,
        notas_alertas: notasAlertas
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
        .from('daysheet_citas')
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
        message: `Se importaron ${insertedCount} citas correctamente`,
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
