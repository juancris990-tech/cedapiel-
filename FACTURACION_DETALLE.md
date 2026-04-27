# Módulo de Facturación Detallada

## Descripción General

El módulo de Facturación Detallada es un sistema completo para gestionar, importar y analizar los detalles de facturación del negocio. Permite importar archivos Excel con información de facturas y visualizar/filtrar estos datos de manera eficiente.

## Componentes del Módulo

### 1. Base de Datos

**Tabla: `facturacion_detalle`**

Ubicación: Supabase - esquema public

Columnas:
- `id` (BIGSERIAL): ID único autoincremental
- `id_factura` (VARCHAR): ID de la factura
- `fecha` (DATE): Fecha de la factura
- `cliente` (VARCHAR): Nombre del cliente
- `sucursal` (VARCHAR): Nombre de la sucursal
- `profesional` (VARCHAR): Nombre del profesional que atendió
- `tipo` (VARCHAR): Tipo de item (Product, Service, Appointment, Discount, Adjustment)
- `descripcion` (TEXT): Descripción del item
- `precio_unitario_mxn` (NUMERIC): Precio por unidad en MXN
- `cantidad` (NUMERIC): Cantidad de items
- `impuesto_mxn` (NUMERIC): Monto de impuesto
- `responsabilidad_paquete_mxn` (NUMERIC): Responsabilidad de paquete
- `monto_mxn` (NUMERIC): Monto base
- `cantidad_extra` (NUMERIC): Cantidad extra
- `impuesto_extra_mxn` (NUMERIC): Impuesto extra
- `responsabilidad_paquete_total_mxn` (NUMERIC): Responsabilidad total de paquete
- `monto_total_mxn` (NUMERIC): Monto total
- `created_at` (TIMESTAMP): Fecha de creación
- `updated_at` (TIMESTAMP): Fecha de última actualización

**Índices:**
- `idx_facturacion_detalle_id_factura` en `id_factura`
- `idx_facturacion_detalle_fecha` en `fecha`
- `idx_facturacion_detalle_cliente` en `cliente`
- `idx_facturacion_detalle_sucursal` en `sucursal`
- `idx_facturacion_detalle_tipo` en `tipo`

**Seguridad (RLS):**
- ✅ Usuarios autenticados pueden leer todos los registros
- ✅ Admin, Gerencia y Dirección pueden insertar registros
- ✅ Admin, Gerencia y Dirección pueden actualizar registros
- ✅ Solo Admin puede eliminar registros

### 2. Endpoints REST

**Base URL:** `${SUPABASE_URL}/functions/v1/facturacion-detalle`

#### GET /facturacion-detalle
Lista todos los registros con paginación y filtros

**Query Params:**
- `page` (number): Número de página (default: 1)
- `limit` (number): Registros por página (default: 50)
- `id_factura` (string): Filtrar por ID de factura
- `fecha_inicio` (date): Filtrar desde esta fecha
- `fecha_fin` (date): Filtrar hasta esta fecha
- `cliente` (string): Buscar por nombre de cliente (búsqueda parcial)
- `sucursal` (string): Buscar por nombre de sucursal (búsqueda parcial)
- `tipo` (string): Filtrar por tipo de registro

**Response:**
```json
{
  "data": [...],
  "count": 1234,
  "page": 1,
  "limit": 50,
  "total_pages": 25
}
```

#### GET /facturacion-detalle/:id
Obtiene un registro específico por ID

**Response:**
```json
{
  "id": 1,
  "id_factura": "53049",
  "fecha": "2025-11-20",
  "cliente": "Beatriz Quintanilla Duhne",
  ...
}
```

#### POST /facturacion-detalle
Crea un nuevo registro

**Body:**
```json
{
  "id_factura": "12345",
  "fecha": "2025-11-22",
  "cliente": "Juan Pérez",
  "sucursal": "Cedapiel Pueblo Serena",
  "profesional": "Dra María García",
  "tipo": "Service",
  "descripcion": "Consulta general",
  "precio_unitario_mxn": 500,
  "cantidad": 1,
  "monto_mxn": 500,
  "monto_total_mxn": 500
}
```

#### PUT /facturacion-detalle/:id
Actualiza un registro existente

**Body:** Mismos campos que POST

#### DELETE /facturacion-detalle/:id
Elimina un registro (solo admin)

### 3. Endpoint de Importación

**URL:** `${SUPABASE_URL}/functions/v1/facturacion-importar`

**Método:** POST

**Body:** JSON array con los datos parseados del Excel

**Mapeo de Columnas:**
- Excel → Base de Datos
- `InvoiceIdSequential` → `id_factura`
- `InvoiceDate` → `fecha`
- `CustomerName` → `cliente`
- `LocationName` → `sucursal`
- `StaffName` → `profesional`
- `Type` → `tipo`
- `Description` → `descripcion`
- `UnitPrice` → `precio_unitario_mxn`
- `Quantity` → `cantidad`
- `TaxAmount` → `impuesto_mxn`
- `PackageLiabilityAmount` → `responsabilidad_paquete_mxn`
- `Amount` → `monto_mxn`
- `Quantity1` → `cantidad_extra`
- `TaxAmount1` → `impuesto_extra_mxn`
- `PackageLiabilityAmountTotal` → `responsabilidad_paquete_total_mxn`
- `Amount1` → `monto_total_mxn`

**Features:**
- Parseo automático de fechas (formato Excel o string)
- Conversión de números con comas
- Validación de campos requeridos
- Inserción en lotes de 100 registros
- Reporte detallado de éxito/errores

**Response:**
```json
{
  "message": "Importación completada",
  "total_records": 187,
  "inserted": 187,
  "errors": 0
}
```

### 4. Frontend

**Ruta:** `/facturacion-detalle`

**Ubicación:** `src/pages/FacturacionDetalle.tsx`

**Características:**
- ✅ Vista de tabla con todas las columnas relevantes
- ✅ Filtros avanzados (ID factura, rango de fechas, cliente, sucursal, tipo)
- ✅ Paginación (50 registros por página)
- ✅ Importación de archivos Excel (.xlsx, .xls)
- ✅ Exportación a CSV
- ✅ Formato de moneda en MXN
- ✅ Formato de fechas en español
- ✅ Indicadores de estado y tipos
- ✅ Responsive design

**Componentes UI:**
- Botón de importación con selector de archivo
- Botón de exportación a CSV
- Botón de refresh
- Filtros colapsables
- Tabla con scroll horizontal
- Paginación con info de registros

## Integración en el Sistema

### 1. Rutas

Agregado en `src/App.tsx`:
```tsx
import FacturacionDetalle from "./pages/FacturacionDetalle";
...
<Route path="/facturacion-detalle" element={<AppLayout><FacturacionDetalle /></AppLayout>} />
```

### 2. Menú de Navegación

Agregado en `src/components/layout/AppSidebar.tsx`:
```tsx
{
  title: "Facturación Detallada",
  url: "/facturacion-detalle",
  icon: FileText,
}
```

### 3. Dependencias

**NPM Package:**
- `xlsx@latest` - Para parseo de archivos Excel en el cliente

## Uso del Módulo

### Importar Datos

1. Navegar a "Facturación Detallada" en el menú lateral
2. Hacer clic en el botón "Importar Excel"
3. Seleccionar un archivo .xlsx o .xls
4. El sistema automáticamente:
   - Lee el archivo
   - Parsea las columnas
   - Valida los datos
   - Inserta los registros
   - Muestra un mensaje de éxito/error

**Formato esperado del Excel:**
- Primera fila: Encabezados (InvoiceIdSequential, InvoiceDate, CustomerName, etc.)
- Filas siguientes: Datos
- Fechas pueden estar en formato numérico Excel o string
- Números pueden tener comas como separadores

### Filtrar Datos

**Filtros disponibles:**
1. **ID Factura**: Búsqueda exacta
2. **Fecha Inicio/Fin**: Rango de fechas
3. **Cliente**: Búsqueda parcial (case insensitive)
4. **Sucursal**: Búsqueda parcial (case insensitive)
5. **Tipo**: Selección de tipo específico

### Exportar Datos

1. Aplicar los filtros deseados
2. Hacer clic en "Exportar CSV"
3. Se descargará un archivo CSV con los datos filtrados
4. Nombre del archivo: `facturacion_detalle_YYYYMMDD.csv`

## Permisos y Seguridad

### Roles con Acceso

**Lectura (SELECT):**
- Todos los usuarios autenticados

**Creación (INSERT):**
- Admin
- Gerencia
- Dirección

**Actualización (UPDATE):**
- Admin
- Gerencia
- Dirección

**Eliminación (DELETE):**
- Solo Admin

**Importación:**
- Admin
- Gerencia
- Dirección

### Validaciones

1. Autenticación requerida para todas las operaciones
2. Validación de rol para operaciones de escritura
3. Validación de campos requeridos:
   - id_factura
   - fecha
   - cliente
   - sucursal
   - tipo
4. Validación de tipos de datos
5. Conversión automática de formatos

## Mantenimiento

### Limpieza de Datos

Para eliminar registros antiguos o duplicados, usar el endpoint DELETE:
```typescript
await fetch(`${SUPABASE_URL}/functions/v1/facturacion-detalle/${id}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Monitoreo

Verificar la tabla regularmente:
```sql
-- Contar registros por sucursal
SELECT sucursal, COUNT(*) as total
FROM facturacion_detalle
GROUP BY sucursal;

-- Registros recientes
SELECT *
FROM facturacion_detalle
ORDER BY created_at DESC
LIMIT 10;

-- Suma de montos por tipo
SELECT tipo, SUM(monto_total_mxn) as total
FROM facturacion_detalle
GROUP BY tipo;
```

### Respaldos

Los datos están respaldados automáticamente por Supabase. Para exportar manualmente:
1. Usar la función de exportación CSV en la interfaz
2. O ejecutar query SQL directa desde el backend

## Mejoras Futuras

Posibles mejoras a considerar:

1. **Análisis Avanzado:**
   - Gráficas de tendencias
   - Comparación entre sucursales
   - Top clientes/servicios

2. **Procesamiento:**
   - Detección automática de duplicados
   - Conciliación con ventas
   - Alertas de inconsistencias

3. **Exportación:**
   - Múltiples formatos (PDF, Excel)
   - Plantillas personalizadas
   - Programación de reportes

4. **Integración:**
   - Sincronización automática con sistema de facturación externo
   - Webhooks para actualizaciones en tiempo real
   - API pública para integraciones

## Soporte

Para problemas o dudas:
1. Revisar logs del edge function: `facturacion-detalle` y `facturacion-importar`
2. Verificar permisos RLS en Supabase
3. Validar formato del archivo Excel
4. Revisar errores en la consola del navegador
