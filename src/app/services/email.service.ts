import { Injectable, inject } from '@angular/core';
import { addDoc, collection, Firestore } from '@angular/fire/firestore';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { SettingsService } from './settings.service';
import { BrandConfigService } from '../core/services/brand-config.service';

export interface ContactFormData {
  nombre: string;
  email: string;
  telefono: string;
  empresa?: string;
  eventDate?: string;
  location?: string;
  guestCount?: string;
  budget?: string;
  mensaje: string;
  aceptarPrivacidad: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmailService {
  private db = inject(Firestore);
  private functions = inject(Functions);
  private settingsService = inject(SettingsService);
  private brandConfig = inject(BrandConfigService);
  private brandName = this.brandConfig.siteName;

  private shouldUseBrevo(provider: string): boolean {
    return String(provider || '').toLowerCase() === 'brevo';
  }

  private async sendViaBrevo(payload: {
    to: string;
    subject: string;
    html: string;
    replyTo?: { email: string; name?: string };
  }): Promise<{ success: boolean }> {
    const callable = httpsCallable<
      { to: string; subject: string; html: string; replyTo?: { email: string; name?: string } },
      { success: boolean }
    >(this.functions, 'sendBrevoEmail');

    const result = await callable(payload);
    return result.data;
  }

  private async sendViaFirestoreMail(to: string, subject: string, html: string) {
    const docRef = await addDoc(collection(this.db, 'mail'), {
      to: [to],
      message: {
        subject,
        html
      }
    });
    return docRef;
  }

  async sendCartEmail(payload: { contact: any, items: any[] }) {
    const { contact, items } = payload;
    
    // Validate required fields
    if (!contact?.name || !contact?.email || !items?.length) {
      throw new Error('Missing required fields: name, email, or items');
    }
    
    // Get settings with force refresh to ensure we have latest values
    const settings = await this.settingsService.getSettings(true);
    
    // Check if order emails are enabled
    if (!settings.orderEmailEnabled) {
      console.log('[EmailService] Order emails are disabled in settings. Email not sent.');
      return { success: true, disabled: true };
    }
    
    const recipientEmail =
      settings.notificationEmail ||
      settings.contactEmail ||
      this.brandConfig.site.contact.email;
    console.log(`[EmailService] Sending cart email to: ${recipientEmail}`);
    
    const rows = items.map((i, idx) =>
      `<tr><td style="padding:6px;border:1px solid #eee">${idx+1}</td>
        <td style="padding:6px;border:1px solid #eee">${i.name || 'Sin nombre'}</td>
        <td style="padding:6px;border:1px solid #eee">${i.thickness||''}</td>
        <td style="padding:6px;border:1px solid #eee;text-align:right">${i.qty || 1}</td></tr>`
    ).join('');

    const html = `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif">
        <h2 style="margin:0 0 8px">New cart selection - ${this.brandName}</h2>
        <p><b>Nombre:</b> ${String(contact.name).replace(/</g, '&lt;')}<br>
           <b>Email:</b> ${String(contact.email).replace(/</g, '&lt;')}<br>
           <b>Tel:</b> ${String(contact.phone || 'No proporcionado').replace(/</g, '&lt;')}</p>
        ${contact.message ? `<p><b>Mensaje:</b><br>${String(contact.message).replace(/</g, '&lt;').replace(/\n/g,'<br>')}</p>` : ''}
        <table style="border-collapse:collapse;margin-top:10px;width:100%">
          <thead>
            <tr style="background-color:#f9fafb">
              <th style="padding:8px;border:1px solid #eee;text-align:left">#</th>
              <th style="padding:8px;border:1px solid #eee;text-align:left">Producto</th>
              <th style="padding:8px;border:1px solid #eee;text-align:left">Espesor</th>
              <th style="padding:8px;border:1px solid #eee;text-align:right">Cantidad</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
        <p style="font-size:12px;color:#6b7280">
          Enviado desde el carrito de ${this.brandName} - ${new Date().toLocaleString('es-ES')}
        </p>
      </div>`;

    try {
      const subject = this.brandConfig.emails.notifications?.['cartShare']?.subject
        || `${this.brandName} | Cart selection`;

      if (this.shouldUseBrevo(settings.emailProvider)) {
        const result = await this.sendViaBrevo({
          to: recipientEmail,
          subject,
          html,
          replyTo: {
            email: String(contact.email || ''),
            name: String(contact.name || contact.email || '')
          }
        });
        console.log('Email sent via Brevo:', result);
        return result;
      }

      // Write to Firestore - the Trigger Email extension will automatically send this
      const docRef = await this.sendViaFirestoreMail(recipientEmail, subject, html);
      console.log('Email queued successfully with ID:', docRef.id, 'to:', recipientEmail);
      return docRef;
    } catch (error: any) {
      console.error('Failed to queue email:', error);
      const message = error?.message || 'Unable to send the email. Please try again later.';
      throw new Error(message);
    }
  }

    async sendContactForm(formData: ContactFormData) {
    // Validate required fields
    if (!formData?.nombre || !formData?.email || !formData?.mensaje) {
      throw new Error('Missing required fields: nombre, email, or mensaje');
    }

    // Get settings with force refresh to ensure we have latest values
    const settings = await this.settingsService.getSettings(true);
    const recipientEmail =
      settings.notificationEmail ||
      settings.contactEmail ||
      this.brandConfig.site.contact.email;
    console.log(`[EmailService] Sending contact form to: ${recipientEmail}`);

    const html = `
      <div style="font-family:Inter,Segoe UI,Arial,sans-serif;color:#111827;line-height:1.6">
        <h2 style="margin:0 0 12px;font-size:20px">New contact request - ${this.brandName}</h2>
        <div style="background-color:#f9fafb;padding:16px;border-radius:8px;margin-bottom:16px">
          <p style="margin:0 0 8px"><b>Name:</b> ${String(formData.nombre).replace(/</g, '&lt;')}</p>
          <p style="margin:0 0 8px"><b>Email:</b> ${String(formData.email).replace(/</g, '&lt;')}</p>
          <p style="margin:0 0 8px"><b>Phone:</b> ${String(formData.telefono || 'Not provided').replace(/</g, '&lt;')}</p>
          ${formData.empresa ? `<p style="margin:0 0 8px"><b>Company:</b> ${String(formData.empresa).replace(/</g, '&lt;')}</p>` : ''}
          ${formData.eventDate ? `<p style="margin:0 0 8px"><b>Event date:</b> ${String(formData.eventDate).replace(/</g, '&lt;')}</p>` : ''}
          ${formData.location ? `<p style="margin:0 0 8px"><b>Location:</b> ${String(formData.location).replace(/</g, '&lt;')}</p>` : ''}
          ${formData.guestCount ? `<p style="margin:0 0 8px"><b>Guest count:</b> ${String(formData.guestCount).replace(/</g, '&lt;')}</p>` : ''}
          ${formData.budget ? `<p style="margin:0 0 8px"><b>Budget:</b> ${String(formData.budget).replace(/</g, '&lt;')}</p>` : ''}
        </div>
        
        <div style="margin:16px 0">
          <h3 style="margin:0 0 8px;color:#374151">Message</h3>
          <div style="background-color:white;padding:16px;border:1px solid #e5e7eb;border-radius:8px">
            ${String(formData.mensaje).replace(/</g, '&lt;').replace(/\n/g,'<br>')}
          </div>
        </div>
        
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb">
        <p style="font-size:12px;color:#6b7280">
          Sent from the contact form on ${this.brandName} - ${new Date().toLocaleString()}
        </p>
      </div>`;

    try {
      const subject = this.brandConfig.emails.notifications?.['contact']?.subject?.replace('{name}', formData.nombre)
        || `${this.brandName} | Contact from ${formData.nombre}`;

      if (this.shouldUseBrevo(settings.emailProvider)) {
        const result = await this.sendViaBrevo({
          to: recipientEmail,
          subject,
          html,
          replyTo: {
            email: String(formData.email || ''),
            name: String(formData.nombre || formData.email || '')
          }
        });
        console.log('Contact email sent via Brevo:', result);
        return result;
      }

      // Write to Firestore - the Trigger Email extension will automatically send this
      const docRef = await this.sendViaFirestoreMail(recipientEmail, subject, html);
      console.log('Contact email queued successfully with ID:', docRef.id, 'to:', recipientEmail);
      return docRef;
    } catch (error: any) {
      console.error('Failed to queue contact email:', error);
      const message = error?.message || 'Unable to send your message right now. Please try again later.';
      throw new Error(message);
    }
  }
  /**
   * Queue a custom email to the mail collection for Trigger Email extension
   */
  async queueEmail(emailData: { to: string; subject: string; html: string }): Promise<{ success: boolean }> {
    try {
      const settings = await this.settingsService.getSettings(true);

      if (this.shouldUseBrevo(settings.emailProvider)) {
        const result = await this.sendViaBrevo({
          to: emailData.to,
          subject: emailData.subject,
          html: emailData.html
        });
        if (!result.success) {
          return { success: false };
        }
        return { success: true };
      }

      const docRef = await this.sendViaFirestoreMail(
        emailData.to,
        emailData.subject,
        emailData.html
      );

      console.log('[EmailService] Email queued successfully with ID:', docRef.id);
      return { success: true };
    } catch (error) {
      console.error('[EmailService] Failed to queue email:', error);
      return { success: false };
    }
  }
}



