import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AdminSidebarComponent } from '../../../shared/components/admin-sidebar/admin-sidebar.component';
import { PromoCodeService } from '../../../services/promo-code.service';
import { PromoCode } from '../../../models/cart';
import { LoadingComponentBase } from '../../../core/classes/loading-component.base';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-discounts-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, TranslateModule, AdminSidebarComponent],
  templateUrl: './discounts-admin.page.html',
  styleUrls: ['./discounts-admin.page.scss']
})
export class DiscountsAdminPage extends LoadingComponentBase implements OnInit {
  private promoCodeService = inject(PromoCodeService);

  promoCodes: PromoCode[] = [];
  showModal = false;
  isEditMode = false;
  selectedPromoCode: Partial<PromoCode> & {
    validFromDate?: string;
    validUntilDate?: string;
  } = {};
  message = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  async ngOnInit() {
    await this.loadPromoCodes();
  }

  async loadPromoCodes() {
    await this.withLoading(async () => {
      const promoCodes = await new Promise<PromoCode[]>((resolve, reject) => {
        this.promoCodeService.getAllPromoCodes().subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err)
        });
      });
      this.promoCodes = promoCodes;
    });
  }

  addNew() {
    this.selectedPromoCode = {
      code: '',
      type: 'percentage',
      value: 10,
      active: true,
      maxUses: undefined,
      minOrderAmount: undefined,
      validFromDate: '',
      validUntilDate: ''
    };
    this.isEditMode = false;
    this.showModal = true;
  }

  edit(promoCode: PromoCode) {
    this.selectedPromoCode = {
      ...promoCode,
      validFromDate: promoCode.validFrom ? this.timestampToDateString(promoCode.validFrom) : '',
      validUntilDate: promoCode.validUntil ? this.timestampToDateString(promoCode.validUntil) : ''
    };
    this.isEditMode = true;
    this.showModal = true;
  }

  async save() {
    if (!this.selectedPromoCode.code || !this.selectedPromoCode.value) {
      this.showMessage('Code and value are required', 'error');
      return;
    }

    // Check for duplicate code
    const codeExists = await this.promoCodeService.codeExists(
      this.selectedPromoCode.code,
      this.isEditMode ? this.selectedPromoCode.id : undefined
    );
    if (codeExists) {
      this.showMessage('A promo code with this code already exists', 'error');
      return;
    }

    try {
      // Convert date strings to Timestamps
      const promoData: Partial<PromoCode> = {
        code: this.selectedPromoCode.code,
        type: this.selectedPromoCode.type,
        value: this.selectedPromoCode.value,
        active: this.selectedPromoCode.active,
        maxUses: this.selectedPromoCode.maxUses || undefined,
        minOrderAmount: this.selectedPromoCode.minOrderAmount || undefined,
        validFrom: this.selectedPromoCode.validFromDate
          ? Timestamp.fromDate(new Date(this.selectedPromoCode.validFromDate))
          : undefined,
        validUntil: this.selectedPromoCode.validUntilDate
          ? Timestamp.fromDate(new Date(this.selectedPromoCode.validUntilDate + 'T23:59:59'))
          : undefined
      };

      if (this.isEditMode && this.selectedPromoCode.id) {
        await this.promoCodeService.updatePromoCode(this.selectedPromoCode.id, promoData);
        this.showMessage('Promo code updated successfully', 'success');
      } else {
        await this.promoCodeService.addPromoCode(promoData as Omit<PromoCode, 'id'>);
        this.showMessage('Promo code created successfully', 'success');
      }
      this.loadPromoCodes();
      this.closeModal();
    } catch (error: any) {
      console.error('Error saving promo code:', error);
      this.showMessage('Error saving promo code: ' + error.message, 'error');
    }
  }

  async delete(promoCode: PromoCode) {
    if (!promoCode.id || !confirm(`Are you sure you want to delete "${promoCode.code}"?`)) return;

    try {
      await this.promoCodeService.deletePromoCode(promoCode.id);
      this.showMessage('Promo code deleted successfully', 'success');
      this.loadPromoCodes();
    } catch (error: any) {
      console.error('Error deleting promo code:', error);
      this.showMessage('Error deleting promo code: ' + error.message, 'error');
    }
  }

  async toggleActive(promoCode: PromoCode) {
    if (!promoCode.id) return;

    try {
      await this.promoCodeService.updatePromoCode(promoCode.id, {
        active: !promoCode.active
      });
      this.loadPromoCodes();
    } catch (error: any) {
      console.error('Error toggling promo code:', error);
      this.showMessage('Error updating promo code: ' + error.message, 'error');
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedPromoCode = {};
  }

  generateCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.selectedPromoCode.code = code;
  }

  showMessage(msg: string, type: 'success' | 'error' | 'info') {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => this.message = '', 3000);
  }

  formatDate(timestamp: Timestamp | undefined): string {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleDateString();
  }

  formatValue(promoCode: PromoCode): string {
    if (promoCode.type === 'percentage') {
      return `${promoCode.value}%`;
    }
    return `$${promoCode.value.toFixed(2)}`;
  }

  getStatusClass(promoCode: PromoCode): string {
    if (!promoCode.active) return 'text-slate-500';

    const now = new Date();
    if (promoCode.validUntil && promoCode.validUntil.toDate() < now) {
      return 'text-rose-600';
    }
    if (promoCode.validFrom && promoCode.validFrom.toDate() > now) {
      return 'text-amber-600';
    }
    if (promoCode.maxUses && (promoCode.currentUses || 0) >= promoCode.maxUses) {
      return 'text-rose-600';
    }
    return 'text-emerald-600';
  }

  getStatusText(promoCode: PromoCode): string {
    if (!promoCode.active) return 'Inactive';

    const now = new Date();
    if (promoCode.validUntil && promoCode.validUntil.toDate() < now) {
      return 'Expired';
    }
    if (promoCode.validFrom && promoCode.validFrom.toDate() > now) {
      return 'Scheduled';
    }
    if (promoCode.maxUses && (promoCode.currentUses || 0) >= promoCode.maxUses) {
      return 'Limit Reached';
    }
    return 'Active';
  }

  private timestampToDateString(timestamp: Timestamp): string {
    const date = timestamp.toDate();
    return date.toISOString().split('T')[0];
  }
}
