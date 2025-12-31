import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.css',
})
export class TextareaComponent {
  @Input() label = '';
  @Input() placeholder = '';
  @Input() rows = 4;
  @Input() value = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;
  @Input() id: string | null = null;

  @Output() valueChange = new EventEmitter<string>();

  private static nextId = 0;
  private readonly autoId = `app-textarea-${TextareaComponent.nextId++}`;

  get controlId(): string {
    return this.id ?? this.autoId;
  }

  getValue(event: Event): string {
    const target = event.target;
    if (!(target instanceof HTMLTextAreaElement)) {
      return '';
    }
    return target.value;
  }

  onInput(value: string): void {
    this.valueChange.emit(value);
  }
}


