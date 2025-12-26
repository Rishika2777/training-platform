import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-data-privacy',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ButtonComponent],
  templateUrl: './data-privacy.component.html',
  styleUrl: './data-privacy.component.css',
})
export class DataPrivacyComponent {
  allowAnalytics = true;

  onAnalyticsChange(): void {
    console.log('Analytics preference changed:', this.allowAnalytics);
    // TODO: Implement API call to update analytics preference
  }

  downloadData(): void {
    // TODO: Implement API call to download user data
    alert('Your data export request has been submitted. You will receive an email with your data shortly.');
  }

  requestDeletion(): void {
    if (confirm('Are you sure you want to request deletion of all your data? This action cannot be undone.')) {
      // TODO: Implement API call to request data deletion
      alert('Your data deletion request has been submitted. Our team will process it within 30 days.');
    }
  }
}
