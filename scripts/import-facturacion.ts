import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import * as fs from 'fs';

async function importData() {
  try {
    // Leer el archivo
    const buffer = fs.readFileSync('public/temp-import.xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    const sheetName = workbook.SheetNames.find(name => 
      name.toLowerCase().includes('invoicedetail')
    ) || workbook.SheetNames[0];
    
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];

    // Buscar encabezado
    const isHeaderRow = (row: any[]): boolean => {
      const headerKeywords = ['invoice', 'date', 'customer', 'location', 'staff', 'type'];
      const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
      return headerKeywords.filter(keyword => rowText.includes(keyword)).length >= 4;
    };

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
      throw new Error('No se encontró encabezado');
    }

    console.log('Encabezado en fila:', headerRowIndex);

    // Mapear columnas
    const getColumnIndex = (keywords: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const cell = headerRow[i];
        if (!cell) continue;
        const cellText = String(cell).toLowerCase().trim();
        for (const keyword of keywords) {
          if (cellText === keyword.toLowerCase() || cellText.includes(keyword.toLowerCase())) {
            return i;
          }
        }
      }
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

    console.log('Índices:', colIndexes);

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
    const tempRecords: any[] = [];
    let lastSeenCustomer = '';
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => !cell)) continue;
      
      const invoiceNum = row[colIndexes.invoice];
      if (!invoiceNum) continue;
      
      let invoiceClean = String(invoiceNum);
      const markdownMatch = invoiceClean.match(/\[(\d+)\]/);
      if (markdownMatch) {
        invoiceClean = markdownMatch[1];
      }
      
      const idFactura = parseInt(invoiceClean.replace(/\D/g, ''));
      if (isNaN(idFactura) || idFactura === 0) continue;
      
      const fecha = parseFecha(row[colIndexes.date]);
      
      let clienteRaw = row[colIndexes.customer] ? String(row[colIndexes.customer]) : '';
      const clienteMarkdown = clienteRaw.match(/\[([^\]]+)\]/);
      let cliente = clienteMarkdown ? clienteMarkdown[1].trim() : clienteRaw.trim();
      
      // Usar último cliente si celda fusionada
      if (!cliente && lastSeenCustomer) {
        cliente = lastSeenCustomer;
      }
      if (cliente) {
        lastSeenCustomer = cliente;
      }
      
      const sucursal = row[colIndexes.location] ? String(row[colIndexes.location]).trim() : '';
      const tipo = row[colIndexes.type] ? String(row[colIndexes.type]).trim() : '';
      
      if (!fecha || !cliente || !sucursal) continue;
      
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

    console.log(`Registros procesados: ${tempRecords.length}`);

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
    
  } catch (error) {
    console.error('Error en importación:', error);
    throw error;
  }
}

importData();
