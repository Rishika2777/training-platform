import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
// import { StudentApiService } from '../../../student/services/student-api.service';
import { map } from 'rxjs/operators';
import { CompanyApiService } from '../../services/company-api.service';



export interface PreferredCampusFormValue {
  photo: File | null;
  campusName: string;
  campusId?: string;
}

interface CampusSearchResponse {
  data?: {
    content?: {
      campusName: string;
      id: string;
    }[];
  };
}



@Component({
  selector: 'app-company-preferred-campus-form',
  standalone: true,
  imports: [CommonModule, ButtonComponent, InputComponent, DropdownComponent],
  templateUrl: './company-preferred-campus-form.component.html',
  styleUrl: './company-preferred-campus-form.component.css',
})
export class CompanyPreferredCampusFormComponent implements OnInit {
  @ViewChild('photoFileInput') photoFileInput!: ElementRef<HTMLInputElement>;

  private readonly cdr = inject(ChangeDetectorRef);
  private readonly companyApi = inject(CompanyApiService);


  @Input() submitting = false;
  @Input() value: PreferredCampusFormValue = {
    photo: null,
    campusName: '',
    campusId: undefined,
  };

  @Output() valueChange = new EventEmitter<PreferredCampusFormValue>();
  @Output() submitted = new EventEmitter<PreferredCampusFormValue>();

  submitAttempted = false;
  campusDropdownItems: DropdownItem[] = [];
  loadingCampuses = false;

  patch(patch: Partial<PreferredCampusFormValue>): void {
    const next: PreferredCampusFormValue = { ...this.value, ...patch };
    this.value = next;
    this.valueChange.emit(next);
  }

  triggerPhotoSelect(): void {
    this.photoFileInput?.nativeElement?.click();
  }

  onPhotoSelected(files: FileList | null): void {
    const file = files && files.length > 0 ? files.item(0) : null;
    this.patch({ photo: file });
  }

  get photoName(): string {
    return this.value.photo?.name ?? '';
  }

  submit(): void {
    console.log('CompanyPreferredCampusFormComponent: submit() called', {
      photo: this.value.photo,
      campusId: this.value.campusId,
      campusName: this.value.campusName,
      isFormValid: this.isFormValid()
    });
    this.submitAttempted = true;
    if (this.isFormValid()) {
      console.log('CompanyPreferredCampusFormComponent: Form is valid, emitting submitted event', this.value);
      this.submitted.emit(this.value);
    } else {
      console.warn('CompanyPreferredCampusFormComponent: Form is invalid, not submitting', {
        hasPhoto: this.value.photo !== null,
        hasCampusId: !!this.value.campusId,
        hasCampusName: this.value.campusName.trim().length > 0
      });
    }
  }

  isFormValid(): boolean {
    return this.value.photo !== null && !!this.value.campusId && this.value.campusName.trim().length > 0;
  }

  onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    console.log('CompanyPreferredCampusFormComponent: onFormSubmit called', event);
    this.submit();
  }

  onButtonClick(event?: MouseEvent): void {
    console.log('CompanyPreferredCampusFormComponent: onButtonClick called', event);
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.submit();
  }

ngOnInit(): void {
  this.loadRegisteredCampuses();
}


fetchCampuses = (term: string) => {
  return this.companyApi.searchCampuses(term).pipe(
    map((res: CampusSearchResponse) =>
      (res.data?.content ?? []).map((c) => ({
        label: c.campusName,
        value: c.id,
      }))
    )
  );
};

private loadRegisteredCampuses(): void {
  this.loadingCampuses = true;

  this.companyApi.searchCampuses('').subscribe({
    next: (response: CampusSearchResponse) => {
      this.loadingCampuses = false;

      const list = response.data?.content ?? [];

      this.campusDropdownItems = list.map((campus) => ({
        label: campus.campusName,
        value: campus.id,
      }));

      this.cdr.detectChanges();
    },
    error: (error: unknown) => {
      console.error('Failed to load campuses:', error);
      this.loadingCampuses = false;
      this.cdr.detectChanges();
    },
  });
}



  onCampusSelected(campusId: string | null): void {
    console.log('CompanyPreferredCampusFormComponent: Campus selected', { campusId, items: this.campusDropdownItems });
    if (!campusId) {
      this.patch({
        campusId: undefined,
        campusName: '',
      });
      return;
    }
    // Find the selected campus to get its name
    const selectedCampus = this.campusDropdownItems.find(item => item.value === campusId);
    const campusName = selectedCampus?.label || '';
    console.log('CompanyPreferredCampusFormComponent: Setting campus name', { campusId, campusName, selectedCampus });
    this.patch({
      campusId: campusId,
      campusName: campusName,
    });
  }
}
