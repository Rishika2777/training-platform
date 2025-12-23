import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { CardComponent } from '../../../../shared/components/card/card.component';

@Component({
  selector: 'app-company-about',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './company-about.component.html',
  styleUrl: './company-about.component.css',
})
export class CompanyAboutComponent {}


