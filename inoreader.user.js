// ==UserScript==
// @name         Inoreader
// @namespace    https://github.com/hypnoglow/userscripts
// @version      1.0.0
// @description  Extra keyboard shortcuts for inoreader.com. Currently: "i" clicks the Raindrop.io save button. Works regardless of Surfingkeys' enabled/lurking/disabled state, since it's an independent listener.
// @author       Igor Zibarev
// @license      MIT
// @homepageURL  https://github.com/hypnoglow/userscripts
// @supportURL   https://github.com/hypnoglow/userscripts/issues
// @match        https://www.inoreader.com/*
// @match        https://inoreader.com/*
// @run-at       document-end
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const KEY = 'i';
  const BUTTON_SELECTOR = 'span[title="Raindrop.io"]';

  function isEditableTarget(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    return !!target.closest?.('[contenteditable=""], [contenteditable="true"]');
  }

  document.addEventListener('keydown', (event) => {
    if (event.key !== KEY) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isEditableTarget(event.target)) return;

    const button = document.querySelector(BUTTON_SELECTOR);
    if (!button) return;

    event.preventDefault();
    button.click();
  });
})();
