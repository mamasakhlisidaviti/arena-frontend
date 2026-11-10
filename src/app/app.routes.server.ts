import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Authenticated shells cannot render without browser storage; they hydrate on the client.
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: 'account', renderMode: RenderMode.Client },
  { path: 'login', renderMode: RenderMode.Client },
  { path: 'register', renderMode: RenderMode.Client },
  {
    path: '**',
    renderMode: RenderMode.Server,
  },
];
