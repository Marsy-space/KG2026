// Тесты перевода цветов. Запуск: `node tests.js` или открыть tests.html в браузере.
const C = (typeof require !== 'undefined') ? require('./colors.js') : Colors;
const results = [];
function test(name, fn) {
  try { fn(); results.push({ name, ok: true }); }
  catch (e) { results.push({ name, ok: false, msg: e.message }); }
}
const same = (a, b, what = '') => {
  if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${what} ожидалось ${JSON.stringify(b)}, получено ${JSON.stringify(a)}`);
};
const maxDiff = (a, b) => Math.max(...Object.keys(a).map(k => Math.abs(a[k] - b[k])));

// 1. Эталонные цвета: RGB -> CMYK и RGB -> HLS
const REF = [
  ['красный',    [255,0,0],     {c:0,m:100,y:100,k:0}, {h:0,l:50,s:100}],
  ['зелёный',    [0,255,0],     {c:100,m:0,y:100,k:0}, {h:120,l:50,s:100}],
  ['синий',      [0,0,255],     {c:100,m:100,y:0,k:0}, {h:240,l:50,s:100}],
  ['жёлтый',     [255,255,0],   {c:0,m:0,y:100,k:0},   {h:60,l:50,s:100}],
  ['голубой',    [0,255,255],   {c:100,m:0,y:0,k:0},   {h:180,l:50,s:100}],
  ['пурпурный',  [255,0,255],   {c:0,m:100,y:0,k:0},   {h:300,l:50,s:100}],
  ['белый',      [255,255,255], {c:0,m:0,y:0,k:0},     {h:0,l:100,s:0}],
  ['чёрный',     [0,0,0],       {c:0,m:0,y:0,k:100},   {h:0,l:0,s:0}],
  ['серый',      [128,128,128], {c:0,m:0,y:0,k:50},    {h:0,l:50,s:0}],
  ['оранжевый',  [255,122,69],  {c:0,m:52,y:73,k:0},   {h:17,l:64,s:100}],
];
for (const [name, [r,g,b], cmyk, hls] of REF) {
  test(`RGB -> CMYK: ${name}`, () => same(C.rgbToCmyk(r,g,b), cmyk));
  test(`RGB -> HLS: ${name}`,  () => same(C.rgbToHls(r,g,b), hls));
}

// 2. Обратные переводы эталонов
test('CMYK -> RGB: основные цвета', () => {
  same(C.cmykToRgb(0,100,100,0), {r:255,g:0,b:0}, 'красный');
  same(C.cmykToRgb(100,0,0,0),   {r:0,g:255,b:255}, 'голубой');
  same(C.cmykToRgb(0,0,0,100),   {r:0,g:0,b:0}, 'чёрный');
  same(C.cmykToRgb(0,0,0,0),     {r:255,g:255,b:255}, 'белый');
});
test('HLS -> RGB: основные цвета', () => {
  same(C.hlsToRgb(0,50,100),   {r:255,g:0,b:0}, 'красный');
  same(C.hlsToRgb(120,50,100), {r:0,g:255,b:0}, 'зелёный');
  same(C.hlsToRgb(240,50,100), {r:0,g:0,b:255}, 'синий');
  same(C.hlsToRgb(60,50,100),  {r:255,g:255,b:0}, 'жёлтый');
});

// 3. Граничные случаи
test('HLS: L=100 всегда белый, L=0 всегда чёрный', () => {
  for (const h of [0, 90, 200, 359]) for (const s of [0, 50, 100]) {
    same(C.hlsToRgb(h,100,s), {r:255,g:255,b:255}, `h=${h} s=${s}`);
    same(C.hlsToRgb(h,0,s),   {r:0,g:0,b:0}, `h=${h} s=${s}`);
  }
});
test('HLS: S=0 даёт серый (R=G=B) при любом H', () => {
  for (const h of [0, 120, 300]) { const c = C.hlsToRgb(h,40,0); same([c.r===c.g, c.g===c.b], [true,true]); }
});
test('HLS: H=360 совпадает с H=0', () => same(C.hlsToRgb(360,50,100), C.hlsToRgb(0,50,100)));
test('CMYK: K=100 даёт чёрный при любых C, M, Y', () => same(C.cmykToRgb(70,20,90,100), {r:0,g:0,b:0}));
test('Серые цвета: насыщенность HLS равна 0', () => {
  for (let v = 0; v <= 255; v += 5) same(C.rgbToHls(v,v,v).s, 0, `v=${v}`);
});

// 4. HEX
test('HEX: RGB -> HEX', () => { same(C.toHex(255,122,69), '#ff7a45'); same(C.toHex(0,0,0), '#000000'); });
test('HEX: HEX -> RGB, 6 цифр, 3 цифры и без #', () => {
  same(C.fromHex('#ff7a45'), {r:255,g:122,b:69});
  same(C.fromHex('#f00'),    {r:255,g:0,b:0});
  same(C.fromHex('00ff00'),  {r:0,g:255,b:0});
});

// 5. Круговые переводы: RGB -> модель -> RGB.
// Проценты и градусы целые, поэтому допускается небольшая погрешность округления.
const TOL = { hls: 3, cmyk: 3 };
const grid = [];
for (let r = 0; r <= 255; r += 17) for (let g = 0; g <= 255; g += 17) for (let b = 0; b <= 255; b += 17) grid.push({r,g,b});
test(`Круговой перевод RGB -> HLS -> RGB (${grid.length} цветов, допуск ${TOL.hls})`, () => {
  let worst = 0;
  for (const c of grid) { const h = C.rgbToHls(c.r,c.g,c.b); worst = Math.max(worst, maxDiff(c, C.hlsToRgb(h.h,h.l,h.s))); }
  if (worst > TOL.hls) throw new Error(`максимальное отклонение ${worst}`);
});
test(`Круговой перевод RGB -> CMYK -> RGB (${grid.length} цветов, допуск ${TOL.cmyk})`, () => {
  let worst = 0;
  for (const c of grid) { const k = C.rgbToCmyk(c.r,c.g,c.b); worst = Math.max(worst, maxDiff(c, C.cmykToRgb(k.c,k.m,k.y,k.k))); }
  if (worst > TOL.cmyk) throw new Error(`максимальное отклонение ${worst}`);
});

// 6. Согласованность моделей: CMYK -> RGB -> HLS совпадает с эталоном
test('Согласованность: CMYK(0,52,73,0) даёт оранжевый и в HLS', () => {
  const rgb = C.cmykToRgb(0,52,73,0), hls = C.rgbToHls(rgb.r,rgb.g,rgb.b);
  if (Math.abs(hls.h - 17) > 1 || Math.abs(hls.l - 64) > 1 || Math.abs(hls.s - 100) > 1) throw new Error(JSON.stringify(hls));
});

// 7. Диапазоны выходных значений
test('Результаты всегда в допустимых диапазонах', () => {
  for (const c of grid) {
    const k = C.rgbToCmyk(c.r,c.g,c.b), h = C.rgbToHls(c.r,c.g,c.b);
    for (const v of Object.values(k)) if (v < 0 || v > 100) throw new Error('CMYK ' + JSON.stringify(k));
    if (h.h < 0 || h.h > 359 || h.l < 0 || h.l > 100 || h.s < 0 || h.s > 100) throw new Error('HLS ' + JSON.stringify(h));
  }
});

// ---- вывод ----
const failed = results.filter(r => !r.ok).length;
if (typeof document !== 'undefined') {
  const ul = document.getElementById('out');
  document.getElementById('summary').textContent = `Пройдено ${results.length - failed} из ${results.length}`;
  document.getElementById('summary').className = failed ? 'bad' : 'good';
  results.forEach(r => { const li = document.createElement('li'); li.className = r.ok ? 'good' : 'bad';
    li.textContent = (r.ok ? 'OK   ' : 'FAIL ') + r.name + (r.ok ? '' : ' - ' + r.msg); ul.appendChild(li); });
} else {
  results.forEach(r => console.log((r.ok ? 'OK   ' : 'FAIL ') + r.name + (r.ok ? '' : ' - ' + r.msg)));
  console.log(`\nПройдено ${results.length - failed} из ${results.length}`);
  process.exit(failed ? 1 : 0);
}
