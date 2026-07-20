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

console.log("HTML inline scripts and element IDs are valid.");
