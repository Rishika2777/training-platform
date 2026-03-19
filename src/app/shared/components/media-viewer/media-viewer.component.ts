import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-media-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './media-viewer.component.html',
  styleUrl: './media-viewer.component.css',
})
export class MediaViewerComponent {
  @Input() visible = false;
  @Input() mediaUrl: string | null = null;
  @Input() mediaType: 'image' | 'video' | null = null;

  @Output() closed = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onBackdropClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('media-viewer-backdrop')) {
      this.close();
    }
  }
}
