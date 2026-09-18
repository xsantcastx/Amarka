import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'maintenance',
    renderMode: RenderMode.Server,
    status: 503,
    headers: { 'Retry-After': '7200', 'Cache-Control': 'no-store' }
  },
  {
    // Saved projects resume after the first render; SSR supplies the picker
    // shell and route metadata without accessing localStorage or canvas.
    path: 'design',
    renderMode: RenderMode.Server
  },
  { path: '404', renderMode: RenderMode.Server, status: 404 },
  { path: '500', renderMode: RenderMode.Server, status: 500 },
  { path: 'offline', renderMode: RenderMode.Server, status: 503 },
  { path: '**', renderMode: RenderMode.Prerender }
];
