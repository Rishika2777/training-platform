import { Injectable, signal } from '@angular/core';
import { FacultyDetailData } from '../pages/faculty-detail/campus-faculty-detail.component';

@Injectable({ providedIn: 'root' })
export class FacultyDetailService {
  private readonly selectedFacultySignal = signal<FacultyDetailData | null>(null);

  readonly selectedFaculty = this.selectedFacultySignal.asReadonly();

  setSelectedFaculty(faculty: FacultyDetailData | null): void {
    this.selectedFacultySignal.set(faculty);
  }

  clearSelectedFaculty(): void {
    this.selectedFacultySignal.set(null);
  }
}

