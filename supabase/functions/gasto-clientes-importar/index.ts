import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para convertir números con formato "1,700.00" a decimal
function parseNumberWithCommas(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  
  const str = String(value).trim();
  // Remover comas y convertir a número
  const cleaned = str.replace(/,/g, '');
  const num = parseFloat(cleaned);
  
  return isNaN(num) ? 0 : num;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Verificar autenticación
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Crear cliente con auth token del usuario
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: authHeader
        }
      }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar permisos
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles = userRoles?.map(r => r.role) || [];
    const hasPermission = roles.some(r => ['admin', 'gerencia', 'direccion'].includes(r));

    if (!hasPermission) {
      return new Response(JSON.stringify({ error: 'No tienes permisos para importar datos' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { csvData } = await req.json();

    if (!Array.isArray(csvData) || csvData.length === 0) {
      return new Response(JSON.stringify({ error: 'Datos CSV inválidos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Procesando ${csvData.length} registros CSV`);

    // Mapear y validar datos del CSV
    const records = csvData.map((row: any) => {
      // Mapeando las columnas del CSV al esquema de la tabla
      return {
        cliente: row.CustomerName || '',
        email: row.Email || null,
        telefono: row.Telephone || null,
        numero_sms: row.Textbox27 || null,
        visitas_registradas: parseInt(row.Textbox21 || '0') || 0,
        cantidad_citas: parseInt(row.BookingCount || '0') || 0,
        valor_citas_mxn: parseNumberWithCommas(row.BookingValue),
        monto_servicios_facturados_mxn: parseNumberWithCommas(row.InvoicedBookingAmount),
        monto_productos_facturados_mxn: parseNumberWithCommas(row.InvoicedStockAmount1),
        monto_descuentos_mxn: parseNumberWithCommas(row.InvoicedDiscountAmount),
        monto_facturado_total_mxn: parseNumberWithCommas(row.InvoicedAmount),
        cantidad_grupos_citas: parseInt(row.BookingGroupCount || '0') || 0,
        cantidad_citas_periodo: parseInt(row.BookingCount1 || '0') || 0,
        valor_citas_periodo_mxn: parseNumberWithCommas(row.BookingValue1),
        monto_servicios_facturados_periodo_mxn: parseNumberWithCommas(row.InvoicedBookingAmount1),
        cargo_adicional_mxn: parseNumberWithCommas(row.Textbox13),
        descuento_periodo_mxn: parseNumberWithCommas(row.Textbox16),
        monto_facturado_final_mxn: parseNumberWithCommas(row.InvoicedAmount1),
      };
    }).filter(record => record.cliente && record.cliente.trim() !== '');

    console.log(`${records.length} registros válidos después de filtrado`);

    if (records.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay registros válidos para importar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insertar en lotes de 100
    const batchSize = 100;
    let totalInserted = 0;
    const errors = [];

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('gasto_clientes_periodo')
        .insert(batch);

      if (insertError) {
        console.error(`Error insertando lote ${i / batchSize + 1}:`, insertError);
        errors.push({
          batch: i / batchSize + 1,
          error: insertError.message
        });
      } else {
        totalInserted += batch.length;
        console.log(`Lote ${i / batchSize + 1} insertado exitosamente (${batch.length} registros)`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Importación completada`,
        stats: {
          totalRecords: csvData.length,
          validRecords: records.length,
          inserted: totalInserted,
          errors: errors.length > 0 ? errors : null
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error en importación:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ 
        error: 'Error al procesar la importación',
        details: errorMessage
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
