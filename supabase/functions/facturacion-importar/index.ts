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
        JSON.stringify({ error: 'No tienes permisos para importar facturación' }),
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
    
    // Buscar la hoja "InvoiceDetail"
    const sheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('invoicedetail')
    ) || workbook.SheetNames[0];
    
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    if (rawData.length < 2) {
      throw new Error('El archivo está vacío o no tiene datos');
    }

    // Función para verificar si una fila es la fila de encabezado
    const isHeaderRow = (row: any[]): boolean => {
      const headerKeywords = ['invoice', 'date', 'customer', 'location', 'staff', 'type'];
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      return headerKeywords.filter(keyword => rowText.includes(keyword)).length >= 4;
    };

    // Buscar la fila de encabezado real
    let headerRowIndex = -1;
    let headerRow: any[] = [];
    
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      if (isHeaderRow(rawData[i])) {
        headerRowIndex = i;
        headerRow = rawData[i];
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('No se encontró la fila de encabezado en el archivo');
    }

    console.log('Fila de encabezado encontrada en:', headerRowIndex);
    console.log('Encabezados:', headerRow);

    // Mapear índices de columnas con mejor detección
    const getColumnIndex = (keywords: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const cell = headerRow[i];
        if (!cell) continue;
        const cellText = String(cell).toLowerCase().trim();
        for (const keyword of keywords) {
          if (cellText === keyword.toLowerCase() || cellText.includes(keyword.toLowerCase())) {
            console.log(`Columna "${keyword}" encontrada en índice ${i}: "${cell}"`);
            return i;
          }
        }
      }
      console.warn(`No se encontró columna para keywords: ${keywords.join(', ')}`);
      return -1;
    };

    const colIndexes = {
      invoice: getColumnIndex(['invoice #', 'invoice', 'factura', '#']),
      date: getColumnIndex(['date', 'fecha', 'invoice date', 'created']),
      customer: getColumnIndex(['customer', 'cliente', 'client', 'customer name']),
      location: getColumnIndex(['location', 'sucursal', 'ubicacion', 'branch']),
      staff: getColumnIndex(['staff', 'profesional', 'professional', 'employee']),
      type: getColumnIndex(['item type', 'type', 'tipo', 'category']),
      description: getColumnIndex(['item name', 'description', 'descripcion', 'product']),
      unitPrice: getColumnIndex(['unit price', 'precio unitario', 'price']),
      quantity: getColumnIndex(['quantity', 'cantidad', 'qty']),
      amount: getColumnIndex(['amount', 'monto', 'importe', 'subtotal']),
    };

    console.log('Índices de columnas:', colIndexes);
    console.log('Primera fila de datos:', rawData[headerRowIndex + 1]);
    
    // Validar que las columnas críticas se encontraron
    if (colIndexes.invoice === -1 || colIndexes.customer === -1) {
      console.error('No se encontraron todas las columnas necesarias');
      console.error('Encabezados encontrados:', headerRow);
      console.error('Índices:', colIndexes);
      throw new Error(`Columnas faltantes: ${
        colIndexes.invoice === -1 ? 'Invoice, ' : ''
      }${colIndexes.customer === -1 ? 'Customer' : ''}`);
    }

    // Función para parsear fecha
    const parseFecha = (fechaInput: any): string | null => {
      if (!fechaInput) return null;
      
      try {
        // Si es número (formato Excel serial)
        if (typeof fechaInput === 'number') {
          const excelEpoch = new Date(1900, 0, 1);
          const days = fechaInput - 2;
          const fecha = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
          const año = fecha.getFullYear();
          const mes = String(fecha.getMonth() + 1).padStart(2, '0');
          const dia = String(fecha.getDate()).padStart(2, '0');
          return `${año}-${mes}-${dia}`;
        }
        
        // Si es string
        if (typeof fechaInput === 'string') {
          const fechaStr = String(fechaInput).trim();
          
          // Mapeo de meses en inglés (3 letras)
          const mesesMap: { [key: string]: string } = {
            'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
            'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
            'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12',
            'ene': '01', 'abr': '04', 'ago': '08', 'dic': '12'
          };
          
          // Formato: "20 Nov 2025" o "20 November 2025"
          const partes = fechaStr.split(/\s+/);
          if (partes.length >= 3) {
            const dia = partes[0].padStart(2, '0');
            const mesTexto = partes[1].toLowerCase().substring(0, 3);
            const año = partes[2];
            const mes = mesesMap[mesTexto];
            
            if (mes && año && dia) {
              return `${año}-${mes}-${dia}`;
            }
          }
          
          // Formato ISO: "2025-11-20"
          if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
            return fechaStr;
          }
        }
      } catch (e) {
        console.warn('Error parseando fecha:', fechaInput, e);
      }
      return null;
    };

    // Función para parsear valor numérico
    const parseValor = (valorStr: any): number => {
      if (valorStr === null || valorStr === undefined || valorStr === '') return 0;
      try {
        const valorLimpio = String(valorStr).replace(/[$,]/g, '').trim();
        const parsed = parseFloat(valorLimpio);
        return isNaN(parsed) ? 0 : parsed;
      } catch (e) {
        return 0;
      }
    };

    // Procesar filas de datos
    const tempRecords: any[] = [];
    let lastSeenCustomer = '';
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      
      // Verificar si la fila está completamente vacía
      if (!row || row.every(cell => !cell)) continue;
      
      const invoiceNum = row[colIndexes.invoice];
      if (!invoiceNum) continue;
      
      // Debug: mostrar la primera fila con detalle
      if (i === headerRowIndex + 1) {
        console.log('=== PRIMERA FILA DE DATOS (Fila ' + (i + 1) + ') ===');
        console.log('Fila completa:', row);
        console.log('Customer índice:', colIndexes.customer);
        console.log('Customer valor:', row[colIndexes.customer]);
        console.log('===================================');
      }
      
      // Limpiar Invoice # (puede venir con links de markdown como [53049](url))
      let invoiceClean = String(invoiceNum);
      const markdownMatch = invoiceClean.match(/\[(\d+)\]/);
      if (markdownMatch) {
        invoiceClean = markdownMatch[1];
      }
      
      const idFactura = parseInt(invoiceClean.replace(/\D/g, ''));
      if (isNaN(idFactura) || idFactura === 0) {
        console.warn(`Fila ${i + 1}: Invoice # inválido:`, invoiceNum);
        continue;
      }
      
      const fecha = parseFecha(row[colIndexes.date]);
      
      // Limpiar cliente (puede venir con links de markdown)
      let clienteRaw = row[colIndexes.customer] ? String(row[colIndexes.customer]) : '';
      
      const clienteMarkdown = clienteRaw.match(/\[([^\]]+)\]/);
      let cliente = clienteMarkdown ? clienteMarkdown[1].trim() : clienteRaw.trim();
      
      // Si el cliente está vacío, usar el último cliente visto (celdas fusionadas en Excel)
      if (!cliente && lastSeenCustomer) {
        cliente = lastSeenCustomer;
        if (i < headerRowIndex + 10) {
          console.log(`Fila ${i + 1}: Usando cliente de celda fusionada: ${lastSeenCustomer}`);
        }
      }
      
      // Actualizar último cliente visto si encontramos uno válido
      if (cliente) {
        lastSeenCustomer = cliente;
      }
      
      const sucursal = row[colIndexes.location] ? String(row[colIndexes.location]).trim() : '';
      const tipo = row[colIndexes.type] ? String(row[colIndexes.type]).trim() : '';
      
      // Validación con logging detallado
      if (!fecha) {
        console.warn(`Fila ${i + 1} omitida: fecha inválida. Valor original:`, row[colIndexes.date]);
        continue;
      }
      if (!cliente) {
        console.warn(`Fila ${i + 1} omitida: cliente vacío`);
        continue;
      }
      if (!sucursal) {
        console.warn(`Fila ${i + 1} omitida: sucursal vacía`);
        continue;
      }
      
      tempRecords.push({
        idFactura,
        fecha,
        cliente,
        sucursal,
        profesional: row[colIndexes.staff] ? String(row[colIndexes.staff]).trim() : null,
        tipo,
        descripcion: row[colIndexes.description] ? String(row[colIndexes.description]).trim() : null,
        precioUnitario: parseValor(row[colIndexes.unitPrice]),
        cantidad: Math.round(parseValor(row[colIndexes.quantity])),
        monto: parseValor(row[colIndexes.amount]),
      });
    }

    if (tempRecords.length === 0) {
      throw new Error('No se encontraron registros válidos para importar');
    }

    // Calcular montoTotal por factura
    const totalsPorFactura = new Map<number, number>();
    tempRecords.forEach(record => {
      const current = totalsPorFactura.get(record.idFactura) || 0;
      totalsPorFactura.set(record.idFactura, current + record.monto);
    });

    // Crear registros finales con montoTotal
    const records = tempRecords.map(record => ({
      id_factura: String(record.idFactura),
      fecha: record.fecha,
      cliente: record.cliente,
      sucursal: record.sucursal,
      profesional: record.profesional,
      tipo: record.tipo,
      descripcion: record.descripcion,
      precio_unitario_mxn: record.precioUnitario,
      cantidad: record.cantidad,
      monto_mxn: record.monto,
      monto_total_mxn: totalsPorFactura.get(record.idFactura) || 0,
    }));

    if (records.length === 0) {
      throw new Error('No se encontraron registros válidos para importar');
    }

    // Insertar en lotes de 100
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('facturacion_detalle')
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
        message: `Se importaron ${insertedCount} registros de facturación correctamente`,
        inserted: insertedCount,
        total_records: records.length
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
