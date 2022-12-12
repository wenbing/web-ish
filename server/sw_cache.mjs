export function swCache(cacheName, pathnames, { publicPath, env }) {
  const preCache = async () => {
    const PREFIX = "[service worker install]";
    const cache = await caches.open(cacheName);
    const add = async (uri) => {
      const response = await fetch(uri);
      if (response.ok) {
        await cache.put(uri, response);
        return true;
      } else {
        const { status, statusText } = response;
        const msg = JSON.stringify({ status, statusText });
        console.error(`${PREFIX} caching resource met bad response, ${msg}`);
        return false;
      }
    };
    const results = await Promise.all(pathnames.map(add));
    const filtered = pathnames.filter((item, index) => results[index] === true);
    console.log(`${PREFIX} caching resources,`, { pathnames: filtered });
  };

  self.addEventListener("install", (e) => {
    self.skipWaiting();
    e.waitUntil(preCache());
  });

  const errorResponse = (error) => {
    const { status = -1, message } = error;
    const headers = new Headers({ "Cache-Control": "no-cache" });
    const init = { status, headers };
    const content = JSON.stringify({ status, message });
    return new Response(content, init);
  };

  const proxy = async (request) => {
    const prefix = "[service worker fetch]";
    const { pathname } = new URL(request.url);
    console.log(`${prefix} fetched resource, `, { pathname });
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    const cache = await caches.open(cacheName);
    // the same as cache.add:
    // https://developer.mozilla.org/en-US/docs/Web/API/Cache/add
    let response;
    let error;
    try {
      response = await fetch(request);
    } catch (ex) {
      console.log(`${prefix} fetch resource failed, `, { pathname });
      return errorResponse(ex);
    }
    if (!response.ok) {
      const { status } = response;
      error = new Error(`response is not ok, ${JSON.stringify({ status })}`);
      error.status = status;
      return errorResponse(error);
    }
    console.log(`${prefix} caching resource, `, { pathname });
    cache.put(request, response.clone());
    return response;
  };

  self.addEventListener("fetch", (e) => {
    if (env.NODE_ENV === "development") {
      return;
    }
    const { request } = e;
    if (request.method !== "GET") {
      return;
    }
    const { pathname } = new URL(request.url);
    if (pathnames.indexOf(pathname) === -1) {
      return;
    }

    e.respondWith(proxy(request));
  });

  const clear = async () => {
    const CACHE_KEY_PREFIX = "web-ish__cache--";
    const ckeys = await caches.keys();
    const keys = ckeys.filter(
      (k) => k.startsWith(CACHE_KEY_PREFIX) && k !== cacheName
    );
    console.log(`[service worker activate] clear resources,`, { keys });
    return keys.map((key) => caches.delete(key));
  };

  self.addEventListener("activate", (e) => {
    const actions = [clear(), self.clients.claim()];
    e.waitUntil(Promise.all(actions));
  });
}
