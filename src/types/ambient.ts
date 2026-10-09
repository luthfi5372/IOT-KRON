// Tipe Data Sinkronisasi Lingkungan & Cuaca Sekitar (Ambient Environmental Data)
// Untuk Kapal USV Pemantau Kualitas Air (DS18B20, pH-4502C, TDS, ESP32-S3)

export interface AmbientLocation {
  id: string;
  name: string;
  province?: string;
  waterType: 'Estuari / Teluk' | 'Danau / Waduk' | 'Sungai / Kanal' | 'Tambak Budidaya' | 'Perairan Laut' | 'Kustom GPS';
  latitude: number;
  longitude: number;
  elevation_m?: number;
}

export interface AmbientWeather {
  suhuUdara_c: number;
  suhuTerasa_c: number;
  kelembaban_persen: number;
  tekananUdara_hpa: number;
  kecepatanAngin_kmh: number;
  arahAngin_derajat: number;
  arahAngin_label: string;
  cuacaKode: number;
  cuacaLabel: string;
  cuacaIcon: string;
  curahHujan_mm: number;
  indeksUv: number;
  kondisiAwan_persen?: number;
}

export interface AmbientCorrelation {
  deltaSuhu: number; // suhuAir - suhuUdara
  deltaSuhuLabel: string;
  statusKeseimbanganTermal: 'PENYERAPAN_PANAS' | 'PELEPASAN_PANAS' | 'SEIMBANG';
  risikoPengenceranHujan: 'AMAN' | 'WASPADA' | 'KRITIS';
  risikoPengenceranPesan: string;
  estimasiDoMaksimal_mgL: number; // Henry's law dissolved oxygen max saturation
  pengaruhFotosintesisUv: string;
  pengaruhAnginAerasi: string;
}

export interface AmbientSyncState {
  location: AmbientLocation;
  weather: AmbientWeather;
  correlation: AmbientCorrelation;
  isSyncing: boolean;
  lastSyncTimestamp: number;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  syncError: string | null;
  source: 'live_api' | 'gps' | 'station_model';
}

export const PRESET_WATER_LOCATIONS: AmbientLocation[] = [
  {
    id: 'teluk_jakarta',
    name: 'Perairan Teluk Jakarta & Ancol',
    province: 'DKI Jakarta',
    waterType: 'Estuari / Teluk',
    latitude: -6.115,
    longitude: 106.845,
    elevation_m: 2,
  },
  {
    id: 'waduk_jatiluhur',
    name: 'Waduk Ir. H. Djuanda (Jatiluhur)',
    province: 'Jawa Barat',
    waterType: 'Danau / Waduk',
    latitude: -6.525,
    longitude: 107.385,
    elevation_m: 107,
  },
  {
    id: 'danau_sunter',
    name: 'Danau Sunter Barat & Timur',
    province: 'DKI Jakarta',
    waterType: 'Danau / Waduk',
    latitude: -6.141,
    longitude: 106.878,
    elevation_m: 5,
  },
  {
    id: 'muara_cisadane',
    name: 'Muara & Muara Aliran Sungai Cisadane',
    province: 'Banten',
    waterType: 'Sungai / Kanal',
    latitude: -6.024,
    longitude: 106.634,
    elevation_m: 3,
  },
  {
    id: 'tambak_pantura',
    name: 'Zona Tambak Budidaya Pantura Subang',
    province: 'Jawa Barat',
    waterType: 'Tambak Budidaya',
    latitude: -6.216,
    longitude: 107.684,
    elevation_m: 1,
  },
  {
    id: 'danau_toba',
    name: 'Perairan Danau Toba (Parapat)',
    province: 'Sumatera Utara',
    waterType: 'Danau / Waduk',
    latitude: 2.664,
    longitude: 98.932,
    elevation_m: 905,
  },
];
