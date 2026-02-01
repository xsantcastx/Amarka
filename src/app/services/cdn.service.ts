import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';

@Injectable({
  providedIn: 'root'
})
export class CdnService {
  private settingsService = inject(SettingsService);
  private cdnUrl: string = '';

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    const settings = await this.settingsService.getSettings();
    this.cdnUrl = settings.cdnUrl?.trim() || '';
    
    if (this.cdnUrl) {
      void 0;
    }
  }

  /**
   * Get the full URL for an asset, prepending CDN URL if configured
   */
  getAssetUrl(path: string): string {
    if (!path) {
      return '';
    }

    // If path is already a full URL, return as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // If CDN URL is configured, prepend it
    if (this.cdnUrl) {
      // Ensure path starts with /
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      // Remove trailing slash from CDN URL
      const normalizedCdn = this.cdnUrl.endsWith('/') 
        ? this.cdnUrl.slice(0, -1) 
        : this.cdnUrl;
      
      return `${normalizedCdn}${normalizedPath}`;
    }

    // No CDN configured, return original path
    return path;
  }

  /**
   * Get multiple asset URLs
   */
  getAssetUrls(paths: string[]): string[] {
    return paths.map(path => this.getAssetUrl(path));
  }

  /**
   * Check if CDN is enabled
   */
  isCdnEnabled(): boolean {
    return this.cdnUrl.length > 0;
  }

  /**
   * Get the configured CDN URL
   */
  getCdnUrl(): string {
    return this.cdnUrl;
  }
}
