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
        JSON.stringify({ error: 'No tienes permisos para importar ventas' }),
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

    // Función para parsear fecha "20 Nov 2025" a "2025-11-20"
    const parseFecha = (fechaInput: any): string | null => {
      if (!fechaInput) return null;
      
      try {
        // Si es número Excel
        if (typeof fechaInput === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          const days = fechaInput - 2;
          const fecha = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
          const año = fecha.getFullYear();
          const mes = String(fecha.getMonth() + 1).padStart(2, '0');
          const dia = String(fecha.getDate()).padStart(2, '0');
          return `${año}-${mes}-${dia}`;
        }
        
        // Si es string "20 Nov 2025"
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

    // Función para parsear valor monetario "1,700.00" a decimal
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

    const records = [];
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      // Mapeo de columnas según el CSV
      // [0]: InvoiceIdSequential, [1]: InvoiceDate, [2]: CustomerName, [3]: LocationName,
      // [4]: StaffName, [5]: Type, [6]: Description, [7]: UnitPrice, [8]: Quantity,
      // [9]: TaxAmount, [10]: PackageLiabilityAmount, [11]: Amount, [12]: Quantity1,
      // [13]: TaxAmount1, [14]: PackageLiabilityAmountTotal, [15]: Amount1
      
      const id_factura = row[0] ? String(row[0]).trim() : '';
      const fecha = parseFecha(row[1]);
      const cliente = row[2] ? String(row[2]).trim() : '';
      const sucursal = row[3] ? String(row[3]).trim() : '';
      
      // Validar campos requeridos
      if (!id_factura || !fecha || !cliente || !sucursal) {
        console.warn(`Fila ${i + 1} omitida: falta id_factura, fecha, cliente o sucursal`);
        continue;
      }
      
      const tipo = row[5] ? String(row[5]).trim() : '';
      if (!tipo) {
        console.warn(`Fila ${i + 1} omitida: falta tipo`);
        continue;
      }
      
      records.push({
        id_factura,
        fecha_venta: fecha,
        cliente,
        sucursal,
        profesional: row[4] ? String(row[4]).trim() : null,
        tipo,
        descripcion: row[6] ? String(row[6]).trim() : null,
        precio_unitario_mxn: parseValor(row[7]),
        cantidad: parseValor(row[8]),
        impuesto_mxn: parseValor(row[9]),
        responsabilidad_paquete_mxn: parseValor(row[10]),
        monto_linea_mxn: parseValor(row[11]),
        cantidad_aux: parseValor(row[12]),
        impuesto_aux_mxn: parseValor(row[13]),
        responsabilidad_paquete_total_mxn: parseValor(row[14]),
        monto_total_mxn: parseValor(row[15]),
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
        .from('ventas_detalle')
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
        message: `Se importaron ${insertedCount} líneas de venta correctamente`,
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