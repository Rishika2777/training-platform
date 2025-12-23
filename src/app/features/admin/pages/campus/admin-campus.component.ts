import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PaginationComponent } from '../../../../shared/components/pagination/pagination.component';

export interface CampusCard {
  id: string;
  name: string;
  imageUrl: string;
}

@Component({
  selector: 'app-admin-campus',
  standalone: true,
  imports: [CommonModule, ButtonComponent, PaginationComponent],
  templateUrl: './admin-campus.component.html',
  styleUrl: './admin-campus.component.css',
})
export class AdminCampusComponent {
  readonly announcementDate = 'January 7th, 2025';

  readonly campuses: readonly CampusCard[] = [
    { id: '1', name: 'Campus Name', imageUrl: 'assets/images/login-news-image.png' },
    { id: '2', name: 'Campus Name', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '3', name: 'Campus Name', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '4', name: 'Campus Name', imageUrl: 'assets/images/landing-card-institution.png' },
    { id: '5', name: 'Campus Name', imageUrl: 'assets/images/login-hero-image.png' },
    { id: '6', name: 'Campus Name', imageUrl: 'assets/images/login-news-image.png' },
    { id: '7', name: 'Campus Name', imageUrl: 'assets/images/landing-card-campus.png' },
    { id: '8', name: 'Campus Name', imageUrl: 'assets/images/landing-card-company.png' },
    { id: '9', name: 'Campus Name', imageUrl: 'assets/images/landing-card-institution.png' },
  ];

  currentPage = 1;
  readonly itemsPerPage = 9;
  readonly totalPages = 6;

  get displayedCampuses(): readonly CampusCard[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.campuses.slice(start, end);
  }

  onView(campus: CampusCard): void {
    console.log('View campus:', campus);
    // TODO: Implement view action
  }

  onDelete(campus: CampusCard): void {
    console.log('Delete campus:', campus);
    // TODO: Implement delete action
  }

  onPageChange(page: number): void {
    this.currentPage = page;
  }

  onAdd(): void {
    console.log('Add campus');
    // TODO: Implement add action
  }
}
