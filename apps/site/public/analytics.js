(function () {
  var s = document.currentScript;
  if (!s) return;
  var api = s.getAttribute('data-api') || s.getAttribute('data-host-url');
  var domain = s.getAttribute('data-domain') || s.getAttribute('data-website-id');
  if (!api || /\{\{/.test(api)) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return;
  function send() {
    var payload = JSON.stringify({ n: 'pageview', u: location.href, d: domain, r: document.referrer || null });
    try {
      navigator.sendBeacon(api, new Blob([payload], { type: 'text/plain' }));
    } catch (e) {}
  }
  send();
  document.addEventListener('astro:page-load', send);
})();
