(function () {
  'use strict';

  var pre, cols = 0, rows = 0, charW = 0, charH = 0, time = 0, staticGrid = [];

  var p = [];
  (function () {
    var perm = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,
      140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,
      75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,
      56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,
      77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,
      245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,
      89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,
      3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,
      207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,
      152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,
      19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,
      34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,
      239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,
      45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,
      195,78,66,215,61,156,180];
    for (var i = 0; i < 512; i++) p[i] = perm[i & 255];
  })();

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + t * (b - a); }
  function grad(hash, x, y) {
    var h = hash & 3;
    var u = h < 2 ? x : y;
    var v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  function noise(x, y) {
    var xi = Math.floor(x) & 255, yi = Math.floor(y) & 255;
    var xf = x - Math.floor(x), yf = y - Math.floor(y);
    var u = fade(xf), v = fade(yf);
    var aa = p[p[xi] + yi], ab = p[p[xi] + yi + 1];
    var ba = p[p[xi + 1] + yi], bb = p[p[xi + 1] + yi + 1];
    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  }

  function resize() {
    if (charW === 0) return;
    cols = Math.ceil(window.innerWidth / charW) + 1;
    rows = Math.ceil(window.innerHeight / charH) + 1;
  }

  function buildGrid() {
    staticGrid = [];
    for (var r = 0; r < rows; r++) {
      var row = '';
      for (var c = 0; c < cols; c++) row += Math.random() < 0.5 ? '0' : '1';
      staticGrid.push(row);
    }
  }

  function render() {
    if (cols === 0 || rows === 0) resize();
    if (staticGrid.length !== rows || (staticGrid[0] && staticGrid[0].length !== cols)) buildGrid();
    time += 0.0045;
    var lines = [];
    for (var r = 0; r < rows; r++) {
      var row = '', ny = r / rows;
      for (var c = 0; c < cols; c++) {
        var nx = c * 0.02;
        var n = noise(nx + time * 0.5, r * 0.025 + time * 0.3)
          + 0.5 * noise(nx * 2 + time * 0.3, r * 0.05 + time * 0.2)
          + 0.25 * noise(nx * 4 + time * 0.7, r * 0.1 + time * 0.4)
          + Math.sin(c * 0.03 + time * 1.2) * 0.3;
        row += n > -0.2 + (1 - ny) * 1.8 ? staticGrid[r][c] : ' ';
      }
      lines.push(row);
    }
    pre.textContent = lines.join('\n');
  }

  function start() {
    var container = document.createElement('div');
    container.className = 'binary-bg';
    pre = document.createElement('pre');
    container.appendChild(pre);
    document.body.appendChild(container);

    var measure = document.createElement('span');
    measure.style.cssText = 'position:absolute;visibility:hidden;font:inherit;white-space:pre';
    measure.textContent = '0';
    pre.appendChild(measure);

    requestAnimationFrame(function () {
      charW = measure.offsetWidth || 8.4;
      charH = measure.offsetHeight || 16.8;
      cols = Math.ceil(window.innerWidth / charW) + 1;
      rows = Math.ceil(window.innerHeight / charH) + 1;
      measure.remove();
      setInterval(render, 33);
    });
  }

  window.addEventListener('resize', resize);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
