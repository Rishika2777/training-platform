import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CardComponent } from '../../../../shared/components/card/card.component';

@Component({
  selector: 'app-admin-company',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './admin-company.component.html',
  styleUrl: './admin-company.component.css',
})
export class AdminCompanyComponent {}


