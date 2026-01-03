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
}

