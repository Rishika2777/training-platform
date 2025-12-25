import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';

export interface NotificationItem {
  id: string;
  userName: string;
  message: string;
  timeLabel: string;
  profileImageUrl: string;
  section: 'new' | 'today';
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

  @Output() closed = new EventEmitter<void>();
  @Output() seePrevious = new EventEmitter<void>();

  get newNotifications(): readonly NotificationItem[] {
    return this.items.filter((item) => item.section === 'new');
  }

  get todayNotifications(): readonly NotificationItem[] {
    return this.items.filter((item) => item.section === 'today');
  }

  close(): void {
    this.closed.emit();
  }

  onSeePrevious(): void {
    this.seePrevious.emit();
  }

  @HostListener('click', ['$event'])
  onClick(event: Event): void {
    event.stopPropagation();
  }
}


