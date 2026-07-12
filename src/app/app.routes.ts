import { Routes } from '@angular/router';
import { siteConfig } from '@config/site-config';

const siteTitle = siteConfig.seo?.siteName || siteConfig.brand.shortName || siteConfig.brand.name;
const routeTitle = (title: string) => `${title} | ${siteTitle}`;
const maintenanceTitle = `${siteConfig.maintenance?.title || 'Site Maintenance'} - ${siteTitle}`;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePageComponent),
    title: routeTitle('Corporate Merchandise, Engraving & Brand Solutions')
  },
  {
    path: 'enquire',
    loadComponent: () => import('./pages/enquire/enquire.page').then(m => m.EnquirePageComponent),
    title: routeTitle('Get a Free Quote')
  },
  {
    path: 'design',
    loadComponent: () => import('./pages/design-studio/design-studio.page').then(m => m.DesignStudioPageComponent),
    title: routeTitle('Product Customization Studio')
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./pages/privacy/privacy.page').then(m => m.PrivacyPageComponent),
    title: routeTitle('Privacy Policy')
  },
  {
    path: 'cookie-policy',
    loadComponent: () => import('./pages/cookie-policy/cookie-policy.page').then(m => m.CookiePolicyPageComponent),
    title: routeTitle('Cookie Policy')
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms/terms.page').then(m => m.TermsPageComponent),
    title: routeTitle('Terms')
  },
  {
    path: 'maintenance',
    loadComponent: () => import('./pages/maintenance/maintenance.page').then(m => m.MaintenancePage),
    title: maintenanceTitle
  },
  // AMK-51 — Branded error state pages. One component, three route-resolved
  // states (not-found / server / offline). All three use the same wildcard
  // destination for the 404 fallback so existing deep links keep working.
  {
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found.page').then(m => m.NotFoundPageComponent),
    data: { errorState: 'not-found' },
    title: routeTitle('Not Found')
  },
  {
    path: '500',
    loadComponent: () => import('./pages/not-found/not-found.page').then(m => m.NotFoundPageComponent),
    data: { errorState: 'server' },
    title: routeTitle('Studio Error')
  },
  {
    path: 'offline',
    loadComponent: () => import('./pages/not-found/not-found.page').then(m => m.NotFoundPageComponent),
    data: { errorState: 'offline' },
    title: routeTitle('Offline')
  },
  {
    path: '**',
    redirectTo: '404'
  }
];
