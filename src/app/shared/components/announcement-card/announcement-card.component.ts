import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-announcement-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './announcement-card.component.html',
  styleUrl: './announcement-card.component.css',
})
export class AnnouncementCardComponent {
  @Input() date = '';
  @Input() title = '';
}


