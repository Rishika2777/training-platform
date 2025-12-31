import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SearchComponent } from '../../shared/components/search/search.component';

@Component({
  selector: 'app-registration-page-layout',
  standalone: true,
  imports: [CommonModule, SearchComponent],
  templateUrl: './registration-page-layout.component.html',
  styleUrl: './registration-page-layout.component.css',
})
export class RegistrationPageLayoutComponent {
  private readonly router = inject(Router);

  @Input() showSearch = false;
  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Search for anything';

  @Output() searchValueChange = new EventEmitter<string>();
  @Output() searched = new EventEmitter<string>();
  @Output() loginClick = new EventEmitter<void>();

  handleSearch(value: string): void {
    this.searchValueChange.emit(value);
  }

  handleSearched(term: string): void {
    this.searched.emit(term);
  }

  onLoginClick(): void {
    this.loginClick.emit();
    void this.router.navigateByUrl('/login');
  }
}

