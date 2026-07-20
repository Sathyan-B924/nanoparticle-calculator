# Nanoparticle Surface-Area Calculator

A browser-based calculator for the **nominal geometric surface-area concentration** of solid spherical metal nanoparticles.

## What it calculates

- Metal-mass input: particle count and area are derived from bulk-metal density and the particle-size distribution.
- Particle-number input: mass and area are derived from the certified particle count and the particle-size distribution.
- Dilution planning: the stock aliquot is calculated from target area concentration and final reaction volume.
- Optional lot-specification ranges: stock-area and aliquot ranges are reported without implying false precision.

## Particle-size modes

1. **Single diameter** for a monodisperse approximation.
2. **Number-weighted mean ± SD** using the analytical moments:
   - `mean(d²) = mean(d)² + SD²`
   - `mean(d³) = mean(d)³ + 3 mean(d) SD²`
3. **Number-weighted TEM histogram**, pasted as `diameter, weight` rows.

For particle-number concentration, area uses `mean(d²)`. For metal-mass concentration, area depends on `mean(d²) / mean(d³)`.

Use TEM **metal-core** diameters. Do not substitute DLS hydrodynamic diameters. Mass input must be metal mass, excluding ligands, stabilizer, and solvent.

## Interpretation

The result assumes isolated solid spheres. It does not correct for aggregation, fusion, ligand blocking, surface roughness, or inaccessible catalytic sites. Treat area-normalized kinetics as apparent geometric-area-normalized kinetics unless active-site density has been measured.

## Tests

With Node.js installed:

```shell
node tests/calc.test.js
node tests/html-syntax.test.js
```

Regression cases cover 20 nm Ag at 0.020 mg/mL, 20 nm Au at 6.54×10¹¹ particles/mL, a 20 ± 4 nm distribution, histogram moments, and the 0.096 cm²/mL in 2500 µL dilution workflow.
