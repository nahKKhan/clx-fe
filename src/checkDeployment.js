// Revalidate the entry document on opening/restoring the analysis page.
// Do not reload other workspaces where an engineer may be editing a form.
export function watchDeployment() {
  if (!import.meta.env.PROD) return;
  let checking = false;
  let lastCheck = 0;
  async function check() {
    if (!location.hash.startsWith('#analysis') || document.visibilityState === 'hidden' || checking || Date.now() - lastCheck < 15000) return;
    const loaded = document.querySelector('script[type="module"][src]')?.getAttribute('src');
    if (!loaded) return;
    checking = true;
    lastCheck = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const url = new URL(import.meta.env.BASE_URL, location.origin);
      url.searchParams.set('_check', String(Date.now()));
      const response = await fetch(url, {cache: 'no-store', signal: controller.signal});
      if (!response.ok) return;
      const html = new DOMParser().parseFromString(await response.text(), 'text/html');
      const latest = html.querySelector('script[type="module"][src]')?.getAttribute('src');
      if (!latest || new URL(latest, url).href === new URL(loaded, location.href).href) return;
      // At most one automatic refresh per minute, even if CDN edges disagree.
      const key = 'clx-deployment-refresh';
      const previous = Number(sessionStorage.getItem(key) || 0);
      if (Date.now() - previous < 60000) return;
      sessionStorage.setItem(key, String(Date.now()));
      const next = new URL(location.href);
      next.searchParams.set('_version', latest.split('/').pop());
      location.replace(next.href);
    } catch { /* Offline/failed update checks must never block the application. */ }
    finally {clearTimeout(timer);checking = false;}
  }
  window.addEventListener('pageshow', check);
  window.addEventListener('focus', check);
  window.addEventListener('hashchange', check);
  document.addEventListener('visibilitychange', check);
  void check();
}
