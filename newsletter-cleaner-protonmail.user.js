// ==UserScript==
// @name         Newsletter Cleaner (ProtonMail)
// @namespace    https://github.com/hypnoglow/userscripts
// @version      1.0.1
// @description  Cleans newsletter emails in ProtonMail web UI, leaves only article-link sections; per-source rule registry; toggle badge.
// @author       Igor Zibarev
// @license      MIT
// @homepageURL  https://github.com/hypnoglow/userscripts
// @supportURL   https://github.com/hypnoglow/userscripts/issues
// @match        https://mail.proton.me/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Rule registry. One entry per newsletter source.
  // Add a new newsletter = add a new entry here; nothing else changes.
  //
  //   detect        : (iframeDoc) => boolean  — identify source by content, not URL
  //   sectionSel    : string                  — selector for a section block
  //   titleSel      : string                  — selector(s) for title elements inside a block
  //
  // Section selection (use ONE of the modes below):
  //
  //   keepTitles    : string[]                — WHITELIST: keep sections whose title text
  //                                             (lowercased) contains any of these substrings.
  //   hideTitles    : string[]                — BLOCKLIST: hide sections whose title text
  //                                             contains any of these substrings.
  //   hideTitleTags : string[]                — BLOCKLIST: hide sections containing a title
  //                                             with one of these tag names (e.g. 'H3' for ads).
  //
  // Blocklist mode (hideTitles / hideTitleTags) also hides sections with no title at all
  // (typically chrome / dividers). Use blocklist when article titles change weekly and only
  // ads / chrome are stable enough to enumerate.
  //
  // Title-less sections are treated as chrome and hidden by the same loop.
  // ---------------------------------------------------------------------------
  const RULES = [
    {
      name: 'FAUN.dev (email)',
      // Detect by content: FAUN branding text or their tracking redirector domain.
      detect: (doc) =>
        doc.body.textContent.includes('FAUN.dev') ||
        doc.querySelector('a[href*="from.faun.to"]') !== null,
      keepTitles: ['stories', 'tools'],
      sectionSel: 'table.outer',
      titleSel: 'td.section_title',
    },
    {
      // HubSpot-rendered weekly newsletter. Each block is a div.hse-section.
      // Sponsor ads use H3 titles; real content uses <strong>. Chrome blocks
      // have no title at all. Hide ads + the standing "events & webinars",
      // "podcast" and "quote of the week" sections; keep the lead story and
      // "TNS essential reads" (the article-link section).
      name: 'TheNewStack (email)',
      // Unique signal: TNS-branded link domain inside the email iframe.
      // .hse-body-background alone is too broad (any HubSpot email uses it).
      detect: (doc) => doc.querySelector('a[href*="thenewstack.io"]') !== null,
      sectionSel: 'div.hse-section',
      titleSel: 'h1, h2, h3, h4, h5, strong',
      hideTitles: [
        'events & webinars', // standing webinars block
        'catch the episode', // weekly podcast section
        'quote of the week', // standing quote block
      ],
      hideTitleTags: ['H3'], // sponsor ads ("Together with ...") use H3
    },
  ];

  function applyRule(iframeDoc, rule) {
    const hidden = [];
    const hide = (el) => {
      if (el && el.style.display !== 'none') {
        el.style.display = 'none';
        hidden.push(el);
      }
    };

    // Decide whether a section should be kept, based on its title elements.
    const decideKeep = (titleEls) => {
      if (rule.keepTitles) {
        // Whitelist mode: keep if any title matches.
        const joined = titleEls
          .map((t) => t.textContent.toLowerCase())
          .join(' ');
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

    // Two-pass: decide first, then apply. This lets the safety check bail
    // before hiding anything, so a markup change can never leave a blank page.
    const decisions = [...iframeDoc.querySelectorAll(rule.sectionSel)].map(
      (section) => {
        const titleEls = [...section.querySelectorAll(rule.titleSel)].filter(
          (t) => t.textContent.trim().length > 0,
        );
        return { section, keep: decideKeep(titleEls) };
      },
    );

    // Safety: if nothing matched, leave the email untouched.
    if (!decisions.some((d) => d.keep)) return;

    decisions.forEach((d) => {
      if (!d.keep) hide(d.section);
    });

    // Badge lives inside the iframe so position:fixed tracks the iframe viewport.
    let collapsed = true;
    const apply = () =>
      hidden.forEach((el) => (el.style.display = collapsed ? 'none' : ''));
    const label = () =>
      collapsed ? '📰 Cleaned · Show all?' : '📰 Original · Clean?';

    const badge = iframeDoc.createElement('div');
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
    iframeDoc.body.appendChild(badge);
  }

  function scanIframes() {
    document.querySelectorAll('iframe').forEach((iframe) => {
      // Skip already-processed iframes. When ProtonMail recreates the iframe
      // element, the new element carries no marker and will be processed fresh.
      if (iframe.dataset.nlCleaner === 'applied') return;

      let iframeDoc;
      try {
        iframeDoc = iframe.contentDocument;
      } catch (_) {
        // Cross-origin iframe (e.g. Proton AI assistant) — not reachable.
        return;
      }

      if (!iframeDoc || !iframeDoc.body) return;

      const rule = RULES.find((r) => r.detect(iframeDoc));
      if (!rule) return;

      applyRule(iframeDoc, rule);
      iframe.dataset.nlCleaner = 'applied';
    });
  }

  // Run once at startup, then watch for DOM changes (ProtonMail is an SPA;
  // the email iframe appears/disappears without page navigation).
  scanIframes();

  const observer = new MutationObserver(scanIframes);
  observer.observe(document.body, { childList: true, subtree: true });
})();
