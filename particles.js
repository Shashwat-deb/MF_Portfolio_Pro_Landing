/**
 * MF Pro — Abstract Financial Mathematics Background
 * Efficient frontier curve + coordinate grid
 * Academic, quantitative, institutional feel
 * No particles. No starfield. No crypto.
 */
(() => {
  'use strict';

  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H;
  let time = 0;
  let animId;
  let lastFrame = 0;
  const FPS = 20;
  const FRAME_MS = 1000 / FPS;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const hero = canvas.parentElement;
    W = hero.offsetWidth;
    H = hero.offsetHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* --- Coordinate Grid --- */
  function drawGrid() {
    const gridSpacing = 60;
    const gridColor = 'rgba(255, 255, 255, 0.018)';

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();

    // Vertical lines
    for (let x = 0; x < W; x += gridSpacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
    }
    // Horizontal lines
    for (let y = 0; y < H; y += gridSpacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
  }

  /* --- Axis labels (subtle) --- */
  function drawAxes() {
    // X-axis label area (bottom region)
    const axisColor = 'rgba(255, 255, 255, 0.04)';
    const labelColor = 'rgba(255, 255, 255, 0.06)';

    // Horizontal axis line
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H * 0.85);
    ctx.lineTo(W * 0.92, H * 0.85);
    ctx.stroke();

    // Vertical axis line
    ctx.beginPath();
    ctx.moveTo(W * 0.08, H * 0.15);
    ctx.lineTo(W * 0.08, H * 0.85);
    ctx.stroke();

    // Axis labels
    ctx.font = '500 9px Inter, sans-serif';
    ctx.fillStyle = labelColor;
    ctx.textAlign = 'center';
    ctx.fillText('σ (Risk)', W * 0.5, H * 0.89);

    ctx.save();
    ctx.translate(W * 0.04, H * 0.5);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('E(R)', 0, 0);
    ctx.restore();

    // Small tick marks
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 0.5;
    for (let i = 1; i <= 6; i++) {
      const tx = W * 0.08 + (W * 0.84) * (i / 7);
      ctx.beginPath();
      ctx.moveTo(tx, H * 0.85 - 3);
      ctx.lineTo(tx, H * 0.85 + 3);
      ctx.stroke();
    }
    for (let i = 1; i <= 5; i++) {
      const ty = H * 0.85 - (H * 0.70) * (i / 6);
      ctx.beginPath();
      ctx.moveTo(W * 0.08 - 3, ty);
      ctx.lineTo(W * 0.08 + 3, ty);
      ctx.stroke();
    }
  }

  /* --- Efficient Frontier Curve --- */
  function drawFrontier() {
    const drift = Math.sin(time * 0.3) * 4;

    // The curve: a parabolic-like frontier (risk on x, return on y)
    // Maps from chart space to canvas space
    const ox = W * 0.08;
    const oy = H * 0.85;
    const cw = W * 0.84;
    const ch = H * 0.70;

    // Generate frontier points (parametric)
    const points = [];
    for (let t = 0; t <= 1; t += 0.01) {
      // Classic efficient frontier shape: sqrt-like curve
      const risk = 0.05 + t * 0.85;
      const ret = 0.15 + Math.sqrt(t) * 0.75 - t * 0.15;
      const x = ox + risk * cw;
      const y = oy - ret * ch + drift * (0.5 - Math.abs(t - 0.5));
      points.push({ x, y });
    }

    // Main frontier curve
    ctx.strokeStyle = 'rgba(122, 155, 181, 0.045)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Subtle glow line (wider, lower opacity)
    ctx.strokeStyle = 'rgba(122, 155, 181, 0.02)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Tangent line from origin to optimal portfolio (Capital Market Line)
    const optIdx = Math.floor(points.length * 0.35);
    const opt = points[optIdx];
    ctx.strokeStyle = 'rgba(122, 155, 181, 0.025)';
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(ox, oy - ch * 0.08);
    ctx.lineTo(opt.x + cw * 0.3, opt.y - ch * 0.15);
    ctx.stroke();
    ctx.setLineDash([]);

    // Small dot at the tangency portfolio
    ctx.beginPath();
    ctx.arc(opt.x, opt.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(122, 155, 181, 0.08)';
    ctx.fill();

    // Tiny label near tangency point
    ctx.font = '500 7px Inter, sans-serif';
    ctx.fillStyle = 'rgba(122, 155, 181, 0.07)';
    ctx.textAlign = 'left';
    ctx.fillText('Optimal', opt.x + 8, opt.y - 4);

    // A few scattered portfolio dots along the frontier
    const dotPositions = [0.12, 0.25, 0.48, 0.62, 0.78, 0.90];
    for (const dp of dotPositions) {
      const idx = Math.floor(dp * (points.length - 1));
      const pt = points[idx];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.fill();
    }

    // A few random sub-optimal portfolios below the frontier
    const subOpt = [
      { rx: 0.30, ry: 0.25 },
      { rx: 0.45, ry: 0.35 },
      { rx: 0.55, ry: 0.30 },
      { rx: 0.65, ry: 0.45 },
      { rx: 0.35, ry: 0.40 },
      { rx: 0.50, ry: 0.50 },
      { rx: 0.70, ry: 0.38 },
      { rx: 0.25, ry: 0.18 },
    ];
    for (const s of subOpt) {
      const sx = ox + s.rx * cw;
      const sy = oy - s.ry * ch;
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    drawGrid();
    drawAxes();
    drawFrontier();
  }

  function loop(ts) {
    animId = requestAnimationFrame(loop);
    if (ts - lastFrame < FRAME_MS) return;
    lastFrame = ts;
    time += 0.016;
    draw();
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); draw(); }, 250);
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(animId);
    else { lastFrame = performance.now(); animId = requestAnimationFrame(loop); }
  });

  resize();
  animId = requestAnimationFrame(loop);
})();
