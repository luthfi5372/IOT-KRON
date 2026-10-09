import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Bot,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Wrench,
  Droplets,
  Thermometer,
  Zap,
  RefreshCw,
  HelpCircle,
  BookOpen,
  Info,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import {
  AiDiagnosticResult,
  AiChatMessage,
  TelemetrySnapshot,
  requestAiDiagnosis,
  requestAiChat,
  generateLocalAiDiagnosis,
} from '../services/aiAdvisorService';

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  suhu_c: number;
  ph: number;
  tds_ppm: number;
  baterai_persen: number;
  isSensorActive?: boolean;
  isDark?: boolean;
}

export const AiAdvisorModal: React.FC<AiAdvisorModalProps> = ({
  isOpen,
  onClose,
  suhu_c,
  ph,
  tds_ppm,
  baterai_persen,
  isSensorActive = true,
  isDark = false,
}) => {
  const [activeTab, setActiveTab] = useState<'diagnosis' | 'chat' | 'calibration'>('diagnosis');
  const [diagnosticResult, setDiagnosticResult] = useState<AiDiagnosticResult | null>(null);
  const [isLoadingDiagnosis, setIsLoadingDiagnosis] = useState<boolean>(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState<AiChatMessage[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: `Halo! Saya AI Konsultan Telemetri Kualitas Air & Teknisi Kapal USV ESP32.\n\nSaya telah memantau telemetri aktual:\n• Suhu: ${suhu_c.toFixed(1)}°C\n• pH: ${ph.toFixed(2)}\n• TDS: ${Math.round(tds_ppm)} PPM\n• Daya Baterai: ${Math.round(baterai_persen)}%\n• Modul Pompa Dosing: NONAKTIF/RUSAK\n\nSilakan tanyakan langkah mitigasi manual di lapangan, analisis biota, atau SOP kalibrasi sensor perairan!`,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isSendingChat, setIsSendingChat] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const telemetrySnapshot: TelemetrySnapshot = {
    suhu_c,
    ph,
    tds_ppm,
    baterai_persen,
    isSensorActive,
    isDosingBroken: true,
  };

  // Jalankan diagnosa otomatis saat modal pertama dibuka
  useEffect(() => {
    if (isOpen && !diagnosticResult) {
      handleRunDiagnosis();
    }
  }, [isOpen]);

  // Scroll chat otomatis ke bawah
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeTab]);

  if (!isOpen) return null;

  async function handleRunDiagnosis() {
    setIsLoadingDiagnosis(true);
    try {
      const res = await requestAiDiagnosis(telemetrySnapshot);
      setDiagnosticResult(res);
    } catch {
      setDiagnosticResult(generateLocalAiDiagnosis(telemetrySnapshot));
    } finally {
      setIsLoadingDiagnosis(false);
    }
  }

  async function handleSendMessage(queryToSend?: string) {
    const text = (queryToSend || inputQuery).trim();
    if (!text || isSendingChat) return;

    const userMsg: AiChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setInputQuery('');
    setIsSendingChat(true);

    try {
      const history = chatMessages.map((m) => ({
        role: m.sender as 'user' | 'assistant',
        content: m.text,
      }));

      const replyText = await requestAiChat(text, telemetrySnapshot, history);

      const aiMsg: AiChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch {
      const fallbackMsg: AiChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: 'Maaf, terjadi kendala saat memproses jawaban. Silakan ulangi pertanyaan Anda.',
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsSendingChat(false);
    }
  }

  const quickPrompts = [
    'Tindakan penanganan pH tanpa pompa dosing yang rusak?',
    'Apakah nilai TDS dan Suhu saat ini aman untuk ikan?',
    'Bagaimana korelasi suhu air dengan kapasitas oksigen (DO)?',
    'Cara kalibrasi sensor pH-4502C dengan larutan buffer?',
    'Saran penghematan daya baterai kapal ESP32?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-5 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-4xl rounded-3xl border shadow-2xl flex flex-col max-h-[92vh] overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#0f172a] border-slate-700/80 text-slate-100 shadow-slate-950/70'
            : 'bg-[#faf8f5] border-stone-300 text-stone-900 shadow-stone-300/60'
        }`}
      >
        {/* Header */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between border-b px-5 sm:px-6 py-4 gap-3 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-stone-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Sparkles className="h-6 w-6 animate-pulse" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">
                  AI Diagnosa &amp; Konsultan Kualitas Air Kapal
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 border border-sky-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-sky-400">
                  <Bot className="h-3 w-3" />
                  Gemini AI &amp; Limnologi
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                Diagnosa kontekstual sensor telemetri ESP32 &amp; rekomendasi lapangan tanpa pompa dosing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handleRunDiagnosis}
              disabled={isLoadingDiagnosis}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-200'
              }`}
              title="Perbarui Analisis AI dengan sensor terkini"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingDiagnosis ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden xs:inline">Refresh Diagnosa</span>
            </button>
            <button
              onClick={onClose}
              className={`rounded-full p-2 transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-white' : 'text-stone-400 hover:bg-stone-200 hover:text-stone-800'
              }`}
              aria-label="Tutup Modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Live Snapshot Strip */}
        <div
          className={`grid grid-cols-2 xs:grid-cols-4 sm:grid-cols-5 border-b px-4 sm:px-6 py-2.5 text-xs gap-2 sm:gap-3 ${
            isDark ? 'bg-slate-950/60 border-slate-800/80 text-slate-300' : 'bg-stone-100/90 border-stone-200 text-stone-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Thermometer className="h-3.5 w-3.5 text-amber-500" />
            <span>Suhu: <strong className="font-mono text-amber-500">{suhu_c.toFixed(1)}°C</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5 text-sky-500" />
            <span>pH: <strong className="font-mono text-sky-500">{ph.toFixed(2)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Compass className="h-3.5 w-3.5 text-emerald-500" />
            <span>TDS: <strong className="font-mono text-emerald-500">{Math.round(tds_ppm)} PPM</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-indigo-500" />
            <span>Baterai: <strong className="font-mono text-indigo-500">{Math.round(baterai_persen)}%</strong></span>
          </div>
          <div className="col-span-2 xs:col-span-4 sm:col-span-1 flex items-center gap-1.5 font-medium text-rose-500">
            <Wrench className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Dosing: Rusak/Nonaktif</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className={`flex border-b px-4 sm:px-6 ${
            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-stone-50 border-stone-200'
          }`}
        >
          <button
            onClick={() => setActiveTab('diagnosis')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 sm:px-4 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'diagnosis'
                ? 'border-sky-500 text-sky-500'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Diagnosa Telemetri AI</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 sm:px-4 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'chat'
                ? 'border-sky-500 text-sky-500'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Bot className="h-4 w-4" />
            <span>Konsultasi AI Interaktif</span>
            <span className="hidden sm:inline-block rounded-full bg-sky-500/15 text-sky-400 text-[10px] px-1.5 py-0.2">
              Tanya Jawab
            </span>
          </button>
          <button
            onClick={() => setActiveTab('calibration')}
            className={`flex items-center gap-2 border-b-2 py-3 px-3 sm:px-4 text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'calibration'
                ? 'border-sky-500 text-sky-500'
                : isDark
                ? 'border-transparent text-slate-400 hover:text-slate-200'
                : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>SOP Kalibrasi Sensor</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: DIAGNOSA */}
          {activeTab === 'diagnosis' && (
            <div className="space-y-5">
              {isLoadingDiagnosis ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
                  <p className="text-xs font-medium">Sedang memproses evaluasi telemetri perairan via Gemini AI...</p>
                  <p className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-stone-400'}`}>
                    Menganalisis keseimbangan pH, kelarutan DO, indeks TDS, dan opsi mitigasi tanpa pompa dosing
                  </p>
                </div>
              ) : diagnosticResult ? (
                <>
                  {/* Status Banner */}
                  <div
                    className={`rounded-2xl border p-4.5 transition-all ${
                      diagnosticResult.overallRating === 'OPTIMAL'
                        ? isDark
                          ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-200'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : diagnosticResult.overallRating === 'WASPADA'
                        ? isDark
                          ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                        : diagnosticResult.overallRating === 'KRITIS'
                        ? isDark
                          ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                        : isDark
                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                        : 'bg-stone-100 border-stone-200 text-stone-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {diagnosticResult.overallRating === 'OPTIMAL' ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                        ) : diagnosticResult.overallRating === 'WASPADA' ? (
                          <AlertTriangle className="h-6 w-6 text-amber-500" />
                        ) : diagnosticResult.overallRating === 'KRITIS' ? (
                          <AlertOctagon className="h-6 w-6 text-rose-500" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                              diagnosticResult.overallRating === 'OPTIMAL'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : diagnosticResult.overallRating === 'WASPADA'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : diagnosticResult.overallRating === 'KRITIS'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                            }`}
                          >
                            STATUS: {diagnosticResult.overallRating}
                          </span>
                          <span className="text-[11px] opacity-75 font-mono">
                            {diagnosticResult.waterCategory} · Diperbarui {diagnosticResult.timestamp}
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold mt-2">{diagnosticResult.headline}</h3>
                        <p className="text-xs sm:text-sm mt-1 leading-relaxed opacity-90">
                          {diagnosticResult.summary}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Details: Biota Impact & Hardware Condition */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Impact on Biota */}
                    <div
                      className={`rounded-2xl border p-4.5 space-y-2 ${
                        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-stone-200'
                      }`}
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-indigo-400">
                        <Droplets className="h-4 w-4" />
                        Dampak Ekologis &amp; Biota Air
                      </h4>
                      <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-stone-700'}`}>
                        {diagnosticResult.biotaImpact}
                      </p>
                    </div>

                    {/* Hardware & Calibration Inspection */}
                    <div
                      className={`rounded-2xl border p-4.5 space-y-2 ${
                        isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-stone-200'
                      }`}
                    >
                      <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2 text-amber-400">
                        <Wrench className="h-4 w-4" />
                        Diagnosa Sensor &amp; Perangkat Kapal
                      </h4>
                      <ul className="space-y-1.5 text-xs">
                        {diagnosticResult.sensorHardwareNotes.map((note, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-500 shrink-0">•</span>
                            <span className={isDark ? 'text-slate-300' : 'text-stone-700'}>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Crucial Section: Action Items Without Dosing Pump */}
                  <div
                    className={`rounded-2xl border p-4.5 space-y-3 ${
                      isDark
                        ? 'bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/30 border-indigo-900/40'
                        : 'bg-gradient-to-br from-white to-sky-50/50 border-sky-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/15 text-sky-400">
                          <ShieldCheck className="h-4 w-4" />
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-sky-500">
                          Rekomendasi Tindakan Lapangan (Tanpa Pompa Dosing)
                        </h4>
                      </div>
                      <span className="rounded-full bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
                        Pompa Dosing Rusak
                      </span>
                    </div>

                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                      Karena aktuator pompa dosing kapal saat ini nonaktif/rusak, terapkan langkah mitigasi fisik, aerasi, atau penanganan air manual berikut:
                    </p>

                    <div className="space-y-2">
                      {diagnosticResult.actionItemsNoDosing.map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs sm:text-sm ${
                            isDark
                              ? 'bg-slate-950/60 border-slate-800/80 text-slate-200'
                              : 'bg-white border-stone-200 text-stone-800'
                          }`}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/20 text-sky-400 text-xs font-bold font-mono">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* TAB 2: KONSULTASI INTERAKTIF */}
          {activeTab === 'chat' && (
            <div className="flex flex-col h-[500px]">
              {/* Quick Prompts */}
              <div className="pb-3 border-b space-y-1.5 border-stone-200 dark:border-slate-800">
                <span className={`text-[11px] font-medium block ${isDark ? 'text-slate-400' : 'text-stone-500'}`}>
                  Pertanyaan Cepat Seputar Telemetri Kapal &amp; Air:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isSendingChat}
                      className={`text-[11px] rounded-lg px-2.5 py-1 transition-all cursor-pointer border ${
                        isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-sky-500/40 hover:text-sky-300'
                          : 'bg-white border-stone-200 text-stone-700 hover:border-sky-400 hover:text-sky-600 shadow-xs'
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-xs ${
                        msg.sender === 'user'
                          ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white rounded-br-none'
                          : isDark
                          ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                          : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 text-[10px] opacity-70 mb-1">
                        <span className="font-semibold">
                          {msg.sender === 'user' ? 'Anda (Operator)' : 'AI Konsultan Maritim'}
                        </span>
                        <span>{msg.timestamp}</span>
                      </div>
                      <p>{msg.text}</p>
                    </div>
                  </div>
                ))}
                {isSendingChat && (
                  <div className="flex justify-start">
                    <div
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs ${
                        isDark ? 'bg-slate-900 text-slate-400 border border-slate-800' : 'bg-white text-stone-500 border border-stone-200'
                      }`}
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-500" />
                      <span>AI sedang menyusun analisa berdasarkan sensor aktual...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="pt-3 border-t border-stone-200 dark:border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder="Tanyakan mitigasi pH, batas TDS, suhu, atau kalibrasi sensor..."
                    disabled={isSendingChat}
                    className={`flex-1 rounded-xl border px-3.5 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'
                        : 'bg-white border-stone-200 text-stone-900 placeholder-stone-400'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={isSendingChat || !inputQuery.trim()}
                    className={`flex items-center justify-center rounded-xl p-2.5 sm:px-4 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm ${
                      inputQuery.trim() && !isSendingChat
                        ? 'bg-sky-600 hover:bg-sky-500 active:scale-95'
                        : 'bg-slate-400/40 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline sm:ml-1.5">Kirim</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 3: SOP KALIBRASI */}
          {activeTab === 'calibration' && (
            <div className="space-y-4 text-xs sm:text-sm">
              <div
                className={`rounded-2xl border p-4 space-y-2 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-stone-200'
                }`}
              >
                <h4 className="font-bold flex items-center gap-2 text-sky-500">
                  <Droplets className="h-4 w-4" />
                  1. Standar Operasional Prosedur Kalibrasi Modul pH-4502C (ESP32)
                </h4>
                <p className={isDark ? 'text-slate-300' : 'text-stone-600'}>
                  Modul pH-4502C menghasilkan tegangan analog (0 – 3.3V) ke ADC ESP32. Drift tegangan dapat terjadi bila elektroda tertutup lumut atau kering.
                </p>
                <div className="space-y-2 mt-2">
                  <div className="rounded-xl border p-2.5 bg-sky-500/5 border-sky-500/20">
                    <strong className="text-sky-400 block font-semibold">Langkah 1: Titik Netral (Buffer pH 6.86 / 7.00)</strong>
                    <span className="text-xs opacity-90">
                      Celupkan elektroda ke larutan buffer netral pada suhu 25°C. Sesuaikan trimpot offset modul hingga pembacaan tegangan pada serial monitor ESP32 stabil di kisaran ~2.50V (atau nilai ADC terkalibrasi ke pH 6.86).
                    </span>
                  </div>
                  <div className="rounded-xl border p-2.5 bg-amber-500/5 border-amber-500/20">
                    <strong className="text-amber-400 block font-semibold">Langkah 2: Titik Asam (Buffer pH 4.01)</strong>
                    <span className="text-xs opacity-90">
                      Bilas probe dengan air demineralisasi (aquadest), keringkan dengan tisu lembut tanpa menggores bola kaca, lalu celupkan ke buffer 4.01. Kalibrasi koefisien slope kemiringan tegangan per pH.
                    </span>
                  </div>
                  <div className="rounded-xl border p-2.5 bg-emerald-500/5 border-emerald-500/20">
                    <strong className="text-emerald-400 block font-semibold">Langkah 3: Verifikasi Basa (Buffer pH 9.18)</strong>
                    <span className="text-xs opacity-90">
                      Verifikasi linearitas elektroda pada buffer pH 9.18. Pastikan toleransi deviasi pembacaan di bawah ±0.15 pH.
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`rounded-2xl border p-4 space-y-2 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-stone-200'
                }`}
              >
                <h4 className="font-bold flex items-center gap-2 text-emerald-500">
                  <Compass className="h-4 w-4" />
                  2. Kalibrasi &amp; Pembersihan Sensor TDS Gravity
                </h4>
                <p className={isDark ? 'text-slate-300' : 'text-stone-600'}>
                  Sensor TDS mengukur konduktivitas elektrik via dua elektroda logam tahan karat.
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs opacity-90">
                  <li>Bersihkan elektroda dengan alkohol isopropil atau sabun lunak jika ada lapisan minyak atau biofilm tambak.</li>
                  <li>Gunakan larutan kalibrasi standar 1413 µS/cm (~707 PPM TDS) untuk mengukur faktor pengali software.</li>
                  <li>Pastikan probe terbenam minimal 3 cm di bawah permukaan air kapal dan tidak menempel pada dinding lambung kapal.</li>
                </ul>
              </div>

              <div
                className={`rounded-2xl border p-4 space-y-2 ${
                  isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-stone-200'
                }`}
              >
                <h4 className="font-bold flex items-center gap-2 text-rose-400">
                  <Wrench className="h-4 w-4" />
                  3. Pengingat Modul Pompa Dosing (Rusak)
                </h4>
                <p className="text-xs text-rose-400/90 leading-relaxed">
                  Modul relay dan pompa peristaltik dosing kapal saat ini rusak dan dinonaktifkan dari logika otomatisasi. Semua pengendalian kimia dilakukan secara manual dari darat atau menggunakan metode penyeimbangan sirkulasi air alami.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between border-t px-5 sm:px-6 py-3.5 gap-2 text-xs ${
            isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-stone-100 border-stone-200 text-stone-600'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>
              Engine AI Terintegrasi Telemetri Kapal ({diagnosticResult?.source === 'GEMINI_LIVE' ? 'Gemini 3.8 Flash Live' : 'Marine Limnology Expert'})
            </span>
          </div>
          <button
            onClick={onClose}
            className={`rounded-xl px-4 py-2 font-semibold transition-all cursor-pointer self-end sm:self-auto ${
              isDark
                ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                : 'bg-stone-200 text-stone-800 hover:bg-stone-300'
            }`}
          >
            Tutup Dialog
          </button>
        </div>
      </div>
    </div>
  );
};
