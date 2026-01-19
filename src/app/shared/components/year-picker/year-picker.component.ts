import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, EventEmitter, HostListener, Input, OnChanges, Output, SimpleChanges, signal, ViewChild } from '@angular/core';

@Component({
  selector: 'app-year-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './year-picker.component.html',
  styleUrl: './year-picker.component.css',
})
export class YearPickerComponent implements OnChanges {
  @Input() value = ''; // YYYY-01-01 format
  @Input() label = '';
  @Input() required = false;
  @Input() invalid = false;
  @Input() disabled = false;
  @Input() min: string | null = null; // YYYY-01-01 format
  @Input() max: string | null = null; // YYYY-01-01 format

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('pickerWrapper', { static: false }) pickerWrapper?: ElementRef<HTMLElement>;

  private static idCounter = 0;
  readonly pickerId = `year-picker-${YearPickerComponent.idCounter++}`;

  readonly isOpen = signal(false);
  readonly currentDecade = signal(this.getInitialDecade());

  get selectedYear(): number | null {
    if (!this.value) return null;
    const match = this.value.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : null;
  }

  readonly minYear = computed(() => {
    if (!this.min) return 1900;
    const match = this.min.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : 1900;
  });

  readonly maxYear = computed(() => {
    if (!this.max) {
      const currentYear = new Date().getFullYear();
      return currentYear + 5;
    }
    const match = this.max.match(/^(\d{4})/);
    return match ? parseInt(match[1], 10) : new Date().getFullYear() + 5;
  });

  get displayValue(): string {
    if (!this.value) return '';
    const match = this.value.match(/^(\d{4})/);
    return match ? match[1] : '';
  }

  readonly yearsInCurrentDecade = computed(() => {
    const decadeStart = Math.floor(this.currentDecade() / 10) * 10;
    const years: number[] = [];
    const min = this.minYear();
    const max = this.maxYear();
    for (let i = 0; i < 12; i++) {
      const year = decadeStart + i;
      if (year >= min && year <= max) {
        years.push(year);
      }
    }
    return years;
  });

  togglePicker(): void {
    if (this.disabled) return;
    this.isOpen.update(open => !open);
  }

  closePicker(): void {
    this.isOpen.set(false);
  }

  selectYear(year: number): void {
    const min = this.minYear();
    const max = this.maxYear();
    if (year < min || year > max) return;
    const dateValue = `${year}-01-01`;
    this.valueChange.emit(dateValue);
    this.closePicker();
  }

  previousDecade(): void {
    const newDecade = this.currentDecade() - 10;
    const min = this.minYear();
    if (newDecade >= min) {
      this.currentDecade.set(newDecade);
    }
  }

  nextDecade(): void {
    const newDecade = this.currentDecade() + 10;
    const max = this.maxYear();
    if (newDecade <= max) {
      this.currentDecade.set(newDecade);
    }
  }

  isYearSelected(year: number): boolean {
    return this.selectedYear === year;
  }

  isYearDisabled(year: number): boolean {
    const min = this.minYear();
    const max = this.maxYear();
    return year < min || year > max;
  }

  getDecadeRange(): string {
    const decadeStart = Math.floor(this.currentDecade() / 10) * 10;
    return `${decadeStart} - ${decadeStart + 11}`;
  }


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && this.selectedYear) {
      const newDecade = Math.floor(this.selectedYear / 10) * 10;
      this.currentDecade.set(newDecade);
    }
  }

  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.pickerWrapper?.nativeElement && !this.pickerWrapper.nativeElement.contains(target) && this.isOpen()) {
      this.closePicker();
    }
  }

  private getInitialDecade(): number {
    if (this.selectedYear) {
      return Math.floor(this.selectedYear / 10) * 10;
    }
    const currentYear = new Date().getFullYear();
    return Math.floor(currentYear / 10) * 10;
  }
}
