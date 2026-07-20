const assert = require("node:assert/strict");
global.fmt = require("../static/utils.js").fmt;
const {
  createSizeModel,
  calculate,
  parseHistogram,
  planDilution,
  weightedMoment,
} = require("../static/calc.js");

function close(actual, expected, relativeTolerance = 1e-8) {
  const scale = Math.max(1, Math.abs(expected));
  assert.ok(
    Math.abs(actual - expected) <= relativeTolerance * scale,
    `expected ${actual} to be within ${relativeTolerance} of ${expected}`,
  );
}

const silver = calculate("Ag", { mode: "single", diameter_nm: 20 }, "mass", 0.020, null);
close(silver.outputs.number_per_ml, 4.55161896e11, 2e-9);
close(silver.outputs.surface_cm2_ml, 5.71973308, 2e-9);

const gold = calculate("Au", { mode: "single", diameter_nm: 20 }, "number", null, 6.54e11);
close(gold.outputs.surface_cm2_ml, 8.21840638, 2e-9);
close(gold.outputs.mass_mg_ml, 0.0529265, 2e-6);

const normal = calculate("Ag", { mode: "normal", mean_nm: 20, sd_nm: 4 }, "mass", 0.020, null);
close(normal.size.mean_d2_nm2, 416);
close(normal.size.mean_d3_nm3, 8960);
close(normal.outputs.surface_cm2_ml, 5.311180716, 2e-9);

const parsed = parseHistogram("diameter_nm,count\n16,2\n20,3\n24,1");
close(weightedMoment(parsed.diameters, parsed.weights, 1), 19.3333333333);
const histogram = createSizeModel({ mode: "histogram", histogram_text: "16,2\n20,3\n24,1" });
close(histogram.mean_d2_nm2, (16 ** 2 * 2 + 20 ** 2 * 3 + 24 ** 2) / 6);

const agPlan = planDilution(silver.outputs.surface_cm2_ml, 0.096, 2.5);
close(agPlan.totalArea_cm2, 0.240);
close(agPlan.stockVolume_ul, 41.96000003, 2e-8);

const auPlan = planDilution(gold.outputs.surface_cm2_ml, 0.096, 2.5);
close(auPlan.stockVolume_ul, 29.20274185, 2e-8);

const rangePlan = planDilution(8.21840638, 0.096, 2.5, 7.402, 9.035, 1.0);
assert.ok(rangePlan.aliquotMinimum_ul < rangePlan.stockVolume_ul);
assert.ok(rangePlan.aliquotMaximum_ul > rangePlan.stockVolume_ul);
close(rangePlan.remainingVolume_ml, 1.470797258, 2e-9);

assert.throws(() => planDilution(0.05, 0.096, 2.5), /cannot be reached/i);
assert.throws(() => createSizeModel({ mode: "normal", mean_nm: 20, sd_nm: 20 }), /smaller than the mean/i);

console.log("All nanoparticle calculator tests passed.");
