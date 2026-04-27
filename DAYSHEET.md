# Módulo DaySheet - Reporte de Citas Diarias

## Descripción
Módulo completo para gestionar y visualizar reportes DaySheet, que contienen información detallada de todas las citas programadas y completadas durante un día específico.

## Características

### 1. Tabla de Base de Datos
- **Tabla**: `daysheet_citas`
- **Campos**:
  - `id`: ID único autoincremental
  - `fecha`: Fecha de la cita (texto)
  - `cliente`: Nombre completo del cliente
  - `telefono`: Teléfono de contacto
  - `recurso`: Tipo de recurso
  - `simbolo`: Símbolo de moneda
  - `horario`: Rango de tiempo (ej: "9:00 am - 10:00 am")
  - `estado`: Estado de la cita (Completed, Cancelled, etc.)
  - `profesional`: Nombre del profesional asignado
  - `servicio`: Nombre del servicio realizado
  - `equipo`: Equipo utilizado
  - `sucursal`: Nombre de la sucursal
  - `precio_mxn`: Precio del servicio en MXN
  - `notas_alertas`: Notas y alertas del paciente
  - `created_at`, `updated_at`: Timestamps

### 2. API REST (Edge Functions)

#### Importar DaySheet
```typescript
POST /daysheet-importar
Content-Type: multipart/form-data
Authorization: Bearer {token}

// FormData con:
// - file: archivo CSV/Excel del DaySheet

Response:
{
  "success": true,
  "message": "Se importaron 50 citas correctamente",
  "count": 50
}
```

#### Consultar Citas
```typescript
GET /daysheet?search=maria&sucursal=Cedapiel&estado=Completed
Authorization: Bearer {token}

Response:
{
  "data": [...],
  "count": 50,
  "page": 1,
  "limit": 100,
  "totalPages": 1,
  "stats": {
    "totalCitas": 50,
    "citasCompletadas": 45,
    "citasCanceladas": 5,
    "totalFacturado": "85000.00"
  }
}
```

**Parámetros de consulta**:
- `search`: Búsqueda en cliente, teléfono, servicio, profesional
- `sucursal`: Filtrar por sucursal
- `profesional`: Filtrar por profesional
- `servicio`: Filtrar por servicio
- `estado`: Filtrar por estado
- `fecha`: Filtrar por fecha específica
- `orderBy`: Campo para ordenar (default: 'id')
- `orderDir`: Dirección (asc/desc, default: 'desc')
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 50)

### 3. Interfaz de Usuario

#### Características principales:
- **Importación de archivos**: Sube CSV o Excel con formato DaySheet
- **Estadísticas en tiempo real**:
  - Total de citas
  - Citas completadas
  - Citas canceladas
  - Total facturado del día
- **Filtros avanzados**:
  - Por sucursal
  - Por profesional
  - Por estado
  - Búsqueda general
- **Tabla detallada** con toda la información
- **Exportar a Excel**: Descarga los datos filtrados

## Uso del Módulo

### 1. Acceso
Navega a `/daysheet` en la aplicación o usa el menú lateral "DaySheet".

### 2. Importar un archivo
1. Haz clic en "Seleccionar archivo"
2. Elige tu archivo CSV o Excel del DaySheet
3. Haz clic en "Importar"
4. Espera la confirmación

### 3. Formato del archivo CSV
El archivo debe tener estas columnas en orden:
```
Fecha, Cliente, (vacío), Teléfono, Recurso, Símbolo, Horario, Estado, 
Profesional, Servicio, Equipo, Sucursal, Precio, Notas/Alertas
```

Ejemplo:
```csv
"Thursday, November 20, 2025",Maria Eugenia Luna Herrera,,Tel: +528110444860,Resources,$,9:00 am - 10:00 am,Completed,Anna Davila,Pierna completa,Venus Velocity 1,Cedapiel Humberto Lobo,1700.00,"Alerts: H13720"
```

### 4. Filtrar datos
- Usa los selectores para filtrar por sucursal, profesional o estado
- Usa la barra de búsqueda para buscar por nombre, teléfono, servicio, etc.
- Los resultados se actualizan automáticamente

### 5. Exportar
Haz clic en "Exportar a Excel" para descargar los datos actuales (con filtros aplicados).

## Permisos

### Importación
Solo usuarios con roles:
- `admin`
- `gerencia`
- `direccion`

### Consulta
Todos los usuarios autenticados pueden ver los datos.

### Eliminación
Solo usuarios con rol `admin`.

## Casos de Uso

1. **Análisis diario**: Visualiza todas las citas del día y su estado
2. **Control de facturación**: Suma total de ingresos del día
3. **Seguimiento de profesionales**: Cuántas citas completó cada profesional
4. **Análisis por sucursal**: Rendimiento de cada sucursal
5. **Identificar cancelaciones**: Detecta patrones de cancelación
6. **Notas de clientes**: Acceso rápido a alertas y observaciones

## Integración

El módulo está integrado en:
- **Ruta**: `/daysheet` en `src/App.tsx`
- **Navegación**: Sidebar con ícono Calendar
- **Edge Functions**: 
  - `daysheet-importar`
  - `daysheet`
- **Base de datos**: Tabla `daysheet_citas` con RLS habilitado

## Soporte para futuros archivos

El módulo está diseñado para manejar:
- CSV estándar con las columnas mencionadas
- Archivos Excel (.xlsx, .xls)
- Precios con formato de comas
- Campos vacíos o NULL
- Notas multilínea

## Notas técnicas

- **Formato de números**: Convierte automáticamente "1,700.00" a 1700.00
- **Validación**: Requiere fecha, cliente, horario, estado y sucursal
- **Lotes**: Importa en lotes de 100 registros para optimizar
- **Índices**: Optimizado para búsquedas rápidas por fecha, cliente, profesional, sucursal, estado
