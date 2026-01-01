# Dropdown Component Usage Guide

The dropdown component now supports both static items (enum) and API-based autocomplete functionality.

## Basic Usage (Static Items - Backward Compatible)

```html
<app-dropdown
  label="Gender"
  [items]="genderItems"
  [value]="selectedGender"
  (valueChange)="onGenderChange($event)"
/>
```

## Autocomplete with Static Items (Filtering)

Enable autocomplete to filter static items as the user types:

```html
<app-dropdown
  label="Skill"
  [items]="skillItems"
  [value]="selectedSkill"
  (valueChange)="onSkillChange($event)"
  [autocomplete]="true"
/>
```

## Autocomplete with API Fetching

For large datasets, use API fetching with debounced search:

### Step 1: Create an API fetch function in your component

```typescript
import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DropdownItem, ApiFetchFunction } from '@shared/components/dropdown/dropdown.component';
import { ApiService } from '@core/api/api.service';

@Component({
  selector: 'app-example',
  template: `
    <app-dropdown
      label="Search Companies"
      [value]="selectedCompany"
      (valueChange)="onCompanyChange($event)"
      [autocomplete]="true"
      [apiFetchFn]="fetchCompanies"
      [debounceTime]="300"
      [minSearchLength]="2"
      placeholder="Type to search companies..."
    />
  `
})
export class ExampleComponent {
  selectedCompany: string | null = null;
  
  constructor(private apiService: ApiService) {}

  // API fetch function
  fetchCompanies: ApiFetchFunction = (searchTerm: string): Observable<DropdownItem[]> => {
    return this.apiService.get<{ companies: Array<{ id: string; name: string }> }>(
      '/api/companies/search',
      { q: searchTerm }
    ).pipe(
      map((response) => 
        response.companies.map((company) => ({
          label: company.name,
          value: company.id
        }))
      )
    );
  };

  onCompanyChange(value: string | null): void {
    this.selectedCompany = value;
  }
}
```

### Step 2: Alternative - Using a service method

```typescript
// In your service
@Injectable({ providedIn: 'root' })
export class CompanyService {
  constructor(private apiService: ApiService) {}

  searchCompanies(searchTerm: string): Observable<DropdownItem[]> {
    return this.apiService.get('/api/companies/search', { q: searchTerm }).pipe(
      map((response: any) => 
        response.data.map((company: any) => ({
          label: company.name,
          value: company.id
        }))
      )
    );
  }
}

// In your component
export class ExampleComponent {
  constructor(private companyService: CompanyService) {}

  fetchCompanies = (searchTerm: string) => {
    return this.companyService.searchCompanies(searchTerm);
  };
}
```

## Input Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `label` | `string` | `''` | Label for the dropdown |
| `placeholder` | `string` | `'Select'` | Placeholder text |
| `items` | `DropdownItem[]` | `[]` | Static items array (used when `autocomplete=false` or for initial filtering) |
| `value` | `TValue \| null` | `null` | Selected value |
| `disabled` | `boolean` | `false` | Disable the dropdown |
| `required` | `boolean` | `false` | Mark as required |
| `invalid` | `boolean` | `false` | Show invalid state |
| `autocomplete` | `boolean` | `false` | Enable autocomplete mode (filtering or API) |
| `apiFetchFn` | `ApiFetchFunction` | `undefined` | Function to fetch items from API |
| `debounceTime` | `number` | `300` | Debounce time in milliseconds for API calls |
| `minSearchLength` | `number` | `0` | Minimum characters before triggering API call |

## Output Events

| Event | Type | Description |
|-------|------|-------------|
| `valueChange` | `EventEmitter<TValue>` | Emitted when a value is selected |

## Features

- ✅ **Backward Compatible**: Existing dropdowns continue to work without changes
- ✅ **Static Items Filtering**: Filter static items as user types
- ✅ **API Integration**: Fetch data from API with debounced search
- ✅ **Loading States**: Shows loading indicator during API calls
- ✅ **Keyboard Support**: Full keyboard navigation (coming soon)
- ✅ **Mobile Responsive**: Works on mobile devices
- ✅ **Clear Button**: Option to clear selection when item is selected
- ✅ **No Results Message**: Shows "No results found" when applicable

## Migration Guide

No migration needed! Existing dropdowns will continue to work. To enable autocomplete:

1. **For static items**: Just add `[autocomplete]="true"`
2. **For API calls**: Add `[autocomplete]="true"` and provide `[apiFetchFn]`

