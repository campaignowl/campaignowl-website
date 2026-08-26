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

  var ft = load();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { decorate(ft); });
  } else {
    decorate(ft);
  }
})();
