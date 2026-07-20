function fmt(x) {
  if (!Number.isFinite(x)) return "-";
  if (x === 0) return "0";
  const ax = Math.abs(x);
  if (ax >= 1e-3 && ax < 1e6) {
    return Number(x).toPrecision(6).replace(/\.?0+$/, "");
  }
  return Number(x).toExponential(6).replace("+", "").replace(/0+e/, "e");
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = "Copied";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = orig;
      btn.classList.remove("copied");
    }, 1500);
  });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { fmt };
}
