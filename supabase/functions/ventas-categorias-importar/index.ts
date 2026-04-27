import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategoriaRow {
  categoria_servicio: string;
  cantidad_servicios: number;
  porcentaje_participacion: number;
}

function parsePercentValue(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const str = String(value).replace('%', '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

function parseIntValue(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseInt(String(value), 10);
  return isNaN(num) ? 0 : num;
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

    // Verificar permisos (admin, gerencia o direccion)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = roles?.some(r => 
      r.role === 'admin' || r.role === 'gerencia' || r.role === 'direccion'
    );

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'No tiene permisos para importar' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new Response(JSON.stringify({ error: 'No se encontró archivo' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log('Filas leídas del CSV:', jsonData.length);

    const categorias: CategoriaRow[] = [];

    // Buscar la sección de resumen (ServiceCategory,Quantity,Textbox41)
    let headerIdx = -1;
    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (row[0] === 'ServiceCategory' && row[1] === 'Quantity' && row[2] === 'Textbox41') {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) {
      return new Response(
        JSON.stringify({ error: 'No se encontró el encabezado correcto (ServiceCategory,Quantity,Textbox41)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Leer datos hasta encontrar línea vacía o fin de sección
    for (let i = headerIdx + 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Si la fila está vacía o tiene un nuevo encabezado, terminar
      if (!row[0] || row[0].toString().trim() === '' || 
          row[0] === 'ServiceCategory1') {
        break;
      }

      const categoria = row[0]?.toString().trim();
      if (!categoria) continue;

      const cantidad = parseIntValue(row[1]);
      const porcentaje = parsePercentValue(row[2]);

      categorias.push({
        categoria_servicio: categoria,
        cantidad_servicios: cantidad,
        porcentaje_participacion: porcentaje
      });
    }

    console.log('Categorías procesadas:', categorias.length);

    if (categorias.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No se encontraron datos para importar' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar datos previos
    const { error: deleteError } = await supabase
      .from('ventas_por_categoria_servicio')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('Error al limpiar tabla:', deleteError);
    }

    // Insertar en lotes de 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < categorias.length; i += batchSize) {
      const batch = categorias.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('ventas_por_categoria_servicio')
        .insert(batch);

      if (insertError) {
        console.error('Error al insertar batch:', insertError);
        throw insertError;
      }

      insertedCount += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Se importaron ${insertedCount} categorías correctamente`,
        registros_importados: insertedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en importación:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: 'Error al procesar archivo', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
