// CRIVOS // Motor Gráfico de Coordenadas Táticas Interativas (Canvas 2D)
// Compatível com Retina Displays (DPR), Touch, Mouse Pointer e Pulso Autônomo
(function initCoordCanvas() {
  const canvas = document.getElementById('coord-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  const pointer = { x: -9999, y: -9999, active: false };
  let pulseAngle = 0;

  function setSize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  let nodes = [];
  function populateNodes() {
    setSize();
    nodes = [];
    const isMobile = width < 768;
    const densityDivisor = isMobile ? 12000 : 16000;
    const count = Math.max(28, Math.min(75, Math.floor((width * height) / densityDivisor)));
    const speed = isMobile ? 0.32 : 0.44;

    for (let i = 0; i < count; i++) {
      const isMajor = Math.random() < 0.22;
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed,
        size: isMajor ? 3.5 : 2.2,
        isMajor: isMajor
      });
    }
  }

  populateNodes();

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(populateNodes, 120);
  });

  window.addEventListener('mousemove', e => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  }, { passive: true });

  window.addEventListener('mouseleave', () => {
    pointer.active = false;
  }, { passive: true });

  window.addEventListener('touchstart', e => {
    if (e.touches && e.touches[0]) {
      pointer.x = e.touches[0].clientX;
      pointer.y = e.touches[0].clientY;
      pointer.active = true;
    }
  }, { passive: true });

  window.addEventListener('touchmove', e => {
    if (e.touches && e.touches[0]) {
      pointer.x = e.touches[0].clientX;
      pointer.y = e.touches[0].clientY;
      pointer.active = true;
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    pointer.active = false;
  }, { passive: true });

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const isMobile = width < 768;

    const gridStroke = isDark ? 'rgba(242, 242, 238, 0.065)' : 'rgba(17, 17, 17, 0.08)';
    const nodeFill = isDark ? 'rgba(242, 242, 238, 0.42)' : 'rgba(17, 17, 17, 0.36)';
    const majorNodeFill = '#D92B2B';

    const step = isMobile ? 44 : 64;
    ctx.strokeStyle = gridStroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += step) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    pulseAngle += 0.012;
    const focalX = pointer.active ? pointer.x : width * 0.5 + Math.cos(pulseAngle) * (width * 0.28);
    const focalY = pointer.active ? pointer.y : height * 0.45 + Math.sin(pulseAngle * 0.8) * (height * 0.25);
    const connectDist = isMobile ? 120 : 155;
    const focalDist = isMobile ? 155 : 210;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;

      ctx.fillStyle = n.isMajor ? majorNodeFill : nodeFill;
      ctx.fillRect(n.x - n.size / 2, n.y - n.size / 2, n.size, n.size);

      for (let j = i + 1; j < nodes.length; j++) {
        const n2 = nodes[j];
        const dist = Math.hypot(n.x - n2.x, n.y - n2.y);
        if (dist < connectDist) {
          const alpha = (1 - dist / connectDist) * (isDark ? 0.26 : 0.22);
          ctx.strokeStyle = isDark ? `rgba(242, 242, 238, ${alpha})` : `rgba(17, 17, 17, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(n2.x, n2.y);
          ctx.stroke();
        }
      }

      const fdist = Math.hypot(n.x - focalX, n.y - focalY);
      if (fdist < focalDist) {
        const fAlpha = (1 - fdist / focalDist) * (pointer.active ? 0.72 : 0.4);
        ctx.strokeStyle = `rgba(217, 43, 43, ${fAlpha})`;
        ctx.lineWidth = pointer.active && fdist < (focalDist * 0.45) ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(n.x, n.y);
        ctx.lineTo(focalX, focalY);
        ctx.stroke();
      }
    }

    requestAnimationFrame(draw);
  }

  draw();
})();
