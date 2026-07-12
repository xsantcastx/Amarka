import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'maintenance',
    renderMode: RenderMode.Client
  },
  {
    // The design studio is a client-only app (localStorage projects, Konva
    // canvas, file uploads). Prerendering it causes hydration mismatches when
    // the URL carries ?project=… and the client resumes straight into the
    // editor step, which breaks the canvas.
    path: 'design',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
