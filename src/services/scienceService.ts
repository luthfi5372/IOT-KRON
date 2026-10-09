// Science Skill: Chemistry & Aquatic Science Calculations via PubChem PUG REST API

export interface ChemicalCompound {
  cid: number;
  name: string;
  role: 'pH Up (Basa)' | 'pH Down (Asam)' | 'Salinitas & TDS' | 'Buffer Alkalinitas';
  formula: string;
  molecularWeight: number;
  smiles: string;
  iupacName: string;
  safetyNote: string;
  imageUrl: string;
}

export const REAGENT_DATABASE: ChemicalCompound[] = [
  {
    cid: 14798,
    name: 'Natrium Hidroksida (NaOH)',
    role: 'pH Up (Basa)',
    formula: 'HNaO',
    molecularWeight: 39.997,
    smiles: '[OH-].[Na+]',
    iupacName: 'sodium hydroxide',
    safetyNote: 'Basa kuat kaustik. Digunakan pada dosing pH Up terkontrol untuk perairan asam.',
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/14798/PNG?image_size=300x300',
  },
  {
    cid: 516892,
    name: 'Natrium Bikarbonat (NaHCO3)',
    role: 'pH Up (Basa)',
    formula: 'CHNaO3',
    molecularWeight: 84.007,
    smiles: 'C(=O)(O)[O-].[Na+]',
    iupacName: 'sodium hydrogen carbonate',
    safetyNote: 'Agen penyangga alkalinitas alami. Aman untuk ekosistem perairan estuari.',
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/516892/PNG?image_size=300x300',
  },
  {
    cid: 313,
    name: 'Asam Klorida (HCl)',
    role: 'pH Down (Asam)',
    formula: 'ClH',
    molecularWeight: 36.46,
    smiles: 'Cl',
    iupacName: 'chlorane',
    safetyNote: 'Asam kuat mineral. Digunakan dalam konsentrasi rendah (0.05M-0.1M) untuk menetralkan air basa.',
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/313/PNG?image_size=300x300',
  },
  {
    cid: 311,
    name: 'Asam Sitrat (C6H8O7)',
    role: 'pH Down (Asam)',
    formula: 'C6H8O7',
    molecularWeight: 192.12,
    smiles: 'C(C(=O)O)C(CC(=O)O)(C(=O)O)O',
    iupacName: '2-hydroxypropane-1,2,3-tricarboxylic acid',
    safetyNote: 'Asam trikarboksilat organik biodegradabel ramah biota laut.',
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/311/PNG?image_size=300x300',
  },
  {
    cid: 5234,
    name: 'Natrium Klorida (NaCl)',
    role: 'Salinitas & TDS',
    formula: 'ClNa',
    molecularWeight: 58.44,
    smiles: '[Na+].[Cl-]',
    iupacName: 'sodium chloride',
    safetyNote: 'Penyumbang ion konduktivitas dan TDS utama dalam air laut dan estuari.',
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/5234/PNG?image_size=300x300',
  },
  {
    cid: 10112,
    name: 'Kalsium Karbonat (CaCO3)',
    role: 'Buffer Alkalinitas',
    formula: 'CCaO3',
    molecularWeight: 100.09,
    smiles: 'C(=O)([O-])[O-].[Ca+2]',
    iupacName: 'calcium carbonate',
    safetyNote: 'Penyusun cangkang moluska & penentu alkalinitas total perairan (TAC).',
    imageUrl: 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/10112/PNG?image_size=300x300',
  },
];

// Fetch Live Compound Details from PubChem PUG REST API
export async function fetchPubChemCompound(cid: number): Promise<Partial<ChemicalCompound> | null> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey,IUPACName/JSON`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const props = data.PropertyTable?.Properties?.[0];
    if (!props) return null;

    return {
      cid: props.CID,
      formula: props.MolecularFormula,
      molecularWeight: parseFloat(props.MolecularWeight),
      smiles: props.CanonicalSMILES,
      iupacName: props.IUPACName,
    };
  } catch {
    return null;
  }
}

// Aquatic Science: Temperature-dependent ion product of water Kw(T)
// Formula: pKw(T) = 4470.99/T - 6.0875 + 0.01706 * T (T in Kelvin)
export function calculateAquaticEquilibrium(tempC: number, ph: number) {
  const tempK = tempC + 273.15;
  const pKw = 4470.99 / tempK - 6.0875 + 0.01706 * tempK;
  const Kw = Math.pow(10, -pKw);

  // Hydrogen ion concentration [H+] = 10^(-pH)
  const hydrogenConc = Math.pow(10, -ph); // mol/L

  // Hydroxide ion concentration [OH-] = Kw / [H+]
  const hydroxideConc = Kw / hydrogenConc; // mol/L

  // Neutral pH at this temperature: pKw / 2
  const neutralPhAtTemp = pKw / 2;

  return {
    tempC,
    tempK: Number(tempK.toFixed(2)),
    pKw: Number(pKw.toFixed(3)),
    KwScientific: Kw.toExponential(3),
    hydrogenConcScientific: hydrogenConc.toExponential(3),
    hydroxideConcScientific: hydroxideConc.toExponential(3),
    neutralPhAtTemp: Number(neutralPhAtTemp.toFixed(2)),
  };
}

// Stoichiometric Dosing Volume Calculation (mL)
// Estimates volume of 0.1M dosing reagent needed to neutralize water sample of volume V liters to pH 7.0
export function calculateStoichiometricDosing(
  currentPh: number,
  targetPh: number = 7.0,
  waterVolumeLiters: number = 200,
  reagentMolarity: number = 0.1
) {
  if (Math.abs(currentPh - targetPh) < 0.05) {
    return { requiredMl: 0, reagentType: 'NETRAL (Tidak Memerlukan Dosing)', deltaH: 0 };
  }

  // Delta [H+] in mol/L
  const currentH = Math.pow(10, -currentPh);
  const targetH = Math.pow(10, -targetPh);
  const deltaMol = Math.abs(currentH - targetH) * waterVolumeLiters;

  // Volume of reagent (Liters) = mol / Molarity
  // Volume (mL) = (mol / Molarity) * 1000
  // Buffer capacity multiplier: Natural water requires ~5x-15x more due to bicarbonate buffering system
  const bufferFactor = 8.5;
  const estimatedMl = Math.max(1, (deltaMol / reagentMolarity) * 1000 * bufferFactor);

  const isAcidic = currentPh < targetPh;

  return {
    requiredMl: Number(estimatedMl.toFixed(1)),
    reagentType: isAcidic ? 'Basa (NaOH 0.1M / Pompa Up)' : 'Asam (HCl 0.1M / Pompa Down)',
    deltaMol: deltaMol.toExponential(3),
    bufferFactor,
  };
}
