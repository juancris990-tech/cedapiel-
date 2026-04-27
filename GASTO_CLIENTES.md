# Módulo: Gasto de Clientes por Periodo

## Descripción General

El módulo **Gasto de Clientes por Periodo** te permite visualizar y analizar cuánto gasta cada cliente en un periodo determinado. Puedes importar archivos CSV con datos de facturación y aplicar filtros avanzados para identificar tus mejores clientes, analizar patrones de gasto y tomar decisiones basadas en datos.

## Características Principales

✅ **Importación de CSV**: Carga archivos CSV o Excel con datos de clientes  
✅ **Visualización Detallada**: Tabla completa con toda la información por cliente  
✅ **Filtros Avanzados**: Por rango de gasto, cantidad de citas, presencia de email  
✅ **Ordenamiento**: Por monto total, número de citas o nombre  
✅ **Búsqueda**: Por nombre, email o teléfono  
✅ **Exportación**: Descarga los datos filtrados a Excel  
✅ **Paginación**: Navega fácilmente por grandes volúmenes de datos  
✅ **Estadísticas**: Resumen de total de clientes, monto acumulado y promedio de citas  

---

## Estructura de la Tabla

La tabla `gasto_clientes_periodo` almacena los siguientes campos:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `cliente` | Texto | Nombre del cliente |
| `email` | Texto | Correo electrónico |
| `telefono` | Texto | Número de teléfono |
| `numero_sms` | Texto | Número para SMS |
| `visitas_registradas` | Entero | Total de visitas históricas |
| `cantidad_citas` | Entero | Cantidad de citas totales |
| `valor_citas_mxn` | Decimal | Valor de las citas en MXN |
| `monto_servicios_facturados_mxn` | Decimal | Monto facturado por servicios |
| `monto_productos_facturados_mxn` | Decimal | Monto facturado por productos |
| `monto_descuentos_mxn` | Decimal | Total de descuentos aplicados |
| `monto_facturado_total_mxn` | Decimal | Monto facturado total |
| `cantidad_grupos_citas` | Entero | Cantidad de grupos de citas |
| `cantidad_citas_periodo` | Entero | Citas en el periodo analizado |
| `valor_citas_periodo_mxn` | Decimal | Valor de citas del periodo |
| `monto_servicios_facturados_periodo_mxn` | Decimal | Servicios facturados en el periodo |
| `cargo_adicional_mxn` | Decimal | Cargos adicionales |
| `descuento_periodo_mxn` | Decimal | Descuentos del periodo |
| `monto_facturado_final_mxn` | Decimal | **Monto final facturado** (campo principal) |

---

## Cómo Usar el Módulo

### 1. Acceder al Módulo

Navega a **`/gasto-clientes`** en tu aplicación o usa el menú de navegación para acceder a "Gasto de Clientes".

### 2. Importar Datos desde CSV

1. Haz clic en el botón **"Importar CSV"** en la esquina superior derecha
2. Selecciona tu archivo CSV o Excel (.csv, .xlsx, .xls)
3. El sistema procesará automáticamente el archivo:
   - Convertirá números con formato "1,700.00" a decimales
   - Manejará valores vacíos como NULL
   - Validará que cada registro tenga nombre de cliente
4. Recibirás una notificación con el resultado de la importación

**Formato del CSV esperado:**

El archivo debe tener las siguientes columnas (en inglés):
- CustomerName
- Email
- Telephone
- Textbox27 (número SMS)
- Textbox21 (visitas registradas)
- BookingCount (cantidad de citas)
- BookingValue (valor de citas)
- InvoicedBookingAmount (servicios facturados)
- InvoicedStockAmount1 (productos facturados)
- InvoicedDiscountAmount (descuentos)
- InvoicedAmount (monto total)
- BookingGroupCount (grupos de citas)
- BookingCount1 (citas del periodo)
- BookingValue1 (valor citas periodo)
- InvoicedBookingAmount1 (servicios periodo)
- Textbox13 (cargo adicional)
- Textbox16 (descuento periodo)
- InvoicedAmount1 (monto final)

> **Nota**: El sistema mapea automáticamente estas columnas a los nombres en español de la base de datos.

### 3. Visualizar y Analizar Datos

Una vez importados los datos, verás:

- **Tarjetas de Resumen**: 
  - Total de clientes
  - Monto total acumulado
  - Promedio de citas por cliente

- **Tabla Detallada**: Con las siguientes columnas:
  - Cliente
  - Email
  - Teléfono
  - Citas Periodo
  - Valor Citas
  - Servicios
  - Productos
  - Descuentos
  - **Monto Final** (destacado)

### 4. Filtrar Datos

Usa el panel de filtros para encontrar clientes específicos:

- **Búsqueda**: Escribe nombre, email o teléfono
- **Monto Mínimo/Máximo**: Filtra por rango de gasto
- **Citas Mínimas/Máximas**: Filtra por cantidad de citas
- **Email**: Muestra solo clientes con o sin email registrado
- **Ordenar por**: 
  - Monto Total (predeterminado)
  - Número de Citas
  - Nombre de Cliente
- **Orden**: Ascendente o Descendente

### 5. Exportar Datos

Haz clic en **"Exportar"** para descargar un archivo Excel con los datos actualmente filtrados. El archivo incluirá:
- Todos los campos de la tabla
- Solo los registros que coincidan con tus filtros actuales
- Formato Excel (.xlsx) listo para análisis externo

---

## API REST (para Desarrolladores)

El módulo expone los siguientes endpoints:

### GET `/functions/v1/gasto-clientes`

Obtiene la lista de clientes con filtros y paginación.

**Parámetros de consulta:**
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 50)
- `search`: Término de búsqueda
- `sortBy`: Campo de ordenamiento
- `sortOrder`: `asc` o `desc`
- `montoMin`: Monto mínimo
- `montoMax`: Monto máximo
- `citasMin`: Citas mínimas
- `citasMax`: Citas máximas
- `conEmail`: `true`, `false` o vacío

**Respuesta:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3
  }
}
```

### GET `/functions/v1/gasto-clientes?action=top-gasto`

Obtiene los 10 clientes con mayor gasto.

### GET `/functions/v1/gasto-clientes?action=mas-citas`

Obtiene los 10 clientes con más citas.

### POST `/functions/v1/gasto-clientes-importar`

Importa datos desde CSV.

**Body:**
```json
{
  "csvData": [
    {
      "CustomerName": "Juan Pérez",
      "Email": "juan@example.com",
      ...
    }
  ]
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Importación completada",
  "stats": {
    "totalRecords": 100,
    "validRecords": 98,
    "inserted": 98,
    "errors": null
  }
}
```

---

## Permisos

Para usar este módulo necesitas uno de los siguientes roles:
- **admin**: Acceso completo (importar, ver, exportar, eliminar)
- **gerencia**: Importar, ver y exportar datos
- **direccion**: Importar, ver y exportar datos

Los usuarios con otros roles pueden ver los datos pero no importar o eliminar registros.

---

## Casos de Uso

### 1. Identificar Top Clientes
Ordena por "Monto Total" descendente para ver quiénes son tus clientes más valiosos.

### 2. Reactivar Clientes
Filtra por clientes sin email y con bajo gasto para campañas de reactivación.

### 3. Análisis de Lealtad
Ordena por "Número de Citas" para identificar clientes frecuentes.

### 4. Segmentación por Gasto
Usa filtros de monto mínimo/máximo para crear segmentos (clientes premium, regulares, ocasionales).

### 5. Reportes Ejecutivos
Exporta datos filtrados para presentaciones y análisis externos.

---

## Resolución de Problemas

### La importación falla
- Verifica que el archivo tenga las columnas esperadas
- Asegúrate de que los números usen el formato correcto (e.g., "1,700.00")
- Revisa que cada fila tenga un nombre de cliente

### No se muestran datos
- Confirma que la importación fue exitosa
- Verifica que no tengas filtros muy restrictivos aplicados
- Revisa la consola del navegador para errores

### Datos incorrectos después de importar
- Los números con comas se convierten automáticamente a decimales
- Los campos vacíos se guardan como NULL
- Puedes eliminar los registros incorrectos y reimportar

---

## Próximas Mejoras

Funcionalidades planeadas para futuras versiones:

- [ ] Gráficas visuales de distribución de gasto
- [ ] Comparación entre periodos
- [ ] Exportación de reportes PDF
- [ ] Alertas automáticas para clientes de alto valor
- [ ] Integración con CRM para acciones automáticas

---

## Soporte

Si tienes problemas o sugerencias, contacta al equipo de desarrollo o revisa los logs del sistema en la sección de configuración.
