/* ============================================================
   Hide and Seeds — shared front-end behaviour
   - WebGL2 iridescent fluid background (with graceful fallback)
   - Minimal ring cursor + liquid-lens text/logo distortion
   - Scroll-driven ink-splatter video reveals (hero + projects)
   - Mobile nav, smooth anchors, reveal-on-scroll
   Every block is null-guarded so it runs on any page.
   ============================================================ */
(function () {
  'use strict';

  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector('.nav-toggle');
  const navEl = document.querySelector('nav');
  if (navToggle && navEl) {
    navToggle.addEventListener('click', () => {
      const open = navEl.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    navEl.querySelectorAll('ul a').forEach((a) => {
      a.addEventListener('click', () => {
        navEl.classList.remove('open');
        navToggle.classList.remove('open');
      });
    });
  }

  /* ---------- Smooth in-page anchors ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.length > 1) {
        const target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');
  if (revealEls.length) {
    if (reduceMotion || !('IntersectionObserver' in window)) {
      revealEls.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
      revealEls.forEach((el) => io.observe(el));
    }
  }

  /* ---------- Ring cursor ---------- */
  const ringCursor = document.getElementById('ring-cursor');
  let curX = window.innerWidth / 2, curY = window.innerHeight / 2;
  let ringX = curX, ringY = curY;
  if (ringCursor && !finePointer) ringCursor.style.display = 'none';

  /* ---------- Shader background ---------- */
  const canvas = document.getElementById('shader-canvas');
  const gl = canvas ? canvas.getContext('webgl2', { antialias: true, alpha: true }) : null;

  let mouseX = 0, mouseY = 0, smoothX = 0, smoothY = 0;
  let pointerStrength = 0, scrollAmt = 0;

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  }
  resizeCanvas();

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = (window.innerHeight - e.clientY) / window.innerHeight * 2 - 1;
    curX = e.clientX;
    curY = e.clientY;
    pointerStrength = 1.0;
    if (ringCursor) ringCursor.style.opacity = '1';
    requestReveal();
  });

  document.addEventListener('mouseleave', () => {
    pointerStrength = 0.0;
    if (ringCursor) ringCursor.style.opacity = '0';
  });

  window.addEventListener('scroll', () => {
    scrollAmt = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1);
  }, { passive: true });

  /* Ring grows over interactive elements + data-cursor labels + liquid text */
  if (finePointer && ringCursor) {
    const rcLabel = ringCursor.querySelector('.rc-label');
    document.querySelectorAll('a, button, .service-card, .client-logo, .cta-button, .hero-cta, input, textarea, select').forEach((el) => {
      el.addEventListener('mouseenter', () => ringCursor.classList.add('rc-hover'));
      el.addEventListener('mouseleave', () => ringCursor.classList.remove('rc-hover'));
    });
    document.querySelectorAll('[data-cursor]').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        if (rcLabel) rcLabel.textContent = el.getAttribute('data-cursor');
        ringCursor.classList.add('rc-label-on');
      });
      el.addEventListener('mouseleave', () => ringCursor.classList.remove('rc-label-on'));
    });

    /* Localized liquid lens within each client logo */
    document.querySelectorAll('.client-logo').forEach((logo) => {
      const baseImg = logo.querySelector('img');
      let warp = null, raf = 0, tx = 0, ty = 0;
      logo.addEventListener('mouseenter', () => {
        if (!warp && baseImg) {
          warp = document.createElement('img');
          warp.className = 'logo-warp';
          warp.src = baseImg.currentSrc || baseImg.src;
          warp.setAttribute('aria-hidden', 'true');
          logo.appendChild(warp);
        }
      });
      logo.addEventListener('mousemove', (e) => {
        const r = logo.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(() => {
          raf = 0;
          logo.style.setProperty('--mx', tx + 'px');
          logo.style.setProperty('--my', ty + 'px');
        });
      });
      logo.addEventListener('mouseleave', () => {
        if (warp) {
          const dying = warp; warp = null;
          dying.style.opacity = '0';
          setTimeout(() => dying.remove(), 460);
        }
      });
    });

    /* Cursor liquid lens over headings */
    function attachLiquid(el) {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      let clone = null, raf = 0, tx = 0, ty = 0;
      function build() {
        clone = el.cloneNode(true);
        clone.classList.add('liquid-clone');
        clone.removeAttribute('id');
        clone.querySelectorAll('[id], .liquid-clone').forEach((n) => {
          n.classList && n.classList.remove('liquid-clone');
          n.removeAttribute('id');
        });
        clone.style.setProperty('--mx', tx + 'px');
        clone.style.setProperty('--my', ty + 'px');
        el.appendChild(clone);
        requestAnimationFrame(() => { if (clone) clone.classList.add('is-on'); });
      }
      el.addEventListener('mouseenter', (e) => {
        const r = el.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!clone) build();
      });
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        tx = e.clientX - r.left; ty = e.clientY - r.top;
        if (!raf) raf = requestAnimationFrame(() => {
          raf = 0;
          if (clone) {
            clone.style.setProperty('--mx', tx + 'px');
            clone.style.setProperty('--my', ty + 'px');
          }
        });
      });
      el.addEventListener('mouseleave', () => {
        if (clone) {
          const dying = clone; clone = null;
          dying.classList.remove('is-on');
          setTimeout(() => dying.remove(), 320);
        }
      });
    }
    const liquidWords = '.hero h1, .about-content h2, .services-title, .service-card h3, .clients-title, .project-content h2, .cta-headline, .page-hero h1, .section-head h2, .inline-cta h2';
    document.querySelectorAll(liquidWords).forEach(attachLiquid);
  }

  /* If WebGL2 is unavailable, use the CSS gradient fallback and stop here for the shader. */
  if (!gl) {
    document.body.classList.add('no-webgl');
  }

  const vertexShader = `#version 300 es
    precision highp float;
    in vec2 position;
    out vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentShader = `#version 300 es
    precision highp float;
    in vec2 vUv;
    uniform float time;
    uniform vec2 pointer;
    uniform float pointerStrength;
    uniform float aspect;
    uniform float scroll;
    out vec4 outColor;

    float hash(vec2 p) {
      p = fract(p * vec2(123.34, 456.21));
      p += dot(p, p + 45.32);
      return fract(p.x * p.y);
    }
    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
      for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
      return v;
    }
    vec3 palette(float t) {
      vec3 a = vec3(0.40, 0.13, 0.50);
      vec3 b = vec3(0.42, 0.16, 0.48);
      vec3 c = vec3(1.00, 0.70, 1.00);
      vec3 d = vec3(0.00, 0.20, 0.55);
      return a + b * cos(6.2831853 * (c * t + d));
    }
    float field(vec2 p, float t, out vec2 warp) {
      vec2 q = vec2(fbm(p + vec2(0.0, 0.0) + t * 0.06),
                    fbm(p + vec2(5.2, 1.3) - t * 0.05));
      vec2 r = vec2(fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.07),
                    fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.06));
      warp = r;
      return fbm(p + 3.2 * r);
    }
    void main() {
      vec2 uv = vUv;
      vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 3.2;
      p.y += scroll * 2.0;
      p += vec2(0.6, 0.2) * scroll;
      vec2 m = pointer * 0.5 + 0.5;
      vec2 md = (uv - m) * vec2(aspect, 1.0);
      float mdist = length(md);
      float swirl = exp(-mdist * 2.4) * pointerStrength;
      float ang = swirl * 2.4;
      float cs = cos(ang), sn = sin(ang);
      p += mat2(cs, -sn, sn, cs) * md * swirl * 1.6;
      p -= normalize(md + 1e-5) * swirl * 0.7;
      float t = time * 0.9;
      float ca = 0.020 + swirl * 0.03;
      vec2 w;
      float fr = field(p + vec2(ca, 0.0), t, w);
      float fg = field(p, t, w);
      float fb = field(p - vec2(ca, 0.0), t, w);
      float hue = fg * 0.85 + (w.x - w.y) * 0.34 + 0.06 + scroll * 0.1;
      vec3 col = palette(hue);
      float fil = smoothstep(0.44, 0.82, fg);
      col *= 0.05 + fil * 2.6;
      col.r *= 1.0 + (fr - fg) * 2.0;
      col.b *= 1.0 + (fb - fg) * 4.5;
      col += vec3(1.0, 0.80, 0.34) * pow(max(fg - 0.80, 0.0), 2.0) * 1.3;
      col += vec3(0.34, 0.20, 0.66) * swirl * 0.55;
      float vig = smoothstep(1.3, 0.15, length((uv - 0.5) * vec2(aspect, 1.0)));
      vec3 base = vec3(0.012, 0.014, 0.045);
      col = base + col * (0.5 + 0.5 * vig);
      col = clamp(col, 0.0, 1.0);
      outColor = vec4(col, 1.0);
    }
  `;

  let program = null, timeLocation, pointerLocation, pointerStrengthLocation, aspectLocation, scrollLocation;

  if (gl) {
    const compileShader = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
      return shader;
    };
    const vShader = compileShader(gl.VERTEX_SHADER, vertexShader);
    const fShader = compileShader(gl.FRAGMENT_SHADER, fragmentShader);
    program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    timeLocation = gl.getUniformLocation(program, 'time');
    pointerLocation = gl.getUniformLocation(program, 'pointer');
    pointerStrengthLocation = gl.getUniformLocation(program, 'pointerStrength');
    aspectLocation = gl.getUniformLocation(program, 'aspect');
    scrollLocation = gl.getUniformLocation(program, 'scroll');
  }

  const startTime = Date.now();
  let smoothScroll = 0;

  function render() {
    const elapsed = (Date.now() - startTime) / 1000;
    smoothX += (mouseX - smoothX) * 0.06;
    smoothY += (mouseY - smoothY) * 0.06;
    smoothScroll += (scrollAmt - smoothScroll) * 0.05;

    if (gl && program) {
      gl.uniform1f(timeLocation, elapsed);
      gl.uniform2f(pointerLocation, smoothX, smoothY);
      gl.uniform1f(pointerStrengthLocation, pointerStrength);
      gl.uniform1f(aspectLocation, canvas.width / canvas.height);
      gl.uniform1f(scrollLocation, smoothScroll);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    if (ringCursor && finePointer) {
      ringX += (curX - ringX) * 0.16;
      ringY += (curY - ringY) * 0.16;
      ringCursor.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
    }
    requestAnimationFrame(render);
  }

  /* ---------- Ink-splatter video reveals ---------- */
  function makeSplatter(seed) {
    const blobs = [
      { x: 50, y: 52, size: 30, delay: 0.00 },
      { x: 38, y: 42, size: 24, delay: 0.04 },
      { x: 63, y: 46, size: 26, delay: 0.07 },
      { x: 46, y: 64, size: 22, delay: 0.11 },
      { x: 60, y: 66, size: 20, delay: 0.15 },
      { x: 30, y: 58, size: 18, delay: 0.20 },
      { x: 71, y: 33, size: 19, delay: 0.23 },
      { x: 22, y: 36, size: 15, delay: 0.29 },
      { x: 80, y: 56, size: 16, delay: 0.32 },
      { x: 50, y: 26, size: 17, delay: 0.35 },
      { x: 40, y: 80, size: 14, delay: 0.40 },
      { x: 64, y: 82, size: 13, delay: 0.44 },
      { x: 15, y: 68, size: 12, delay: 0.48 },
      { x: 85, y: 30, size: 12, delay: 0.50 }
    ];
    return blobs.map((b, i) => ({
      ...b,
      x: b.x + ((seed * 13 + i * 7) % 9) - 4,
      y: b.y + ((seed * 7 + i * 11) % 9) - 4
    }));
  }

  function smoothstepFn(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  function buildMask(p, blobs, t, cx, cy, pstr) {
    const layers = blobs.map((b) => {
      const local = smoothstepFn((p - b.delay) / (1 - b.delay));
      const ph = b.x * 0.07 + b.y * 0.05;
      let bx = b.x + Math.sin(t * 1.1 + ph) * 1.8;
      let by = b.y + Math.cos(t * 0.9 + ph * 1.6) * 1.8;
      let rx = local * b.size * (1 + 0.08 * Math.sin(t * 1.6 + ph));
      if (pstr > 0.01) {
        const dx = bx - cx;
        const dy = (by - cy) * 0.55;
        const infl = Math.exp(-(dx * dx + dy * dy) / 520) * pstr;
        rx *= 1 + infl * 0.8;
        bx -= dx * 0.14 * infl;
        by -= (by - cy) * 0.14 * infl;
      }
      const ry = rx * 1.6;
      return `radial-gradient(ellipse ${rx}% ${ry}% at ${bx}% ${by}%, #000 30%, rgba(0,0,0,0.35) 64%, rgba(0,0,0,0) 100%)`;
    });
    return layers.join(', ');
  }

  const projectTracks = [...document.querySelectorAll('.project-scroll')].map((track, i) => ({
    track,
    video: track.querySelector('.project-video'),
    vignette: track.querySelector('.project-vignette'),
    content: track.querySelector('.project-content'),
    blobs: makeSplatter(i + 1)
  }));

  const heroScroll = document.querySelector('.hero-scroll');
  const heroVideoEl = heroScroll && heroScroll.querySelector('.hero-video');
  const heroBlobs = makeSplatter(0);

  let ticking = false;
  function updateReveals() {
    ticking = false;
    const vh = window.innerHeight;
    const t = (Date.now() - startTime) / 1000;
    const cx = (curX / window.innerWidth) * 100;
    const cy = (curY / window.innerHeight) * 100;

    if (heroScroll && heroVideoEl) {
      const rect = heroScroll.getBoundingClientRect();
      const total = rect.height - vh;
      const scrolled = -rect.top;
      let progress = total > 0 ? scrolled / total : 0;
      progress = Math.max(0, Math.min(1, progress));
      const revealP = Math.max(0, Math.min(1, progress / 0.55));
      if (revealP >= 0.985) {
        heroVideoEl.style.webkitMaskImage = 'none';
        heroVideoEl.style.maskImage = 'none';
      } else {
        const mask = buildMask(revealP, heroBlobs, t, cx, cy, pointerStrength);
        heroVideoEl.style.webkitMaskImage = mask;
        heroVideoEl.style.maskImage = mask;
      }
    }

    projectTracks.forEach(({ track, video, vignette, content, blobs }) => {
      if (!video) return;
      const rect = track.getBoundingClientRect();
      const total = rect.height - vh;
      const scrolled = -rect.top;
      let progress = total > 0 ? scrolled / total : 0;
      progress = Math.max(0, Math.min(1, progress));
      const onScreen = rect.bottom > -vh && rect.top < vh * 2;
      if (!onScreen) return;
      const revealP = Math.max(0, Math.min(1, progress / 0.65));
      const mask = buildMask(revealP, blobs, t, cx, cy, pointerStrength);
      video.style.webkitMaskImage = mask;
      video.style.maskImage = mask;
      if (vignette) vignette.style.opacity = revealP > 0.55 ? '1' : '0';
      if (content) {
        if (revealP > 0.6) {
          content.style.opacity = '1';
          content.style.transform = 'translateY(0)';
        } else {
          content.style.opacity = '0';
          content.style.transform = 'translateY(40px)';
        }
      }
    });
  }

  function requestReveal() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateReveals);
    }
  }

  window.addEventListener('scroll', requestReveal, { passive: true });
  window.addEventListener('resize', requestReveal);
  window.addEventListener('resize', resizeCanvas);

  updateReveals();
  render();
})();
