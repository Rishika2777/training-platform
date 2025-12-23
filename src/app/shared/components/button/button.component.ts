import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type ButtonVariant = 'primary' | 'secondary' | 'outline';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input({ required: true }) label!: string;
  @Input() type: 'button' | 'submit' = 'button';
  @Input() disabled = false;
  @Input() variant: ButtonVariant = 'outline';

  // Allow consumers to use `(buttonClick)="..."` on `<app-button>`.
  // We re-emit the inner button click event.
  @Output() readonly buttonClick = new EventEmitter<MouseEvent>();
}


