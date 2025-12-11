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
    
    // Brand + logo
    const logo = await this.getLogoDataUrl();
    if (logo) {
      try {
        doc.addImage(logo, 'PNG', 20, 12, 42, 16);
      } catch (err) {
        console.warn('[Invoice] Logo render failed, using text fallback', err);
        doc.setFontSize(24);
        doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
        doc.text(this.brandName, 20, 22);
      }
    } else {
      doc.setFontSize(24);
      doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
      doc.text(this.brandName, 20, 22);
    }
    
    doc.setFontSize(11);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    doc.text(this.brandTagline, 20, 32);
    
    // Decorative line under brand
    doc.setDrawColor(this.secondaryColor.r, this.secondaryColor.g, this.secondaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(20, 35, 80, 35);
    
    // Invoice Title
    doc.setFontSize(22);
    doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
    doc.text('INVOICE', 150, 22);
    
    // Order Information Box with warm background
    doc.setFillColor(247, 240, 231); // ts-bg #F7F0E7
    doc.roundedRect(145, 28, 50, 24, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    doc.text('Invoice #:', 148, 33);
    doc.text('Date:', 148, 39);
    doc.text('Status:', 148, 45);
    
    doc.setFontSize(9);
    doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
    doc.text(order.orderNumber, 192, 33, { align: 'right' });
    doc.text(this.formatDate(order.date || order.createdAt), 192, 39, { align: 'right' });
    
    // Status with color coding
    const status = this.formatStatus(order.status);
    if (order.status === 'completed' || order.status === 'delivered') {
      doc.setTextColor(34, 197, 94); // green
    } else if (order.status === 'processing' || order.status === 'shipped') {
      doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    } else {
      doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    }
    doc.text(status, 192, 45, { align: 'right' });
    
    // Shipping Address with styled header
    doc.setFontSize(11);
    doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
    doc.text('Ship To:', 20, 60);
    
    doc.setDrawColor(this.secondaryColor.r, this.secondaryColor.g, this.secondaryColor.b);
    doc.setLineWidth(0.3);
    doc.line(20, 62, 45, 62);
    
    doc.setFontSize(9);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    if (order.shippingAddress) {
      const addr = order.shippingAddress;
      let y = 68;
      
      if (addr.firstName && addr.lastName) {
        doc.setFont('helvetica', 'bold');
        doc.text(`${addr.firstName} ${addr.lastName}`, 20, y);
        doc.setFont('helvetica', 'normal');
        y += 5;
      }
      
      if (addr.line1) {
        doc.text(addr.line1, 20, y);
        y += 5;
      }
      
      if (addr.line2) {
        doc.text(addr.line2, 20, y);
        y += 5;
      }
      
      if (addr.city || addr.region || addr.postalCode) {
        const cityLine = [addr.city, addr.region, addr.postalCode].filter(Boolean).join(', ');
        doc.text(cityLine, 20, y);
        y += 5;
      }
      
      if (addr.country) {
        doc.text(addr.country, 20, y);
        y += 5;
      }
      
      if (addr.phone) {
        doc.text(`Phone: ${addr.phone}`, 20, y);
      }
    }
    
    // Items Table Header with Amarka branding
    const tableTop = 105;
    doc.setFillColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    doc.roundedRect(20, tableTop, 170, 9, 1, 1, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Product', 25, tableTop + 6);
    doc.text('Qty', 130, tableTop + 6);
    doc.text('Unit Price', 152, tableTop + 6);
    doc.text('Total', 180, tableTop + 6);
    doc.setFont('helvetica', 'normal');
    
    // Items Table Body
    doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
    doc.setFontSize(9);
    let currentY = tableTop + 17;
    
    if (order.items && order.items.length > 0) {
      order.items.forEach((item, index) => {
        const productName = item.name || item.productName || 'Product';
        const quantity = item.qty || item.quantity || 1;
        const unitPrice = item.unitPrice || item.price || 0;
        const total = quantity * unitPrice;
        
        // Wrap product name if too long
        const maxWidth = 100;
        const lines = doc.splitTextToSize(productName, maxWidth);
        
        lines.forEach((line: string, lineIndex: number) => {
          doc.text(line, 25, currentY + (lineIndex * 5));
        });
        
        const currSymbol = this.getCurrencySymbol(order.currency);
        doc.text(quantity.toString(), 135, currentY, { align: 'right' });
        doc.text(`${currSymbol}${unitPrice.toFixed(2)}`, 165, currentY, { align: 'right' });
        doc.text(`${currSymbol}${total.toFixed(2)}`, 185, currentY, { align: 'right' });
        
        currentY += Math.max(5, lines.length * 5);
        
        // Add line separator
        if (index < order.items.length - 1) {
          doc.setDrawColor(this.secondaryColor.r, this.secondaryColor.g, this.secondaryColor.b);
          doc.setLineWidth(0.2);
          doc.line(20, currentY + 2, 190, currentY + 2);
          currentY += 7;
        }
      });
    } else {
      doc.text('No items found for this order.', 25, currentY);
      currentY += 12;
    }
    
    // Totals Section with warm background
    currentY += 12;
    const totalsX = 135;
    
    // Add subtle background for totals
    doc.setFillColor(254, 252, 248); // ts-bg-soft #FEFCF8
    doc.roundedRect(130, currentY - 3, 62, 35, 2, 2, 'F');
    
    // Calculate subtotal, tax, shipping from order data
    const subtotal = order.subtotal || this.calculateSubtotal(order.items);
    const tax = order.tax || (order.total - subtotal);
    const shipping = order.shipping || 0;
    
    doc.setFontSize(9);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    
    const currSymbol = this.getCurrencySymbol(order.currency);
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`${currSymbol}${subtotal.toFixed(2)}`, 188, currentY, { align: 'right' });
    
    if (shipping > 0) {
      currentY += 6;
      doc.text('Shipping:', totalsX, currentY);
      doc.text(`${currSymbol}${shipping.toFixed(2)}`, 188, currentY, { align: 'right' });
    }
    
    if (tax > 0) {
      currentY += 6;
      doc.text('Tax:', totalsX, currentY);
      doc.text(`${currSymbol}${tax.toFixed(2)}`, 188, currentY, { align: 'right' });
    }
    
    // Total with emphasis
    currentY += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(this.inkColor.r, this.inkColor.g, this.inkColor.b);
    doc.text('Total:', totalsX, currentY);
    doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    doc.text(`${currSymbol}${order.total.toFixed(2)}`, 188, currentY, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    
    // Footer with Amarka contact info
    const footerY = 248;
    
    doc.setFontSize(11);
    doc.setTextColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    doc.text('Thank you for your order!', 105, footerY, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(this.softInkColor.r, this.softInkColor.g, this.softInkColor.b);
    doc.text(this.brandAddress, 105, footerY + 5, { align: 'center' });
    doc.text(`Email: ${this.contactEmail}`, 105, footerY + 10, { align: 'center' });
    doc.text(`Phone: ${this.contactPhone}`, 105, footerY + 15, { align: 'center' });
    doc.text(`Hours: ${this.supportHours}`, 105, footerY + 20, { align: 'center' });
    
    // Add border with Amarka colors
    doc.setDrawColor(this.primaryColor.r, this.primaryColor.g, this.primaryColor.b);
    doc.setLineWidth(0.8);
    doc.roundedRect(15, 15, 180, 270, 3, 3);
    
    // Save the PDF
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
