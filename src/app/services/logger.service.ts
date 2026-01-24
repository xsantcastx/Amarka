import { Injectable, inject } from '@angular/core';
import { SettingsService } from './settings.service';
import { environment } from '../../environments/environment';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private settingsService = inject(SettingsService);
  private settings: any = null;
  private logLevels: LogLevel[] = ['error', 'warn', 'info', 'debug'];

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    this.settings = await this.settingsService.getSettings();
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.settings) {
      return !environment.production || level === 'error';
    }

    // If debug mode is off, only show errors
    if (!this.settings.debugMode && level !== 'error') {
      return false;
    }

    // Check if current level is allowed based on configured logLevel
    const configuredLevel = this.settings.logLevel || 'info';
    const configuredIndex = this.logLevels.indexOf(configuredLevel as LogLevel);
    const currentIndex = this.logLevels.indexOf(level);

    // Show log if current level is equal or higher priority than configured
    return currentIndex <= configuredIndex;
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }

  /**
   * Log with custom prefix (for service-specific logging)
   */
  log(prefix: string, message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(`${prefix} ${message}`, ...args);
    }
  }
}
