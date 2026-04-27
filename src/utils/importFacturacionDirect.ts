import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export async function importFacturacionDirect(fileUrl: string) {
  try {
    console.log('=== INICIO IMPORTACIÓN ===');
    console.log('URL del archivo:', fileUrl);
    
    // Fetch el archivo
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Error al cargar archivo: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log('Archivo cargado, tamaño:', arrayBuffer.byteLength, 'bytes');
    
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    console.log('Hojas disponibles:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('invoicedetail')
    ) || workbook.SheetNames[0];
    
    console.log('Hoja seleccionada:', sheetName);
    
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
    
    console.log('Total de filas en el archivo:', rawData.length);
    console.log('Primeras 5 filas:', rawData.slice(0, 5));

    // Buscar encabezado
    const isHeaderRow = (row: any[]): boolean => {
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      // Buscar específicamente las columnas que necesitamos
      const hasInvoice = rowText.includes('invoice');
      const hasDate = rowText.includes('date');
      const hasCustomer = rowText.includes('customer');
      const hasLocation = rowText.includes('location');
      const hasStaff = rowText.includes('staff');
      
      console.log(`Fila analizada: "${rowText.substring(0, 100)}..." - invoice: ${hasInvoice}, date: ${hasDate}, customer: ${hasCustomer}`);
      
      // Si tiene invoice, customer y location, es el encabezado
      return hasInvoice && hasCustomer && hasLocation;
    };

    let headerRowIndex = -1;
    let headerRow: any[] = [];
    
    console.log('Buscando fila de encabezado...');
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      if (isHeaderRow(rawData[i])) {
        headerRowIndex = i;
        headerRow = rawData[i];
        console.log('✅ Encabezado encontrado en fila:', i);
        break;
      }
    }

    if (headerRowIndex === -1) {
      console.error('❌ No se encontró encabezado');
      throw new Error('No se encontró la fila de encabezado. Verifica que el archivo tenga las columnas: Invoice, Date, Customer, Location, Staff, Type');
    }

    console.log('Encabezado completo:', headerRow);

    // Mapear columnas
    const getColumnIndex = (keywords: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const cell = headerRow[i];
        if (!cell) continue;
        const cellText = String(cell).toLowerCase().trim();
        for (const keyword of keywords) {
          // Buscar si el keyword está en el texto de la celda
          if (cellText.includes(keyword.toLowerCase())) {
            console.log(`✓ Columna "${keywords[0]}" encontrada en índice ${i}: "${cell}"`);
            return i;
          }
        }
      }
      console.warn(`✗ No se encontró columna para: ${keywords.join(', ')}`);
      return -1;
    };

    const colIndexes = {
      invoice: getColumnIndex(['invoice #', 'invoice', 'factura']),
      date: getColumnIndex(['date', 'fecha', 'invoice date']),
      customer: getColumnIndex(['customer', 'cliente', 'client']),
      location: getColumnIndex(['location', 'sucursal', 'ubicacion']),
      staff: getColumnIndex(['staff', 'profesional', 'professional']),
      type: getColumnIndex(['item type', 'type', 'tipo']),
      description: getColumnIndex(['item name', 'description', 'descripcion']),
      unitPrice: getColumnIndex(['unit price', 'precio unitario', 'price']),
      quantity: getColumnIndex(['quantity', 'cantidad', 'qty']),
      amount: getColumnIndex(['amount', 'monto', 'importe']),
    };

    console.log('Mapeo de columnas:', colIndexes);
    
    // Validar columnas críticas
    if (colIndexes.invoice === -1) {
      throw new Error('No se encontró la columna de Invoice/Factura');
    }
    if (colIndexes.customer === -1) {
      throw new Error('No se encontró la columna de Customer/Cliente');
    }
    if (colIndexes.date === -1) {
      throw new Error('No se encontró la columna de Date/Fecha');
    }
    if (colIndexes.location === -1) {
      throw new Error('No se encontró la columna de Location/Sucursal');
    }

    // Parsear fecha
    const parseFecha = (fechaInput: any): string | null => {
      if (!fechaInput) return null;
      
      if (typeof fechaInput === 'number') {
        const excelEpoch = new Date(1900, 0, 1);
        const days = fechaInput - 2;
        const fecha = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000);
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        return `${año}-${mes}-${dia}`;
      }
      
      if (typeof fechaInput === 'string') {
        const fechaStr = String(fechaInput).trim();
        const mesesMap: { [key: string]: string } = {
          'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
          'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
          'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
        };
        
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
        
        if (/^\d{4}-\d{2}-\d{2}$/.test(fechaStr)) {
          return fechaStr;
        }
      }
      return null;
    };

    const parseValor = (valorStr: any): number => {
      if (valorStr === null || valorStr === undefined || valorStr === '') return 0;
      const valorLimpio = String(valorStr).replace(/[$,]/g, '').trim();
      const parsed = parseFloat(valorLimpio);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Procesar datos
    console.log('Procesando filas de datos...');
    const tempRecords: any[] = [];
    let lastSeenCustomer = '';
    let rowsProcessed = 0;
    let rowsSkipped = 0;
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell)) {
        console.log(`Fila ${i + 1}: vacía, saltar`);
        rowsSkipped++;
        continue;
      }
      
      rowsProcessed++;
      
      const invoiceNum = row[colIndexes.invoice];
      if (!invoiceNum) {
        console.log(`Fila ${i + 1}: sin invoice, saltar`);
        rowsSkipped++;
        continue;
      }
      
      // Log de la primera fila para debug
      if (i === headerRowIndex + 1) {
        console.log('=== PRIMERA FILA DE DATOS ===');
        console.log('Fila completa:', row);
        console.log('Invoice:', invoiceNum);
        console.log('Customer:', row[colIndexes.customer]);
        console.log('Date:', row[colIndexes.date]);
        console.log('Location:', row[colIndexes.location]);
      }
      
      let invoiceClean = String(invoiceNum);
      const markdownMatch = invoiceClean.match(/\[(\d+)\]/);
      if (markdownMatch) {
        invoiceClean = markdownMatch[1];
      }
      
      const idFactura = parseInt(invoiceClean.replace(/\D/g, ''));
      if (isNaN(idFactura) || idFactura === 0) {
        console.log(`Fila ${i + 1}: invoice inválido: "${invoiceNum}"`);
        rowsSkipped++;
        continue;
      }
      
      const fecha = parseFecha(row[colIndexes.date]);
      
      let clienteRaw = row[colIndexes.customer] ? String(row[colIndexes.customer]) : '';
      const clienteMarkdown = clienteRaw.match(/\[([^\]]+)\]/);
      let cliente = clienteMarkdown ? clienteMarkdown[1].trim() : clienteRaw.trim();
      
      // Usar último cliente si celda fusionada
      if (!cliente && lastSeenCustomer) {
        cliente = lastSeenCustomer;
        console.log(`Fila ${i + 1}: usando cliente fusionado: ${cliente}`);
      }
      if (cliente) {
        lastSeenCustomer = cliente;
      }
      
      const sucursal = row[colIndexes.location] ? String(row[colIndexes.location]).trim() : '';
      const tipo = row[colIndexes.type] ? String(row[colIndexes.type]).trim() : '';
      
      if (!fecha) {
        console.log(`Fila ${i + 1}: sin fecha, saltar`);
        rowsSkipped++;
        continue;
      }
      if (!cliente) {
        console.log(`Fila ${i + 1}: sin cliente, saltar`);
        rowsSkipped++;
        continue;
      }
      if (!sucursal) {
        console.log(`Fila ${i + 1}: sin sucursal, saltar`);
        rowsSkipped++;
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
        cantidad: parseValor(row[colIndexes.quantity]) || 1,
        monto: parseValor(row[colIndexes.amount]),
      });
    }

    console.log(`Filas procesadas: ${rowsProcessed}, Saltadas: ${rowsSkipped}, Válidas: ${tempRecords.length}`);

    // Calcular totales por factura
    const totalsPorFactura = new Map<number, number>();
    tempRecords.forEach(record => {
      const current = totalsPorFactura.get(record.idFactura) || 0;
      totalsPorFactura.set(record.idFactura, current + record.monto);
    });

    // Crear registros finales
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

    console.log(`Insertando ${records.length} registros...`);

    // Insertar en lotes
    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase
        .from('facturacion_detalle')
        .insert(batch);

      if (error) {
        console.error('Error insertando lote:', error);
        throw error;
      }
      insertedCount += batch.length;
      console.log(`Insertados: ${insertedCount}/${records.length}`);
    }

    console.log(`✓ Importación completa: ${insertedCount} registros`);
    return { success: true, inserted: insertedCount };
    
  } catch (error) {
    console.error('Error en importación:', error);
    throw error;
  }
}
