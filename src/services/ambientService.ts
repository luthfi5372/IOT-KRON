// Layanan Sinkronisasi Data Lingkungan & Cuaca Sekitar (Ambient Environmental Service)
// Sinkronisasi otomatis dan on-demand dengan stasiun cuaca terbuka (Open-Meteo & GPS Geolocation)

import {
  AmbientLocation,
  AmbientWeather,
  AmbientCorrelation,
  PRESET_WATER_LOCATIONS,
} from '../types/ambient';

/**
 * Konversi WMO weather code ke deskripsi bahasa Indonesia dan ikon representatif
 */
export function parseWmoWeatherCode(code: number): { label: string; icon: string } {
  if (code === 0) return { label: 'Langit Cerah Terang', icon: '☀️' };
  if (code === 1) return { label: 'Sebagian Besar Cerah', icon: '🌤️' };
  if (code === 2) return { label: 'Cerah Berawan', icon: '⛅' };
  if (code === 3) return { label: 'Mendung Berawan Tebal', icon: '☁️' };
  if (code >= 45 && code <= 48) return { label: 'Berkabut Tebal / Embun', icon: '🌫️' };
  if (code >= 51 && code <= 55) return { label: 'Gerimis Ringan', icon: '🌦️' };
  if (code >= 61 && code <= 63) return { label: 'Hujan Rintik-rintik', icon: '🌧️' };
  if (code >= 65) return { label: 'Hujan Lebat / Deras', icon: '🌧️⛈️' };
  if (code >= 80 && code <= 82) return { label: 'Hujan Disertai Angin', icon: '⛈️' };
  if (code >= 95) return { label: 'Badai Petir Tropis', icon: '🌩️' };
  return { label: 'Kondisi Cuaca Standar', icon: '🌤️' };
}

/**
 * Konversi derajat arah angin ke label kompas Indonesia
 */
export function getWindDirectionLabel(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'Utara (U)';
  if (normalized >= 22.5 && normalized < 67.5) return 'Timur Laut (TL)';
  if (normalized >= 67.5 && normalized < 112.5) return 'Timur (T)';
  if (normalized >= 112.5 && normalized < 157.5) return 'Tenggara (TG)';
  if (normalized >= 157.5 && normalized < 202.5) return 'Selatan (S)';
  if (normalized >= 202.5 && normalized < 247.5) return 'Barat Daya (BD)';
  if (normalized >= 247.5 && normalized < 292.5) return 'Barat (B)';
  return 'Barat Laut (BL)';
}

/**
 * Hitung korelasi ilmiah parameter air vs data lingkungan sekitar
 */
export function computeAmbientCorrelation(
  suhuAir_c: number,
  _phAir: number,
  _tdsAir: number,
  weather: AmbientWeather
): AmbientCorrelation {
  const deltaSuhu = parseFloat((suhuAir_c - weather.suhuUdara_c).toFixed(2));

  let deltaSuhuLabel = 'Suhu air dan udara sekitar hampir seimbang';
  let statusKeseimbanganTermal: 'PENYERAPAN_PANAS' | 'PELEPASAN_PANAS' | 'SEIMBANG' = 'SEIMBANG';

  if (deltaSuhu > 1.5) {
    statusKeseimbanganTermal = 'PELEPASAN_PANAS';
    deltaSuhuLabel = `Air lebih hangat ${Math.abs(deltaSuhu)}°C dari udara sekitar (radiasi panas ke atmosfer)`;
  } else if (deltaSuhu < -1.5) {
    statusKeseimbanganTermal = 'PENYERAPAN_PANAS';
    deltaSuhuLabel = `Air lebih dingin ${Math.abs(deltaSuhu)}°C dari udara sekitar (penyerapan energi termal)`;
  }

  // Estimasi saturasi Oksigen Terlarut Maksimal (DO Saturation mg/L) berdasarkan Hukum Henry & Tekanan Barometrik
  // DO_sat = (14.652 - 0.41022*T + 0.007991*T^2 - 0.000077774*T^3) * (P / 1013.25)
  const T = Math.max(10, Math.min(45, suhuAir_c));
  const baseDo = 14.652 - 0.41022 * T + 0.007991 * Math.pow(T, 2) - 0.000077774 * Math.pow(T, 3);
  const pressureRatio = (weather.tekananUdara_hpa || 1013.25) / 1013.25;
  const estimasiDoMaksimal_mgL = parseFloat((baseDo * pressureRatio).toFixed(2));

  // Risiko pengenceran air hujan terhadap TDS & pergeseran pH
  let risikoPengenceranHujan: 'AMAN' | 'WASPADA' | 'KRITIS' = 'AMAN';
  let risikoPengenceranPesan = 'Tidak terdeteksi presipitasi curah hujan di sekitar; salinitas & TDS stabil.';

  if (weather.curahHujan_mm > 5.0) {
    risikoPengenceranHujan = 'KRITIS';
    risikoPengenceranPesan = `Hujan deras (${weather.curahHujan_mm} mm/jam)! Terjadi pengenceran cepat TDS & potensi penurunan drastis pH akibat limpasan air hujan asam.`;
  } else if (weather.curahHujan_mm > 0.1) {
    risikoPengenceranHujan = 'WASPADA';
    risikoPengenceranPesan = `Hujan ringan (${weather.curahHujan_mm} mm/jam) di sekitar perairan. Pantau penurunan bertahap TDS dan penyesuaian pH alami.`;
  }

  // Pengaruh radiasi UV & fotosintesis
  let pengaruhFotosintesisUv = 'Radiasi UV rendah; laju fotosintesis fitoplankton tenang.';
  if (weather.indeksUv >= 7) {
    pengaruhFotosintesisUv = `Indeks UV sangat tinggi (${weather.indeksUv.toFixed(1)}). Fotosintesis mikroalga intensif mengonsumsi ion bikarbonat terlarut, berpotensi menaikkan pH air siang hari.`;
  } else if (weather.indeksUv >= 4) {
    pengaruhFotosintesisUv = `Indeks UV moderat (${weather.indeksUv.toFixed(1)}). Keseimbangan CO₂ terlarut dan pH berada dalam rentang ritme sirkadian normal.`;
  }

  // Pengaruh angin terhadap turbulensi permukaan & aerasi alami
  let pengaruhAnginAerasi = 'Angin tenang (< 8 km/jam); aerasi permukaan alami minimal.';
  if (weather.kecepatanAngin_kmh > 20) {
    pengaruhAnginAerasi = `Kecepatan angin tinggi (${weather.kecepatanAngin_kmh.toFixed(1)} km/jam). Turbulensi gelombang membantu difusi oksigen alami, waspadai drift navigasi kapal.`;
  } else if (weather.kecepatanAngin_kmh >= 8) {
    pengaruhAnginAerasi = `Angin sepoi-sepoi (${weather.kecepatanAngin_kmh.toFixed(1)} km/jam, arah ${weather.arahAngin_label}). Terjadi sirkulasi permukaan mikro yang menguntungkan perairan.`;
  }

  return {
    deltaSuhu,
    deltaSuhuLabel,
    statusKeseimbanganTermal,
    risikoPengenceranHujan,
    risikoPengenceranPesan,
    estimasiDoMaksimal_mgL,
    pengaruhFotosintesisUv,
    pengaruhAnginAerasi,
  };
}

/**
 * Buat data cuaca default realistis untuk perairan tropis Indonesia jika offline
 */
export function generateStationFallbackWeather(location: AmbientLocation): AmbientWeather {
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour <= 18;

  // Variasi realistis berdasarkan waktu
  const baseTemp = isDay ? 30.5 : 26.2;
  const baseHumidity = isDay ? 72 : 88;
  const baseUv = isDay ? (hour >= 11 && hour <= 14 ? 7.8 : 3.5) : 0;

  return {
    suhuUdara_c: parseFloat((baseTemp + (Math.random() * 1.2 - 0.6)).toFixed(1)),
    suhuTerasa_c: parseFloat((baseTemp + 2.5).toFixed(1)),
    kelembaban_persen: Math.round(baseHumidity + (Math.random() * 4 - 2)),
    tekananUdara_hpa: parseFloat((1011.5 + (Math.random() * 1.5 - 0.75)).toFixed(1)),
    kecepatanAngin_kmh: parseFloat((11.2 + Math.random() * 3).toFixed(1)),
    arahAngin_derajat: 225, // Barat Daya
    arahAngin_label: 'Barat Daya (BD)',
    cuacaKode: 2, // Cerah Berawan
    cuacaLabel: 'Cerah Berawan',
    cuacaIcon: '⛅',
    curahHujan_mm: 0.0,
    indeksUv: parseFloat(baseUv.toFixed(1)),
    kondisiAwan_persen: 35,
  };
}

/**
 * Ambil data cuaca sekitar dari API Open-Meteo secara real-time
 */
export async function fetchLiveAmbientWeather(
  location: AmbientLocation
): Promise<{ weather: AmbientWeather; source: 'live_api' | 'station_model' }> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m,uv_index,cloud_cover&wind_speed_unit=kmh&timezone=Asia%2FJakarta`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const data = await res.json();
    const current = data.current;

    if (!current) {
      throw new Error('Data current tidak tersedia dalam respons');
    }

    const wmo = parseWmoWeatherCode(current.weather_code ?? 0);
    const windDeg = current.wind_direction_10m ?? 180;

    const weather: AmbientWeather = {
      suhuUdara_c: current.temperature_2m ?? 30.0,
      suhuTerasa_c: current.apparent_temperature ?? current.temperature_2m ?? 32.0,
      kelembaban_persen: current.relative_humidity_2m ?? 75,
      tekananUdara_hpa: current.surface_pressure ?? 1012.0,
      kecepatanAngin_kmh: current.wind_speed_10m ?? 10.0,
      arahAngin_derajat: windDeg,
      arahAngin_label: getWindDirectionLabel(windDeg),
      cuacaKode: current.weather_code ?? 0,
      cuacaLabel: wmo.label,
      cuacaIcon: wmo.icon,
      curahHujan_mm: current.precipitation ?? 0.0,
      indeksUv: current.uv_index ?? 5.0,
      kondisiAwan_persen: current.cloud_cover ?? 30,
    };

    return { weather, source: 'live_api' };
  } catch (error) {
    console.warn('Gagal menghubungi Open-Meteo API, beralih ke stasiun fallback lokal:', error);
    return {
      weather: generateStationFallbackWeather(location),
      source: 'station_model',
    };
  }
}

/**
 * Deteksi koordinat GPS pengguna secara langsung via HTML5 Geolocation API
 */
export function getCurrentGpsPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Perangkat tidak mendukung geolokasi GPS'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: parseFloat(pos.coords.latitude.toFixed(4)),
          longitude: parseFloat(pos.coords.longitude.toFixed(4)),
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * State inisial untuk ambient environmental sync
 */
export function getDefaultAmbientSyncState(suhuAir_c = 28.4, phAir = 7.24, tdsAir = 460) {
  const location = PRESET_WATER_LOCATIONS[0]; // Teluk Jakarta
  const weather = generateStationFallbackWeather(location);
  const correlation = computeAmbientCorrelation(suhuAir_c, phAir, tdsAir, weather);

  return {
    location,
    weather,
    correlation,
    isSyncing: false,
    lastSyncTimestamp: Date.now(),
    autoSyncEnabled: true,
    autoSyncIntervalMinutes: 5,
    syncError: null,
    source: 'station_model' as const,
  };
}
