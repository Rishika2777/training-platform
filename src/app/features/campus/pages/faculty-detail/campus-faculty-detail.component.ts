 import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output , OnInit} from '@angular/core';

export interface FacultyDetailData {
  id?: string; // Faculty ID for delete operation
  name: string;
  imageUrl: string;
  designation: string;
  department: string;
  qualifications: string;
  experience: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-campus-faculty-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './campus-faculty-detail.component.html',
  styleUrl: './campus-faculty-detail.component.css',
})
export class CampusFacultyDetailComponent implements OnInit {
  @Input() faculty: FacultyDetailData | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<string>(); // Emit faculty ID for deletion
@Output() editRequested = new EventEmitter<FacultyDetailData>();

  ngOnInit(): void {
    console.log('CampusFacultyDetailComponent initialized with faculty:', this.faculty);
  }

  closeModal(): void {
    this.closed.emit();
  }

  onEditClick(): void {
  if (this.faculty) {
    this.editRequested.emit(this.faculty);
  }
}

  onDeleteClick(): void {
    if (this.faculty?.id) {
      this.deleteRequested.emit(this.faculty.id);
    }
  }
}

