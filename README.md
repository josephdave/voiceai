# Voice AI System

Sistema web de conversión de texto a voz utilizando la API de ElevenLabs con visualización de waveform en tiempo real.

## Características

- 🎵 Conversión de texto a voz usando ElevenLabs API
- 🌊 Visualización de waveform animado en tiempo real
- 🔌 Conexión WebSocket para streaming de audio
- 🖥️ Interfaz completamente negra con efectos visuales
- 📡 API REST para envío de texto

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar el servidor:
```bash
npm start
```

3. Abrir el navegador en `http://localhost:3000`

## Uso

### Frontend
- Abra `http://localhost:3000` en su navegador
- La pantalla permanecerá negra esperando audio
- Cuando llegue audio, se reproducirá automáticamente con waveform animado

### API Endpoint
Envíe texto para convertir a voz:

```bash
curl -X POST http://localhost:3000/api/speak \
  -H "Content-Type: application/json" \
  -d '{"text": "Hola, este es un mensaje de prueba"}'
```

## Configuración

- **API Key**: Configurada en `server.js`
- **Voice ID**: YExhVa4bZONzeingloMX (voz preconfigurada)
- **Puerto**: 3000 (configurable con variable de entorno PORT)

## Archivos principales

- `server.js`: Servidor Node.js con API y WebSocket
- `public/index.html`: Frontend con waveform visualizer
- `package.json`: Configuración del proyecto