// js/app.js — Left→Right Cinematic Go-Back-N (responsive, slow, with lines + conditional controls)
(function () {
  // Build UI inside #app
  const app = document.getElementById("app");
  app.innerHTML = `
    <header class="glass">
      <h1>Go-Back-N ARQ — Neon Glass</h1>
      <p>Sender (left) → Receiver (right). Packets glide right; ACKs glide left. Summary appears only after the last ACK.</p>
      <div class="controls">
        <label>Number of frames
          <input id="numFrames" type="number" min="1" max="300" value="12">
        </label>
        <label>Window size (N)
          <input id="winSize" type="number" min="1" max="32" value="4">
        </label>
        <label>Timeout (ms)
          <input id="timeout" type="number" min="400" value="3500">
        </label>
        <label>Loss %
          <input id="lossPercent" type="range" min="0" max="80" value="10">
          <span id="lossPercentVal">10%</span>
        </label>

        <label>Frame Loss Mode
          <select id="lossMode">
            <option value="random">Random (by Loss %)</option>
            <option value="specific">Specific frame(s)</option>
            <option value="everyk">Every k-th</option>
            <option value="none">None</option>
          </select>
        </label>
        <label id="labelSpecific" class="hidden">Specific frames (comma)
          <input id="specificFrames" type="text" placeholder="e.g. 2,7,9">
        </label>
        <label id="labelEveryK" class="hidden">k (every k-th)
          <input id="everyK" type="number" min="1" value="3">
        </label>

        <label>Frame Delay Mode
          <select id="frameDelayMode">
            <option value="none">None</option>
            <option value="specific">Delay specific frame(s)</option>
            <option value="everyk">Delay every k-th</option>
          </select>
        </label>
        <label id="labelDelaySpec" class="hidden">Delay frame # / k
          <input id="frameDelaySpec" type="text" placeholder="e.g. 5 or 3,6">
        </label>
        <label id="labelDelayMs" class="hidden">Frame delay (ms)
          <input id="frameDelayMs" type="number" min="0" value="1200">
        </label>

        <label>ACK Loss %
          <input id="ackLossPercent" type="range" min="0" max="80" value="5">
          <span id="ackLossVal">5%</span>
        </label>
        <label>ACK Delay (ms)
          <input id="ackDelayMs" type="number" min="0" value="800">
        </label>
      </div>

      <div class="buttons">
        <button id="startBtn">Start</button>
        <button id="pauseBtn">Pause</button>
        <button id="stepBtn">Step</button>
        <button id="resetBtn">Reset</button>
      </div>
    </header>

    <section class="glass sim-area">
      <div class="lane" id="senderLane">
        <h3>Sender</h3>
        <div class="window" id="senderWindow"></div>
        <div class="queue" id="senderQueue"></div>
      </div>

      <div class="channel glass" id="channel">
        <div id="channelStage"></div>
      </div>

      <div class="lane" id="receiverLane">
        <h3>Receiver</h3>
        <div class="recv" id="recvArea"></div>
      </div>
    </section>

    <section class="glass">
      <h3 style="text-align:center;color:#00ffff;margin-bottom:6px">Event Log</h3>
      <div id="events" class="log"></div>
    </section>

    <section class="glass hidden" id="statsWrap">
      <h3 style="text-align:center;color:#00ffff;margin-bottom:6px">Summary & Statistics</h3>
      <div class="stats">
        <div>Total original frames: <span id="stat_totalFrames">0</span></div>
        <div>Total transmissions (incl. retransmissions): <span id="stat_totalTrans">0</span></div>
        <div>Total ACKs generated: <span id="stat_totalAcks">0</span></div>
        <div>Frames lost: <span id="stat_framesLost">0</span></div>
        <div>ACKs lost: <span id="stat_acksLost">0</span></div>
        <div>Frames delayed: <span id="stat_framesDelayed">0</span></div>
        <div>Efficiency: <span id="stat_efficiency">0%</span></div>
        <div>Loss percent (frames/transmissions): <span id="stat_lossPercent">0%</span></div>
      </div>
      <div style="margin-top:10px">
        <h4 style="color:#a9c2d6;margin-bottom:6px">Flow Diagram (final)</h4>
        <div id="flowDiagram" class="log" style="max-height:260px"></div>
      </div>
    </section>

    <footer>CN Project • Go-Back-N • neon cinema 😎</footer>
  `;

  // --- DOM refs
  const $ = s => document.querySelector(s);
  const numFramesEl = $("#numFrames");
  const winSizeEl = $("#winSize");
  const timeoutEl = $("#timeout");
  const lossPercentEl = $("#lossPercent");
  const lossPercentVal = $("#lossPercentVal");
  const lossModeEl = $("#lossMode");
  const labelSpecific = $("#labelSpecific");
  const specificFramesEl = $("#specificFrames");
  const labelEveryK = $("#labelEveryK");
  const everyKEl = $("#everyK");

  const frameDelayModeEl = $("#frameDelayMode");
  const labelDelaySpec = $("#labelDelaySpec");
  const labelDelayMs = $("#labelDelayMs");
  const frameDelaySpecEl = $("#frameDelaySpec");
  const frameDelayMsEl = $("#frameDelayMs");

  const ackLossPercentEl = $("#ackLossPercent");
  const ackLossVal = $("#ackLossVal");
  const ackDelayMsEl = $("#ackDelayMs");

  const startBtn = $("#startBtn");
  const pauseBtn = $("#pauseBtn");
  const stepBtn = $("#stepBtn");
  const resetBtn = $("#resetBtn");

  const senderWindow = $("#senderWindow");
  const senderQueue = $("#senderQueue");
  const recvArea = $("#recvArea");
  const channelStage = $("#channelStage");
  const events = $("#events");
  const statsWrap = $("#statsWrap");
  const flowDiagram = $("#flowDiagram");

  // --- UI: conditional inputs + labels
  const updateLossUI = () => {
    const v = lossModeEl.value;
    labelSpecific.classList.toggle("hidden", v !== "specific");
    labelEveryK.classList.toggle("hidden", v !== "everyk");
  };
  const updateDelayUI = () => {
    const v = frameDelayModeEl.value;
    const on = v !== "none";
    labelDelaySpec.classList.toggle("hidden", !on);
    labelDelayMs.classList.toggle("hidden", !on);
  };
  lossPercentEl.addEventListener("input", () => (lossPercentVal.textContent = lossPercentEl.value + "%"));
  ackLossPercentEl.addEventListener("input", () => (ackLossVal.textContent = ackLossPercentEl.value + "%"));
  lossModeEl.addEventListener("change", updateLossUI);
  frameDelayModeEl.addEventListener("change", updateDelayUI);

  // --- State
  let N, timeout, lossProb, ackLossProb;
  let base, nextseq, seqLimit;
  let sentFrames = []; // {seq, acked, sends, dom}
  let running = false;
  let timer = null;

  const stats = {
    totalFrames: 0, totalTrans: 0, totalAcks: 0,
    framesLost: 0, acksLost: 0, framesDelayed: 0
  };

  // --- Init/Reset
  function init() {
    N = clamp(parseInt(winSizeEl.value, 10) || 4, 1, 32);
    timeout = clamp(parseInt(timeoutEl.value, 10) || 3500, 400, 60000);
    lossProb = (parseInt(lossPercentEl.value, 10) || 0) / 100;
    ackLossProb = (parseInt(ackLossPercentEl.value, 10) || 0) / 100;

    base = 0; nextseq = 0;
    seqLimit = clamp(parseInt(numFramesEl.value, 10) || 12, 1, 300);
    sentFrames = [];
    running = false;
    clearTimer();

    // stats
    stats.totalFrames = seqLimit;
    stats.totalTrans = 0; stats.totalAcks = 0;
    stats.framesLost = 0; stats.acksLost = 0; stats.framesDelayed = 0;

    // UI reset
    senderWindow.innerHTML = "";
    senderQueue.innerHTML = "";
    recvArea.innerHTML = "";
    channelStage.innerHTML = "";
    events.innerHTML = "";
    statsWrap.classList.add("hidden");
    flowDiagram.innerHTML = "";

    // build sender window slots
    for (let i = 0; i < N; i++) {
      const s = document.createElement("div");
      s.className = "frame";
      s.textContent = (base + i) < seqLimit ? `#${base + i}` : "-";
      senderWindow.appendChild(s);
    }

    updateLossUI();
    updateDelayUI();
    log("Ready — Start for slow cinematic left→right flow.");
  }
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const log = msg => events.prepend(Object.assign(document.createElement("div"),{textContent:`[${new Date().toLocaleTimeString()}] ${msg}`}));

  // --- Rules
  const parseNums = txt => !txt ? [] : txt.split(",").map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
  const shouldLose = seq => {
    const mode = lossModeEl.value;
    if (mode === "none") return false;
    if (mode === "random") return Math.random() < lossProb;
    if (mode === "specific") return parseNums(specificFramesEl.value).includes(seq);
    if (mode === "everyk") { const k = parseInt(everyKEl.value,10)||1; return ((seq+1)%k)===0; }
    return false;
  };
  const shouldDelay = seq => {
    const mode = frameDelayModeEl.value;
    if (mode === "none") return false;
    const spec = parseNums(frameDelaySpecEl.value);
    if (mode === "specific") return spec.includes(seq);
    if (mode === "everyk") { const k = parseInt(frameDelaySpecEl.value,10)||1; return ((seq+1)%k)===0; }
    return false;
  };

  // --- Window UI refresh
  function refreshWindow(){
    const frames = [...senderWindow.querySelectorAll(".frame")];
    frames.forEach((f,i)=>{
      const seq = base + i;
      f.textContent = seq < seqLimit ? `#${seq}` : '-';
      f.classList.toggle("active", seq >= base && seq < nextseq && seq < seqLimit);
    });
  }

  // --- Core sending
  function sendIfPossible(){
    while(nextseq < base + N && nextseq < seqLimit){
      sendFrame(nextseq);
      nextseq++;
    }
    refreshWindow();
  }

  // Animated packet left→right
  function sendFrame(seq, isRetrans=false){
    // badge in queue
    const badge = document.createElement("div");
    badge.className = "packet";
    badge.style.position = "static";
    badge.textContent = `F${seq}`;
    senderQueue.appendChild(badge);

    stats.totalTrans++;

    // positions
    const stg = channelStage.getBoundingClientRect();
    const W = channelStage.clientWidth, H = channelStage.clientHeight;
    const start = { x: 16,            y: 80 + (seq % 4) * 48 };
    const end   = { x: W - 16 - 84,   y: start.y + 40 }; // slight down slope

    // line
    const line = document.createElement("div");
    line.className = "neon-line";
    placeLine(line, start, end);
    channelStage.appendChild(line);

    // packet
    const p = document.createElement("div");
    p.className = "packet";
    p.textContent = `F${seq}`;
    channelStage.appendChild(p);

    // delay/loss decisions (very slow)
    const delayed = shouldDelay(seq);
    const extraDelay = delayed ? Math.max(0, parseInt(frameDelayMsEl.value,10)||0) : 0;
    if (delayed) { p.classList.add("delayed"); stats.framesDelayed++; }

    const lose = shouldLose(seq);

    // animate (3.2s base + delay)
    const travel = 3200 + extraDelay;
    animateLR(p, start, end, travel);

    setTimeout(()=>{
      if(lose){
        p.classList.add("lost");
        log(`Frame ${seq} lost in channel.`);
        stats.framesLost++;
        setTimeout(()=>{ safeRemove(p); fadeLine(line); }, 700);
      } else {
        safeRemove(p); fadeLine(line);
        onReceiverGot(seq);
      }
    }, travel + 80);

    // record for window
    let rec = sentFrames.find(s=>s.seq===seq);
    if(!rec){ rec = {seq, acked:false, sends:1, dom:badge}; sentFrames.push(rec); }
    else { rec.sends++; badge.style.opacity = "0.9"; }

    if(base === seq) startTimer();
  }

  // Receiver behaviour (GBN)
  function onReceiverGot(seq){
    const expected = recvArea.childElementCount;
    if(seq === expected){
      const blk = document.createElement("div");
      blk.className = "frame active";
      blk.textContent = `#${seq}`;
      recvArea.appendChild(blk);
      log(`Receiver accepted ${seq}. Sending ACK ${seq}.`);
      sendAck(seq);
    } else {
      const ackFor = expected - 1;
      log(`Receiver discarded ${seq} (expected ${expected}). Sending ACK ${ackFor}.`);
      sendAck(ackFor);
    }
  }

  // Animated ACK right→left
  function sendAck(ackSeq){
    stats.totalAcks++;

    const W = channelStage.clientWidth, H = channelStage.clientHeight;
    const start = { x: W - 16 - 84, y: 80 + (ackSeq % 4) * 48 + 40 };
    const end   = { x: 16,          y: start.y - 40 };

    const line = document.createElement("div");
    line.className = "neon-line neon-line-ack";
    placeLine(line, start, end);
    channelStage.appendChild(line);

    const a = document.createElement("div");
    a.className = "packet ack";
    a.textContent = `ACK${ackSeq}`;
    channelStage.appendChild(a);

    const loseAck = Math.random() < ackLossProb;
    const travel = 3000 + (parseInt(ackDelayMsEl.value,10) || 0);
    animateLR(a, start, end, travel);

    setTimeout(()=>{
      if(loseAck){
        a.classList.add("lost");
        log(`ACK ${ackSeq} lost on return path.`);
        stats.acksLost++;
        setTimeout(()=>{ safeRemove(a); fadeLine(line); }, 700);
      } else {
        safeRemove(a); fadeLine(line);
        onAckReceived(ackSeq);
      }
    }, travel + 80);
  }

  function onAckReceived(ackSeq){
    log(`Sender received ACK ${ackSeq}.`);
    sentFrames.forEach(s=>{ if(s.seq <= ackSeq) s.acked = true; });
    while(sentFrames.length && sentFrames[0].acked){
      const r = sentFrames.shift();
      if(r && r.dom){ r.dom.style.opacity="1"; r.dom.style.background="linear-gradient(180deg,#eafff7,#bff3e6)"; }
      base++;
    }
    if(sentFrames.length>0) startTimer(); else clearTimer();
    refreshWindow();
    if(running) sendIfPossible();
    if(base >= seqLimit) finish();
  }

  // --- Timer/timeout (GBN)
  function startTimer(){ clearTimer(); timer = setTimeout(onTimeout, timeout); }
  function clearTimer(){ if(timer){ clearTimeout(timer); timer = null; } }
  function onTimeout(){
    log(`Timeout at base ${base}. Retransmitting ${base}..${Math.min(base+N-1, seqLimit-1)}.`);
    const outstanding = sentFrames.map(s=>s.seq);
    outstanding.forEach(q => sendFrame(q, true));
    if(sentFrames.length>0) startTimer();
  }

  // --- Finish + stats/flow
  function finish(){
    clearTimer(); running=false; log("Simulation complete. Preparing summary…");
    const eff = stats.totalTrans ? (stats.totalFrames / stats.totalTrans) * 100 : 100;
    const loss = stats.totalTrans ? (stats.framesLost / stats.totalTrans) * 100 : 0;

    $("#stat_totalFrames").textContent = stats.totalFrames;
    $("#stat_totalTrans").textContent = stats.totalTrans;
    $("#stat_totalAcks").textContent = stats.totalAcks;
    $("#stat_framesLost").textContent = stats.framesLost;
    $("#stat_acksLost").textContent = stats.acksLost;
    $("#stat_framesDelayed").textContent = stats.framesDelayed;
    $("#stat_efficiency").textContent = eff.toFixed(2) + "%";
    $("#stat_lossPercent").textContent = loss.toFixed(2) + "%";

    // Flow diagram = log in chronological order (top→bottom)
    flowDiagram.innerHTML = "";
    [...events.children].reverse().forEach(n=>{
      const d = document.createElement("div");
      d.textContent = n.textContent;
      flowDiagram.appendChild(d);
    });

    statsWrap.classList.remove("hidden");
  }

  // --- Geometry + animation helpers
  function placeLine(line, a, b){
    const dx = b.x - a.x, dy = b.y - a.y;
    const len = Math.sqrt(dx*dx + dy*dy);
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    line.style.width = `${len}px`;
    line.style.left = `${a.x}px`;
    line.style.top  = `${a.y}px`;
    line.style.transform = `rotate(${ang}deg)`;
  }
  function animateLR(elm, a, b, ms){
    elm.style.opacity = "1";
    const start = performance.now();
    function step(t){
      const k = Math.min(1,(t-start)/ms);
      const e = ease(k);
      const x = a.x + (b.x - a.x) * e;
      const y = a.y + (b.y - a.y) * e;
      elm.style.left = `${x}px`;
      elm.style.top  = `${y}px`;
      if(k<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  const ease = k => k<0.5 ? 2*k*k : -1 + (4-2*k)*k;
  const fadeLine = (line)=>{ line.style.transition="opacity .5s"; line.style.opacity="0"; setTimeout(()=>safeRemove(line),520); };
  const safeRemove = n => { if(n && n.parentNode) n.parentNode.removeChild(n); };

  // --- Controls
  startBtn.addEventListener("click", ()=>{ if(running) return; running=true; log("Started."); sendIfPossible(); });
  pauseBtn.addEventListener("click", ()=>{ running=false; clearTimer(); log("Paused."); });
  stepBtn.addEventListener("click", ()=>{ if(!running){ const pre=nextseq; sendIfPossible(); if(nextseq===pre) log("Step: window full / finished."); }});
  resetBtn.addEventListener("click", ()=>{ init(); log("Reset."); });

  // Boot
  init();
})();
