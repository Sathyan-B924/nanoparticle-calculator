// Metals database — bulk metal densities are used for geometric calculations.
const METALS = {
  Ag: { name: "Silver", density_g_cm3: 10.49, atomic_weight_g_mol: 107.8682 },
  Au: { name: "Gold", density_g_cm3: 19.32, atomic_weight_g_mol: 196.966569 },
  Pt: { name: "Platinum", density_g_cm3: 21.45, atomic_weight_g_mol: 195.084 },
  Pd: { name: "Palladium", density_g_cm3: 12.023, atomic_weight_g_mol: 106.42 },
};

const NA = 6.02214076e23; // Avogadro constant (exact)
const MOLAR_UNIT_TO_M = { pM: 1e-12, nM: 1e-9, uM: 1e-6, mM: 1e-3, M: 1 };

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  return number;
}

function nonnegativeNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new Error(`${label} must be zero or greater.`);
  }
  return number;
}

function weightedMoment(diameters_nm, weights, order) {
  if (!Array.isArray(diameters_nm) || !Array.isArray(weights) ||
      diameters_nm.length === 0 || diameters_nm.length !== weights.length) {
    throw new Error("Diameter and weight arrays must have equal, non-zero length.");
  }

  let weightedSum = 0;
  let totalWeight = 0;
  for (let i = 0; i < diameters_nm.length; i += 1) {
    const diameter = positiveNumber(diameters_nm[i], `Diameter in row ${i + 1}`);
    const weight = nonnegativeNumber(weights[i], `Weight in row ${i + 1}`);
    weightedSum += weight * Math.pow(diameter, order);
    totalWeight += weight;
  }

  if (!(totalWeight > 0)) throw new Error("At least one histogram weight must be greater than zero.");
  return weightedSum / totalWeight;
}

function parseHistogram(text) {
  const diameters = [];
  const weights = [];
  const rows = String(text || "").split(/\r?\n/);

  rows.forEach((raw, index) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const cells = line.split(/[\s,;\t]+/).filter(Boolean);
    if (cells.length < 2) {
      throw new Error(`Histogram row ${index + 1} needs a diameter and a number-weight.`);
    }
    const diameter = Number(cells[0]);
    const weight = Number(cells[1]);
    if (!Number.isFinite(diameter) || !Number.isFinite(weight)) {
      // Permit one conventional header row.
      if (diameters.length === 0 && /diam|size|weight|count|frequency/i.test(line)) return;
      throw new Error(`Histogram row ${index + 1} contains a non-numeric value.`);
    }
    diameters.push(diameter);
    weights.push(weight);
  });

  if (!diameters.length) throw new Error("Enter at least one diameter,weight histogram row.");
  return { diameters, weights };
}

function createSizeModel(spec) {
  if (typeof spec === "number") spec = { mode: "single", diameter_nm: spec };
  if (!spec || typeof spec !== "object") throw new Error("A particle-size model is required.");
  if ([spec.mean_d_nm, spec.mean_d2_nm2, spec.mean_d3_nm3].every(Number.isFinite)) return spec;

  const mode = spec.mode || "single";
  let mean_d_nm;
  let mean_d2_nm2;
  let mean_d3_nm3;
  let description;
  let warning = "";

  if (mode === "single") {
    const diameter = positiveNumber(spec.diameter_nm, "Core diameter");
    mean_d_nm = diameter;
    mean_d2_nm2 = diameter ** 2;
    mean_d3_nm3 = diameter ** 3;
    description = `${fmt(diameter)} nm single diameter`;
  } else if (mode === "normal") {
    const mean = positiveNumber(spec.mean_nm, "Mean core diameter");
    const sd = nonnegativeNumber(spec.sd_nm, "Diameter standard deviation");
    if (!(sd < mean)) throw new Error("Diameter standard deviation must be smaller than the mean.");
    mean_d_nm = mean;
    mean_d2_nm2 = mean ** 2 + sd ** 2;
    mean_d3_nm3 = mean ** 3 + 3 * mean * sd ** 2;
    description = `${fmt(mean)} ± ${fmt(sd)} nm (number-weighted mean ± SD)`;
    if (sd / mean > 0.3) warning = "A normal approximation is weak above 30% relative SD; use a TEM histogram instead.";
  } else if (mode === "histogram") {
    const data = spec.histogram_text ? parseHistogram(spec.histogram_text) : {
      diameters: spec.diameters_nm,
      weights: spec.weights,
    };
    mean_d_nm = weightedMoment(data.diameters, data.weights, 1);
    mean_d2_nm2 = weightedMoment(data.diameters, data.weights, 2);
    mean_d3_nm3 = weightedMoment(data.diameters, data.weights, 3);
    description = `${data.diameters.length} row number-weighted histogram`;
  } else {
    throw new Error("Unknown particle-size mode.");
  }

  return { mode, mean_d_nm, mean_d2_nm2, mean_d3_nm3, description, warning };
}

function distributionAverages(metal, sizeModel) {
  // d is in nm: 1 nm² = 1e-14 cm² and 1 nm³ = 1e-21 cm³.
  const radius_cm = (sizeModel.mean_d_nm / 2) * 1e-7;
  const area_cm2 = Math.PI * sizeModel.mean_d2_nm2 * 1e-14;
  const volume_cm3 = (Math.PI / 6) * sizeModel.mean_d3_nm3 * 1e-21;
  const mass_g = metal.density_g_cm3 * volume_cm3;
  return { radius_cm, area_cm2, vol_cm3: volume_cm3, mass_g };
}

function calculate(metalSymbol, sizeSpec, mode, mass_mg_ml, number_per_ml) {
  const metal = METALS[metalSymbol];
  if (!metal) throw new Error("Unknown metal.");

  const size = createSizeModel(sizeSpec);
  const pp = distributionAverages(metal, size);
  let n_per_ml;
  let mass_mg_ml_out;

  if (mode === "mass") {
    mass_mg_ml_out = positiveNumber(mass_mg_ml, "Metal mass concentration");
    n_per_ml = (mass_mg_ml_out * 1e-3) / pp.mass_g;
  } else if (mode === "number") {
    n_per_ml = positiveNumber(number_per_ml, "Number concentration");
    mass_mg_ml_out = n_per_ml * pp.mass_g * 1e3;
  } else {
    throw new Error("Input mode must be mass or number.");
  }

  const surface_cm2_ml = n_per_ml * pp.area_cm2;
  const molar_nM = (n_per_ml / NA) * 1e12;

  return {
    metal: { symbol: metalSymbol, ...metal },
    size,
    intermediate: pp,
    outputs: { number_per_ml: n_per_ml, mass_mg_ml: mass_mg_ml_out, surface_cm2_ml, molar_nM },
    formatted: {
      radius_cm: fmt(pp.radius_cm),
      volume_cm3_per_particle: fmt(pp.vol_cm3),
      area_cm2_per_particle: fmt(pp.area_cm2),
      mass_g_per_particle: fmt(pp.mass_g),
      number_per_ml: fmt(n_per_ml),
      mass_mg_ml: fmt(mass_mg_ml_out),
      surface_cm2_ml: fmt(surface_cm2_ml),
      molar_nM: fmt(molar_nM),
    },
  };
}

function calculateConcentrationRange(metalSymbol, sizeSpec, mode, nominal, minimum, maximum) {
  const nominalResult = mode === "mass"
    ? calculate(metalSymbol, sizeSpec, mode, nominal, null)
    : calculate(metalSymbol, sizeSpec, mode, null, nominal);

  const makeResult = (value) => {
    if (value === null || value === undefined || value === "") return null;
    return mode === "mass"
      ? calculate(metalSymbol, sizeSpec, mode, value, null)
      : calculate(metalSymbol, sizeSpec, mode, null, value);
  };
  const minimumResult = makeResult(minimum);
  const maximumResult = makeResult(maximum);

  if (minimumResult && minimumResult.outputs.surface_cm2_ml > nominalResult.outputs.surface_cm2_ml) {
    throw new Error("Minimum concentration cannot exceed the nominal concentration.");
  }
  if (maximumResult && maximumResult.outputs.surface_cm2_ml < nominalResult.outputs.surface_cm2_ml) {
    throw new Error("Maximum concentration cannot be below the nominal concentration.");
  }
  if (minimumResult && maximumResult &&
      minimumResult.outputs.surface_cm2_ml > maximumResult.outputs.surface_cm2_ml) {
    throw new Error("Minimum concentration cannot exceed maximum concentration.");
  }

  return { nominal: nominalResult, minimum: minimumResult, maximum: maximumResult };
}

function planDilution(stockSurface_cm2_ml, targetSurface_cm2_ml, finalVolume_ml, stockMinimum, stockMaximum, otherReagentVolume_ml = 0) {
  const stock = positiveNumber(stockSurface_cm2_ml, "Stock surface concentration");
  const target = positiveNumber(targetSurface_cm2_ml, "Target surface concentration");
  const finalVolume = positiveNumber(finalVolume_ml, "Final reaction volume");
  const otherReagentVolume = nonnegativeNumber(otherReagentVolume_ml || 0, "Other reagent stock volume");
  if (otherReagentVolume > finalVolume) throw new Error("Other reagent stock volume cannot exceed the final volume.");

  const totalArea_cm2 = target * finalVolume;
  const stockVolume_ml = totalArea_cm2 / stock;
  if (stockVolume_ml + otherReagentVolume > finalVolume) {
    throw new Error("Target cannot be reached: nanoparticle stock plus other reagent stocks exceed the final volume.");
  }

  const lowStock = stockMinimum === null || stockMinimum === undefined || stockMinimum === ""
    ? null : positiveNumber(stockMinimum, "Minimum stock surface concentration");
  const highStock = stockMaximum === null || stockMaximum === undefined || stockMaximum === ""
    ? null : positiveNumber(stockMaximum, "Maximum stock surface concentration");
  if (lowStock && lowStock > stock) throw new Error("Minimum stock concentration cannot exceed nominal.");
  if (highStock && highStock < stock) throw new Error("Maximum stock concentration cannot be below nominal.");
  if (lowStock && highStock && lowStock > highStock) throw new Error("Minimum stock concentration cannot exceed maximum.");

  // A low stock concentration requires the largest aliquot, and vice versa.
  const aliquotMinimum_ml = highStock ? totalArea_cm2 / highStock : null;
  const aliquotMaximum_ml = lowStock ? totalArea_cm2 / lowStock : null;

  return {
    totalArea_cm2,
    stockVolume_ml,
    stockVolume_ul: stockVolume_ml * 1000,
    remainingVolume_ml: finalVolume - otherReagentVolume - stockVolume_ml,
    aliquotMinimum_ml,
    aliquotMaximum_ml,
    aliquotMinimum_ul: aliquotMinimum_ml === null ? null : aliquotMinimum_ml * 1000,
    aliquotMaximum_ul: aliquotMaximum_ml === null ? null : aliquotMaximum_ml * 1000,
  };
}

// Retained for compatibility with older links or scripts.
function solveTarget(metalSymbol, diameter_nm, target_mode, target_value, molar_unit) {
  const metal = METALS[metalSymbol];
  if (!metal) throw new Error("Unknown metal.");
  const size = createSizeModel({ mode: "single", diameter_nm });
  const pp = distributionAverages(metal, size);
  const target = positiveNumber(target_value, "Target value");
  let n_per_ml;
  if (target_mode === "surface") {
    n_per_ml = target / pp.area_cm2;
  } else {
    const factor = MOLAR_UNIT_TO_M[molar_unit] || 1e-9;
    n_per_ml = (target * factor * NA) / 1000;
  }
  return calculate(metalSymbol, size, "number", null, n_per_ml);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    METALS,
    NA,
    weightedMoment,
    parseHistogram,
    createSizeModel,
    calculate,
    calculateConcentrationRange,
    planDilution,
    solveTarget,
  };
}
