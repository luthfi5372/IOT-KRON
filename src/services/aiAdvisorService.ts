// Layanan AI Konsultan Telemetri Kualitas Air & Kapal USV ESP32
// Mengintegrasikan Gemini 3.8 Flash (Server-Side) dan Engine Heuristik Lapangan Maritim
// Dirancang spesifik untuk proyek kapal pemantau kualitas air dengan pompa dosing yang sedang rusak.

export interface TelemetrySnapshot {
  suhu_c: number;
  ph: number;
  tds_ppm: number;
  baterai_persen: number;
  isSensorActive: boolean;
  isDosingBroken?: boolean;
}

export interface AiDiagnosticResult {
  overallRating: 'OPTIMAL' | 'WASPADA' | 'KRITIS' | 'SENSOR_OFFLINE';
  waterCategory: string;
  headline: string;
  summary: string;
  biotaImpact: string;
  actionItemsNoDosing: string[];
  sensorHardwareNotes: string[];
  timestamp: string;
  source: 'GEMINI_LIVE' | 'LOCAL_EXPERT_ENGINE';
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  quickPrompts?: string[];
}

/**
 * Heuristik lokal cerdas yang menghasilkan diagnosa mendalam berbasis sains kualitas air
 * jika server offline atau API key Gemini belum diisi.
 */
export function generateLocalAiDiagnosis(telemetry: TelemetrySnapshot): AiDiagnosticResult {
  const { suhu_c, ph, tds_ppm, baterai_persen, isSensorActive } = telemetry;
  const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (!isSensorActive) {
    return {
      overallRating: 'SENSOR_OFFLINE',
      waterCategory: 'Sinyal Sensor Tidak Terdeteksi',
      headline: 'Sensor Telemetri Tidak Mengirim Data Real-Time',
      summary: 'Tidak ada aliran data telemetri baru dari modul ESP32-S3 kapal. Data terakhir menunjukkan kapal sedang tidak memperbarui parameter.',
      biotaImpact: 'Status perairan tidak dapat dipantau secara real-time. Waspadai perubahan mendadak tanpa deteksi dini.',
      actionItemsNoDosing: [
        'Lakukan pengecekan fisik koneksi modul ESP32-S3 dan catu daya baterai kapal.',
        'Pastikan broker MQTT aktif dan kapal berada dalam jangkauan sinyal WiFi/telemetri.',
        'Lakukan inspeksi visual perairan dan gunakan alat ukur manual sementara jika diperlukan.',
      ],
      sensorHardwareNotes: [
        'Periksa sambungan kabel probe DS18B20 dan modul analog pH-4502C.',
        'Pastikan konektor BNC elektroda pH tidak basah atau korosi terkena percikan air.',
      ],
      timestamp: now,
      source: 'LOCAL_EXPERT_ENGINE',
    };
  }

  // Evaluasi parameter
  const isPhAcid = ph < 6.5;
  const isPhAlkaline = ph > 8.5;
  const isPhCritical = ph < 6.0 || ph > 9.0;
  const isTdsHigh = tds_ppm > 800;
  const isTdsCritical = tds_ppm > 1200;
  const isTempHigh = suhu_c > 32.5;
  const isTempLow = suhu_c < 24.0;
  const isBatteryLow = baterai_persen < 25;

  let overallRating: 'OPTIMAL' | 'WASPADA' | 'KRITIS' = 'OPTIMAL';
  if (isPhCritical || isTdsCritical || (isTempHigh && isPhAcid)) {
    overallRating = 'KRITIS';
  } else if (isPhAcid || isPhAlkaline || isTdsHigh || isTempHigh || isTempLow || isBatteryLow) {
    overallRating = 'WASPADA';
  }

  // Tipe perairan berdasarkan TDS
  let waterCategory = 'Perairan Tawar Segar (Danau/Sungai)';
  if (tds_ppm > 1000) {
    waterCategory = 'Perairan Payau / Estuari Salinitas Tinggi';
  } else if (tds_ppm > 500) {
    waterCategory = 'Perairan Tambak Budidaya Semi-Intensif';
  }

  // Headline & Ringkasan
  let headline = 'Parameter Kualitas Perairan Dalam Ambang Batas Stabil';
  let summary = `Perairan berada pada kondisi stabil (pH ${ph.toFixed(2)}, Suhu ${suhu_c.toFixed(1)}°C, TDS ${Math.round(tds_ppm)} PPM). Lingkungan mendukung kelangsungan hidup organisme perairan.`;
  let biotaImpact = 'Biota akuatik (ikan & udang) berada dalam zona nyaman metabolisme, laju pernapasan dan osmoregulasi bekerja optimal.';

  if (isPhCritical) {
    headline = isPhAcid
      ? 'Bahaya Asidifikasi Kritis: Derajat Keasaman Menukik Tajam!'
      : 'Bahaya Alkalinisasi Kritis: Derajat Kebasaan Terlalu Tinggi!';
    summary = `pH terdeteksi ${ph.toFixed(2)}, melampaui batas toleransi normal (6.50 - 8.50). Modul pompa dosing kapal saat ini RUSAK/NONAKTIF, sehingga koreksi kimia otomatis tidak dapat dijalankan. Tindakan mitigasi lapangan manual harus segera dilakukan!`;
    biotaImpact = isPhAcid
      ? 'Risiko iritasi insang akut, lendir berlebih, dan kematian mendadak pada ikan/udang akibat asidosis perairan.'
      : 'Risiko lonjakan amonia bebas (NH₃ toksik) yang meningkat drastis pada pH basa tinggi, berpotensi meracuni jaringan insang.';
  } else if (isPhAcid) {
    headline = 'Peringatan: Perairan Mengalami Pergeseran Asam Ringan';
    summary = `pH berada di ${ph.toFixed(2)} (di bawah 6.50). Karena pompa dosing rusak, diperlukan sirkulasi air segar atau aerasi untuk melepaskan gas asam terlarut.`;
    biotaImpact = 'Biota mulai mengalami stres osmotik ringan dan nafsu makan dapat menurun bila kondisi berlangsung lebih dari 6 jam.';
  } else if (isPhAlkaline) {
    headline = 'Peringatan: Perairan Cenderung Basa (Alkalin)';
    summary = `pH berada di ${ph.toFixed(2)} (di atas 8.50). Karena pompa dosing rusak, disarankan pergantian air parsial dan perlindungan dari ledakan alga hijau.`;
    biotaImpact = 'Toksisitas amonia meningkat. Hindari pemberian pakan berlebihan yang dapat memperparah akumulasi metabolit.';
  } else if (isTdsHigh) {
    headline = 'Peringatan: Akumulasi Padatan Terlarut (TDS) Meningkat';
    summary = `TDS terdeteksi ${Math.round(tds_ppm)} PPM. Konsentrasi mineral atau ion terlarut cukup padat, berpotensi meningkatkan tekanan osmotik air.`;
    biotaImpact = 'Biota membutuhkan energi ekstra untuk regulasi osmotik ionik tubuh terhadap air sekitar.';
  }

  // Tindakan tanpa pompa dosing
  const actionItemsNoDosing: string[] = [];
  if (isPhAcid) {
    actionItemsNoDosing.push('Pompa dosing rusak: Lakukan aerasi intensif (kincir/aerator) untuk mengusir akumulasi gas CO₂ terlarut yang memicu asam.');
    actionItemsNoDosing.push('Lakukan penyaluran air segar (fresh water flush) sebanyak 10-15% volume kolam/perairan secara perlahan.');
    actionItemsNoDosing.push('Bila di tambak, tebarkan kapur pertanian (CaCO₃ / Dolomit) secara manual terukur untuk meningkatkan alkalinitas penyangga.');
  } else if (isPhAlkaline) {
    actionItemsNoDosing.push('Pompa dosing rusak: Hindari penambahan bahan basa; lakukan pergantian air bertahap dari sumber air tawar bersuhu sejuk.');
    actionItemsNoDosing.push('Kurangi intensitas pakan sementara guna memutus akumulasi senyawa nitrogen pembentuk amonia toksik.');
    actionItemsNoDosing.push('Gunakan peneduh/paranet jika pH basa dipicu fotosintesis alga intensif pada siang hari terik.');
  } else {
    actionItemsNoDosing.push('Pertahankan sirkulasi perairan alami dan monitoring telemetri rutin via kapal USV.');
    actionItemsNoDosing.push('Karena pompa dosing rusak, siapkan cadangan sirkulasi pompa manual jika terjadi fluktuasi mendadak di malam hari.');
  }

  if (isTempHigh) {
    actionItemsNoDosing.push(`Suhu air tinggi (${suhu_c.toFixed(1)}°C): Pasang peneduh dan tingkatkan aerasi permukaan karena kelarutan oksigen (DO) menurun tajam.`);
  }
  if (isTdsHigh) {
    actionItemsNoDosing.push('Tambahkan suplai air tawar murni (low TDS) untuk mengencerkan kepekatan mineral di perairan.');
  }

  // Catatan perangkat keras & sensor
  const sensorHardwareNotes: string[] = [
    `Sensor Suhu DS18B20: Terbaca ${suhu_c.toFixed(1)}°C — kompensasi termal pH aktif pada elektroda Nernst.`,
    `Sensor pH-4502C: Terbaca ${ph.toFixed(2)} — lakukan pembersihan probe kaca dengan aquadest jika telah beroperasi > 48 jam di lapangan.`,
    `Sensor TDS Gravity: ${Math.round(tds_ppm)} PPM — pastikan probe bebas dari endapan kerak lumut/sedimen.`,
  ];

  if (isBatteryLow) {
    sensorHardwareNotes.push(`⚠️ Daya Baterai ESP32 Kritis (${Math.round(baterai_persen)}%): Arahkan kapal ke titik sandar docking untuk pengisian daya.`);
  }

  return {
    overallRating,
    waterCategory,
    headline,
    summary,
    biotaImpact,
    actionItemsNoDosing,
    sensorHardwareNotes,
    timestamp: now,
    source: 'LOCAL_EXPERT_ENGINE',
  };
}

/**
 * Heuristik lokal untuk menjawab pertanyaan chat kontekstual pengguna
 */
export function generateLocalAiChatResponse(userQuery: string, telemetry: TelemetrySnapshot): string {
  const query = userQuery.toLowerCase();
  const { suhu_c, ph, tds_ppm, baterai_persen, isSensorActive } = telemetry;

  if (query.includes('dosing') || query.includes('pompa')) {
    return `Status Pompa Dosing: Modul pompa dosing kapal saat ini terdata RUSAK/NONAKTIF sesuai instruksi sistem.\n\nAlternatif penanganan manual di lapangan tanpa pompa dosing:\n1. Sirkulasi Air Alami: Buat aliran sirkulasi dengan air segar untuk menjaga pH tetap pada kisaran 7.0 - 7.8.\n2. Aerasi Permukaan: Gunakan kincir air atau aerator aerasi gelembung mikro untuk menstabilkan asam karbonat.\n3. Pengapuran Manual (Tambak): Taburkan dolomit atau kalsium karbonat secara manual jika perairan terlalu asam (pH < 6.5).\n4. Tidak bergantung pada aktuator otomatis kapal hingga modul pompa dosing selesai diservis.`;
  }

  if (query.includes('ph') || query.includes('asam') || query.includes('basa')) {
    return `Analisis pH Aktual Kapal: Derajat keasaman saat ini adalah ${ph.toFixed(2)} pH.\n\n• Ambang Batas Ideal: 6.50 – 8.50 pH (SNI 01-6141-1999 untuk biota perairan).\n• Status: ${ph < 6.5 ? 'Terlalu Asam (Asidosis)' : ph > 8.5 ? 'Terlalu Basa (Alkalin)' : 'Optimal & Seimbang'}.\n• Catatan Lapangan: Sensor pH-4502C menggunakan elektroda gelas BNC. Bersihkan dengan air steril dan kalibrasi dengan larutan buffer pH 6.86 dan pH 4.01 secara berkala untuk mencegah drift tegangan.`;
  }

  if (query.includes('tds') || query.includes('garam') || query.includes('salinitas')) {
    return `Analisis TDS Aktual Kapal: Nilai Total Dissolved Solids terukur ${Math.round(tds_ppm)} PPM.\n\n• Estimasi Konduktivitas Listrik (EC): ~${Math.round(tds_ppm * 1.56)} µS/cm.\n• Estimasi Salinitas: ${(tds_ppm / 1000).toFixed(2)} PPT.\n• Klasifikasi: ${tds_ppm < 500 ? 'Air Tawar Murni' : tds_ppm < 1000 ? 'Perairan Tawar Berion / Tambak Normal' : 'Air Payau / Muara Estuari'}.\n• Pengaruh: TDS tinggi meningkatkan tekanan osmotik sel biota. Bila TDS melampaui 1000 PPM di kolam air tawar, lakukan pengenceran dengan air bersih.`;
  }

  if (query.includes('suhu') || query.includes('temp') || query.includes('panas') || query.includes('dingin') || query.includes('oksigen') || query.includes('do')) {
    const doCap = (14.652 - 0.41022 * suhu_c + 0.007991 * Math.pow(suhu_c, 2) - 0.000077774 * Math.pow(suhu_c, 3)).toFixed(2);
    return `Analisis Suhu & Kelarutan Oksigen (DO): Suhu perairan terbaca ${suhu_c.toFixed(1)}°C via probe DS18B20.\n\n• Kapasitas Maksimum Oksigen Terlarut (DO Saturated): ~${doCap} mg/L (Hukum Henry).\n• Dampak: Suhu tinggi mempercepat metabolisme ikan namun menurunkan kemampuan air mengikat gas O₂.\n• Rekomendasi: Jika suhu melampaui 32°C di siang hari, pasang kanopi terapung dan nyalakan aerasi untuk menjaga sirkulasi termal perairan.`;
  }

  if (query.includes('kalibrasi') || query.includes('buffer') || query.includes('sensor rusak')) {
    return `Prosedur Kalibrasi Sensor Kapal ESP32:\n\n1. Sensor pH-4502C:\n   - Bersihkan elektroda kaca dengan aquadest/air demineralisasi.\n   - Celupkan ke larutan buffer standar pH 6.86 pada suhu 25°C, putar trimpot offset modul hingga output ADC menunjukkan nilai ~2.5V (titik netral).\n   - Uji verifikasi pada larutan buffer pH 4.01 (asam) dan pH 9.18 (basa).\n\n2. Sensor TDS Gravity:\n   - Bersihkan kedua pin probe dari lumut atau endapan minyak.\n   - Celupkan ke larutan standar 1413 µS/cm dan pastikan nilai pembacaan stabil.\n\n3. Sensor Suhu DS18B20:\n   - Probe digital 1-Wire berkalibrasi pabrik; pastikan resistor pull-up 4.7kΩ terpasang baik di pin data ESP32.`;
  }

  if (query.includes('baterai') || query.includes('daya') || query.includes('esp32')) {
    return `Status Daya Baterai Kapal: Persentase baterai saat ini ${Math.round(baterai_persen)}%.\n\n• Rekomendasi Operasi:\n  - Di atas 50%: Aman untuk misi navigasi jarak jauh.\n  - 20% – 50%: Operasi normal, pantau penurunan voltase.\n  - Di bawah 20%: KRITIS! Arahkan kapal segera kembali ke titik awal (RTL) untuk mencegah kapal mogok di tengah perairan.`;
  }

  // Default response
  return `Halo! Saya AI Konsultan Telemetri Kapal & Kualitas Air. Berdasarkan data telemetri aktual:\n• Suhu: ${suhu_c.toFixed(1)}°C\n• pH: ${ph.toFixed(2)}\n• TDS: ${Math.round(tds_ppm)} PPM\n• Baterai: ${Math.round(baterai_persen)}%\n• Sensor Status: ${isSensorActive ? 'Realtime Aktif' : 'Terputus'}\n• Modul Pompa Dosing: NONAKTIF/RUSAK\n\nSemua rekomendasi dirancang khusus untuk operasional perairan tanpa pompa dosing otomatis. Anda dapat menanyakan tentang kalibrasi sensor, mitigasi asam/basa manual, pengaruh suhu terhadap DO, atau daya kapal!`;
}

/**
 * Meminta diagnosa telemetri dari API Server (Gemini 3.8 Flash)
 * dengan fallback otomatis ke engine lokal jika backend belum memiliki API key.
 */
export async function requestAiDiagnosis(telemetry: TelemetrySnapshot, customNote?: string): Promise<AiDiagnosticResult> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const res = await fetch('/api/ai/diagnose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telemetry: {
          ...telemetry,
          isDosingBroken: true,
        },
        customNote,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.headline && data.summary) {
        return {
          ...data,
          source: 'GEMINI_LIVE',
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
      }
    }
  } catch {
    // Fallback diam-diam ke heuristik lokal
  }

  return generateLocalAiDiagnosis(telemetry);
}

/**
 * Mengirim pesan konsultasi ke API Chat (Gemini 3.8 Flash)
 * dengan fallback cerdas ke jawaban lokal jika server offline.
 */
export async function requestAiChat(
  message: string,
  telemetry: TelemetrySnapshot,
  chatHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        telemetry: {
          ...telemetry,
          isDosingBroken: true,
        },
        history: chatHistory.slice(-6),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.reply) {
        return data.reply;
      }
    }
  } catch {
    // Fallback ke respons lokal
  }

  return generateLocalAiChatResponse(message, telemetry);
}
