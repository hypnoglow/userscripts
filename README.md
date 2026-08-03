# Userscripts

A small collection of personal [Tampermonkey](https://www.tampermonkey.net/) userscripts.

## Scripts

### [`newsletter-cleaner.user.js`](newsletter-cleaner.user.js)

Strips periodic newsletters down to just the article-link sections, hiding
intros, tables of contents, sponsors, tips, memes, banners and footers. A
floating badge toggles the full page back on.

Currently supports web mirrors of:

- **FAUN.dev** newsletters (`factory.faun.dev/newsletters/*`) — keeps
  *Stories, Tutorials & Articles* and *Tools, Apps & Software*.
- **TheNewStack** weekly updates (`info.thenewstack.io/tns-weekly-update-*`) —
  hides sponsor ads, events/webinars, podcast and quote sections while keeping
  the lead story and essential reads.

### [`newsletter-cleaner-protonmail.user.js`](newsletter-cleaner-protonmail.user.js)

Same as `newsletter-cleaner.user.js`, but runs inside the ProtonMail web UI
(`mail.proton.me`) and cleans newsletter emails rendered there.

### [`inoreader.user.js`](inoreader.user.js)

Extra keyboard shortcuts for inoreader.com. Currently binds the `i` key to
click the Raindrop.io save button (`span[title="Raindrop.io"]`). Uses its
own independent `keydown` listener, so it keeps working regardless of the
state of other keybinding extensions (e.g. Surfingkeys enabled, lurking, or
disabled on the page).

## Install

1. Install the Tampermonkey browser extension.
2. Open the Tampermonkey dashboard → **Create a new script**.
3. Paste the contents of the desired `*.user.js` file and save.
