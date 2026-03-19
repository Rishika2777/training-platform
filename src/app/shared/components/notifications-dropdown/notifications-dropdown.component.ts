import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface NotificationItem {
  id: string;
  userName: string;
  message: string;
  timeLabel: string;
  profileImageUrl: string;
  section: 'new' | 'today';
  /** Actor (e.g. "Aayushi") – link to their public profile */
  actorPublicPageUrl?: string;
  /** Target (e.g. "Mansi", "VIT", "XYZ Company") – link to their public profile */
  targetDisplayName?: string;
  targetPublicPageUrl?: string;
}

@Component({
  selector: 'app-notifications-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-dropdown.component.html',
  styleUrl: './notifications-dropdown.component.css',
})
export class NotificationsDropdownComponent {
  @Input() isOpen = false;
  @Input() items: readonly NotificationItem[] = [];
  @Input() loading = false;
  @Input() hasMorePages = false;

  @Output() closed = new EventEmitter<void>();
  @Output() loadMore = new EventEmitter<void>();

  close(): void {
    this.closed.emit();
  }

  onLoadMore(): void {
    this.loadMore.emit();
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.stopPropagation();
  }
}


