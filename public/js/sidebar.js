/* Reserc Sidebar — injected into every protected page */
(function () {
  // Don't show sidebar on auth page
  if (window.location.pathname.includes('auth') || window.location.pathname.includes('login')) return;

  // ── Icons ─────────────────────────────────────────────────────────────
  const icons = {
    home: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L10 3l7 6.5V17a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M7 18V12h6v6"/></svg>`,
    explore: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="7"/><path d="M13 7l-1.5 5.5L6 14l1.5-5.5L13 7z"/></svg>`,
    investigate: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8.5" cy="8.5" r="5.5"/><path d="M17 17l-3.5-3.5"/></svg>`,
    build: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="13" width="14" height="3.5"/><rect x="5" y="9" width="10" height="3.5"/><rect x="7" y="5" width="6" height="3.5"/></svg>`,
    frameworks: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="5.5" height="5.5"/><rect x="11.5" y="3" width="5.5" height="5.5"/><rect x="3" y="11.5" width="5.5" height="5.5"/><rect x="11.5" y="11.5" width="5.5" height="5.5"/></svg>`,
    chat: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h14a1 1 0 011 1v8a1 1 0 01-1 1H6.5L3 17V5a1 1 0 011-1z"/><path d="M7 9h6M7 12h4"/></svg>`,
    library: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4v12M8 4v12"/><path d="M12 4l3.5 12"/><path d="M16 4l-3.5 12"/></svg>`,
    compare: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="6" height="12"/><rect x="11" y="4" width="6" height="12"/></svg>`,
    settings: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10" cy="10" r="2.5"/><path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"/></svg>`,
    signout: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12.5 6.5L16 10l-3.5 3.5M16 10H7"/><path d="M9 4H5a1 1 0 00-1 1v10a1 1 0 001 1h4"/></svg>`,
    collapse: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15l-5-5 5-5"/></svg>`,
    menu: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h14M3 10h14M3 14h14"/></svg>`,
  };

  // ── Active page detection ──────────────────────────────────────────────
  const path = window.location.pathname;
  function isActive(href) {
    if (href === '/') return path === '/' || path === '/index.html';
    return path.includes(href.replace('.html', ''));
  }

  // ── Build nav item ─────────────────────────────────────────────────────
  function navItem({ label, href, icon, badge, extraClass = '' }) {
    const active = isActive(href) ? ' active' : '';
    const badgeHtml = badge ? `<span class="sb-item-badge">${badge}</span>` : '';
    return `
      <a href="${href}" class="sb-item${active}${extraClass ? ' ' + extraClass : ''}" data-tooltip="${label}">
        <span class="sb-item-icon">${icons[icon]}</span>
        <span class="sb-item-label">${label}</span>
        ${badgeHtml}
      </a>`;
  }

  // ── Sidebar HTML ───────────────────────────────────────────────────────
  const sidebarHtml = `
    <div class="sb-logo-wrap">
      <a href="/" class="sb-logo">
        <span class="sb-logo-mark">R</span>
        <span class="sb-logo-text">
          <span class="sb-logo-name">Reserc</span>
          <span class="sb-logo-sub">LMIC economics</span>
        </span>
      </a>
    </div>

    <nav class="sb-nav">
      <div class="sb-section-label">Research</div>
      ${navItem({ label: 'Home',        href: '/',                 icon: 'home'        })}
      ${navItem({ label: 'Explore',     href: '/explore.html',     icon: 'explore'     })}
      ${navItem({ label: 'Investigate', href: '/investigate.html', icon: 'investigate' })}
      ${navItem({ label: 'Build',       href: '/build.html',       icon: 'build'       })}
      ${navItem({ label: 'Frameworks',  href: '/frameworks.html',  icon: 'frameworks'  })}

      <div class="sb-divider"></div>
      <div class="sb-section-label">Tools</div>
      ${navItem({ label: 'Ask AI',  href: '/chat.html',    icon: 'chat',    badge: 'AI',  extraClass: 'ai-item' })}
      ${navItem({ label: 'Library', href: '/library.html', icon: 'library' })}
      ${navItem({ label: 'Compare', href: '/compare.html', icon: 'compare' })}
    </nav>

    <div class="sb-bottom">
      <div class="sb-divider" style="margin:0 16px 8px"></div>
      <button class="sb-item" onclick="logout()" data-tooltip="Sign out" style="cursor:pointer">
        <span class="sb-item-icon">${icons.signout}</span>
        <span class="sb-item-label">Sign out</span>
      </button>
      <button class="sb-collapse-btn" id="sbCollapseBtn" data-tooltip="Expand">
        <span class="sb-collapse-icon">${icons.collapse}</span>
        <span class="sb-collapse-label">Collapse menu</span>
      </button>
    </div>
  `;

  // ── Mobile hamburger ───────────────────────────────────────────────────
  const hamburgerHtml = `
    <button class="sb-hamburger" id="sbHamburger" aria-label="Open menu">
      ${icons.menu}
    </button>
    <div class="sb-overlay" id="sbOverlay"></div>
  `;

  // ── Inject sidebar ─────────────────────────────────────────────────────
  const sidebar = document.createElement('aside');
  sidebar.className = 'sb-sidebar';
  sidebar.innerHTML = sidebarHtml;
  document.body.insertBefore(sidebar, document.body.firstChild);

  // Inject mobile elements
  document.body.insertAdjacentHTML('beforeend', hamburgerHtml);

  // Apply layout class
  document.body.classList.add('sb-layout');

  // ── Collapse state (persist in localStorage) ───────────────────────────
  const STORAGE_KEY = 'reserc_sb_collapsed';
  let isCollapsed = localStorage.getItem(STORAGE_KEY) === 'true';
  if (isCollapsed) document.body.classList.add('sb-collapsed');

  document.getElementById('sbCollapseBtn').addEventListener('click', () => {
    isCollapsed = !isCollapsed;
    document.body.classList.toggle('sb-collapsed', isCollapsed);
    localStorage.setItem(STORAGE_KEY, isCollapsed);
  });

  // ── Mobile toggle ──────────────────────────────────────────────────────
  const hamburger = document.getElementById('sbHamburger');
  const overlay   = document.getElementById('sbOverlay');

  hamburger.addEventListener('click', () => {
    document.body.classList.add('sb-mobile-open');
  });
  overlay.addEventListener('click', () => {
    document.body.classList.remove('sb-mobile-open');
  });

  // Close mobile nav on nav item click
  sidebar.querySelectorAll('.sb-item[href]').forEach(link => {
    link.addEventListener('click', () => document.body.classList.remove('sb-mobile-open'));
  });

  // ── Global logout ──────────────────────────────────────────────────────
  window.logout = async function () {
    try { await fetch('/api/auth/signout', { method: 'POST' }); } catch {}
    window.location.href = '/auth.html';
  };

})();
