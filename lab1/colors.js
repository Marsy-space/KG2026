// Функции перевода между RGB, CMYK и HLS. 
var Colors = (function () {
  const R = Math.round, clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  function rgbToCmyk(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
    return { c: R((1 - r - k) / (1 - k) * 100), m: R((1 - g - k) / (1 - k) * 100),
             y: R((1 - b - k) / (1 - k) * 100), k: R(k * 100) };
  }
  function cmykToRgb(c, m, y, k) {
    c /= 100; m /= 100; y /= 100; k /= 100;
    return { r: R(255 * (1 - c) * (1 - k)), g: R(255 * (1 - m) * (1 - k)), b: R(255 * (1 - y) * (1 - k)) };
  }
  function rgbToHls(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    let h = 0, s = 0;
    if (d !== 0) {
      s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return { h: R(h) % 360, l: R(l * 100), s: R(s * 100) };
  }
  function hlsToRgb(h, l, s) {
    l /= 100; s /= 100; h = ((h % 360) + 360) % 360;
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0]; else if (h < 120) [r, g, b] = [x, c, 0]; else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c]; else if (h < 300) [r, g, b] = [x, 0, c]; else [r, g, b] = [c, 0, x];
    return { r: R((r + m) * 255), g: R((g + m) * 255), b: R((b + m) * 255) };
  }
  const toHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(v, 0, 255).toString(16).padStart(2, '0')).join('');
  function fromHex(x) {
    x = x.replace('#', '');
    if (x.length === 3) x = [...x].map(c => c + c).join('');
    const n = parseInt(x, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  return { rgbToCmyk, cmykToRgb, rgbToHls, hlsToRgb, toHex, fromHex };
})();
if (typeof module !== 'undefined') module.exports = Colors;
