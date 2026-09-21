/*
 * First-touch attribution hand-off to the app (2026-08-27).
 *
 * The app records where each signup came from, but it can only see the
 * referrer of the LAST hop — and for site visitors that is always
 * campaignowl.co.uk, which hides the channel that actually brought them
 * (LinkedIn, Google, a newsletter). So on the visitor's first landing here
 * we remember the true source (utm params, gclid, or the referrer host),
 * keep it for the session, and append it as utm parameters to every link
 * into app.campaignowl.com. No cookies, no consent needed: sessionStorage
 * only, first-party, and it never leaves the browser except as part of a
 * link the visitor chooses to click.
 */
(function () {
  var KEY = 'co_first_touch';
  var APP_HOST = 'app.campaignowl.com';

  function hostOf(url) {
    try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { return ''; }
  }

  function derive() {
    var p = new URLSearchParams(window.location.search);
    var src = (p.get('utm_source') || '').trim().toLowerCase();
    var med = (p.get('utm_medium') || '').trim().toLowerCase();
    var camp = (p.get('utm_campaign') || '').trim();
    if (src) return { s: src, m: med || 'referral', c: camp };
    if (p.get('gclid')) return { s: 'google', m: 'cpc', c: camp };
    var host = hostOf(document.referrer);
    if (!host || host.indexOf('campaignowl') !== -1) return { s: 'website', m: 'direct', c: '' };
    if (/(^|\.)(linkedin\.com|lnkd\.in)$/.test(host)) return { s: 'linkedin', m: 'social', c: '' };
    if (/(^|\.)(twitter\.com|x\.com|t\.co)$/.test(host)) return { s: 'x', m: 'social', c: '' };
    if (/(^|\.)(facebook\.com|instagram\.com)$/.test(host)) return { s: 'meta', m: 'social', c: '' };
    if (/(^|\.)reddit\.com$/.test(host)) return { s: 'reddit', m: 'social', c: '' };
    if (/(^|\.)(google\.[a-z.]+|bing\.com|duckduckgo\.com)$/.test(host)) return { s: host.split('.')[0], m: 'organic', c: '' };
    return { s: host, m: 'referral', c: '' };
  }

  function load() {
    try {
      var raw = sessionStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var ft = derive();
    try { sessionStorage.setItem(KEY, JSON.stringify(ft)); } catch (e) {}
    return ft;
  }

  function decorate(ft) {
    var links = document.querySelectorAll('a[href*="' + APP_HOST + '"]');
    for (var i = 0; i < links.length; i++) {
      try {
        var u = new URL(links[i].getAttribute('href'), window.location.href);
        if (u.hostname !== APP_HOST) continue;
        if (u.searchParams.get('utm_source')) continue; // hand-written tags win
        u.searchParams.set('utm_source', ft.s);
        u.searchParams.set('utm_medium', ft.m);
        if (ft.c) u.searchParams.set('utm_campaign', ft.c);
        // Which button on the site sent them — free extra signal.
        var label = (links[i].textContent || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
        if (label) u.searchParams.set('utm_content', label);
        links[i].setAttribute('href', u.toString());
      } catch (e) {}
    }
  }

  // Funnel step 0: one anonymous beacon per browser session so the app's
  // /admin funnel can start at 'Visited the website'. text/plain body =
  // no CORS preflight; sendBeacon survives navigation. No cookies, no PII.
  function beacon(ft) {
    var KEY_SENT = 'co_visit_sent';
    try { if (sessionStorage.getItem(KEY_SENT)) return; } catch (e) {}
    var payload = JSON.stringify({ s: ft.s, m: ft.m, c: ft.c || null, p: location.pathname + location.search, r: document.referrer || null });
    var url = 'https://app.campaignowl.com/api/visit';
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain' }));
      else fetch(url, { method: 'POST', body: payload, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(function () {});
      sessionStorage.setItem(KEY_SENT, '1');
    } catch (e) {}
  }

  // Pricing signals (2026-09-21): one 'pricing_view' per session when the
  // pricing section scrolls into view, and a 'plan_click' per plan button.
  // Same endpoint, same first-touch, so /admin can line them up with the
  // funnel. Nothing here blocks the click — the link still navigates.
  function send(ft, kind, content) {
    var payload = JSON.stringify({ k: kind, b: content, s: ft.s, m: ft.m, c: ft.c || null, p: location.pathname, r: document.referrer || null });
    var url = 'https://app.campaignowl.com/api/visit';
    try {
      if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([payload], { type: 'text/plain' }));
      else fetch(url, { method: 'POST', body: payload, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(function () {});
    } catch (e) {}
  }
  function pricing(ft) {
    var section = document.getElementById('pricing');
    if (!section) return;
    var KEY_PV = 'co_pricing_seen';
    try {
      if (!sessionStorage.getItem(KEY_PV) && 'IntersectionObserver' in window) {
        var io = new IntersectionObserver(function (entries) {
          for (var j = 0; j < entries.length; j++) {
            if (entries[j].isIntersecting) {
              io.disconnect();
              try { sessionStorage.setItem(KEY_PV, '1'); } catch (e) {}
              send(ft, 'pricing_view', 'site');
              break;
            }
          }
        }, { threshold: 0.3 });
        io.observe(section);
      }
    } catch (e) {}
    var links = section.querySelectorAll('a[href*="' + APP_HOST + '"]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (ev) {
        var el = ev.currentTarget;
        var card = el.closest ? el.closest('.pricing-grid > *') : null;
        var h = card ? card.querySelector('h3') : null;
        var plan = ((h && h.textContent) || el.textContent || 'plan').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
        send(ft, 'plan_click', 'site:' + plan);
      });
    }
  }
  var ft = load();
  beacon(ft);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { decorate(ft); pricing(ft); });
  } else {
    decorate(ft);
    pricing(ft);
  }
})();
