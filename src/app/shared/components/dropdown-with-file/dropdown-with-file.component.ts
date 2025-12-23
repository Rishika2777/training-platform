import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { DropdownComponent, DropdownItem } from '../dropdown/dropdown.component';

@Component({
  selector: 'app-dropdown-with-file',
  standalone: true,
  imports: [CommonModule, DropdownComponent],
  templateUrl: './dropdown-with-file.component.html',
  styleUrl: './dropdown-with-file.component.css',
})
export class DropdownWithFileComponent<TValue extends string = string> {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  @Input() label = '';
  @Input() placeholder = 'Select';
  @Input() items: readonly DropdownItem<TValue>[] = [];
  @Input() value: TValue | null = null;
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;
  @Input() accept: string | null = null;
  @Input() fileInputId = '';

  @Output() valueChange = new EventEmitter<TValue>();
  @Output() fileSelected = new EventEmitter<File | null>();

  private selectedFile: File | null = null;

  triggerFileSelect(): void {
    if (this.fileInputRef?.nativeElement && !this.disabled) {
      this.fileInputRef.nativeElement.click();
    }
  }

  onDropdownChange(value: TValue): void {
    this.valueChange.emit(value);
  }

  onFileChange(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.selectedFile = file;
    this.fileSelected.emit(file);
  }
}

