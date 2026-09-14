/**
 * MF Portfolio Pro — Periodic Performance Curve
 * Draw → hold → fade out → redraw, forever.
 * Cycle: 1.7s draw · 14s hold · 2s fade → repeat
 */
(() => {
    'use strict';

    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H;

    /* ─── Timing ──────────────────────────────────── */
    const DRAW_MS   = 1700;   // draw animation duration
    const HOLD_MS   = 14000;  // stay visible before fading
    const FADE_MS   = 2000;   // fade-out duration

    /* ─── Resize ──────────────────────────────────── */
    function resize() {
        const dpr  = Math.min(window.devicePixelRatio || 1, 2);
        const hero = canvas.parentElement;
        W = hero.offsetWidth;
        H = hero.offsetHeight;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width  = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ─── Generate curve points ───────────────────── */
    function generateCurvePoints() {
        const points = [];
        const steps  = 200;

        const marginLeft   = W * 0.10;
        const marginRight  = W * 0.06;
        const marginTop    = H * 0.22;
        const marginBottom = H * 0.18;

        const curveW = W - marginLeft - marginRight;
        const curveH = H - marginTop  - marginBottom;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;

            let y = 0.15 + 0.65 * Math.pow(t, 0.7);
            y -= 0.04  * Math.sin(t * Math.PI * 3.2);
            y -= 0.025 * Math.sin(t * Math.PI * 7.1 + 0.5);
            y += 0.015 * Math.sin(t * Math.PI * 12.3 + 1.2);

            if (t > 0.30 && t < 0.42) y -= 0.035 * Math.sin((t - 0.30) / 0.12 * Math.PI);
            if (t > 0.60 && t < 0.70) y -= 0.02  * Math.sin((t - 0.60) / 0.10 * Math.PI);

            points.push({
                x: marginLeft + t * curveW,
                y: marginTop  + curveH * (1 - y)
            });
        }
        return points;
    }

    /* ─── Draw helpers (alpha-aware) ─────────────── */
    function drawSegments(pts, alpha) {
        if (pts.length < 2) return;
        ctx.clearRect(0, 0, W, H);

        // glow pass
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(126, 203, 166, 0.06)';
        ctx.lineWidth   = 14;
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();

        // sharp line pass
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = 'rgba(126, 203, 166, 0.22)';
        ctx.lineWidth   = 1.5;
        ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.restore();
    }

    /* ─── Compute partial points by length ───────── */
    function getPartialPoints(points, fraction) {
        let totalLength = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            totalLength += Math.sqrt(dx*dx + dy*dy);
        }

        const drawLength = fraction * totalLength;
        let accumulated = 0;
        let endIdx = 0, partialFrac = 0;

        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            const seg = Math.sqrt(dx*dx + dy*dy);
            if (accumulated + seg >= drawLength) {
                endIdx = i;
                partialFrac = (drawLength - accumulated) / seg;
                break;
            }
            accumulated += seg;
            endIdx = i;
            partialFrac = 1;
        }

        const out = [];
        for (let i = 0; i <= endIdx - 1; i++) out.push(points[i]);
        if (endIdx > 0) {
            const prev = points[endIdx - 1], curr = points[endIdx];
            out.push({
                x: prev.x + (curr.x - prev.x) * partialFrac,
                y: prev.y + (curr.y - prev.y) * partialFrac
            });
        }
        return out;
    }

    /* ─── Phase 1: draw animation ─────────────────── */
    function phaseDraw(points, onComplete) {
        const start = performance.now();
        function frame(now) {
            const raw  = Math.min((now - start) / DRAW_MS, 1);
            const ease = 1 - Math.pow(1 - raw, 3);          // ease-out cubic
            drawSegments(getPartialPoints(points, ease), 1);
            if (raw < 1) requestAnimationFrame(frame);
            else onComplete();
        }
        requestAnimationFrame(frame);
    }

    /* ─── Phase 2: hold (static) ─────────────────── */
    function phaseHold(points, onComplete) {
        drawSegments(points, 1);
        setTimeout(onComplete, HOLD_MS);
    }

    /* ─── Phase 3: fade out ──────────────────────── */
    function phaseFade(points, onComplete) {
        const start = performance.now();
        function frame(now) {
            const raw  = Math.min((now - start) / FADE_MS, 1);
            const ease = 1 - Math.pow(raw, 2);               // ease-in quad (quick at end)
            drawSegments(points, ease);
            if (raw < 1) requestAnimationFrame(frame);
            else {
                ctx.clearRect(0, 0, W, H);
                onComplete();
            }
        }
        requestAnimationFrame(frame);
    }

    /* ─── Main loop ───────────────────────────────── */
    function runCycle(points) {
        phaseDraw(points, () =>
            phaseHold(points, () =>
                phaseFade(points, () =>
                    runCycle(points)   // restart
                )
            )
        );
    }

    /* ─── Init ────────────────────────────────────── */
    let curvePoints = null;
    let resizeTimer;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            curvePoints = generateCurvePoints();
            // restart cycle on resize
            runCycle(curvePoints);
        }, 250);
    });

    resize();
    curvePoints = generateCurvePoints();
    runCycle(curvePoints);
})();
