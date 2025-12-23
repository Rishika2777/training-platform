import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

type InputType = 'text' | 'email' | 'password' | 'number' | 'file' | 'url' | 'tel' | 'date';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
})
export class InputComponent {
  @Input() label = '';
  @Input() type: InputType = 'text';
  @Input() placeholder = '';
  @Input() accept: string | null = null;
  @Input() value = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;
  @Input() id: string | null = null;
  @Input() maxlength: number | null = null;

  @Output() valueChange = new EventEmitter<string>();
  @Output() filesSelected = new EventEmitter<FileList>();

  private static nextId = 0;

  private readonly autoId = `app-input-${InputComponent.nextId++}`;

  get controlId(): string {
    return this.id ?? this.autoId;
  }

  getValue(event: Event): string {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return '';
    }
    return target.value;
  }

  getFiles(event: Event): FileList | null {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return null;
    }
    return target.files;
  }

  onInput(value: string): void {
    this.valueChange.emit(value);
  }

  onFileChange(files: FileList | null): void {
    if (!files) {
      return;
    }
    this.filesSelected.emit(files);
  }
}


