import React from 'react';
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  BatteryWarning,
  Volume2,
  VolumeX,
  Unplug,
  RefreshCw,
  Play,
  Bell,
  BellOff,
  BellRing,
} from 'lucide-react';
import { NotificationPermissionState } from '../utils/browserNotifications';

interface AlertBannerProps {
  ph: number;
  batteryPercentage?: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  isDismissed: boolean;
  onDismiss: () => void;
  isDark?: boolean;
  isSensorActive?: boolean;
  lastMessageAge?: number | null;
  onStartSimulator?: () => void;
  onReconnectMqtt?: () => void;
  // Browser Notification API
  browserNotifPermission: NotificationPermissionState;
  browserNotifEnabled: boolean;
  onRequestBrowserNotif: () => void;
  onToggleBrowserNotif: () => void;
  onTestBrowserNotif?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  ph,
  batteryPercentage = 100,
  soundEnabled,
  onToggleSound,
  isDismissed,
  onDismiss,
  isDark = false,
  isSensorActive = true,
  lastMessageAge = null,
  onStartSimulator,
  onReconnectMqtt,
  browserNotifPermission,
  browserNotifEnabled,
  onRequestBrowserNotif,
  onToggleBrowserNotif,
  onTestBrowserNotif,
}) => {
  const isAcidic = ph < 6.5;
  const isAlkaline = ph > 8.5;
  const isNormal = !isAcidic && !isAlkaline;
  const isLowBattery = batteryPercentage < 20;

  // Render browser notification toggle button
  const renderNotifButton = () => {
    if (browserNotifPermission === 'unsupported') {
      return null;
    }

    if (browserNotifPermission === 'denied') {
      return (
        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium cursor-not-allowed ${
            isDark ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'
          }`}
          title="Izin notifikasi diblokir oleh browser. Harap izinkan melalui ikon gembok pada address bar peramban."
        >
          <BellOff className="h-3.5 w-3.5 text-rose-400" />
          <span>Izin Diblokir</span>
        </span>
      );
    }

    if (browserNotifPermission === 'default') {
      return (
        <button
          onClick={onRequestBrowserNotif}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            isDark
              ? 'border border-sky-500/40 bg-sky-500/20 text-sky-200 hover:bg-sky-500/30'
              : 'border border-sky-300 bg-sky-100/90 text-sky-800 hover:bg-sky-200'
          }`}
          title="Klik untuk mengaktifkan peringatan browser saat tab diminimalkan atau membuka aplikasi lain"
        >
          <BellRing className="h-3.5 w-3.5 animate-bounce text-sky-500" />
          <span>Aktifkan Notifikasi Tab</span>
        </button>
      );
    }

    // Permission granted
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onToggleBrowserNotif}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
            browserNotifEnabled
              ? isDark
                ? 'border border-sky-500/35 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25'
                : 'border border-sky-200 bg-white text-sky-800 hover:bg-sky-50'
              : isDark
              ? 'border border-slate-700 bg-slate-800/80 text-slate-400 hover:bg-slate-700'
              : 'border border-stone-200 bg-white text-slate-500 hover:bg-stone-50'
          }`}
          title={
            browserNotifEnabled
              ? 'Notifikasi browser aktif (peringatan otomatis saat di latar belakang)'
              : 'Notifikasi browser dinonaktifkan sementara'
          }
        >
          {browserNotifEnabled ? (
            <Bell className="h-3.5 w-3.5 text-sky-500" />
          ) : (
            <BellOff className="h-3.5 w-3.5 text-slate-400" />
          )}
          <span>{browserNotifEnabled ? 'Notifikasi Background' : 'Notif Nonaktif'}</span>
        </button>

        {browserNotifEnabled && onTestBrowserNotif && (
          <button
            onClick={onTestBrowserNotif}
            className={`rounded-full px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
              isDark
                ? 'text-sky-300 hover:bg-sky-500/20 hover:text-sky-100'
                : 'text-sky-700 hover:bg-sky-100 hover:text-sky-900'
            }`}
            title="Kirim notifikasi uji coba sekarang untuk memverifikasi tampilan pada desktop/OS"
          >
            Tes
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* Informational Prompt for Background Notification Permission */}
      {browserNotifPermission === 'default' && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-xs transition-all border ${
            isDark
              ? 'border-sky-500/30 bg-sky-950/30 text-sky-200'
              : 'border-sky-200 bg-sky-50/90 text-sky-900 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
              <BellRing className="h-4 w-4 animate-bounce" />
            </span>
            <div>
              <p className="font-semibold">
                Dapatkan Peringatan Kualitas Air di Latar Belakang (Background)
              </p>
              <p className={`text-[11px] ${isDark ? 'text-sky-300/80' : 'text-sky-700'}`}>
                Peramban dapat menampilkan notifikasi popup desktop jika pH, TDS, atau suhu air melampaui batas kritis saat Anda membuka tab lain.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRequestBrowserNotif}
              className={`rounded-full px-3 py-1.5 font-semibold text-xs transition-all cursor-pointer shadow-xs ${
                isDark
                  ? 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                  : 'bg-sky-600 text-white hover:bg-sky-700'
              }`}
            >
              Aktifkan Izin Notifikasi
            </button>
          </div>
        </div>
      )}
      {/* 1. SENSOR OFFLINE / DEAD ALERT (USER SPECIFIC REQUEST) */}
      {!isSensorActive && (
        <div
          role="alert"
          className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 shadow-sm transition-all border-2 animate-pulse-subtle ${
            isDark
              ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/50 via-[#1a121d] to-slate-900/80 text-rose-100'
              : 'border-rose-300 bg-gradient-to-r from-rose-50 via-amber-50/40 to-white text-rose-950 shadow-[0_4px_20px_-4px_rgba(244,63,94,0.12)]'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
                  isDark
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/35'
                    : 'bg-rose-100 text-rose-700 border border-rose-200'
                }`}
              >
                <Unplug className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-sm sm:text-base font-bold tracking-tight ${isDark ? 'text-rose-200' : 'text-rose-900'}`}>
                    Perlu Menghubungkan dengan Sensor
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      isDark
                        ? 'bg-rose-500/25 border border-rose-500/40 text-rose-200'
                        : 'bg-rose-200/80 text-rose-900 border border-rose-300'
                    }`}
                  >
                    Sensor Mati / Offline
                  </span>
                  {lastMessageAge !== null && (
                    <span className={`text-[11px] font-normal ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      · Data terakhir: {lastMessageAge} detik lalu
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-rose-200/90' : 'text-rose-800'}`}>
                  Transmisi data telemetri kualitas air kapal tidak terdeteksi. Harap periksa koneksi kabel probe
                  sensor ESP32-S3 (DS18B20, pH-4502C, TDS), pastikan daya mikrokontroler menyala, atau hubungkan
                  kembali ke broker MQTT / jalankan simulator realtime.
                </p>
              </div>
            </div>

            {/* Quick resolution buttons */}
            <div className="flex flex-wrap items-center gap-2">
              {onStartSimulator && (
                <button
                  onClick={onStartSimulator}
                  className={`btn-simple flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs ${
                    isDark
                      ? 'bg-emerald-500/20 border border-emerald-500/35 text-emerald-200 hover:bg-emerald-500/30'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                  }`}
                  title="Nyalakan simulator virtual untuk menguji dashboard secara realtime"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Hubungkan Sensor (Simulator)</span>
                </button>
              )}

              {onReconnectMqtt && (
                <button
                  onClick={onReconnectMqtt}
                  className={`btn-simple flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold cursor-pointer shadow-xs ${
                    isDark
                      ? 'border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700'
                      : 'border border-stone-300 bg-white text-slate-700 hover:bg-stone-50'
                  }`}
                  title="Hubungkan ulang koneksi ke broker MQTT"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Cek MQTT Broker</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. Low Battery Warning Banner (only if sensor is sending data) */}
      {isSensorActive && isLowBattery && (
        <div
          role="alert"
          className={`relative overflow-hidden rounded-3xl p-4 shadow-xs transition-all ${
            isDark
              ? 'border border-rose-500/25 bg-rose-500/10 text-rose-200 backdrop-blur-xl'
              : 'border border-rose-200 bg-rose-50/90 text-rose-900'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                  isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white text-rose-600 border border-rose-200 shadow-xs'
                }`}
              >
                <BatteryWarning className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-rose-200' : 'text-rose-900'}`}>
                    Peringatan Daya Baterai Kapal
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                      isDark ? 'bg-rose-500/20 border border-rose-500/30 text-rose-200' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Sisa {batteryPercentage}%
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-rose-200/90' : 'text-rose-700'}`}>
                  Daya baterai ESP32 di bawah 20%. Harap lakukan pengisian daya untuk menjaga stabilitas telemetri.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {renderNotifButton()}
              <button
                onClick={onToggleSound}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                  isDark
                    ? 'border border-rose-500/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                    : 'border border-rose-200 bg-white text-rose-800 hover:bg-rose-100'
                }`}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                <span>{soundEnabled ? 'Alarm Suara' : 'Senyapkan'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Primary pH Water Quality Alert (when sensor is active) */}
      {isSensorActive && (
        isNormal ? (
          <div
            className={`relative overflow-hidden rounded-3xl px-4 py-3 shadow-xs transition-all ${
              isDark
                ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 backdrop-blur-xl'
                : 'border border-emerald-200/70 bg-emerald-50/80 text-emerald-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-2xl ${
                    isDark ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/20' : 'bg-white text-emerald-600 border border-emerald-200 shadow-xs'
                  }`}
                >
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isDark ? 'text-emerald-300' : 'text-emerald-900'}`}>
                      Kualitas Air Normal &amp; Optimal
                    </span>
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                  </div>
                  <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-emerald-700'}`}>
                    Derajat keasaman stabil di <span className="font-semibold tabular-nums">{ph.toFixed(2)} pH</span>. Pompa dosing siaga.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {renderNotifButton()}
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-emerald-600/90'}`}>
                  Batas toleransi: 6.50 – 8.50 pH
                </span>
              </div>
            </div>
          </div>
        ) : isDismissed ? (
          <div
            className={`flex items-center justify-between rounded-full px-4 py-2 text-xs ${
              isDark ? 'border border-slate-800 bg-slate-900/60 text-slate-400' : 'border border-stone-200 bg-stone-100 text-stone-600'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isAcidic ? 'bg-amber-500' : 'bg-rose-500'}`} />
              Peringatan pH disenyapkan ({isAcidic ? 'Kondisi Asam' : 'Kondisi Basa'})
            </span>
            <button
              onClick={onDismiss}
              className="font-medium underline underline-offset-2 transition-colors cursor-pointer"
            >
              Tampilkan Kembali
            </button>
          </div>
        ) : isAcidic ? (
          <div
            role="alert"
            className={`relative overflow-hidden rounded-3xl p-4 shadow-xs transition-all ${
              isDark
                ? 'border border-amber-500/25 bg-amber-500/10 text-amber-200 backdrop-blur-xl'
                : 'border border-amber-200 bg-amber-50/90 text-amber-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-white text-amber-600 border border-amber-200 shadow-xs'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isDark ? 'text-amber-300' : 'text-amber-900'}`}>
                      Peringatan Ambang Batas Asam
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                        isDark ? 'bg-amber-500/20 border border-amber-500/30 text-amber-200' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      pH {ph.toFixed(2)}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs font-medium ${isDark ? 'text-amber-100' : 'text-amber-800'}`}>
                    Kondisi asam terdeteksi (pH &lt; 6.5) — Modul dosing dinonaktifkan
                  </p>
                  <p className={`text-xs ${isDark ? 'text-amber-200/80' : 'text-amber-700'}`}>
                    Pompa dosing pH Up sedang rusak/nonaktif. Lakukan tindakan sirkulasi atau aerasi perairan secara manual.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {renderNotifButton()}
                <button
                  onClick={onToggleSound}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    isDark
                      ? 'border border-amber-500/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                      : 'border border-amber-200 bg-white text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span>{soundEnabled ? 'Alarm Suara' : 'Senyapkan'}</span>
                </button>
                <button
                  onClick={onDismiss}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    isDark ? 'border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800' : 'border border-stone-200 bg-white text-slate-600 hover:bg-stone-100'
                  }`}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            role="alert"
            className={`relative overflow-hidden rounded-3xl p-4 shadow-xs transition-all ${
              isDark
                ? 'border border-rose-500/25 bg-rose-500/10 text-rose-200 backdrop-blur-xl'
                : 'border border-rose-200 bg-rose-50/90 text-rose-900'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
                    isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-white text-rose-600 border border-rose-200 shadow-xs'
                  }`}
                >
                  <AlertOctagon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${isDark ? 'text-rose-300' : 'text-rose-900'}`}>
                      Peringatan Ambang Batas Basa
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                        isDark ? 'bg-rose-500/20 border border-rose-500/30 text-rose-200' : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      pH {ph.toFixed(2)}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs font-medium ${isDark ? 'text-rose-100' : 'text-rose-800'}`}>
                    Kondisi basa terdeteksi (pH &gt; 8.5) — Modul dosing dinonaktifkan
                  </p>
                  <p className={`text-xs ${isDark ? 'text-rose-200/80' : 'text-rose-700'}`}>
                    Pompa dosing pH Down sedang rusak/nonaktif. Lakukan tindakan aerasi atau pergantian air secara bertahap.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {renderNotifButton()}
                <button
                  onClick={onToggleSound}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer shadow-xs ${
                    isDark
                      ? 'border border-rose-500/30 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
                      : 'border border-rose-200 bg-white text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                  <span>{soundEnabled ? 'Alarm Suara' : 'Senyapkan'}</span>
                </button>
                <button
                  onClick={onDismiss}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    isDark ? 'border border-slate-800 bg-slate-900/60 text-slate-300 hover:bg-slate-800' : 'border border-stone-200 bg-white text-slate-600 hover:bg-stone-100'
                  }`}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
