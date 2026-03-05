/**
 * Client-side Router - دليل الرقة
 * Hash-based SPA router
 */
const Router = {
  routes: {},
  currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  },

  on(path, handler) {
    this.routes[path] = handler;
  },

  handleRoute() {
    const hash = window.location.hash || '#/';
    const [path, ...rest] = hash.slice(1).split('?');
    const queryString = rest.join('?');

    // Parse query params
    const params = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((v, k) => params[k] = v);
    }

    // Extract route params (e.g., /store/:slug, /product/:id)
    let matchedHandler = null;
    let routeParams = {};

    for (const [pattern, handler] of Object.entries(this.routes)) {
      const match = this.matchRoute(pattern, path);
      if (match) {
        matchedHandler = handler;
        routeParams = match;
        break;
      }
    }

    if (matchedHandler) {
      this.currentRoute = path;
      matchedHandler({ ...routeParams, query: params });
      this.updateNav(path);
    } else {
      // Fallback to home
      window.location.hash = '#/';
    }
  },

  matchRoute(pattern, path) {
    const patternParts = pattern.split('/').filter(Boolean);
    const pathParts = path.split('/').filter(Boolean);

    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  },

  updateNav(path) {
    // Update bottom nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      const page = item.getAttribute('data-page');
      const isActive = path === '/' ? page === 'home' :
                       path.startsWith(`/${page}`);
      item.classList.toggle('active', isActive);
    });

    // Update side menu active state
    document.querySelectorAll('.menu-list a').forEach(item => {
      const page = item.getAttribute('data-page');
      const isActive = path === '/' ? page === 'home' :
                       path.startsWith(`/${page}`);
      item.classList.toggle('active', isActive);
    });

    // Scroll to top
    window.scrollTo(0, 0);
  },

  navigate(path) {
    window.location.hash = path;
  }
};
