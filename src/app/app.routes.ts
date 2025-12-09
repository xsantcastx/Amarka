import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';
import { siteConfig } from '@config/site-config';

const siteTitle = siteConfig.seo?.siteName || siteConfig.brand.shortName || siteConfig.brand.name;
const routeTitle = (key: string) => `${siteTitle} | ${key}`;
const maintenanceTitle = `${siteConfig.maintenance?.title || 'Site Maintenance'} - ${siteTitle}`;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.page').then(m => m.HomePageComponent),
    title: routeTitle('page_titles.home')
  },
  {
    path: 'products',
    redirectTo: 'productos',
    pathMatch: 'full'
  },
  {
    path: 'products/:slug',
    redirectTo: 'productos/:slug',
    pathMatch: 'full'
  },
  {
    path: 'products',
    redirectTo: 'productos',
    pathMatch: 'full'
  },
  {
    path: 'productos/:slug',
    loadComponent: () => import('./pages/productos/detalle/detalle.component').then(m => m.DetalleComponent),
    title: routeTitle('page_titles.product_details')
  },
  {
    path: 'home',
    redirectTo: '',
    pathMatch: 'full'
  },
  {
    path: 'productos',
    loadComponent: () => import('./pages/productos/productos.page').then(m => m.ProductosPageComponent),
    title: routeTitle('page_titles.products')
  },
  {
    path: 'collections/:slug',
    loadComponent: () => import('./pages/collections/collection.page').then(m => m.CollectionPageComponent),
    title: routeTitle('Collections')
  },
  {
    path: 'collections',
    loadComponent: () => import('./pages/collections/collections-index.page').then(m => m.CollectionsIndexPageComponent),
    title: routeTitle('Collections')
  },
  {
    path: 'galeria',
    loadComponent: () => import('./pages/galeria/galeria.page').then(m => m.GaleriaPageComponent),
    title: routeTitle('page_titles.gallery')
  },
  {
    path: 'servicios',
    loadComponent: () => import('./pages/servicios/servicios.page').then(m => m.ServiciosPageComponent),
    title: routeTitle('Services')
  },
  {
    path: 'contacto',
    loadComponent: () => import('./pages/contacto/contacto.page').then(m => m.ContactoPageComponent),
    title: routeTitle('page_titles.contact')
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./pages/privacy/privacy.page').then(m => m.PrivacyPageComponent),
    title: routeTitle('page_titles.privacy')
  },
  {
    path: 'cookie-policy',
    loadComponent: () => import('./pages/cookie-policy/cookie-policy.page').then(m => m.CookiePolicyPageComponent),
    title: routeTitle('page_titles.cookie_policy')
  },
  {
    path: 'terms',
    loadComponent: () => import('./pages/terms/terms.page').then(m => m.TermsPageComponent),
    title: routeTitle('page_titles.terms')
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart.page').then(m => m.CartPage),
    title: routeTitle('page_titles.cart')
  },
  // Checkout Routes
  {
    path: 'checkout/review',
    loadComponent: () => import('./pages/checkout/checkout-review.page').then(m => m.CheckoutReviewPage),
    canActivate: [authGuard],
    title: routeTitle('page_titles.checkout_review')
  },
  {
    path: 'checkout/payment',
    loadComponent: () => import('./pages/checkout/payment.page').then(m => m.PaymentPage),
    canActivate: [authGuard],
    title: routeTitle('page_titles.payment')
  },
  {
    path: 'checkout/confirmation',
    loadComponent: () => import('./pages/checkout/confirmation.page').then(m => m.ConfirmationPage),
    canActivate: [authGuard],
    title: routeTitle('page_titles.order_confirmation')
  },
  // Client Area Routes
  {
    path: 'client/login',
    loadComponent: () => import('./pages/client/login/login.page').then(m => m.LoginPageComponent),
    title: routeTitle('page_titles.login')
  },
  {
    path: 'client/register',
    loadComponent: () => import('./pages/client/register/register.page').then(m => m.RegisterPageComponent),
    title: routeTitle('page_titles.register')
  },
  {
    path: 'client/profile',
    loadComponent: () => import('./pages/client/profile/profile.page').then(m => m.ProfilePageComponent),
    canActivate: [authGuard],
    title: routeTitle('page_titles.profile')
  },
  {
    path: 'client/orders',
    loadComponent: () => import('./pages/client/orders/orders.page').then(m => m.OrdersPageComponent),
    canActivate: [authGuard],
    title: routeTitle('page_titles.orders')
  },
  // Admin Panel Routes
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/dashboard/dashboard.page').then(m => m.AdminDashboardComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.admin_dashboard')
  },
  {
    path: 'admin/products',
    loadComponent: () => import('./pages/admin/products/products-admin.page').then(m => m.ProductsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.product_management')
  },
  {
    path: 'admin/products/quick-add',
    loadComponent: () => import('./pages/admin/products/quick-add-product.page').then(m => m.QuickAddProductComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.quick_add_product')
  },
  {
    path: 'admin/gallery',
    loadComponent: () => import('./pages/admin/gallery/gallery-admin.page').then(m => m.GalleryAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.gallery_management')
  },
  {
    path: 'admin/services',
    loadComponent: () => import('./pages/admin/services/services-admin.page').then(m => m.ServicesAdminPage),
    canActivate: [adminGuard],
    title: routeTitle('Services Management')
  },
  {
    path: 'admin/orders',
    loadComponent: () => import('./pages/admin/orders/orders-admin.page').then(m => m.OrdersAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.order_management')
  },
  {
    path: 'admin/collections',
    loadComponent: () => import('./pages/admin/collections/collections-admin.page').then(m => m.CollectionsAdminPageComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.collections')
  },
  {
    path: 'admin/models',
    loadComponent: () => import('./pages/admin/models/models-admin.page').then(m => m.ModelsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.models')
  },
  {
    path: 'admin/users',
    loadComponent: () => import('./pages/admin/users/users-admin.page').then(m => m.UsersAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.user_management')
  },
  {
    path: 'admin/benefit-templates',
    loadComponent: () => import('./pages/admin/benefit-templates/benefit-templates-admin.page').then(m => m.BenefitTemplatesAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.benefit_templates')
  },
  {
    path: 'admin/analytics',
    loadComponent: () => import('./pages/admin/analytics/analytics-admin.page').then(m => m.AnalyticsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.analytics')
  },
  {
    path: 'admin/settings',
    loadComponent: () => import('./pages/admin/settings/settings-admin.page').then(m => m.SettingsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.settings')
  },
  {
    path: 'admin/email-templates',
    loadComponent: () => import('./pages/admin/email-templates/email-templates-admin.page').then(m => m.EmailTemplatesAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.email_templates')
  },
  {
    path: 'admin/size-groups',
    loadComponent: () => import('./pages/admin/size-groups/size-groups-admin.page').then(m => m.SizeGroupsAdminComponent),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.size_groups')
  },
  {
    path: 'admin/reviews',
    loadComponent: () => import('./pages/admin/reviews/reviews.page').then(m => m.AdminReviewsPage),
    canActivate: [adminGuard],
    title: routeTitle('page_titles.reviews')
  },
  {
    path: 'admin/sitemap',
    loadComponent: () => import('./pages/admin/sitemap/sitemap.page').then(m => m.AdminSitemapPage),
    canActivate: [adminGuard],
    title: routeTitle('Sitemap Generator')
  },
  {
    path: 'maintenance',
    loadComponent: () => import('./pages/maintenance/maintenance.page').then(m => m.MaintenancePage),
    title: maintenanceTitle
  },
  {
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found.page').then(m => m.NotFoundPageComponent),
    title: routeTitle('page_titles.not_found')
  },
  {
    path: '**',
    redirectTo: '404'
  }
];
