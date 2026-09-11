/* Aurora — world-class vanilla JS. Zero dependencies. */
(function () {
  'use strict';

  var $ = function (selector, context) {
    return (context || document).querySelector(selector);
  };
  var $$ = function (selector, context) {
    return Array.prototype.slice.call((context || document).querySelectorAll(selector));
  };
  var clamp = function (value, min, max) {
    return Math.min(max, Math.max(min, value));
  };
  var reduceMotion = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };
  var store = {
    get: function (k, fb) {
      try {
        var v = localStorage.getItem('aurora:' + k);
        return v == null ? fb : JSON.parse(v);
      } catch (e) { return fb; }
    },
    set: function (k, v) {
      try { localStorage.setItem('aurora:' + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  /* ---------- data ---------- */
  var RANGES = {
    '24h': { label: 'Last 24 hours', t0: '00:00', values: [23, 24, 22, 29, 33, 31, 41, 38, 44, 48, 46, 54, 51, 59, 63, 57, 61, 69, 66, 73, 75, 70, 79, 84], base: 84600 },
    '7d': { label: 'Last 7 days', t0: 'MON', values: [31, 28, 35, 33, 42, 47, 44, 52, 49, 58, 63, 59, 68, 74, 71, 80, 77, 86, 84, 92, 89, 97, 95, 104], base: 512400 },
    '30d': { label: 'Last 30 days', t0: 'D-30', values: [20, 26, 24, 33, 30, 39, 44, 41, 50, 55, 52, 61, 66, 63, 72, 69, 78, 83, 80, 89, 94, 91, 100, 108], base: 1980000 }
  };
  var SPARK_VALUES = [21, 27, 25, 35, 31, 40, 38, 49, 46, 55, 52, 61, 58, 67, 65, 72];
  var QUALITY_MULTIPLIERS = [1.09, 1.03, 0.88, 1.15, 0.77, 0.95];

  var INITIAL_FEED = [
    ['acid', 'momentum', 'Conversion path accelerated', 'Identity handoff gained 18% confidence', 0],
    ['violet', 'momentum', 'A new pattern is emerging', 'Pricing explore is clustering in EMEA', 2],
    ['pink', 'friction', 'Journey friction detected', 'Two-step recovery path is under review', 6],
    ['acid', 'momentum', 'Signal quality recalibrated', 'Mobile onboarding lifted to 96.2', 11]
  ];
  var LIVE_EVENTS = [
    ['acid', 'momentum', 'High-intent moment detected', 'Checkout intent is now compounding', 0],
    ['violet', 'momentum', 'A pathway just connected', 'Discovery and trial journeys merged', 0],
    ['pink', 'friction', 'Friction signal softened', 'Account recovery is resolving faster', 0],
    ['acid', 'momentum', 'Resolution quality lifted', 'Decision latency dropped under 80ms', 0],
    ['violet', 'momentum', 'New cohort clustering', 'Trial users converging on quick checkout', 0],
    ['pink', 'friction', 'Checkout hesitation spotted', 'Dwell time rising on plan compare', 0]
  ];
  var HEALTH_ROWS = [
    ['Ingestion availability', '99.998%', 'Integrity', 99.8],
    ['Decision latency', '82ms', 'P95 target: 120ms', 68],
    ['Delivery resonance', '96.7%', 'Within threshold', 96.7]
  ];
  var SIGNALS = [
    { name: 'Identity handoff', volume: 24800, delta: 18.2, conf: 94.6 },
    { name: 'Quick checkout', volume: 14200, delta: 11.7, conf: 91.3 },
    { name: 'Pricing explore', volume: 8900, delta: 6.4, conf: 87.9 },
    { name: 'Plan compare', volume: 6400, delta: 4.8, conf: 83.1 },
    { name: 'Help search', volume: 3100, delta: 1.9, conf: 76.5 },
    { name: 'Account recovery', volume: 1700, delta: -0.6, conf: 71.2 }
  ];
  var PALETTE_INDEX = SIGNALS.map(function (s) {
    return [s.name, 'Signal · ' + (s.volume / 1000).toFixed(1) + 'k · ' + s.conf + '%'];
  }).concat([
    ['Event velocity report', 'Report · selected range'],
    ['Resolution quality', 'Metric · 91.4 score'],
    ['Infrastructure rhythm', 'System · ingest / decide / deliver'],
    ['Decision leaderboard', 'Table · ranked by intent']
  ]);

  var state = {
    live: store.get('live', true),
    range: store.get('range', '24h'),
    feedFilter: 'all',
    sort: { key: 'volume', dir: -1 },
    velocity: (RANGES[store.get('range', '24h')] || RANGES['24h']).base,
    pathways: 2842,
    frame: 'volume',
    feed: INITIAL_FEED.map(function (r) { return r.slice(); })
  };

  var el = {};
  var toastTimer = null;
  var paletteActive = 0;
  var timers = [];

  /* ---------- helpers ---------- */
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(message) {
    if (!el.toast) return;
    el.toast.textContent = message;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.classList.remove('show'); }, 2400);
  }
  function fmtK(n) {
    return n >= 1000000 ? (n / 1000000).toFixed(2) + 'M' : (n / 1000).toFixed(1) + 'k';
  }
  function relTime(mins) {
    if (mins <= 0) return 'NOW';
    if (mins < 60) return mins + 'm';
    var h = Math.floor(mins / 60);
    return h + 'h';
  }

  function makePath(values, width, height, padding) {
    padding = padding == null ? 6 : padding;
    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var span = max - min || 1;
    var step = (width - padding * 2) / (values.length - 1);
    return values.map(function (value, index) {
      var x = padding + index * step;
      var y = height - padding - ((value - min) / span) * (height - padding * 2);
      return (index === 0 ? 'M' : 'L') + ' ' + x.toFixed(2) + ' ' + y.toFixed(2);
    }).join(' ');
  }
  function chartGrid(width, height) {
    var rows = '';
    for (var i = 1; i <= 3; i++) {
      var y = ((height / 4) * i).toFixed(1);
      rows += '<line x1="0" y1="' + y + '" x2="' + width + '" y2="' + y + '" stroke="rgba(255,255,255,.06)" stroke-width="1"/>';
    }
    return rows;
  }

  /* ---------- charts ---------- */
  function drawVelocityChart() {
    if (!el.velocityChart) return;
    var values = RANGES[state.range].values;
    var path = makePath(values, 560, 132, 5);
    el.velocityChart.innerHTML =
      chartGrid(560, 132) +
      '<defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0" stop-color="#d3ff53" stop-opacity=".32"/>' +
      '<stop offset="1" stop-color="#d3ff53" stop-opacity="0"/></linearGradient>' +
      '<filter id="chartGlow" x="-30%" y="-30%" width="160%" height="160%">' +
      '<feGaussianBlur stdDeviation="2.3" result="blur"/><feMerge><feMergeNode in="blur"/>' +
      '<feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<path class="chart-area" d="' + path + ' L 555 132 L 5 132 Z" fill="url(#chartFill)"/>' +
      '<path class="chart-line" d="' + path + '" fill="none" stroke="#d3ff53" stroke-width="2.2" ' +
      'filter="url(#chartGlow)" vector-effect="non-scaling-stroke" stroke-linecap="round"/>' +
      '<circle cx="555" cy="5" r="3.6" fill="#efffab" stroke="#111810" stroke-width="2" vector-effect="non-scaling-stroke">' +
      (reduceMotion() ? '' : '<animate attributeName="r" values="3.6;5;3.6" dur="2s" repeatCount="indefinite"/>') + '</circle>';
  }
  function drawSparkline() {
    if (!el.sparkline) return;
    var path = makePath(SPARK_VALUES, 220, 62, 3);
    el.sparkline.innerHTML =
      '<defs><linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">' +
      '<stop stop-color="#a888ff" stop-opacity=".32"/>' +
      '<stop offset="1" stop-color="#a888ff" stop-opacity="0"/></linearGradient></defs>' +
      '<path class="chart-area" d="' + path + ' L 217 62 L 3 62 Z" fill="url(#spark)"/>' +
      '<path class="chart-line" d="' + path + '" fill="none" stroke="#b89aff" stroke-width="2" ' +
      'vector-effect="non-scaling-stroke" stroke-linecap="round"/>' +
      '<circle cx="217" cy="3" r="2.6" fill="#e5daff"/>';
  }
  function drawTrajectory(conf) {
    if (!el.trajectoryChart) return;
    var seed = conf || 90;
    var vals = [];
    for (var i = 0; i < 16; i++) {
      vals.push(seed - 14 + i * 1.1 + Math.sin(i * 1.3) * 2.4);
    }
    var path = makePath(vals, 300, 90, 4);
    el.trajectoryChart.innerHTML =
      chartGrid(300, 90) +
      '<path d="' + path + ' L 296 90 L 4 90 Z" fill="rgba(211,255,83,.12)"/>' +
      '<path d="' + path + '" fill="none" stroke="#d3ff53" stroke-width="2" stroke-linecap="round"/>';
  }

  /* ---------- renderers ---------- */
  function renderFeed(freshIndex) {
    if (!el.feedList) return;
    var rows = state.feed.filter(function (item) {
      return state.feedFilter === 'all' || item[1] === state.feedFilter;
    }).slice(0, 4);
    el.feedList.innerHTML = rows.length ? rows.map(function (item, i) {
      return '<li class="feed-item' + (i === freshIndex ? ' fresh' : '') + '"><i class="feed-dot ' + escapeHtml(item[0]) + '"></i>' +
        '<div class="feed-body"><strong>' + escapeHtml(item[2]) + '</strong><p>' + escapeHtml(item[3]) + '</p></div>' +
        '<time class="feed-time">' + escapeHtml(relTime(item[4])) + '</time></li>';
    }).join('') : '<li class="feed-item"><div class="feed-body"><strong>No events in this view</strong><p>Switch filter to see more</p></div></div></li>';
  }
  function renderHealth() {
    if (!el.healthBars) return;
    el.healthBars.innerHTML = HEALTH_ROWS.map(function (row) {
      var percent = clamp(row[3], 0, 100);
      return '<div class="health-item"><p>' + escapeHtml(row[0]) + '</p><strong>' + escapeHtml(row[1]) + '</strong>' +
        '<div class="bar-label"><span>' + escapeHtml(row[2]) + '</span><span>' + percent + '%</span></div>' +
        '<div class="progress-bar"><i style="--width:' + percent + '%"></i></div></div>';
    }).join('');
  }
  function updateClock() {
    if (!el.localTime) return;
    el.localTime.textContent = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    }).format(new Date());
  }
  function setVelocity(value, flip) {
    if (!el.eventVelocity) return;
    el.eventVelocity.innerHTML = '<span class="' + (flip ? 'flip' : '') + '">' + fmtK(value) + '</span>';
    if (el.heroLiveCount) el.heroLiveCount.textContent = fmtK(value) + ' events';
    if (el.rangeLabel) el.rangeLabel.textContent = RANGES[state.range].label;
    if (el.chartT0) el.chartT0.textContent = RANGES[state.range].t0;
  }
  function countUp(node, target, opts) {
    opts = opts || {};
    var decimals = opts.decimals || 0;
    var suffix = opts.suffix || '';
    var duration = reduceMotion() ? 1 : opts.duration || 1400;
    var start = null;
    function frame(now) {
      if (!start) start = now;
      var t = clamp((now - start) / duration, 0, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      node.textContent = (target * eased).toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') + suffix;
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function updateLiveMetrics() {
    if (!state.live || document.hidden) return;
    state.velocity += Math.floor(Math.random() * 110 + 20);
    state.pathways = Math.max(0, state.pathways + Math.floor(Math.random() * 4 - 1));
    setVelocity(state.velocity, true);
    if (el.pathways) el.pathways.textContent = state.pathways.toLocaleString();
  }
  function addLiveEvent() {
    if (!state.live || document.hidden) return;
    state.feed.forEach(function (item) { item[4] += 0.17; });
    state.feed.unshift(LIVE_EVENTS[Math.floor(Math.random() * LIVE_EVENTS.length)].slice());
    renderFeed(0);
  }

  /* ---------- decisions table ---------- */
  function renderTable() {
    if (!el.decisionRows) return;
    var q = (el.tableSearch && el.tableSearch.value || '').toLowerCase();
    var rows = SIGNALS.filter(function (s) {
      return !q || s.name.toLowerCase().indexOf(q) !== -1;
    }).sort(function (a, b) {
      var k = state.sort.key;
      var va = k === 'name' ? a.name : a[k];
      var vb = k === 'name' ? b.name : b[k];
      if (va < vb) return -1 * state.sort.dir;
      if (va > vb) return 1 * state.sort.dir;
      return 0;
    });
    el.decisionRows.innerHTML = rows.map(function (s) {
      var cls = s.delta >= 0 ? 'up' : 'down';
      var arrow = s.delta >= 0 ? '↗' : '↘';
      return '<tr data-signal="' + escapeHtml(s.name) + '"><td><strong>' + escapeHtml(s.name) + '</strong></td>' +
        '<td class="vol">' + s.volume.toLocaleString() + '</td>' +
        '<td class="' + cls + '">' + arrow + ' ' + (s.delta >= 0 ? '+' : '') + s.delta.toFixed(1) + '%</td>' +
        '<td><span class="conf-cell"><span class="conf-track"><i style="width:' + s.conf + '%"></i></span>' + s.conf.toFixed(1) + '%</span></td></tr>';
    }).join('');
    $$('tr', el.decisionRows).forEach(function (tr) {
      tr.addEventListener('click', function () {
        openInspector(tr.getAttribute('data-signal'));
      });
    });
  }

  /* ---------- inspector ---------- */
  function signalByName(name) {
    for (var i = 0; i < SIGNALS.length; i++) {
      if (SIGNALS[i].name === name) return SIGNALS[i];
    }
    return SIGNALS[0];
  }
  function openInspector(title) {
    if (!el.inspector) return;
    var sig = signalByName(title || 'Identity handoff');
    if (el.inspectorTitle) el.inspectorTitle.textContent = sig.name;
    if (el.inspectorConf) el.inspectorConf.textContent = sig.conf.toFixed(1) + '%';
    if (el.inspectorDelta) {
      el.inspectorDelta.textContent = (sig.delta >= 0 ? '+' : '') + sig.delta.toFixed(1) + '%';
      el.inspectorDelta.style.color = sig.delta >= 0 ? '' : '#f18ae6';
    }
    if (el.confMeter) {
      el.confMeter.style.width = '0';
      setTimeout(function () { el.confMeter.style.width = sig.conf + '%'; }, 60);
    }
    drawTrajectory(sig.conf);
    if (el.inspectorActivity) {
      el.inspectorActivity.innerHTML = state.feed.slice(0, 3).map(function (item) {
        return '<li><b>' + escapeHtml(item[2]) + '</b>' + escapeHtml(item[3]) + ' · ' + escapeHtml(relTime(item[4])) + '</li>';
      }).join('');
    }
    el.inspector.classList.add('open');
    el.inspector.setAttribute('aria-hidden', 'false');
  }
  function closeInspector() {
    if (!el.inspector) return;
    el.inspector.classList.remove('open');
    el.inspector.setAttribute('aria-hidden', 'true');
  }
  function applyLiveUI() {
    if (!el.liveToggle) return;
    el.liveToggle.setAttribute('aria-pressed', String(state.live));
    var label = el.liveToggle.querySelector('span');
    if (label) label.textContent = state.live ? 'LIVE' : 'PAUSED';
    if (el.velocityLiveMini) {
      el.velocityLiveMini.textContent = state.live ? '● live' : '○ paused';
      el.velocityLiveMini.classList.toggle('paused', !state.live);
    }
  }
  function toggleLive() {
    state.live = !state.live;
    store.set('live', state.live);
    applyLiveUI();
    toast(state.live ? 'Live stream resumed' : 'Live stream paused');
  }

  /* ---------- palette ---------- */
  function paletteHits(filter) {
    var q = (filter || '').trim().toLowerCase();
    var recents = store.get('recents', []);
    var pool = PALETTE_INDEX.slice();
    if (!q && recents.length) {
      var ordered = [];
      recents.forEach(function (name) {
        var hit = null;
        pool.forEach(function (row) { if (row[0] === name) hit = row; });
        if (hit) ordered.push(hit);
      });
      pool.forEach(function (row) {
        if (recents.indexOf(row[0]) === -1) ordered.push(row);
      });
      pool = ordered;
    }
    return pool.filter(function (row) {
      return !q || row[0].toLowerCase().indexOf(q) !== -1 || row[1].toLowerCase().indexOf(q) !== -1;
    }).slice(0, 7);
  }
  function renderPalette(filter) {
    if (!el.commandResults) return;
    var hits = paletteHits(filter);
    paletteActive = clamp(paletteActive, 0, Math.max(0, hits.length - 1));
    el.commandResults.innerHTML = hits.length ? hits.map(function (row, i) {
      var group = row[1].split(' ·')[0];
      var showGroup = i === 0 || hits[i - 1][1].split(' ·')[0] !== group;
      return (showGroup ? '<li class="group-label">' + escapeHtml(group.toUpperCase()) + '</li>' : '') +
        '<li><button data-target="' + escapeHtml(row[0]) + '" class="' + (i === paletteActive ? 'active' : '') + '"><span>' +
        escapeHtml(row[0]) + '</span><span>' + escapeHtml(row[1]) + '</span></button></li>';
    }).join('') : '<li><button data-target="Workspace signal"><span>No matches — explore workspace</span><span>↵</span></button></li>';
    $$('button', el.commandResults).forEach(function (btn) {
      btn.addEventListener('click', function () { choosePalette(btn.getAttribute('data-target')); });
      btn.addEventListener('mousemove', function () {
        $$('button', el.commandResults).forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
      });
    });
  }
  function choosePalette(title) {
    var name = title || 'Workspace signal';
    var recents = store.get('recents', []).filter(function (r) { return r !== name; });
    recents.unshift(name);
    store.set('recents', recents.slice(0, 5));
    if (el.dialog) el.dialog.close();
    openInspector(name);
  }

  /* ---------- fx layers ---------- */
  function initLoader() {
    var pct = 0;
    var tick = setInterval(function () {
      pct = Math.min(100, pct + 12 + Math.random() * 18);
      if (el.loaderBar) el.loaderBar.style.width = pct + '%';
      if (el.loaderPct) el.loaderPct.textContent = Math.floor(pct) + '%';
      if (pct >= 100) {
        clearInterval(tick);
        setTimeout(function () { if (el.loader) el.loader.classList.add('done'); }, 250);
      }
    }, 110);
  }
  function initCursor() {
    if (!el.cursorGlow || reduceMotion()) {
      if (el.cursorGlow) el.cursorGlow.style.display = 'none';
      return;
    }
    var tx = window.innerWidth / 2, ty = 220, x = tx, y = ty;
    document.addEventListener('mousemove', function (e) {
      tx = e.clientX; ty = e.clientY;
    }, { passive: true });
    (function follow() {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.cursorGlow.style.transform = 'translate(' + (x - 260) + 'px,' + (y - 260) + 'px)';
      requestAnimationFrame(follow);
    })();
  }
  function initParticles() {
    var canvas = el.particles;
    if (!canvas || reduceMotion()) { if (canvas) canvas.style.display = 'none'; return; }
    var ctx = canvas.getContext('2d');
    var pts = [];
    var W = 0, H = 0;
    function resize() {
      var r = canvas.parentElement.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function seed() {
      pts = [];
      var n = clamp(Math.floor(W / 22), 30, 90);
      for (var i = 0; i < n; i++) {
        pts.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35, r: Math.random() * 1.6 + 0.4 });
      }
    }
    function frame() {
      if (!document.hidden) {
        ctx.clearRect(0, 0, W, H);
        var acid = getComputedStyle(document.documentElement).getPropertyValue('--acid').trim() || '#d3ff53';
        pts.forEach(function (p) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > W) p.vx *= -1;
          if (p.y < 0 || p.y > H) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(211,255,83,.5)';
          ctx.fill();
        });
        ctx.strokeStyle = acid;
        ctx.globalAlpha = 0.10;
        ctx.lineWidth = 1;
        for (var i = 0; i < pts.length; i++) {
          for (var j = i + 1; j < pts.length; j++) {
            var a = pts[i], b = pts[j];
            var d = Math.hypot(a.x - b.x, a.y - b.y);
            if (d < 130) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.stroke();
            }
          }
        }
        ctx.globalAlpha = 1;
      }
      requestAnimationFrame(frame);
    }
    resize(); seed(); frame();
    window.addEventListener('resize', function () { resize(); seed(); });
  }
  function initSplitTitle() {
    var h1 = el.pageTitle;
    if (!h1 || reduceMotion()) return;
    var walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.textContent.split('').forEach(function (ch, i) {
        if (ch === ' ') { frag.appendChild(document.createTextNode(' ')); return; }
        var s = document.createElement('span');
        s.className = 'ch';
        s.style.animationDelay = (i * 22) + 'ms';
        s.textContent = ch;
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
  }
  function initSpotlight() {
    $$('.spotlight').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
    });
  }
  function initTilt() {
    if (reduceMotion()) return;
    $$('.tilt').forEach(function (card) {
      var raf = null;
      card.addEventListener('mousemove', function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var rect = card.getBoundingClientRect();
          var px = (e.clientX - rect.left) / rect.width - 0.5;
          var py = (e.clientY - rect.top) / rect.height - 0.5;
          card.style.transform = 'perspective(900px) rotateX(' + (-py * 5) + 'deg) rotateY(' + px * 6 + 'deg) translateY(-2px)';
          raf = null;
        });
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }
  function initMagnetic() {
    if (reduceMotion()) return;
    $$('.magnetic').forEach(function (btn) {
      btn.addEventListener('mousemove', function (e) {
        var rect = btn.getBoundingClientRect();
        btn.style.transform = 'translate(' + (e.clientX - (rect.left + rect.width / 2)) * 0.12 + 'px,' + (e.clientY - (rect.top + rect.height / 2)) * 0.16 + 'px)';
      });
      btn.addEventListener('mouseleave', function () { btn.style.transform = ''; });
    });
  }
  function initReveal() {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion()) {
      items.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.1 });
    items.forEach(function (n) { io.observe(n); });
  }
  function initCountUps() {
    $$('[data-count]').forEach(function (node) {
      var target = parseFloat(node.getAttribute('data-count'));
      if (isNaN(target)) return;
      countUp(node, target, { decimals: parseInt(node.getAttribute('data-decimals') || '0', 10), suffix: node.getAttribute('data-suffix') || '' });
    });
    if (el.qualityScore) countUp(el.qualityScore, 91.4, { decimals: 1 });
  }
  function initScroll() {
    var onScroll = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      if (el.scrollProgress) el.scrollProgress.style.width = (max > 0 ? (h.scrollTop / max) * 100 : 0) + '%';
      if (el.toTop) el.toTop.classList.toggle('show', h.scrollTop > 600);
      var ids = ['overview', 'pulse', 'explore', 'decisions', 'library'];
      var current = 'overview';
      ids.forEach(function (id) {
        var s = document.getElementById(id);
        if (s && s.getBoundingClientRect().top < 200) current = id;
      });
      $$('#railNav .rail-button').forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-spy') === current);
      });
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (el.toTop) el.toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduceMotion() ? 'auto' : 'smooth' }); });
  }
  function initTicker() {
    var track = $('#tickerTrack');
    if (track && track.children.length <= 12) track.innerHTML += track.innerHTML;
  }

  /* ---------- wiring ---------- */
  function cacheElements() {
    ['loader', 'loaderBar', 'loaderPct', 'cursorGlow', 'scrollProgress',
      'velocityChart', 'sparkline', 'feedList', 'healthBars', 'localTime', 'eventVelocity', 'pathways',
      'liveToggle', 'inspector', 'inspectorTitle', 'nodeTooltip', 'commandDialog', 'commandInput',
      'commandResults', 'heroLiveCount', 'qualityScore', 'toast', 'particles', 'pageTitle', 'rangeLabel',
      'chartT0', 'decisionRows', 'tableSearch', 'trajectoryChart', 'confMeter', 'inspectorConf',
      'inspectorDelta', 'inspectorActivity', 'toTop', 'shortcutsDialog'
    ].forEach(function (id) {
      var key = id === 'sparkline' ? 'sparkline' : id;
      el[key] = document.getElementById(id);
    });
    el.sparkline = document.getElementById('pathwaySparkline');
    el.velocityLiveMini = document.getElementById('velocityLiveMini');
  }
  function bind(id, event, handler) {
    var node = document.getElementById(id);
    if (node) node.addEventListener(event, handler);
  }
  function applyAccent(name) {
    document.documentElement.setAttribute('data-accent', name);
    $$('[data-accent-btn]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-accent-btn') === name);
    });
    store.set('accent', name);
  }
  function applyRange(range, silent) {
    if (!RANGES[range]) range = '24h';
    state.range = range;
    state.velocity = RANGES[range].base;
    store.set('range', range);
    $$('[data-range]').forEach(function (b) {
      b.classList.toggle('is-on', b.getAttribute('data-range') === range);
    });
    drawVelocityChart();
    setVelocity(state.velocity, !silent);
    if (!silent) toast('Range switched — ' + RANGES[range].label);
  }

  function initControls() {
    bind('liveToggle', 'click', toggleLive);
    bind('inspectButton', 'click', function () { openInspector(); toast('Signal inspector opened'); });
    bind('closeInspector', 'click', closeInspector);
    bind('deepAnalysisButton', 'click', function () { toast('Deep analysis queued — report incoming'); });
    bind('avatarButton', 'click', function () { toast('Signed in as Pavan S — Northstar Intelligence'); });
    bind('workspaceButton', 'click', function () { toast('Workspace switcher — Northstar Intelligence active'); });
    bind('clearFeed', 'click', function () {
      state.feed = [['violet', 'momentum', 'Feed cleared', 'Listening for the next meaningful change', 0]];
      renderFeed();
      toast('Feed cleared — listening for change');
    });
    bind('expandFeed', 'click', function () {
      state.feed.push(['acid', 'momentum', 'Deep pattern recognized', 'New connected moments added to your timeline', 0]);
      renderFeed();
      toast('Deep pattern appended to timeline');
    });
    bind('refreshHealth', 'click', function (event) {
      var btn = event.currentTarget;
      var original = btn.innerHTML;
      renderHealth();
      btn.innerHTML = 'Refreshed <span>\u2713</span>';
      toast('Infrastructure metrics refreshed');
      setTimeout(function () { btn.innerHTML = original; }, 1600);
    });
    bind('exportButton', 'click', function () {
      var rows = ['index,value', RANGES[state.range].values.map(function (v, i) { return i + ',' + v; }).join('\n')].join('\n');
      var blob = new Blob([rows], { type: 'text/csv' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'aurora-velocity-' + state.range + '.csv';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
      toast('Velocity data exported — ' + state.range);
    });
    bind('shortcutsButton', 'click', function () {
      if (el.shortcutsDialog) el.shortcutsDialog.showModal();
    });
    $$('[data-range]').forEach(function (btn) {
      btn.addEventListener('click', function () { applyRange(btn.getAttribute('data-range')); });
    });
    $$('[data-accent-btn]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyAccent(btn.getAttribute('data-accent-btn'));
        toast('Accent theme applied');
      });
    });
    $$('[data-feed]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('[data-feed]').forEach(function (b) { b.classList.remove('is-on'); });
        btn.classList.add('is-on');
        state.feedFilter = btn.getAttribute('data-feed');
        renderFeed();
      });
    });
    $$('[data-sort]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var key = btn.getAttribute('data-sort');
        if (state.sort.key === key) state.sort.dir *= -1;
        else state.sort = { key: key, dir: key === 'name' ? 1 : -1 };
        renderTable();
      });
    });
    if (el.tableSearch) el.tableSearch.addEventListener('input', renderTable);
    $$('.tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        $$('.tab').forEach(function (t) { t.classList.remove('is-on'); });
        tab.classList.add('is-on');
        var name = tab.getAttribute('data-tab');
        $$('.tab-pane').forEach(function (pane) {
          pane.classList.toggle('is-on', pane.getAttribute('data-pane') === name);
        });
        if (name === 'trajectory' && el.confMeter && el.inspectorTitle) {
          var sig = signalByName(el.inspectorTitle.textContent);
          drawTrajectory(sig.conf);
          el.confMeter.style.width = '0';
          setTimeout(function () { el.confMeter.style.width = sig.conf + '%'; }, 60);
        }
      });
    });
  }

  function initSegmented() {
    $$('.segmented button').forEach(function (button) {
      button.addEventListener('click', function () {
        var selected = $('.segmented .selected');
        if (selected) selected.classList.remove('selected');
        button.classList.add('selected');
        state.frame = button.dataset.view;
        $$('.signal-node').forEach(function (node, index) {
          var multiplier = state.frame === 'quality' ? QUALITY_MULTIPLIERS[index % QUALITY_MULTIPLIERS.length] : 1;
          var value = node.querySelector('b');
          if (value) value.style.transform = 'scale(' + multiplier + ')';
          node.style.filter = state.frame === 'quality' ? 'saturate(1.25)' : '';
        });
        toast(state.frame === 'quality' ? 'Signal map: quality view' : 'Signal map: volume view');
      });
    });
  }
  function initSignalNodes() {
    $$('.signal-node').forEach(function (node) {
      node.addEventListener('click', function () {
        if (el.nodeTooltip) {
          el.nodeTooltip.textContent = node.dataset.node + ': signal trajectory is strengthening.';
          el.nodeTooltip.classList.add('visible');
          setTimeout(function () { el.nodeTooltip.classList.remove('visible'); }, 2200);
        }
        openInspector(node.dataset.node);
      });
    });
  }
  function initDialog() {
    var openBtn = $('#commandButton');
    renderPalette('');
    if (openBtn && el.dialog) {
      openBtn.addEventListener('click', function () {
        paletteActive = 0;
        renderPalette('');
        if (el.commandInput) el.commandInput.value = '';
        el.dialog.showModal();
      });
    }
    if (el.commandInput) {
      el.commandInput.addEventListener('input', function (e) {
        paletteActive = 0;
        renderPalette(e.target.value);
      });
      el.commandInput.addEventListener('keydown', function (event) {
        var buttons = el.commandResults ? $$('button', el.commandResults) : [];
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          paletteActive = clamp(paletteActive + (event.key === 'ArrowDown' ? 1 : -1), 0, Math.max(0, buttons.length - 1));
          renderPalette(event.currentTarget.value);
        } else if (event.key === 'Enter') {
          event.preventDefault();
          var active = el.commandResults ? $('.command-results button.active') : null;
          choosePalette(active ? active.getAttribute('data-target') : event.currentTarget.value);
        }
      });
    }
    document.addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (el.dialog) { paletteActive = 0; renderPalette(''); el.dialog.showModal(); }
      } else if (event.key === '?' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        if (el.shortcutsDialog) el.shortcutsDialog.showModal();
      } else if (event.key === 'Escape' && el.inspector && el.inspector.classList.contains('open')) {
        closeInspector();
      } else if (event.code === 'Space' && document.activeElement &&
        !['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement.tagName) &&
        !(el.dialog && el.dialog.open) && !(el.shortcutsDialog && el.shortcutsDialog.open)) {
        event.preventDefault();
        toggleLive();
      }
    });
  }
  function initRail() {
    $$('.rail-button').forEach(function (button) {
      button.addEventListener('click', function () {
        $$('.rail-button').forEach(function (b) { b.classList.remove('active'); });
        button.classList.add('active');
      });
    });
  }

  function init() {
    cacheElements();
    applyAccent(store.get('accent', 'acid'));
    applyLiveUI();
    drawVelocityChart();
    drawSparkline();
    renderFeed();
    renderHealth();
    renderTable();
    updateClock();
    applyRange(state.range, true);
    initLoader();
    initCursor();
    initParticles();
    initSplitTitle();
    initSpotlight();
    initTilt();
    initMagnetic();
    initReveal();
    initCountUps();
    initScroll();
    initTicker();
    initControls();
    initSegmented();
    initSignalNodes();
    initDialog();
    initRail();
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { updateClock(); }
    });
    timers.push(setInterval(updateClock, 1000));
    timers.push(setInterval(updateLiveMetrics, 2800));
    timers.push(setInterval(addLiveEvent, 10000));
    timers.push(setInterval(function () {
      if (!state.live || document.hidden) return;
      state.feed.forEach(function (item) { item[4] += 0.5; });
      renderFeed();
    }, 30000));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
