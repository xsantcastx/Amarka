import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'admin/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'client/**',
    renderMode: RenderMode.Client
  },
  {
    path: 'maintenance',
    renderMode: RenderMode.Client
  },
  {
    path: 'products/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'productos/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'collections/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
