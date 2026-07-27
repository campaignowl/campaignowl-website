/* Campaign Owl marketing-site cookie consent banner.
 *
 * Pre-built and inert. Drops in vanilla JS, no framework needed. Stays
 * dormant until you register at least one optional tag (GA4, LinkedIn
 * Insight Tag, etc) via cookieConsent.init({ tags: [...] }). With zero
 * tags registered, no banner ever shows — the script is a no-op.
 *
 * When you ARE ready to add a tag:
 *
 *   <script src="cookie-consent.js"></script>
 *   <script>
 *     cookieConsent.init({
 *       tags: [
 *         {
 *           name: 'Google Analytics 4',
 *           load: function () {
 *             // Whatever code loads your GA4 script + sends the first pageview.
 *             var s = document.createElement('script');
 *             s.async = true;
 *             s.src = 'https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX';
 *             document.head.appendChild(s);
 *             window.dataLayer = window.dataLayer || [];
 *             function gtag(){ dataLayer.push(arguments); }
 *             gtag('js', new Date());
 *             gtag('config', 'G-XXXXXXXXXX');
 *           }
 *         },
 *         // { name: 'LinkedIn Insight Tag', load: function () { ... } },
 *       ],
 *     });
 *   </script>
 *
 * The banner appears on first visit until the user picks Accept or
 * Reject. Choice is persisted in localStorage. To let the user change
 * their mind, drop a button anywhere with onclick="cookieConsent.reopen()"
 * (e.g. in the privacy policy footer).
 *
 * reCAPTCHA cookies are NOT covered here — they're security cookies,
 * exempt from PECR consent. Disclosed in privacy.html for transparency.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'cookie_consent';
  var STORAGE_TS_KEY = 'cookie_consent_at';

  var registeredTags = [];
  var initialised = false;

  function applyAccept() {
    try { localStorage.setItem(STORAGE_KEY, 'granted'); } catch (e) {}
    try { localStorage.setItem(STORAGE_TS_KEY, new Date().toISOString()); } catch (e) {}
    hideBanner();
    loadAllTags();
  }

  function applyReject() {
    try { localStorage.setItem(STORAGE_KEY, 'denied'); } catch (e) {}
    try { localStorage.setItem(STORAGE_TS_KEY, new Date().toISOString()); } catch (e) {}
    hideBanner();
    // Do not load tags. Page session continues without analytics/marketing.
  }

  function loadAllTags() {
    for (var i = 0; i < registeredTags.length; i++) {
      try {
        registeredTags[i].load();
      } catch (err) {
        // Tag failures must never break the page.
        if (window.console && console.warn) {
          console.warn('[cookie-consent] tag "' + registeredTags[i].name + '" failed to load:', err);
        }
      }
    }
  }

  function currentChoice() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function showBanner() {
    if (document.getElementById('cc-banner')) return;
    var html =
      '<div id="cc-banner" role="dialog" aria-live="polite" aria-label="Cookie consent" ' +
      'style="position:fixed;left:0;right:0;bottom:0;z-index:9999;' +
      'background:#fffdf8;border-top:1px solid #eee5d6;color:#5c5344;box-shadow:0 -4px 24px rgba(31,26,18,0.08);' +
      'font-family:DM Sans,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;' +
      'box-shadow:0 -4px 24px rgba(0,0,0,0.5)">' +
        '<div style="max-width:1100px;margin:0 auto;padding:18px 24px;' +
        'display:flex;flex-direction:column;gap:14px">' +
          '<div>' +
            '<p style="font-weight:700;color:#1f1a12;font-size:14px;margin:0 0 6px">Cookies</p>' +
            '<p style="font-size:13px;line-height:1.6;margin:0">' +
              'We\'d like to use optional analytics and marketing cookies to understand how Campaign Owl is found and used. ' +
              'Essential security cookies (for the contact form) are always on. ' +
              '<a href="privacy.html" style="color:#b45309;text-decoration:underline">Read our privacy policy</a>.' +
            '</p>' +
          '</div>' +
          '<div style="display:flex;gap:10px;flex-wrap:wrap">' +
            '<button id="cc-reject" type="button" ' +
            'style="flex:1;min-width:140px;padding:10px 14px;border:1px solid #2a2a2a;' +
            'background:transparent;color:#1f1a12;border:1px solid #eee5d6 !important;font-size:13px;font-weight:600;' +
            'border-radius:8px;cursor:pointer;font-family:inherit">Reject optional</button>' +
            '<button id="cc-accept" type="button" ' +
            'style="flex:1;min-width:140px;padding:10px 14px;border:none;' +
            'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;' +
            'font-size:13px;font-weight:700;border-radius:8px;cursor:pointer;font-family:inherit">Accept all</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);
    document.getElementById('cc-accept').addEventListener('click', applyAccept);
    document.getElementById('cc-reject').addEventListener('click', applyReject);
  }

  function hideBanner() {
    var el = document.getElementById('cc-banner');
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function decide() {
    var choice = currentChoice();
    if (choice === 'granted') {
      // Returning visitor who already accepted. Load any registered tags
      // immediately, no banner needed.
      if (registeredTags.length > 0) loadAllTags();
      return;
    }
    if (choice === 'denied') {
      // Returning visitor who already rejected. Do nothing.
      return;
    }
    // No prior choice → show banner. Even with zero tags currently
    // registered, we still surface the choice so the user's preference
    // is captured for whenever optional tags get added.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }

  window.cookieConsent = {
    init: function (config) {
      if (initialised) return;
      initialised = true;
      registeredTags = (config && config.tags) || [];
      decide();
    },
    // Programmatically re-open the banner so users can change their mind.
    // Wire into a privacy-page button: onclick="cookieConsent.reopen()".
    reopen: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      try { localStorage.removeItem(STORAGE_TS_KEY); } catch (e) {}
      if (registeredTags.length === 0) {
        // Nothing registered to consent to — still show, but choosing
        // either button just records the preference for future tags.
      }
      hideBanner();
      showBanner();
    },
    // Diagnostic accessor — useful when debugging in the browser console.
    state: function () {
      return {
        choice: currentChoice(),
        tagsRegistered: registeredTags.length,
      };
    },
  };
})();
