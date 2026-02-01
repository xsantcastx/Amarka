import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

import { ProductsService } from '../../services/products.service';
import { CategoryService } from '../../services/category.service';
import { Product } from '../../models/product';
import { SeoSchemaService, FAQItem, ProductSchemaData } from '../../services/seo-schema.service';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { LoadingComponentBase } from '../../core/classes/loading-component.base';
import { BrandConfigService } from '../../core/services/brand-config.service';

interface SoloMinerCard {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  hashrate?: string;
  power?: string;
  efficiency?: string;
  price?: number | null;
  features: string[];
  badge?: string;
  ctaLabel: string;
  ctaLink: string;
  inStock?: boolean;
}

@Component({
  selector: 'app-solo-miners-page',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule, PageHeaderComponent],
  templateUrl: './solo-miners.page.html',
  styleUrl: './solo-miners.page.scss'
})
export class SoloMinersPageComponent extends LoadingComponentBase implements OnInit, OnDestroy {
  private productsService = inject(ProductsService);
  private categoryService = inject(CategoryService);
  private seoService = inject(SeoSchemaService);
  private translate = inject(TranslateService);
  private brandConfig = inject(BrandConfigService);

  private readonly soloMinerSlug = 'solo-miners';

  soloMinerProducts: SoloMinerCard[] = [];
  featureHighlights = [
    {
      icon: '??',
      titleKey: 'soloMiners.highlights.lottery.title',
      copyKey: 'soloMiners.highlights.lottery.copy'
    },
    {
      icon: '??',
      titleKey: 'soloMiners.highlights.home.title',
      copyKey: 'soloMiners.highlights.home.copy'
    },
    {
      icon: '???',
      titleKey: 'soloMiners.highlights.decentralization.title',
      copyKey: 'soloMiners.highlights.decentralization.copy'
    }
  ];
  faqItems: FAQItem[] = [];
  hasFirestoreData = false;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    super();
  }

  async ngOnInit(): Promise<void> {
    this.setupCopy();

    await this.withLoading(async () => {
      await this.loadSoloMinerCatalog();
    });

    this.registerSchemas();
  }

  ngOnDestroy(): void {
    this.seoService.removeAllSchemas();
  }

  scrollToComparison(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('solo-miner-comparison')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToFAQ(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.getElementById('solo-miner-faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private setupCopy(): void {
    this.faqItems = [
      {
        question: 'soloMiners.faq.items.whatIs.question',
        answer: 'soloMiners.faq.items.whatIs.answer'
      },
      {
        question: 'soloMiners.faq.items.profitable.question',
        answer: 'soloMiners.faq.items.profitable.answer'
      },
      {
        question: 'soloMiners.faq.items.bestHome.question',
        answer: 'soloMiners.faq.items.bestHome.answer'
      },
      {
        question: 'soloMiners.faq.items.needsNode.question',
        answer: 'soloMiners.faq.items.needsNode.answer'
      },
      {
        question: 'soloMiners.faq.items.lottery.question',
        answer: 'soloMiners.faq.items.lottery.answer'
      }
    ];
  }

  private async loadSoloMinerCatalog(): Promise<void> {
    try {
      const categories = await firstValueFrom(this.categoryService.getActiveCategories());
      const soloCategory = categories.find(cat => cat.slug === this.soloMinerSlug);

      if (!soloCategory) {
        this.seedFallbackSoloMiners();
        return;
      }

      const products = await firstValueFrom(this.productsService.getAllProducts());
      const soloProducts = products.filter(product => product.categoryId === soloCategory.id && product.status === 'published');

      if (soloProducts.length === 0) {
        this.seedFallbackSoloMiners();
        return;
      }

      this.soloMinerProducts = soloProducts.map(product => this.mapProductToCard(product));
      this.hasFirestoreData = true;
    } catch (error) {
      void 0;
      this.seedFallbackSoloMiners();
    }
  }

  private mapProductToCard(product: Product): SoloMinerCard {
    const rawSpecs: any = product.specs;
    const specFeatureList: Array<{ title?: string; description?: string }> = Array.isArray(rawSpecs?.features)
      ? rawSpecs.features
      : [];

    const previewFeatures = specFeatureList
      .map(feature => feature.title)
      .filter((title): title is string => !!title);

    const findSpecValue = (keyword: string): string | undefined =>
      specFeatureList.find(feature =>
        (feature.title ?? '').toLowerCase().includes(keyword)
      )?.description;

    const legacyProduct = product as any;
    const price = typeof legacyProduct.price === 'number' ? (legacyProduct.price as number) : null;
    const shortDescription: string | undefined = typeof legacyProduct.shortDescription === 'string'
      ? legacyProduct.shortDescription
      : undefined;

    return {
      id: product.id || product.slug,
      name: product.name,
      slug: product.slug,
      description: product.description || shortDescription || 'soloMiners.cta.defaultDescription',
      imageUrl: this.resolveProductImage(product),
      hashrate: findSpecValue('hash'),
      power: findSpecValue('power'),
      efficiency: findSpecValue('eff'),
      price,
      features: (previewFeatures.length > 0 ? previewFeatures : product.features ?? []).slice(0, 4),
      badge: 'soloMiners.badges.lottery',
      ctaLabel: 'soloMiners.cta.viewProduct',
      ctaLink: `/products/${product.slug}`,
      inStock: legacyProduct.stock === undefined ? undefined : legacyProduct.stock > 0
    };
  }

  private seedFallbackSoloMiners(): void {
    this.soloMinerProducts = [
      {
        id: 'bitaxe-ultra',
        name: 'Bitaxe Ultra',
        slug: 'bitaxe-ultra-solo-miner',
        description: 'soloMiners.fallback.bitaxe.description',
        imageUrl: '/assets/products/solo-miners/bitaxe-ultra.jpg',
        hashrate: '500 GH/s',
        power: '15 W',
        efficiency: '30 J/TH',
        price: 299,
        features: [
          'soloMiners.fallback.bitaxe.features.usb',
          'soloMiners.fallback.bitaxe.features.silent',
          'soloMiners.fallback.bitaxe.features.openSource',
          'soloMiners.fallback.bitaxe.features.easySetup'
        ],
        ctaLabel: 'soloMiners.cta.requestQuote',
        ctaLink: '/contacto?product=bitaxe-ultra',
        badge: 'soloMiners.badges.hobby',
        inStock: true
      },
      {
        id: 'apollo-btc',
        name: 'Apollo BTC',
        slug: 'apollo-btc-solo-miner',
        description: 'soloMiners.fallback.apollo.description',
        imageUrl: '/assets/products/solo-miners/apollo-btc.jpg',
        hashrate: '2.8 TH/s',
        power: '200 W',
        efficiency: '71 J/TH',
        price: 799,
        features: [
          'soloMiners.fallback.apollo.features.node',
          'soloMiners.fallback.apollo.features.lowNoise',
          'soloMiners.fallback.apollo.features.desktop',
          'soloMiners.fallback.apollo.features.premium'
        ],
        ctaLabel: 'soloMiners.cta.requestQuote',
        ctaLink: '/contacto?product=apollo-btc',
        badge: 'soloMiners.badges.pro',
        inStock: true
      },
      {
        id: 'compac-f',
        name: 'Compac F USB Miner',
        slug: 'compac-f-usb-solo-miner',
        description: 'soloMiners.fallback.compac.description',
        imageUrl: '/assets/products/solo-miners/compac-f.jpg',
        hashrate: '300 GH/s',
        power: '10 W',
        efficiency: '33 J/TH',
        price: 199,
        features: [
          'soloMiners.fallback.compac.features.usb',
          'soloMiners.fallback.compac.features.lowPower',
          'soloMiners.fallback.compac.features.affordable',
          'soloMiners.fallback.compac.features.plugPlay'
        ],
        ctaLabel: 'soloMiners.cta.requestQuote',
        ctaLink: '/contacto?product=compac-f',
        badge: 'soloMiners.badges.entry',
        inStock: true
      }
    ];
  }

  private resolveProductImage(product: Product): string {
    const directImage = (product as any).imageUrl;
    if (directImage) {
      return directImage;
    }

    if (product.coverImage && product.coverImage.startsWith('http')) {
      return product.coverImage;
    }

    return '/assets/placeholder-product.jpg';
  }

  private resolveTranslation(value: string): string {
    if (!value) {
      return '';
    }

    const translated = this.translate.instant(value);
    return translated && translated !== value ? translated : value;
  }

  private registerSchemas(): void {
    const brandName = this.brandConfig.siteName;
    const siteUrl = this.brandConfig.siteUrl;
    const subtitle = 'Best Bitcoin Solo Miners 2025 | Solo Mining Equipment';
    this.seoService.setTitle(`${subtitle} | ${brandName}`);
    this.seoService.setMetaDescription(
      `Buy Bitcoin solo miners and lottery-ready equipment with ${brandName}'s concierge team. Shop Bitaxe, Apollo BTC, and compact ASIC rigs optimized for home and studio deployments.`
    );
    this.seoService.setMetaKeywords(
      'bitcoin solo miner, solo mining equipment, lottery mining, solo mining rig, bitcoin solo mining, home bitcoin miner, Bitaxe, Apollo BTC, solo ASIC miner, solo mining hardware 2025'
    );
    this.seoService.setCanonicalUrl(`${siteUrl}/solo-miners`);

    const schemaItems: ProductSchemaData[] = this.soloMinerProducts.map(item => ({
      name: item.name,
      description: this.resolveTranslation(item.description),
      imageUrl: item.imageUrl,
      price: item.price ?? 0,
      currency: 'USD',
      sku: item.id,
      brand: item.name.split(' ')[0],
      availability: item.inStock === false ? 'OutOfStock' : 'InStock',
      slug: item.slug
    }));

    if (schemaItems.length > 0) {
      this.seoService.generateItemListSchema(schemaItems, 'Bitcoin Solo Miners');
    }

    this.seoService.generateFAQSchema(this.faqItems);
    this.seoService.generateBreadcrumbSchema([
      { name: 'Home', url: siteUrl },
      { name: 'Solo Miners', url: `${siteUrl}/solo-miners` }
    ]);
  }
}


