(function () {
  'use strict';
  window.__msReady = true;

  /* ============ Settings ============ */
  // PingBoard public status page that watches ShopFlow and PingBoard.
  var STATUS_SLUG = 'mohanraj';
  var STATUS_URL = 'https://pingboard-backend.onrender.com/api/public/status/' + STATUS_SLUG + '/';
  var EMAIL = 'mohanrajtunes@gmail.com';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap || reduce) root.classList.remove('motion');

  /* ============ Toast + copy email ============ */
  var toast = $('#toast'), toastT;
  function say(msg) {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { toast.classList.remove('show'); }, 2200);
  }
  function copyEmail() {
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(EMAIL).then(function () { say('Email copied'); }, function () { say(EMAIL); });
    else say(EMAIL);
  }
  $('#copy').addEventListener('click', copyEmail);

  /* ============ Theme: system default, remembered choice, circular wipe ============ */
  var modeBtn = $('#mode'), metaTheme = $('meta[name="theme-color"]');
  function stored() { try { return localStorage.getItem('ms-theme'); } catch (e) { return null; } }
  function paintTheme(t) {
    root.dataset.theme = t;
    modeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    if (metaTheme) metaTheme.setAttribute('content', t === 'dark' ? '#0B0B0C' : '#F4F1EA');
  }
  paintTheme(root.dataset.theme || 'dark');
  function setTheme(t, fromEl) {
    try { localStorage.setItem('ms-theme', t); } catch (e) {}
    if (!document.startViewTransition || reduce) { paintTheme(t); return; }
    var r = (fromEl || modeBtn).getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var end = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    var vt = document.startViewTransition(function () { paintTheme(t); });
    vt.ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + end + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 520, easing: 'cubic-bezier(.77,0,.175,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
  }
  function toggleTheme() { setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'); }
  modeBtn.addEventListener('click', toggleTheme);
  var sysLight = window.matchMedia('(prefers-color-scheme: light)');
  var onSys = function (e) { if (!stored()) paintTheme(e.matches ? 'light' : 'dark'); };
  if (sysLight.addEventListener) sysLight.addEventListener('change', onSys);

  /* ============ Local time ============ */
  var timeEl = $('#localtime');
  function tickTime() {
    try { timeEl.textContent = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST'; }
    catch (e) { timeEl.textContent = 'IST'; }
  }
  tickTime(); setInterval(tickTime, 30000);

  /* ============ Fit the big name to the width exactly ============ */
  function fit(el) {
    if (!el) return;
    el.style.fontSize = '';
    var box = el.parentElement.clientWidth - parseFloat(getComputedStyle(el.parentElement).paddingLeft) - parseFloat(getComputedStyle(el.parentElement).paddingRight);
    var w = el.scrollWidth, size = parseFloat(getComputedStyle(el).fontSize);
    if (w > 0 && box > 0) el.style.fontSize = Math.min(size * (box * .995) / w, 380) + 'px';
  }
  function fitAll() { fit($('.name')); fit($('.foot-name')); }
  fitAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitAll);
  var fitT; window.addEventListener('resize', function () { clearTimeout(fitT); fitT = setTimeout(fitAll, 120); });

  /* ============ Live status from PingBoard ============ */
  var statusRows = $$('#status-list li'), statusFoot = $('#status-foot');
  function rowFor(name) {
    var n = name.toLowerCase();
    return statusRows.filter(function (li) {
      var key = li.dataset.name.toLowerCase();
      return n.indexOf(key) !== -1 || n.indexOf(key.replace('board', '')) !== -1;
    })[0];
  }
  function setRow(li, state, uptime) {
    li.classList.remove('is-up', 'is-down');
    if (state === 'up') li.classList.add('is-up');
    if (state === 'down') li.classList.add('is-down');
    $('.s-state', li).textContent = state === 'up' ? 'Up' : state === 'down' ? 'Down' : state === 'live' ? 'Live' : 'Pending';
    $('.s-up', li).textContent = uptime == null ? '—' : (uptime >= 99.995 ? '100' : uptime.toFixed(2)) + '%';
    li.setAttribute('aria-label', li.dataset.name + ': ' + $('.s-state', li).textContent + (uptime == null ? '' : ', ' + $('.s-up', li).textContent + ' uptime in the last 24 hours'));
  }
  function stamp() { try { return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }); } catch (e) { return ''; } }
  var firstLoad = true, wakeT;
  function loadStatus() {
    var ctrl = window.AbortController ? new AbortController() : null;
    var killT = setTimeout(function () { if (ctrl) ctrl.abort(); }, 70000);
    if (firstLoad) wakeT = setTimeout(function () { statusFoot.textContent = 'Waking the free server. This can take up to a minute.'; }, 4000);
    fetch(STATUS_URL, { signal: ctrl ? ctrl.signal : undefined, headers: { Accept: 'application/json' } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        var seen = 0;
        (data.monitors || []).forEach(function (m) {
          var li = rowFor(m.name || '');
          if (li) { setRow(li, m.status, typeof m.uptime_24h === 'number' ? m.uptime_24h : null); seen++; }
        });
        if (!seen) throw new Error('no monitors');
        statusFoot.textContent = 'Uptime over the last 24 hours · updated ' + stamp() + ' IST';
      })
      .catch(function () {
        if (firstLoad) statusRows.forEach(function (li) { setRow(li, 'live', null); });
        statusFoot.textContent = 'The monitor did not answer just now. Both apps are deployed; open them below.';
      })
      .then(function () { clearTimeout(killT); clearTimeout(wakeT); firstLoad = false; });
  }
  loadStatus();
  setInterval(function () { if (!document.hidden) loadStatus(); }, 120000);

  /* ============ Resume: hide the buttons until resume.pdf exists ============ */
  if (location.protocol.indexOf('http') === 0) {
    fetch('resume.pdf', { method: 'HEAD' }).then(function (r) {
      if (!r.ok) $$('.resume-link').forEach(function (a) { a.classList.add('missing'); });
    }).catch(function () {});
  }

  /* ============ Nav: active section ============ */
  var navLinks = $$('.nav-links a');
  function markNav() {
    var y = window.scrollY + innerHeight * .4, cur = '';
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s && s.getBoundingClientRect().top + window.scrollY <= y) cur = a.getAttribute('href'); });
    navLinks.forEach(function (a) { a.classList.toggle('act', a.getAttribute('href') === cur); });
  }
  window.addEventListener('scroll', markNav, { passive: true }); markNav();

  /* ============ ShopFlow demo: two buyers, one item ============ */
  var lock = $('#lock'), lockLbl = $('#lock-lbl'), fire = $('#fire');
  var stockEl = $('#stock'), stockBox = stockEl.parentElement;
  var aBox = $('#buyer-a'), bBox = $('#buyer-b'), aRes = $('#a-res'), bRes = $('#b-res'), simNote = $('#sim-note');
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
    aRes.textContent = 'sending…'; bRes.textContent = 'sending…';
    later(function () {
      aBox.classList.remove('sending'); aBox.classList.add('win');
      aRes.textContent = 'Order confirmed'; stockEl.textContent = '0';
      if (lock.checked) bRes.textContent = 'waiting for the lock…';
      else {
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

  /* ============ PingBoard demo: two failures open an incident ============ */
  var siteUp = $('#site-up'), siteLbl = $('#site-lbl'), tick = $('#tick');
  var beats = $('#beats'), monPill = $('#mon-pill'), monLog = $('#mon-log'), monNote = $('#mon-note');
  var MAX_BEATS = 18, minute = 0, fails = 0, incident = false, openedAt = 0;
  function clock(m) { var t = 9 * 60 + 41 + m; return String(Math.floor(t / 60) % 24).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  function logLine(text, kind) {
    var li = document.createElement('li'); li.className = kind || '';
    var b = document.createElement('b'); b.textContent = clock(minute);
    li.appendChild(b); li.appendChild(document.createTextNode(text));
    monLog.insertBefore(li, monLog.firstChild);
    while (monLog.children.length > 4) monLog.removeChild(monLog.lastChild);
  }
  function addBeat(ok) {
    var s = document.createElement('span'); s.className = ok ? 'ok' : 'bad';
    beats.appendChild(s);
    while (beats.children.length > MAX_BEATS) beats.removeChild(beats.firstChild);
  }
  function setPill(st) { monPill.className = 'pill ' + st; monPill.textContent = st === 'up' ? 'Up' : st === 'warn' ? 'Failing' : 'Down'; }
  tick.addEventListener('click', function () {
    minute += 1;
    var ok = siteUp.checked;
    addBeat(ok);
    if (ok) {
      if (incident) {
        incident = false;
        logLine('Check passed. Incident resolved after ' + (minute - openedAt) + ' min.', 'good');
        logLine('Email sent: [UP] example.com is back online', 'sent');
        monNote.textContent = 'Recovered. The incident closes and the owner gets a recovery email.';
      } else {
        logLine('Check passed. 200 OK.', '');
        monNote.textContent = fails ? 'One failure, then a pass. No incident, no email: it was only a blip.' : 'All good. Switch the site off and run a few checks.';
      }
      fails = 0; setPill('up');
    } else {
      fails += 1;
      if (incident) {
        logLine('Check failed again. Incident still open.', 'bad');
        monNote.textContent = 'Still down. No extra emails: one alert per incident.';
      } else if (fails === 1) {
        logLine('Check failed (1 of 2). No alert yet.', 'bad'); setPill('warn');
        monNote.textContent = 'One failure could be a network blip, so PingBoard waits for a second one.';
      } else {
        incident = true; openedAt = minute;
        logLine('Check failed (2 of 2). Incident opened.', 'bad');
        logLine('Email sent: [DOWN] example.com is not responding', 'sent');
        setPill('down');
        monNote.textContent = 'Two failures in a row. The incident opens and the owner is emailed once.';
      }
    }
  });
  siteUp.addEventListener('change', function () { siteLbl.textContent = siteUp.checked ? 'Site up' : 'Site down'; });
  for (var bi = 0; bi < MAX_BEATS - 4; bi++) addBeat(true);
  logLine('Monitoring started. Checks every minute.', '');
  monNote.textContent = 'Switch the site off, then run checks one at a time.';

  /* ============ Command palette (Ctrl K) ============ */
  var pal = $('#pal'), palIn = $('#pal-in'), palList = $('#pal-list'), lastFocus = null, sel = 0, shown = [];
  var lenis = null;
  function go(hash) {
    var el = $(hash); if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: hash === '#top' ? 0 : -20 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }
  function open(url) { window.open(url, '_blank', 'noopener'); }
  var actions = [
    { label: 'Work', hint: 'Projects', run: function () { go('#work'); } },
    { label: 'Stack', hint: 'Skills', run: function () { go('#stack'); } },
    { label: 'About', hint: 'Me', run: function () { go('#about'); } },
    { label: 'Contact', hint: 'Email', run: function () { go('#contact'); } },
    { label: 'Open ShopFlow', hint: 'Live app', run: function () { open('https://shopflow-frontend-alpha.vercel.app'); } },
    { label: 'Open PingBoard', hint: 'Live app', run: function () { open('https://pingboard-frontend.vercel.app'); } },
    { label: 'GitHub profile', hint: 'New tab', run: function () { open('https://github.com/mohanrajtunes'); } },
    { label: 'Copy email address', hint: 'Clipboard', run: copyEmail },
    { label: 'Switch light or dark mode', hint: 'Theme', run: toggleTheme }
  ];
  if (!$('.resume-link.missing')) actions.splice(8, 0, { label: 'Download resume', hint: 'PDF', run: function () { var a = $('.resume-link'); if (a && !a.classList.contains('missing')) a.click(); } });
  function renderPal() {
    var q = palIn.value.trim().toLowerCase();
    shown = actions.filter(function (a) { return !q || (a.label + ' ' + a.hint).toLowerCase().indexOf(q) !== -1; });
    if (sel >= shown.length) sel = 0;
    palList.innerHTML = '';
    shown.forEach(function (a, i) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option'); li.setAttribute('aria-selected', i === sel ? 'true' : 'false');
      li.textContent = a.label;
      var h = document.createElement('span'); h.textContent = a.hint; li.appendChild(h);
      li.addEventListener('click', function () { closePal(); a.run(); });
      li.addEventListener('pointermove', function () { if (sel !== i) { sel = i; renderPal(); } });
      palList.appendChild(li);
    });
  }
  function openPal() { lastFocus = document.activeElement; pal.hidden = false; palIn.value = ''; sel = 0; renderPal(); palIn.focus(); if (lenis) lenis.stop(); }
  function closePal() { pal.hidden = true; if (lenis) lenis.start(); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $('#kbtn').addEventListener('click', openPal);
  palIn.addEventListener('input', function () { sel = 0; renderPal(); });
  pal.addEventListener('click', function (e) { if (e.target === pal) closePal(); });
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.hidden ? openPal() : closePal(); return; }
    if (pal.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); closePal(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(shown.length, 1); renderPal(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(shown.length, 1); renderPal(); }
    else if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); var a = shown[sel]; closePal(); a.run(); }
    else if (e.key === 'Tab') { e.preventDefault(); palIn.focus(); }
  });

  /* ============ Phones: open a demo ============ */
  $$('.demo-open').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.project'); card.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
      var first = $('.demo button, .demo input', card); if (first) first.focus({ preventScroll: true });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* ============ Glass sheen follows the pointer ============ */
  $$('.glass').forEach(function (g) {
    g.addEventListener('pointermove', function (e) {
      var r = g.getBoundingClientRect();
      g.style.setProperty('--gx', (e.clientX - r.left) + 'px');
      g.style.setProperty('--gy', (e.clientY - r.top) + 'px');
    });
  });

  /* ============ In-page links go through the smooth scroller ============ */
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var h = a.getAttribute('href'); if (h.length < 2 || !$(h)) return;
      e.preventDefault(); go(h);
      if (history.replaceState) history.replaceState(null, '', h === '#top' ? location.pathname : h);
    });
  });

  if (!hasGsap) return;

  /* ================================================================
     Motion (GSAP + ScrollTrigger + Lenis)
     ================================================================ */
  gsap.registerPlugin(ScrollTrigger);

  // Split headings into masked words.
  $$('.split').forEach(function (el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span class="w"><span>' + w + '</span></span>'; }).join(' ');
  });

  if (reduce) return;

  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  /* Intro: built paused, played once the fonts are in (no reflow mid-animation). */
  var intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
  gsap.set('.name .nw', { transformPerspective: 1200, transformOrigin: '50% 100%' });
  intro.fromTo('.name .nw', { y: 0, yPercent: 105, rotationX: -75 }, { yPercent: 0, rotationX: 0, duration: 1.6, stagger: .12 })
    .fromTo('.hero .rv', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.1, stagger: .09 }, '-=1.05')
    .fromTo('.nav-in', { opacity: 0, y: -14 }, { opacity: 1, y: 0, duration: .9 }, '<');
  var played = false;
  function playIntro() { if (played) return; played = true; intro.play(); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(playIntro);
  setTimeout(playIntro, 1200);

  var mm = gsap.matchMedia();

  mm.add('(min-width: 1px)', function () {
    gsap.to('#progress', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
    gsap.to('.name', { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

    $$('.split').forEach(function (el) {
      gsap.from($$('.w > span', el), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .06,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true, onEnter: function () { el.classList.add('in'); } } });
    });

    gsap.from('.statement', { opacity: 0, y: 30, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: '.about-grid', start: 'top 85%', once: true } });
    gsap.from('.facts div', { opacity: 0, y: 20, duration: .9, ease: 'expo.out', stagger: .08, scrollTrigger: { trigger: '.facts', start: 'top 88%', once: true } });
    gsap.from('.contact-lead, .mail, .c-links', { opacity: 0, y: 28, duration: 1.1, ease: 'expo.out', stagger: .09, scrollTrigger: { trigger: '.contact-lead', start: 'top 90%', once: true } });
    gsap.from('.foot-name .fw', { yPercent: 60, rotationX: -85, opacity: 0, transformPerspective: 1000, transformOrigin: '50% 100%', duration: 1.4, ease: 'expo.out', stagger: .14,
      scrollTrigger: { trigger: '.foot', start: 'top 88%', once: true } });

  });

  /* Desktop with room: pinned horizontal gallery. Everything else: stacked cards that rise in. */
  mm.add({ wide: '(min-width: 1024px) and (min-height: 700px)', narrow: '(max-width: 1023px), (max-height: 699px)' }, function (ctx) {
    var track = $('#track');
    if (ctx.conditions.wide) {
      root.classList.add('hgal');
      var dist = function () { return Math.max(0, track.scrollWidth - innerWidth); };
      var slide = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: { trigger: '#gallery', start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: .8, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      $$('.project').forEach(function (p, i) {
        // The first card is already on screen when the gallery pins, so it enters on the normal scroll.
        var st = i === 0
          ? function (d) { return { trigger: '#gallery', start: 'top ' + (65 - d) + '%', once: true }; }
          : function (d) { return { trigger: p, containerAnimation: slide, start: 'left ' + (80 - d) + '%', once: true }; };
        gsap.from($$('.p-info > *', p), { opacity: 0, y: 34, rotationX: -45, transformPerspective: 900, transformOrigin: '0% 100%', duration: 1.1, ease: 'expo.out', stagger: .07, scrollTrigger: st(0) });
        gsap.from($('.demo', p), { opacity: 0, y: 60, rotationX: 10, transformPerspective: 1200, duration: 1.3, ease: 'expo.out', scrollTrigger: st(8) });
      });
      ScrollTrigger.refresh();
      return function () { root.classList.remove('hgal'); gsap.set(track, { clearProps: 'transform' }); };
    }
    $$('.project').forEach(function (p) {
      gsap.from($$('.p-info > *', p), { opacity: 0, y: 30, rotationX: -45, transformPerspective: 900, transformOrigin: '0% 100%', duration: 1.1, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: p, start: 'top 80%', once: true } });
      gsap.from($('.demo', p), { opacity: 0, y: 50, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: $('.demo', p), start: 'top 90%', once: true } });
    });
  });

  /* The stack: plates pull apart, then each layer lights up in turn (pinned on desktop). */
  var plates = $$('.plate'), lays = $$('.lay');
  function setLayer(i) {
    lays.forEach(function (l, k) { l.classList.toggle('on', k === i); });
    plates.forEach(function (p, k) { p.classList.toggle('on', k === i); });
  }
  mm.add({ wide: '(min-width: 1024px) and (min-height: 700px)', narrow: '(max-width: 1023px), (max-height: 699px)' }, function (ctx) {
    if (ctx.conditions.wide) {
      root.classList.add('pinstack');
      var tl = gsap.timeline({ scrollTrigger: { trigger: '#stack-pin', start: 'top top', end: '+=2200', pin: true, scrub: .8,
        onUpdate: function (self) { setLayer(Math.min(3, Math.floor(Math.max(0, self.progress - .18) / .82 * 4))); } } });
      tl.fromTo('#plates', { '--gap': '18px', rotationZ: -46, rotationX: 62, y: 70 }, { '--gap': '74px', rotationZ: -32, rotationX: 56, y: 70, ease: 'power2.inOut', duration: .3 })
        .to('#plates', { rotationZ: -24, duration: .7, ease: 'none' });
      return function () { root.classList.remove('pinstack'); setLayer(0); };
    }
    gsap.fromTo('#plates', { '--gap': '14px' }, { '--gap': '58px', ease: 'none', scrollTrigger: { trigger: '.stack-scene', start: 'top 85%', end: 'center 45%', scrub: true } });
    lays.forEach(function (l, k) {
      ScrollTrigger.create({ trigger: l, start: 'top 65%', end: 'bottom 65%', onToggle: function (self) { if (self.isActive) setLayer(k); } });
    });
  });

  /* Fine pointers: subtle cursor, magnetic buttons, demo tilt. */
  mm.add('(hover: hover) and (pointer: fine)', function () {
    var cur = $('#cursor');
    var cx = gsap.quickTo(cur, 'x', { duration: .22, ease: 'power3' }), cy = gsap.quickTo(cur, 'y', { duration: .22, ease: 'power3' });
    function move(e) { cx(e.clientX); cy(e.clientY); cur.classList.add('on'); }
    function over(e) { cur.classList.toggle('big', !!e.target.closest('a, button, label, input')); }
    function leave() { cur.classList.remove('on'); }
    window.addEventListener('pointermove', move); document.addEventListener('pointerover', over); document.addEventListener('pointerleave', leave);

    var offs = $$('.mag').map(function (el) {
      var mx = gsap.quickTo(el, 'x', { duration: .5, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: .5, ease: 'power3' });
      function m(e) { var r = el.getBoundingClientRect(); mx((e.clientX - r.left - r.width / 2) * .22); my((e.clientY - r.top - r.height / 2) * .3); }
      function l() { mx(0); my(0); }
      el.addEventListener('pointermove', m); el.addEventListener('pointerleave', l);
      return function () { el.removeEventListener('pointermove', m); el.removeEventListener('pointerleave', l); };
    });
    var scene = $('.stack-scene');
    if (scene) {
      var sx = gsap.quickTo(scene, 'rotationY', { duration: 1.2, ease: 'power3' }), sy = gsap.quickTo(scene, 'rotationX', { duration: 1.2, ease: 'power3' });
      gsap.set(scene, { transformPerspective: 1800 });
      scene.addEventListener('pointermove', function (e) { var r = scene.getBoundingClientRect(); sx(((e.clientX - r.left) / r.width - .5) * 14); sy(-((e.clientY - r.top) / r.height - .5) * 10); });
      scene.addEventListener('pointerleave', function () { sx(0); sy(0); });
    }
    $$('.demo').forEach(function (el) {
      var rx = gsap.quickTo(el, 'rotationX', { duration: .9, ease: 'power3' }), ry = gsap.quickTo(el, 'rotationY', { duration: .9, ease: 'power3' });
      gsap.set(el, { transformPerspective: 1400 });
      function m(e) { var r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * 5); rx(-((e.clientY - r.top) / r.height - .5) * 5); }
      function l() { rx(0); ry(0); }
      el.addEventListener('pointermove', m); el.addEventListener('pointerleave', l);
      offs.push(function () { el.removeEventListener('pointermove', m); el.removeEventListener('pointerleave', l); });
    });
    return function () {
      window.removeEventListener('pointermove', move); document.removeEventListener('pointerover', over); document.removeEventListener('pointerleave', leave);
      offs.forEach(function (f) { f(); });
    };
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
