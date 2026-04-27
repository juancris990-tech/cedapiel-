import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://deno.land/x/sheetjs@v0.18.3/xlsx.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProyeccionRow {
  profesional: string;
  tipo: string;
  cantidad_clientes: number | null;
  clientes_online: number | null;
  clientes_totales: number | null;
  cantidad_servicios: number | null;
  reservas_online: number | null;
  valor_futuro_mxn: number | null;
  porcentaje_clientes: number | null;
  nuevos_clientes: number | null;
  citas_agendadas: number | null;
  servicios_agendados: number | null;
  reservas_online2: number | null;
  valor_total_agendado_mxn: number | null;
}

function parseMoneyValue(value: any): number | null {
  if (!value || value === '') return null;
  const str = String(value).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function parseIntValue(value: any): number | null {
  if (!value || value === '') return null;
  const str = String(value).replace(/,/g, '');
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = roles?.some(r => ['admin', 'gerencia', 'direccion'].includes(r.role));
    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'Sin permisos suficientes' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No se proporcionó archivo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('CSV cargado, filas totales:', jsonData.length);

    // Eliminar datos existentes
    const { error: deleteError } = await supabase
      .from('proyeccion_valor_futuro')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('Error eliminando datos:', deleteError);
    }

    const rows: ProyeccionRow[] = [];

    // Buscar las 3 secciones
    let profesionalIdx = -1;
    let sucursalIdx = -1;
    let servicioIdx = -1;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const firstCell = String(row[0] || '').trim();
      
      if (firstCell === 'StaffFirstName') profesionalIdx = i;
      else if (firstCell === 'StaffFirstName3') sucursalIdx = i;
      else if (firstCell === 'StaffFirstName2') servicioIdx = i;
    }

    // Función auxiliar para procesar una sección
    const procesarSeccion = (startIdx: number, tipo: string) => {
      if (startIdx < 0) return;
      
      for (let i = startIdx + 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        
        // Detener si encontramos línea vacía
        if (!row || row.length === 0 || !row[0] || String(row[0]).trim() === '') {
          break;
        }

        const nombre = String(row[0] || '').trim();
        if (!nombre) continue;

        rows.push({
          profesional: nombre,
          tipo: tipo,
          cantidad_clientes: parseIntValue(row[1]),
          clientes_online: parseIntValue(row[2]),
          clientes_totales: parseIntValue(row[3]),
          cantidad_servicios: parseIntValue(row[4]),
          reservas_online: parseIntValue(row[5]),
          valor_futuro_mxn: parseMoneyValue(row[6]),
          porcentaje_clientes: parseIntValue(row[7]),
          nuevos_clientes: parseIntValue(row[8]),
          citas_agendadas: parseIntValue(row[9]),
          servicios_agendados: parseIntValue(row[10]),
          reservas_online2: parseIntValue(row[11]),
          valor_total_agendado_mxn: parseMoneyValue(row[12]),
        });
      }
    };

    // Procesar las 3 secciones
    procesarSeccion(profesionalIdx, 'profesional');
    procesarSeccion(sucursalIdx, 'sucursal');
    procesarSeccion(servicioIdx, 'servicio');

    console.log('Filas procesadas:', rows.length);

    // Insertar en lotes de 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('proyeccion_valor_futuro')
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
        message: `Se importaron ${insertedCount} registros correctamente`,
        registros: insertedCount 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error en importación:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        error: 'Error procesando archivo', 
        details: errorMessage 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});