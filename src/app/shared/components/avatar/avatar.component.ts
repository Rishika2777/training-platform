import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.css',
})
export class AvatarComponent {
  @Input() imageUrl: string | null | undefined = null;
  @Input() name = '';
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
  @Input() alt = '';

  readonly imageError = signal(false);
  readonly showInitials = computed(() => !this.imageUrl || this.imageError());

  readonly initials = computed(() => {
    if (!this.name) return '';
    const parts = this.name.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  });

  readonly altText = computed(() => this.alt || this.name || 'Avatar');

  onImageError(): void {
    this.imageError.set(true);
  }

  onImageLoad(): void {
    this.imageError.set(false);
  }
}
