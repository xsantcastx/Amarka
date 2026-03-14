import { Injectable, inject } from '@angular/core';
import { Firestore, collection, getDocs, limit, orderBy, query, where } from '@angular/fire/firestore';
import {
  AUDIENCE_SECTIONS,
  CASE_STUDIES,
  DOWNLOADS,
  HOME_CONTENT,
  SERVICES,
  STUDIO_SETTINGS,
  TRADE_STEPS,
} from '../data/studio.seed';
import {
  AudienceSection,
  CaseStudy,
  DownloadAsset,
  HomeContent,
  ServiceCommission,
  StudioSettings,
  TradeStep,
} from '../models/studio';

@Injectable({ providedIn: 'root' })
export class StudioContentService {
  private firestore = inject(Firestore);

  async getStudioSettings(): Promise<StudioSettings> {
    return STUDIO_SETTINGS;
  }

  async getHomeContent(): Promise<HomeContent> {
    return HOME_CONTENT;
  }

  async getCaseStudies(filter?: { clientType?: string; featuredOnly?: boolean }): Promise<CaseStudy[]> {
    try {
      const ref = collection(this.firestore, 'caseStudies');
      const constraints: any[] = [where('published', '==', true), orderBy('updatedAt', 'desc'), limit(24)];
      if (filter?.clientType && filter.clientType !== 'all') {
        constraints.unshift(where('clientType', '==', filter.clientType));
      }
      if (filter?.featuredOnly) {
        constraints.unshift(where('featured', '==', true));
      }
      const snap = await getDocs(query(ref, ...constraints));
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<CaseStudy, 'id'>) }));
      }
    } catch {
      // Fall back to local seed data for build-time resilience.
    }

    return CASE_STUDIES.filter(item => {
      if (filter?.featuredOnly && !item.featured) return false;
      if (filter?.clientType && filter.clientType !== 'all' && item.clientType !== filter.clientType) return false;
      return item.published;
    });
  }

  async getCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
    const items = await this.getCaseStudies();
    return items.find(item => item.slug === slug) ?? null;
  }

  async getServices(): Promise<ServiceCommission[]> {
    try {
      const ref = collection(this.firestore, 'services');
      const snap = await getDocs(query(ref, where('published', '==', true), orderBy('title')));
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<ServiceCommission, 'id'>) }));
      }
    } catch {
      // Fall back to seeded content.
    }
    return SERVICES.filter(item => item.published);
  }

  async getAudienceSections(): Promise<AudienceSection[]> {
    return AUDIENCE_SECTIONS;
  }

  async getTradeSteps(): Promise<TradeStep[]> {
    return TRADE_STEPS;
  }

  async getDownload(slug: string): Promise<DownloadAsset | null> {
    return DOWNLOADS.find(item => item.slug === slug && item.published) ?? null;
  }
}
