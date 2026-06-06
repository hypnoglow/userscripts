// ==UserScript==
// @name         Newsletter Cleaner
// @namespace    https://github.com/hypnoglow/userscripts
// @version      1.0.0
// @description  Strip everything from periodic newsletters except article-link sections. Per-source rule registry; toggle badge to reveal the full page.
// @author       Igor Zibarev
// @license      MIT
// @homepageURL  https://github.com/hypnoglow/userscripts
// @supportURL   https://github.com/hypnoglow/userscripts/issues
// @match        https://factory.faun.dev/newsletters/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Rule registry. One entry per newsletter source.
  // Add a new newsletter = add a new entry here; nothing else changes.
  //
  //   match      : (location) => boolean        — does this rule apply to the page?
  //   keepTitles : string[]                      — section titles to KEEP (lowercased substring match)
  //   sectionSel : string                        — selector for a section block
  //   titleSel   : string                        — selector for the section title inside a block
  //   hideSel    : string[]                      — extra chrome to hide (banners, footer, logo, ...)
  // -------------------------------------------------------------------------
  const RULES = [
    {
      name: 'FAUN.dev',
      match: (loc) =>
        loc.hostname === 'factory.faun.dev' &&
        loc.pathname.startsWith('/newsletters/'),
      keepTitles: ['stories', 'tools'],
      sectionSel: '.section',
      titleSel: '.section-title',
      hideSel: [
        '.alert.sticky', // top promo banner
        '.footer-section', // footer
        '.header-section .header-links', // service links + favicon
        '.header-section .topic-logo', // logo
        '.header-section .topic-description', // tagline — keep only h1.topic-title
      ],
    },
  ];

  const rule = RULES.find((r) => r.match(location));
  if (!rule) return;

  const hidden = [];
  const hide = (el) => {
    if (el && el.style.display !== 'none') {
      el.style.display = 'none';
      hidden.push(el);
    }
  };

  // 1) Sections: keep whitelisted titles, hide the rest.
  let kept = 0;
  document.querySelectorAll(rule.sectionSel).forEach((section) => {
    const titleEl = section.querySelector(rule.titleSel);
    const title = titleEl ? titleEl.textContent.toLowerCase() : '';
    if (rule.keepTitles.some((k) => title.includes(k))) {
      kept++;
    } else {
      hide(section);
    }
  });

  // Safety: if nothing matched the whitelist, leave the page untouched
  // (better a noisy page than a blank one).
  if (kept === 0) return;

  // 2) Hide extra chrome (banners, footer, logo, ...).
  (rule.hideSel || []).forEach((sel) => hide(document.querySelector(sel)));

  // 3) Floating toggle badge.
  let collapsed = true;
  const apply = () =>
    hidden.forEach((el) => (el.style.display = collapsed ? 'none' : ''));
  const label = () =>
    collapsed ? '📰 Cleaned · Show all?' : '📰 Original · Clean?';

  const badge = document.createElement('div');
  badge.id = 'nl-cleaner-badge';
  badge.textContent = label();
  Object.assign(badge.style, {
    position: 'fixed',
    bottom: '16px',
    right: '16px',
    zIndex: 2147483647,
    background: '#111',
    color: '#fff',
    padding: '8px 12px',
    borderRadius: '8px',
    font: '13px/1.2 system-ui, sans-serif',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0, 0, 0, .3)',
    userSelect: 'none',
  });
  badge.addEventListener('click', () => {
    collapsed = !collapsed;
    apply();
    badge.textContent = label();
  });
  document.body.appendChild(badge);
})();
