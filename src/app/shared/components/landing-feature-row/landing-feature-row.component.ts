import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export type LandingFeatureRowDirection = 'normal' | 'reverse';

@Component({
  selector: 'app-landing-feature-row',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './landing-feature-row.component.html',
  styleUrl: './landing-feature-row.component.css',
})
export class LandingFeatureRowComponent {
  @Input() title = '';
  @Input() image = '';
  @Input() cardTitle = '';
  @Input() description = '';
  @Input() direction: LandingFeatureRowDirection = 'normal';

  @Output() readonly previous = new EventEmitter<void>();
  @Output() readonly next = new EventEmitter<void>();
}


