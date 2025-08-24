# 🔧 Configuración de Variables de Entorno para Búsqueda Semántica

## Archivo .env Completo

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```bash
# Database (Requerida)
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# Pinecone - Base de datos vectorial (Requerida para búsqueda semántica)
PINECONE_API_KEY=your_pinecone_api_key_here

# Replicate - Generación de embeddings (Requerida para búsqueda semántica)
REPLICATE_API_TOKEN=your_replicate_token_here

# Puerto del servidor (Opcional, default: 3000)
PORT=3000
```

## 📡 Obtener API Key de Pinecone

1. Ve a [Pinecone.io](https://www.pinecone.io/)
2. Crea una cuenta (plan Starter gratuito disponible)
3. En el dashboard, ve a "API Keys"
4. Crea una nueva API key
5. Copia la key y pégala en tu `.env`

### Configuración del Índice
- **Nombre:** `addresses-semantic-search` (se crea automáticamente)
- **Dimensiones:** 768 (modelo GTE-base)
- **Métrica:** Cosine similarity
- **Tipo:** Serverless (región: us-east-1)

## 🔧 Obtener Token de Replicate

1. Ve a [Replicate.com](https://replicate.com/)
2. Crea una cuenta
3. Ve a "Settings" > "API tokens"
4. Genera un nuevo token
5. Copia el token y pégalo en tu `.env`

### Modelo Utilizado
- **Modelo:** `mark3labs/embeddings-gte-base`
- **ID:** `d619cff29338b9a37c3d06605042e1ff0594a8c3eff0175fd6967f5643fc4d47`
- **Dimensiones:** 768
- **Contexto:** Optimizado para español e inglés

## ✅ Verificar Configuración

### 1. Compilar proyecto
```bash
npm run build
```

### 2. Iniciar servidor
```bash
npm run dev
```

### 3. Probar configuración
```bash
# Verificar estado de servicios
curl "http://localhost:3000/addresses/admin/vector-stats"

# Si devuelve error, las APIs no están configuradas
# Si devuelve estadísticas, todo está bien
```

## 🔄 Flujo de Configuración Inicial

### 1. Configurar Variables
```bash
echo "PINECONE_API_KEY=tu_pinecone_key" >> .env
echo "REPLICATE_API_TOKEN=tu_replicate_token" >> .env
```

### 2. Inicializar Sistema
```bash
npm run dev
```

### 3. Migración Test
```bash
curl -X POST "http://localhost:3000/addresses/admin/migrate-vectors" \
  -H "Content-Type: application/json" \
  -d '{"testMode": true, "batchSize": 10}'
```

### 4. Verificar Resultados
```bash
curl "http://localhost:3000/addresses/admin/vector-stats"
```

### 5. Migración Completa (Opcional)
```bash
curl -X POST "http://localhost:3000/addresses/admin/migrate-vectors" \
  -H "Content-Type: application/json" \
  -d '{"testMode": false, "batchSize": 50}'
```

## 🚨 Resolución de Problemas

### Error: "PINECONE_API_KEY no configurada"
```bash
# Verificar variable
echo $PINECONE_API_KEY

# Si está vacía, agregarla
export PINECONE_API_KEY="tu_key_aqui"

# Reiniciar servidor
npm run dev
```

### Error: "REPLICATE_API_TOKEN no configurada"
```bash
# Verificar variable
echo $REPLICATE_API_TOKEN

# Si está vacía, agregarla
export REPLICATE_API_TOKEN="tu_token_aqui"

# Reiniciar servidor
npm run dev
```

### Error: "Error de conexión con Pinecone"
- Verifica que la API key sea correcta
- Comprueba conectividad a internet
- Revisa que el plan de Pinecone esté activo

### Error: "No se pudo generar embedding"
- Verifica token de Replicate
- Comprueba límites de rate en Replicate
- Revisa conectividad a internet

## 💰 Costos Estimados

### Pinecone (Plan Starter)
- **Gratis:** 1 índice, 100K vectores, 100K consultas/mes
- **Suficiente para:** ~50,000-100,000 direcciones

### Replicate
- **Modelo GTE-base:** ~$0.0005 por 1000 predicciones
- **Migración 50K direcciones:** ~$25 USD
- **Búsquedas:** Casi gratis (solo consultas nuevas)

## 📊 Estructura de Archivos

```
ctls/
├── .env                           # Variables de entorno (crear este archivo)
├── src/
│   └── addresses/
│       └── services/
│           ├── embedding.service.ts        # Replicate integration
│           ├── pinecone.service.ts         # Pinecone integration  
│           ├── semantic-search.service.ts  # Búsqueda principal
│           └── vector-migration.service.ts # Migración
├── docs/
│   ├── SEMANTIC_SEARCH.md         # Documentación principal
│   └── ENVIRONMENT_SETUP_SEMANTIC.md # Este archivo
└── requests/
    └── semantic-search-requests.http # Pruebas
```

## 🎯 Siguientes Pasos

1. ✅ Configurar variables de entorno
2. ✅ Iniciar servidor y verificar
3. ✅ Ejecutar migración test
4. ✅ Probar búsquedas semánticas
5. ⭐ Migración completa (cuando estés listo)

¿Todo configurado? ¡Prueba tu primera búsqueda semántica! 🚀
