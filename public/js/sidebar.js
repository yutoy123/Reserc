/* Reserc — StaggeredMenu (vanilla JS + GSAP, injected on every protected page) */
(function () {
  if (window.location.pathname.includes('auth') || window.location.pathname.includes('login')) return;

  // ── Icons ──────────────────────────────────────────────────────────────────
  const icons = {
    home:        `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M7 18V12h6v6"/></svg>`,
    explore:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M13 7l-1.5 5.5L6 14l1.5-5.5L13 7z"/></svg>`,
    investigate: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-3.5-3.5"/></svg>`,
    build:       `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="13" width="14" height="3.5"/><rect x="5" y="9" width="10" height="3.5"/><rect x="7" y="5" width="6" height="3.5"/></svg>`,
    frameworks:  `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="5.5" height="5.5"/><rect x="11.5" y="3" width="5.5" height="5.5"/><rect x="3" y="11.5" width="5.5" height="5.5"/><rect x="11.5" y="11.5" width="5.5" height="5.5"/></svg>`,
    chat:        `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H6.5L3 17V5a1 1 0 011-1z"/></svg>`,
    library:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v12M8 4v12"/><path d="M12 4l3.5 12M16 4l-3.5 12"/></svg>`,
    compare:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="6" height="12"/><rect x="11" y="4" width="6" height="12"/></svg>`,
    signout:     `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 6.5L16 10l-3.5 3.5M16 10H7"/><path d="M9 4H5a1 1 0 00-1 1v10a1 1 0 001 1h4"/></svg>`,
  };

  // ── Nav data ───────────────────────────────────────────────────────────────
  const path = window.location.pathname;
  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path.includes(href.replace('.html', ''));
  }

  const navSections = [
    {
      label: 'Research',
      items: [
        { label: 'Home',        href: '/',                 icon: 'home'        },
        { label: 'Explore',     href: '/explore.html',     icon: 'explore'     },
        { label: 'Investigate', href: '/investigate.html', icon: 'investigate' },
        { label: 'Build',       href: '/build.html',       icon: 'build'       },
        { label: 'Frameworks',  href: '/frameworks.html',  icon: 'frameworks'  },
      ],
    },
    {
      label: 'Tools',
      items: [
        { label: 'Ask AI',  href: '/chat.html',    icon: 'chat',    badge: 'AI' },
        { label: 'Library', href: '/library.html', icon: 'library'              },
        { label: 'Compare', href: '/compare.html', icon: 'compare'              },
      ],
    },
  ];

  // ── Build HTML ─────────────────────────────────────────────────────────────
  function buildNavItems(items) {
    return items.map((item, i) => {
      const active = isActive(item.href) ? ' sm-active' : '';
      const badgeHtml = item.badge ? `<span class="sm-item-badge">${item.badge}</span>` : '';
      const num = String(i + 1).padStart(2, '0');
      return `
        <li class="sm-nav-li">
          <a href="${item.href}" class="sm-nav-item${active}">
            <span class="sm-item-num">${num}</span>
            <span class="sm-item-label-wrap">
              <span class="sm-item-label">${item.label}</span>
              ${badgeHtml}
            </span>
            <span class="sm-item-icon">${icons[item.icon]}</span>
          </a>
        </li>`;
    }).join('');
  }

  const sectionsHtml = navSections.map(sec => `
    <div class="sm-nav-section">
      <div class="sm-section-label">${sec.label}</div>
      <ul class="sm-nav-list">${buildNavItems(sec.items)}</ul>
    </div>`).join('');

  const html = `
    <!-- Prelayer -->
    <div class="sm-prelayer" id="smPre1"></div>

    <!-- Panel -->
    <div class="sm-panel" id="smPanel" role="dialog" aria-modal="true" aria-label="Navigation">
      <div class="sm-panel-inner">
        <div class="sm-panel-head">
          <a href="/" class="sm-panel-logo">
            <span class="sm-panel-logo-text">Reserc</span>
          </a>
        </div>

        <nav class="sm-nav">${sectionsHtml}</nav>

        <div class="sm-panel-footer">
          <button class="sm-signout-btn" onclick="logout()">
            <span class="sm-signout-icon">${icons.signout}</span>
            <span>Sign out</span>
          </button>
          <p class="sm-footer-tagline">LMIC economics research</p>
        </div>
      </div>
    </div>

    <!-- Toggle button -->
    <button class="sm-toggle-btn" id="smToggle" aria-label="Open menu" aria-expanded="false" aria-controls="smPanel">
      <span class="sm-toggle-bars" id="smBars">
        <span class="sm-bar sm-bar-1"></span>
        <span class="sm-bar sm-bar-2"></span>
        <span class="sm-bar sm-bar-3"></span>
      </span>
    </button>

    <!-- Overlay -->
    <div class="sm-overlay" id="smOverlay"></div>
  `;

  const wrapper = document.createElement('div');
  wrapper.id = 'smWrapper';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  document.body.classList.add('sm-layout');

  // ── Load GSAP then init ────────────────────────────────────────────────────
  function loadGSAP(cb) {
    if (window.gsap) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
    s.onload = cb;
    document.head.appendChild(s);
  }

  loadGSAP(function () {
    const panel   = document.getElementById('smPanel');
    const pre1    = document.getElementById('smPre1');
    const toggle  = document.getElementById('smToggle');
    const overlay = document.getElementById('smOverlay');
    const allItems= panel.querySelectorAll('.sm-item-label');

    let isOpen   = false;
    let busy     = false;
    let openTl   = null;
    let closeTw  = null;

    // Initial positions — all offscreen left
    gsap.set([pre1, panel], { xPercent: -100, opacity: 1 });
    gsap.set(allItems, { yPercent: 120, rotate: 8, opacity: 0 });

    function playOpen() {
      if (busy) return;
      busy = true;
      if (closeTw) { closeTw.kill(); closeTw = null; }
      if (openTl)  { openTl.kill(); }

      gsap.set(allItems, { yPercent: 120, rotate: 8, opacity: 0 });

      const tl = gsap.timeline({
        onComplete: () => { busy = false; }
      });

      // Pre-layer sweeps in
      tl.fromTo(pre1, { xPercent: -100 }, { xPercent: 0, duration: 0.42, ease: 'power4.out' }, 0);
      // Panel sweeps in
      tl.fromTo(panel, { xPercent: -100 }, { xPercent: 0, duration: 0.6, ease: 'power4.out' }, 0.12);
      // Nav items stagger up
      tl.to(allItems, {
        yPercent: 0, rotate: 0, opacity: 1,
        duration: 0.7, ease: 'power4.out',
        stagger: { each: 0.07, from: 'start' }
      }, 0.32);

      openTl = tl;

      // Animate toggle bars → X
      gsap.to('.sm-bar-1', { y: 6.5, rotate: 45, duration: 0.3, ease: 'power3.inOut' });
      gsap.to('.sm-bar-2', { opacity: 0, duration: 0.2 });
      gsap.to('.sm-bar-3', { y: -6.5, rotate: -45, duration: 0.3, ease: 'power3.inOut' });

      // Show overlay
      gsap.to(overlay, { opacity: 1, duration: 0.3, display: 'block' });

      toggle.setAttribute('aria-expanded', 'true');
    }

    function playClose() {
      if (openTl) { openTl.kill(); openTl = null; }

      if (closeTw) closeTw.kill();
      closeTw = gsap.to([pre1, panel], {
        xPercent: -100, duration: 0.3, ease: 'power3.in', overwrite: 'auto',
        onComplete: () => { busy = false; }
      });

      // Bars back to hamburger
      gsap.to('.sm-bar-1', { y: 0, rotate: 0, duration: 0.28, ease: 'power3.inOut' });
      gsap.to('.sm-bar-2', { opacity: 1, duration: 0.2, delay: 0.08 });
      gsap.to('.sm-bar-3', { y: 0, rotate: 0, duration: 0.28, ease: 'power3.inOut' });

      // Hide overlay
      gsap.to(overlay, { opacity: 0, duration: 0.25, onComplete: () => { overlay.style.display = 'none'; } });

      toggle.setAttribute('aria-expanded', 'false');
    }

    function toggle_menu() {
      isOpen = !isOpen;
      if (isOpen) playOpen();
      else        playClose();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      playClose();
    }

    toggle.addEventListener('click', toggle_menu);
    overlay.addEventListener('click', close);

    // Close when a nav link is clicked
    panel.querySelectorAll('.sm-nav-item').forEach(link => {
      link.addEventListener('click', close);
    });

    // Keyboard: Escape closes
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  });

  // ── Global logout ──────────────────────────────────────────────────────────
  window.logout = async function () {
    try { await fetch('/api/auth/signout', { method: 'POST' }); } catch {}
    window.location.href = '/auth.html';
  };

  // ── Reveal fallback ────────────────────────────────────────────────────────
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.visible)').forEach(el => el.classList.add('visible'));
  }, 3000);

})();
