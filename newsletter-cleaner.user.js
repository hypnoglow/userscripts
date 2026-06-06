// ==UserScript==
// @name         Newsletter Cleaner
// @namespace    https://github.com/hypnoglow/userscripts
// @version      1.0.1
// @description  Strip everything from periodic newsletters except article-link sections. Per-source rule registry; toggle badge to reveal the full page.
// @author       Igor Zibarev
// @license      MIT
// @homepageURL  https://github.com/hypnoglow/userscripts
// @supportURL   https://github.com/hypnoglow/userscripts/issues
// @match        https://factory.faun.dev/newsletters/*
// @match        https://info.thenewstack.io/tns-weekly-update-*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // -------------------------------------------------------------------------
  // Rule registry. One entry per newsletter source.
  // Add a new newsletter = add a new entry here; nothing else changes.
  //
  //   match         : (location) => boolean     — does this rule apply to the page?
  //   sectionSel    : string                    — selector for a section block
  //   titleSel      : string                    — selector(s) for title elements inside a block
  //   hideSel       : string[]                  — extra chrome to hide (banners, footer, logo, ...)
  //
  // Section selection (use ONE of the modes below):
  //
  //   keepTitles    : string[]                  — WHITELIST: keep sections whose title text
  //                                                (lowercased) contains any of these substrings.
  //   hideTitles    : string[]                  — BLOCKLIST: hide sections whose title text
  //                                                contains any of these substrings.
  //   hideTitleTags : string[]                  — BLOCKLIST: hide sections containing a title
  //                                                with one of these tag names (e.g. 'H3' for ads).
  //
  // Blocklist mode (hideTitles / hideTitleTags) also hides sections with no title at all
  // (typically chrome / dividers). Use blocklist when article titles change weekly and only
  // ads / chrome are stable enough to enumerate.
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
    {
      // HubSpot-rendered weekly newsletter. Each block is a div.hse-section.
      // Sponsor ads use H3 titles; real content uses <strong>. Chrome blocks
      // have no title at all. Hide ads + the standing "events & webinars",
      // "podcast" and "quote of the week" sections; keep the lead story and
      // "TNS essential reads" (the article-link section).
      name: 'TheNewStack',
      match: (loc) =>
        loc.hostname === 'info.thenewstack.io' &&
        loc.pathname.startsWith('/tns-weekly-update-'),
      sectionSel: 'div.hse-section',
      titleSel: 'h1, h2, h3, h4, h5, strong',
      hideTitles: [
        'events & webinars', // standing webinars block
        'catch the episode', // appears in the weekly podcast section
        'quote of the week', // standing quote block
      ],
      hideTitleTags: ['H3'], // sponsor ads ("Together with ...") use H3
      hideSel: [],
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

  // 1) Sections: decide keep/hide per rule, then apply.
  //    Doing this in two passes lets the safety check bail BEFORE we hide
  //    anything, so a markup change can never leave a blank page.
  const decideKeep = (titleEls) => {
    if (rule.keepTitles) {
      const joined = titleEls.map((t) => t.textContent.toLowerCase()).join(' ');
      return rule.keepTitles.some((k) => joined.includes(k));
    }
    // Blocklist mode: no title => chrome, hide.
    if (titleEls.length === 0) return false;
    if (
      (rule.hideTitleTags || []).some((tag) =>
        titleEls.some((t) => t.tagName === tag),
      )
    )
      return false;
    const joined = titleEls.map((t) => t.textContent.toLowerCase()).join(' ');
    if ((rule.hideTitles || []).some((h) => joined.includes(h))) return false;
    return true;
  };

  const decisions = [...document.querySelectorAll(rule.sectionSel)].map(
    (section) => {
      const titleEls = [...section.querySelectorAll(rule.titleSel)].filter(
        (t) => t.textContent.trim().length > 0,
      );
      return { section, keep: decideKeep(titleEls) };
    },
  );

  // Safety: if nothing matched, leave the page untouched
  // (better a noisy page than a blank one).
  if (!decisions.some((d) => d.keep)) return;

  decisions.forEach((d) => {
    if (!d.keep) hide(d.section);
  });

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
