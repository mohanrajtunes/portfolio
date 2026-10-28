(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [].slice.call((r || document).querySelectorAll(s)); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function inr(n) { return '₹' + n.toLocaleString('en-IN'); }

  /* ---------- 1. Cursor ---------- */
  var cursor = $('#cursor'), cLabel = $('#cursor-label');
  var cx = 0, cy = 0, ctx_ = 0, cty = 0;
  if (cursor && fine) {
    window.addEventListener('pointermove', function (e) {
      ctx_ = e.clientX; cty = e.clientY;
      if (!cursor.classList.contains('on')) { cx = ctx_; cy = cty; cursor.classList.add('on'); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('on'); });
    $$('[data-cursor]').forEach(function (el) {
      el.addEventListener('pointerenter', function () { cLabel.textContent = el.getAttribute('data-cursor'); cursor.classList.add('big'); });
      el.addEventListener('pointerleave', function () { cursor.classList.remove('big'); });
    });
  }

  /* ---------- 2. Hero: my name is made of particles ---------- */
  var cv = $('#hero-cv');
  var g = cv.getContext('2d');
  var parts = [], pw = 0, ph = 0, dpr = 1;
  var mouse = { x: -9999, y: -9999 };
  var lastMove = 0;
  var heroVisible = true;

  function buildParticles() {
    var W = cv.parentElement.clientWidth;
    if (!W) return;
    var narrow = W < 640;
    var lines = ['MOHAN', 'RAJ S'];
    var face = '800 100px Syne, "Arial Black", Impact, sans-serif';
    var off = document.createElement('canvas');
    var o = off.getContext('2d');
    o.font = face;
    var widest = 0;
    lines.forEach(function (l) { widest = Math.max(widest, o.measureText(l).width); });
    var fs = 100 * W * 0.985 / widest;
    if (!narrow) fs = Math.min(fs, window.innerHeight * 0.33);
    var lh = fs * 0.98;
    var H = Math.ceil(lh * lines.length + fs * 0.12);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    pw = W; ph = H;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.height = H + 'px';
    off.width = W; off.height = H;
    o = off.getContext('2d');
    o.font = '800 ' + fs + 'px Syne, "Arial Black", Impact, sans-serif';
    o.textBaseline = 'alphabetic'; o.textAlign = 'left';
    o.fillStyle = '#000';
    lines.forEach(function (l, i) { o.fillText(l, 0, fs * 0.8 + i * lh); });
    var data = o.getImageData(0, 0, W, H).data;
    var step = narrow ? 3 : Math.max(5, Math.round(W / 230));
    var size = step * 0.74;
    parts = [];
    for (var y = 0; y < H; y += step) {
      for (var x = 0; x < W; x += step) {
        if (data[(y * W + x) * 4 + 3] > 140) {
          parts.push({
            hx: x, hy: y,
            x: reduce ? x : Math.random() * W,
            y: reduce ? y : H + 40 + Math.random() * 300,
            vx: 0, vy: 0,
            hot: Math.random() < 0.09
          });
        }
      }
    }
    parts.size = size;
  }

  function drawParticles(now) {
    var W = pw, H = ph;
    var R = fine ? 130 : 55;
    // On touch screens a soft sweep moves through the name so it never looks dead
    var sweeping = !fine && !reduce && now - lastMove > 2500;
    var mx = mouse.x, my = mouse.y;
    if (sweeping) { mx = W * (0.5 + 0.55 * Math.sin(now / 2200)); my = H * (0.5 + 0.25 * Math.sin(now / 1300)); }
    var s = parts.size;
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      p.vx += (p.hx - p.x) * 0.055;
      p.vy += (p.hy - p.y) * 0.055;
      var dx = p.x - mx, dy = p.y - my;
      var d2 = dx * dx + dy * dy;
      if (d2 < R * R && !reduce) {
        var d = Math.sqrt(d2) || 1;
        var f = (1 - d / R);
        f = f * f * 9;
        p.vx += dx / d * f;
        p.vy += dy / d * f;
      }
      p.vx *= 0.84; p.vy *= 0.84;
      p.x += p.vx; p.y += p.vy;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#0E0E0E';
    g.beginPath();
    for (var a = 0; a < parts.length; a++) { var q = parts[a]; if (!q.hot) g.rect(q.x, q.y, s, s); }
    g.fill();
    g.fillStyle = '#FF5A1F';
    g.beginPath();
    for (var b = 0; b < parts.length; b++) { var r = parts[b]; if (r.hot) g.rect(r.x, r.y, s, s); }
    g.fill();
  }

  window.addEventListener('pointermove', function (e) {
    var r = cv.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    lastMove = performance.now();
  }, { passive: true });

  function startHero() { buildParticles(); }
  if (document.fonts && document.fonts.load) {
    document.fonts.load('800 100px Syne').then(startHero, startHero);
  } else { startHero(); }
  var resizeT;
  window.addEventListener('resize', function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { startHero(); layoutWire(); }, 150);
  });

  /* ---------- 3. Terminal types out the request ---------- */
  var termBody = $('#term-body');
  var termLines = termBody.getAttribute('data-lines').split('|');
  var typed = false;

  function renderTerm(count) {
    var html = '', left = count;
    for (var i = 0; i < termLines.length && left > 0; i++) {
      var take = Math.min(left, termLines[i].length + 1);
      var text = termLines[i].slice(0, take).replace(/&/g, '&amp;').replace(/</g, '&lt;');
      var cls = i === 0 ? 't-cmd' : (i === 1 ? 't-ok' : '');
      html += '<span class="' + cls + '">' + text + '</span>' + (take > termLines[i].length ? '\n' : '');
      left -= take;
    }
    termBody.innerHTML = html + '<span class="cur"></span>';
  }
  function typeTerm() {
    if (typed) return; typed = true;
    var total = termLines.reduce(function (n, l) { return n + l.length + 1; }, 0);
    if (reduce) { renderTerm(total); return; }
    var n = 0;
    (function step() {
      n += 2; renderTerm(n);
      if (n < total) setTimeout(step, 16);
    })();
  }

  /* ---------- 4. Status-code ticker ---------- */
  var anims = [];
  $$('.ticker').forEach(function (band) {
    var track = $('.track', band), set = $('.set', track);
    var original = set.innerHTML, guard = 0;
    while (set.scrollWidth < window.innerWidth * 1.2 && guard < 6) { set.insertAdjacentHTML('beforeend', original); guard++; }
    track.appendChild(set.cloneNode(true));
    if (typeof track.animate !== 'function') return;
    var a = track.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-50%)' }], { duration: 38000, iterations: Infinity, easing: 'linear' });
    a.currentTime = 1e7;
    if (reduce) a.pause();
    anims.push(a);
  });

  /* ---------- 5. The wire: a request travels down the page ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var page = $('.page'), rail = $('#rail'), wire = $('#wire');
  var wBase = $('#w-base'), wDone = $('#w-done'), nodesG = $('#w-nodes'), packet = $('#packet');
  var stations = $$('section[data-st]');
  var nodeEls = [], nodeYs = [];
  var reqText = $('#req-text');
  var currentStation = -1;

  function layoutWire() {
    var H = page.offsetHeight;
    var W = rail.offsetWidth;
    var x = W / 2;
    var top = page.getBoundingClientRect().top + window.scrollY;
    wire.setAttribute('width', W);
    wire.setAttribute('height', H);
    wire.style.height = H + 'px';
    [wBase, wDone].forEach(function (l) { l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('y1', 0); });
    wBase.setAttribute('y2', H);
    nodesG.innerHTML = '';
    nodeEls = []; nodeYs = [];
    stations.forEach(function (sec) {
      var st = $('.st', sec);
      var r = st.getBoundingClientRect();
      var y = r.top + window.scrollY - top + r.height / 2;
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('class', 'nd'); c.setAttribute('cx', x); c.setAttribute('cy', y); c.setAttribute('r', 9);
      nodesG.appendChild(c);
      nodeEls.push(c); nodeYs.push(y);
    });
    packet.setAttribute('transform', 'translate(' + x + ',0)');
    wire._x = x; wire._top = top; wire._h = H;
  }

  function updateWire() {
    var vh = window.innerHeight;
    var y = clamp(window.scrollY + vh * 0.55 - wire._top, 0, wire._h);
    wDone.setAttribute('y2', y);
    packet.setAttribute('transform', 'translate(' + wire._x + ',' + y + ')');
    var cur = -1;
    for (var i = 0; i < nodeYs.length; i++) {
      var hit = y >= nodeYs[i] - 4;
      if (hit !== nodeEls[i].classList.contains('hit')) nodeEls[i].classList.toggle('hit', hit);
      if (hit) cur = i;
    }
    if (cur !== currentStation && cur >= 0) {
      currentStation = cur;
      reqText.textContent = stations[cur].getAttribute('data-req');
    }
  }

  /* ---------- 6. Card spotlight ---------- */
  $$('.card').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  /* ---------- 7. ShopFlow demo: two buyers, one item ---------- */
  var lock = $('#lock'), lockLbl = $('#lock-lbl'), fire = $('#fire');
  var stockEl = $('#stock'), stockBox = stockEl.parentElement;
  var aBox = $('#buyer-a'), bBox = $('#buyer-b'), aRes = $('#a-res'), bRes = $('#b-res');
  var simNote = $('#sim-note');
  var fired = false, timers = [];
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }

  function resetSim() {
    timers.forEach(clearTimeout); timers = []; fired = false;
    stockEl.textContent = '1'; stockBox.classList.remove('neg');
    aBox.className = 'buyer'; bBox.className = 'buyer';
    aRes.textContent = 'waiting'; bRes.textContent = 'waiting';
    fire.textContent = 'Both press Buy at the same moment'; fire.disabled = false;
    simNote.textContent = lock.checked
      ? 'With the lock, the second request waits for the first, then sees zero left and is told so.'
      : 'Without the lock, both requests read "1 in stock" before either one writes.';
  }
  lock.addEventListener('change', function () { lockLbl.textContent = lock.checked ? 'Row lock on' : 'Row lock off'; resetSim(); });
  fire.addEventListener('click', function () {
    if (fired) { resetSim(); return; }
    fired = true; fire.disabled = true;
    aBox.classList.add('sending'); bBox.classList.add('sending');
    aRes.textContent = 'sending...'; bRes.textContent = 'sending...';
    later(function () {
      aBox.classList.remove('sending'); aBox.classList.add('win');
      aRes.textContent = 'Order confirmed'; stockEl.textContent = '0';
      if (lock.checked) {
        bRes.textContent = 'waiting for the lock...';
      } else {
        bBox.classList.remove('sending'); bBox.classList.add('win');
        bRes.textContent = 'Order confirmed'; stockEl.textContent = '-1'; stockBox.classList.add('neg');
      }
    }, 900);
    later(function () {
      if (lock.checked) {
        bBox.classList.remove('sending'); bBox.classList.add('lose');
        bRes.textContent = 'Sorry, out of stock';
        simNote.textContent = 'One order, one item. The stock never goes below zero.';
      } else {
        simNote.textContent = 'Oversold: two orders for one item. This is the bug the row lock prevents.';
      }
      fire.textContent = 'Reset'; fire.disabled = false;
    }, 1700);
  });
  resetSim();

  /* ---------- 8. PaySplit demo ---------- */
  if ($('#splitw')) {
  var bill = $('#bill'), billOut = $('#bill-out'), pa = $('#pa'), pb = $('#pb'), paOut = $('#pa-out'), pbOut = $('#pb-out');
  var pctBox = $('#pct'), segs = $$('span', $('#bar')), sa = $('#sa'), sb = $('#sb'), sc = $('#sc'), check = $('#check');
  var mode = 'equal';

  function fmt(p) { return '₹' + (p / 100).toLocaleString('en-IN', { minimumFractionDigits: p % 100 ? 2 : 0, maximumFractionDigits: 2 }); }
  function renderSplit() {
    var total = parseInt(bill.value, 10) * 100; // paise, so there is no rounding drift
    var a, b, c, wa, wb, wc;
    if (mode === 'equal') {
      a = Math.floor(total / 3); b = a; c = total - a - b; wa = wb = wc = 100 / 3;
    } else {
      var A = parseInt(pa.value, 10);
      pb.max = 100 - A;
      if (parseInt(pb.value, 10) > 100 - A) pb.value = 100 - A;
      var B = parseInt(pb.value, 10), C = 100 - A - B;
      a = Math.round(total * A / 100); b = Math.round(total * B / 100); c = total - a - b;
      wa = A; wb = B; wc = C;
      paOut.textContent = A + '%'; pbOut.textContent = B + '%';
    }
    billOut.textContent = inr(total / 100);
    sa.textContent = fmt(a); sb.textContent = fmt(b); sc.textContent = fmt(c);
    segs[0].style.width = wa + '%'; segs[1].style.width = wb + '%'; segs[2].style.width = wc + '%';
    check.textContent = 'Shares add up to ' + inr(total / 100);
  }
  [bill, pa, pb].forEach(function (el) { el.addEventListener('input', renderSplit); });
  $$('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      mode = tab.getAttribute('data-mode');
      $$('.tab').forEach(function (t) { var on = t === tab; t.classList.toggle('on', on); t.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      pctBox.hidden = mode !== 'percent';
      renderSplit();
    });
  });
  renderSplit();

  }

  /* ---------- 9. The stack as a database table ---------- */
  var tbody = $('#tbody'), rowsEl = $('#rows'), sqlEl = $('#sql'), emptyEl = $('#empty'), q = $('#q');
  var rows = $$('tr', tbody).map(function (tr) {
    return { el: tr, id: parseInt(tr.cells[0].textContent, 10), name: tr.cells[1].textContent, layer: tr.getAttribute('data-layer') };
  });
  var state = { layer: 'all', q: '', key: 'id', dir: 'asc' };

  function renderTable(flash) {
    var needle = state.q.trim().toLowerCase();
    var list = rows.filter(function (r) {
      return (state.layer === 'all' || r.layer === state.layer) && (!needle || r.name.toLowerCase().indexOf(needle) !== -1);
    });
    list.sort(function (a, b) {
      var x = a[state.key], y = b[state.key];
      var c = typeof x === 'number' ? x - y : String(x).localeCompare(String(y));
      return state.dir === 'asc' ? c : -c;
    });
    rows.forEach(function (r) { r.el.hidden = true; });
    list.forEach(function (r) {
      r.el.hidden = false;
      tbody.appendChild(r.el);
      if (flash) { r.el.classList.remove('flash'); void r.el.offsetWidth; r.el.classList.add('flash'); }
    });
    var where = [];
    if (state.layer !== 'all') where.push("layer = '" + state.layer + "'");
    if (needle) where.push("name LIKE '%" + needle.replace(/'/g, '') + "%'");
    sqlEl.textContent = 'SELECT * FROM stack' + (where.length ? ' WHERE ' + where.join(' AND ') : '') + (state.key !== 'id' || state.dir !== 'asc' ? ' ORDER BY ' + state.key + ' ' + state.dir.toUpperCase() : '') + ';';
    rowsEl.textContent = list.length + (list.length === 1 ? ' row' : ' rows');
    emptyEl.hidden = list.length !== 0;
  }

  $$('.fchip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.layer = chip.getAttribute('data-layer');
      $$('.fchip').forEach(function (c) { var on = c === chip; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      renderTable(!reduce);
    });
  });
  q.addEventListener('input', function () { state.q = q.value; renderTable(false); });
  $$('.tbl th button').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-sort');
      state.dir = state.key === key && state.dir === 'asc' ? 'desc' : 'asc';
      state.key = key;
      $$('.tbl th button').forEach(function (b) { b.removeAttribute('data-dir'); });
      btn.setAttribute('data-dir', state.dir);
      renderTable(!reduce);
    });
  });
  renderTable(false);

  /* ---------- 10. Reveals ---------- */
  $$('.jl').forEach(function (l, i) { l.style.setProperty('--i', i); });
  var targets = $$('.statement, .card, .query-bar, .table-wrap, .headers, .mail').concat([$('#jwt')]);
  targets.forEach(function (el) { if (el.id !== 'jwt') el.classList.add('rv'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.12 });
    targets.forEach(function (el) { io.observe(el); });
    var termIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { typeTerm(); termIO.disconnect(); }
    }, { threshold: 0.3 });
    termIO.observe($('#term'));
    var heroIO = new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; }, { threshold: 0 });
    heroIO.observe($('.hero'));
  } else {
    targets.forEach(function (el) { el.classList.add('in'); });
    typeTerm();
  }

  /* ---------- 11. Copy email ---------- */
  var toast = $('#toast');
  function showToast(msg) {
    toast.textContent = msg; toast.classList.add('on');
    setTimeout(function () { toast.classList.remove('on'); }, 1800);
  }
  function copyEmail() {
    var email = 'mohanrajtunes@gmail.com';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(email).then(function () { showToast('Email copied'); }, function () { showToast('Copy failed, select it by hand'); });
    } else { showToast('Copy failed, select it by hand'); }
  }
  $('#copy').addEventListener('click', copyEmail);

  /* ---------- 12. Command palette (Ctrl K) ---------- */
  var pal = $('#pal'), palIn = $('#pal-in'), palList = $('#pal-list');
  var actions = [
    { label: 'Client', hint: 'Top', run: function () { go('#top'); } },
    { label: 'Auth: who is asking', hint: 'About', run: function () { go('#about'); } },
    { label: 'API: the work', hint: 'Projects', run: function () { go('#work'); } },
    { label: 'Database: the stack', hint: 'Skills', run: function () { go('#stack'); } },
    { label: 'Response: say hello', hint: 'Contact', run: function () { go('#contact'); } },
    { label: 'Open ShopFlow live', hint: 'New tab', run: function () { window.open('https://shopflow-frontend-alpha.vercel.app', '_blank', 'noopener'); } },
    { label: 'Open GitHub profile', hint: 'New tab', run: function () { window.open('https://github.com/mohanrajtunes', '_blank', 'noopener'); } },
    { label: 'Copy email address', hint: 'Clipboard', run: copyEmail }
  ];
  var shown = [], sel = 0, lastFocus = null;

  function go(hash) { var el = $(hash); if (el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }
  function renderPal() {
    var needle = palIn.value.trim().toLowerCase();
    shown = actions.filter(function (a) { return !needle || (a.label + ' ' + a.hint).toLowerCase().indexOf(needle) !== -1; });
    sel = clamp(sel, 0, Math.max(0, shown.length - 1));
    palList.innerHTML = '';
    shown.forEach(function (a, i) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.className = i === sel ? 'sel' : '';
      li.innerHTML = '<div></div><span></span>';
      li.firstChild.textContent = a.label; li.lastChild.textContent = a.hint;
      li.addEventListener('click', function () { choose(i); });
      li.addEventListener('pointermove', function () { if (sel !== i) { sel = i; renderPal(); } });
      palList.appendChild(li);
    });
  }
  function openPal() { lastFocus = document.activeElement; pal.hidden = false; palIn.value = ''; sel = 0; renderPal(); palIn.focus(); }
  function closePal() { pal.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  function choose(i) { var a = shown[i]; if (!a) return; closePal(); setTimeout(a.run, 60); }

  $('#kbtn').addEventListener('click', openPal);
  pal.addEventListener('click', function (e) { if (e.target === pal) closePal(); });
  palIn.addEventListener('input', function () { sel = 0; renderPal(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); return; }
    if (pal.hidden) return;
    if (e.key === 'Escape') { closePal(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % shown.length; renderPal(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % shown.length; renderPal(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Tab') { e.preventDefault(); palIn.focus(); }
  });

  /* ---------- 13. One loop for everything tied to scroll or pointer ---------- */
  var lastY = window.scrollY, velocity = 0, rate = 1;
  layoutWire();
  window.addEventListener('load', layoutWire);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutWire);
  if ('ResizeObserver' in window) new ResizeObserver(function () { if (Math.abs(page.offsetHeight - (wire._h || 0)) > 2) layoutWire(); }).observe(page);

  function frame(now) {
    updateWire();

    if (heroVisible && parts.length) drawParticles(now);

    var y = window.scrollY, dy = y - lastY; lastY = y;
    velocity += (dy - velocity) * 0.12;
    var goal = velocity >= 0 ? 1 + velocity * 0.15 : -(1 + Math.abs(velocity) * 0.15);
    rate += (clamp(goal, -8, 8) - rate) * 0.08;
    if (!reduce) for (var i = 0; i < anims.length; i++) anims[i].playbackRate = rate;

    if (cursor && fine) {
      cx += (ctx_ - cx) * 0.25; cy += (cty - cy) * 0.25;
      cursor.style.transform = 'translate3d(' + cx + 'px,' + cy + 'px,0)';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
