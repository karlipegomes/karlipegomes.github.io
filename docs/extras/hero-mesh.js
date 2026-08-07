/*
 * Malha hexagonal da home — a assinatura visual do blog.
 *
 * O hexágono vem do logo. Cada célula acesa é um post e cada caminho é uma
 * série, então o desenho carrega a mesma estrutura que a página lista abaixo.
 *
 * As cores saem dos tokens CSS (--k-ac-lit, --k-seq, --k-tx), nunca fixas
 * aqui: assim a malha acompanha a troca de tema claro/escuro sozinha.
 */

(function () {
  var R = 30, DX = R * 1.5, DY = R * Math.sqrt(3);

  function setup(canvas) {
    var ctx = canvas.getContext("2d");
    var host = canvas.parentElement;
    var cells = [], t = 0, narrow = false, tokens = {};
    var mouse = { x: -9999, y: -9999 };
    var still = matchMedia("(prefers-reduced-motion: reduce)").matches;

    function readTokens() {
      var cs = getComputedStyle(canvas);
      ["--k-ac-lit", "--k-seq", "--k-tx"].forEach(function (key) {
        var hex = cs.getPropertyValue(key).trim().replace("#", "");
        if (hex.length === 6) {
          tokens[key] = [
            parseInt(hex.substr(0, 2), 16),
            parseInt(hex.substr(2, 2), 16),
            parseInt(hex.substr(4, 2), 16)
          ];
        }
      });
    }

    function rgba(key, alpha) {
      var c = tokens[key] || [128, 128, 128];
      return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + alpha + ")";
    }

    // vizinhanca de hexagono flat-top em offset odd-q
    function stepTo(c, r, dir) {
      var odd = Math.abs(c % 2) === 1;
      if (dir === "SE") return odd ? [c + 1, r + 1] : [c + 1, r];
      return odd ? [c + 1, r] : [c + 1, r - 1];        // NE
    }

    function build(w, h) {
      cells = [];
      narrow = w < 760;
      var index = {};
      for (var c = -1; c * DX < w + R; c++) {
        for (var r = -1; r * DY < h + R; r++) {
          var cell = {
            x: c * DX,
            y: r * DY + (Math.abs(c % 2) ? DY / 2 : 0)
          };
          // a malha recua atras do texto e adensa a direita
          cell.a = Math.min(1, Math.max(0,
            (cell.x / w - (narrow ? 0.52 : 0.30)) / 0.42)) * (narrow ? 0.45 : 1);
          cells.push(cell);
          index[c + "," + r] = cell;
        }
      }
      [{ c: 0.60, r: 0.20, len: 5, seq: ["SE", "NE", "SE", "NE"] },
       { c: 0.72, r: 0.62, len: 4, seq: ["NE", "SE", "NE"] }]
        .forEach(function (path, k) {
          var c = Math.round(w / DX * path.c);
          var r = Math.round(h / DY * path.r);
          for (var n = 0; n < path.len; n++) {
            var cell = index[c + "," + r];
            if (!cell) break;
            cell.serie = k;
            cell.step = n;
            var next = stepTo(c, r, path.seq[n % path.seq.length]);
            c = next[0]; r = next[1];
          }
        });
    }

    function hexPath(x, y) {
      ctx.beginPath();
      for (var i = 0; i < 6; i++) {
        var ang = Math.PI / 180 * (60 * i);
        var px = x + R * Math.cos(ang), py = y + R * Math.sin(ang);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.closePath();
    }

    function render(w, h) {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;

      cells.forEach(function (n) {
        if (n.a <= 0.01 || n.serie !== undefined) return;
        var near = Math.hypot(n.x - mouse.x, n.y - mouse.y) < 90;
        hexPath(n.x, n.y);
        ctx.strokeStyle = rgba("--k-tx", n.a * (near ? 0.30 : 0.12));
        ctx.stroke();
      });

      var lit = cells.filter(function (n) { return n.serie !== undefined; });
      var dim = narrow ? 0.4 : 1;

      lit.forEach(function (n) {
        var next = lit.find(function (m) {
          return m.serie === n.serie && m.step === n.step + 1;
        });
        if (!next) return;
        var ph = (Math.sin(t / 30 - n.step * 0.9) + 1) / 2;
        ctx.strokeStyle = rgba("--k-seq", (0.25 + ph * 0.5) * dim);
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(next.x, next.y);
        ctx.stroke();
        ctx.lineWidth = 1;
      });

      lit.forEach(function (n) {
        var ph = (Math.sin(t / 30 - n.step * 0.9) + 1) / 2;
        hexPath(n.x, n.y);
        ctx.fillStyle = rgba("--k-ac-lit", (0.05 + ph * 0.13) * dim);
        ctx.fill();
        ctx.strokeStyle = rgba("--k-ac-lit", (0.45 + ph * 0.4) * dim);
        ctx.stroke();
        ctx.fillStyle = rgba("--k-tx", (0.55 + ph * 0.4) * dim);
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2, 0, 6.284);
        ctx.fill();
      });
    }

    function draw() {
      if (!host.offsetWidth) return;
      var dpr = Math.min(devicePixelRatio || 1, 2);
      var w = host.offsetWidth, h = host.offsetHeight;
      var key = w + "x" + h;
      if (canvas.dataset.size !== key) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        build(w, h);
        canvas.dataset.size = key;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      render(w, h);
    }

    host.addEventListener("mousemove", function (ev) {
      var rect = host.getBoundingClientRect();
      mouse.x = ev.clientX - rect.left;
      mouse.y = ev.clientY - rect.top;
    });
    host.addEventListener("mouseleave", function () {
      mouse.x = mouse.y = -9999;
    });
    addEventListener("resize", function () {
      canvas.dataset.size = "";
      draw();
    });
    // a troca de tema muda os tokens: relê e redesenha
    new MutationObserver(function () {
      readTokens();
      draw();
    }).observe(document.body, {
      attributes: true,
      attributeFilter: ["data-md-color-scheme"]
    });

    readTokens();
    draw();
    if (!still) {
      (function loop() {
        t++;
        render(host.offsetWidth, host.offsetHeight);
        requestAnimationFrame(loop);
      })();
    }
  }

  document$.subscribe(function () {
    var canvas = document.querySelector("[data-k-mesh]");
    if (canvas && !canvas.dataset.ready) {
      canvas.dataset.ready = "1";
      setup(canvas);
    }
  });
})();
