import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as XLSX from "https://deno.land/x/sheetjs/xlsx.mjs";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProductividadRow {
  profesional: string;
  servicio: string;
  completadas: number;
  canceladas: number;
  no_show: number;
  facturado_mxn: number;
}

function parseMoneyValue(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const strValue = String(value).replace(/,/g, '').replace('$', '').trim();
  return parseFloat(strValue) || 0;
}

function parseIntValue(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  return parseInt(String(value), 10) || 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Usuario no autenticado');
    }

    // Verificar roles
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const hasPermission = roles?.some(r => 
      ['admin', 'gerencia', 'direccion'].includes(r.role)
    );

    if (!hasPermission) {
      return new Response(
        JSON.stringify({ error: 'No tienes permisos para importar' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      throw new Error('No se proporcionó archivo');
    }

    console.log(`Procesando archivo: ${file.name}, tipo: ${file.type}`);

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    console.log(`Total de filas en archivo: ${rawData.length}`);

    if (rawData.length < 2) {
      throw new Error('El archivo no contiene datos');
    }

    // La fila 0 tiene los nombres técnicos de columnas
    const headers = rawData[0];
    
    // COLUMNAS DEL REPORTE RESUMEN:
    // - Completed: citas completadas individuales por servicio (para tabla detalle)
    // - Completed1: total global de completadas → 81
    // - Cancelled1: total global de canceladas → 21
    // - DidNotShow1: total global de no-show → 0
    // - CompletedInvoiceAmount1: monto facturado individual (se suma) → Total: ~5.79M MXN
    const group1Index = headers.indexOf('Group1');
    const serviceNameIndex = headers.indexOf('ServiceName');
    const completedIndex = headers.indexOf('Completed'); // Individual por servicio para tabla
    const completedInvoiceAmount1Index = headers.indexOf('CompletedInvoiceAmount1'); // Facturado
    
    // Columnas de totales globales
    const completed1Index = headers.indexOf('Completed1'); // Total global de completadas
    const cancelled1Index = headers.indexOf('Cancelled1');
    let didNotShowIndex = headers.indexOf('DidNotShow1');
    if (didNotShowIndex === -1) didNotShowIndex = headers.indexOf('DidNotShow');
    if (didNotShowIndex === -1) didNotShowIndex = headers.indexOf('Did Not Show');
    
    console.log('Índices de columnas detectados:', {
      group1Index,
      serviceNameIndex,
      completedIndex,
      completed1Index,
      completedInvoiceAmount1Index,
      cancelled1Index,
      didNotShowIndex,
      headers: headers.slice(0, 50) // Mostrar primeras 50 columnas para debug
    });

    // Leer valores globales SOLO de la primera fila de datos (fila 2)
    let globalCompletadas = 0;
    let globalCanceladas = 0;
    let globalNoShow = 0;
    
    if (rawData.length > 2) {
      const primeraFilaDatos = rawData[2];
      globalCompletadas = parseIntValue(primeraFilaDatos[completed1Index]);
      globalCanceladas = parseIntValue(primeraFilaDatos[cancelled1Index]);
      if (didNotShowIndex !== -1) {
        globalNoShow = parseIntValue(primeraFilaDatos[didNotShowIndex]);
      }
      console.log('Valores globales extraídos:', { globalCompletadas, globalCanceladas, globalNoShow });
    }

    const records: ProductividadRow[] = [];

    // Procesar filas desde la fila 2 en adelante (saltar fila 0 de headers y fila 1 de "Value $, Invoiced $")
    for (let i = 2; i < rawData.length; i++) {
      const row = rawData[i];
      
      const profesional = row[group1Index];
      const servicio = row[serviceNameIndex];

      if (!profesional || !servicio) {
        console.log(`Fila ${i + 1}: Saltando - profesional o servicio vacío`);
        continue;
      }

      // Crear registro SOLO con valores individuales
      // NO guardamos canceladas/no_show aquí porque son globales
      const record: ProductividadRow = {
        profesional: String(profesional).trim(),
        servicio: String(servicio).trim(),
        completadas: parseIntValue(row[completedIndex]), // Individual por servicio
        canceladas: 0, // Se guardará en fila separada
        no_show: 0, // Se guardará en fila separada
        facturado_mxn: parseMoneyValue(row[completedInvoiceAmount1Index]),
      };

      records.push(record);
    }
    
    // Agregar UNA fila especial con los totales globales
    records.push({
      profesional: '_TOTALES_GLOBALES',
      servicio: 'Totales Globales',
      completadas: globalCompletadas, // Usar Completed1 = 81
      canceladas: globalCanceladas, // Usar Cancelled1 = 21
      no_show: globalNoShow, // Usar DidNotShow1 = 0
      facturado_mxn: 0,
    });

    console.log(`Registros procesados: ${records.length}`);
    
    // Validar totales esperados
    const totalFacturado = records
      .filter(r => r.profesional !== '_TOTALES_GLOBALES')
      .reduce((sum, r) => sum + r.facturado_mxn, 0);
    
    console.log('TOTALES CALCULADOS:', {
      completadas_global: globalCompletadas,
      canceladas: globalCanceladas,
      no_show: globalNoShow,
      facturado_mxn: totalFacturado,
      total_citas: globalCompletadas + globalCanceladas + globalNoShow
    });

    if (records.length === 0) {
      throw new Error('No se encontraron registros válidos para importar');
    }

    // Limpiar datos existentes antes de importar
    console.log('Limpiando datos existentes...');
    const { error: deleteError } = await supabase
      .from('resumen_productividad_personal')
      .delete()
      .neq('id', 0); // Elimina todos los registros

    if (deleteError) {
      console.error('Error limpiando datos:', deleteError);
      throw deleteError;
    }

    // Insertar en lotes de 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('resumen_productividad_personal')
        .insert(batch);

      if (insertError) {
        console.error('Error insertando lote:', insertError);
        throw insertError;
      }

      insertedCount += batch.length;
      console.log(`Insertados ${insertedCount}/${records.length} registros`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importación completada: ${insertedCount} registros procesados`,
        count: insertedCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error en importación:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Error desconocido',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
