import express from 'express';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Inisialisasi client Google GenAI SDK (Server-Side)
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const SYSTEM_INSTRUCTION = `
Anda adalah AI Konsultan Spesialis Telemetri Kualitas Air & Kapal USV (Unmanned Surface Vehicle) berbasis ESP32-S3.
Konteks Proyek:
1. Kapal mengumpulkan telemetri perairan waktu nyata:
   - Suhu Air (°C) dari probe digital DS18B20
   - Derajat Keasaman (pH) dari modul analog pH-4502C
   - Padatan Terlarut / TDS (PPM) dari sensor analog Gravity TDS
   - Daya Baterai ESP32-S3 (%)
   - Status sensor: Realtime Aktif vs Terputus/Offline
2. PERINGATAN SISTEM KRUSIAL:
   Modul pompa dosing kapal saat ini SEDANG RUSAK dan DINONAKTIFKAN ("data dosingnya tidak usah soalnya rusak").
   JANGAN PERNAH merekomendasikan menyalakan pompa dosing kapal secara otomatis.
   Sebagai gantinya, berikan alternatif penanganan fisik/manual di lapangan (misalnya: aerasi kincir air untuk melepas gas CO2 terlarut jika asam, pengenceran air segar, sirkulasi perairan alami, pengurangan pakan, peneduh permukaan air, penaburan dolomit manual di tambak).
3. Berikan saran yang solutif, berbasis sains akuatik (SNI mutu air perairan), bahasa Indonesia yang profesional, jelas, dan mudah dipahami oleh operator kapal lapangan.
`;

// Endpoint 1: Diagnosa Telemetri Cepat
app.post('/api/ai/diagnose', async (req, res) => {
  const { telemetry, customNote } = req.body;

  if (!aiClient || !telemetry) {
    return res.status(503).json({ error: 'Gemini API not configured or missing telemetry' });
  }

  try {
    const prompt = `
Evaluasi data telemetri kapal berikut:
- Suhu: ${telemetry.suhu_c}°C
- pH: ${telemetry.ph}
- TDS: ${telemetry.tds_ppm} PPM
- Baterai Kapal: ${telemetry.baterai_persen}%
- Sensor Aktif: ${telemetry.isSensorActive ? 'Ya' : 'Tidak (Mati/Terputus)'}
- Status Pompa Dosing: RUSAK/NONAKTIF
${customNote ? `- Catatan Pengguna: ${customNote}` : ''}

Tolong kembalikan respons HANYA dalam format JSON valid (tanpa markdown backtick luar jika memungkinkan) dengan struktur persis:
{
  "overallRating": "OPTIMAL" | "WASPADA" | "KRITIS" | "SENSOR_OFFLINE",
  "waterCategory": "kategori perairan berdasarkan TDS dan suhu",
  "headline": "judul kesimpulan 1 kalimat menarik",
  "summary": "penjelasan kondisi perairan 2-3 kalimat padat",
  "biotaImpact": "dampak spesifik terhadap ikan/udang/biota air",
  "actionItemsNoDosing": ["langkah 1 tanpa pompa dosing", "langkah 2", "langkah 3"],
  "sensorHardwareNotes": ["catatan kondisi sensor/baterai kapal 1", "catatan 2"]
}
`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '';
    const cleaned = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned);

    return res.json(parsed);
  } catch (err) {
    console.error('Error generating AI diagnosis:', err);
    return res.status(500).json({ error: 'Failed to generate diagnosis via Gemini' });
  }
});

// Endpoint 2: Konsultasi Interaktif / Chat Kontekstual
app.post('/api/ai/chat', async (req, res) => {
  const { message, telemetry, history } = req.body;

  if (!aiClient) {
    return res.status(503).json({ error: 'Gemini API not configured' });
  }

  try {
    const telemetryContext = telemetry
      ? `Data Telemetri Kapal Saat Ini: Suhu ${telemetry.suhu_c}°C, pH ${telemetry.ph}, TDS ${telemetry.tds_ppm} PPM, Baterai ${telemetry.baterai_persen}%, Sensor ${telemetry.isSensorActive ? 'Aktif' : 'Mati'}, Pompa Dosing RUSAK/NONAKTIF.`
      : 'Data telemetri belum terbaca.';

    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Tambahkan riwayat obrolan jika ada
    if (Array.isArray(history)) {
      for (const h of history) {
        contents.push({
          role: h.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: h.content }],
        });
      }
    }

    // Tambahkan prompt terkini dengan konteks sensor
    contents.push({
      role: 'user',
      parts: [
        {
          text: `[KONTEKS REALTIME: ${telemetryContext}]\n\nPertanyaan Operator: ${message}`,
        },
      ],
    });

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
    });

    return res.json({ reply: response.text });
  } catch (err) {
    console.error('Error handling AI chat:', err);
    return res.status(500).json({ error: 'Failed to generate AI response' });
  }
});

// Setup Vite dev middleware or static serving
async function setupServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`> Server Telemetri Kapal & AI Advisor berjalan di http://0.0.0.0:${port}`);
  });
}

setupServer();
