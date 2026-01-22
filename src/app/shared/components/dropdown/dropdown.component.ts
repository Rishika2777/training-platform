import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, HostListener, ChangeDetectorRef, inject, AfterViewChecked } from '@angular/core';
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
export class DropdownComponent<TValue extends string = string> implements OnInit, OnDestroy, OnChanges, AfterViewChecked {
  private static idCounter = 0;
  readonly selectId = `dropdown-select-${DropdownComponent.idCounter++}`;

  @ViewChild('inputElement', { static: false }) inputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('dropdownMenu', { static: false }) dropdownMenu?: ElementRef<HTMLDivElement>;

  @Input() label = '';
  @Input() placeholder = 'Select';
  @Input() items: readonly DropdownItem<TValue>[] = [];
  @Input() value: TValue | null = null;
  @Input() displayText = ''; // Custom display text when value doesn't exist in items
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

  private readonly cdr = inject(ChangeDetectorRef);

  private searchSubject = new Subject<string>();
  private searchSubscription = this.searchSubject
    .pipe(
      debounceTime(this.debounceTime),
      distinctUntilChanged(),
      tap((term: string) => {
        // Set loading state when API function is available and term meets minSearchLength
        if (this.apiFetchFn && term.length >= this.minSearchLength) {
          this.isLoading = true;
          this.cdr.detectChanges();
        }
      }),
      switchMap((term: string) => {
        if (this.apiFetchFn) {
          // API mode
          if (term.length < this.minSearchLength) {
            this.isLoading = false;
            return of([]);
          }
          return this.apiFetchFn(term).pipe(
            catchError((error) => {
              console.error('Error fetching dropdown items:', error);
              this.isLoading = false;
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
      // Ensure dropdown stays open when items are loaded
      if (items.length > 0 && this.autocomplete) {
        this.isDropdownOpen = true;
      }
      
      // Force change detection to update the view
      this.cdr.detectChanges();
      
      // Position dropdown if it's open
      if (this.isDropdownOpen) {
        setTimeout(() => this.positionDropdownMenu(), 0);
      }
    });

  ngOnInit(): void {
    // Reset loading state on initialization to prevent stuck state
    this.isLoading = false;
    
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
    // Handle value or displayText changes from parent
    if (changes['value'] || changes['displayText']) {
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
    }
  }

  ngOnDestroy(): void {
    this.searchSubscription.unsubscribe();
    this.searchSubject.complete();
  }

  ngAfterViewChecked(): void {
    // Position dropdown menu if it's open and using fixed positioning (inside modal)
    if (this.isDropdownOpen && this.dropdownMenu?.nativeElement && this.inputElement?.nativeElement) {
      this.positionDropdownMenu();
    }
  }

  private positionDropdownMenu(): void {
    if (!this.dropdownMenu?.nativeElement || !this.inputElement?.nativeElement) {
      return;
    }

    const menu = this.dropdownMenu.nativeElement;
    const input = this.inputElement.nativeElement;
    
    // Check if dropdown is inside a modal (has fixed positioning)
    if (window.getComputedStyle(menu).position === 'fixed') {
      const inputRect = input.getBoundingClientRect();
      menu.style.top = `${inputRect.bottom + 4}px`;
      menu.style.left = `${inputRect.left}px`;
      menu.style.width = `${inputRect.width}px`;
      menu.style.right = 'auto';
    }
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
        return;
      }
      
      // If not found in items but we have displayText, use it
      if (this.displayText) {
        this.selectedItem = { label: this.displayText, value: this.value };
        this.searchTerm = this.displayText;
        return;
      }
      
      // Value exists but not found in items and no displayText
      this.selectedItem = null;
      this.searchTerm = '';
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
      setTimeout(() => this.positionDropdownMenu(), 0);
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
      } else if (this.apiFetchFn !== undefined) {
        // API fetch mode
        const currentTerm = this.searchTerm || '';
        
        // If we already have filtered items, show them immediately without API call
        // This works whether we have a value or not (e.g., after clearing selection)
        if (this.filteredItems.length > 0) {
          // Just show the dropdown with existing items, don't trigger new API call
          return;
        }
        
        // If minSearchLength is 0, trigger API call immediately (even with empty term)
        // This loads initial data when user focuses on the field
        if (this.minSearchLength === 0) {
          // Only trigger API call if we don't have items already
          if (this.filteredItems.length === 0) {
            // Set loading state immediately to show loading indicator
            this.isLoading = true;
            
            // Ensure searchTerm is set for the loading indicator
            if (!this.searchTerm) {
              this.searchTerm = '';
            }
            
            // Trigger API call via subject
            this.searchSubject.next(currentTerm);
          }
        } else if (currentTerm.length >= this.minSearchLength) {
          // If we have a search term that meets minSearchLength, trigger API
          this.isLoading = true;
          this.searchSubject.next(currentTerm);
        } else {
          // If minSearchLength > 0 and no valid search term, don't trigger API yet
          this.filteredItems = [];
        }
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
      
      // Reset loading state when input loses focus (e.g., when modal closes)
      // This prevents stuck loading state when modal reopens
      const wasLoading = this.isLoading;
      if (wasLoading) {
        this.isLoading = false;
      }
      
      // If we were loading, don't close the dropdown yet - wait for data to arrive
      if (wasLoading) {
        // Set up a check to close after loading completes
        const checkInterval = setInterval(() => {
          if (!this.isLoading) {
            clearInterval(checkInterval);
            // Only close if user hasn't refocused
            if (document.activeElement !== this.inputElement?.nativeElement) {
              this.handleCustomValue();
              this.isDropdownOpen = false;
            }
          }
        }, 100);
        // Clear interval after 5 seconds max to avoid infinite loop
        setTimeout(() => clearInterval(checkInterval), 5000);
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
    // Don't clear filteredItems in API mode - keep them so they can be shown again on focus
    // Only clear for static items mode if needed
    if (!this.apiFetchFn) {
      this.filteredItems = [...this.items];
    }
    // For API mode, keep filteredItems so they're available when user focuses again
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
