import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { siteConfig } from '@config/site-config';

const siteTitle = siteConfig.seo?.siteName || siteConfig.brand.shortName || siteConfig.brand.name;
const routeTitle = (title: string) => `${title} | ${siteTitle}`;
const maintenanceTitle = `${siteConfig.maintenance?.title || 'Site Maintenance'} - ${siteTitle}`;

export const routes: Routes = [
  // Live public marketing site
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePageComponent),
    title: routeTitle('Bespoke Laser Engraving Studio · NYC Metro')
  },
  {
    path: 'work',
    loadComponent: () => import('./pages/work/work.page').then(m => m.WorkPageComponent),
    title: routeTitle('Work')
  },
  {
    path: 'services',
    loadComponent: () => import('./pages/studio-services/studio-services.page').then(m => m.StudioServicesPageComponent),
    title: routeTitle('Services')
  },
  {
    path: 'trade',
    loadComponent: () => import('./pages/trade/trade.page').then(m => m.TradePageComponent),
    title: routeTitle('Trade & Commercial')
  },
  {
    path: 'clients',
    loadComponent: () => import('./pages/clients/clients.page').then(m => m.ClientsPageComponent),
    title: routeTitle('Who We Work With')
  },
  {
    path: 'enquire',
    loadComponent: () => import('./pages/enquire/enquire.page').then(m => m.EnquirePageComponent),
    title: routeTitle('Enquire')
  },
  {
    path: 'materials',
    loadComponent: () => import('./pages/materials/materials.page').then(m => m.MaterialsPageComponent),
    title: routeTitle('Materials & Finishes')
  },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about.page').then(m => m.AboutPageComponent),
    title: routeTitle('About')
  },
  // Legacy storefront paths redirected into the new B2B information architecture
  {
    path: 'servicios',
    redirectTo: 'services',
    pathMatch: 'full'
  },
  {
    path: 'contacto',
    redirectTo: 'enquire',
    pathMatch: 'full'
  },
  {
    path: 'galeria',
    redirectTo: 'work',
    pathMatch: 'full'
  },
  {
    path: 'collections',
    redirectTo: 'services',
    pathMatch: 'full'
  },
  {
    path: 'collections/:slug',
    redirectTo: 'services',
    pathMatch: 'full'
  },
  {
    path: 'productos',
    redirectTo: 'services',
    pathMatch: 'full'
  },
  {
    path: 'productos/:slug',
    redirectTo: 'services',
    pathMatch: 'full'
  },
  {
    path: 'products',
    redirectTo: 'services',
    pathMatch: 'full'
  },
  {
    path: 'products/:slug',
    redirectTo: 'services',
    pathMatch: 'full'
  },
  {
    path: 'cart',
    redirectTo: 'enquire',
    pathMatch: 'full'
  },
  {
    path: 'checkout',
    redirectTo: 'enquire',
    pathMatch: 'prefix'
  },
  // Auth and account area retained but not part of the public navigation
  {
    path: 'client/login',
    loadComponent: () => import('./pages/client/login/login.page').then(m => m.LoginPageComponent),
    title: routeTitle('Login')
  },
  {
    path: 'client/register',
    loadComponent: () => import('./pages/client/register/register.page').then(m => m.RegisterPageComponent),
    title: routeTitle('Register')
  },
  {
    path: 'client/forgot-password',
    loadComponent: () => import('./pages/client/forgot-password/forgot-password.page').then(m => m.ForgotPasswordPageComponent),
    title: routeTitle('Forgot Password')
  },
  {
    path: 'client/profile',
    loadComponent: () => import('./pages/client/profile/profile.page').then(m => m.ProfilePageComponent),
    canActivate: [authGuard],
    title: routeTitle('Profile')
  },
  {
    path: 'client/orders',
    loadComponent: () => import('./pages/client/orders/orders.page').then(m => m.OrdersPageComponent),
    canActivate: [authGuard],
    title: routeTitle('Orders')
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
  // Legacy commerce admin retained for back-office access while the public site is trade-only
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/dashboard/dashboard.page').then(m => m.AdminDashboardComponent),
    canActivate: [adminGuard],
    title: routeTitle('Admin Dashboard')
  },
  {
    path: 'admin/products',
    redirectTo: 'admin/legacy/products',
    pathMatch: 'full'
  },
  {
    path: 'admin/products/quick-add',
    redirectTo: 'admin/legacy/products/quick-add',
    pathMatch: 'full'
  },
  {
    path: 'admin/orders',
    redirectTo: 'admin/legacy/orders',
    pathMatch: 'full'
  },
  {
    path: 'admin/custom-orders',
    redirectTo: 'admin/legacy/custom-orders',
    pathMatch: 'full'
  },
  {
    path: 'admin/collections',
    redirectTo: 'admin/legacy/collections',
    pathMatch: 'full'
  },
  {
    path: 'admin/models',
    redirectTo: 'admin/legacy/models',
    pathMatch: 'full'
  },
  {
    path: 'admin/benefit-templates',
    redirectTo: 'admin/legacy/benefit-templates',
    pathMatch: 'full'
  },
  {
    path: 'admin/discounts',
    redirectTo: 'admin/legacy/discounts',
    pathMatch: 'full'
  },
  // Legacy storefront admin retained temporarily while the public site is trade-only
  {
    path: 'admin/legacy/products',
    loadComponent: () => import('./pages/admin/products/products-admin.page').then(m => m.ProductsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Legacy Product Management')
  },
  {
    path: 'admin/legacy/products/quick-add',
    loadComponent: () => import('./pages/admin/products/quick-add-product.page').then(m => m.QuickAddProductComponent),
    canActivate: [adminGuard],
    title: routeTitle('Legacy Quick Add Product')
  },
  {
    path: 'admin/gallery',
    loadComponent: () => import('./pages/admin/gallery/gallery-admin.page').then(m => m.GalleryAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Gallery')
  },
  {
    path: 'admin/legacy/orders',
    loadComponent: () => import('./pages/admin/orders/orders-admin.page').then(m => m.OrdersAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Legacy Orders')
  },
  {
    path: 'admin/legacy/custom-orders',
    loadComponent: () => import('./pages/admin/custom-orders/custom-orders-admin.page').then(m => m.CustomOrdersAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Legacy Custom Orders')
  },
  {
    path: 'admin/legacy/collections',
    loadComponent: () => import('./pages/admin/collections/collections-admin.page').then(m => m.CollectionsAdminPageComponent),
    canActivate: [adminGuard],
    title: routeTitle('Legacy Collections')
  },
  {
    path: 'admin/legacy/models',
    loadComponent: () => import('./pages/admin/models/models-admin.page').then(m => m.ModelsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Legacy Models')
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin/users/users-admin.page').then(m => m.UsersAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Users')
  },
  {
    path: 'admin/legacy/benefit-templates',
    loadComponent: () => import('./pages/admin/benefit-templates/benefit-templates-admin.page').then(m => m.BenefitTemplatesAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Legacy Benefit Templates')
  },
  {
    path: 'admin/analytics',
    loadComponent: () => import('./pages/admin/analytics/analytics-admin.page').then(m => m.AnalyticsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Analytics')
  },
  {
    path: 'admin/settings',
    loadComponent: () => import('./pages/admin/settings/settings-admin.page').then(m => m.SettingsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Settings')
  },
  {
    path: 'admin/email-templates',
    loadComponent: () => import('./pages/admin/email-templates/email-templates-admin.page').then(m => m.EmailTemplatesAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Email Templates')
  },
  {
    path: 'admin/size-groups',
    loadComponent: () => import('./pages/admin/size-groups/size-groups-admin.page').then(m => m.SizeGroupsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('Size Groups')
  },
  {
    path: 'admin/reviews',
    loadComponent: () => import('./pages/admin/reviews/reviews.page').then(m => m.AdminReviewsPage),
    canActivate: [adminGuard],
    title: routeTitle('Reviews')
  },
  {
    path: 'admin/sitemap',
    loadComponent: () => import('./pages/admin/sitemap/sitemap.page').then(m => m.AdminSitemapPage),
    canActivate: [adminGuard],
    title: routeTitle('Sitemap')
  },
  {
    path: 'admin/legacy/discounts',
    loadComponent: () => import('./pages/admin/discounts/discounts-admin.page').then(m => m.DiscountsAdminPage),
    canActivate: [adminGuard],
    title: routeTitle('Legacy Discounts')
  },
  {
    path: 'maintenance',
    loadComponent: () => import('./pages/maintenance/maintenance.page').then(m => m.MaintenancePage),
    title: maintenanceTitle
  },
  {
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found.page').then(m => m.NotFoundPageComponent),
    title: routeTitle('Not Found')
  },
  {
    path: '**',
    redirectTo: '404'
  }
];
