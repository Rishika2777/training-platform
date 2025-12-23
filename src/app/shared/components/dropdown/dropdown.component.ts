import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface DropdownItem<TValue extends string> {
  label: string;
  value: TValue;
}

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.css',
})
export class DropdownComponent<TValue extends string = string> {
  private static idCounter = 0;
  readonly selectId = `dropdown-select-${DropdownComponent.idCounter++}`;

  @Input() label = '';
  @Input() placeholder = 'Select';
  @Input() items: readonly DropdownItem<TValue>[] = [];
  @Input() value: TValue | null = null;
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;

  @Output() valueChange = new EventEmitter<TValue>();

  getValue(event: Event): string {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return '';
    }
    return target.value;
  }

  onSelect(value: string): void {
    this.valueChange.emit(value as TValue);
  }
}


