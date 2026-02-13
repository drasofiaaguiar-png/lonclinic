/* ========================================
   Particle Wave — Interactive 3D dot field
   with dynamic floating medical labels
======================================== */
(function () {
    'use strict';

    const canvas = document.getElementById('particleWave');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const labelsContainer = document.getElementById('scanLabels');

    /* ---- Configuration ---- */
    const CONFIG = {
        cols: 80,
        rows: 40,
        spacing: 14,
        baseRadius: 1.6,
        waveAmplitude: 30,
        waveSpeed: 0.0012,
        perspective: 600,
        cameraHeight: -80,
        tiltX: 0.55,
        dotColor: { r: 160, g: 195, b: 210 },
        accentColor: { r: 50, g: 190, b: 210 },
    };

    /* ---- Medical labels (can be overridden via window.PARTICLE_WAVE_LABELS) ---- */
    let LABELS = window.PARTICLE_WAVE_LABELS || [
        { text: 'CARDIOVASCULAR HEALTH', gridX: 0.18, gridY: 0.28 },
        { text: 'IMMUNE SYSTEM', gridX: 0.42, gridY: 0.22 },
        { text: 'SKIN MAPPING', gridX: 0.82, gridY: 0.12 },
        { text: 'METABOLIC MARKERS', gridX: 0.28, gridY: 0.55 },
        { text: 'BLOOD VESSELS', gridX: 0.72, gridY: 0.38 },
        { text: 'PERIPHERAL ARTERIES', gridX: 0.60, gridY: 0.62 },
        { text: 'HORMONAL BALANCE', gridX: 0.15, gridY: 0.72 },
        { text: 'CELLULAR AGING', gridX: 0.88, gridY: 0.55 },
        { text: 'COGNITIVE FUNCTION', gridX: 0.50, gridY: 0.15 },
        { text: 'BONE DENSITY', gridX: 0.35, gridY: 0.78 },
        { text: 'INFLAMMATION', gridX: 0.75, gridY: 0.75 },
        { text: 'OXYGENATION', gridX: 0.10, gridY: 0.45 },
    ];

    const VISIBLE_COUNT = 5;        // how many labels visible at once
    const ROTATE_INTERVAL = 3000;   // ms between label swaps
    const FADE_DURATION = 600;      // ms for fade in/out

    let width, height, time = 0;
    let labelEls = [];
    let activeIndices = [];
    let animFrame;

    /* ---- Resize ---- */
    function resize() {
        const rect = canvas.parentElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width;
        height = rect.height;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    /* ---- Project 3D → 2D ---- */
    function project(x, y, z) {
        const scale = CONFIG.perspective / (CONFIG.perspective + z);
        return {
            x: width / 2 + x * scale,
            y: height / 2 + (y + CONFIG.cameraHeight) * scale,
            scale: scale,
        };
    }

    /* ---- Draw particles ---- */
    function draw() {
        ctx.clearRect(0, 0, width, height);

        const totalW = CONFIG.cols * CONFIG.spacing;
        const totalH = CONFIG.rows * CONFIG.spacing;

        for (let row = 0; row < CONFIG.rows; row++) {
            for (let col = 0; col < CONFIG.cols; col++) {
                const xOff = col * CONFIG.spacing - totalW / 2;
                const zOff = row * CONFIG.spacing - totalH / 2;

                // Wave displacement
                const dist = Math.sqrt(xOff * xOff + zOff * zOff);
                const wave = Math.sin(dist * 0.025 - time * 1.8) * CONFIG.waveAmplitude;
                const wave2 = Math.cos(xOff * 0.03 + time * 1.2) * CONFIG.waveAmplitude * 0.4;

                const yVal = (wave + wave2) * Math.cos(zOff * 0.008);

                // Tilt
                const tiltedY = yVal * Math.cos(CONFIG.tiltX) - zOff * Math.sin(CONFIG.tiltX);
                const tiltedZ = yVal * Math.sin(CONFIG.tiltX) + zOff * Math.cos(CONFIG.tiltX);

                const p = project(xOff, tiltedY, tiltedZ);

                if (p.x < -20 || p.x > width + 20 || p.y < -20 || p.y > height + 20) continue;

                const r = CONFIG.baseRadius * p.scale;
                const alpha = Math.max(0.08, Math.min(0.7, p.scale * 0.65));

                // Color: blend from grey to accent based on wave height
                const blend = Math.max(0, Math.min(1, (yVal + CONFIG.waveAmplitude) / (CONFIG.waveAmplitude * 2)));
                const cr = Math.round(CONFIG.dotColor.r + (CONFIG.accentColor.r - CONFIG.dotColor.r) * blend);
                const cg = Math.round(CONFIG.dotColor.g + (CONFIG.accentColor.g - CONFIG.dotColor.g) * blend);
                const cb = Math.round(CONFIG.dotColor.b + (CONFIG.accentColor.b - CONFIG.dotColor.b) * blend);

                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
                ctx.fill();
            }
        }
    }

    /* ---- Animation loop ---- */
    function animate() {
        time += CONFIG.waveSpeed * 16; // normalize
        draw();
        updateLabelPositions();
        animFrame = requestAnimationFrame(animate);
    }

    /* ---- Labels ---- */
    function createLabelElements() {
        labelsContainer.innerHTML = '';
        labelEls = LABELS.map((label, i) => {
            const el = document.createElement('div');
            el.className = 'scan-label';
            el.innerHTML = `<span class="scan-label-dot"></span><span class="scan-label-text">${label.text}</span>`;
            el.style.opacity = '0';
            el.style.transform = 'translateY(6px)';
            labelsContainer.appendChild(el);
            return { el, index: i, visible: false };
        });
    }

    function pickRandomIndices(count) {
        const indices = [];
        const available = LABELS.map((_, i) => i);
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        return available.slice(0, count);
    }

    function showLabel(idx) {
        const item = labelEls[idx];
        if (!item) return;
        item.visible = true;
        item.el.style.transition = `opacity ${FADE_DURATION}ms ease, transform ${FADE_DURATION}ms ease`;
        item.el.style.opacity = '1';
        item.el.style.transform = 'translateY(0)';
    }

    function hideLabel(idx) {
        const item = labelEls[idx];
        if (!item) return;
        item.visible = false;
        item.el.style.transition = `opacity ${FADE_DURATION}ms ease, transform ${FADE_DURATION}ms ease`;
        item.el.style.opacity = '0';
        item.el.style.transform = 'translateY(6px)';
    }

    function updateLabelPositions() {
        for (const item of labelEls) {
            const label = LABELS[item.index];
            const x = label.gridX * width;
            const y = label.gridY * height;
            item.el.style.left = x + 'px';
            item.el.style.top = y + 'px';
        }
    }

    function initLabels() {
        createLabelElements();
        activeIndices = pickRandomIndices(VISIBLE_COUNT);
        activeIndices.forEach(idx => showLabel(idx));
    }

    function rotateLabels() {
        // Pick one active to hide and one inactive to show
        const inactiveIndices = LABELS.map((_, i) => i).filter(i => !activeIndices.includes(i));
        if (inactiveIndices.length === 0) return;

        const hideIdx = Math.floor(Math.random() * activeIndices.length);
        const showIdx = Math.floor(Math.random() * inactiveIndices.length);

        const toHide = activeIndices[hideIdx];
        const toShow = inactiveIndices[showIdx];

        hideLabel(toHide);

        setTimeout(() => {
            showLabel(toShow);
            activeIndices[hideIdx] = toShow;
        }, FADE_DURATION + 200);
    }

    /* ---- IntersectionObserver — only animate when visible ---- */
    let isRunning = false;
    let rotateTimer = null;

    function start() {
        if (isRunning) return;
        isRunning = true;
        animate();
        rotateTimer = setInterval(rotateLabels, ROTATE_INTERVAL);
    }

    function stop() {
        if (!isRunning) return;
        isRunning = false;
        cancelAnimationFrame(animFrame);
        clearInterval(rotateTimer);
    }

    /* ---- Reinit labels (for i18n language switch) ---- */
    window.PARTICLE_WAVE_REINIT = function () {
        // Reload the LABELS from global (i18n.js updates this)
        LABELS.length = 0;
        const newLabels = window.PARTICLE_WAVE_LABELS || [];
        newLabels.forEach(l => LABELS.push(l));
        activeIndices = [];
        initLabels();
    };

    /* ---- Init ---- */
    function init() {
        resize();
        initLabels();

        window.addEventListener('resize', () => {
            resize();
            updateLabelPositions();
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) start();
                    else stop();
                });
            },
            { threshold: 0.1 }
        );

        observer.observe(canvas.parentElement);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
