import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

export type CardType = 'student' | 'company' | 'campus';

export interface CardData {
  id: string;
  name: string;
  imageUrl?: string;
  secondaryInfo?: string;
  badge?: string;
  email?: string;
  userId?: string;
}

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './card.component.html',
  styleUrl: './card.component.css',
})
export class CardComponent {
  @Input() type: CardType = 'student';
  @Input() data: CardData | null = null;
  @Output() viewClick = new EventEmitter<CardData>();
  @Output() deleteClick = new EventEmitter<CardData>();

  get displayName(): string {
    return this.data?.name ?? 'Unknown';
  }

  get displaySecondaryInfo(): string {
    return cleanPlaceholderText(this.data?.secondaryInfo);
  }

  get displayEmail(): string {
    return cleanPlaceholderText(this.data?.email);
  }

  get badgeLabel(): string {
    return toHumanBadgeLabel(cleanPlaceholderText(this.data?.badge));
  }

  get badgeClass(): string {
    const raw = (this.data?.badge ?? '').trim().toUpperCase();
    if (raw === 'APPROVED') return 'badge badge--success';
    if (raw === 'REJECTED') return 'badge badge--danger';
    if (raw === 'PENDING_APPROVAL' || raw === 'PENDING') return 'badge badge--warning';
    return 'badge badge--neutral';
  }

  get initials(): string {
    const name = (this.displayName ?? '').trim();
    if (!name) return '?';

    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
    const out = (first + last).toUpperCase();
    return out || '?';
  }

  get avatarBackground(): string {
    const seed = (this.displayName ?? '').trim() || 'unknown';
    const hue = hashToHue(seed);
    return `hsl(${hue} 70% 92%)`;
  }

  get avatarTextColor(): string {
    const seed = (this.displayName ?? '').trim() || 'unknown';
    const hue = hashToHue(seed);
    return `hsl(${hue} 55% 32%)`;
  }

  onView(): void {
    if (this.data) {
      this.viewClick.emit(this.data);
    }
  }

  onDelete(): void {
    if (this.data) {
      this.deleteClick.emit(this.data);
    }
  }
}

function cleanPlaceholderText(value: string | null | undefined): string {
  const cleaned = (value ?? '').trim();
  if (!cleaned) return '';
  // Swagger/OpenAPI placeholder values often come through as "string"
  if (cleaned.toLowerCase() === 'string') return '';
  return cleaned;
}

function toHumanBadgeLabel(value: string): string {
  const cleaned = value.trim();
  if (!cleaned) return '';
  // Convert e.g. PENDING_APPROVAL -> Pending approval
  const words = cleaned.split('_').filter(Boolean);
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function hashToHue(input: string): number {
  // Simple deterministic string hash -> hue [0..359]
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) % 360;
  }
  return Math.abs(hash) % 360;
}
