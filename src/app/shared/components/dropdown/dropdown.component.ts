import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Observable, Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, finalize, tap } from 'rxjs/operators';

export interface DropdownItem<TValue extends string = string> {
  label: string;
  value: TValue;
}

// Type for API fetch function
export type ApiFetchFunction<TValue extends string = string> = (searchTerm: string) => Observable<DropdownItem<TValue>[]>;

@Component({
  selector: 'app-dropdown',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dropdown.component.html',
  styleUrl: './dropdown.component.css',
})
export class DropdownComponent<TValue extends string = string> implements OnInit, OnDestroy, OnChanges {
  private static idCounter = 0;
  readonly selectId = `dropdown-select-${DropdownComponent.idCounter++}`;

  @ViewChild('inputElement', { static: false }) inputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownMenu', { static: false }) dropdownMenu?: ElementRef<HTMLDivElement>;

  @Input() label = '';
  @Input() placeholder = 'Select';
  @Input() items: readonly DropdownItem<TValue>[] = [];
  @Input() value: TValue | null = null;
  @Input() disabled = false;
  @Input() required = false;
  @Input() invalid = false;
  
  // Autocomplete features
  @Input() autocomplete = false; // Enable autocomplete mode
  @Input() apiFetchFn?: ApiFetchFunction<TValue>; // Function to fetch data from API
  @Input() debounceTime = 300; // Debounce time in ms for API calls
  @Input() minSearchLength = 0; // Minimum characters before API call (0 = call immediately)
  @Input() allowCustom = false; // Allow free text input (custom values not in the list)

  @Output() valueChange = new EventEmitter<TValue>();

  // Internal state
  searchTerm = '';
  filteredItems: DropdownItem<TValue>[] = [];
  isDropdownOpen = false;
  isLoading = false;
  selectedItem: DropdownItem<TValue> | null = null;

  private searchSubject = new Subject<string>();
  private searchSubscription = this.searchSubject
    .pipe(
      debounceTime(this.debounceTime),
      distinctUntilChanged(),
      tap(() => {
        if (this.apiFetchFn && this.searchTerm.length >= this.minSearchLength) {
          this.isLoading = true;
        }
      }),
      switchMap((term: string) => {
        if (this.apiFetchFn) {
          // API mode
          if (term.length < this.minSearchLength) {
            return of([]);
          }
          return this.apiFetchFn(term).pipe(
            catchError((error) => {
              console.error('Error fetching dropdown items:', error);
              return of([]);
            }),
            finalize(() => {
              this.isLoading = false;
            })
          );
        } else {
          // Static items mode with filtering
          this.isLoading = false;
          return of(this.filterStaticItems(term));
        }
      })
    )
    .subscribe((items) => {
      this.filteredItems = items;
      this.isLoading = false;
    });

  ngOnInit(): void {
    // Initialize with static items if no API function
    if (!this.apiFetchFn) {
      this.filteredItems = this.items.length > 0 ? [...this.items] : [];
    } else {
      this.filteredItems = [];
    }
    
    // Set autocomplete if API function is provided
    if (this.apiFetchFn) {
      this.autocomplete = true;
    }

    // Set initial selected item if value is provided
    this.updateSelectedItem();
    
    // If autocomplete is enabled and we have items, trigger initial load
    if (this.autocomplete && !this.apiFetchFn && this.items.length > 0) {
      this.filteredItems = [...this.items];
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle value changes from parent
    if (changes['value']) {
      this.updateSelectedItem();
    }
    
    // Handle items changes
    if (changes['items'] && !this.apiFetchFn) {
      // Always update filtered items when items change, regardless of dropdown state
      if (this.items.length > 0) {
        // If we have a search term, filter the items; otherwise show all
        if (this.autocomplete && this.searchTerm && this.searchTerm.trim() !== '') {
          this.filteredItems = this.filterStaticItems(this.searchTerm);
        } else {
          this.filteredItems = [...this.items];
        }
      } else {
        this.filteredItems = [];
      }
      
      this.updateSelectedItem();
      
      console.log('DropdownComponent: Items changed, filteredItems updated:', {
        itemsCount: this.items.length,
        filteredCount: this.filteredItems.length,
        isDropdownOpen: this.isDropdownOpen,
        searchTerm: this.searchTerm
      });
    }
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
    this.searchSubject.complete();
  }

  updateSelectedItem(): void {
    if (this.value) {
      // Find in static items first
      const found = this.items.find((item) => item.value === this.value);
      if (found) {
        this.selectedItem = found;
        this.searchTerm = found.label;
        return;
      }
      
      // If not found in static items and we have filtered items, check there
      const foundInFiltered = this.filteredItems.find((item) => item.value === this.value);
      if (foundInFiltered) {
        this.selectedItem = foundInFiltered;
        this.searchTerm = foundInFiltered.label;
      }
    } else {
      this.selectedItem = null;
      this.searchTerm = '';
    }
  }

  filterStaticItems(searchTerm: string): DropdownItem<TValue>[] {
    if (!searchTerm || searchTerm.trim() === '') {
      return [...this.items];
    }
    const term = searchTerm.toLowerCase().trim();
    return this.items.filter((item) => item.label.toLowerCase().includes(term));
  }

  onInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const newSearchTerm = target.value;
    this.searchTerm = newSearchTerm;
    
    // If autocomplete is enabled
    if (this.autocomplete) {
      this.isDropdownOpen = true;
      this.selectedItem = null; // Clear selection when typing
      
      if (this.apiFetchFn) {
        // Trigger API call via subject
        this.searchSubject.next(newSearchTerm);
      } else {
        // Filter static items
        this.filteredItems = this.filterStaticItems(newSearchTerm);
      }
    }
  }

  onInputFocus(): void {
    if (this.disabled) return;
    
    if (this.autocomplete) {
      this.isDropdownOpen = true;
      // For static items mode, always show all items when dropdown opens
      if (!this.apiFetchFn) {
        // Always refresh filtered items on focus when items are available
        // Show all items when dropdown opens, user can then filter by typing
        if (this.items.length > 0) {
          this.filteredItems = [...this.items];
          // Trigger search with empty term to show all items
          this.searchSubject.next('');
        } else {
          // If items are empty, clear filtered items to avoid showing stale data
          this.filteredItems = [];
        }
      } else if (this.apiFetchFn !== undefined && !this.searchTerm && this.minSearchLength === 0) {
        // Trigger initial API call if minSearchLength is 0
        this.searchSubject.next('');
      }
    } else {
      // Non-autocomplete mode: open dropdown (for mobile compatibility)
      this.isDropdownOpen = true;
    }
  }

  onInputBlur(event: FocusEvent): void {
    // Delay to allow click events to fire
    setTimeout(() => {
      // Check if the new focus target is within the dropdown
      const relatedTarget = event.relatedTarget as HTMLElement;
      if (this.dropdownMenu?.nativeElement?.contains(relatedTarget)) {
        return;
      }
      
      // If allowCustom is enabled and user typed a value that's not in the list, emit it
      this.handleCustomValue();
      
      this.isDropdownOpen = false;
    }, 200);
  }

  onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    // If Enter is pressed and we have a search term, handle it
    if (this.searchTerm && this.searchTerm.trim().length > 0) {
      // If there's exactly one filtered item, select it
      if (this.filteredItems.length === 1) {
        keyboardEvent.preventDefault();
        this.selectItem(this.filteredItems[0]);
        return;
      }
      
      // If allowCustom is enabled and no item is selected, emit the custom value
      if (this.allowCustom && !this.selectedItem) {
        keyboardEvent.preventDefault();
        this.handleCustomValue();
      }
    }
  }

  private handleCustomValue(): void {
    // If allowCustom is enabled and user typed a value that's not in the list, emit it
    if (this.allowCustom && this.autocomplete && this.searchTerm && this.searchTerm.trim().length > 0) {
      const trimmedSearchTerm = this.searchTerm.trim();
      // Check if the typed value matches any item
      const matchesItem = this.items.some(item => 
        item.value.toLowerCase() === trimmedSearchTerm.toLowerCase() ||
        item.label.toLowerCase() === trimmedSearchTerm.toLowerCase()
      );
      
      // Also check filtered items
      const matchesFilteredItem = this.filteredItems.some(item => 
        item.value.toLowerCase() === trimmedSearchTerm.toLowerCase() ||
        item.label.toLowerCase() === trimmedSearchTerm.toLowerCase()
      );
      
      // If it doesn't match any item and we have a valid search term, emit it as a custom value
      if (!matchesItem && !matchesFilteredItem && !this.selectedItem) {
        this.value = trimmedSearchTerm as TValue;
        this.valueChange.emit(trimmedSearchTerm as TValue);
      }
    }
  }

  selectItem(item: DropdownItem<TValue>): void {
    this.selectedItem = item;
    this.searchTerm = item.label;
    this.value = item.value;
    this.isDropdownOpen = false;
    this.valueChange.emit(item.value);
    
    // Update filtered items to include selected item if not already present
    if (this.autocomplete && !this.filteredItems.find((i) => i.value === item.value)) {
      this.filteredItems = [item, ...this.filteredItems];
    }
  }

  clearSelection(): void {
    this.selectedItem = null;
    this.searchTerm = '';
    this.value = null;
    this.isDropdownOpen = false;
    this.valueChange.emit(null as unknown as TValue);
    this.filteredItems = this.apiFetchFn ? [] : [...this.items];
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      this.inputElement?.nativeElement &&
      this.dropdownMenu?.nativeElement &&
      !this.inputElement.nativeElement.contains(target) &&
      !this.dropdownMenu.nativeElement.contains(target)
    ) {
      this.isDropdownOpen = false;
    }
  }

  // Legacy support for non-autocomplete mode (select element)
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
