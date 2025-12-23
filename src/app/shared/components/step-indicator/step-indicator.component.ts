import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-step-indicator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-indicator.component.html',
  styleUrl: './step-indicator.component.css',
})
export class StepIndicatorComponent {
  @Input() steps: readonly string[] = [];
  @Input() currentStep = 1;
  @Input() disabled = false;
}


