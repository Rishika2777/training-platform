import { Injectable, signal } from '@angular/core';

export interface DepartmentDetailData {
  id: string;
  name: string;
  imageUrl: string;
  email?: string;
  phone?: string;
  about?: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentDetailService {

  // =============================
  // SELECTED DEPARTMENT (DETAIL VIEW)
  // =============================
  private readonly selectedDepartmentSignal =
    signal<DepartmentDetailData | null>(null);

  readonly selectedDepartment =
    this.selectedDepartmentSignal.asReadonly();

  setSelectedDepartment(data: DepartmentDetailData): void {
    this.selectedDepartmentSignal.set(data);
  }

  clear(): void {
    this.selectedDepartmentSignal.set(null);
  }


  // =============================
  // EDIT DEPARTMENT (EDIT FLOW)
  // =============================
  private readonly editDepartmentSignal =
    signal<DepartmentDetailData | null>(null);

  readonly editDepartmentData =
    this.editDepartmentSignal.asReadonly();

  setEditingDepartment(dept: DepartmentDetailData): void {
    this.editDepartmentSignal.set(dept);
  }

  clearEditingDepartment(): void {
    this.editDepartmentSignal.set(null);
  }
}
