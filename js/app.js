// js/app.js — Go-Back-N ARQ (true sliding window), textbook visuals, conditional controls, and replay
// Modes: Textbook 2D (diagonal draw+move), Vertical columns (horizontal draw+move), Animated replay (summary)
// UI: dark selects/inputs (always visible), conditional "specific/k" & delay fields
// Timing: gentle/cinematic; real GBN: pipeline up to N, timeout → retransmit base..nextSeq-1

(function () {
  // ---------- Build UI ----------
  const app = document.getElementById("app");
  app.innerHTML = `
    <header class="glass">
      <h1>Go-Back-N ARQ — Visual Simulator</h1>
      <p>Sliding window up to N, pipelined frames, timeout → retransmit from base. Choose your visual mode and run.</p>

      <div class="controls">
        <label>Number of frames
          <input id="numFrames" type="number" min="1" max="300" value="12">
        </label>

        <label>Window size (N)
          <input id="winSize" type="number" min="1" max="32" value="4">
        </label>

        <label>Timeout (ms)
          <input id="timeout" type="number" min="2000" value="6000">
        </label>

        <label>Loss %
          <input id="lossPercent" type="range" min="0" max="80" value="15">
          <span id="lossPercentVal">15%</span>
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

        <label>Simulation Mode
          <select id="simMode">
            <option value="textbook">Textbook 2D (draw + move)</option>
            <option value="vertical">Vertical columns (draw + move)</option>
            <option value="replay">Animated replay (summary only)</option>
          </select>
        </label>

        <label>Summary Diagram
          <select id="diagramType">
            <option value="vertical">Vertical two-columns</option>
            <option value="textbook">Textbook diagonals</option>
            <option value="animated">Animated replay</option>
          </select>
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
      <div class="lane">
        <h3>Sender</h3>
        <div id="senderWindow" class="window"></div>
        <div id="senderQueue" class="queue"></div>
      </div>

      <div class="channel glass">
        <div id="channelStage" style="position:relative;width:100%;height:480px;">
          <svg id="liveSvg" width="100%" height="100%" style="position:absolute;inset:0;"></svg>
        </div>
      </div>

      <div class="lane">
        <h3>Receiver</h3>
        <div id="recvArea" class="recv"></div>
      </div>
    </section>

    <section class="glass">
      <h3 style="text-align:center;color:#00ffff;margin-bottom:6px">Event Log</h3>
      <div id="events" class="log"></div>
    </section>

    <section class="glass hidden" id="statsWrap">
      <h3 style="text-align:center;color:#00ffff;margin-bottom:8px">📊 Simulation Results</h3>
      <div class="stats">
        <div class="stat-card"><div class="stat-label">Total original frames</div><div class="stat-value" id="stat_totalFrames">0</div></div>
        <div class="stat-card"><div class="stat-label">Total transmissions</div><div class="stat-value" id="stat_totalTrans">0</div></div>
        <div class="stat-card"><div class="stat-label">Frames delivered</div><div class="stat-value" id="stat_delivered">0</div></div>
        <div class="stat-card"><div class="stat-label">Total ACKs generated</div><div class="stat-value" id="stat_totalAcks">0</div></div>
        <div class="stat-card"><div class="stat-label">Frames lost</div><div class="stat-value" id="stat_framesLost">0</div></div>
        <div class="stat-card"><div class="stat-label">ACKs lost</div><div class="stat-value" id="stat_acksLost">0</div></div>
        <div class="stat-card">
          <div class="stat-label">Efficiency</div>
          <div class="stat-value" id="stat_efficiency">0%</div>
          <div class="eff-bar"><div id="eff_fill" class="eff-fill" style="width:0%"></div></div>
        </div>
        <div class="stat-card"><div class="stat-label">Loss percent (frames/transmissions)</div><div class="stat-value" id="stat_lossPercent">0%</div></div>
      </div>

      <div style="margin-top:12px">
        <h4 style="color:#a9c2d6;margin-bottom:6px">Flow Diagram (<span id="diagramModeLabel">Vertical two-columns</span>)</h4>
        <div id="diagramHost" class="glass" style="padding:10px"></div>
      </div>
    </section>

    <footer>CN Project • Go-Back-N • proper sliding window + cinematic lines ✨</footer>
  `;

  // ---------- Make controls readable (dark bg + white text, always visible) ----------
  for (const el of document.querySelectorAll(".controls input, .controls select")) {
    el.style.background = "#0f172a";
    el.style.color = "#ffffff";
    el.style.border = "1px solid rgba(255,255,255,0.25)";
    el.style.opacity = "1";
  }

  // ---------- Refs ----------
  const $ = s => document.querySelector(s);
  const numFramesEl = $("#numFrames"), winSizeEl = $("#winSize"), timeoutEl = $("#timeout");
  const lossPercentEl = $("#lossPercent"), lossPercentVal = $("#lossPercentVal");
  const lossModeEl = $("#lossMode"), labelSpecific = $("#labelSpecific"), specificFramesEl = $("#specificFrames");
  const labelEveryK = $("#labelEveryK"), everyKEl = $("#everyK");
  const frameDelayModeEl = $("#frameDelayMode"), labelDelaySpec = $("#labelDelaySpec"), labelDelayMs = $("#labelDelayMs");
  const frameDelaySpecEl = $("#frameDelaySpec"), frameDelayMsEl = $("#frameDelayMs");
  const ackLossPercentEl = $("#ackLossPercent"), ackLossVal = $("#ackLossVal"), ackDelayMsEl = $("#ackDelayMs");
  const simModeEl = $("#simMode");
  const diagramTypeEl = $("#diagramType"), diagramModeLabel = $("#diagramModeLabel");

  const startBtn = $("#startBtn"), pauseBtn = $("#pauseBtn"), stepBtn = $("#stepBtn"), resetBtn = $("#resetBtn");
  const senderWindow = $("#senderWindow"), senderQueue = $("#senderQueue"), recvArea = $("#recvArea");
  const channelStage = $("#channelStage"), liveSvg = $("#liveSvg"), events = $("#events");
  const statsWrap = $("#statsWrap"), diagramHost = $("#diagramHost");

  // ---------- Conditional UI visibility (this is the strict behavior you asked for) ----------
  const updateLossUI = () => {
    const v = lossModeEl.value;
    labelSpecific.classList.toggle("hidden", v !== "specific");
    labelEveryK.classList.toggle("hidden", v !== "everyk");
  };
  const updateDelayUI = () => {
    const on = frameDelayModeEl.value !== "none";
    labelDelaySpec.classList.toggle("hidden", !on);
    labelDelayMs.classList.toggle("hidden", !on);
  };
  const updateDiagramLabel = () => {
    const map = { vertical: "Vertical two-columns", textbook: "Textbook diagonals", animated: "Animated replay" };
    diagramModeLabel.textContent = map[diagramTypeEl.value] || "Vertical two-columns";
  };

  lossPercentEl.addEventListener("input", ()=> lossPercentVal.textContent = lossPercentEl.value + "%");
  ackLossPercentEl.addEventListener("input", ()=> ackLossVal.textContent = ackLossPercentEl.value + "%");
  lossModeEl.addEventListener("change", updateLossUI);
  frameDelayModeEl.addEventListener("change", updateDelayUI);
  diagramTypeEl.addEventListener("change", updateDiagramLabel);

  // ---------- State (true Go-Back-N) ----------
  let N, timeout, lossProb, ackLossProb;
  let base, nextSeq, seqLimit;         // GBN indices
  let running=false, paused=false, timer=null;

  // bookkeeping for frames in flight
  // record[seq] = { sentCount, delivered(false/true), acked(false/true) }
  const record = new Map();

  const stats = {
    totalFrames: 0, totalTrans: 0, totalAcks: 0,
    framesLost: 0, acksLost: 0, framesDelayed: 0,
    framesDelivered: 0
  };
  const diagram = { frames: [], acks: [] }; // summary only

  function init(){
    N = clamp(parseInt(winSizeEl.value,10)||4, 1, 32);
    timeout = clamp(parseInt(timeoutEl.value,10)||6000, 2000, 60000);
    lossProb = (parseInt(lossPercentEl.value,10)||0)/100;
    ackLossProb = (parseInt(ackLossPercentEl.value,10)||0)/100;

    base = 0; nextSeq = 0;
    seqLimit = clamp(parseInt(numFramesEl.value,10)||12, 1, 300);
    running = false; paused = false; clearTimer();
    record.clear();

    Object.assign(stats, {
      totalFrames: seqLimit, totalTrans: 0, totalAcks: 0,
      framesLost: 0, acksLost: 0, framesDelayed: 0, framesDelivered: 0
    });
    diagram.frames = []; diagram.acks = [];

    senderWindow.innerHTML=""; senderQueue.innerHTML="";
    recvArea.innerHTML=""; liveSvg.innerHTML=""; events.innerHTML="";
    statsWrap.classList.add("hidden"); diagramHost.innerHTML="";

    for(let i=0;i<N;i++){
      const f = document.createElement("div"); f.className="frame";
      f.textContent = (i)<seqLimit ? `#${i}` : "-";
      senderWindow.appendChild(f);
    }
    updateLossUI(); updateDelayUI(); updateDiagramLabel();
    log("Ready — true Go-Back-N: pipeline up to N, timeout → retransmit from base.");
  }

  // ---------- Helpers ----------
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const parseNums = t => !t?[]:t.split(",").map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n));
  const log = m => events.prepend(Object.assign(document.createElement("div"), { textContent: `[${new Date().toLocaleTimeString()}] ${m}` }));

  const shouldLoseFrame = seq => {
    const m = lossModeEl.value;
    if(m==="none") return false;
    if(m==="random") return Math.random() < lossProb;
    if(m==="specific") return parseNums(specificFramesEl.value).includes(seq);
    if(m==="everyk"){ const k=parseInt(everyKEl.value,10)||1; return ((seq+1)%k)===0; }
    return false;
  };
  const shouldDelayFrame = seq => {
    const m = frameDelayModeEl.value;
    if(m==="none") return false;
    const arr = parseNums(frameDelaySpecEl.value);
    if(m==="specific") return arr.includes(seq);
    if(m==="everyk"){ const k=parseInt(frameDelaySpecEl.value,10)||1; return ((seq+1)%k)===0; }
    return false;
  };

  // ---------- Geometry for live sim modes ----------
  function endpoints(seq){
    const W = channelStage.clientWidth, leftX = 22, rightX = Math.max(140, W - 22 - 96);
    const baseY = 90 + (seq % 6) * 58;

    if (simModeEl.value === "vertical") {
      return {
        frameStart: {x:leftX,  y:baseY},
        frameEnd:   {x:rightX, y:baseY},
        ackStart:   {x:rightX, y:baseY-14},
        ackEnd:     {x:leftX,  y:baseY-14},
      };
    }
    // textbook
    return {
      frameStart: {x:leftX,  y:baseY},
      frameEnd:   {x:rightX, y:baseY+16},
      ackStart:   {x:rightX, y:baseY+16-16},
      ackEnd:     {x:leftX,  y:baseY-2},
    };
  }

  // SVG line-by-line draw + moving packet
  function drawLineAnimated(svg, x1,y1,x2,y2, color, dashed, durMs){
    const ln = document.createElementNS("http://www.w3.org/2000/svg","line");
    ln.setAttribute("x1",x1); ln.setAttribute("y1",y1);
    ln.setAttribute("x2",x2); ln.setAttribute("y2",y2);
    ln.setAttribute("stroke", color);
    ln.setAttribute("stroke-width", "3");
    ln.setAttribute("opacity", ".95");
    if (dashed) ln.setAttribute("stroke-dasharray","10 7");
    svg.appendChild(ln);
    const len = Math.hypot(x2-x1, y2-y1);
    ln.setAttribute("stroke-dasharray", `${len}`);
    ln.setAttribute("stroke-dashoffset", `${len}`);
    ln.style.transition = `stroke-dashoffset ${durMs}ms ease`;
    requestAnimationFrame(()=> ln.setAttribute("stroke-dashoffset","0"));
    return ln;
    }
  function mkPacket(text, cls, pos){
    const p=document.createElement("div");
    p.className=cls; p.textContent=text;
    p.style.left = `${pos.x}px`; p.style.top = `${pos.y}px`;
    p.style.position="absolute"; p.style.opacity="0";
    channelStage.appendChild(p);
    return p;
  }
  function animateMove(elm, a, b, ms){
    elm.style.opacity="1";
    return new Promise(res=>{
      const s=performance.now();
      (function step(t){
        const k=Math.min(1,(t-s)/ms), e=ease(k);
        elm.style.left=`${a.x+(b.x-a.x)*e}px`;
        elm.style.top =`${a.y+(b.y-a.y)*e}px`;
        if(k<1) requestAnimationFrame(step); else res();
      })(s);
    });
  }
  const ease = k => k<0.5 ? 2*k*k : -1 + (4-2*k)*k;

  // ---------- Go-Back-N engine ----------
  const DOWN_MS = 2000;  // forward leg
  const PROC_MS = 600;   // receiver processing
  const ACK_MS  = 2000;  // ack leg

  function startTimer(){ clearTimer(); timer = setTimeout(onTimeout, timeout); }
  function clearTimer(){ if(timer){ clearTimeout(timer); timer=null; } }

  function onTimeout(){
    if(!running) return;
    if(base < nextSeq){
      log(`Timeout at base ${base} — retransmit ${base}..${Math.min(nextSeq-1, seqLimit-1)} (Go-Back-N).`);
      // retransmit all outstanding (base..nextSeq-1)
      for(let s=base; s<nextSeq; s++){
        retransmitFrame(s);
      }
      startTimer(); // restart timer after batch
    }
  }

  // Send new frames while window has space
  async function pumpWindow(){
    while(running && !paused && nextSeq < base + N && nextSeq < seqLimit){
      await sendFrame(nextSeq);
      nextSeq++;
      refreshWindow();
      // start timer when the first unacked is sent
      if(base === nextSeq-1) startTimer();
    }
  }

  function refreshWindow(){
    const slots = [...senderWindow.children];
    for(let i=0;i<slots.length;i++){
      const seq = base + i;
      const el = slots[i];
      el.textContent = seq < seqLimit ? `#${seq}` : '-';
      const inFlight = seq >= base && seq < nextSeq && seq < seqLimit;
      el.classList.toggle("active", inFlight);
    }
  }

  async function sendFrame(seq){
    // record
    const rec = record.get(seq) || { sentCount:0, delivered:false, acked:false };
    rec.sentCount++; record.set(seq, rec);

    // queue badge
    const badge = document.createElement("div");
    badge.className="packet"; badge.style.position="static"; badge.textContent=`F${seq}`;
    senderQueue.appendChild(badge);
    stats.totalTrans++;

    const { frameStart, frameEnd } = endpoints(seq);
    const delayed = shouldDelayFrame(seq);
    const extraDelay = delayed ? Math.max(0, parseInt(frameDelayMsEl.value,10)||0) : 0;
    if(delayed){ stats.framesDelayed++; }

    const lose = shouldLoseFrame(seq);
    const lineColor = lose ? "#ff6b6b" : "#00ffff";
    drawLineAnimated(liveSvg, frameStart.x, frameStart.y, frameEnd.x, frameEnd.y, lineColor, lose, DOWN_MS + extraDelay);

    const pkt = mkPacket(`F${seq}`,"packet", frameStart);
    if(delayed) pkt.classList.add("delayed");
    await animateMove(pkt, frameStart, frameEnd, DOWN_MS + extraDelay);

    if(lose){
      pkt.classList.add("lost");
      log(`Frame ${seq} lost in channel.`);
      stats.framesLost++;
      diagram.frames.push({seq, delivered:false});
      await sleep(400);
      pkt.remove();
      // do not ACK; wait for timeout globally
      return;
    }

    // receiver gets it
    pkt.remove();
    diagram.frames.push({seq, delivered:true});
    rec.delivered = true;

    await sleep(PROC_MS);
    receiverHandle(seq);
  }

  // Retransmit already-sent outstanding frame
  async function retransmitFrame(seq){
    if(!running) return;
    const rec = record.get(seq) || { sentCount:0, delivered:false, acked:false };
    rec.sentCount++; record.set(seq, rec);
    stats.totalTrans++;

    const { frameStart, frameEnd } = endpoints(seq);
    const lose = shouldLoseFrame(seq); // re-apply rule on retransmit
    const lineColor = lose ? "#ff6b6b" : "#00ffff";
    drawLineAnimated(liveSvg, frameStart.x, frameStart.y, frameEnd.x, frameEnd.y, lineColor, lose, DOWN_MS);

    const pkt = mkPacket(`F${seq}`,"packet", frameStart);
    await animateMove(pkt, frameStart, frameEnd, DOWN_MS);

    if(lose){
      pkt.classList.add("lost");
      log(`(RTX) Frame ${seq} lost again.`);
      stats.framesLost++;
      diagram.frames.push({seq, delivered:false});
      await sleep(300);
      pkt.remove();
      return;
    }

    pkt.remove();
    diagram.frames.push({seq, delivered:true});
    await sleep(PROC_MS);
    receiverHandle(seq);
  }

  // Receiver logic (GBN cumulative ACK)
  async function receiverHandle(seq){
    const expected = recvArea.childElementCount;
    const { ackStart, ackEnd } = endpoints(seq);

    let ackNum;
    if(seq === expected){
      // in-order
      const blk = document.createElement("div"); blk.className="frame active"; blk.textContent=`#${seq}`;
      recvArea.appendChild(blk);
      stats.framesDelivered++;
      ackNum = seq;
      log(`Receiver accepted ${seq} → ACK ${ackNum}`);
    } else {
      // out-of-order → cumulative ACK for last in-order
      ackNum = expected - 1;
      log(`Receiver discarded ${seq} (expected ${expected}) → ACK ${ackNum}`);
    }

    // send ACK (with loss/ack-delay)
    stats.totalAcks++;
    const ackLose = Math.random() < ackLossProb;
    drawLineAnimated(liveSvg, ackStart.x, ackStart.y, ackEnd.x, ackEnd.y, "#4faaff", ackLose, ACK_MS + (parseInt(ackDelayMsEl.value,10)||0));
    const ackPkt = mkPacket(`ACK${ackNum}`,"packet ack", ackStart);
    await animateMove(ackPkt, ackStart, ackEnd, ACK_MS + (parseInt(ackDelayMsEl.value,10)||0));

    if(ackLose){
      ackPkt.classList.add("lost");
      log(`ACK ${ackNum} lost on return path.`);
      stats.acksLost++;
      diagram.acks.push({seq:ackNum, delivered:false});
      await sleep(300);
      ackPkt.remove();
      // sender won't slide; timeout will cause RTX
      return;
    }

    ackPkt.remove();
    diagram.acks.push({seq:ackNum, delivered:true});
    onAck(ackNum);
  }

  // Sender handles cumulative ACK
  function onAck(ackNum){
    log(`Sender received ACK ${ackNum} (cumulative).`);
    if(ackNum >= base){
      base = ackNum + 1;
      refreshWindow();
      if(base === nextSeq){
        // all acked → stop timer
        clearTimer();
      } else {
        // still outstanding → restart timer
        startTimer();
      }
      // Pipeline more frames if available
      pumpWindow();
      // done?
      if(base >= seqLimit) finish();
    }
  }

  function finish(){
    running=false; clearTimer(); log("Simulation complete — building summary…");
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
    $("#eff_fill").style.width = `${Math.max(0,Math.min(100,eff))}%`;

    // summary diagram
    diagramHost.innerHTML="";
    const mode = diagramTypeEl.value;
    const lbl = { vertical:"Vertical two-columns", textbook:"Textbook diagonals", animated:"Animated replay" }[mode] || "Vertical two-columns";
    diagramModeLabel.textContent = lbl;
    renderDiagram(diagramHost, diagram, stats.totalFrames, mode);

    statsWrap.classList.remove("hidden");
  }

  // ---------- Summary diagram renderers ----------
  function renderDiagram(host, diag, framesCount, mode){
    if(mode==="vertical" || mode==="animated") return renderVertical(host, diag, framesCount, mode==="animated");
    return renderTextbook(host, diag, framesCount, mode==="animated");
  }

  function renderVertical(host, diag, rows, animated){
    const w = host.clientWidth || 900, rowGap = 60;
    const h = Math.max(220, rows*rowGap + 60);
    const padX = 110, colL = padX, colR = w - padX;
    const svg = svgEl(w,h);

    svg.appendChild(vline(colL,30,h-30,"#00ffff"));
    svg.appendChild(vline(colR,30,h-30,"#4faaff"));
    svg.appendChild(label(colL-25,20,"Sender"));
    svg.appendChild(label(colR-35,20,"Receiver"));

    for(let i=0;i<rows;i++){
      const y = 40 + i*rowGap;
      svg.appendChild(node(colL,y,`#${i}`));
      svg.appendChild(node(colR,y,`#${i}`));
    }

    let idx=0;
    diag.frames.forEach(f=>{
      const y = 40 + f.seq*rowGap;
      const ln = hline(colL,y,colR,y,f.delivered?"#00ffff":"#ff6b6b",f.delivered?0:1);
      if(animated) dash(ln, idx++); svg.appendChild(ln);
    });
    diag.acks.forEach(a=>{
      const y = 40 + Math.max(0,a.seq)*rowGap - 12;
      const ln = hline(colR,y,colL,y,"#4faaff",a.delivered?0:1);
      if(animated) dash(ln, idx++); svg.appendChild(ln);
    });

    host.appendChild(svg);
  }

  function renderTextbook(host, diag, rows, animated){
    const w = host.clientWidth || 900, rowGap = 60;
    const h = Math.max(220, rows*rowGap + 60);
    const pad = 90, colL = pad, colR = w - pad;
    const svg = svgEl(w,h);

    svg.appendChild(label(colL-25,20,"Sender"));
    svg.appendChild(label(colR-35,20,"Receiver"));

    for(let i=0;i<rows;i++){
      const y = 40 + i*rowGap;
      svg.appendChild(nodeRect(colL,y,`#${i}`));
      svg.appendChild(nodeRect(colR,y,`#${i}`));
    }

    let idx=0;
    diag.frames.forEach(f=>{
      const y = 40 + f.seq*rowGap;
      const ln = seg(colL,y,colR,y+16,f.delivered?"#00ffff":"#ff6b6b",f.delivered?0:1);
      if(animated) dash(ln, idx++); svg.appendChild(ln);
    });
    diag.acks.forEach(a=>{
      const y = 40 + Math.max(0,a.seq)*rowGap - 12;
      const ln = seg(colR,y+16,colL,y,"#4faaff",a.delivered?0:1);
      if(animated) dash(ln, idx++); svg.appendChild(ln);
    });

    host.appendChild(svg);
  }

  // ---------- SVG helpers ----------
  function svgEl(w,h){ const s=ns("svg"); s.setAttribute("viewBox",`0 0 ${w} ${h}`); s.setAttribute("width","100%"); s.setAttribute("height",h); return s; }
  function vline(x,y1,y2,c){ const l=line(x,y1,x,y2,c,2); l.setAttribute("opacity",".6"); return l; }
  function hline(x1,y1,x2,y2,c,d){ const l=line(x1,y1,x2,y2,c,3); l.setAttribute("opacity",".95"); if(d) l.setAttribute("stroke-dasharray","10 7"); return l; }
  function seg(x1,y1,x2,y2,c,d){ const l=line(x1,y1,x2,y2,c,3); if(d) l.setAttribute("stroke-dasharray","10 7"); return l; }
  function node(x,y,t){ const g=ns("g"); const c=cir(x,y,6); const tx=txt(x-26,y-10,"#eafaff",12,t); c.setAttribute("fill","rgba(255,255,255,0.08)"); c.setAttribute("stroke","rgba(255,255,255,0.25)"); g.appendChild(c); g.appendChild(tx); return g; }
  function nodeRect(x,y,t){ const g=ns("g"); const r=rect(x-20,y-12,40,24,6); r.setAttribute("fill","rgba(255,255,255,0.08)"); r.setAttribute("stroke","rgba(255,255,255,0.25)"); const tx=txt(x-15,y+4,"#eafaff",12,t); g.appendChild(r); g.appendChild(tx); return g; }
  function label(x,y,txtc){ return txt(x,y,"#00ffff",14,txtc,true); }
  function dash(l,i){ const len=Math.hypot(l.x2.baseVal.value-l.x1.baseVal.value,l.y2.baseVal.value-l.y1.baseVal.value); l.setAttribute("stroke-dasharray",`${len}`); l.setAttribute("stroke-dashoffset",`${len}`); l.style.animation=`drawline .9s ${i*0.12}s ease forwards`; l.parentNode.appendChild(styleOnce()); }
  function styleOnce(){ const st=ns("style"); st.textContent=`@keyframes drawline{to{stroke-dashoffset:0}}`; return st; }
  const ns = n=>document.createElementNS("http://www.w3.org/2000/svg", n);
  function cir(cx,cy,r){ const c=ns("circle"); c.setAttribute("cx",cx); c.setAttribute("cy",cy); c.setAttribute("r",r); return c; }
  function rect(x,y,w,h,rx){ const r=ns("rect"); r.setAttribute("x",x); r.setAttribute("y",y); r.setAttribute("width",w); r.setAttribute("height",h); r.setAttribute("rx",rx); return r; }
  function txt(x,y,fill,size,txtc,bold){ const t=ns("text"); t.setAttribute("x",x); t.setAttribute("y",y); t.setAttribute("fill",fill); t.setAttribute("font-size",size); if(bold) t.setAttribute("font-weight","700"); t.textContent=txtc; return t; }
  function line(x1,y1,x2,y2,c,w){ const l=ns("line"); l.setAttribute("x1",x1); l.setAttribute("y1",y1); l.setAttribute("x2",x2); l.setAttribute("y2",y2); l.setAttribute("stroke",c); l.setAttribute("stroke-width",w); return l; }

  // ---------- Utils ----------
  const sleep = ms => new Promise(r=>setTimeout(r,ms));
  const setTxt = (sel, txt) => { const n=document.querySelector(sel); if(n) n.textContent=txt; };

  // ---------- Controls ----------
  startBtn.addEventListener("click", async ()=>{
    if(running) return;
    running = true; paused = false;
    log(`Started — Mode: ${simModeEl.value}`);
    await pumpWindow(); // fill the initial window
  });

  pauseBtn.addEventListener("click", ()=>{
    paused = true; log("Paused.");
  });

  stepBtn.addEventListener("click", async ()=>{
    // Step sends exactly one frame if window allows (helpful for demos)
    if(running) return;
    running = true; paused = false;
    if(nextSeq < base + N && nextSeq < seqLimit){
      await sendFrame(nextSeq); nextSeq++; refreshWindow();
      if(base === nextSeq-1) startTimer();
    } else {
      log("Step: window full or finished.");
    }
    running = false;
  });

  resetBtn.addEventListener("click", ()=>{ init(); log("Reset."); });

  // ---------- Boot ----------
  init();
})();
