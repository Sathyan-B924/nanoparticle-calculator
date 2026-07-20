# Nanoparticle Surface-Area Calculator

A browser-based calculator for the **nominal geometric surface-area concentration** of solid spherical metal nanoparticles.

## What it calculates

- Metal-mass input: particle count and area are derived from bulk-metal density and the particle-size distribution.
- Particle-number input: mass and area are derived from the certified particle count and the particle-size distribution.
- Dilution planning: the stock aliquot is calculated from target area concentration and final reaction volume.
- Certificate input can be either a single value or a min–max specification. Range mode uses the midpoint as the working estimate and retains the full range for stock-area and aliquot reporting.

## Particle-size modes

1. **Single diameter** for a monodisperse approximation.
2. **Number-weighted mean ± SD** using the analytical moments:
   - `mean(d²) = mean(d)² + SD²`
   - `mean(d³) = mean(d)³ + 3 mean(d) SD²`
3. **Number-weighted TEM histogram**, pasted as `diameter, weight` rows.

For particle-number concentration, area uses `mean(d²)`. For metal-mass concentration, area depends on `mean(d²) / mean(d³)`.

Geometric metal area uses TEM **metal-core** diameters. DLS hydrodynamic diameters represent the ligand/solvent shell and are outside the calculation. Mass input represents metal mass excluding ligands, stabilizer, and solvent.

## Interpretation

The calculation scope is isolated solid spheres. Aggregation, fusion, ligand blocking, surface roughness, and inaccessible catalytic sites are outside the result. Rates normalized with this value are geometric-area-normalized rates rather than measured active-site turnover frequencies.

## Tests

With Node.js installed:

```shell
node tests/calc.test.js
node tests/html-syntax.test.js
```

Regression cases cover 20 nm Ag at 0.020 mg/mL, 20 nm Au at 6.54×10¹¹ particles/mL, a 20 ± 4 nm distribution, histogram moments, and the 0.096 cm²/mL in 2500 µL dilution workflow.
