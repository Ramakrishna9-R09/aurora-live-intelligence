/* Aurora dashboard — vanilla JS, no dependencies. */
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

  var VELOCITY_VALUES = [23, 24, 22, 29, 33, 31, 41, 38, 44, 48, 46, 54, 51, 59, 63, 57, 61, 69, 66, 73, 75, 70, 79, 84];
  var SPARK_VALUES = [21, 27, 25, 35, 31, 40, 38, 49, 46, 55, 52, 61, 58, 67, 65, 72];
  var QUALITY_MULTIPLIERS = [1.09, 1.03, 0.88, 1.15, 0.77, 0.95];

  var INITIAL_FEED = [
    ['acid', 'Conversion path accelerated', 'Identity handoff gained 18% confidence', 'NOW'],
    ['violet', 'A new pattern is emerging', 'Pricing explore is clustering in EMEA', '02m'],
    ['pink', 'Journey friction detected', 'Two-step recovery path is under review', '06m'],
    ['acid', 'Signal quality recalibrated', 'Mobile onboarding lifted to 96.2', '11m']
  ];

  var LIVE_EVENTS = [
    ['acid', 'High-intent moment detected', 'Checkout intent is now compounding', 'NOW'],
    ['violet', 'A pathway just connected', 'Discovery and trial journeys merged', 'NOW'],
    ['pink', 'Friction signal softened', 'Account recovery is resolving faster', 'NOW']
  ];

  var HEALTH_ROWS = [
    ['Ingestion availability', '99.998%', 'Integrity', 99.8],
    ['Decision latency', '82ms', 'P95 target: 120ms', 68],
    ['Delivery resonance', '96.7%', 'Within threshold', 96.7]
  ];

  var state = {
    live: true,
    velocity: 84600,
    pathways: 2842,
    frame: 'volume',
    feed: INITIAL_FEED.slice()
  };

  var el = {};

  function makePath(values, width, height, padding) {
    padding = padding == null ? 6 : padding;
    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var span = max - min || 1;
    var step = (width - padding * 2) / (values.length - 1);
    return values
      .map(function (value, index) {
        var x = padding + index * step;
        var y = height - padding - ((value - min) / span) * (height - padding * 2);
        return (index === 0 ? 'M' : 'L') + ' ' + x.toFixed(2) + ' ' + y.toFixed(2);
      })
      .join(' ');
  }

  function drawVelocityChart() {
    if (!el.velocityChart) return;
    var path = makePath(VELOCITY_VALUES, 560, 132, 5);
    el.velocityChart.innerHTML =
      '<defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0" stop-color="#d3ff53" stop-opacity=".28"/>' +
      '<stop offset="1" stop-color="#d3ff53" stop-opacity="0"/></linearGradient>' +
      '<filter id="chartGlow" x="-30%" y="-30%" width="160%" height="160%">' +
      '<feGaussianBlur stdDeviation="2.3" result="blur"/><feMerge><feMergeNode in="blur"/>' +
      '<feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      '<path d="' + path + ' L 555 132 L 5 132 Z" fill="url(#chartFill)"/>' +
      '<path d="' + path + '" fill="none" stroke="#d3ff53" stroke-width="2.1" ' +
      'filter="url(#chartGlow)" vector-effect="non-scaling-stroke"/>' +
      '<circle cx="555" cy="5" r="3.5" fill="#efffab" stroke="#111810" ' +
      'stroke-width="2" vector-effect="non-scaling-stroke"/>';
  }

  function drawSparkline() {
    if (!el.sparkline) return;
    var path = makePath(SPARK_VALUES, 220, 62, 3);
    el.sparkline.innerHTML =
      '<defs><linearGradient id="spark" x1="0" x2="0" y1="0" y2="1">' +
      '<stop stop-color="#a888ff" stop-opacity=".27"/>' +
      '<stop offset="1" stop-color="#a888ff" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="' + path + ' L 217 62 L 3 62 Z" fill="url(#spark)"/>' +
      '<path d="' + path + '" fill="none" stroke="#b89aff" stroke-width="2" ' +
      'vector-effect="non-scaling-stroke"/>' +
      '<circle cx="217" cy="3" r="2.5" fill="#e5daff"/>';
  }

  function drawCharts() {
    drawVelocityChart();
    drawSparkline();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderFeed() {
    if (!el.feedList) return;
    el.feedList.innerHTML = state.feed
      .slice(0, 4)
      .map(function (item) {
        return (
          '<li class="feed-item"><i class="feed-dot ' + escapeHtml(item[0]) + '"></i>' +
          '<div class="feed-body"><strong>' + escapeHtml(item[1]) + '</strong>' +
          '<p>' + escapeHtml(item[2]) + '</p></div>' +
          '<time class="feed-time">' + escapeHtml(item[3]) + '</time></li>'
        );
      })
      .join('');
  }

  function renderHealth() {
    if (!el.healthBars) return;
    el.healthBars.innerHTML = HEALTH_ROWS.map(function (row) {
      var percent = clamp(row[3], 0, 100);
      return (
        '<div class="health-item"><p>' + escapeHtml(row[0]) + '</p><strong>' + escapeHtml(row[1]) + '</strong>' +
        '<div class="bar-label"><span>' + escapeHtml(row[2]) + '</span><span>' + percent + '%</span></div>' +
        '<div class="progress-bar"><i style="--width:' + percent + '%"></i></div></div>'
      );
    }).join('');
  }

  function updateClock() {
    if (!el.localTime) return;
    el.localTime.textContent = new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(new Date());
  }

  function updateLiveMetrics() {
    if (!state.live) return;
    state.velocity += Math.floor(Math.random() * 110 + 20);
    state.pathways = Math.max(0, state.pathways + Math.floor(Math.random() * 4 - 1));
    if (el.eventVelocity) {
      el.eventVelocity.innerHTML = (state.velocity / 1000).toFixed(1) + '<span>k</span>';
    }
    if (el.pathways) el.pathways.textContent = state.pathways.toLocaleString();
  }

  function addLiveEvent() {
    if (!state.live) return;
    state.feed.unshift(LIVE_EVENTS[Math.floor(Math.random() * LIVE_EVENTS.length)]);
    renderFeed();
  }

  function openInspector(title) {
    if (!el.inspector) return;
    if (el.inspectorTitle) el.inspectorTitle.textContent = title || 'Identity handoff';
    el.inspector.classList.add('open');
    el.inspector.setAttribute('aria-hidden', 'false');
  }

  function closeInspector() {
    if (!el.inspector) return;
    el.inspector.classList.remove('open');
    el.inspector.setAttribute('aria-hidden', 'true');
  }

  function toggleLive() {
    state.live = !state.live;
    if (!el.liveToggle) return;
    el.liveToggle.setAttribute('aria-pressed', String(state.live));
    var label = el.liveToggle.querySelector('span');
    if (label) label.textContent = state.live ? 'LIVE' : 'PAUSED';
  }

  function cacheElements() {
    el.velocityChart = $('#velocityChart');
    el.sparkline = $('#pathwaySparkline');
    el.feedList = $('#feedList');
    el.healthBars = $('#healthBars');
    el.localTime = $('#localTime');
    el.eventVelocity = $('#eventVelocity');
    el.pathways = $('#pathways');
    el.liveToggle = $('#liveToggle');
    el.inspector = $('#inspector');
    el.inspectorTitle = $('#inspectorTitle');
    el.nodeTooltip = $('#nodeTooltip');
    el.dialog = $('#commandDialog');
    el.commandInput = $('#commandInput');
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
          node.style.filter = state.frame === 'quality' ? 'saturate(1.2)' : '';
        });
      });
    });
  }

  function initSignalNodes() {
    $$('.signal-node').forEach(function (node) {
      node.addEventListener('click', function () {
        if (el.nodeTooltip) {
          el.nodeTooltip.textContent = node.dataset.node + ': signal trajectory is strengthening.';
          el.nodeTooltip.classList.add('visible');
          setTimeout(function () {
            el.nodeTooltip.classList.remove('visible');
          }, 2200);
        }
        openInspector(node.dataset.node);
      });
    });
  }

  function initDialog() {
    var openBtn = $('#commandButton');
    if (openBtn && el.dialog) openBtn.addEventListener('click', function () { el.dialog.showModal(); });
    if (el.commandInput && el.dialog) {
      el.commandInput.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          el.dialog.close();
          openInspector(event.currentTarget.value || 'Workspace signal');
        }
      });
    }
    document.addEventListener('keydown', function (event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (el.dialog) el.dialog.showModal();
      }
      if (event.key === 'Escape' && el.inspector && el.inspector.classList.contains('open')) closeInspector();
      if (event.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        event.preventDefault();
        toggleLive();
      }
    });
  }

  function initRail() {
    $$('.rail-button').forEach(function (button) {
      button.addEventListener('click', function () {
        var active = $('.rail-button.active');
        if (active) active.classList.remove('active');
        button.classList.add('active');
      });
    });
  }

  function bind(id, event, handler) {
    var node = document.getElementById(id);
    if (node) node.addEventListener(event, handler);
  }

  function initStaticControls() {
    bind('liveToggle', 'click', toggleLive);
    bind('inspectButton', 'click', function () { openInspector(); });
    bind('closeInspector', 'click', closeInspector);
    bind('clearFeed', 'click', function () {
      state.feed = [['violet', 'Feed cleared', 'Listening for the next meaningful change', 'NOW']];
      renderFeed();
    });
    bind('expandFeed', 'click', function () {
      state.feed.push(['acid', 'Deep pattern recognized', 'New connected moments added to your timeline', 'NOW']);
      renderFeed();
    });
    bind('refreshHealth', 'click', function (event) {
      var btn = event.currentTarget;
      var original = btn.innerHTML;
      renderHealth();
      btn.innerHTML = 'Refreshed <span>\u2713</span>';
      setTimeout(function () { btn.innerHTML = original; }, 1600);
    });
  }

  function init() {
    cacheElements();
    drawCharts();
    renderFeed();
    renderHealth();
    updateClock();
    initStaticControls();
    initSegmented();
    initSignalNodes();
    initDialog();
    initRail();
    setInterval(updateClock, 1000);
    setInterval(updateLiveMetrics, 2800);
    setInterval(addLiveEvent, 10000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
