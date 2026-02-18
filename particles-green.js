/**
 * MF Portfolio Pro — Green Theme Performance Curve
 * Soft sage-green tinted upward-sloping portfolio line
 * Draw-once animation, no loops, no particles
 */
(() => {
    'use strict';

    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H;

    function resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const hero = canvas.parentElement;
        W = hero.offsetWidth;
        H = hero.offsetHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* --- Generate portfolio performance curve points --- */
    function generateCurvePoints() {
        const points = [];
        const steps = 200;

        const marginLeft = W * 0.10;
        const marginRight = W * 0.06;
        const marginTop = H * 0.22;
        const marginBottom = H * 0.18;

        const curveW = W - marginLeft - marginRight;
        const curveH = H - marginTop - marginBottom;

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;

            // Gentle upward slope with log-like growth
            let y = 0.15 + 0.65 * Math.pow(t, 0.7);

            // Realistic market dips and recoveries
            y -= 0.04 * Math.sin(t * Math.PI * 3.2);
            y -= 0.025 * Math.sin(t * Math.PI * 7.1 + 0.5);
            y += 0.015 * Math.sin(t * Math.PI * 12.3 + 1.2);

            // Small drawdown around 35%
            if (t > 0.30 && t < 0.42) {
                y -= 0.035 * Math.sin((t - 0.30) / 0.12 * Math.PI);
            }

            // Another small dip around 65%
            if (t > 0.60 && t < 0.70) {
                y -= 0.02 * Math.sin((t - 0.60) / 0.10 * Math.PI);
            }

            const px = marginLeft + t * curveW;
            const py = marginTop + curveH * (1 - y);
            points.push({ x: px, y: py });
        }

        return points;
    }

    /* --- Draw the curve (static) --- */
    function drawCurveStatic(points) {
        ctx.clearRect(0, 0, W, H);

        // Soft diffused glow — green-tinted
        ctx.save();
        ctx.strokeStyle = 'rgba(122, 180, 140, 0.05)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.restore();

        // Main sharp line — sage green
        ctx.save();
        ctx.strokeStyle = 'rgba(122, 180, 140, 0.16)';
        ctx.lineWidth = 1.5;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        ctx.restore();
    }

    /* --- Animate the curve drawing once --- */
    function animateCurveDraw(points) {
        let totalLength = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            totalLength += Math.sqrt(dx * dx + dy * dy);
        }

        const duration = 1700; // 1.7s
        const startTime = performance.now();

        function frame(now) {
            const elapsed = now - startTime;
            const rawProgress = Math.min(elapsed / duration, 1);
            const progress = 1 - Math.pow(1 - rawProgress, 3); // ease-out

            const drawLength = progress * totalLength;

            ctx.clearRect(0, 0, W, H);

            let accumulated = 0;
            let endIdx = 0;
            let partialFrac = 0;

            for (let i = 1; i < points.length; i++) {
                const dx = points[i].x - points[i - 1].x;
                const dy = points[i].y - points[i - 1].y;
                const segLen = Math.sqrt(dx * dx + dy * dy);

                if (accumulated + segLen >= drawLength) {
                    endIdx = i;
                    partialFrac = (drawLength - accumulated) / segLen;
                    break;
                }
                accumulated += segLen;
                endIdx = i;
                partialFrac = 1;
            }

            const partialPoints = [];
            for (let i = 0; i <= endIdx - 1; i++) {
                partialPoints.push(points[i]);
            }
            if (endIdx > 0) {
                const prev = points[endIdx - 1];
                const curr = points[endIdx];
                partialPoints.push({
                    x: prev.x + (curr.x - prev.x) * partialFrac,
                    y: prev.y + (curr.y - prev.y) * partialFrac
                });
            }

            if (partialPoints.length < 2) {
                if (rawProgress < 1) requestAnimationFrame(frame);
                return;
            }

            // Draw glow
            ctx.save();
            ctx.strokeStyle = 'rgba(122, 180, 140, 0.05)';
            ctx.lineWidth = 10;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            ctx.moveTo(partialPoints[0].x, partialPoints[0].y);
            for (let i = 1; i < partialPoints.length; i++) {
                ctx.lineTo(partialPoints[i].x, partialPoints[i].y);
            }
            ctx.stroke();
            ctx.restore();

            // Draw main line
            ctx.save();
            ctx.strokeStyle = 'rgba(122, 180, 140, 0.16)';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'butt';
            ctx.lineJoin = 'miter';
            ctx.beginPath();
            ctx.moveTo(partialPoints[0].x, partialPoints[0].y);
            for (let i = 1; i < partialPoints.length; i++) {
                ctx.lineTo(partialPoints[i].x, partialPoints[i].y);
            }
            ctx.stroke();
            ctx.restore();

            if (rawProgress < 1) {
                requestAnimationFrame(frame);
            } else {
                drawCurveStatic(points);
            }
        }

        requestAnimationFrame(frame);
    }

    /* --- Initialize --- */
    let curvePoints = null;
    let resizeTimer;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            resize();
            curvePoints = generateCurvePoints();
            drawCurveStatic(curvePoints);
        }, 250);
    });

    resize();
    curvePoints = generateCurvePoints();
    animateCurveDraw(curvePoints);
})();
