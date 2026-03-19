import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

type InputType = 'text' | 'email' | 'password' | 'number' | 'file' | 'url' | 'tel' | 'date' | 'time';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './input.component.html',
  styleUrl: './input.component.css',
})
export class InputComponent implements OnChanges {
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
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() readonly = false;
  @Input() existingFileName: string | undefined; // For displaying existing uploaded file

  @Output() valueChange = new EventEmitter<string>();
  @Output() filesSelected = new EventEmitter<FileList>();

  private static nextId = 0;

  private readonly autoId = `app-input-${InputComponent.nextId++}`;
  selectedFileNames = '';
  passwordVisible = false;

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
    // For number inputs, ensure the value is properly captured
    if (this.type === 'number') {
      // Allow empty string or valid numbers
      if (value === '' || !isNaN(Number(value))) {
        this.valueChange.emit(value);
      }
    } else {
      this.valueChange.emit(value);
    }
  }

  onDateInputClick(event: Event, inputElement: HTMLInputElement): void {
    if (this.type === 'date' && !this.disabled && inputElement) {
      // Use setTimeout to ensure the click event completes and input is focused
      setTimeout(() => {
        // Check if showPicker is supported and available
        if (typeof inputElement.showPicker === 'function') {
          try {
            inputElement.showPicker();
          } catch {
            // showPicker may throw an error if not user-initiated in some browsers
            // In that case, the default click behavior will handle it
          }
        }
      }, 10);
    }
  }

  onFileChange(files: FileList | null): void {
    if (!files || files.length === 0) {
      this.selectedFileNames = '';
      return;
    }
    
    // Extract file names and display them
    const names: string[] = [];
    for (const file of Array.from(files)) {
      if (file && file.name) {
        names.push(file.name);
      }
    }
    this.selectedFileNames = names.join(', ');
    
    this.filesSelected.emit(files);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  get effectiveType(): InputType {
    if (this.type === 'password' && this.passwordVisible) return 'text';
    return this.type;
  }

  getFileDisplayText(): string {
    if (this.selectedFileNames && this.selectedFileNames.trim().length > 0) {
      return this.selectedFileNames;
    }
    // If we have an existing filename or URL (e.g. previously uploaded image), show a clean file name
    if (this.existingFileName && this.existingFileName.trim().length > 0) {
      const raw = this.existingFileName.trim();
      // If it looks like a URL or path, extract the last segment and strip query params
      if (raw.includes('/')) {
        const parts = raw.split('/');
        const last = parts[parts.length - 1] || '';
        const clean = last.split('?')[0];
        if (clean) {
          return clean;
        }
      }
      return raw;
    }
    // Fallback to placeholder text
    return this.placeholder || 'Upload file';
  }

  // Reset file names when input is cleared
  ngOnChanges(changes: SimpleChanges): void {
    if (this.type === 'file') {
      // If value is cleared and no existing file name, reset selectedFileNames
      if (changes['value'] && !this.value) {
        this.selectedFileNames = '';
      }
      // Reset selectedFileNames when existingFileName changes to undefined (edit mode)
      if (changes['existingFileName'] && !this.existingFileName) {
        // Only reset if no files are currently selected
        if (!this.selectedFileNames || this.selectedFileNames.trim().length === 0) {
          this.selectedFileNames = '';
        }
      }
    }
  }
}


