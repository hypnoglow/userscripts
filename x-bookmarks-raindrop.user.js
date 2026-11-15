// ==UserScript==
// @name         X bookmarks to Raindrop
// @namespace    https://github.com/hypnoglow/userscripts
// @version      1.3.1
// @description  Adds a Raindrop.io button to every post on X. A click opens the Raindrop save popup for that post, like the browser extension does. Grey = not saved yet, colour = saved.
// @author       Igor Zibarev
// @license      MIT
// @homepageURL  https://github.com/hypnoglow/userscripts
// @supportURL   https://github.com/hypnoglow/userscripts/issues
// @match        https://x.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const MARK = 'data-raindrop-button';
  const MAX_TITLE = 200;

  // Official Raindrop.io logo (app.raindrop.io icon_raw.svg), ids made unique to this script.
  const ICON =
    '<svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true"><defs>' +
    '<path id="rdA" d="M12 0a12 12 0 0112 12v12H12a12 12 0 110-24z"/>' +
    '<path id="rdC" d="M0 24V11.7A12 12 0 1112 24H0z"/></defs>' +
    '<g fill="none" fill-rule="evenodd">' +
    '<path fill="#1988E0" d="M35.3 9.7a16 16 0 01-.6 23.2L24 43 13.3 33l-.6-.7A16 16 0 1135.3 9.7z"/>' +
    '<g transform="translate(0 19)"><mask id="rdB" fill="#fff"><use href="#rdA"/></mask>' +
    '<use fill="#2CD4ED" href="#rdA"/>' +
    '<path fill="#0DB4E2" d="M35.3-9.3a16 16 0 01-.6 23.2L24 24 13.3 14l-.6-.7A16 16 0 1135.3-9.3z" mask="url(#rdB)"/></g>' +
    '<g transform="translate(24 19)"><mask id="rdD" fill="#fff"><use href="#rdC"/></mask>' +
    '<use fill="#3169FF" href="#rdC"/>' +
    '<path fill="#3153FF" d="M11.3-9.3a16 16 0 01-.6 23.2L0 24l-10.7-10-.6-.7A16 16 0 1111.3-9.3z" mask="url(#rdD)"/></g>' +
    '</g></svg>';

  // Posts whose save popup was opened from here, remembered across reloads.
  // This marks "clicked", not "confirmed saved": Raindrop does not report back.
  const STORE_KEY = 'raindrop-saved-posts';
  const clickedUrls = new Set();
  try {
    JSON.parse(localStorage.getItem(STORE_KEY) || '[]').forEach((u) => clickedUrls.add(u));
  } catch (e) {
    /* storage unavailable: state lasts until reload */
  }
  function remember(url) {
    clickedUrls.add(url);
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(Array.from(clickedUrls)));
    } catch (e) {
      /* ignore */
    }
  }

  // Elements that belong to this post itself, not to a quoted post inside it
  // (a quote card is a div[role=link]; X also puts role=link on plain anchors, so only match divs).
  function own(article, selector) {
    return Array.from(article.querySelectorAll(selector)).find(
      (el) => el.closest('article') === article && !el.closest('div[role="link"]')
    );
  }

  // Canonical post URL: the permalink anchor wrapped around the post's own <time>.
  function postUrl(article) {
    const time = own(article, 'a[href*="/status/"] time');
    const anchor = time && time.closest('a');
    if (!anchor) return null;
    const match = new URL(anchor.href).pathname.match(/^(\/[^/]+\/status\/\d+)/);
    return match ? 'https://x.com' + match[1] : null;
  }

  // Post text verbatim; only truncated (by code points) when too long. Empty for media-only posts.
  function postTitle(article) {
    const textEl = own(article, '[data-testid="tweetText"]');
    const text = textEl ? textEl.innerText.trim() : '';
    const chars = Array.from(text);
    return chars.length > MAX_TITLE ? chars.slice(0, MAX_TITLE).join('') + '…' : text;
  }

  function openRaindrop(link, title) {
    const w = 450;
    const h = 600;
    const left = Math.round(screen.width / 2 - w / 2);
    const top = Math.round(screen.height / 2 - h / 2);
    let url = 'https://app.raindrop.io/add?link=' + encodeURIComponent(link);
    if (title) url += '&title=' + encodeURIComponent(title);
    return window.open(
      url,
      'raindrop-save',
      'width=' + w + ',height=' + h + ',resizable=yes,scrollbars=yes,left=' + left + ',top=' + top
    );
  }

  // Grey = not saved yet, full colour = saved. Hover only brightens the grey icon.
  function paint(button, url, hover) {
    const saved = clickedUrls.has(url);
    button.style.filter = saved ? 'none' : 'grayscale(1)';
    button.style.opacity = saved ? '1' : hover ? '0.9' : '0.6';
  }

  function decorate(article) {
    const group = own(article, '[role="group"]:has([data-testid="like"], [data-testid="unlike"])');
    if (!group) return; // action bar not rendered yet; the observer will retry
    if (group.querySelector('[' + MARK + ']')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute(MARK, '1');
    button.title = 'Save to Raindrop.io';
    button.setAttribute('aria-label', 'Save to Raindrop.io');
    button.innerHTML = ICON;
    button.style.cssText =
      'background:none;border:0;cursor:pointer;padding:0 8px;display:inline-flex;align-items:center;';
    // Article nodes are recycled by X, so the URL is always read at event time.
    const url = () => postUrl(article);
    paint(button, url(), false);
    button.addEventListener('mouseenter', () => paint(button, url(), true));
    button.addEventListener('mouseleave', () => paint(button, url(), false));
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const link = url();
      if (!link) return;
      if (!openRaindrop(link, postTitle(article))) return; // popup blocked: do not mark as saved
      remember(link);
      paint(button, link, true);
    });
    group.appendChild(button);
  }

  function scan() {
    document.querySelectorAll('article[data-testid="tweet"]').forEach(decorate);
  }

  let scheduled = false;
  new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }).observe(document.body, { childList: true, subtree: true });

  scan();
})();
