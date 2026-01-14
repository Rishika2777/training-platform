import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { DropdownComponent, DropdownItem } from '../../../../shared/components/dropdown/dropdown.component';
import { CampusApiService, ProspectusData, AddCourseResponseData, GetProspectusResponse } from '../../services/campus-api.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';

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

  // Store actual campus ID
  private campusId: string | null = null;

  ngOnInit(): void {
    this.loadCampusId();
    this.loadCourses();
  }

  /**
   * Load campus ID from storage
   */
  private loadCampusId(): void {
    if (!this.isBrowser) {
      return;
    }

    // Try to get campus ID from storage
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
   * Load courses from API
   */
  loadCourses(): void {
    this.loadingCourses.set(true);
    
    this.campusApi.getAllCourses().subscribe({
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
   * Load prospectuses by course name
   */
  loadProspectusByCourse(courseName: string): void {
    if (!this.campusId) {
      this.notify.error('Campus ID not found');
      return;
    }

    if (!courseName || !courseName.trim()) {
      return;
    }

    this.loadingProspectus.set(true);
    console.log('CampusDownloadProspectusComponent: Loading prospectuses for course:', courseName, 'campusId:', this.campusId);

    this.campusApi.getProspectusByCourse(this.campusId, courseName.trim()).subscribe({
      next: (response: GetProspectusResponse | null) => {
        this.loadingProspectus.set(false);
        console.log('CampusDownloadProspectusComponent: getProspectusByCourse response:', response);
        
        // Swagger response: { success: boolean, message: string | null, data: ProspectusData[], error: string | null }
        if (response && Array.isArray(response.data)) {
          console.log('CampusDownloadProspectusComponent: Setting prospectus list with', response.data.length, 'items');
          this.prospectusList.set(response.data);
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

    if (!this.campusId) {
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
    this.campusApi.downloadProspectus(this.campusId, courseName).subscribe({
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
   */
  getFileName(prospectus: ProspectusData): string {
    if (prospectus.fileUrls && prospectus.fileUrls.length > 0) {
      const url = prospectus.fileUrls[0];
      const fileName = url.split('/').pop() || '';
      return fileName || `prospectus-${prospectus.version || 'v1'}.pdf`;
    }
    return `prospectus-${prospectus.version || 'v1'}.pdf`;
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

