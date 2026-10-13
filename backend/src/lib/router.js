export function createRouter() {
  const routes = [];

  function add(method, pattern, ...handlers) {
    const paramNames = [];
    const regexSource = pattern
      .split('/')
      .map(segment => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    routes.push({ method, regex: new RegExp(`^${regexSource}/?$`), paramNames, handlers });
  }

  return {
    get: (pattern, ...handlers) => add('GET', pattern, ...handlers),
    post: (pattern, ...handlers) => add('POST', pattern, ...handlers),
    put: (pattern, ...handlers) => add('PUT', pattern, ...handlers),
    delete: (pattern, ...handlers) => add('DELETE', pattern, ...handlers),
    async dispatch(ctx) {
      const { method, pathname } = ctx;
      let pathMatched = false;
      for (const route of routes) {
        const match = route.regex.exec(pathname);
        if (!match) continue;
        if (route.method !== method) { pathMatched = true; continue; }
        const params = {};
        route.paramNames.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
        ctx.params = params;
        let index = -1;
        const run = async () => {
          index += 1;
          const handler = route.handlers[index];
          if (!handler) return;
          await handler(ctx, run);
        };
        await run();
        return true;
      }
      return pathMatched ? 'method' : false;
    },
  };
}
