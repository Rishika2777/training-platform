import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { StudentApiService } from '../../services/student-api.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { ApiResponseObject } from '../../models/student.models';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, CardComponent],
  templateUrl: './student-profile.component.html',
  styleUrl: './student-profile.component.css',
})
export class StudentProfileComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly studentApi = inject(StudentApiService);
  private readonly auth = inject(AuthService);

  // Route parameters
  readonly studentId = signal<string | null>(null);
  readonly userId = signal<string | null>(null);
  readonly isStandalone = signal<boolean>(false);

  // Profile data
  readonly profileData = signal<StudentProfileData | null>(null);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    // Extract route parameters
    this.route.paramMap.subscribe((params) => {
      const studentIdFromRoute = params.get('studentId');
      const userIdFromRoute = params.get('userId');

      console.log('📋 Profile Page - Route Params:', {
        studentId: studentIdFromRoute,
        userId: userIdFromRoute,
      });

      // If route params exist, use them (opened from "Get to Know Me")
      if (studentIdFromRoute && userIdFromRoute) {
        this.studentId.set(studentIdFromRoute);
        this.userId.set(userIdFromRoute);
      } else {
        // Fallback: use current user's IDs
        const currentUser = this.auth.getCurrentUser();
        console.log('📋 Profile Page - Using current user:', currentUser);
        
        if (currentUser) {
          this.studentId.set(currentUser.studentId || currentUser.userId?.toString() || null);
          this.userId.set(currentUser.userId?.toString() || null);
        }
      }

      // Load profile data using studentId
      const studentId = this.studentId();
      if (studentId) {
        this.loadStudentProfile(studentId);
      } else {
        console.error('❌ No studentId available to load profile');
        this.error.set('Student ID not found');
      }
    });

    // Check if opened in standalone mode (new tab)
    this.route.queryParamMap.subscribe((queryParams) => {
      const standalone = queryParams.get('standalone');
      this.isStandalone.set(standalone === 'true');
      console.log('📋 Profile Page - Standalone mode:', this.isStandalone());
    });
  }

  /**
   * Load student profile using the studentId from route
   */
  private loadStudentProfile(studentId: string): void {
    console.log('📡 Loading student profile for studentId:', studentId);
    this.loading.set(true);
    this.error.set(null);

    // Get current user for requester info
    const currentUser = this.auth.getCurrentUser();
    const requesterUserId = this.userId() || currentUser?.userId?.toString() || '';
    const requesterUserType = currentUser?.userType || 'STUDENT';

    console.log('📡 Requester info:', { requesterUserId, requesterUserType });

    // Call the correct API method with required parameters
    this.studentApi.getStudentFullProfile(studentId, requesterUserId, requesterUserType).subscribe({
      next: (response: ApiResponseObject) => {
        console.log('✅ Student profile loaded:', response);
        this.loading.set(false);
        
        if (response.success && response.data) {
          this.profileData.set(response.data as StudentProfileData);
        } else {
          this.error.set('Failed to load profile data');
        }
      },
      error: (err: { message?: string }) => {
        console.error('❌ Failed to load student profile:', err);
        this.loading.set(false);
        this.error.set(err.message || 'Failed to load profile');
      },
    });
  }

  /**
   * Reload profile data
   */
  reload(): void {
    const studentId = this.studentId();
    if (studentId) {
      this.loadStudentProfile(studentId);
    }
  }
}

// Define your profile data interface based on your API response
interface StudentProfileData {
  studentId?: string;
  userId?: string;
  email?: string;
  fullName?: string;
  // Add other fields from your API response
  [key: string]: unknown;
}


