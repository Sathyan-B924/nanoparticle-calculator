// Metals database — add more entries here as needed
const METALS = {
  "Ag": { name: "Silver",    density_g_cm3: 10.49,  atomic_weight_g_mol: 107.8682   },
  "Au": { name: "Gold",      density_g_cm3: 19.32,  atomic_weight_g_mol: 196.966569 },
  "Pt": { name: "Platinum",  density_g_cm3: 21.45,  atomic_weight_g_mol: 195.084    },
  "Pd": { name: "Palladium", density_g_cm3: 12.023, atomic_weight_g_mol: 106.42     },
};

const NA = 6.02214076e23; // Avogadro's number (exact)

const MOLAR_UNIT_TO_M = { pM: 1e-12, nM: 1e-9, uM: 1e-6, mM: 1e-3, M: 1.0 };

function perParticle(metal, diameter_nm) {
  const radius_cm = (diameter_nm / 2.0) * 1e-7;
  const vol_cm3   = (4 / 3) * Math.PI * Math.pow(radius_cm, 3);
  const area_cm2  = 4 * Math.PI * Math.pow(radius_cm, 2);
  const mass_g    = metal.density_g_cm3 * vol_cm3;
  return { radius_cm, vol_cm3, area_cm2, mass_g };
}

function calculate(metalSymbol, diameter_nm, mode, mass_mg_ml, number_per_ml) {
  const metal = METALS[metalSymbol];
  if (!metal) throw new Error("Unknown metal.");
  if (!(diameter_nm > 0)) throw new Error("Diameter must be > 0 nm.");

  const pp = perParticle(metal, diameter_nm);

  let n_per_ml, mass_mg_ml_out;
  if (mode === "mass") {
    if (!(mass_mg_ml > 0)) throw new Error("Mass concentration must be > 0.");
    n_per_ml       = (mass_mg_ml * 1e-3) / pp.mass_g;
    mass_mg_ml_out = mass_mg_ml;
  } else {
    if (!(number_per_ml > 0)) throw new Error("Number concentration must be > 0.");
    n_per_ml       = number_per_ml;
    mass_mg_ml_out = (n_per_ml * pp.mass_g) * 1e3;
  }

  const surface_cm2_ml = n_per_ml * pp.area_cm2;
  const molar_nM       = (n_per_ml / NA) * 1e12; // mol/mL * 1e9 -> nM; = n/NA * 1e12

  return {
    metal:    { symbol: metalSymbol, ...metal },
    intermediate: pp,
    outputs:  { number_per_ml: n_per_ml, mass_mg_ml: mass_mg_ml_out, surface_cm2_ml, molar_nM },
    formatted: {
      radius_cm:               fmt(pp.radius_cm),
      volume_cm3_per_particle: fmt(pp.vol_cm3),
      area_cm2_per_particle:   fmt(pp.area_cm2),
      mass_g_per_particle:     fmt(pp.mass_g),
      number_per_ml:           fmt(n_per_ml),
      mass_mg_ml:              fmt(mass_mg_ml_out),
      surface_cm2_ml:          fmt(surface_cm2_ml),
      molar_nM:                fmt(molar_nM),
    },
  };
}

function solveTarget(metalSymbol, diameter_nm, target_mode, target_value, molar_unit) {
  const metal = METALS[metalSymbol];
  if (!metal) throw new Error("Unknown metal.");
  if (!(diameter_nm > 0)) throw new Error("Diameter must be > 0 nm.");
  if (!(target_value > 0)) throw new Error("Target value must be > 0.");

  const pp = perParticle(metal, diameter_nm);

  let n_per_ml;
  if (target_mode === "surface") {
    n_per_ml = target_value / pp.area_cm2;
  } else {
    const factor = MOLAR_UNIT_TO_M[molar_unit] || 1e-9;
    n_per_ml = (target_value * factor * NA) / 1000.0;
  }

  const mass_mg_ml     = (n_per_ml * pp.mass_g) * 1e3;
  const surface_cm2_ml = n_per_ml * pp.area_cm2;
  const molar_nM       = (n_per_ml / NA) * 1e12;

  return {
    metal:    { symbol: metalSymbol, ...metal },
    intermediate: pp,
    outputs:  { number_per_ml: n_per_ml, mass_mg_ml, surface_cm2_ml, molar_nM },
    formatted: {
      radius_cm:               fmt(pp.radius_cm),
      volume_cm3_per_particle: fmt(pp.vol_cm3),
      area_cm2_per_particle:   fmt(pp.area_cm2),
      mass_g_per_particle:     fmt(pp.mass_g),
      number_per_ml:           fmt(n_per_ml),
      mass_mg_ml:              fmt(mass_mg_ml),
      surface_cm2_ml:          fmt(surface_cm2_ml),
      molar_nM:                fmt(molar_nM),
    },
  };
}
