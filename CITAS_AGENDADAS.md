# Módulo de Citas Agendadas

## Descripción General

El módulo de **Citas Agendadas** es un sistema completo para gestionar y visualizar todas las citas programadas en la clínica. Permite importar datos desde archivos CSV/Excel, filtrar, buscar y analizar información detallada de cada cita.

## Estructura de la Base de Datos

### Tabla: `citas_agendadas`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | BIGSERIAL | Identificador único (auto-generado) |
| `recurso` | TEXT | Recurso asignado |
| `fecha` | DATE | Fecha de la cita (formato: YYYY-MM-DD) |
| `cliente` | TEXT | Nombre completo del cliente |
| `email` | TEXT | Correo electrónico del cliente |
| `telefono` | TEXT | Teléfono del cliente |
| `numero_sms` | TEXT | Número para SMS |
| `sucursal` | TEXT | Nombre de la sucursal |
| `estado` | TEXT | Estado de la cita (Completed, Booked, etc.) |
| `fecha_creacion` | DATE | Fecha en que se creó la cita |
| `creado_por` | TEXT | Usuario que creó la cita |
| `hora_inicio` | TEXT | Hora de inicio (formato: 9:00 AM) |
| `hora_fin` | TEXT | Hora de fin (formato: 10:00 AM) |
| `profesional` | TEXT | Nombre del profesional asignado |
| `servicio` | TEXT | Nombre del servicio |
| `equipo` | TEXT | Equipo utilizado |
| `retencion` | TEXT | Indicador de retención (Y/N) |
| `reagendado` | TEXT | Indicador de reagendado (Y/N) |
| `facturado` | TEXT | Indicador de facturación (Y/N) |
| `valor_mxn` | NUMERIC(10,2) | Valor de la cita en pesos mexicanos |
| `created_at` | TIMESTAMPTZ | Fecha de creación del registro |
| `updated_at` | TIMESTAMPTZ | Fecha de última actualización |

### Políticas de Seguridad (RLS)

- **Lectura**: Todos los usuarios autenticados pueden leer citas agendadas
- **Creación**: Solo admin, gerencia y dirección pueden crear citas
- **Actualización**: Solo admin, gerencia y dirección pueden actualizar citas
- **Eliminación**: Solo admin puede eliminar citas

## Endpoints API

### 1. Listar Citas Agendadas

**Endpoint**: `GET /citas-agendadas`

**Parámetros de consulta**:
- `search`: Búsqueda general (cliente, profesional, servicio, teléfono, email)
- `sucursal`: Filtrar por sucursal
- `profesional`: Filtrar por profesional
- `servicio`: Filtrar por servicio
- `estado`: Filtrar por estado
- `fechaInicio`: Filtrar desde esta fecha (YYYY-MM-DD)
- `fechaFin`: Filtrar hasta esta fecha (YYYY-MM-DD)
- `retencion`: Filtrar por retención (Y/N)
- `reagendado`: Filtrar por reagendado (Y/N)
- `facturado`: Filtrar por facturado (Y/N)
- `orderBy`: Campo para ordenar (default: fecha)
- `orderDir`: Dirección de orden (asc/desc, default: desc)
- `page`: Número de página (default: 1)
- `limit`: Registros por página (default: 50)

**Respuesta**:
```json
{
  "data": [
    {
      "id": 1,
      "recurso": "Resource",
      "fecha": "2025-11-20",
      "cliente": "Maria Eugenia Luna Herrera",
      "email": "melh1@outlook.com",
      "telefono": null,
      "numero_sms": "+528110444860",
      "sucursal": "Cedapiel Humberto Lobo",
      "estado": "Completed",
      "fecha_creacion": "2025-11-14",
      "creado_por": "Laura Angelica Doria Lopez",
      "hora_inicio": "9:00 AM",
      "hora_fin": "10:00 AM",
      "profesional": "Anna Davila",
      "servicio": "Pierna completa",
      "equipo": "Venus Velocity 1",
      "retencion": "Y",
      "reagendado": "Y",
      "facturado": "Y",
      "valor_mxn": 1700.00
    }
  ],
  "count": 88,
  "page": 1,
  "limit": 50,
  "totalPages": 2,
  "stats": {
    "totalCitas": 88,
    "citasCompletadas": 85,
    "valorTotal": "149650.00",
    "valorPromedio": "1700.57",
    "porcentajeRetencion": "75.00",
    "porcentajeReagendados": "45.45",
    "porSucursal": {
      "Cedapiel Humberto Lobo": 35,
      "Cedapiel Pueblo Serena": 30,
      "Cedapiel San Agustin": 23
    },
    "porProfesional": {
      "Anna Davila": 15,
      "Lupita Pineda": 12,
      "Lucy Rdz": 10
    }
  }
}
```

### 2. Importar Citas Agendadas

**Endpoint**: `POST /citas-agendadas-importar`

**Tipo de contenido**: `multipart/form-data`

**Parámetros**:
- `file`: Archivo CSV o Excel (.csv, .xlsx, .xls)

**Formato del CSV esperado**:

El CSV debe contener las siguientes columnas (en este orden):
1. Textbox6 (Resource)
2. Date (fecha en formato "20 Nov 2025")
3. Customer (nombre del cliente)
4. Email
5. Telephone
6. SmsNumber
7. Location (sucursal)
8. Status (estado)
9. DateCreated (fecha de creación)
10. StaffAdded (quien creó)
11. StartDate (hora inicio)
12. EndDate (hora fin)
13. StaffName (profesional)
14. ServiceName (servicio)
15. Textbox8 (equipo)
16. Retained (Y/N)
17. Rebooked (Y/N)
18. Invoiced (Y/N)
19. Value (valor con formato "1,700.00")

**Ejemplo de CSV**:
```csv
Textbox6,Date,Customer,Email,Telephone,SmsNumber,Location,Status,DateCreated,StaffAdded,StartDate,EndDate,StaffName,ServiceName,Textbox8,Retained,Rebooked,Invoiced,Value
Resource,20 Nov 2025,Maria Luna,maria@email.com,,+5281234567,Cedapiel Lobo,Completed,14 Nov 2025,Laura Lopez,9:00 AM,10:00 AM,Anna Davila,Pierna completa,Venus 1,Y,Y,Y,"1,700.00"
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Se importaron 88 citas agendadas correctamente",
  "count": 88
}
```

**Respuesta con error**:
```json
{
  "error": "No se encontraron registros válidos para importar"
}
```

## Interfaz de Usuario

### Acceso

Navega a: **Sidebar → Citas Agendadas** o directamente a `/citas-agendadas`

### Secciones Principales

#### 1. Estadísticas (Cards superiores)

Muestra métricas clave:
- **Total Citas**: Número total de citas agendadas
- **Completadas**: Número de citas con estado "Completed"
- **Valor Total**: Suma total de todos los valores de citas
  - Incluye promedio por cita
- **Retención**: Porcentaje de clientes retenidos (retencion = Y)
  - Incluye porcentaje de reagendados

#### 2. Importar Citas

- Selecciona un archivo CSV o Excel
- Haz clic en "Importar"
- El sistema procesará el archivo y mostrará un mensaje de éxito o error
- Los datos se insertarán automáticamente en la base de datos

#### 3. Filtros y Búsqueda

**Filtros disponibles**:
- **Búsqueda global**: Busca en cliente, profesional, servicio, teléfono o email
- **Sucursal**: Filtra por sucursal específica
- **Profesional**: Filtra por profesional específico
- **Estado**: Filtra por estado de la cita (Completed, Booked, etc.)
- **Retención**: Filtra por clientes retenidos (Y) o no retenidos (N)
- **Reagendado**: Filtra por citas reagendadas (Y) o no (N)

**Botón de Exportar**:
- Exporta los datos filtrados a Excel
- El archivo incluye todas las columnas visibles

#### 4. Tabla de Datos

Muestra todas las citas con las siguientes columnas:
- Fecha
- Hora (inicio - fin)
- Cliente
- Profesional
- Servicio
- Sucursal
- Estado (con badge de color)
- Equipo
- Retención (badge verde para Y, outline para N)
- Reagendado (badge azul para Y, outline para N)
- Facturado (badge por defecto para Y, outline para N)
- Valor (en formato monetario)
- Contacto (teléfono y email si están disponibles)

## Cómo Usar el Módulo

### 1. Importar datos por primera vez

1. Prepara tu archivo CSV con el formato especificado arriba
2. Ve a la sección "Importar Citas Agendadas"
3. Selecciona tu archivo
4. Haz clic en "Importar"
5. Espera el mensaje de confirmación
6. Los datos aparecerán automáticamente en la tabla

### 2. Buscar citas específicas

**Búsqueda rápida**:
- Escribe en el campo de búsqueda general
- El sistema buscará en cliente, profesional, servicio, teléfono y email

**Filtrado avanzado**:
- Usa los selectores para filtrar por sucursal, profesional, estado, etc.
- Combina múltiples filtros para búsquedas más específicas

### 3. Analizar datos

**Ver estadísticas generales**:
- Observa las 4 tarjetas superiores con métricas clave
- Identifica tendencias de retención y reagendamiento

**Exportar para análisis externo**:
- Aplica los filtros deseados
- Haz clic en "Exportar"
- Abre el archivo Excel generado para análisis adicional

### 4. Importar nuevos reportes

Para actualizar con nuevos datos:
1. Obtén el reporte actualizado de tu sistema de citas
2. Asegúrate de que tenga el mismo formato
3. Importa el nuevo archivo
4. Los nuevos registros se agregarán a la base de datos

**Nota**: El sistema NO elimina registros anteriores. Cada importación agrega nuevos datos.

## Consideraciones Importantes

### Formato de Fechas

- **Fecha de entrada (CSV)**: "20 Nov 2025"
- **Fecha almacenada (BD)**: "2025-11-20"
- **Formato soportado**: Solo inglés (Jan, Feb, Mar, etc.)

### Valores Monetarios

- **Entrada**: "1,700.00" o "1700.00"
- **Almacenado**: 1700.00 (decimal)
- Se eliminan automáticamente las comas

### Campos Requeridos

Para que una fila sea importada correctamente, debe tener:
- Fecha válida
- Nombre del cliente
- Sucursal
- Estado
- Hora inicio
- Hora fin

Si falta alguno de estos campos, la fila será omitida con un warning en los logs.

### Permisos

**Para importar archivos**:
- Debes tener rol de admin, gerencia o dirección

**Para ver datos**:
- Cualquier usuario autenticado puede ver las citas

## Troubleshooting

### El archivo no se importa

**Problema**: "No se encontraron registros válidos para importar"

**Soluciones**:
1. Verifica que el CSV tenga al menos 2 filas (encabezado + datos)
2. Asegúrate de que las fechas estén en el formato correcto
3. Revisa que los campos requeridos no estén vacíos
4. Verifica que el archivo sea .csv, .xlsx o .xls

### No veo los datos después de importar

**Problema**: La importación fue exitosa pero no veo los datos

**Soluciones**:
1. Refresca la página (F5)
2. Verifica que no tengas filtros activos que oculten los datos
3. Revisa los logs de la función edge para ver si hubo errores

### Error de autenticación

**Problema**: "Token inválido o sesión expirada"

**Soluciones**:
1. Recarga la página completamente
2. Cierra sesión y vuelve a iniciar
3. Verifica que tu sesión no haya expirado

### Valores monetarios incorrectos

**Problema**: Los valores no se muestran correctamente

**Solución**: Asegúrate de que en el CSV los valores estén en formato:
- "1,700.00" (con comas y punto decimal)
- "1700.00" (sin comas)
- "1700" (sin decimales, se añadirán .00)

## Integración con el Sistema

### Archivos Modificados/Creados

1. **Base de datos**:
   - Tabla: `citas_agendadas`
   - Políticas RLS configuradas

2. **Edge Functions**:
   - `supabase/functions/citas-agendadas/index.ts` (consulta)
   - `supabase/functions/citas-agendadas-importar/index.ts` (importación)

3. **Frontend**:
   - `src/pages/CitasAgendadas.tsx` (página principal)
   - `src/App.tsx` (ruta agregada)
   - `src/components/layout/AppSidebar.tsx` (menú actualizado)

### Mantenimiento Futuro

Para agregar nuevos campos al CSV:
1. Actualiza la tabla en la migración
2. Modifica el mapeo en `citas-agendadas-importar/index.ts`
3. Agrega las columnas en la tabla del frontend

## Soporte

Si tienes problemas o preguntas:
1. Revisa los logs de las edge functions en el dashboard de Supabase
2. Verifica la consola del navegador para errores de frontend
3. Consulta este documento para casos comunes