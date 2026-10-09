import React, { useState } from 'react';
import {
  X,
  FlaskConical,
  Atom,
  Search,
  ExternalLink,
  Calculator,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  REAGENT_DATABASE,
  ChemicalCompound,
  calculateAquaticEquilibrium,
  calculateStoichiometricDosing,
} from '../services/scienceService';

interface SciencePortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTemp: number;
  currentPh: number;
}

export const SciencePortalModal: React.FC<SciencePortalModalProps> = ({
  isOpen,
  onClose,
  currentTemp,
  currentPh,
}) => {
  const [activeTab, setActiveTab] = useState<'chemistry' | 'equilibrium' | 'dosage'>('chemistry');
  const [selectedCompound, setSelectedCompound] = useState<ChemicalCompound>(REAGENT_DATABASE[0]);
  const [tankVolume, setTankVolume] = useState<number>(250); // Liters
  const [reagentMolarity, setReagentMolarity] = useState<number>(0.1); // Molar
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const equilibrium = calculateAquaticEquilibrium(currentTemp, currentPh);
  const dosingEst = calculateStoichiometricDosing(currentPh, 7.0, tankVolume, reagentMolarity);

  const filteredReagents = REAGENT_DATABASE.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.formula.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-4xl rounded-3xl border border-slate-700/60 bg-[#121826]/95 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/60 px-6 py-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300 border border-purple-500/25">
              <FlaskConical className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold tracking-tight text-white">Portal Sains &amp; Kimia Perairan</h2>
                <span className="rounded-full bg-purple-500/15 border border-purple-500/25 px-2.5 py-0.5 text-[10px] font-medium text-purple-300">
                  NCBI PubChem PUG-REST
                </span>
              </div>
              <p className="text-xs text-slate-400 font-normal">
                Studi senyawa reagen dosing, kesetimbangan disosiasi Kw(T), dan stoikiometri penetralan air
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800/60 bg-slate-950/30 px-6">
          <button
            onClick={() => setActiveTab('chemistry')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-4 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'chemistry'
                ? 'border-purple-400 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Atom className="h-3.5 w-3.5" />
            <span>Pustaka Reagen Kimia</span>
          </button>
          <button
            onClick={() => setActiveTab('equilibrium')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-4 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'equilibrium'
                ? 'border-purple-400 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlaskConical className="h-3.5 w-3.5" />
            <span>Kesetimbangan Disosiasi Air [H⁺] / [OH⁻]</span>
          </button>
          <button
            onClick={() => setActiveTab('dosage')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-4 text-xs font-medium transition-colors cursor-pointer ${
              activeTab === 'dosage'
                ? 'border-purple-400 text-purple-300 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Kalkulator Dosing Stoikiometri</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'chemistry' && (
            <div className="space-y-6">
              {/* Filter */}
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari reagen (NaOH, HCl, Bikarbonat)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-full border border-slate-700/80 bg-slate-950/70 pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500/50 focus:outline-none"
                  />
                </div>
                <span className="text-xs text-slate-400">
                  Basis Data NCBI PubChem Terverifikasi
                </span>
              </div>

              {/* Grid: Compound List + Detail Card */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* List */}
                <div className="space-y-2 md:col-span-5">
                  {filteredReagents.map((compound) => (
                    <button
                      key={compound.cid}
                      onClick={() => setSelectedCompound(compound)}
                      className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer ${
                        selectedCompound.cid === compound.cid
                          ? 'border-purple-500 bg-purple-950/30 text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-100">{compound.name}</span>
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-purple-300">
                          CID: {compound.cid}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>{compound.formula}</span>
                        <span className="text-slate-400">{compound.role}</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Detail Inspector */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-5 md:col-span-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                      <div>
                        <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                          {selectedCompound.role}
                        </span>
                        <h3 className="mt-1.5 text-base font-bold text-white">{selectedCompound.name}</h3>
                        <p className="text-xs text-slate-400 italic font-mono">{selectedCompound.iupacName}</p>
                      </div>
                      <a
                        href={`https://pubchem.ncbi.nlm.nih.gov/compound/${selectedCompound.cid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white transition-colors"
                      >
                        <span>PubChem</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Structure Image */}
                      <div className="flex flex-col items-center justify-center rounded-xl bg-white/5 border border-slate-800 p-3">
                        <img
                          src={selectedCompound.imageUrl}
                          alt={selectedCompound.name}
                          className="h-32 w-32 object-contain filter invert opacity-90 hover:opacity-100 transition-opacity"
                        />
                        <span className="mt-1 text-[10px] font-mono text-slate-400">Struktur Molekul 2D</span>
                      </div>

                      {/* Chemical Properties */}
                      <div className="space-y-2 text-xs font-mono">
                        <div className="rounded-lg bg-slate-900 border border-slate-800/80 p-2">
                          <span className="text-[10px] text-slate-500 block">Rumus Molekul:</span>
                          <span className="text-sky-300 font-bold">{selectedCompound.formula}</span>
                        </div>
                        <div className="rounded-lg bg-slate-900 border border-slate-800/80 p-2">
                          <span className="text-[10px] text-slate-500 block">Massa Molar (BM):</span>
                          <span className="text-emerald-300 font-bold">{selectedCompound.molecularWeight} g/mol</span>
                        </div>
                        <div className="rounded-lg bg-slate-900 border border-slate-800/80 p-2 overflow-hidden">
                          <span className="text-[10px] text-slate-500 block">Notasi SMILES:</span>
                          <span className="text-indigo-300 font-bold text-[10px] truncate block">
                            {selectedCompound.smiles}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-300">
                      <span className="font-semibold text-slate-200 block mb-1">Catatan Aplikasi Lapangan:</span>
                      <p>{selectedCompound.safetyNote}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'equilibrium' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 text-xs text-sky-200">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  <span>Kalkulasi Otomatis Berdasarkan Sensor Lapangan Telemetri Kapal</span>
                </div>
                <p>
                  Suhu terukur saat ini: <span className="font-mono font-bold text-white">{currentTemp.toFixed(1)} °C</span> ({equilibrium.tempK} K),
                  dan pH perairan: <span className="font-mono font-bold text-white">{currentPh.toFixed(2)}</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-400 font-mono block">Konstanta Auto-Ionisasi pKw(T):</span>
                  <span className="text-2xl font-bold font-mono text-purple-400 mt-1 block">
                    {equilibrium.pKw}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">
                    Kw = {equilibrium.KwScientific}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-400 font-mono block">Konsentrasi Ion Hidronium [H⁺]:</span>
                  <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
                    {equilibrium.hydrogenConcScientific}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">mol/L (Molar)</span>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <span className="text-xs text-slate-400 font-mono block">Konsentrasi Ion Hidroksida [OH⁻]:</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                    {equilibrium.hydroxideConcScientific}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono mt-1 block">mol/L (Molar)</span>
                </div>
              </div>

              {/* Scientific Theory Card */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300 space-y-2">
                <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-purple-400" />
                  Termodinamika Kualitas Air (Dissociation Temperature Compensation)
                </h4>
                <p>
                  Pada air murni standar (25°C), $pK_w = 14.00$ dan pH netral adalah 7.00. Namun pada perairan laut tropis bersuhu {currentTemp.toFixed(1)}°C,
                  titik netral sejati bergeser ke <span className="font-mono text-emerald-400 font-semibold">{equilibrium.neutralPhAtTemp} pH</span> karena
                  reaksi ionisasi endotermik air ($H_2O \rightleftharpoons H^+ + OH^-$). Algoritma perairan memperhitungkan variabel ini untuk mengevaluasi derajat disosiasi air secara presisi tanpa pompa dosing.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'dosage' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Modul Pompa Dosing Kapal Sedang Rusak</strong>
                  <span>
                    Perhitungan stoikiometri di bawah ini disediakan murni sebagai referensi laboratorium. Jangan mengaktifkan aktuator dosing kapal sampai perangkat keras diperbaiki.
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Inputs */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 space-y-4">
                  <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                    PARAMETER SAMPEL &amp; TANGKI KAPAL
                  </h4>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">
                      Volume Air Tangki Uji: <span className="font-mono text-sky-400 font-bold">{tankVolume} Liter</span>
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="1000"
                      step="25"
                      value={tankVolume}
                      onChange={(e) => setTankVolume(parseInt(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1">
                      Konsentrasi Larutan Dosing: <span className="font-mono text-purple-400 font-bold">{reagentMolarity} M</span>
                    </label>
                    <select
                      value={reagentMolarity}
                      onChange={(e) => setReagentMolarity(parseFloat(e.target.value))}
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="0.05">0.05 M (Konsentrasi Rendah / Halus)</option>
                      <option value="0.10">0.10 M (Standar Industri Kapal)</option>
                      <option value="0.25">0.25 M (Konsentrasi Tinggi / Cepat)</option>
                    </select>
                  </div>

                  <div className="rounded-lg bg-slate-900 border border-slate-800 p-3 text-xs text-slate-400">
                    <span>pH Air Saat Ini: <strong className="text-white font-mono">{currentPh.toFixed(2)}</strong></span>
                    <span className="block mt-1">Target Netralisasi: <strong className="text-emerald-400 font-mono">7.00 pH</strong></span>
                  </div>
                </div>

                {/* Calculation Output */}
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-5 flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-300">
                      ESTIMASI KEBUTUHAN DOSING AKTIF
                    </span>
                    <div className="mt-4 flex items-baseline gap-2">
                      <span className="font-mono text-5xl font-extrabold text-white">
                        {dosingEst.requiredMl}
                      </span>
                      <span className="text-lg font-bold text-purple-300">mL larutan</span>
                    </div>

                    <div className="mt-4 space-y-2 text-xs font-mono">
                      <div className="flex justify-between border-b border-purple-900/40 pb-1.5">
                        <span className="text-slate-400">Reagen Dibutuhkan:</span>
                        <span className="text-white font-semibold">{dosingEst.reagentType}</span>
                      </div>
                      <div className="flex justify-between border-b border-purple-900/40 pb-1.5">
                        <span className="text-slate-400">Selisih Molaritas H⁺:</span>
                        <span className="text-slate-200 font-semibold">{dosingEst.deltaMol} mol</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Faktor Buffer Kapasitansi:</span>
                        <span className="text-emerald-300 font-semibold">{dosingEst.bufferFactor}x</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-slate-950/70 border border-purple-900/50 p-2.5 text-[11px] text-purple-200">
                    Kapasitas teoritis pompa dosing kapal: 60 mL/menit (~{((dosingEst.requiredMl / 60) * 60).toFixed(0)} detik). Status perangkat: Rusak/Nonaktif.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-6 py-3 text-xs text-slate-400">
          <span>Integrasi Sains: Basis Data NCBI PubChem PUG-REST Terverifikasi</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 text-xs text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            Tutup Portal
          </button>
        </div>
      </div>
    </div>
  );
};
