const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

for (const relativePath of ["index.html", "solve/index.html"]) {
  const html = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1])
    .filter((source) => source.trim());
  assert.ok(scripts.length > 0, `${relativePath} should contain an inline application script`);
  scripts.forEach((source, index) => new vm.Script(source, { filename: `${relativePath}#script-${index + 1}` }));

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${relativePath} contains duplicate element IDs`);

  const referencedIds = [
    ...html.matchAll(/\$\(["']([^"']+)["']\)/g),
    ...html.matchAll(/getElementById\(["']([^"']+)["']\)/g),
  ].map((match) => match[1]);
  referencedIds.forEach((id) => {
    assert.ok(ids.includes(id), `${relativePath} references missing element #${id}`);
  });
}

const stockHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(stockHtml, /id="numberRangeMinCoeff"/);
assert.match(stockHtml, /id="numberRangeMinExp"/);
assert.match(stockHtml, /name="concentrationEntry" value="single"/);
assert.match(stockHtml, /name="concentrationEntry" value="range"/);
assert.match(stockHtml, /Their midpoint becomes the working concentration/);
assert.match(stockHtml, /volume_ul: 2500/);
assert.equal((stockHtml.match(/Calculation scope: nominal geometric area/g) || []).length, 1);
assert.doesNotMatch(stockHtml, /stacking factor|Do not apply/i);

const plannerHtml = fs.readFileSync(path.join(__dirname, "..", "solve", "index.html"), "utf8");
assert.match(plannerHtml, /Final reaction volume \(µL\)/);
assert.match(plannerHtml, /This value affects only the solvent\/diluent volume/);
assert.equal((plannerHtml.match(/Calculation scope: dilution by nominal geometric surface area/g) || []).length, 1);
assert.doesNotMatch(plannerHtml, /verify dispersion|does not assume/i);

console.log("HTML inline scripts and element IDs are valid.");
