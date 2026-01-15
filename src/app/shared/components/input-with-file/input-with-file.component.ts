import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { InputComponent } from '../input/input.component';

@Component({
  selector: 'app-input-with-file',
  standalone: true,
  imports: [CommonModule, InputComponent],
  templateUrl: './input-with-file.component.html',
  styleUrl: './input-with-file.component.css',
})
export class InputWithFileComponent {
  @ViewChild('fileInput', { read: ElementRef }) fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() label = '';
  @Input() value = '';
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;
  @Input() accept: string | null = null;
  @Input() fileInputId = '';
  @Input() readonly = false;

  @Output() valueChange = new EventEmitter<string>();
  @Output() fileSelected = new EventEmitter<File | null>();

  private selectedFile: File | null = null;

  triggerFileSelect(): void {
    if (this.fileInputRef?.nativeElement && !this.disabled) {
      this.fileInputRef.nativeElement.click();
    }
  }

  onTextChange(value: string): void {
    this.valueChange.emit(value);
  }

  onFileChange(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.selectedFile = file;
    this.fileSelected.emit(file);
  }

  get fileName(): string {
    return this.selectedFile?.name ?? '';
  }

  get displayValue(): string {
    // If file is selected, show file name, otherwise show the value (campus ID or text)
    return this.selectedFile?.name ?? this.value;
  }

  /**
   * Clear the selected file and reset the component
   */
  clearFile(): void {
    console.log('InputWithFileComponent: clearFile() called, current value:', this.value, 'selectedFile:', this.selectedFile?.name);
    
    // STEP 1: Remember if we had a selected file before clearing
    const hadSelectedFile = this.selectedFile !== null;
    
    // STEP 2: Clear the selected file FIRST
    this.selectedFile = null;
    
    // STEP 3: Clear the file input element
    if (this.fileInputRef?.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
    }
    
    // STEP 4: Clear the value if it looks like a file name (contains extension)
    // File names typically have extensions like .jpg, .pdf, etc.
    // OR if we had a selected file, clear the value to ensure it's reset
    if (this.value && this.value.trim().length > 0) {
      // Check if it's a file name (has extension) - this is the main case
      // OR if we had a selected file, clear it anyway to ensure reset
      if (/\.\w+$/.test(this.value.trim()) || hadSelectedFile) {
        console.log('InputWithFileComponent: Clearing file name from value:', this.value);
        this.value = '';
        this.valueChange.emit('');
      }
    }
    
    // STEP 5: Emit null to clear file selection
    this.fileSelected.emit(null);
    
    console.log('InputWithFileComponent: clearFile() completed, value:', this.value, 'displayValue:', this.displayValue);
  }
}

