import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-file-dropzone',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './file-dropzone.component.html',
  styleUrl: './file-dropzone.component.scss'
})
export class FileDropzoneComponent {
  @Input() accept = '.pdf,.ai,.dwg,.jpg,.jpeg,.png';
  @Input() helper = 'PDF, AI, DWG, JPG up to 20MB';
  @Input() files: File[] = [];
  @Input() progress = 0;
  @Output() filesChange = new EventEmitter<File[]>();

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const nextFiles = Array.from(input.files || []);
    this.filesChange.emit(nextFiles);
  }

  removeFile(index: number) {
    const next = [...this.files];
    next.splice(index, 1);
    this.filesChange.emit(next);
  }
}
