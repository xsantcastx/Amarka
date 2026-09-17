import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Keep exact legacy destinations aligned with firebase.json hosting redirects.
const legacyRedirects: Readonly<Record<string, string>> = {
  "/privacy": "/privacy-policy",
  "/services": "/#services",
  "/work": "/#services",
  "/materials": "/#services",
  "/tools": "/enquire",
  "/trade": "/enquire",
  "/clients": "/#industries",
  "/about": "/#about",
  "/services/interior-designers": "/#services",
  "/services/general-contractors": "/#services",
  "/services/hospitality": "/#services",
  "/services/corporate": "/#services",
  "/services/bar-restaurant": "/#services",
  "/services/golf-clubs": "/#services"
};
const livePaths = new Set(['/enquire', '/design', '/privacy-policy', '/cookie-policy', '/terms']);
app.use((req, res, next) => {
  const normalized = req.path.replace(/\/+$/, '') || '/';
  const destination = legacyRedirects[normalized];
  if (destination) {
    res.redirect(301, destination);
    return;
  }
  if (req.path !== normalized && livePaths.has(normalized)) {
    res.redirect(301, normalized + req.url.slice(req.path.length));
    return;
  }
  next();
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response: Response | null) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    void 0;
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
