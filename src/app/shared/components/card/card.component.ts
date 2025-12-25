import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';

export type CardType = 'student' | 'company' | 'campus';

export interface CardData {
  id: string;
  name: string;
  imageUrl?: string;
  secondaryInfo?: string;
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

  get displayImage(): string {
    if (this.data?.imageUrl) {
      return this.data.imageUrl;
    }
    // Fallback images based on type
    if (this.type === 'student') {
      return 'assets/images/login-news-image.png';
    }
    if (this.type === 'company') {
      return 'assets/images/landing-card-company.png';
    }
    return 'assets/images/landing-card-campus.png';
  }

  get displaySecondaryInfo(): string {
    return this.data?.secondaryInfo ?? 'N/A';
  }

  get displayEmail(): string {
    return this.data?.email ?? '';
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
