import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { CampusApiService, ProspectusData, AddCourseResponseData, GetProspectusResponse } from '../../services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-campus-download-prospectus',
  standalone: true,
  imports: [CommonModule, DropdownComponent],
  templateUrl: './campus-download-prospectus.component.html',
  styleUrl: './campus-download-prospectus.component.css',
})
export class CampusDownloadProspectusComponent implements OnInit {
  private readonly campusApi = inject(CampusApiService);
  private readonly notify = inject(NotificationService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly storage = inject(StorageService);
  private readonly route = inject(ActivatedRoute);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId as object);

  // Course items - loaded from API
  readonly courseItems = signal<readonly DropdownItem[]>([]);
  private loadedCourses = signal<readonly AddCourseResponseData[]>([]);
  readonly loadingCourses = signal(false);

  // Selected course
  readonly selectedCourse = signal<string>('');

  // Prospectus management state
  readonly prospectusList = signal<readonly ProspectusData[]>([]);
  readonly loadingProspectus = signal(false);
  readonly downloadingProspectus = signal(false);

  // Store actual campus ID (for authenticated users) or public campus ID (for public users)
  private campusId: string | null = null;
  private publicCampusId: string | null = null;

  ngOnInit(): void {
    this.loadCampusId();
    // Load courses for both authenticated and public users
    if (this.campusId || this.publicCampusId) {
      this.loadCourses();
    }
  }

  /**
   * Load campus ID from route (for public users) or storage (for authenticated users)
   */
  private loadCampusId(): void {
    if (!this.isBrowser) {
      return;
    }

    // First, try to get public campus ID from route (for public/guest landing page)
    const routePublicCampusId = this.route.snapshot.paramMap.get('publicCampusId');
    if (routePublicCampusId) {
      this.publicCampusId = routePublicCampusId;
      console.log('CampusDownloadProspectusComponent: Public Campus ID loaded from route:', this.publicCampusId);
      return;
    }

    // Try to get campus ID from storage (for authenticated users)
    const storedCampusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID);
    if (storedCampusId) {
      this.campusId = storedCampusId;
      console.log('CampusDownloadProspectusComponent: Campus ID loaded from storage:', this.campusId);
      return;
    }

    // Try to get from user data
    const userData = this.storage.get(STORAGE_KEYS.USER_DATA);
    if (userData?.campusId) {
      this.campusId = userData.campusId;
      console.log('CampusDownloadProspectusComponent: Campus ID loaded from user data:', this.campusId);
      return;
    }

    console.warn('CampusDownloadProspectusComponent: Campus ID not found');
  }

  /**
   * Load courses from API (supports both public and authenticated users)
   */
  loadCourses(): void {
    this.loadingCourses.set(true);
    
    // Use public API if publicCampusId exists, otherwise use authenticated API
    const source$ = this.publicCampusId
      ? this.campusApi.getPublicCampusCourses(this.publicCampusId, 1, 100).pipe(
          map((coursesData: unknown) => {
            // Handle paginated response (might have content array) or direct array
            let coursesArray: unknown[] = [];
            
            if (Array.isArray(coursesData)) {
              coursesArray = coursesData;
            } else if (coursesData && typeof coursesData === 'object') {
              const data = coursesData as Record<string, unknown>;
              // Check if response has content array (paginated response)
              if (Array.isArray(data['content'])) {
                coursesArray = data['content'] as unknown[];
              } else if (Array.isArray(data['data'])) {
                coursesArray = data['data'] as unknown[];
              }
            }
            
            // Map public API response to same format as authenticated API
            return coursesArray.map((course: unknown) => {
              const c = course as Record<string, unknown>;
              return {
                id: (c['id'] || c['courseId'] || '') as string,
                courseName: (c['courseName'] || c['name'] || '') as string,
                availableSeats: (c['availableSeats'] || c['seats'] || 0) as number,
                totalSeats: (c['totalSeats'] || c['seats'] || 0) as number,
                duration: (c['duration'] || 0) as number,
                description: (c['description'] || c['fullName'] || '') as string
              } as AddCourseResponseData;
            });
          }),
          catchError((error) => {
            console.error('CampusDownloadProspectusComponent: Error loading public courses:', error);
            return of([]);
          })
        )
      : this.campusId
        ? this.campusApi.getAllCourses().pipe(
            catchError((error) => {
              console.error('CampusDownloadProspectusComponent: Error loading courses:', error);
              return of([]);
            })
          )
        : of([]);

    source$.subscribe({
      next: (coursesData) => {
        this.loadingCourses.set(false);
        
        if (coursesData && Array.isArray(coursesData) && coursesData.length > 0) {
          this.loadedCourses.set(coursesData);
          
          // Map to dropdown items
          const items: DropdownItem[] = coursesData
            .filter(course => course && course.courseName && course.id)
            .map(course => ({
              label: course.courseName || '',
              value: course.courseName || ''
            }));
          
          this.courseItems.set(items);
          console.log('CampusDownloadProspectusComponent: Courses loaded:', items.length);
        } else {
          console.warn('CampusDownloadProspectusComponent: No courses found');
          this.courseItems.set([]);
        }
      },
      error: (error) => {
        this.loadingCourses.set(false);
        console.error('CampusDownloadProspectusComponent: Error loading courses:', error);
        this.courseItems.set([]);
      }
    });
  }

  /**
   * Handle course selection change
   */
  onCourseSelected(courseName: string): void {
    this.selectedCourse.set(courseName);
    if (courseName.trim()) {
      this.loadProspectusByCourse(courseName);
    } else {
      this.prospectusList.set([]);
    }
  }

  /**
   * Load prospectuses by course name (supports both public and authenticated users)
   */
  loadProspectusByCourse(courseName: string): void {
    // For public users, we need to use publicCampusId, but the API might not support public endpoint
    // For now, we'll use campusId for authenticated users only
    // TODO: Add public API endpoint for prospectus if needed
    if (!this.campusId && !this.publicCampusId) {
      this.notify.error('Campus ID not found');
      return;
    }

    if (!courseName || !courseName.trim()) {
      return;
    }

    // Use campusId for authenticated users (public API for prospectus may not be available)
    const campusIdToUse = this.campusId || this.publicCampusId;
    if (!campusIdToUse) {
      this.notify.error('Campus ID not found');
      return;
    }

    this.loadingProspectus.set(true);
    console.log('CampusDownloadProspectusComponent: Loading prospectuses for course:', courseName, 'campusId:', campusIdToUse);

    this.campusApi.getProspectusByCourse(campusIdToUse, courseName.trim()).subscribe({
      next: (response: GetProspectusResponse | null) => {
        this.loadingProspectus.set(false);
        console.log('CampusDownloadProspectusComponent: getProspectusByCourse response:', response);
        
        // Swagger response: { success: boolean, message: string | null, data: ProspectusData[], error: string | null }
        const items = unwrapApiResponse<ProspectusData[]>(response);
        if (Array.isArray(items)) {
          console.log('CampusDownloadProspectusComponent: Setting prospectus list with', items.length, 'items');
          this.prospectusList.set(items);
        } else {
          console.log('CampusDownloadProspectusComponent: Response data is not an array, setting empty list');
          this.prospectusList.set([]);
        }
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore
        }
      },
      error: (error) => {
        const errorMessage = error?.error?.message || error?.message || 'Failed to fetch prospectus list';
        console.error('CampusDownloadProspectusComponent: getProspectusByCourse error:', error);
        console.error('CampusDownloadProspectusComponent: Error details:', {
          status: error?.status,
          message: error?.message,
          url: error?.url,
          error: error?.error
        });
        this.loadingProspectus.set(false);
        this.prospectusList.set([]);
        this.notify.error(errorMessage);
      }
    });
  }

  /**
   * Download a specific prospectus
   */
  downloadProspectus(prospectus: ProspectusData): void {
    if (!prospectus.id) {
      this.notify.error('Prospectus ID is missing');
      return;
    }

    const campusIdToUse = this.campusId || this.publicCampusId;
    if (!campusIdToUse) {
      this.notify.error('Campus ID not found');
      return;
    }

    const courseName = this.selectedCourse();
    if (!courseName) {
      this.notify.error('Course name is required');
      return;
    }

    this.downloadingProspectus.set(true);
    console.log('CampusDownloadProspectusComponent: Downloading prospectus:', prospectus.id);

    // If prospectus has fileUrls, download directly
    const directFileUrls = prospectus.fileUrls ?? [];
    if (directFileUrls.length > 0) {
      console.log('CampusDownloadProspectusComponent: Using fileUrls from prospectus data:', directFileUrls);
      this.downloadFilesFromUrls(directFileUrls, this.getFileName(prospectus));
      // Set downloading to false after a short delay to allow download to start
      setTimeout(() => {
        this.downloadingProspectus.set(false);
        this.notify.success(`Downloading prospectus${directFileUrls.length > 1 ? ` (${directFileUrls.length} files)` : ''}...`);
      }, 500);
      return;
    }

    // Otherwise, use API download
    console.log('CampusDownloadProspectusComponent: Fetching file URLs from API...');
    this.campusApi.downloadProspectus(campusIdToUse, courseName).subscribe({
      next: (response) => {
        const apiFileUrls = response?.data?.fileUrls ?? [];
        if (response?.success && apiFileUrls.length > 0) {
          console.log('CampusDownloadProspectusComponent: Received file URLs from API:', apiFileUrls);
          const fileName = this.getFileName(prospectus) || `prospectus-${courseName}.pdf`;
          this.downloadFilesFromUrls(apiFileUrls, fileName);
          // Set downloading to false after a short delay to allow download to start
          setTimeout(() => {
            this.downloadingProspectus.set(false);
            this.notify.success(`Prospectus downloaded successfully${apiFileUrls.length > 1 ? ` (${apiFileUrls.length} files)` : ''}`);
          }, 500);
        } else {
          this.downloadingProspectus.set(false);
          console.error('CampusDownloadProspectusComponent: No file URLs in response:', response);
          this.notify.error('No file URL found in response');
        }
      },
      error: (error) => {
        this.downloadingProspectus.set(false);
        console.error('CampusDownloadProspectusComponent: API download error:', error);
        const errorMessage = error?.error?.message || error?.message || 'Failed to download prospectus';
        this.notify.error(errorMessage);
      }
    });
  }

  /**
   * Download files from URLs using blob approach for proper download
   */
  private downloadFilesFromUrls(fileUrls: string[], fileName: string): void {
    if (!this.isBrowser) return;
    
    // Download files sequentially with delay to avoid browser blocking
    fileUrls.forEach((url, index) => {
      setTimeout(() => {
        const downloadFileName = index === 0 ? fileName : `${fileName.replace('.pdf', '')}-${index + 1}.pdf`;
        
        // Check if URL is absolute or relative
        const isAbsoluteUrl = url.startsWith('http://') || url.startsWith('https://');
        const downloadUrl = isAbsoluteUrl ? url : url;
        
        // Use fetch to download as blob for proper file download
        fetch(downloadUrl, {
          method: 'GET',
          headers: {
            // Include auth token if available
            'Authorization': `Bearer ${this.storage.get(STORAGE_KEYS.AUTH_TOKEN) || ''}`,
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
          })
          .then((blob) => {
            // Create blob URL
            const blobUrl = window.URL.createObjectURL(blob);
            
            // Create download link
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = downloadFileName;
            link.style.display = 'none';
            
            // Append to body, click, and remove
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            setTimeout(() => {
              document.body.removeChild(link);
              window.URL.revokeObjectURL(blobUrl);
            }, 100);
          })
          .catch((error) => {
            console.error('CampusDownloadProspectusComponent: Error downloading file via fetch:', error);
            console.log('CampusDownloadProspectusComponent: Falling back to direct link download');
            
            // Fallback to direct link if fetch fails (for CORS issues or direct file URLs)
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = downloadFileName;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            setTimeout(() => {
              document.body.removeChild(link);
            }, 100);
          });
      }, index * 300); // 300ms delay between each file download
    });
  }

  /**
   * Get file name from prospectus data
   * Improved to handle UUIDs and extract proper file names from URLs
   */
  getFileName(prospectus: ProspectusData): string {
    // Try to extract from URL
    if (prospectus.fileUrls && prospectus.fileUrls.length > 0) {
      const url = prospectus.fileUrls[0];
      // Extract file name from URL (remove query parameters if any)
      let fileName = url.split('/').pop() || url;
      // Remove query parameters (everything after ?)
      if (fileName.includes('?')) {
        fileName = fileName.split('?')[0];
      }
      // Decode URL-encoded characters
      try {
        fileName = decodeURIComponent(fileName);
      } catch {
        // If decoding fails, use the original
      }
      
      // Check if the extracted name looks like a UUID (contains hyphens and is long)
      // UUID pattern: 8-4-4-4-12 hex digits with hyphens
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\..+)?$/i;
      if (fileName && uuidRegex.test(fileName)) {
        // This looks like a UUID, return generic name with course name if available
        const courseName = this.selectedCourse();
        if (courseName) {
          return `${courseName.replace(/\s+/g, '-').toLowerCase()}-prospectus.pdf`;
        }
        return 'prospectus.pdf';
      }
      
      // Return the extracted file name if it's valid
      if (fileName && fileName.trim() !== '') {
        return fileName;
      }
    }
    
    // If no fileUrls or extraction failed, return generic name with course name if available
    const courseName = this.selectedCourse();
    if (courseName && prospectus.version) {
      return `${courseName.replace(/\s+/g, '-').toLowerCase()}-v${prospectus.version}.pdf`;
    } else if (courseName) {
      return `${courseName.replace(/\s+/g, '-').toLowerCase()}-prospectus.pdf`;
    } else if (prospectus.version) {
      return `prospectus-v${prospectus.version}.pdf`;
    }
    return 'prospectus.pdf';
  }

  /**
   * Format date for display
   */
  formatDate(dateString?: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Refresh prospectus list
   */
  refreshProspectusList(): void {
    const courseName = this.selectedCourse();
    if (courseName.trim()) {
      this.loadProspectusByCourse(courseName);
    }
  }
}

