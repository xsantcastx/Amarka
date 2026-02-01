import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SectionTitleComponent } from '../../../shared/components/section-title/section-title';
import { EmailService } from '../../../services/email.service';
import { BrandConfigService } from '../../../core/services/brand-config.service';

@Component({
  selector: 'app-contacto',
  standalone: true,
  imports: [CommonModule, SectionTitleComponent, ReactiveFormsModule],
  templateUrl: './contacto.html',
  styleUrl: './contacto.scss'
})
export class ContactoComponent {
  private readonly fb = inject(FormBuilder);
  private readonly emailService = inject(EmailService);
  private readonly brandConfig = inject(BrandConfigService);

  enviado = false;
  readonly contactEmail = this.brandConfig.site.contact.email;
  readonly contactAddress = this.brandConfig.site.contact.address;
  readonly brandName = this.brandConfig.siteName;

  readonly formulario = this.fb.group({
    nombre: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    telefono: ['', Validators.required],
    empresa: [''],
    mensaje: ['', Validators.required]
  });

  async enviar(): Promise<void> {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const datos = this.formulario.getRawValue();
    const contactData = {
      nombre: datos.nombre ?? '',
      email: datos.email ?? '',
      telefono: datos.telefono ?? '',
      empresa: datos.empresa ?? undefined,
      mensaje: datos.mensaje ?? '',
      aceptarPrivacidad: true // Since this is an older component, auto-accept
    };

    try {
      await this.emailService.sendContactForm(contactData);
      this.enviado = true;
      this.formulario.reset();
    } catch (error) {
      void 0;
      // Could add error handling UI here
    }
  }
}
