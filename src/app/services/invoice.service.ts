import { Injectable, inject } from '@angular/core';
import jsPDF from 'jspdf';
import { BrandConfigService } from '../core/services/brand-config.service';

// Generic invoice order interface that works with both order formats
export interface InvoiceOrder {
  id?: string;
  orderNumber: string;
  date?: Date;
  createdAt?: any;
  status: string;
  total: number;
  items: InvoiceOrderItem[];
  shippingAddress?: any;
  trackingNumber?: string;
  itemCount?: number;
  currency?: string;
  subtotal?: number;
  tax?: number;
  shipping?: number;
}

export interface InvoiceOrderItem {
  productId?: string;
  name?: string;
  productName?: string;
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  price?: number;
  image?: string;
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private brandConfig = inject(BrandConfigService);
  private brandName = this.brandConfig.siteName;
  private brandTagline = this.brandConfig.site.brand.tagline || 'Premium commerce storefront';
  private contactEmail = 'jessica@amarka.co';
  private contactPhone = '2035546224';
  private brandAddress = '100 Greyrock Pl F119\nStamford, CT 06901';
  private supportHours = 'Mon-Mon 10AM-7PM EDT';
  
  // Amarka theme colors (warm terracotta/orange)
  private primaryColor = { r: 199, g: 104, b: 59 }; // ts-accent #C7683B
  private secondaryColor = { r: 229, g: 155, b: 115 }; // ts-accent-soft #E59B73
  private inkColor = { r: 23, g: 19, b: 15 }; // ts-ink #17130F
  private softInkColor = { r: 75, g: 59, b: 47 }; // ts-ink-soft #4B3B2F

  async generateInvoice(order: InvoiceOrder): Promise<void> {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const contentRight = pageWidth - margin;
    const contentWidth = pageWidth - (margin * 2);
    const headerHeight = 44;

    const logo = await this.getLogoDataUrl();

    // Header background
    doc.setFillColor(252, 246, 238);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Brand + logo
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', margin, 12, 36, 14);
      } catch (err) {
        console.warn('[Invoice] Logo render failed, using text fallback', err);
        doc.setFontSize(18);
        doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
        doc.text(this.brandName, margin, 22);
      }
    } else {
      doc.setFontSize(18);
      doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
      doc.text(this.brandName, margin, 22);
    }

    doc.setFontSize(9);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    doc.text(this.brandTagline, margin, 32);

    doc.setDrawColor(this.secondaryColor.r, this.secondaryColor.g, this.secondaryColor.b);
    doc.setLineWidth(0.4);
    doc.line(margin, headerHeight - 10, margin + 65, headerHeight - 10);

    // Invoice title
    doc.setFontSize(20);
    doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
    doc.text('INVOICE', contentRight, 20, { align: 'right' });
    doc.setFontSize(9);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    doc.text(`Invoice # ${order.orderNumber}`, contentRight, 28, { align: 'right' });

    // Order summary card
    const summaryWidth = 74;
    const summaryX = contentRight - summaryWidth;
    const summaryY = headerHeight + 10;
    const summaryHeight = 46;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(232, 214, 201);
    doc.setLineWidth(0.3);
    doc.roundedRect(summaryX, summaryY, summaryWidth, summaryHeight, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    doc.text('ORDER SUMMARY', summaryX + 4, summaryY + 6);

    const summaryRows = [
      { label: 'Date', value: this.formatDate(order.date || order.createdAt) },
      { label: 'Status', value: this.formatStatus(order.status) },
      { label: 'Total', value: `${this.getCurrencySymbol(order.currency)}${order.total.toFixed(2)}` }
    ];

    let summaryTextY = summaryY + 14;
    summaryRows.forEach((row, index) => {
      doc.setFontSize(9);
      doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
      doc.text(`${row.label}:`, summaryX + 4, summaryTextY);

      if (row.label === 'Status') {
        if (order.status === 'completed' || order.status === 'delivered') {
          doc.setTextColor(34, 197, 94);
        } else if (order.status === 'processing' || order.status === 'shipped') {
          doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
        } else {
          doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
        }
      } else if (row.label === 'Total') {
        doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
      } else {
        doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
      }

      doc.text(row.value, summaryX + summaryWidth - 4, summaryTextY, { align: 'right' });
      summaryTextY += index === 0 ? 9 : 8;
    });

    // Shipping address
    const addressX = margin;
    const addressY = summaryY + 4;
    doc.setFontSize(10);
    doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
    doc.text('Ship To', addressX, addressY);
    doc.setDrawColor(this.secondaryColor.r, this.secondaryColor.g, this.secondaryColor.b);
    doc.setLineWidth(0.3);
    doc.line(addressX, addressY + 2, addressX + 28, addressY + 2);

    doc.setFontSize(9);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    const addr = order.shippingAddress || {};
    const addressLines: string[] = [];
    const fullName = [addr.firstName, addr.lastName].filter(Boolean).join(' ');
    if (fullName) addressLines.push(fullName);
    if (addr.line1) addressLines.push(addr.line1);
    if (addr.line2) addressLines.push(addr.line2);
    const cityLine = [addr.city, addr.region || addr.state, addr.postalCode].filter(Boolean).join(', ');
    if (cityLine) addressLines.push(cityLine);
    if (addr.country) addressLines.push(addr.country);
    if (addr.email) addressLines.push(`Email: ${addr.email}`);
    if (addr.phoneE164 || addr.phone) addressLines.push(`Phone: ${addr.phoneE164 || addr.phone}`);
    if (!addressLines.length) addressLines.push('No address provided');

    let addressTextY = addressY + 8;
    addressLines.forEach((line) => {
      doc.text(line, addressX, addressTextY);
      addressTextY += 5;
    });

    // Table setup
    const tableX = margin;
    const tableWidth = contentWidth;
    const tableTop = Math.max(summaryY + summaryHeight + 12, addressTextY + 6);
    const colProduct = tableX + 4;
    const colQty = tableX + 118;
    const colUnit = tableX + 142;
    const colTotal = tableX + 174;
    const nameWidth = 100;

    const drawTableHeader = (yPos: number): number => {
      doc.setFillColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
      doc.roundedRect(tableX, yPos, tableWidth, 9, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Item', colProduct, yPos + 6);
      doc.text('Qty', colQty, yPos + 6, { align: 'right' });
      doc.text('Unit', colUnit, yPos + 6, { align: 'right' });
      doc.text('Total', colTotal, yPos + 6, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
      return yPos + 14;
    };

    const drawContinuationHeader = (): number => {
      doc.setFontSize(10);
      doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
      doc.text(this.brandName, margin, 12);
      doc.setFontSize(9);
      doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
      doc.text(`Invoice # ${order.orderNumber}`, contentRight, 12, { align: 'right' });
      return drawTableHeader(18);
    };

    let currentY = drawTableHeader(tableTop);
    const currSymbol = this.getCurrencySymbol(order.currency);

    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        const productName = item.name || item.productName || 'Product';
        const quantity = item.qty || item.quantity || 1;
        const unitPrice = item.unitPrice || item.price || 0;
        const total = quantity * unitPrice;

        const lines = doc.splitTextToSize(productName, nameWidth);
        const rowHeight = Math.max(10, (lines.length * 5) + 2);

        if (currentY + rowHeight + 10 > pageHeight - 60) {
          doc.addPage();
          currentY = drawContinuationHeader();
        }

        if (index % 2 === 0) {
          doc.setFillColor(254, 252, 248);
          doc.rect(tableX, currentY - 4, tableWidth, rowHeight + 4, 'F');
        }

        lines.forEach((line: string, lineIndex: number) => {
          doc.text(line, colProduct, currentY + (lineIndex * 5));
        });

        doc.text(quantity.toString(), colQty, currentY, { align: 'right' });
        doc.text(`${currSymbol}${unitPrice.toFixed(2)}`, colUnit, currentY, { align: 'right' });
        doc.text(`${currSymbol}${total.toFixed(2)}`, colTotal, currentY, { align: 'right' });

        currentY += rowHeight + 4;
      });
    } else {
      doc.text('No items found for this order.', colProduct, currentY);
      currentY += 12;
    }

    // Totals
    const subtotal = order.subtotal || this.calculateSubtotal(order.items);
    const tax = order.tax || (order.total - subtotal);
    const shipping = order.shipping || 0;
    const totalsLines: Array<{ label: string; value: number }> = [
      { label: 'Subtotal', value: subtotal }
    ];
    if (shipping > 0) totalsLines.push({ label: 'Shipping', value: shipping });
    if (tax > 0) totalsLines.push({ label: 'Tax', value: tax });

    const totalsHeight = 16 + (totalsLines.length * 6) + 10;
    if (currentY + totalsHeight > pageHeight - 50) {
      doc.addPage();
      currentY = drawContinuationHeader();
      currentY += 6;
    }

    const totalsWidth = 72;
    const totalsX = contentRight - totalsWidth;
    doc.setFillColor(254, 252, 248);
    doc.setDrawColor(232, 214, 201);
    doc.roundedRect(totalsX, currentY, totalsWidth, totalsHeight, 2, 2, 'FD');

    let totalsY = currentY + 10;
    doc.setFontSize(9);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    totalsLines.forEach((row) => {
      doc.text(`${row.label}:`, totalsX + 6, totalsY);
      doc.text(`${currSymbol}${row.value.toFixed(2)}`, totalsX + totalsWidth - 6, totalsY, { align: 'right' });
      totalsY += 6;
    });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
    doc.text('Total', totalsX + 6, totalsY + 4);
    doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    doc.text(`${currSymbol}${order.total.toFixed(2)}`, totalsX + totalsWidth - 6, totalsY + 4, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // Footer
    const footerY = pageHeight - 28;
    doc.setDrawColor(232, 214, 201);
    doc.setLineWidth(0.4);
    doc.line(margin, footerY - 6, contentRight, footerY - 6);

    doc.setFontSize(10);
    doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    doc.text('Thank you for your order!', pageWidth / 2, footerY, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    doc.text(this.brandAddress, pageWidth / 2, footerY + 6, { align: 'center' });
    doc.text(`Email: ${this.contactEmail}  |  Phone: ${this.contactPhone}`, pageWidth / 2, footerY + 11, { align: 'center' });
    doc.text(`Hours: ${this.supportHours}`, pageWidth / 2, footerY + 16, { align: 'center' });

    const fileName = `invoice-${order.orderNumber}.pdf`;
    doc.save(fileName);
  }
  
  private async getLogoDataUrl(): Promise<string | null> {
    if (typeof window === 'undefined') {
      return null;
    }

    const preferred = '/Logo Clear.png';
    const brandLogo = this.brandConfig.site.brand.logo || '';

    const tryLoad = async (url: string): Promise<string | null> => {
      try {
        const absolute = url.startsWith('http') ? url : `${window.location.origin}${url}`;
        const response = await fetch(absolute);
        if (!response.ok) return null;
        const blob = await response.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (blob.type.includes('svg')) {
          return await this.convertSvgToPng(base64);
        }
        return base64;
      } catch (error) {
        return null;
      }
    };

    return (await tryLoad(preferred)) || (await tryLoad(brandLogo)) || null;
  }

  private async convertSvgToPng(svgDataUrl: string): Promise<string> {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const width = img.naturalWidth || 240;
        const height = img.naturalHeight || 80;
        canvas.width = width * 2;
        canvas.height = height * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas not supported'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = svgDataUrl;
    });
  }
  
  private formatDate(date: Date | any): string {
    if (!date) return 'N/A';
    
    // Handle Firestore Timestamp
    let d: Date;
    if (date.toDate && typeof date.toDate === 'function') {
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else {
      d = new Date(date);
    }
    
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${month}/${day}/${year}`;
  }
  
  private formatStatus(status: string): string {
    return status.charAt(0).toUpperCase() + status.slice(1);
  }
  
  private calculateSubtotal(items: any[]): number {
    if (!items || items.length === 0) return 0;
    
    return items.reduce((sum, item) => {
      const quantity = item.qty || item.quantity || 1;
      const price = item.unitPrice || item.price || 0;
      return sum + (quantity * price);
    }, 0);
  }

  private getCurrencySymbol(currency?: string): string {
    const curr = (currency || 'USD').toUpperCase();
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'CAD': 'CA$',
      'AUD': 'A$'
    };
    return symbols[curr] || '$';
  }
}
