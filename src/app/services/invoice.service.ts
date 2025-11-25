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

  generateInvoice(order: InvoiceOrder): void {
    const doc = new jsPDF();
    
    // Company/Logo Header
    doc.setFontSize(24);
    doc.setTextColor(147, 51, 234); // Purple color
    doc.text(this.brandName, 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(this.brandTagline, 20, 27);
    
    // Invoice Title
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text('INVOICE', 150, 20);
    
    // Order Information Box
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Invoice Number:', 150, 30);
    doc.text('Date:', 150, 37);
    doc.text('Status:', 150, 44);
    
    doc.setTextColor(0, 0, 0);
    doc.text(order.orderNumber, 185, 30);
    doc.text(this.formatDate(order.date || order.createdAt), 185, 37);
    doc.text(this.formatStatus(order.status), 185, 44);
    
    // Shipping Address
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Ship To:', 20, 50);
    
    doc.setFontSize(10);
    if (order.shippingAddress) {
      const addr = order.shippingAddress;
      let y = 58;
      
      if (addr.firstName && addr.lastName) {
        doc.text(`${addr.firstName} ${addr.lastName}`, 20, y);
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
    
    // Items Table Header
    const tableTop = 95;
    doc.setFillColor(147, 51, 234);
    doc.rect(20, tableTop, 170, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('Product', 25, tableTop + 5.5);
    doc.text('Qty', 130, tableTop + 5.5);
    doc.text('Unit Price', 150, tableTop + 5.5);
    doc.text('Total', 175, tableTop + 5.5);
    
    // Items Table Body
    doc.setTextColor(0, 0, 0);
    let currentY = tableTop + 15;
    
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
        
        doc.text(quantity.toString(), 135, currentY, { align: 'right' });
        doc.text(`$${unitPrice.toFixed(2)}`, 165, currentY, { align: 'right' });
        doc.text(`$${total.toFixed(2)}`, 185, currentY, { align: 'right' });
        
        currentY += Math.max(5, lines.length * 5);
        
        // Add line separator
        if (index < order.items.length - 1) {
          doc.setDrawColor(220, 220, 220);
          doc.line(20, currentY + 2, 190, currentY + 2);
          currentY += 7;
        }
      });
    }
    
    // Totals Section
    currentY += 10;
    const totalsX = 140;
    
    // Calculate subtotal, tax, shipping from order data
    const subtotal = order.subtotal || this.calculateSubtotal(order.items);
    const tax = order.tax || (order.total - subtotal);
    const shipping = order.shipping || 0;
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    
    doc.text('Subtotal:', totalsX, currentY);
    doc.text(`$${subtotal.toFixed(2)}`, 185, currentY, { align: 'right' });
    
    if (shipping > 0) {
      currentY += 7;
      doc.text('Shipping:', totalsX, currentY);
      doc.text(`$${shipping.toFixed(2)}`, 185, currentY, { align: 'right' });
    }
    
    if (tax > 0) {
      currentY += 7;
      doc.text('Tax:', totalsX, currentY);
      doc.text(`$${tax.toFixed(2)}`, 185, currentY, { align: 'right' });
    }
    
    // Total
    currentY += 10;
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Total:', totalsX, currentY);
    doc.text(`$${order.total.toFixed(2)}`, 185, currentY, { align: 'right' });
    
    // Footer
    const footerY = 270;
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Thank you for your business!', 105, footerY, { align: 'center' });
    doc.text('For questions about this invoice, please contact support@amarka.com', 105, footerY + 5, { align: 'center' });
    
    // Add border
    doc.setDrawColor(147, 51, 234);
    doc.setLineWidth(0.5);
    doc.rect(15, 15, 180, 267);
    
    // Save the PDF
    const fileName = `invoice-${order.orderNumber}.pdf`;
    doc.save(fileName);
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
}
