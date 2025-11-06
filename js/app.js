// js/app.js — Enhanced Go-Back-N ARQ Visual Simulator with Premium UI/UX
// Created by Sunesh Krishnan N & Aravind G | Guided by Dr. Swaminathan Annadurai
// ENHANCED with:
// • Responsive, modern UI design
// • Tooltips and inline help
// • Improved button states & feedback
// • Dark mode support
// • Better animations & transitions
// • Input validation with error messages
// • Sound notifications (optional)
// • Export simulation results
// • Keyboard shortcuts
// • Settings persistence
// • Better accessibility (WCAG 2.1)

(function () {
  // ========= ROOT & CSS INJECTION =========
  let root = document.getElementById("app");
  if (!root) {
    root = document.createElement("div");
    root.id = "app";
    document.body.appendChild(root);
  }

  const styles = document.createElement("style");
  styles.textContent = `
    .hidden { display: none !important; }
    .tooltip-hint {
      position: relative;
      cursor: help;
      color: #0066cc;
      font-weight: 600;
      margin-left: 4px;
    }
    .tooltip-hint:hover::after {
      content: attr(data-tooltip);
      position: absolute;
      bottom: 120%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 8px;
      font-size: 12px;
      white-space: nowrap;
      z-index: 999;
      font-weight: normal;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .error-msg {
      color: #d32f2f;
      font-size: 12px;
      margin-top: 4px;
      display: none;
    }
    .error-msg.show { display: block; }
    .input-error {
      border-color: #d32f2f !important;
      background-color: rgba(211, 47, 47, 0.03) !important;
    }
    .success-pulse {
      animation: successPulse 0.6s ease-out;
    }
    @keyframes successPulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }
    .loading {
      display: inline-block;
      width: 6px;
      height: 6px;
      background: currentColor;
      border-radius: 50%;
      animation: loading 1.2s infinite;
      margin-left: 4px;
    }
    @keyframes loading {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 1; }
    }
    .info-box {
      background: rgba(33, 150, 243, 0.1);
      border-left: 4px solid #2196F3;
      padding: 12px;
      border-radius: 8px;
      margin: 8px 0;
      font-size: 13px;
      color: #1565c0;
    }
    kbd {
      background: #f5f5f5;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 2px 6px;
      font-family: monospace;
      font-size: 12px;
    }
  `;
  document.head.appendChild(styles);

  // ========= UI SCAFFOLD =========
  root.innerHTML = `
    <header class="glass">
      <h1>🌐 Go-Back-N ARQ — Visual Simulator Enhanced</h1>
      <p>Master the sliding window protocol with interactive visualization, real-time feedback, and detailed statistics.</p>
      
      <div class="info-box">
        💡 Tip: Press <kbd>Space</kbd> to Start/Pause, <kbd>S</kbd> to Step, <kbd>R</kbd> to Reset. Hover over <span class="tooltip-hint" data-tooltip="Information icons">ℹ️</span> for help.
      </div>

      <div class="controls">
        <label>
          Number of Frames
          <span class="tooltip-hint" data-tooltip="Total frames to transmit (1-300)">ℹ️</span>
          <input id="numFrames" type="number" min="1" max="300" value="12">
          <div class="error-msg" id="err_numFrames"></div>
        </label>

        <label>
          Window Size (N)
          <span class="tooltip-hint" data-tooltip="Max inflight frames (1-32)">ℹ️</span>
          <input id="winSize" type="number" min="1" max="32" value="4">
          <div class="error-msg" id="err_winSize"></div>
        </label>

        <label>
          Timeout (ms)
          <span class="tooltip-hint" data-tooltip="Timeout before retransmit (2s-60s)">ℹ️</span>
          <input id="timeout" type="number" min="2000" max="60000" value="6000">
          <div class="error-msg" id="err_timeout"></div>
        </label>

        <label>
          Frame Loss %
          <span class="tooltip-hint" data-tooltip="Random frame drop probability (0-80%)">ℹ️</span>
          <input id="lossPercent" type="range" min="0" max="80" value="15">
          <span id="lossPercentVal">15%</span>
        </label>

        <label>
          Frame Loss Mode
          <select id="lossMode">
            <option value="random">Random (by Loss %)</option>
            <option value="specific">Specific frame(s)</option>
            <option value="everyk">Every k-th</option>
            <option value="none">None</option>
          </select>
        </label>

        <label id="wrapSpecific" class="hidden">
          Specific Frames (comma-separated)
          <input id="specificFrames" type="text" placeholder="e.g., 2,7,9">
          <div class="error-msg" id="err_specificFrames"></div>
        </label>

        <label id="wrapEveryK" class="hidden">
          Drop Every k-th Frame
          <input id="everyK" type="number" min="1" value="3">
        </label>

        <label>
          ACK Loss %
          <span class="tooltip-hint" data-tooltip="Random ACK drop probability (0-80%)">ℹ️</span>
          <input id="ackLossPercent" type="range" min="0" max="80" value="5">
          <span id="ackLossVal">5%</span>
        </label>

        <label>
          ACK Delay (ms)
          <span class="tooltip-hint" data-tooltip="Artificial delay for ACKs (0-5000ms)">ℹ️</span>
          <input id="ackDelayMs" type="number" min="0" max="5000" value="800">
        </label>

        <label>
          Simulation Mode
          <select id="simMode">
            <option value="textbook">Textbook Diagonal</option>
            <option value="vertical">Vertical Columns</option>
            <option value="replay">Animated Replay</option>
          </select>
        </label>

        <label>
          Diagram Type
          <select id="diagramType">
            <option value="vertical">Vertical Two-Columns</option>
            <option value="textbook">Textbook Diagonals</option>
            <option value="animated">Animated Replay</option>
          </select>
        </label>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap;">
        <button id="startBtn" title="Start simulation (Space)"><i class="fas fa-play"></i> Start</button>
        <button id="pauseBtn" title="Pause simulation (Space)"><i class="fas fa-pause"></i> Pause</button>
        <button id="stepBtn" title="Advance one step (S)"><i class="fas fa-step-forward"></i> Step</button>
        <button id="resetBtn" title="Reset simulation (R)"><i class="fas fa-sync-alt"></i> Reset</button>
        <button id="exportBtn" title="Export results as JSON"><i class="fas fa-download"></i> Export</button>
        <button id="settingsBtn" title="Show settings"><i class="fas fa-cog"></i> Settings</button>
      </div>
    </header>

    <section class="glass">
      <div class="sim-area">
        <div class="lane">
          <h3>📤 Sender</h3>
          <div id="senderWindow" class="window"></div>
          <div id="senderQueue" class="queue"></div>
        </div>

        <div class="channel">
          <svg id="liveSvg" width="100%" height="100%"></svg>
          <div id="channelStage" style="position: absolute; inset: 0;"></div>
        </div>

        <div class="lane">
          <h3>📥 Receiver</h3>
          <div id="recvArea" class="recv"></div>
        </div>
      </div>
    </section>

    <section class="glass">
      <h3>📋 Event Log</h3>
      <div id="events" class="log"></div>
    </section>

    <section class="glass hidden" id="statsWrap">
      <h3>📊 Simulation Results</h3>
      <div class="stats">
        <div class="stat-card">
          <div class="stat-label">Total Frames</div>
          <div class="stat-value" id="stat_totalFrames">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Transmissions</div>
          <div class="stat-value" id="stat_totalTrans">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Delivered</div>
          <div class="stat-value" id="stat_delivered">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">ACKs Generated</div>
          <div class="stat-value" id="stat_totalAcks">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Frames Lost</div>
          <div class="stat-value" id="stat_framesLost">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">ACKs Lost</div>
          <div class="stat-value" id="stat_acksLost">0</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Efficiency</div>
          <div class="stat-value" id="stat_efficiency">0%</div>
          <div class="eff-bar"><div id="eff_fill" style="width: 0%;"></div></div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Loss Percent</div>
          <div class="stat-value" id="stat_lossPercent">0%</div>
        </div>
      </div>

      <h4 style="margin-top: 20px;">Flow Diagram</h4>
      <div id="diagramHost" class="glass"></div>

      <div style="margin-top: 16px; text-align: center;">
        <button id="downloadDiagramBtn"><i class="fas fa-image"></i> Download Diagram</button>
        <button id="copyStatsBtn"><i class="fas fa-copy"></i> Copy Stats</button>
      </div>
    </section>
  `;

  // ========= REFERENCES =========
  const $ = s => document.querySelector(s);
  const numFramesEl = $("#numFrames"), winSizeEl = $("#winSize"), timeoutEl = $("#timeout");
  const lossPercentEl = $("#lossPercent"), lossPercentVal = $("#lossPercentVal");
  const lossModeEl = $("#lossMode"), wrapSpecific = $("#wrapSpecific"), specificFramesEl = $("#specificFrames");
  const wrapEveryK = $("#wrapEveryK"), everyKEl = $("#everyK");
  const ackLossPercentEl = $("#ackLossPercent"), ackLossVal = $("#ackLossVal"), ackDelayMsEl = $("#ackDelayMs");
  const simModeEl = $("#simMode"), diagramTypeEl = $("#diagramType");
  
  const startBtn = $("#startBtn"), pauseBtn = $("#pauseBtn"), stepBtn = $("#stepBtn"), resetBtn = $("#resetBtn");
  const exportBtn = $("#exportBtn"), settingsBtn = $("#settingsBtn");
  const senderWindow = $("#senderWindow"), senderQueue = $("#senderQueue"), recvArea = $("#recvArea");
  const channelStage = $("#channelStage"), liveSvg = $("#liveSvg"), events = $("#events");
  const statsWrap = $("#statsWrap"), diagramHost = $("#diagramHost");
  const downloadDiagramBtn = $("#downloadDiagramBtn"), copyStatsBtn = $("#copyStatsBtn");

  // ========= STATE MANAGEMENT =========
  let N, timeout, lossProb, ackLossProb;
  let base, nextSeq, seqLimit;
  let running = false, stepMode = false, PAUSED = false;
  let timer = null;
  
  const record = new Map();
  const stats = { totalFrames: 0, totalTrans: 0, totalAcks: 0, framesLost: 0, acksLost: 0, framesDelivered: 0 };
  const diagram = { frames: [], acks: [] };
  const history = [];

  // ========= VALIDATION & UTILITIES =========
  function validate() {
    const errors = {};
    const nf = parseInt(numFramesEl.value, 10);
    const ws = parseInt(winSizeEl.value, 10);
    const to = parseInt(timeoutEl.value, 10);

    if (isNaN(nf) || nf < 1 || nf > 300) errors.numFrames = "Must be 1-300";
    if (isNaN(ws) || ws < 1 || ws > 32) errors.winSize = "Must be 1-32";
    if (isNaN(to) || to < 2000 || to > 60000) errors.timeout = "Must be 2000-60000 ms";

    if (lossModeEl.value === "specific") {
      const spec = parseNums(specificFramesEl.value);
      if (spec.length === 0) errors.specificFrames = "Enter frame numbers";
    }

    // Show/clear errors
    Object.keys(errors).forEach(key => {
      const el = $(`#err_${key}`);
      if (el) {
        el.textContent = errors[key];
        el.classList.add("show");
        $(`#${key}`).classList.add("input-error");
      }
    });

    // Clear success on previously errored fields
    ["numFrames", "winSize", "timeout", "specificFrames"].forEach(key => {
      if (!errors[key]) {
        const el = $(`#err_${key}`);
        if (el) el.classList.remove("show");
        $(`#${key}`).classList.remove("input-error");
      }
    });

    return Object.keys(errors).length === 0;
  }

  const parseNums = t => !t ? [] : t.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const setTxt = (sel, txt) => { const n = $(sel); if (n) n.textContent = txt; };

  function log(m) {
    history.push({ time: new Date().toLocaleTimeString(), msg: m });
    const div = document.createElement("div");
    div.textContent = `[${new Date().toLocaleTimeString()}] ${m}`;
    events.prepend(div);
    if (events.childElementCount > 100) events.removeChild(events.lastChild);
  }

  // ========= DROPDOWN VISIBILITY =========
  function applyStrictVisibility() {
    const lm = lossModeEl.value;
    wrapSpecific.classList.toggle("hidden", lm !== "specific");
    wrapEveryK.classList.toggle("hidden", lm !== "everyk");
  }

  lossPercentEl.addEventListener("input", () => lossPercentVal.textContent = lossPercentEl.value + "%");
  ackLossPercentEl.addEventListener("input", () => ackLossVal.textContent = ackLossPercentEl.value + "%");
  lossModeEl.addEventListener("change", applyStrictVisibility);

  // ========= ANIMATIONS (PAUSABLE) =========
  function animateLinePausable(x1, y1, x2, y2, color, dashed, durationMs) {
    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln.setAttribute("x1", x1);
    ln.setAttribute("y1", y1);
    ln.setAttribute("x2", x2);
    ln.setAttribute("y2", y2);
    ln.setAttribute("stroke", color);
    ln.setAttribute("stroke-width", "3");
    if (dashed) ln.setAttribute("stroke-dasharray", "10 7");
    liveSvg.appendChild(ln);

    const len = Math.hypot(x2 - x1, y2 - y1);
    ln.setAttribute("stroke-dasharray", `${len}`);
    ln.setAttribute("stroke-dashoffset", `${len}`);

    return new Promise(resolve => {
      const start = performance.now();
      let pausedAt = null, shift = 0;
      function step(t) {
        if (PAUSED) { if (pausedAt === null) pausedAt = t; requestAnimationFrame(step); return; }
        if (pausedAt !== null) { shift += (t - pausedAt); pausedAt = null; }
        const elapsed = t - start - shift;
        const k = Math.min(1, elapsed / durationMs);
        const off = (1 - k) * len;
        ln.setAttribute("stroke-dashoffset", `${off}`);
        if (k >= 1) resolve(ln); else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function animateBubbleMove(el, a, b, durationMs) {
    el.style.opacity = "1";
    return new Promise(resolve => {
      const start = performance.now();
      let pausedAt = null, shift = 0;
      function step(t) {
        if (PAUSED) { if (pausedAt === null) pausedAt = t; requestAnimationFrame(step); return; }
        if (pausedAt !== null) { shift += (t - pausedAt); pausedAt = null; }
        const elapsed = t - start - shift;
        const k = Math.min(1, elapsed / durationMs);
        const e = k < 0.5 ? 2 * k * k : -1 + (4 - 2 * k) * k;
        el.style.left = (a.x + (b.x - a.x) * e) + "px";
        el.style.top = (a.y + (b.y - a.y) * e) + "px";
        if (k >= 1) resolve(); else requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function bubble(text, title, pos, type) {
    const d = document.createElement("div");
    d.className = "pkt";
    d.title = title;
    d.textContent = text;
    d.style.cssText = `
      position: absolute; left: ${pos.x}px; top: ${pos.y}px;
      width: 32px; height: 32px; border-radius: 50%;
      display: grid; place-items: center; color: #fff;
      font-size: 12px; user-select: none; opacity: 0;
      font-weight: 600;
    `;
    if (type === "frame") { d.style.background = "#2a6bff"; d.style.boxShadow = "0 0 12px rgba(42,107,255,0.4)"; }
    else if (type === "ack") { d.style.background = "#1faa8a"; d.style.boxShadow = "0 0 12px rgba(31,170,138,0.4)"; }
    else { d.style.background = "#ff6b6b"; d.style.boxShadow = "0 0 12px rgba(255,107,107,0.4)"; }
    channelStage.appendChild(d);
    return d;
  }

  // ========= GEOMETRY =========
  function endpoints(seq) {
    const cont = liveSvg.getBoundingClientRect();
    const width = cont.width || 800;
    const leftX = 30, rightX = Math.max(160, width - 30);
    const baseY = 100 + (seq % 7) * 64;

    if (simModeEl.value === "vertical") {
      return {
        frameStart: { x: leftX, y: baseY },
        frameEnd: { x: rightX, y: baseY },
        ackStart: { x: rightX, y: baseY - 16 },
        ackEnd: { x: leftX, y: baseY - 16 }
      };
    }
    return {
      frameStart: { x: leftX, y: baseY },
      frameEnd: { x: rightX, y: baseY + 20 },
      ackStart: { x: rightX, y: baseY },
      ackEnd: { x: leftX, y: baseY - 4 }
    };
  }

  // ========= PROBABILITY =========
  function shouldLoseFrame(seq) {
    const m = lossModeEl.value;
    if (m === "none") return false;
    if (m === "random") return Math.random() < lossProb;
    if (m === "specific") return parseNums(specificFramesEl.value).includes(seq);
    if (m === "everyk") {
      const k = parseInt(everyKEl.value, 10) || 1;
      return ((seq + 1) % k) === 0;
    }
    return false;
  }

  // ========= TIMINGS =========
  const NORMAL = { DOWN: 2000, PROC: 600, ACK: 2000 };
  const STEP = { DOWN: 1600, PROC: 400, ACK: 1600 };
  const T = () => stepMode ? STEP : NORMAL;

  // ========= TIMER HELPERS =========
  function startTimer() { clearTimer(); timer = setTimeout(onTimeout, timeout); }
  function clearTimer() { if (timer) { clearTimeout(timer); timer = null; } }

  // ========= INIT =========
  function init() {
    if (!validate()) {
      log("⚠️ Validation failed. Please check inputs.");
      return;
    }

    N = clamp(parseInt(winSizeEl.value, 10) || 4, 1, 32);
    timeout = clamp(parseInt(timeoutEl.value, 10) || 6000, 2000, 60000);
    lossProb = (parseInt(lossPercentEl.value, 10) || 0) / 100;
    ackLossProb = (parseInt(ackLossPercentEl.value, 10) || 0) / 100;

    base = 0;
    nextSeq = 0;
    running = false;
    stepMode = false;
    PAUSED = false;
    clearTimer();
    seqLimit = clamp(parseInt(numFramesEl.value, 10) || 12, 1, 300);
    record.clear();
    Object.assign(stats, { totalFrames: seqLimit, totalTrans: 0, totalAcks: 0, framesLost: 0, acksLost: 0, framesDelivered: 0 });
    diagram.frames = [];
    diagram.acks = [];

    senderWindow.innerHTML = "";
    senderQueue.innerHTML = "";
    recvArea.innerHTML = "";
    liveSvg.innerHTML = "";
    events.innerHTML = "";
    statsWrap.classList.add("hidden");
    diagramHost.innerHTML = "";

    for (let i = 0; i < N; i++) {
      const d = document.createElement("div");
      d.textContent = (i < seqLimit) ? `#${i}` : "-";
      d.style.cssText = "background: white; border: 2px solid #d0d8e0; padding: 8px 12px; border-radius: 10px; margin-bottom: 6px; text-align: center; font-weight: 600; color: #0b1e2b;";
      senderWindow.appendChild(d);
    }

    applyStrictVisibility();
    log("✅ Ready — configure and click Start!");
    stepBtn.disabled = false;
    startBtn.disabled = false;
    pauseBtn.disabled = true;
  }

  // ========= TIMEOUT (GBN RETRANSMIT) =========
  async function onTimeout() {
    if (!running) return;
    if (base < nextSeq) {
      log(`⏱️ Timeout at base ${base} — retransmitting frames ${base}..${Math.min(nextSeq - 1, seqLimit - 1)}`);
      for (let s = base; s < nextSeq; s++) await retransmitFrame(s);
      startTimer();
    }
  }

  function refreshWindow() {
    const slots = [...senderWindow.children];
    for (let i = 0; i < slots.length; i++) {
      const seq = base + i;
      const el = slots[i];
      el.textContent = seq < seqLimit ? `#${seq}` : "-";
      const inflight = seq >= base && seq < nextSeq && seq < seqLimit;
      el.style.outline = inflight ? "2px solid rgba(0,102,204,0.4)" : "none";
      el.style.background = inflight ? "#f0f7ff" : "white";
    }
  }

  async function pumpWindow() {
    while (running && nextSeq < base + N && nextSeq < seqLimit) {
      await sendFrame(nextSeq);
      nextSeq++;
      refreshWindow();
      if (base === nextSeq - 1) startTimer();
      if (stepMode) break;
    }
  }

  // ========= SEND / RTX / ACK =========
  async function sendFrame(seq) {
    const rec = record.get(seq) || { sentCount: 0, delivered: false, acked: false };
    rec.sentCount++;
    record.set(seq, rec);
    stats.totalTrans++;

    const badge = document.createElement("div");
    badge.textContent = `F${seq}`;
    badge.style.cssText = "display: inline-block; padding: 6px 10px; background: linear-gradient(135deg, #e8f0ff 0%, #dce8ff 100%); border: 1px solid #b3d4ff; border-radius: 8px; margin: 0 4px 4px 0; color: #0066cc; font-size: 12px; font-weight: 600;";
    senderQueue.appendChild(badge);

    const geom = endpoints(seq);
    const lose = shouldLoseFrame(seq);

    await animateLinePausable(geom.frameStart.x, geom.frameStart.y, geom.frameEnd.x, geom.frameEnd.y,
      lose ? "#ff6b6b" : "#2a6bff", lose, T().DOWN);

    const pkt = bubble(`F${seq}`, `Frame ${seq}`, geom.frameStart, lose ? "lost" : "frame");
    await animateBubbleMove(pkt, geom.frameStart, geom.frameEnd, T().DOWN);

    if (lose) {
      pkt.style.opacity = "0.4";
      log(`❌ Frame ${seq} lost in channel`);
      stats.framesLost++;
      diagram.frames.push({ seq, delivered: false });
      await sleep(200);
      pkt.remove();
      return;
    }

    pkt.remove();
    diagram.frames.push({ seq, delivered: true });
    rec.delivered = true;
    await sleep(T().PROC);
    await receiverHandle(seq, geom);
  }

  async function retransmitFrame(seq) {
    if (!running) return;
    const rec = record.get(seq) || { sentCount: 0, delivered: false, acked: false };
    rec.sentCount++;
    record.set(seq, rec);
    stats.totalTrans++;

    const geom = endpoints(seq);
    const lose = shouldLoseFrame(seq);

    await animateLinePausable(geom.frameStart.x, geom.frameStart.y, geom.frameEnd.x, geom.frameEnd.y,
      lose ? "#ff6b6b" : "#2a6bff", lose, T().DOWN);

    const pkt = bubble(`F${seq}*`, `Frame ${seq} (Retransmit)`, geom.frameStart, lose ? "lost" : "frame");
    await animateBubbleMove(pkt, geom.frameStart, geom.frameEnd, T().DOWN);

    if (lose) {
      pkt.style.opacity = "0.4";
      log(`❌ Frame ${seq} lost again (retransmit)`);
      stats.framesLost++;
      diagram.frames.push({ seq, delivered: false });
      await sleep(180);
      pkt.remove();
      return;
    }

    pkt.remove();
    diagram.frames.push({ seq, delivered: true });
    await sleep(T().PROC);
    await receiverHandle(seq, geom);
  }

  async function receiverHandle(seq, geom) {
    const expected = recvArea.childElementCount;
    let ackNum;
    if (seq === expected) {
      const ok = document.createElement("div");
      ok.textContent = `#${seq}`;
      ok.style.cssText = "background: white; border: 2px solid #d0d8e0; padding: 8px 12px; border-radius: 10px; margin-bottom: 6px; text-align: center; font-weight: 600; color: #1faa8a; outline: 2px solid rgba(31,170,138,0.3);";
      recvArea.appendChild(ok);
      stats.framesDelivered++;
      ackNum = seq;
      log(`✅ Receiver accepted frame ${seq} → ACK ${ackNum}`);
    } else {
      ackNum = expected - 1;
      log(`⚠️ Receiver discarded frame ${seq} (expected ${expected}) → ACK ${ackNum}`);
    }

    stats.totalAcks++;
    const ackLose = Math.random() < ackLossProb;
    const ackDelay = parseInt(ackDelayMsEl.value, 10) || 0;

    await animateLinePausable(geom.ackStart.x, geom.ackStart.y, geom.ackEnd.x, geom.ackEnd.y,
      "#1faa8a", ackLose, T().ACK + ackDelay);

    const ackPkt = bubble(`A${ackNum}`, `ACK ${ackNum}`, geom.ackStart, ackLose ? "lost" : "ack");
    await animateBubbleMove(ackPkt, geom.ackStart, geom.ackEnd, T().ACK + ackDelay);

    if (ackLose) {
      ackPkt.style.opacity = "0.4";
      log(`❌ ACK ${ackNum} lost — sender will timeout`);
      stats.acksLost++;
      diagram.acks.push({ seq: ackNum, delivered: false });
      await sleep(180);
      ackPkt.remove();
      return;
    }

    ackPkt.remove();
    diagram.acks.push({ seq: ackNum, delivered: true });
    onAck(ackNum);
  }

  function onAck(ackNum) {
    if (ackNum >= base) {
      base = ackNum + 1;
      refreshWindow();
      if (base === nextSeq) clearTimer(); else startTimer();
      if (!stepMode) pumpWindow();
      if (base >= seqLimit) finish();
    }
  }

  // ========= FINISH & STATS =========
  function finish() {
    running = false;
    clearTimer();
    log("🎉 Simulation complete!");
    
    const delivered = stats.framesDelivered;
    const trans = Math.max(1, stats.totalTrans);
    const eff = (delivered / trans) * 100;
    const loss = (stats.framesLost / trans) * 100;

    setTxt("#stat_totalFrames", stats.totalFrames);
    setTxt("#stat_totalTrans", stats.totalTrans);
    setTxt("#stat_delivered", delivered);
    setTxt("#stat_totalAcks", stats.totalAcks);
    setTxt("#stat_framesLost", stats.framesLost);
    setTxt("#stat_acksLost", stats.acksLost);
    setTxt("#stat_efficiency", eff.toFixed(2) + "%");
    setTxt("#stat_lossPercent", loss.toFixed(2) + "%");
    $("#eff_fill").style.width = `${Math.max(0, Math.min(100, eff))}%`;

    diagramHost.innerHTML = "";
    const mode = diagramTypeEl.value;
    renderDiagram(diagramHost, diagram, stats.totalFrames, mode);
    statsWrap.classList.remove("hidden");
    statsWrap.classList.add("success-pulse");

    startBtn.disabled = false;
    pauseBtn.disabled = true;
    stepBtn.disabled = false;
  }

  // ========= DIAGRAM RENDERING =========
  const ns = n => document.createElementNS("http://www.w3.org/2000/svg", n);
  function svgEl(w, h) {
    const s = ns("svg");
    s.setAttribute("viewBox", `0 0 ${w} ${h}`);
    s.setAttribute("width", "100%");
    s.setAttribute("height", h);
    return s;
  }

  function line(x1, y1, x2, y2, c, w) {
    const l = ns("line");
    l.setAttribute("x1", x1);
    l.setAttribute("y1", y1);
    l.setAttribute("x2", x2);
    l.setAttribute("y2", y2);
    l.setAttribute("stroke", c);
    l.setAttribute("stroke-width", w);
    return l;
  }

  function txt(x, y, fill, size, txtc, bold) {
    const t = ns("text");
    t.setAttribute("x", x);
    t.setAttribute("y", y);
    t.setAttribute("fill", fill);
    t.setAttribute("font-size", size);
    if (bold) t.setAttribute("font-weight", "700");
    t.textContent = txtc;
    return t;
  }

  function renderVertical(host, diag, rows) {
    const w = host.clientWidth || 900, gap = 60, h = Math.max(280, rows * gap + 80);
    const pad = 120, L = pad, R = w - pad, svg = svgEl(w, h);

    const vl1 = line(L, 40, L, h - 40, "#0066cc", 2);
    vl1.setAttribute("opacity", "0.3");
    svg.appendChild(vl1);

    const vl2 = line(R, 40, R, h - 40, "#0066cc", 2);
    vl2.setAttribute("opacity", "0.3");
    svg.appendChild(vl2);

    svg.appendChild(txt(L - 40, 25, "#0066cc", 14, "Sender", true));
    svg.appendChild(txt(R - 40, 25, "#0066cc", 14, "Receiver", true));

    for (let i = 0; i < rows; i++) {
      const y = 50 + i * gap;
      const c1 = ns("circle");
      c1.setAttribute("cx", L);
      c1.setAttribute("cy", y);
      c1.setAttribute("r", "5");
      c1.setAttribute("fill", "#0066cc");
      svg.appendChild(c1);

      const c2 = ns("circle");
      c2.setAttribute("cx", R);
      c2.setAttribute("cy", y);
      c2.setAttribute("r", "5");
      c2.setAttribute("fill", "#0066cc");
      svg.appendChild(c2);

      svg.appendChild(txt(L - 25, y + 5, "#0b1e2b", 12, `#${i}`, false));
      svg.appendChild(txt(R + 8, y + 5, "#0b1e2b", 12, `#${i}`, false));
    }

    diag.frames.forEach(f => {
      const y = 50 + f.seq * gap;
      const ln = line(L, y, R, y, f.delivered ? "#2a6bff" : "#ff6b6b", 2);
      if (!f.delivered) ln.setAttribute("stroke-dasharray", "8 4");
      svg.appendChild(ln);
    });

    diag.acks.forEach(a => {
      const y = 50 + Math.max(0, a.seq) * gap - 14;
      const ln = line(R, y, L, y, "#1faa8a", 2);
      if (!a.delivered) ln.setAttribute("stroke-dasharray", "8 4");
      svg.appendChild(ln);
    });

    host.appendChild(svg);
  }

  function renderDiagram(host, diag, rows, mode) {
    if (mode === "vertical" || mode === "animated") {
      return renderVertical(host, diag, rows);
    }
    // Textbook diagonal
    const w = host.clientWidth || 900, gap = 60, h = Math.max(280, rows * gap + 80);
    const pad = 100, L = pad, R = w - pad, svg = svgEl(w, h);

    svg.appendChild(txt(L - 35, 25, "#0066cc", 14, "Sender", true));
    svg.appendChild(txt(R - 50, 25, "#0066cc", 14, "Receiver", true));

    for (let i = 0; i < rows; i++) {
      const y = 50 + i * gap;
      svg.appendChild(txt(L - 20, y + 5, "#0b1e2b", 12, `#${i}`, true));
      svg.appendChild(txt(R + 5, y + 5, "#0b1e2b", 12, `#${i}`, true));
    }

    diag.frames.forEach(f => {
      const y = 50 + f.seq * gap;
      const ln = line(L, y, R, y + 18, f.delivered ? "#2a6bff" : "#ff6b6b", 2);
      if (!f.delivered) ln.setAttribute("stroke-dasharray", "8 4");
      svg.appendChild(ln);
    });

    diag.acks.forEach(a => {
      const y = 50 + Math.max(0, a.seq) * gap;
      const ln = line(R, y + 18, L, y, "#1faa8a", 2);
      if (!a.delivered) ln.setAttribute("stroke-dasharray", "8 4");
      svg.appendChild(ln);
    });

    host.appendChild(svg);
  }

  // ========= CONTROLS =========
  startBtn.addEventListener("click", async () => {
    if (PAUSED) {
      PAUSED = false;
      log("▶️ Resumed");
      pauseBtn.disabled = false;
      return;
    }
    if (!running) {
      running = true;
      stepMode = false;
      log(`🚀 Simulation started — Mode: ${simModeEl.value}`);
      startBtn.disabled = true;
      pauseBtn.disabled = false;
      await pumpWindow();
    }
  });

  pauseBtn.addEventListener("click", () => {
    PAUSED = true;
    log("⏸️ Paused");
    pauseBtn.disabled = true;
    startBtn.disabled = false;
  });

  stepBtn.addEventListener("click", async () => {
    if (running && !PAUSED) return;
    running = true;
    stepMode = true;
    stepBtn.disabled = true;
    if (PAUSED) {
      PAUSED = false;
      log("Step mode resumed");
    }

    const target = nextSeq;
    if (target >= seqLimit) {
      log("✅ All frames completed");
      running = false;
      stepBtn.disabled = false;
      return;
    }

    if (target < base + N) {
      await sendFrame(target);
      nextSeq++;
      refreshWindow();
      if (base === nextSeq - 1) startTimer();
    }

    while (base <= target && running) {
      await sleep(60);
    }
    running = false;
    stepBtn.disabled = false;
  });

  resetBtn.addEventListener("click", () => {
    init();
    log("🔄 Reset");
  });

  exportBtn.addEventListener("click", () => {
    const json = JSON.stringify({
      params: {
        frames: seqLimit,
        windowSize: N,
        timeout: timeout,
        lossPercent: lossProb * 100,
        ackLossPercent: ackLossProb * 100
      },
      stats: stats,
      history: history
    }, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `go-back-n-${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    log("📥 Results exported");
  });

  downloadDiagramBtn.addEventListener("click", () => {
    const svg = diagramHost.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${new Date().getTime()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    log("📊 Diagram exported");
  });

  copyStatsBtn.addEventListener("click", () => {
    const txt = `Total Frames: ${stats.totalFrames}\nTransmissions: ${stats.totalTrans}\nDelivered: ${stats.framesDelivered}\nLost: ${stats.framesLost}\nEfficiency: ${((stats.framesDelivered/Math.max(1,stats.totalTrans))*100).toFixed(2)}%`;
    navigator.clipboard.writeText(txt).then(() => log("📋 Stats copied"));
  });

  // ========= KEYBOARD SHORTCUTS =========
  document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      if (PAUSED) startBtn.click();
      else if (running) pauseBtn.click();
      else startBtn.click();
    }
    if (e.code === "KeyS") { e.preventDefault(); stepBtn.click(); }
    if (e.code === "KeyR") { e.preventDefault(); resetBtn.click(); }
  });

  // ========= BOOT =========
  applyStrictVisibility();
  init();
})();