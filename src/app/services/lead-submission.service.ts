import { Injectable, inject } from '@angular/core';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Storage, getDownloadURL, ref, uploadBytesResumable } from '@angular/fire/storage';
import { AnalyticsService } from './analytics.service';
import { EnquirySubmission, TradeApplication, UploadRef } from '../models/studio';

@Injectable({ providedIn: 'root' })
export class LeadSubmissionService {
  private readonly allowedExtensions = new Set(['pdf', 'ai', 'dwg', 'jpg', 'jpeg', 'png']);
  private readonly maxFileSizeBytes = 20 * 1024 * 1024;
  private readonly maxFileCount = 5;
  private functions = inject(Functions);
  private storage = inject(Storage);
  private analytics = inject(AnalyticsService);

  async uploadFiles(
    files: File[],
    category: 'enquiries' | 'trade-applications',
    progress?: (value: number) => void
  ): Promise<UploadRef[]> {
    if (!files.length) {
      return [];
    }

    this.validateFiles(files);

    const uploads = await Promise.all(
      files.map(async (file, index) => {
        const safeName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, '-')}`;
        const storagePath = `private/${category}/${safeName}`;
        const storageRef = ref(this.storage, storagePath);
        const task = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
          task.on(
            'state_changed',
            snapshot => {
              if (progress) {
                progress((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
              }
            },
            reject,
            () => resolve()
          );
        });

        return {
          storagePath,
          originalName: file.name,
          mimeType: file.type,
          size: file.size
        } satisfies UploadRef;
      })
    );

    return uploads;
  }

  async submitEnquiry(payload: EnquirySubmission): Promise<{ ok: boolean; id: string }> {
    const callable = httpsCallable<EnquirySubmission, { ok: boolean; id: string }>(
      this.functions,
      'submitStudioEnquiry'
    );
    const result = await callable(payload);
    this.analytics.trackLeadEvent('enquiry_submit', {
      enquiry_type: payload.type,
      role: payload.role,
      source_page: payload.sourcePage
    });
    return result.data;
  }

  async submitTradeApplication(payload: TradeApplication): Promise<{ ok: boolean; id: string }> {
    const callable = httpsCallable<TradeApplication, { ok: boolean; id: string }>(
      this.functions,
      'submitTradeApplication'
    );
    const result = await callable(payload);
    this.analytics.trackLeadEvent('trade_application_submit', {
      role: payload.role,
      project_type: payload.projectType
    });
    return result.data;
  }

  async getUploadedFileUrl(path: string): Promise<string> {
    return getDownloadURL(ref(this.storage, path));
  }

  private validateFiles(files: File[]): void {
    if (files.length > this.maxFileCount) {
      throw new Error(`Upload up to ${this.maxFileCount} files per submission.`);
    }

    for (const file of files) {
      const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!this.allowedExtensions.has(extension)) {
        throw new Error('Allowed file types: PDF, AI, DWG, JPG, JPEG, PNG.');
      }

      if (file.size > this.maxFileSizeBytes) {
        throw new Error('Each file must be 20MB or smaller.');
      }
    }
  }
}
