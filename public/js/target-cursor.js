/* Reserc — TargetCursor (vanilla JS port of React Bits component, GSAP-powered) */
(function () {
  'use strict';

  // ── Mobile detection — skip entirely on touch/mobile devices ──────────────
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen  = window.innerWidth <= 768;
  const isMobileUA     = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i
                           .test((navigator.userAgent || '').toLowerCase());
  if ((hasTouchScreen && isSmallScreen) || isMobileUA) return;

  // ── Config ─────────────────────────────────────────────────────────────────
  const TARGET_SEL    = 'a, button';
  const COLOR_REST    = '#d4a843';   // ochre gold
  const COLOR_HOVER   = '#faf6f0';   // cream white
  const SPIN_DUR      = 2;
  const HOVER_DUR     = 0.2;
  const PARALLAX      = true;
  const BORDER_W      = 3;
  const CORNER_SZ     = 12;

  // ── Inject cursor DOM ──────────────────────────────────────────────────────
  const cursorEl = document.createElement('div');
  cursorEl.id        = 'tcWrapper';
  cursorEl.className = 'target-cursor-wrapper';
  cursorEl.innerHTML = `
    <div class="target-cursor-dot"    style="background-color:${COLOR_REST}"></div>
    <div class="target-cursor-corner corner-tl" style="border-color:${COLOR_REST}"></div>
    <div class="target-cursor-corner corner-tr" style="border-color:${COLOR_REST}"></div>
    <div class="target-cursor-corner corner-br" style="border-color:${COLOR_REST}"></div>
    <div class="target-cursor-corner corner-bl" style="border-color:${COLOR_REST}"></div>
  `;
  document.body.appendChild(cursorEl);
  document.body.classList.add('tc-active');   // hides default cursor via CSS

  // ── Containing-block helpers (fixes fixed-position offsets) ────────────────
  function getContainingBlock(el) {
    let node = el && el.parentElement;
    while (node && node !== document.documentElement) {
      const s = getComputedStyle(node);
      if (
        s.transform   !== 'none' ||
        s.perspective !== 'none' ||
        s.filter      !== 'none' ||
        s.willChange.includes('transform') ||
        s.willChange.includes('perspective') ||
        s.willChange.includes('filter') ||
        /paint|layout|strict|content/.test(s.contain)
      ) return node;
      node = node.parentElement;
    }
    return null;
  }
  function getCBOffset(block) {
    if (!block) return { x: 0, y: 0 };
    const r = block.getBoundingClientRect();
    return { x: r.left + block.clientLeft, y: r.top + block.clientTop };
  }

  // ── Main init (runs once GSAP is available) ────────────────────────────────
  function initCursor(gsap) {
    const cursor  = cursorEl;
    const dot     = cursor.querySelector('.target-cursor-dot');
    const corners = Array.from(cursor.querySelectorAll('.target-cursor-corner'));

    let containingBlock    = getContainingBlock(cursor);
    const getOffset        = () => getCBOffset(containingBlock);

    let activeTarget       = null;
    let currentLeaveHandler= null;
    let resumeTimeout      = null;
    let spinTl             = null;
    let targetCornerPos    = null;
    const activeStrength   = { current: 0 };
    let tickerFn           = null;

    // Centre cursor in viewport on load
    const initOffset = getOffset();
    gsap.set(cursor, {
      xPercent: -50,
      yPercent: -50,
      x: window.innerWidth  / 2 - initOffset.x,
      y: window.innerHeight / 2 - initOffset.y,
    });

    // Spinning idle animation
    function createSpin() {
      if (spinTl) spinTl.kill();
      spinTl = gsap.timeline({ repeat: -1 })
        .to(cursor, { rotation: '+=360', duration: SPIN_DUR, ease: 'none' });
    }
    createSpin();

    // Per-frame parallax tick while locked onto a target
    tickerFn = function () {
      if (!targetCornerPos) return;
      const str = activeStrength.current;
      if (str === 0) return;
      const cx = gsap.getProperty(cursor, 'x');
      const cy = gsap.getProperty(cursor, 'y');
      corners.forEach((c, i) => {
        const curX = gsap.getProperty(c, 'x');
        const curY = gsap.getProperty(c, 'y');
        const tX   = targetCornerPos[i].x - cx;
        const tY   = targetCornerPos[i].y - cy;
        const dur  = str >= 0.99 ? (PARALLAX ? 0.2 : 0) : 0.05;
        gsap.to(c, {
          x: curX + (tX - curX) * str,
          y: curY + (tY - curY) * str,
          duration: dur,
          ease: dur === 0 ? 'none' : 'power1.out',
          overwrite: 'auto',
        });
      });
    };

    // ── Mouse tracking ────────────────────────────────────────────────────────
    window.addEventListener('mousemove', e => {
      const { x: ox, y: oy } = getOffset();
      gsap.to(cursor, { x: e.clientX - ox, y: e.clientY - oy, duration: 0.1, ease: 'power3.out' });
    });

    window.addEventListener('scroll', () => {
      if (!activeTarget) return;
      const { x: ox, y: oy } = getOffset();
      const mx = gsap.getProperty(cursor, 'x') + ox;
      const my = gsap.getProperty(cursor, 'y') + oy;
      const el = document.elementFromPoint(mx, my);
      const stillOver = el && (el === activeTarget || el.closest(TARGET_SEL) === activeTarget);
      if (!stillOver && currentLeaveHandler) currentLeaveHandler();
    }, { passive: true });

    window.addEventListener('mousedown', () => {
      gsap.to(dot,    { scale: 0.7, duration: 0.3 });
      gsap.to(cursor, { scale: 0.9, duration: 0.2 });
    });
    window.addEventListener('mouseup', () => {
      gsap.to(dot,    { scale: 1, duration: 0.3 });
      gsap.to(cursor, { scale: 1, duration: 0.2 });
    });

    // ── Hover enter ───────────────────────────────────────────────────────────
    function cleanupTarget(t) {
      if (currentLeaveHandler) t.removeEventListener('mouseleave', currentLeaveHandler);
      currentLeaveHandler = null;
    }

    window.addEventListener('mouseover', e => {
      // Walk up DOM to find nearest matching target
      let node = e.target, target = null;
      while (node && node !== document.body) {
        if (node.matches && node.matches(TARGET_SEL)) { target = node; break; }
        node = node.parentElement;
      }
      if (!target || activeTarget === target) return;
      if (activeTarget) cleanupTarget(activeTarget);
      if (resumeTimeout) { clearTimeout(resumeTimeout); resumeTimeout = null; }

      activeTarget = target;
      corners.forEach(c => gsap.killTweensOf(c, 'x,y'));
      gsap.killTweensOf(cursor, 'rotation');
      if (spinTl) spinTl.pause();
      gsap.set(cursor, { rotation: 0 });

      // Colour transition → hover colour
      gsap.to(corners, { borderColor: COLOR_HOVER, duration: 0.15, ease: 'power2.out' });
      gsap.to(dot,     { backgroundColor: COLOR_HOVER, duration: 0.15, ease: 'power2.out' });

      // Compute corner positions from element bounding box
      const rect = target.getBoundingClientRect();
      const { x: ox, y: oy } = getOffset();
      const cx = gsap.getProperty(cursor, 'x');
      const cy = gsap.getProperty(cursor, 'y');

      targetCornerPos = [
        { x: rect.left  - BORDER_W            - ox, y: rect.top    - BORDER_W            - oy }, // TL
        { x: rect.right + BORDER_W - CORNER_SZ - ox, y: rect.top    - BORDER_W            - oy }, // TR
        { x: rect.right + BORDER_W - CORNER_SZ - ox, y: rect.bottom + BORDER_W - CORNER_SZ - oy }, // BR
        { x: rect.left  - BORDER_W            - ox, y: rect.bottom + BORDER_W - CORNER_SZ - oy }, // BL
      ];

      gsap.ticker.add(tickerFn);
      gsap.to(activeStrength, { current: 1, duration: HOVER_DUR, ease: 'power2.out' });

      corners.forEach((c, i) => {
        gsap.to(c, {
          x: targetCornerPos[i].x - cx,
          y: targetCornerPos[i].y - cy,
          duration: 0.2,
          ease: 'power2.out',
        });
      });

      // ── Hover leave ─────────────────────────────────────────────────────────
      const leaveHandler = () => {
        gsap.ticker.remove(tickerFn);
        targetCornerPos = null;
        activeTarget    = null;
        gsap.set(activeStrength, { current: 0, overwrite: true });

        // Colour back to rest
        gsap.to(corners, { borderColor: COLOR_REST, duration: 0.15, ease: 'power2.out' });
        gsap.to(dot,     { backgroundColor: COLOR_REST, duration: 0.15, ease: 'power2.out' });

        // Corners snap back to resting positions
        gsap.killTweensOf(corners, 'x,y');
        const rest = [
          { x: -CORNER_SZ * 1.5, y: -CORNER_SZ * 1.5 },
          { x:  CORNER_SZ * 0.5, y: -CORNER_SZ * 1.5 },
          { x:  CORNER_SZ * 0.5, y:  CORNER_SZ * 0.5 },
          { x: -CORNER_SZ * 1.5, y:  CORNER_SZ * 0.5 },
        ];
        const tl = gsap.timeline();
        corners.forEach((c, i) => tl.to(c, { ...rest[i], duration: 0.3, ease: 'power3.out' }, 0));

        // Resume spin after a short pause
        resumeTimeout = setTimeout(() => {
          if (!activeTarget && spinTl) {
            const rot  = gsap.getProperty(cursor, 'rotation') % 360;
            spinTl.kill();
            spinTl = gsap.timeline({ repeat: -1 })
              .to(cursor, { rotation: '+=360', duration: SPIN_DUR, ease: 'none' });
            gsap.to(cursor, {
              rotation: rot + 360,
              duration: SPIN_DUR * (1 - rot / 360),
              ease: 'none',
              onComplete: () => spinTl && spinTl.restart(),
            });
          }
          resumeTimeout = null;
        }, 50);

        cleanupTarget(target);
      };

      currentLeaveHandler = leaveHandler;
      target.addEventListener('mouseleave', leaveHandler);
    }, { passive: true });

    window.addEventListener('resize', () => { containingBlock = getContainingBlock(cursor); });
  }

  // ── GSAP loader (reuses already-loaded instance from sidebar.js if present) ─
  function loadGSAP(cb) {
    if (window.gsap) { cb(window.gsap); return; }
    const s    = document.createElement('script');
    s.src      = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
    s.onload   = () => cb(window.gsap);
    document.head.appendChild(s);
  }

  loadGSAP(initCursor);
})();
