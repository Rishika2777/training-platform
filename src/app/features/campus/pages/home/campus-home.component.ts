import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AfterViewInit, ChangeDetectorRef, Component, computed, effect, ElementRef, inject, NgZone, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { CarouselComponent } from '../../../../shared/components/carousel/carousel.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { DropdownComponent } from '../../../../shared/components/dropdown/dropdown.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CampusProspectusComponent, ProspectusUploadFormValue } from '../upload-prospectus/campus-prospectus.component';
import {
  CampusCompaniesVisitedComponent,
  CompaniesVisitedFormValue,
} from '../companies-visited/campus-companies-visited.component';
import { CampusPlacedStudentsComponent, PlacedStudentsFormValue } from '../placed-students/campus-placed-students.component';
import { CampusCoursesComponent } from '../courses/campus-courses.component';
import { CampusFacultyComponent, FacultyFormValue } from '../faculty/campus-faculty.component';
import { CampusCourseFormComponent, CourseFormValue } from '../course-form/course-form.component';
import { CampusFacultyDetailComponent, FacultyDetailData } from '../faculty-detail/campus-faculty-detail.component';
import { DepartmentDetailComponent } from '../department-detail/department-detail.component';
import { AddDepartmentComponent, DepartmentFormValue } from '../department/add-department.component';
import { CreatePostComponent } from '../../../../shared/components/create-post/create-post.component';
import type { CreatePostSubmitPayload } from '../../../../shared/components/create-post/create-post.component';
import { ModalService } from '../../../../core/modal/modal.service';
import { NotificationService } from '../../../../core/notifications/notification.service';
import { CampusApiService, BatchesResponse, StudentsByBatchResponse, StudentByBatchData, AlumniDashboardResponse, AlumniDashboardData, AnnouncementItem, CompanyVisitedItem,DepartmentItem,DepartmentDropdownItem,DepartmentDetailItem } from '../../services/campus-api.service';
import { FacultyDetailService } from '../../services/faculty-detail.service';
import { StudentApiService } from '../../../student/services/student-api.service';
import { AlumniResponse, PlacedStudentResponse } from '../../../student/models/student.models';
import { AuthStateService } from '../../../../core/auth/auth-state.service';
import { StorageService } from '../../../../core/storage/storage.service';
import { RoleService } from '../../../../core/rbac/role.service';
import { STORAGE_KEYS } from '../../../../core/config/app.constants';
import { unwrapApiResponse } from '../../../../core/api/api-response.utils';
import { catchError, of } from 'rxjs';
import { map, finalize, switchMap } from 'rxjs/operators';
import { CampusSessionService } from '../../services/campus-session.service';
import { CommonApiService } from '../../../../core/services/common-api.service';
import { MediaViewerComponent } from '../../../../shared/components/media-viewer/media-viewer.component';
import {
  AnnouncementCarouselComponent,
  AnnouncementCarouselItem,
} from '../../../../shared/components/announcement-carousel/announcement-carousel.component';
import { Router } from '@angular/router';
import type { Post } from '../../../../core/models/common-api.model';
import { EditPostStateService } from '../../../../core/services/edit-post-state.service';
import { NewsResponse } from '../../services/campus-api.service';
import type { NoticeDetailData } from '../notice-detail/campus-notice-detail.component';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-campus-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CarouselComponent,
    ModalComponent,
    DropdownComponent,
    ButtonComponent,
    CampusProspectusComponent,
    CampusCompaniesVisitedComponent,
    CampusPlacedStudentsComponent,
    CampusCoursesComponent,
    CampusFacultyComponent,
    CampusCourseFormComponent,
    CampusFacultyDetailComponent,
    DepartmentDetailComponent,
    AddDepartmentComponent,
    CreatePostComponent,
    MediaViewerComponent,
    AnnouncementCarouselComponent,
    RelativeTimePipe,
  ],
  templateUrl: './campus-home.component.html',
  styleUrl: './campus-home.component.css',
})
export class CampusHomeComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly modalService = inject(ModalService);
  private readonly campusApi = inject(CampusApiService);

readonly isNewsDetailModalOpen = computed(
  () => this.activeModal() === 'news-detail'
);
readonly REPORT_MAX_LENGTH = 300;

readonly isEditFacultyMode = signal(false);
readonly facultyToEdit = signal<FacultyFormValue | null>(null);
readonly facultyFormValue = signal<FacultyFormValue | null>(null);
editingFacultyId: string | null = null;

getDefaultFacultyFormValue(): FacultyFormValue {
  return {
    fullName: '',
    photo: null,
    email: '',
    dateOfBirth: '',
    phoneNumber: '',
    professionalInfo: [{ designation: '', department: '', specialization: null, yearsOfExperience: '', qualifications: '', certificates: null }],
  };
}
selectedDepartmentIdForCourses: string | null = null;

private refreshNoticeListInstant(): void {
  this.noticePage = 0;

  // force reset first
  this.notices.set([]);

  // next tick load
  queueMicrotask(() => {
    this.loadNotices();
  });
}

  @ViewChild(CampusProspectusComponent) prospectusComponent!: CampusProspectusComponent;
  @ViewChild(CampusPlacedStudentsComponent) placedStudentsComponent!: CampusPlacedStudentsComponent;
  @ViewChild(CampusCompaniesVisitedComponent) companiesVisitedComponent!: CampusCompaniesVisitedComponent;
  @ViewChild(CampusCourseFormComponent) courseFormComponent!: CampusCourseFormComponent;
  @ViewChild(CampusCoursesComponent) coursesComponent!: CampusCoursesComponent;
  private readonly studentApiService = inject(StudentApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly notify = inject(NotificationService);
  private readonly facultyDetailService = inject(FacultyDetailService);
  private readonly authState = inject(AuthStateService);
  private readonly storage = inject(StorageService);
  private readonly campusSessionService = inject(CampusSessionService);
  private readonly roleService = inject(RoleService);
  private readonly commonApi = inject(CommonApiService);
  readonly editPostState = inject(EditPostStateService);
  private resetNoticeForm(): void {
     this.noticeTitle = ''; 
  this.noticeMessage = '';
  this.editingNoticeId = null;
  this.isEditMode = false;
}
private readonly router = inject(Router);

readonly isDepartmentUser = this.roleService.getUserType() === 'DEPARTMENT';

  readonly newsList = signal<NewsResponse[]>([]);
readonly loadingNews = signal(false);

  readonly activeModal = computed(() => this.modalService.activeModal());
  readonly isProspectusModalOpen = computed(() => this.activeModal() === 'prospectus-upload');
  readonly isCompaniesModalOpen = computed(() => this.activeModal() === 'companies-visited');
  
  readonly isPlacedStudentsModalOpen = computed(() => this.activeModal() === 'placed-students');
  readonly isCoursesModalOpen = computed(() => this.activeModal() === 'courses');
  readonly isFacultyModalOpen = computed(() => this.activeModal() === 'faculty');
  readonly isFacultyDetailModalOpen = computed(() => this.activeModal() === 'faculty-detail');
  readonly isCourseFormModalOpen = computed(() => this.activeModal() === 'course-form');
  readonly isAddDepartmentModalOpen = computed(() => this.activeModal() === 'add-department');
  readonly isNoticeBoardModalOpen = computed(
  () => this.activeModal() === 'notice-board'
);

  readonly selectedFaculty = computed(() => this.facultyDetailService.selectedFaculty());

  submittingProspectus = false;
  submittingCompanies = false;
  submittingPlacedStudents = false;
  submittingFaculty = false;
  existingFacultyPhones: string[] = [];
  submittingCourseForm = false;
  submittingDepartment = false;
  deletingFaculty = false;
  showDeleteFacultyModal = false;
  facultyToDeleteId: string | null = null;
  showDeleteCourseModal = false;
  courseToDelete = signal<{ id: string; name: string; departmentId?: string } | null>(null);
  deletingCourse = false;
  showDeleteProspectusModal = false;
  prospectusToDelete = signal<{ id: string; name: string; departmentId?: string } | null>(null);
  deletingProspectus = false;
  showPostImage = false;
  readonly isSubmittingPost = signal(false);
  readonly postAuthorName = signal<string>('');
  readonly postAuthorImageUrl = signal<string | null>(null);
  

  // ------------------ what's on your mind --------------
  readonly isCreatePostModalOpen = computed(
    () => this.activeModal() === 'create-post'
  );

  // Announcements - API Integration (for top banner)
  readonly announcements = signal<readonly AnnouncementItem[]>([]);
  readonly loadingAnnouncements = signal(false);
  readonly selectedAnnouncement = signal<AnnouncementItem | null>(null);
  currentAnnouncementIndex = 0;

  readonly announcementCarouselItems = computed((): AnnouncementCarouselItem[] =>
    this.announcements().map((a) => ({
      id: a.id,
      text: a.title ?? a.content ?? '',
      date: a.eventDate ?? a.createdAt ?? undefined,
      mediaUrl: a.mediaUrl ?? null,
      mediaType: a.mediaType ?? null,
    }))
  );

  // Current Batch - API Integration
  readonly currentBatch = signal<readonly PersonCard[]>([]);
  readonly loadingCurrentBatch = signal(false);
  readonly batches = signal<string[]>([]);
  readonly loadingBatches = signal(false);
  selectedBatch = signal<string | null>(null);
  currentBatchPage = 0; // API uses 0-indexed pagination (page=0 for first page)
  readonly currentBatchPageSize = 6;
  readonly currentBatchTotalPages = signal(1);

  readonly placedStudents = signal<readonly PersonCard[]>([]);
  loadingPlacedStudents = signal(false);

  // Companies Visited - API Integration
  readonly companiesVisited = signal<readonly CompanyVisitedCard[]>([]);
  readonly loadingCompaniesVisited = signal(false);
  companiesVisitedPage = 0; // API uses 0-indexed pagination (page=0 for first page)
  readonly companiesVisitedPageSize = 3; // 3 companies per page (as per UI design)
  readonly companiesVisitedTotalPages = signal(1);

  // Alumni - API Integration
  readonly alumni = signal<readonly PersonCard[]>([]);
  readonly loadingAlumni = signal(false);
  selectedAlumniYear = signal<string | null>(null);
  alumniPage = 1;
  readonly alumniPageSize = 12; // Student API uses limit=12 (as per image)
  readonly alumniTotalPages = signal(1);
  readonly useCarouselAPI = signal(false); // Flag to switch between APIs
  private alumniInitialized = false;
  // Current Batch (student service)
  readonly loadingCurrentBatchStudents = signal(false);
  currentBatchYear = signal<string | null>(null);
  currentBatchCampusName = signal<string | null>(null);
  showBatchFilterModal = signal(false);
  campusFilterOptions = signal<readonly { label: string; value: string }[]>([]);
  selectedFilterCampus = signal<string>('');
  selectedFilterYear = signal<string>('');

  // ---------------- Departments - API Integration ----------------

readonly departments = signal<readonly DepartmentItem[]>([]);
readonly loadingDepartments = signal(false);

departmentsPage = 0; // API uses 0-based pagination
readonly departmentsPageSize = 3;
readonly departmentsTotalPages = signal(1);

readonly departmentDropdown = signal<DepartmentDropdownItem[]>([]);
readonly departmentDropdownItems = computed(() =>
  this.departmentDropdown().map((d: DepartmentDropdownItem) => ({
    label: d.departmentName,
  value: d.id   }))
);

// ---------------- Notice Board ----------------

// ---------------- Notice Board ----------------

readonly notices = signal<NoticeItem[]>([]);
readonly loadingNotices = signal(false);
noticePage = 0;                 // API page index (0-based)
readonly noticePageSize = 3;    // 1 page = 3 notices
readonly noticeTotalPages = signal(1);



readonly loadingDepartmentDropdown = signal(false);

readonly selectedDepartmentDetail = signal<DepartmentDetailItem | null>(null);
readonly loadingDepartmentDetail = signal(false);

// --------------notice board --------------
noticeTitle = '';
noticeMessage = '';

noticeTitleError = '';
noticeMessageError = '';

// EDIT MODE
editingNoticeId: string | null = null;
isEditMode = false;


// ---------------- news 
newsPage = 0;
newsPageSize = 2;


  // Student's current batch from Student module
  readonly studentCurrentBatch = signal<string | null>(null);
  readonly noCurrentBatchAssigned = signal(false);
  
  // Year filter options for alumni/current batch: next 6 years, current, and all past years (80 years back)
readonly alumniYearOptions: readonly { label: string; value: string }[] = (() => {
  const current = new Date().getFullYear();
  const years: { label: string; value: string }[] = [];
  for (let y = current + 6; y >= current - 80; y--) {
    years.push({ label: `${y}`, value: `${y}` });
  }
  return years;
})();
  readonly posts = signal<FeedPost[]>([]);
  readonly loadingFeed = signal(false);
  readonly loadingMoreFeed = signal(false);
  readonly hasMoreFeed = signal(true);
  private feedPage = 0;
  private readonly feedPageSize = 10;
  private feedFirstLoadDone = false;
  private feedIntersectionObserver: IntersectionObserver | null = null;
  private feedScrollListener: (() => void) | null = null;
  private feedTopRefreshListener: (() => void) | null = null;
  private feedScrollHost: HTMLElement | null = null;
  private readonly elementRef = inject(ElementRef);
  private maxScrollY = 0;
  private lastTopRefreshTime = 0;
  private readonly TOP_REFRESH_THRESHOLD = 200;
  private readonly MIN_SCROLL_DISTANCE = 500;
  private readonly TOP_REFRESH_COOLDOWN_MS = 2000;
  private readonly ngZone = inject(NgZone);
  @ViewChild('feedSentinel') feedSentinel?: ElementRef<HTMLElement>;
  readonly mediaViewerUrl = signal<string | null>(null);
  readonly mediaViewerType = signal<'image' | 'video' | null>(null);
  readonly reportPostId = signal<string | null>(null);
  readonly reportReason = signal('');
  readonly isReporting = signal(false);
  readonly isReportModalOpen = computed(() => !!this.reportPostId());

  readonly postTextTruncateLength = 200;
  readonly expandedPostIds = signal<Set<string>>(new Set());

  togglePostExpand(key: string): void {
    const next = new Set(this.expandedPostIds());
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.expandedPostIds.set(next);
  }

  // Carousel / pagination state (shared component usage)
  readonly peoplePageSize = 3; // 3 students per page
  placedStudentsPage = 0; // API uses 0-indexed pagination (page=0 for first page)

  placedStudentsTotalPages = signal(1);

  currentBatchPageItems(): readonly PersonCard[] {
    return this.currentBatch();
  }

  placedStudentsPageItems(): readonly PersonCard[] {
    // API already returns paginated data, so return the items directly
    return this.placedStudents();
  }
  private readonly announcementEffect = effect(() => {
  const list = this.announcements();
  const index = this.currentAnnouncementIndex;

  if (!list.length) {
    this.selectedAnnouncement.set(null);
    return;
  }

  const safeIndex = Math.max(0, Math.min(index, list.length - 1));
  this.selectedAnnouncement.set(list[safeIndex]);
});

// ---------------- news detail 
openNewsDetail(news: NewsResponse): void {
  this.modalService.setModalData(news);
  this.modalService.openModal('news-detail'); 
}

// -------------- open placed student / alumni / batchmate ------
openPlacedStudent(student: PersonCard): void {
  if (!student) return;
  const publicStudentId = student.publicStudentId;
  if (!publicStudentId || !publicStudentId.trim()) return;
  const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/student', publicStudentId]));
  window.open(url, '_blank');
}

// ---------------- open company visited -----
openCompany(company: CompanyVisitedCard): void {
  const publicId = company.publicCompanyId;
  if (!publicId || !String(publicId).trim()) return;
  const url = this.router.serializeUrl(this.router.createUrlTree(['/profile/company', publicId]));
  window.open(url, '_blank');
}

// ---------------- departement email ------
private currentCampusEmail(): string {
  const userData = this.storage.get(STORAGE_KEYS.USER_DATA);

  if (userData && typeof userData === 'object' && 'email' in userData) {
    return String((userData as { email?: string }).email || '');
  }

  return '';
}




  private readonly companiesVisitedResetEffect = effect(() => {
    const isOpen = this.isCompaniesModalOpen();
    if (isOpen && this.companiesVisitedComponent) {
      // Reset form when modal opens (use setTimeout to ensure ViewChild is available)
      setTimeout(() => {
        if (this.companiesVisitedComponent) {
          this.companiesVisitedComponent.resetForm();
        }
      }, 0);
    }
  });

  private readonly facultyModalAddEffect = effect(() => {
    const isOpen = this.isFacultyModalOpen();
    const modalData = this.modalService.getModalData() as { mode?: string } | null;
    if (isOpen && modalData?.mode === 'add') {
      this.isEditFacultyMode.set(false);
      this.facultyToEdit.set(null);
      this.facultyFormValue.set(this.getDefaultFacultyFormValue());
      this.editingFacultyId = null;
      this.modalService.setModalData(null);
    }
  });

  private readonly noticeBoardAddEffect = effect(() => {
    const isOpen = this.isNoticeBoardModalOpen();
    const modalData = this.modalService.getModalData() as { mode?: string } | null;
    if (isOpen && modalData?.mode === 'add') {
      this.resetNoticeForm();
      this.modalService.setModalData(null);
    }
  });

  openCreatePostModal(): void {
    if (this.isSubmittingPost()) return;
    this.editPostState.clearPostToEdit();
    this.modalService.openModal('create-post');
  }

  openMediaViewer(url: string, type: 'image' | 'video'): void {
    this.mediaViewerUrl.set(url);
    this.mediaViewerType.set(type);
  }

  closeMediaViewer(): void {
    this.mediaViewerUrl.set(null);
    this.mediaViewerType.set(null);
  }

  onCreatePostClosed(): void {
    this.editPostState.clearPostToEdit();
    this.modalService.closeModal();
    this.noticeTitleError = '';
this.noticeMessageError = '';
  }

  onCreatePostSubmitted(payload: CreatePostSubmitPayload): void {
    if (payload.postId) {
      const postToEdit = this.editPostState.postToEdit();
      const authorId = postToEdit?.authorId ?? postToEdit?.author?.authorId ?? this.getCampusId();
      if (!authorId) {
        this.notify.error('Cannot update: author not found.');
        return;
      }
      this.isSubmittingPost.set(true);
      this.modalService.closeModal();

      const isAnnouncement = payload.postKind === 'ANNOUNCEMENT';
      if (payload.mediaFile) {
        const formData = new FormData();
        formData.append('authorId', String(authorId));
        formData.append('text', payload.text);
        const isVideo = payload.mediaFile.type.startsWith('video/');
        formData.append(isVideo ? 'videos' : 'images', payload.mediaFile, payload.mediaFile.name);

        const updateWithFiles$ = isAnnouncement
          ? this.commonApi.updateAnnouncementWithFiles(payload.postId, formData)
          : this.commonApi.updatePostWithFiles(payload.postId, formData);
        updateWithFiles$.pipe(
          finalize(() => this.isSubmittingPost.set(false))
        ).subscribe({
          next: () => {
            this.notify.success(isAnnouncement ? 'Announcement updated successfully' : 'Post updated successfully');
            if (isAnnouncement) this.loadAnnouncements(); else this.loadFeed();
            this.onCreatePostClosed();
          },
          error: (err) => {
            this.notify.error(err?.error?.message ?? err?.message ?? (isAnnouncement ? 'Failed to update announcement' : 'Failed to update post'));
          },
        });
      } else {
        const update$ = isAnnouncement
          ? this.commonApi.updateAnnouncement(payload.postId, { authorId: String(authorId), text: payload.text })
          : this.commonApi.updatePost(payload.postId, { authorId: String(authorId), text: payload.text });
        update$.pipe(
          finalize(() => this.isSubmittingPost.set(false))
        ).subscribe({
          next: () => {
            this.notify.success(isAnnouncement ? 'Announcement updated successfully' : 'Post updated successfully');
            if (isAnnouncement) this.loadAnnouncements(); else this.loadFeed();
            this.onCreatePostClosed();
          },
          error: (err) => {
            this.notify.error(err?.error?.message ?? err?.message ?? (isAnnouncement ? 'Failed to update announcement' : 'Failed to update post'));
          },
        });
      }
      return;
    }

    const user = this.authState.user();
    const authorId =
      this.getCampusId() ?? user?.profileServiceId ?? user?.campusId ?? user?.companyId ?? user?.studentId ?? user?.userId;
    const authorDisplayName = this.postAuthorName() || user?.displayName || user?.email || 'Campus';

    if (payload.mediaFile && !authorId) {
      this.notify.error('Author information is required to post with media. Please log in again.');
      return;
    }

    this.isSubmittingPost.set(true);
    this.modalService.closeModal();

    const isAnnouncement = payload.postKind === 'ANNOUNCEMENT';
    const request = {
      text: payload.text,
      postType: 'CAMPUS' as const,
      postKind: payload.postKind,
      ...(authorId && { authorId: String(authorId) }),
      ...(authorDisplayName && { authorDisplayName }),
    };

    if (payload.mediaFile) {
      const formData = new FormData();
      formData.append('text', payload.text);
      formData.append('postType', 'CAMPUS');
      formData.append('postKind', payload.postKind);
      formData.append('authorId', String(authorId));
      if (authorDisplayName) formData.append('authorDisplayName', authorDisplayName);
      const isVideo = payload.mediaFile.type.startsWith('video/');
      formData.append(isVideo ? 'videos' : 'images', payload.mediaFile, payload.mediaFile.name);

      const api$ = isAnnouncement
        ? this.commonApi.createAnnouncementWithFiles(formData)
        : this.commonApi.createPostWithFiles(formData);

      api$.pipe(finalize(() => this.isSubmittingPost.set(false))).subscribe({
        next: () => {
          this.notify.success(isAnnouncement ? 'Announcement submitted successfully' : 'Post submitted successfully');
          if (isAnnouncement) this.loadAnnouncements(); else this.prependPostToFeed(payload, authorDisplayName);
        },
        error: (err) => {
          this.notify.error(err?.error?.message ?? err?.message ?? (isAnnouncement ? 'Failed to create announcement' : 'Failed to create post'));
        },
      });
    } else {
      const api$ = isAnnouncement ? this.commonApi.createAnnouncement(request) : this.commonApi.createPost(request);
      api$.pipe(finalize(() => this.isSubmittingPost.set(false))).subscribe({
        next: () => {
          this.notify.success(isAnnouncement ? 'Announcement submitted successfully' : 'Post submitted successfully');
          if (isAnnouncement) this.loadAnnouncements(); else this.prependPostToFeed(payload, authorDisplayName);
        },
        error: (err) => {
          this.notify.error(err?.error?.message ?? err?.message ?? (isAnnouncement ? 'Failed to create announcement' : 'Failed to create post'));
        },
      });
    }
  }

  private prependPostToFeed(payload: CreatePostSubmitPayload, authorDisplayName: string): void {
    const authorImgUrl = this.postAuthorImageUrl() ?? 'assets/images/login-news-image.png';
    const mediaUrl = payload.mediaFile ? URL.createObjectURL(payload.mediaFile) : null;
    const mediaType = payload.mediaFile?.type.startsWith('video/') ? 'video' : payload.mediaFile ? 'image' : null;
    const newPost: FeedPost = {
      postId: null,
      author: authorDisplayName,
      authorId: 'Just now',
      authorImageUrl: authorImgUrl,
      mediaUrl,
      mediaType,
      text: payload.text,
      likedByMe: false,
      likeCount: 0,
    };
    this.posts.update((list) => [newPost, ...list]);
  }

  onLikePost(post: FeedPost): void {
    if (!post.postId) return;
    const campusId = this.getCampusId();
    const user = this.authState.user();
    const userId = campusId ?? user?.campusId ?? user?.profileServiceId ?? user?.userId?.toString();
    const userType = 'CAMPUS';
    if (!userId) return;
    this.commonApi.likePost(post.postId, { userId: String(userId), userType }).subscribe({
      next: () => {
        this.posts.update((list) =>
          list.map((p) =>
            p.postId === post.postId
              ? { ...p, likedByMe: !p.likedByMe, likeCount: p.likeCount + (p.likedByMe ? -1 : 1) }
              : p
          )
        );
      },
    });
  }

  onReportPost(post: FeedPost): void {
    if (!post.postId) return;
    this.reportPostId.set(post.postId);
    this.reportReason.set('');
  }

  closeReportModal(): void {
    if (this.isReporting()) return;
    this.reportPostId.set(null);
    this.reportReason.set('');
  }

  submitReport(): void {
    const postId = this.reportPostId();
    if (!postId) return;
    const reason = this.reportReason().trim();
    if (!reason) {
      this.notify.error('Report reason is required.');
      return;
    }
 if (reason.length > this.REPORT_MAX_LENGTH) {
  this.notify.error(`Report reason must be at most ${this.REPORT_MAX_LENGTH} characters.`);
  return;
}

    const campusId = this.getCampusId();
    const user = this.authState.user();
    const reporterId = campusId ?? user?.campusId ?? user?.profileServiceId ?? user?.userId?.toString();
    if (!reporterId) return;
    this.isReporting.set(true);
    this.commonApi
      .reportPost({
        postId,
        reporterId: String(reporterId),
        reporterType: 'CAMPUS',
        reason,
      })
      .pipe(finalize(() => this.isReporting.set(false)))
      .subscribe({
        next: () => {
          this.notify.success('Post reported successfully');
          this.closeReportModal();
        },
        error: (err) => this.notify.error(err?.error?.message ?? err?.message ?? 'Failed to report post'),
      });
  }

  private readonly courseFormResetEffect = effect(() => {
    const isOpen = this.isCourseFormModalOpen();
    if (isOpen && this.courseFormComponent) {
      // Reset form when modal opens (use setTimeout to ensure ViewChild is available)
      setTimeout(() => {
        if (this.courseFormComponent) {
          this.courseFormComponent.resetForm();
        }
      }, 0);
    }
  });

  private readonly prospectusFormResetEffect = effect(() => {
    const isOpen = this.isProspectusModalOpen();
    if (isOpen) {
      // Reset form when modal opens (use setTimeout to ensure ViewChild is available)
      setTimeout(() => {
        if (this.prospectusComponent) {
          // First reset the form to clear all old data (course, file, etc.)
          this.prospectusComponent.resetForm();
          // Then initialize with campusId after a longer delay to ensure reset completes fully
          // This sets campus name (readonly field) but form fields (course, file) remain empty
          setTimeout(() => {
            if (this.prospectusComponent) {
              this.initializeProspectusComponent();
            }
          }, 200); // Increased delay to ensure reset completes
        } else {
          console.warn('CampusHomeComponent: prospectusComponent ViewChild not available');
        }
      }, 200); // Increased timeout to ensure component is fully initialized and ViewChild is available
    }
  });

  private readonly placedStudentsResetEffect = effect(() => {
    const isOpen = this.isPlacedStudentsModalOpen();
    if (isOpen && this.placedStudentsComponent) {
      // Reset form when modal opens (use setTimeout to ensure ViewChild is available)
      setTimeout(() => {
        if (this.placedStudentsComponent) {
          this.placedStudentsComponent.resetForm();
        }
      }, 0);
    }
  });

  ngOnInit(): void {
    const userType = this.roleService.getUserType();
    const departmentId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;
    const campusId = this.getCampusId();

    if (userType === 'DEPARTMENT' && !campusId && departmentId?.trim()) {
      this.campusApi.getDepartmentById(departmentId.trim()).pipe(
        catchError(() => of(null))
      ).subscribe({
        next: (dept) => {
          if (dept?.campusId) {
            this.storage.set(STORAGE_KEYS.CAMPUS_ID, dept.campusId);
          }
          this.initCampusHomeData();
        },
        error: () => this.initCampusHomeData(),
      });
    } else {
      this.initCampusHomeData();
    }
  }

  private initCampusHomeData(): void {
    if (typeof window === 'undefined') return;
    this.loadPlacedStudents();
    this.loadCompaniesVisited();
    const currentYear = new Date().getFullYear().toString();
    this.selectedAlumniYear.set(currentYear);
    this.useCarouselAPI.set(false);
    this.currentBatchYear.set(currentYear);
    const initialCampusId = this.getCampusId();
    if (initialCampusId) {
      this.alumniInitialized = true;
      this.alumniPage = 1;
      this.fetchAlumniByCampusBatch(initialCampusId, currentYear);
      this.loadCurrentBatchStudents(initialCampusId, currentYear);
    }
    this.loadCampusFilterOptions();
    window.addEventListener('departmentDeleted', () => {
      this.loadDepartments();
    });

    // respond when some other part of the app requests an edit/delete
    // custom events are typed at runtime; use a generic Event listener and cast inside
    window.addEventListener('noticeEditRequested', (evt: Event) => {
      const e = evt as CustomEvent<NoticeItem>;
      const notice = e.detail ?? null;
      if (notice) {
        this.handleNoticeEdit(notice);
      }
    });
    window.addEventListener('noticeDeleteRequested', (evt: Event) => {
      const e = evt as CustomEvent<string>;
      const id = e.detail;
      if (id) {
        this.handleNoticeDelete(id);
      }
    });

    // reload whenever a notice has been deleted from another part of the app
    window.addEventListener('noticeDeleted', () => {
      this.loadNotices();
    });

    this.loadAnnouncements();
    this.loadDepartments();
    this.loadDepartmentDropdown();
    this.loadPostAuthorData();
    this.loadFeed();
    this.loadNews();
    this.loadNotices();

  this.campusApi.getAllFaculties().subscribe({
  next: (response) => {
    const facultyList = (response?.data ?? []) as unknown[];

    this.existingFacultyPhones = facultyList
      .map((f) => {
        const faculty = f as { basicInformation?: { phoneNumber?: string } };
        return faculty.basicInformation?.phoneNumber;
      })
      .filter((p): p is string => typeof p === 'string' && p.length > 0);
  },
  error: () => {
    this.existingFacultyPhones = [];
  }
});
  }

  loadFeed(): void {
    this.loadingFeed.set(true);
    this.feedPage = 0;
    this.hasMoreFeed.set(true);
    this.feedFirstLoadDone = false;
    const campusId = this.getCampusId();
    const user = this.authState.user();
    const userId = campusId ?? user?.campusId ?? user?.profileServiceId ?? user?.userId?.toString() ?? undefined;
    const pageSize = this.feedPageSize;
    const params: { pageSize: number; page: number; viewerUserId?: string } = { pageSize, page: 0 };
    if (userId != null && String(userId).trim()) {
      params.viewerUserId = String(userId).trim();
    }
    this.commonApi
      .getFeed(params)
      .pipe(
        map((res) => {
          const count = res.posts?.length ?? 0;
          const items = mapPostsToFeedPost(res.posts ?? []);
          const hasMore = count < pageSize ? false : (res.hasMore ?? count >= pageSize);
          return { items, hasMore };
        }),
        switchMap(({ items, hasMore }) =>
          this.commonApi.enrichFeedLikes(items, { id: userId ?? null, type: 'CAMPUS' }).pipe(
            map((enriched) => ({ items: enriched, hasMore }))
          )
        ),
        catchError(() => of({ items: [] as FeedPost[], hasMore: false })),
        finalize(() => {
          this.loadingFeed.set(false);
          this.feedFirstLoadDone = true;
          this.setupFeedTopRefresh();
        })
      )
      .subscribe({
        next: ({ items, hasMore }) => {
          this.posts.set(items);
          this.hasMoreFeed.set(hasMore);
          this.feedPage = 0;
          this.setupFeedInfiniteScroll();
        },
        error: () => {
          this.posts.set([]);
          this.hasMoreFeed.set(false);
        },
      });
  }

  ngAfterViewInit(): void {
    this.setupFeedInfiniteScroll();
    queueMicrotask(() => {
      if (this.posts().length === 0 && !this.loadingFeed()) {
        this.loadFeed();
      }
    });
  }

  private getScrollHost(): HTMLElement | null {
    const el = this.elementRef?.nativeElement;
    return el?.closest?.('.content') ?? null;
  }

  private setupFeedTopRefresh(): void {
    if (typeof window === 'undefined') return;
    if (this.feedTopRefreshListener) return;
    this.feedScrollHost = this.getScrollHost();
    const contentTarget = this.feedScrollHost as EventTarget | null;
    const win = typeof window !== 'undefined' ? window : null;
    const checkTopRefresh = (): void => {
      const contentScroll = this.feedScrollHost ? this.feedScrollHost.scrollTop : 0;
      const windowScroll = win ? (window.scrollY || window.pageYOffset || 0) : 0;
      const scrollY = Math.max(contentScroll, windowScroll);
      if (scrollY > this.maxScrollY) {
        this.maxScrollY = scrollY;
      }
      if (
        scrollY <= this.TOP_REFRESH_THRESHOLD &&
        this.maxScrollY >= this.MIN_SCROLL_DISTANCE &&
        this.feedFirstLoadDone &&
        !this.loadingFeed() &&
        !this.loadingMoreFeed()
      ) {
        const now = Date.now();
        if (now - this.lastTopRefreshTime >= this.TOP_REFRESH_COOLDOWN_MS) {
          this.lastTopRefreshTime = now;
          this.maxScrollY = 0;
          this.ngZone.run(() => this.loadFeed());
        }
      }
    };
    this.feedTopRefreshListener = checkTopRefresh;
    this.ngZone.runOutsideAngular(() => {
      if (contentTarget) contentTarget.addEventListener('scroll', this.feedTopRefreshListener as EventListener, { passive: true });
      if (win) win.addEventListener('scroll', this.feedTopRefreshListener as EventListener, { passive: true });
    });
  }

  private setupFeedInfiniteScroll(): void {
    if (typeof window === 'undefined') return;
    const el = this.feedSentinel?.nativeElement;
    if (!el) return;
    this.feedScrollHost = this.getScrollHost();
    const contentTarget = this.feedScrollHost as EventTarget | null;
    const win = typeof window !== 'undefined' ? window : null;

    if (!this.feedIntersectionObserver) {
      this.ngZone.runOutsideAngular(() => {
        this.feedIntersectionObserver = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry?.isIntersecting) return;
            this.ngZone.run(() => {
              if (
                this.feedFirstLoadDone &&
                this.hasMoreFeed() &&
                !this.loadingMoreFeed() &&
                !this.loadingFeed()
              ) {
                this.loadMoreFeed();
              }
            });
          },
          { root: null, rootMargin: '200px 0px', threshold: 0 }
        );
        this.feedIntersectionObserver.observe(el);
      });
    }
    if (!this.feedScrollListener) {
      const checkAndLoad = (): void => {
        if (
          !this.feedFirstLoadDone ||
          !this.hasMoreFeed() ||
          this.loadingMoreFeed() ||
          this.loadingFeed()
        )
          return;
        const sentinel = this.feedSentinel?.nativeElement;
        if (!sentinel) return;
        const rect = sentinel.getBoundingClientRect();
        const viewHeight = win ? window.innerHeight : 0;
        const triggerZone = viewHeight + 300;
        if (rect.top <= triggerZone) {
          this.ngZone.run(() => this.loadMoreFeed());
        }
      };
      this.feedScrollListener = checkAndLoad;
      this.ngZone.runOutsideAngular(() => {
        if (contentTarget) contentTarget.addEventListener('scroll', this.feedScrollListener as EventListener, { passive: true });
        if (win) win.addEventListener('scroll', this.feedScrollListener as EventListener, { passive: true });
      });
    }
  }

  loadMoreFeed(): void {
    if (
      this.loadingMoreFeed() ||
      !this.hasMoreFeed() ||
      this.loadingFeed() ||
      !this.feedFirstLoadDone
    )
      return;
    const campusId = this.getCampusId();
    const user = this.authState.user();
    const userId = campusId ?? user?.campusId ?? user?.profileServiceId ?? user?.userId?.toString() ?? undefined;
    const nextPage = this.feedPage + 1;
    this.loadingMoreFeed.set(true);
    this.commonApi
      .getFeed({
        pageSize: this.feedPageSize,
        page: nextPage,
        ...(userId != null && String(userId).trim() ? { viewerUserId: String(userId).trim() } : {}),
      })
      .pipe(
        map((res) => {
          const count = res.posts?.length ?? 0;
          const items = mapPostsToFeedPost(res.posts ?? []);
          const hasMore =
            count < this.feedPageSize ? false : (res.hasMore ?? count >= this.feedPageSize);
          return { items, hasMore };
        }),
        switchMap(({ items, hasMore }) =>
          this.commonApi.enrichFeedLikes(items, { id: userId ?? null, type: 'CAMPUS' }).pipe(
            map((enriched) => ({ items: enriched, hasMore }))
          )
        ),
        catchError(() => of({ items: [] as FeedPost[], hasMore: false })),
        finalize(() => this.loadingMoreFeed.set(false))
      )
      .subscribe({
        next: ({ items, hasMore }) => {
          if (items.length > 0) {
            this.posts.update((prev) => [...prev, ...items]);
          }
          this.hasMoreFeed.set(hasMore);
          this.feedPage = nextPage;
        },
      });
  }

  ngOnDestroy(): void {
    this.feedIntersectionObserver?.disconnect();
    this.feedIntersectionObserver = null;
    const win = typeof window !== 'undefined' ? window : null;
    if (this.feedScrollListener) {
      if (this.feedScrollHost) this.feedScrollHost.removeEventListener('scroll', this.feedScrollListener as EventListener);
      if (win) win.removeEventListener('scroll', this.feedScrollListener as EventListener);
      this.feedScrollListener = null;
    }
    if (this.feedTopRefreshListener) {
      if (this.feedScrollHost) this.feedScrollHost.removeEventListener('scroll', this.feedTopRefreshListener as EventListener);
      if (win) win.removeEventListener('scroll', this.feedTopRefreshListener as EventListener);
      this.feedTopRefreshListener = null;
    }
    this.feedScrollHost = null;
  }

  // ----------------- news --------------
loadNotices(): void {

  const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
  const departmentId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;

  if (!campusId) return;

  this.loadingNotices.set(true);

this.campusApi
  .getAllNotices(
    this.noticePage,   
    this.noticePageSize,
    campusId,
    departmentId || undefined
  )

    .subscribe({
      next: (res) => {

        this.loadingNotices.set(false);

        if (!res || !res.data) {
          this.notices.set([]);
          this.noticeTotalPages.set(1);
           this.cdr.detectChanges();
          return;
        }

 this.notices.set([...res.data.content]);
         this.noticeTotalPages.set(res.data.totalPages);
           this.cdr.detectChanges();  
      },

      error: () => {
        this.loadingNotices.set(false);
        this.notices.set([]);
        this.noticeTotalPages.set(1);
      }
    });
}



  private loadPostAuthorData(): void {
    const userType = this.roleService.getUserType();
    const user = this.authState.user();

    if (userType === 'DEPARTMENT') {
      const departmentId = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;
      if (!departmentId?.trim()) {
        this.postAuthorName.set(user?.displayName ?? user?.email ?? 'Department');
        this.postAuthorImageUrl.set(user?.imageUrl ?? null);
        return;
      }
      this.campusApi.getDepartmentById(departmentId.trim()).pipe(
        catchError(() => of(null))
      ).subscribe({
        next: (data) => {
          if (data?.departmentName?.trim()) {
            this.postAuthorName.set(data.departmentName.trim());
          } else {
            this.postAuthorName.set(user?.email ?? 'Department');
          }
          const raw = data as Record<string, unknown> | null | undefined;
          const photoUrl = (raw?.['photoUrl'] ?? raw?.['imageUrl'] ?? raw?.['photourl'] ?? data?.photoUrl) as string | undefined;
          const imageUrlStr = typeof photoUrl === 'string' ? photoUrl.trim() : '';
          if (imageUrlStr) {
            let url = imageUrlStr;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
              url = url.startsWith('/') ? `/api/v1/files${url}` : `/api/v1/files/${url}`;
            }
            this.postAuthorImageUrl.set(url);
          } else if (data?.campusId) {
            this.setPostAuthorImageFromCampus(data.campusId);
          } else {
            this.postAuthorImageUrl.set(user?.imageUrl ?? null);
          }
        },
      });
      return;
    }

    const campusId = this.getCampusId();
    if (!campusId) {
      this.postAuthorName.set(user?.displayName ?? user?.email ?? 'Campus');
      this.postAuthorImageUrl.set(user?.imageUrl ?? null);
      return;
    }
    const cleanId = String(campusId).replace(/^CAMPUS-/i, '').trim();
    this.campusApi.getCampusById(cleanId).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (data) => {
        if (data?.campusName?.trim()) {
          this.postAuthorName.set(data.campusName.trim());
        } else {
          this.postAuthorName.set(this.authState.user()?.email ?? 'Campus');
        }
        if (data?.photoUrl?.trim()) {
          let url = data.photoUrl.trim();
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = url.startsWith('/') ? `/api/v1/files${url}` : `/api/v1/files/${url}`;
          }
          this.postAuthorImageUrl.set(url);
        } else {
          this.postAuthorImageUrl.set(this.authState.user()?.imageUrl ?? null);
        }
      },
    });
  }

  /**
   * Set post author image from campus (used when department has no image).
   */
  private setPostAuthorImageFromCampus(campusId: string): void {
    const cleanId = String(campusId).replace(/^CAMPUS-/i, '').trim();
    this.campusApi.getCampusById(cleanId).pipe(
      catchError(() => of(null))
    ).subscribe({
      next: (data) => {
        if (data?.photoUrl?.trim()) {
          let url = data.photoUrl.trim();
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = url.startsWith('/') ? `/api/v1/files${url}` : `/api/v1/files/${url}`;
          }
          this.postAuthorImageUrl.set(url);
        } else {
          this.postAuthorImageUrl.set(this.authState.user()?.imageUrl ?? null);
        }
      },
    });
  }

  /**
   * Initialize prospectus component with campusId when modal opens
   * NOTE: This only loads the prospectus list, it does NOT populate form fields
   * Form fields remain empty as per client requirement
   */
  private initializeProspectusComponent(): void {
    const campusId = this.getCampusId();
    if (campusId && this.prospectusComponent) {
      // Pass campusId to prospectus component so it can load the list
      // This will load all prospectuses but keep form fields empty
      this.prospectusComponent.refreshProspectusList(campusId);
    }
  }

  // Announcements - API Integration (for top banner)
  // Uses dedicated announcements API from common/feed/announcements
  loadAnnouncements(): void {
    this.loadingAnnouncements.set(true);
    const campusId = this.getCampusId();
    const params: { viewerId?: string; viewerType?: string; pageSize?: number; page?: number } = {
      pageSize: 10,
      page: 0,
    };
    if (campusId) {
      params.viewerId = campusId;
      params.viewerType = 'CAMPUS';
    }
    this.commonApi.getAnnouncements(params).pipe(
      catchError((error) => {
        console.error('CampusHomeComponent: Announcements API error:', error);
        this.loadingAnnouncements.set(false);
        return of({ posts: [] });
      })
    ).subscribe({
      next: (res) => {
        this.loadingAnnouncements.set(false);
        const posts = res?.posts ?? [];
        const items: AnnouncementItem[] = posts.map((p) => {
          const firstImage = p.imageUrls?.[0];
          const firstVideo = p.videoUrls?.[0];
          const hasImage = !!firstImage;
          const hasVideo = !!firstVideo;
          return {
            id: p.postId ?? p.id ?? '',
            title: (p.text ?? p.authorDisplayName ?? 'Announcement').slice(0, 100),
            content: p.text ?? '',
            eventDate: p.createdAt ?? undefined,
            createdAt: p.createdAt ?? undefined,
            mediaUrl: hasImage ? firstImage : hasVideo ? firstVideo : undefined,
            mediaType: hasImage ? 'image' as const : hasVideo ? 'video' as const : undefined,
          };
        });
        this.announcements.set(items);
        this.currentAnnouncementIndex = 0;
        this.selectedAnnouncement.set(items[0] ?? null);
      },
      error: (error) => {
        console.error('CampusHomeComponent: Error in announcements subscription:', error);
        this.loadingAnnouncements.set(false);
        this.announcements.set([]);
      },
    });
  }


  get noticeModalData(): NoticeDetailData | null {
  return this.modalService.getModalData() as NoticeDetailData | null;
}

get newsModalData(): {
  title?: string;
  description?: string;
  createDate?: string;
} | null {
  return this.modalService.getModalData() as {
    title?: string;
    description?: string;
    createDate?: string;
  } | null;
}

  // ------------------------- get all news -----------------
loadNews(): void {
  this.loadingNews.set(true);

  this.campusApi.getAllNews().subscribe({
    next: (res: unknown) => {

      // Case 1 → API directly array return kare
      if (Array.isArray(res)) {
        this.newsList.set(res as NewsResponse[]);
      }

      // Case 2 → API { data: [] } format me ho
      else if (
        res &&
        typeof res === 'object' &&
        'data' in res &&
        Array.isArray((res as { data?: unknown }).data)
      ) {
        this.newsList.set((res as { data: NewsResponse[] }).data);
      }

      // fallback
      else {
        this.newsList.set([]);
      }

      this.loadingNews.set(false);
    },

    error: (err) => {
      console.error('Campus news load error:', err);
      this.loadingNews.set(false);
      this.newsList.set([]);
    }
  });
}


newsTotalPages(): number {
  return Math.ceil(this.newsList().length / this.newsPageSize);
}

newsPageItems() {
  const start = this.newsPage * this.newsPageSize;
  return this.newsList().slice(start, start + this.newsPageSize);
}

onNewsPageChange(page: number) {
  this.newsPage = page - 1;
}



  // -------------------- department get with campus id -----------------

  loadDepartments(): void {
  const campusId = this.getCampusId();

  if (!campusId) {
    console.error('CampusHomeComponent: Campus ID missing for departments');
    this.departments.set([]);
    return;
  }

  this.loadingDepartments.set(true);

  this.campusApi
    .getDepartments(campusId, this.departmentsPage, this.departmentsPageSize)
    .pipe(
      catchError((error) => {
        console.error('CampusHomeComponent: Error loading departments:', error);
        this.loadingDepartments.set(false);
        return of(null);
      })
    )
    .subscribe({
      next: (response) => {
        this.loadingDepartments.set(false);

        const content =
          response?.data && typeof response.data === 'object'
            ? (response.data.content ?? [])
            : [];

        // 🔥🔥 IMPORTANT FIX — Mongo ID preserve karo
        const mappedDepartments: DepartmentItem[] = (Array.isArray(content) ? content : []).map((d: unknown) => {
          const dept = d as {
            id?: string;
            _id?: string;
            departmentId?: string;
            departmentName?: string;
            email?: string;
            phone?: string;
            aboutDepartment?: string;
            photoUrl?: string;
          };

          return {
            // 🚀 Mongo ID hi primary id hoga (API ke liye)
            id: dept._id || dept.id || '',

            // display wala dept code
            departmentId: dept.departmentId || '',

            departmentName: dept.departmentName || '',
            email: dept.email || '',
            phone: dept.phone || '',
            aboutDepartment: dept.aboutDepartment || '',
            photoUrl: dept.photoUrl || '',
          };
        });

        this.departments.set(mappedDepartments);

        const totalPages =
          response?.data && typeof response.data === 'object'
            ? response.data.totalPages ?? 1
            : 1;

        this.departmentsTotalPages.set(Math.max(1, totalPages));
      },

      error: () => {
        this.loadingDepartments.set(false);
        this.departments.set([]);
        this.departmentsTotalPages.set(1);
      },
    });
}


onDepartmentsPageChange(page: number): void {
  const apiPage = page - 1;

  if (apiPage !== this.departmentsPage && apiPage >= 0) {
    this.departmentsPage = apiPage;
    this.loadDepartments();
  }
}

onNoticeEdit(notice: NoticeItem): void {

  // modal open
  this.modalService.openModal('notice-board');

  // set edit mode
  this.isEditMode = true;
  this.editingNoticeId = notice.id || null;

  // prefill textarea
  this.noticeTitle = notice.title || ''; 
  this.noticeMessage = notice.message || '';
}

handleFacultyEditRequest(faculty: FacultyDetailData): void {

  // Close detail modal
  this.modalService.closeModal();

  // Enable edit mode and store faculty id for update
  this.isEditFacultyMode.set(true);
  this.editingFacultyId = faculty.id ?? null;

  // Map detail data to form structure
  const formValue: FacultyFormValue = {
    fullName: faculty.name,
    photo: null,
    email: faculty.email,
    dateOfBirth: '',
    phoneNumber: faculty.phone,
    professionalInfo: [
      {
        designation: faculty.designation,
        department: faculty.department,
        specialization: '',
        yearsOfExperience: faculty.experience,
        qualifications: faculty.qualifications,
        certificates: null,
      },
    ],
  };
  this.facultyToEdit.set(formValue);
  this.facultyFormValue.set(formValue);

  // Open faculty modal
  this.modalService.openModal('faculty');
}

//  NOTICE DELETE FROM DETAIL MODAL
handleNoticeDelete(noticeId: string): void {

  if (!noticeId) return;

  const campusId =
    this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

  const departmentId =
    this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;

  //  Department user → send BOTH campusId + departmentId
  if (this.isDepartmentUser) {

    this.campusApi.deleteNotice(
      noticeId,
      campusId || undefined,      
      departmentId || undefined  
    ).subscribe({
      next: () => {
        this.notify.success('Notice deleted successfully');
        this.modalService.closeModal();
        window.dispatchEvent(new Event('noticeDeleted'));
        this.refreshNoticeListInstant();
     },
      error: (err) => {
        this.notify.error(
          err?.error?.message ||
          err?.message ||
          'Failed to delete notice'
        );
      }
    });

    return;
  }

  //  Campus user → send only campusId
  this.campusApi.deleteNotice(
    noticeId,
    campusId || undefined,
    undefined
  ).subscribe({
    next: () => {
      this.notify.success('Notice deleted successfully');
      this.modalService.closeModal();
      window.dispatchEvent(new Event('noticeDeleted'));
      this.noticePage = 0;
      this.loadNotices();
    },
    error: (err) => {
      this.notify.error(
        err?.error?.message ||
        err?.message ||
        'Failed to delete notice'
      );
    }
  });
}




//  NOTICE EDIT FROM DETAIL MODAL
handleNoticeEdit(notice: NoticeItem): void {

  if (!notice) return;

  this.modalService.closeModal();

  // open add/edit modal
  this.modalService.openModal('notice-board');

  this.isEditMode = true;
  this.editingNoticeId = notice.id || null;
  this.noticeTitle = notice.title || ''; 
  this.noticeMessage = notice.message || '';
}


onNoticePageChange(page: number): void {

  const apiPage = page - 1;

  if (apiPage !== this.noticePage && apiPage >= 0) {
    this.noticePage = apiPage;
    this.loadNotices();
  }
}


// ==================== get departements all --------------
loadDepartmentDropdown(): void {
  const campusId = this.getCampusId();

  if (!campusId) {
    console.warn('CampusHome: campusId missing for department dropdown');
    return;
  }

  this.loadingDepartmentDropdown.set(true);

  this.campusApi.getDepartments(campusId, 0, 1000).subscribe({
    next: (response: unknown) => {
      const res = response as {
        data?: {
          content?: unknown[];
        } | unknown[];
      };

      const content =
        (res.data as { content?: unknown[] })?.content ??
        (Array.isArray(res.data) ? res.data : []) ??
        [];

      const mappedDropdown = (Array.isArray(content) ? content : []).map((item: unknown) => {
        const d = item as {
          id?: string;
          _id?: string;
          departmentId?: string;
          departmentName?: string;
        };
        return {
          id: d.id ?? d._id ?? '',
          departmentId: d.departmentId ?? '',
          departmentName: d.departmentName ?? '',
        };
      });

      this.departmentDropdown.set(mappedDropdown);
      this.loadingDepartmentDropdown.set(false);
    },
    error: () => {
      this.loadingDepartmentDropdown.set(false);
      this.departmentDropdown.set([]);
    },
  });
}





// ---------------- get department by department id------------
loadDepartmentById(departmentId: string): void {
  if (!departmentId) return;

  this.loadingDepartmentDetail.set(true);

 this.campusApi.getDepartmentById(departmentId).subscribe({
  next: (res) => {
    if (res) {
      this.selectedDepartmentDetail.set(res);
    } else {
      this.notify.error('Department details not found');
    }
  },
  error: () => {
    this.notify.error('Failed to load department details');
  }
});

}

loadDepartmentDetail(departmentId: string): void {
  console.log('CLICKED DEPARTMENT ID:', departmentId); // 🔥 add this

  this.campusApi.getDepartmentById(departmentId).subscribe({
    next: (res) => {
      console.log('DEPARTMENT DETAIL API RESPONSE:', res); // 🔥 add this
      if (res) {
        this.selectedDepartmentDetail.set(res);
      }
    },
    error: (err) => {
      console.error('DEPARTMENT DETAIL API ERROR:', err);
    }
  });
}

// -------------------- delete department by campus email and with department id --------------------
deleteDepartment(departmentId: string): void {

  const campusEmail = this.currentCampusEmail(); // storage/auth se lo

  this.campusApi.deleteDepartment(departmentId, campusEmail).subscribe({
    next: (res) => {
      if (res?.success) {
        this.notify.success(res.message || 'Department deleted');
        this.loadDepartments();
      } else {
        this.notify.error(res?.message || 'Delete failed');
      }
    },
    error: () => {
      this.notify.error('Delete API failed');
    }
  });
}

openCoursesByDepartment(departmentId: string) {
  this.selectedDepartmentIdForCourses = departmentId;
  this.modalService.openModal('courses');
}

// ------------------------- get department by email -----------------
getDepartmentFromEmail(): void {
const email = this.authState.user()?.email;

  if (!email) return;

  this.campusApi.getDepartmentByEmail(email).subscribe({
    next: (res) => {
      if (res && res.success && res.data) {
        console.log('Department ID:', res.data.departmentId);

        // use id to fetch department details
        this.campusApi.getDepartmentById(res.data.departmentId).subscribe();
      }
    },
    error: () => {
      console.error('Failed to fetch department by email');
    }
  });
}





 get currentAnnouncement(): AnnouncementItem | null {
  return this.selectedAnnouncement();
}


  get announcementDate(): string {
    const announcement = this.currentAnnouncement;
    if (!announcement) return '';
    
    // Format date from eventDate or createdAt
    const dateStr = announcement.eventDate || announcement.createdAt;
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    }
     catch {
      return '';
    }
  }

 onAnnouncementDotClick(index: number): void {
  if (index < 0 || index >= this.announcements().length) return;
  this.currentAnnouncementIndex = index;
}


  getDefaultDate(): string {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }

  loadPlacedStudents(): void {
    this.loadingPlacedStudents.set(true);
    
    const campusId = this.getCampusId();
    if (!campusId) {
      console.error('CampusHomeComponent: Campus ID not found for getPlacedStudents');
      this.loadingPlacedStudents.set(false);
      return;
    }
    
    // Use dashboard API endpoint: GET /dashboard/placed-students
    // API uses 0-indexed pagination (page=0 for first page)
    this.campusApi
      .getPlacedStudents(this.placedStudentsPage, this.peoplePageSize, undefined, undefined, campusId)
      .pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading placed students:', error);
          this.loadingPlacedStudents.set(false);
          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingPlacedStudents.set(false);
          const content = unwrapApiResponse<PlacedStudentResponse[]>(response);
          if (Array.isArray(content)) {
            const items = content.map((item) => this.mapPlacedStudentToPersonCard(item));
            
            this.placedStudents.set(items);
            const totalPages = response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
              ? (response.data.totalPages ?? 1)
              : 1;
            this.placedStudentsTotalPages.set(Math.max(1, totalPages));
          } else {
            console.warn('CampusHomeComponent: ⚠️ Response not successful or no data');
            console.warn('CampusHomeComponent: Response success:', response?.success);
            console.warn('CampusHomeComponent: Response message:', response?.message);
            console.warn('CampusHomeComponent: Response data exists:', !!response?.data);
            this.placedStudents.set([]);
            this.placedStudentsTotalPages.set(1);
          }
        },
        error: () => {
          this.loadingPlacedStudents.set(false);
          this.placedStudents.set([]);
          this.placedStudentsTotalPages.set(1);
        },
      });
  }

  onPlacedStudentsPageChange(page: number): void {
    // Carousel component uses 1-based indexing, convert to 0-based for API
    const apiPage = page - 1;
    if (apiPage !== this.placedStudentsPage && apiPage >= 0) {
      this.placedStudentsPage = apiPage;
      this.loadPlacedStudents();
    }
  }

  // Companies Visited - API Integration
// Companies Visited - API Integration
loadCompaniesVisited(): void {

  // ---------- campusId ----------
  const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

  if (!campusId || !campusId.trim()) {
    console.error('CampusHomeComponent: ❌ Campus ID not found in storage for getCompaniesVisited');
    this.loadingCompaniesVisited.set(false);
    this.companiesVisited.set([]);
    this.companiesVisitedTotalPages.set(1);
    return;
  }

  const cleanCampusId = campusId.trim().replace(/^CAMPUS-/i, '');

  // ---------- loader ----------
  this.loadingCompaniesVisited.set(true);

  // ---------- API ----------
  this.campusApi
    .getCompaniesVisited(
      this.companiesVisitedPage,
      this.companiesVisitedPageSize,
      cleanCampusId
    )
    .pipe(
      catchError((error) => {
        console.error('CampusHomeComponent: Error loading companies visited:', error);
        this.loadingCompaniesVisited.set(false);
        return of(null);
      })
    )
    .subscribe({
      next: (response) => {

        this.loadingCompaniesVisited.set(false);

        // ⭐ DEBUG API RESPONSE
        console.log('COMPANIES VISITED API RESPONSE:', response);

        if (!response) {
          console.warn('CampusHomeComponent: ⚠️ Response is null or undefined');
          this.companiesVisited.set([]);
          this.companiesVisitedTotalPages.set(1);
          return;
        }

        // ---------- unwrap ----------
        const content = unwrapApiResponse<CompanyVisitedItem[]>(response);

        // ⭐ DEBUG UNWRAPPED DATA
        console.log('COMPANIES VISITED CONTENT:', content);

        if (Array.isArray(content)) {

          const mappedItems = content.map((item) => ({
            ...this.mapCompanyVisitedToCard(item),
            departmentId: item.departmentId || null,
          }));

          // ⭐ DEBUG FINAL MAPPED DATA
          console.log('MAPPED COMPANIES:', mappedItems);

          this.companiesVisited.set(mappedItems);

          const totalPages =
            response.data &&
            typeof response.data === 'object' &&
            !Array.isArray(response.data)
              ? (response.data.totalPages ?? 1)
              : 1;

          this.companiesVisitedTotalPages.set(Math.max(1, totalPages));

        } 
        else {

          console.warn('CampusHomeComponent: ⚠️ Response not successful or no data');
          console.warn('CampusHomeComponent: Full response:', response);

          this.companiesVisited.set([]);
          this.companiesVisitedTotalPages.set(1);
        }
      },

      error: (error) => {

        console.error('CampusHomeComponent: ❌ COMPANIES VISITED ERROR ❌');
        console.error('Error object:', error);

        this.loadingCompaniesVisited.set(false);
        this.companiesVisited.set([]);
        this.companiesVisitedTotalPages.set(1);

        const errorMessage =
          error?.error?.message ||
          error?.error?.error ||
          error?.message ||
          'Failed to load companies visited';

        this.notify.error(errorMessage);

        try {
          this.cdr.detectChanges();
        } 
        catch (e) {
          console.debug('detectChanges error ignored', e);
        }
      },
    });
}

  onCompaniesVisitedPageChange(page: number): void {
    // Carousel component sends 1-based page numbers, convert to 0-based for API
    const apiPage = page - 1;
    const totalPages = this.companiesVisitedTotalPages();
    
    // Validate page number
    if (apiPage < 0 || apiPage >= totalPages) {
      console.warn('CampusHomeComponent: Invalid page number:', page, 'Total pages:', totalPages);
      return;
    }
    
    if (apiPage !== this.companiesVisitedPage) {
      this.companiesVisitedPage = apiPage;
      this.loadCompaniesVisited();
    }
  }

  getCompaniesVisitedPageNumbers(): number[] {
    const totalPages = this.companiesVisitedTotalPages();
    const maxVisiblePages = 6; // Show max 6 page numbers
    const currentPage = this.companiesVisitedPage + 1; // Convert to 1-based for display
    
    if (totalPages <= maxVisiblePages) {
      // Show all pages if total is less than max
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    // Show pages around current page
    const pages: number[] = [];
    let startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Adjust start if we're near the end
    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  onCompanyImageError(event: Event, company: CompanyVisitedCard): void {
    const img = event.target as HTMLImageElement;
    console.error('CampusHomeComponent: ❌ Image failed to load for company:', company.companyName);
    console.error('CampusHomeComponent: Failed image URL:', img.src);
    console.error('CampusHomeComponent: Company data:', company);
    
    // Set fallback image
    img.src = 'assets/images/login-news-image.png';
    img.alt = `${company.companyName} (fallback)`;
  }

private mapCompanyVisitedToCard(item: CompanyVisitedItem): CompanyVisitedCard {

  let imageUrl = 'assets/images/login-news-image.png';

  const logoUrlValue = item.logourl || item.logoUrl;

  if (logoUrlValue) {
    const logoUrl = logoUrlValue.trim();
    const cleanUrl = logoUrl.endsWith(',') ? logoUrl.slice(0, -1) : logoUrl;

    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      imageUrl = cleanUrl;
    } 
    else if (cleanUrl.startsWith('/')) {
      imageUrl = `/api/v1/files${cleanUrl}`;
    } 
    else if (cleanUrl !== '') {
      imageUrl = `/api/v1/files/${cleanUrl}`;
    } 
    else {
      console.warn('Empty logo URL for company:', item.companyName);
    }
  }

  // ⭐ DEBUG LOG (safe – production flow break nahi karega)
  console.log('Mapped Company Item:', {
    id: item.id,
    publicCompanyId: item.publicCompanyId,
    companyName: item.companyName
  });

  return {
    id: item.id ?? '',
    publicCompanyId: item.publicCompanyId ?? '',
    companyName: item.companyName ?? 'Unknown Company',
    logoUrl: imageUrl,
    departmentId: item.departmentId ?? null,
    departmentName: item.departmentName ?? null,
  };
}

  // Current Batch - API Integration
  loadBatches(): void {
    this.loadingBatches.set(true);
    // This endpoint should return batches for the current campus
    this.campusApi.getAllBatches().pipe(
      map((response: BatchesResponse | null) => {
        const items = unwrapApiResponse<string[]>(response);
        if (Array.isArray(items)) {
          // Filter and validate batch strings
          const batches = items
            .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
            .map(batch => batch.trim());
          return batches;
        }

        console.warn('CampusHomeComponent: getAllBatches - No valid batches in response');
        return [];
      }),
      catchError((error) => {
        console.error('CampusHomeComponent: Error loading batches from getAllBatches, trying fallback:', error);
        // Fallback to getBatchesForDropdown if getAllBatches fails
        return this.campusApi.getBatchesForDropdown().pipe(
          map((batches: string[]) => {
            // Filter and validate batch strings
            const filtered = batches
              .filter(batch => batch && typeof batch === 'string' && batch.trim() !== '' && batch !== 'string')
              .map(batch => batch.trim());
            return filtered;
          }),
          catchError((fallbackError) => {
            console.error('CampusHomeComponent: Both batch endpoints failed:', fallbackError);
            return of([]);
          })
        );
      })
    ).subscribe({
      next: (batches: string[]) => {
        this.loadingBatches.set(false);
        if (batches.length > 0) {
          this.batches.set(batches);

          // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
          setTimeout(() => {
            // Use student's current batch from Student module (NOT first batch)
            const studentBatch = this.studentCurrentBatch();

            if (!this.selectedBatch()) {
              if (studentBatch && batches.includes(studentBatch)) {
                // Select student's current batch
                this.selectedBatch.set(studentBatch);
                this.noCurrentBatchAssigned.set(false);
                this.loadStudentsByBatch(studentBatch);
              } else if (studentBatch && !batches.includes(studentBatch)) {
                // Student batch not in available batches
                console.warn('CampusHomeComponent: Student batch not found in available batches:', studentBatch);
                this.noCurrentBatchAssigned.set(true);
                this.selectedBatch.set(null);
              } else {
                // No student batch available
                this.noCurrentBatchAssigned.set(true);
                this.selectedBatch.set(null);
              }
            } else if (this.selectedBatch() && batches.includes(this.selectedBatch()!)) {
              // Reload students for currently selected batch if it still exists
              this.loadStudentsByBatch(this.selectedBatch()!);
            } else if (this.selectedBatch() && !batches.includes(this.selectedBatch()!)) {
              // If selected batch no longer exists, show no batch assigned
              this.noCurrentBatchAssigned.set(true);
              this.selectedBatch.set(null);
            }
          }, 0);
        } else {
          console.warn('CampusHomeComponent: No batches available - This campus may not have any students with batch information');
          this.batches.set([]);
          this.selectedBatch.set(null);
        }
      },
      error: (error) => {
        console.error('CampusHomeComponent: Error in batches subscription:', error);
        this.loadingBatches.set(false);
        this.batches.set([]);
        this.selectedBatch.set(null);
      }
    });
  }

  loadStudentsByBatch(batch: string): void {
    if (!batch) {
      console.warn('CampusHomeComponent: loadStudentsByBatch - No batch provided');
      return;
    }
    
    this.loadingCurrentBatch.set(true);
    
    // API uses 0-indexed pagination, so pass currentBatchPage directly
    this.campusApi.getStudentsByBatch(batch, this.currentBatchPage, this.currentBatchPageSize).pipe(
      catchError((error) => {
        console.error('CampusHomeComponent: loadStudentsByBatch - API Error:', error);
        console.error('CampusHomeComponent: Error details:', {
          status: error?.status,
          message: error?.message,
          error: error?.error,
          url: error?.url
        });
        this.loadingCurrentBatch.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response: StudentsByBatchResponse | null) => {
        this.loadingCurrentBatch.set(false);
        if (!response) {
          console.warn('CampusHomeComponent: loadStudentsByBatch - Response is null');
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
          return;
        }
        
        const content = unwrapApiResponse<StudentByBatchData[]>(response);
        if (Array.isArray(content)) {
          const items = content.map((item) => {
            return this.mapStudentByBatchToPersonCard(item);
          });
          this.currentBatch.set(items);
          
          // Use API's totalPages directly (API returns correct pagination info)
          const totalPages = response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
            ? (response.data.totalPages || 1)
            : 1;
          this.currentBatchTotalPages.set(totalPages);
        } else {
          console.warn('CampusHomeComponent: loadStudentsByBatch - Response not successful or no data');
          console.warn('CampusHomeComponent: Response success:', response?.success);
          console.warn('CampusHomeComponent: Response data:', response?.data);
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
        }
      },
      error: (error) => {
        console.error('CampusHomeComponent: loadStudentsByBatch - Subscription Error:', error);
        this.loadingCurrentBatch.set(false);
        this.currentBatch.set([]);
        this.currentBatchTotalPages.set(1);
      }
    });
  }

  private mapStudentByBatchToPersonCard(student: StudentByBatchData): PersonCard {
    const ext = student as Record<string, unknown>;
    const name = student.studentName ||
                 [student.firstName, student.lastName].filter(Boolean).join(' ') ||
                 'Unknown';
    const subtitle = student.batch || '';
    const imageUrl = student.profilePhotoUrl ||
                     student.imageUrl ||
                     'assets/images/login-news-image.png';
    // Only use valid API identifiers - never fallback to name (invalid IDs cause 404)
    const publicStudentId = (ext['publicStudentId'] as string) || student.studentId || student.userId || student.id;
    const id = publicStudentId ? String(publicStudentId).trim() : undefined;

    return {
      id,
      publicStudentId: id,
      name,
      subtitle,
      imageUrl,
    };
  }

  onCurrentBatchPageChange(page: number): void {
    // Carousel component uses 1-indexed pages (1, 2, 3...), but API uses 0-indexed (0, 1, 2...)
    // Convert from 1-indexed to 0-indexed
    const apiPage = page - 1;
    
    if (apiPage !== this.currentBatchPage && apiPage >= 0) {
      this.currentBatchPage = apiPage;
      const selectedBatch = this.selectedBatch();
      if (selectedBatch) {
        this.loadStudentsByBatch(selectedBatch);
      }
    }
  }

  onBatchSelect(batch: string): void {
    this.selectedBatch.set(batch);
    this.currentBatchPage = 0; // Reset to first page (0-indexed) when batch changes
    this.loadStudentsByBatch(batch);
  }

  private mapPlacedStudentToPersonCard(item: {
    // API response fields from GET /dashboard/placed-students (as per API spec)
    id?: string;
    userId?: string | null;
    campusId?: string;
    courseId?: string | null;
    courseName?: string | null;
    studentName?: string;
    photoUrl?: string; // Relative path like "student/0cf39251-9301-4650-bafe-b86597396368.jpg"
    photourl?: string; // Backend may return lowercase 'photourl'
    batch?: string;
    rollNumber?: string | null;
    email?: string | null;
    phone?: string | null;
    placementCompanyId?: string | null;
    placementCompanyName?: string | null;
    placementDate?: string;
    designation?: string;
    sector?: string;
    createdAt?: string;
    updatedAt?: string;
    placed?: boolean;
    // Legacy fields (for backward compatibility)
    firstName?: string;
    lastName?: string;
    profilePhotoUrl?: string;
    companyName?: string;
  }): PersonCard {
    // Construct image URL from photoUrl or photourl (API returns relative path or full URL)
    // Backend may return 'photourl' (lowercase) or 'photoUrl' (camelCase)
    // photoUrl format: "student/0cf39251-9301-4650-bafe-b86597396368.jpg" or full URL
    // Need to construct full URL using API base URL
    let imageUrl = 'assets/images/login-news-image.png'; // Default fallback
    
    // Handle both photoUrl (camelCase) and photourl (lowercase) from backend
    const photoUrl = item.photoUrl || item.photourl;
    
    if (photoUrl) {
      // If photoUrl is already a full URL (starts with http:// or https://), use it as is
      if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) {
        imageUrl = photoUrl;
      } else if (photoUrl.startsWith('/')) {
        // If it starts with /, it's an absolute path - prepend API base URL
        // Construct URL: /api/v1/files/{photoUrl} or similar based on your file serving endpoint
        // For now, try common patterns
        imageUrl = `/api/v1/files/${photoUrl.substring(1)}`; // Remove leading /
      } else {
        // Relative path like "student/filename.jpg" - construct full URL
        // Based on API, files are typically served from /api/v1/files/ endpoint
        imageUrl = `/api/v1/files/${photoUrl}`;
      }
    } else if (item.profilePhotoUrl) {
      // Fallback to profilePhotoUrl for backward compatibility
      if (item.profilePhotoUrl.startsWith('http://') || item.profilePhotoUrl.startsWith('https://') || item.profilePhotoUrl.startsWith('/')) {
        imageUrl = item.profilePhotoUrl;
      } else {
        imageUrl = `/api/v1/files/${item.profilePhotoUrl}`;
      }
    }
    
    // API provides studentName directly - use it as primary source
    const name = item.studentName || 
                 (item.firstName || item.lastName ? [item.firstName, item.lastName].filter(Boolean).join(' ').trim() : null) ||
                 (item.rollNumber ? `Student ${item.rollNumber}` : null) ||
                 (item.email ? item.email.split('@')[0] : null) ||
                 'Unknown';
    
    // Build subtitle with company name and designation
    // API returns placementCompanyName and designation
  // Build subtitle with course name, company name and designation
const subtitleParts: string[] = [];

// 1️⃣ Course name (from backend)
if (item.courseName) {
  subtitleParts.push(item.courseName);
}

// 2️⃣ Company name
const company = item.placementCompanyName || item.companyName || '';
if (company) {
  subtitleParts.push(company);
}

// 3️⃣ Designation
if (item.designation) {
  subtitleParts.push(item.designation);
}

// Fallback if everything is empty
const subtitle = subtitleParts.length > 0
  ? subtitleParts.join('ch | ')
  : (item.batch ? `Batch: ${item.batch}` : '');

    
    // Only set publicStudentId from userId (student's profile ID). Never use item.id (placement record id).
    const publicStudentId = item.userId && String(item.userId).trim() ? item.userId : undefined;

    return {
      id: item.id,
      publicStudentId,
      name,
      subtitle,
      imageUrl,
    };
  }

  alumniPageItems(): readonly PersonCard[] {
    return this.alumni();
  }

  avatarSrc(card: PersonCard): string {
    const src = (card.imageUrl || '').trim();
    return src ? src : createInitialsAvatar(card.name);
  }

  onAvatarError(card: PersonCard, event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = createInitialsAvatar(card.name);
    img.alt = `${card.name} (initials)`;
  }

  
  // Alumni - API Integration (Using Student API)
  loadAlumni(year?: string, useCarousel = false): void {
    const campusId = this.getCampusId();
    const selectedYear = year || this.selectedAlumniYear() || new Date().getFullYear().toString();
    
    if (!campusId) {
      console.warn('CampusHomeComponent: Cannot load alumni - missing campusId');
      this.alumni.set([]);
      this.alumniTotalPages.set(1);
      return;
    }
    
    // Determine which API to use
    if (useCarousel) {
      // Use carousel API (GET /dashboard/alumni/carousel?limit=10)
      this.campusApi.getAlumniForCarousel(10).pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading alumni from carousel API:', error);
          this.loadingAlumni.set(false);
          return of(null);
        })
      ).subscribe({
        next: (response: AlumniDashboardResponse | null) => {
          this.loadingAlumni.set(false);
          
          const items = unwrapApiResponse<AlumniDashboardData[]>(response);
          if (Array.isArray(items)) {
            const mapped = items.map((item) => this.mapAlumniToPersonCard(item));
            this.alumni.set(mapped);
            // Carousel API doesn't have pagination, so set to 1 page
            this.alumniTotalPages.set(1);
          } else {
            this.alumni.set([]);
            this.alumniTotalPages.set(1);
            console.warn('CampusHomeComponent: Alumni carousel response not successful or no data');
          }
        },
        error: (error) => {
          console.error('CampusHomeComponent: Error in alumni carousel subscription:', error);
          this.loadingAlumni.set(false);
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
        }
      });
    } else {
      this.fetchAlumniByCampusBatch(campusId, selectedYear);
    }
  }
  

  private fetchAlumniByCampusBatch(campusId: string, yearOfPassing: string): void {
    this.loadingAlumni.set(true);
    // const safePage = Math.max(0, this.alumniPage);

    this.studentApiService.getAlumniByCampusBatch(
      campusId,
      yearOfPassing,
      this.alumniPage +1,
      this.alumniPageSize
    ).pipe(
      catchError((error) => {
        console.error('CampusHomeComponent: Error loading alumni from student API:', error);
        this.loadingAlumni.set(false);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        this.loadingAlumni.set(false);
        
        const content = unwrapApiResponse<AlumniResponse[]>(response);
        if (Array.isArray(content)) {
          const items = content.map((item) => this.mapStudentAlumniToPersonCard(item));
          this.alumni.set(items);
          
          // Use pagination info from API response
          const totalPages = response?.data && typeof response.data === 'object' && !Array.isArray(response.data)
            ? (response.data.totalPages || 1)
            : 1;
          this.alumniTotalPages.set(Math.max(1, totalPages));
        } else {
          this.alumni.set([]);
          this.alumniTotalPages.set(1);
          console.warn('CampusHomeComponent: Alumni student API response not successful or no data:', response?.message);
        }
        try {
          this.cdr.detectChanges();
        } 
      catch (e) {
  console.debug('detectChanges error ignored', e);
}

      },
      error: (error) => {
        console.error('CampusHomeComponent: Error in alumni student API subscription:', error);
        this.loadingAlumni.set(false);
        this.alumni.set([]);
        this.alumniTotalPages.set(1);
        try {
          this.cdr.detectChanges();
        } 
      catch (e) {
  console.debug('detectChanges error ignored', e);
}

      }
    });
  }

  private loadCurrentBatchStudents(campusId: string, year: string): void {
    const campusName = this.currentBatchCampusName();
    if (!campusName) {
      // Attempt to fetch campus name from profile
      this.campusApi.getCampusById(campusId).subscribe({
        next: (profile) => {
          const name = profile?.campusName || profile?.campusId || null;
          if (name) {
            this.currentBatchCampusName.set(name);
            this.loadCurrentBatchStudents(campusId, year);
          }
        },
        error: () => {
          // ignore
        },
      });
      return;
    }
    this.loadingCurrentBatch.set(true);
    this.loadingCurrentBatchStudents.set(true);
    this.studentApiService
      .getCurrentBatch(campusName, year, this.currentBatchPage + 1, this.currentBatchPageSize)
      .pipe(
        catchError((error) => {
          console.error('CampusHomeComponent: Error loading current batch students:', error);
          this.loadingCurrentBatch.set(false);
          this.loadingCurrentBatchStudents.set(false);
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
          try {
            this.cdr.detectChanges();
          } 
         catch (e) {
  console.debug('detectChanges error ignored', e);
}

          return of(null);
        }),
      )
      .subscribe({
        next: (response) => {
          this.loadingCurrentBatch.set(false);
          this.loadingCurrentBatchStudents.set(false);
          const data = response?.data;
          const pageObj =
            data && !Array.isArray(data) && typeof data === 'object'
              ? (data as Record<string, unknown>)
              : null;
          const contentArray: unknown[] = Array.isArray(data)
            ? data
            : Array.isArray(pageObj?.['content'])
              ? (pageObj?.['content'] as unknown[])
              : [];

          if (response?.success && contentArray.length > 0) {
            const items = contentArray.map((item) =>
              this.mapCurrentBatchToPersonCard(
                item as import('../../../student/models/student.models').BatchmateResponse,
              ),
            );
            this.currentBatch.set(items);
            const totalPages = typeof pageObj?.['totalPages'] === 'number' ? pageObj['totalPages'] : 1;
            this.currentBatchTotalPages.set(Math.max(1, totalPages));
          } else {
            this.currentBatch.set([]);
            this.currentBatchTotalPages.set(1);
            console.warn('CampusHomeComponent: Current batch response empty or unsuccessful');
          }
          try {
            this.cdr.detectChanges();
          } 
        catch (e) {
  console.debug('detectChanges error ignored', e);
}

        },
        error: (error) => {
          console.error('CampusHomeComponent: Error in current batch subscription:', error);
          this.loadingCurrentBatch.set(false);
          this.loadingCurrentBatchStudents.set(false);
          this.currentBatch.set([]);
          this.currentBatchTotalPages.set(1);
          try {
            this.cdr.detectChanges();
          } 
       catch (e) {
  console.debug('detectChanges error ignored', e);
}

        },
      });
  }

  private sidebarCampusName(): string | null {
    return null;
  }

  private loadCampusFilterOptions(): void {
    this.campusApi.getAllCampuses().subscribe({
      next: (campuses) => {
        if (Array.isArray(campuses)) {
          const opts = campuses
            .filter((c) => c?.campusName)
            .map((c) => ({ label: c.campusName as string, value: c.campusName as string }));
          this.campusFilterOptions.set(opts);
          if (!this.currentBatchCampusName() && opts.length > 0) {
            this.currentBatchCampusName.set(opts[0].value);
            this.selectedFilterCampus.set(opts[0].value);
          }
        }
      },
      error: () => {
        // ignore
      },
    });
  }

  openBatchFilterModal(): void {
    this.selectedFilterYear.set(this.currentBatchYear() || this.selectedAlumniYear() || '');
    this.showBatchFilterModal.set(true);
  }

  closeBatchFilterModal(): void {
    this.showBatchFilterModal.set(false);
  }

  applyBatchFilters(): void {
    const year = (this.selectedFilterYear() || this.currentBatchYear() || this.selectedAlumniYear() || '').trim();
    if (!year) {
      this.showBatchFilterModal.set(false);
      return;
    }
    this.currentBatchYear.set(year);
    this.currentBatchPage = 0;
    const campusId = this.getCampusId();
    if (campusId) {
      // Campus name will be auto-fetched in loadCurrentBatchStudents if not already set
      this.loadCurrentBatchStudents(campusId, year);
    }
    this.showBatchFilterModal.set(false);
  }

  onAlumniYearChange(year: string): void {
    this.selectedAlumniYear.set(year);
    this.alumniPage = 0; // Reset to first page when year changes
    this.useCarouselAPI.set(false); // Use regular API when year is selected
    this.loadAlumni(year, false);
  }

  onAlumniPageChange(page: number): void {
  if (this.useCarouselAPI()) {
    return;
  }

  const apiPage = page - 1; // UI → API

  if (apiPage < 0 || apiPage === this.alumniPage) {
    return;
  }

  this.alumniPage = apiPage;

  const selectedYear = this.selectedAlumniYear();
  if (selectedYear) {
    this.loadAlumni(selectedYear, false);
  }
}


  loadCurrentBatchFromFilters(): void {
    const year = this.currentBatchYear() || this.selectedAlumniYear() || new Date().getFullYear().toString();
    const campusId = this.getCampusId();
    if (!campusId) {
      return;
    }
    this.currentBatchYear.set(year);
    this.loadCurrentBatchStudents(campusId, year);
  }

  onCurrentBatchYearChange(year: string): void {
    this.currentBatchYear.set(year);
    this.currentBatchPage = 1;
    this.loadCurrentBatchFromFilters();
  }

  private mapAlumniToPersonCard(item: AlumniDashboardData): PersonCard {
    const ext = item as Record<string, unknown>;
    const name = item.studentName ||
                 [item.firstName, item.lastName].filter(Boolean).join(' ') ||
                 'Unknown';
    const subtitle = [item.designation, item.companyName].filter(Boolean).join(' at ') ||
                    item.yearOfPassing ||
                    '';
    const imageUrl = resolveImageUrl(item.profilePhotoUrl || item.imageUrl, name);
    // Only use valid API identifiers - never fallback to name (invalid IDs cause 404)
    const publicStudentId = (ext['publicStudentId'] as string) || item.studentId || item.userId;
    const id = publicStudentId ? String(publicStudentId).trim() : undefined;

    return {
      id,
      publicStudentId: id,
      name,
      subtitle,
      imageUrl,
    };
  }

  /**
   * Map AlumniResponse from Student API to PersonCard
   */
  private mapStudentAlumniToPersonCard(item: import('../../../student/models/student.models').AlumniResponse): PersonCard {
    const extended = item as Record<string, unknown>;
    const name =
      (extended['name'] as string) ||
      [item.firstName, item.lastName].filter(Boolean).join(' ') ||
      'Unknown';
    const subtitle =
      [item.designation, (extended['company'] as string) ?? item.companyName]
        .filter(Boolean)
        .join(' at ') ||
      (extended['graduationYear'] as string) ||
      item.yearOfPassing ||
      '';
    const imageUrl = resolveImageUrl(
      item.profilePhotoUrl || (extended['imageUrl'] as string),
      name,
    );
    
    // Only use valid API identifiers - never fallback to name (invalid IDs cause 404)
    const publicStudentId = (extended['publicStudentId'] as string) || item.studentId || item.userId || (extended['alumniId'] as string);
    const id = publicStudentId ? String(publicStudentId).trim() : undefined;

    return {
      id,
      publicStudentId: id,
      name,
      subtitle,
      imageUrl,
    };
  }

  private mapCurrentBatchToPersonCard(item: import('../../../student/models/student.models').BatchmateResponse): PersonCard {
    const ext = item as Record<string, unknown>;
    const name =
      item.firstName && item.lastName
        ? `${item.firstName} ${item.lastName}`
        : item.firstName || item.lastName || 'Unknown';
    const subtitle = item.batch || item.yearOfPassing || '';
    const imageUrl = resolveImageUrl(item.profilePhotoUrl, name);
    // Only use valid API identifiers - never fallback to name/subtitle (invalid profile IDs cause 404)
    const publicStudentId = (ext['publicStudentId'] as string) || item.studentId || item.userId;
    const id = publicStudentId ? publicStudentId.trim() : undefined;
    return {
      id,
      publicStudentId: id,
      name,
      subtitle,
      imageUrl,
    };
  }

  closeModal(): void {
    this.modalService.closeModal();
    this.facultyDetailService.clearSelectedFaculty();
  }

  handleFacultyDetailClose(): void {
    this.facultyDetailService.clearSelectedFaculty();
    this.closeModal();
  }

  // Department handlers
handleDepartmentSubmit(value: DepartmentFormValue): void {
  if (this.submittingDepartment) return;

  const campusId = this.getCampusId();

  if (!campusId) {
    this.notify.error('Campus ID not found');
    return;
  }

  this.submittingDepartment = true;

  const formData = new FormData();
  formData.append('departmentName', value.name.trim());
  formData.append('email', value.email.trim());
  formData.append('phone', value.phone.trim());
  formData.append('aboutDepartment', value.about?.trim() || '');

  if (value.photo) {
    formData.append('photo', value.photo);
  }

  this.campusApi.createDepartment(campusId, formData)
    .pipe(
      finalize(() => {
        this.submittingDepartment = false;
        this.cdr.markForCheck();
      })
    )
    .subscribe({
      next: (response: unknown) => {
        const res = response as { success?: boolean; message?: string; error?: string };

        if (res?.success) {
          this.notify.success(res.message || 'Department created successfully');
          this.closeModal();
          this.loadDepartments();
          window.dispatchEvent(new Event('departmentAdded'));
        } else {
          this.notify.error(res?.error || res?.message || 'Failed to create department');
        }
      },

      error: (err: unknown) => {
        let msg = 'Failed to create department';

        if (typeof err === 'object' && err !== null) {
          const errorObj = err as {
            error?: { message?: string; error?: string };
            message?: string;
          };

          msg =
            errorObj.error?.message ||
            errorObj.error?.error ||
            errorObj.message ||
            msg;
        }

        this.notify.error(msg);
      },
    });
}



  handleDepartmentCancel(): void {
    this.closeModal();
  }





  handleFacultyDeleteRequest(facultyId: string): void {
    this.facultyToDeleteId = facultyId;
    this.showDeleteFacultyModal = true;
  }

  closeDeleteFacultyModal(): void {
    this.showDeleteFacultyModal = false;
    this.facultyToDeleteId = null;
  }

  onCourseDeleteRequested(course: { id: string; name: string; departmentId?: string }): void {
    this.courseToDelete.set(course);
    this.showDeleteCourseModal = true;
  }

  onProspectusDeleteRequested(prospectus: { id: string; name: string; departmentId?: string }): void {
    this.prospectusToDelete.set(prospectus);
    this.showDeleteProspectusModal = true;
  }

  closeDeleteProspectusModal(): void {
    this.showDeleteProspectusModal = false;
    this.prospectusToDelete.set(null);
  }

  confirmDeleteProspectus(): void {
    const toDelete = this.prospectusToDelete();
    if (!toDelete || this.deletingProspectus) return;

    this.deletingProspectus = true;
    const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string;

    if (!campusId) {
      this.deletingProspectus = false;
      this.notify.error('Campus ID is required to delete prospectus');
      return;
    }

    this.campusApi.deleteProspectus(toDelete.id, campusId, toDelete.departmentId).subscribe({
      next: (response) => {
        this.deletingProspectus = false;
        this.closeDeleteProspectusModal();
        if (response?.success) {
          this.notify.success(response.message || 'Prospectus deleted successfully');
          if (this.prospectusComponent) {
            this.prospectusComponent.refreshProspectusList(campusId);
          }
        } else {
          this.notify.error(response?.error || 'Failed to delete prospectus');
        }
      },
      error: (err) => {
        this.deletingProspectus = false;
        this.closeDeleteProspectusModal();
        const msg = err?.error?.message || err?.message || 'Failed to delete prospectus. Please try again.';
        this.notify.error(msg);
      },
    });
  }

  closeDeleteCourseModal(): void {
    this.showDeleteCourseModal = false;
    this.courseToDelete.set(null);
  }

  confirmDeleteCourse(): void {
    const toDelete = this.courseToDelete();
    if (!toDelete || this.deletingCourse) return;

    this.deletingCourse = true;
    const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string;

    this.campusApi.deleteCourse(toDelete.id, campusId, toDelete.departmentId).subscribe({
      next: (response) => {
        this.deletingCourse = false;
        this.closeDeleteCourseModal();
        if (response?.success) {
          this.notify.success(response.message || 'Course deleted successfully');
          window.dispatchEvent(new Event('courseDeleted'));
          if (this.coursesComponent) {
            this.coursesComponent.loadCourses();
          }
        } else {
          this.notify.error(response?.error || 'Failed to delete course');
        }
      },
      error: (err) => {
        this.deletingCourse = false;
        this.closeDeleteCourseModal();
        const msg = err?.error?.message || err?.message || 'Failed to delete course. Please try again.';
        this.notify.error(msg);
      },
    });
  }

  confirmDeleteFaculty(): void {
    if (!this.facultyToDeleteId || this.deletingFaculty) {
      return;
    }

    this.deletingFaculty = true;
    
    this.campusApi.deleteFaculty(this.facultyToDeleteId).subscribe({
      next: (response) => {
        this.deletingFaculty = false;
        
        if (response?.success) {
          const message = response.message || 'Faculty deleted successfully';
          this.notify.success(message);
          
          // Close both modals
          this.closeDeleteFacultyModal();
          this.closeModal();
          
          // Refresh faculty list by dispatching event (sidebar will listen)
          window.dispatchEvent(new Event('facultyAdded'));
          
          // Also trigger facultyDeleted event for any other listeners
          window.dispatchEvent(new Event('facultyDeleted'));
        } else {
          const errorMessage = response?.error || response?.message || 'Failed to delete faculty';
          this.notify.error(errorMessage);
        }
      },
      error: (err) => {
        this.deletingFaculty = false;
        
        console.error('❌ DELETE FACULTY - ERROR:', err);
        console.error('Error Status:', err?.status);
        console.error('Error Status Text:', err?.statusText);
        console.error('Error URL:', err?.url);
        console.error('Error Message:', err?.message);
        console.error('Error Response:', err?.error);
        
        let errorMessage = 'Failed to delete faculty member';
        
        if (err?.error) {
          if (err.error.message) {
            errorMessage = err.error.message;
          } else if (err.error.error) {
            errorMessage = err.error.error;
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.notify.error(errorMessage);
      },
    });
  }

  handleProspectusUploadSuccess(): void {
    this.closeModal();
  }

  /**
   * Helper method to get campusId from multiple sources
   * Priority:
   * 1. User profile profileServiceId (from auth state)
   * 2. Storage CAMPUS_ID key (fallback)
   * 3. Form value campus field (if valid ID)
   */
  private getCampusId(formValueCampus?: string): string | null {
    // Try from auth state (user profile) - profileServiceId contains campusId
    const currentUser = this.authState.user();
    const campusIdFromUser = currentUser?.profileServiceId || currentUser?.campusId;
    if (campusIdFromUser) {
      return campusIdFromUser;
    }
    
    // Try from storage
    const campusIdFromStorage = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;
    if (campusIdFromStorage) {
      return campusIdFromStorage;
    }
    
    // Try from form value if provided and is a valid ID
    if (formValueCampus && formValueCampus.trim()) {
      const trimmedCampus = formValueCampus.trim();
      // Check if it's a valid ID (not a file name)
      // MongoDB ObjectId: 24-character hex string
      if (/^[0-9a-fA-F]{24}$/.test(trimmedCampus) && !/\.\w+$/.test(trimmedCampus)) {
        return trimmedCampus;
      }
      // Numeric ID (legacy support)
      if (/^\d+$/.test(trimmedCampus) && !/\.\w+$/.test(trimmedCampus)) {
        return trimmedCampus;
      }
    }
    
    return null;
  }

  /**
   * Handle prospectus form submission
   * POST /prospectus/upload?campusId=xxx
   * Body (multipart/form-data): courseName, files[]
   */
 handleProspectusSubmit(value: ProspectusUploadFormValue): void {

  // Prevent double submission
  if (this.submittingProspectus) {
    return;
  }

  // Validate course
  if (!value.course || !value.course.trim()) {
    this.notify.error('Please select a course');
    return;
  }

  // Validate department
  if (!value.department || !value.department.trim()) {
    this.notify.error('Please select a department');
    return;
  }

  // Collect files
  const files: File[] = [];
  if (value.campusFile) files.push(value.campusFile);
  if (value.courseFile) files.push(value.courseFile);

  if (files.length === 0) {
    this.notify.error('Please select at least one prospectus file');
    return;
  }

  // Get campusId from auth state/storage
  const campusId = this.getCampusId(value.campus);

  if (!campusId) {
    this.notify.error('Campus ID not found. Please ensure you are logged in as a campus admin.');
    return;
  }

  // Start submission
  this.submittingProspectus = true;

  // Create FormData
  const formData = new FormData();
  const courseName = value.course.trim();

  formData.append('courseName', courseName);

  // DO NOT append departmentId in formData
  // departmentId will go as query param via service

  files.forEach((file) => {
    formData.append('files', file);
  });

  //  CALL API (addCourse jaisa)
  this.campusApi.uploadProspectus(
    campusId,
    formData,
    value.department //  query param
  ).subscribe({

    next: (response) => {
      this.submittingProspectus = false;

      if (response?.success) {

        const successMessage = response.message || 'Prospectus uploaded successfully';
        this.notify.success(successMessage);

        // Refresh list
        setTimeout(() => {
          if (this.prospectusComponent) {
            this.prospectusComponent.refreshProspectusList(campusId);

            setTimeout(() => {
              if (this.prospectusComponent) {
                this.prospectusComponent.resetForm();

                setTimeout(() => {
                  if (this.prospectusComponent) {
                    this.prospectusComponent.refreshProspectusList(campusId);
                  }
                }, 100);
              }
            }, 500);
          }
        }, 1000);

        try {
          this.cdr.detectChanges();
        } 
       catch (e) {
  console.debug('detectChanges error ignored', e);
}


      } else {
        const errorMsg = response?.error || response?.message || 'Failed to upload prospectus';
        this.notify.error(errorMsg);
      }
    },

    error: (err) => {
      this.submittingProspectus = false;

      let errorMessage = 'Failed to upload prospectus';

      if (err?.error?.message && err.error.message !== 'null') {
        errorMessage = err.error.message;
      } else if (err?.error?.error && err.error.error !== 'null') {
        errorMessage = err.error.error;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      this.notify.error(errorMessage);

      try {
        this.cdr.detectChanges();
      } 
    catch (e) {
  console.debug('detectChanges error ignored', e);
}

    }
  });
}



handleCompaniesSubmit(value: CompaniesVisitedFormValue): void {

  // ---------- validation ----------
  if (!value.companyLogo) {
    this.submittingCompanies = false;
    this.notify.error('Please select a company logo');
    return;
  }

  if (!value.companyName.trim()) {
    this.submittingCompanies = false;
    this.notify.error('Please enter a company name');
    return;
  }

  this.submittingCompanies = true;

  // ---------- campusId ----------
  const campusId = this.storage.get(STORAGE_KEYS.CAMPUS_ID) as string | null;

  if (!campusId || !campusId.trim()) {
    this.submittingCompanies = false;
    this.notify.error('Campus ID not found');
    return;
  }

  const cleanCampusId = campusId.trim().replace(/^CAMPUS-/i, '');

  // ---------- FormData ----------
  const formData = new FormData();

  formData.append('companyName', value.companyName.trim());
  formData.append('logo', value.companyLogo);

  // ❗ IMPORTANT:
  // departmentId body me nahi bhejna — backend query param me leta hai
  const departmentId =
    value.departmentId && value.departmentId.trim()
      ? value.departmentId.trim()
      : undefined;

  console.log('SELECTED DEPARTMENT ID:', departmentId);

  // ---------- API ----------
  this.campusApi
    .addCompanyVisited(cleanCampusId, formData, departmentId)
    .subscribe({
      next: (response) => {
        this.submittingCompanies = false;

        if (response && response.success !== false) {
          this.notify.success(
            response?.message || 'Company visited added successfully'
          );

          this.companiesVisitedComponent?.resetForm();
          this.closeModal();

          this.companiesVisitedPage = 0;
          this.loadCompaniesVisited();
        } else {
          this.notify.error(
            response?.error || 'Failed to add company visited'
          );
        }
      },

      error: (err) => {
        this.submittingCompanies = false;

        const msg =
          err?.error?.message ||
          err?.error?.error ||
          err?.message ||
          'Failed to add company visited';

        this.notify.error(msg);
      },
    });
}

handlePlacedStudentsSubmit(value: PlacedStudentsFormValue): void {

  const campusId: string | undefined = this.getCampusId() || undefined;

  const formData = new FormData();

  // Swagger PlacedStudentRequest (multipart): studentName, photo, courseId/courseName, departmentId, batch, placementCompanyId/placementCompanyName, designation, sector
  formData.append('studentName', value.studentName?.trim() || '');
  if (value.studentPhoto) {
    formData.append('photo', value.studentPhoto);
  }
  formData.append('courseName', value.course?.trim() || '');
  formData.append('batch', value.batch?.trim() || '');
  formData.append('placementCompanyName', value.placementCompany?.trim() || '');
  formData.append('designation', value.designation?.trim() || '');
  formData.append('sector', value.sector?.trim() || '');

  const departmentId: string | undefined = value.department || undefined;

  this.submittingPlacedStudents = true;

  this.campusApi
    .addPlacedStudent(formData, departmentId, campusId)
    .subscribe({
      next: (response) => {
        this.submittingPlacedStudents = false;

        if (response && response.success !== false) {
          this.notify.success(
            response?.message || 'Placed student added successfully'
          );

          this.placedStudentsComponent?.resetForm();
          this.closeModal();

          this.placedStudentsPage = 0;
          this.loadPlacedStudents();
        } else {
          this.notify.error(
            response?.error || 'Failed to add placed student'
          );
        }
      },
      error: (err) => {
        this.submittingPlacedStudents = false;

        const msg =
          err?.error?.message ||
          err?.error?.error ||
          err?.message ||
          'Failed to add placed student';

        this.notify.error(msg);
      },
    });
}



  private convertFileToBase64(file: File | null): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!file) {
        resolve('');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,") and return just the base64 string
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'));
      };
      reader.readAsDataURL(file);
    });
  }

  // ================= DOB + EXPERIENCE + QUALIFICATION VALIDATION =================

private calculateAge(dob: string): number {
  if (!dob) return 0;
  const birthYear = new Date(dob).getFullYear();
  const currentYear = new Date().getFullYear();
  return currentYear - birthYear;
}

private extractExperienceYears(exp: string): number {
  if (!exp) return 0;

  const yearsStr = exp.trim();

  if (yearsStr.includes('-')) {
    const parts = yearsStr.split('-');
    const upper = parseInt(parts[1], 10);
    return isNaN(upper) ? 0 : upper;
  }

  if (yearsStr.endsWith('+')) {
    const num = parseInt(yearsStr.replace('+', ''), 10);
    return isNaN(num) ? 0 : num;
  }

  const num = parseInt(yearsStr, 10);
  return isNaN(num) ? 0 : num;
}

private detectQualificationLevel(q: string): 'UG' | 'PG' | 'PHD' | 'OTHER' {
  if (!q) return 'OTHER';

  const text = q.toLowerCase();

  if (text.includes('phd') || text.includes('doctor')) return 'PHD';
  if (text.includes('master') || text.includes('mba') || text.includes('mtech')) return 'PG';
  if (text.includes('btech') || text.includes('bsc') || text.includes('ba') || text.includes('bcom')) return 'UG';

  return 'OTHER';
}

private isFacultyDataLogical(value: FacultyFormValue): string | null {
  const age = this.calculateAge(value.dateOfBirth);

  if (age <= 0) return 'Invalid date of birth';

  for (const info of value.professionalInfo) {

    const experience = this.extractExperienceYears(info.yearsOfExperience);
    const qualification = this.detectQualificationLevel(info.qualifications);

    // Rule 1: working age
    if (age < 21 && experience > 0) {
      return 'Experience cannot be added for age below 21';
    }

    // Rule 2: experience vs age
    if (experience > (age - 21)) {
      return 'Entered experience is not logically possible as per Date of Birth';
    }

    // Rule 3: qualification vs age
    if (qualification === 'PG' && age < 23) {
      return 'Post Graduation not possible for this age';
    }

    if (qualification === 'PHD' && age < 26) {
      return 'PhD qualification not possible for this age';
    }
  }

  return null;
}

// ================= DOB RANGE VALIDATION =================

private validateDobRange(dob: string): string | null {

  if (!dob) return 'Date of birth is required';

  const today = new Date();
  const selected = new Date(dob);

  const minAge = 21;
  const maxAge = 70;

  const age = today.getFullYear() - selected.getFullYear();

  if (selected > today) {
    return 'Future date is not allowed';
  }

  if (age < minAge) {
    return 'Faculty age must be at least 21 years';
  }

  if (age > maxAge) {
    return 'Faculty age cannot be more than 70 years';
  }

  return null;
}
// ================= PHONE VALIDATION =================

private isValidIndianPhone(phone: string): string | null {
  if (!phone) return 'Phone number is required';

  const cleaned = phone.trim();

  // only digits allowed
  if (!/^\d+$/.test(cleaned)) {
    return 'Phone number must contain digits only';
  }

  // exactly 10 digits
  if (cleaned.length !== 10) {
    return 'Phone number must be exactly 10 digits';
  }

  // must start from 6–9
  if (!/^[6-9]/.test(cleaned)) {
    return 'Phone number must start with 6, 7, 8, or 9';
  }

  // repeated digits (9999999999)
  if (/^(\d)\1{9}$/.test(cleaned)) {
    return 'Invalid phone number pattern';
  }

  // sequential increasing
  if (cleaned === '1234567890') {
    return 'Invalid phone number pattern';
  }

  // sequential decreasing
  if (cleaned === '9876543210') {
    return 'Invalid phone number pattern';
  }

  return null;
}


  handleFacultySubmit(value: FacultyFormValue): void {
    // Validate required fields
    if (
      !value.fullName?.trim() ||
      !value.email?.trim() ||
      !value.dateOfBirth?.trim() ||
      !value.phoneNumber?.trim()
    )

    
    
    {
      this.submittingFaculty = false;
      this.notify.error('Please fill all required fields');
      return;
    }

      // ================= LOGICAL VALIDATION (PASTE HERE) =================

  const logicalError = this.isFacultyDataLogical(value);

  if (logicalError) {
    this.submittingFaculty = false;
    this.notify.error(logicalError);
    return;
  }

  // ================= PHONE VALIDATION =================

const phoneError = this.isValidIndianPhone(value.phoneNumber);

// DUPLICATE PHONE CHECK
if (this.existingFacultyPhones.includes(value.phoneNumber.trim())) {
  this.submittingFaculty = false;
  this.notify.error('Faculty with this phone number already exists');
  return;
}

if (phoneError) {
  this.submittingFaculty = false;
  this.notify.error(phoneError);
  return;
}

const dobError = this.validateDobRange(value.dateOfBirth);

if (dobError) {
  this.submittingFaculty = false;
  this.notify.error(dobError);
  return;
}
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.email.trim())) {
      this.submittingFaculty = false;
      this.notify.error('Please enter a valid email address');
      return;
    }

    // Validate professional info
    if (!value.professionalInfo || value.professionalInfo.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Please add at least one professional information entry');
      return;
    }

    // Validate each professional info entry
    for (const info of value.professionalInfo) {
      const designation = (info.designation ?? '').trim();
      const department = (info.department ?? '').trim();
      const yearsOfExp = (info.yearsOfExperience ?? '').trim();
      if (
        !designation ||
        (!this.isDepartmentUser && !department) ||
        !yearsOfExp
      ) {
        this.submittingFaculty = false;
        this.notify.error('Please fill all required fields in professional information');
        return;
      }
    }

    this.submittingFaculty = true;

    // Prepare basic information JSON
    // Convert date format from input (YYYY-MM-DD) to API format (YYYY-MM-DD)
    // The date input already provides YYYY-MM-DD format, but let's ensure it's correct
    let dateOfBirth = value.dateOfBirth.trim();
    
        // If date is in MM/DD/YYYY format, convert to YYYY-MM-DD
        if (dateOfBirth.includes('/')) {
          const parts = dateOfBirth.split('/');
          if (parts.length === 3) {
            dateOfBirth = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
          }
        }
    
    const basicInformation: {
      fullName: string;
      email: string;
      dateOfBirth: string;
      phoneNumber: string;
      photo?: File | null;
    } = {
      fullName: value.fullName.trim(),
      email: value.email.trim(),
      dateOfBirth: dateOfBirth,
      phoneNumber: value.phoneNumber.trim(),
    };
    
    // Note: Photo is not included in JSON request body
    // If photo is required, backend should handle it separately or we need to use FormData

    // Prepare professional information JSON
    // According to backend API (from Swagger/Postman):
    // - designation: array of strings (e.g., ["PRINCIPAL"])
    // - department: array of strings (e.g., ["School Administration"])
    // - specialization: array of strings (e.g., ["Academic Management", "Educational Leadership"])
    // - yearsOfExperience: array of numbers (e.g., [22]) - IMPORTANT: Backend expects ARRAY!
    // - qualifications: array of strings
    // - certificates: array of strings
    let professionalInformation: {
      designation: string[];
      department: string[];
      specialization: string[];
      yearsOfExperience: number[]; // ARRAY of numbers, not single number!
      qualifications: string[];
      certificates: string[];
    }[] = [];
    
    try {
      professionalInformation = value.professionalInfo.map((info, index) => {
        // Parse qualifications - split by comma or newline if multiple, otherwise single item array
        const qualificationsStr = (info.qualifications || '').trim();
        const qualificationsArray = qualificationsStr
          ? qualificationsStr.split(/[,\n]/).map(q => q.trim()).filter(q => q.length > 0)
          : [];
        
        // Certificates - empty array for now (files would need to be uploaded separately)
        // If certificates are provided as file names, they would be added here
        const certificatesArray: string[] = [];
        
        // Convert designation, department, specialization to arrays
        // Ensure values are trimmed and not empty
        const designationValue = (info.designation || '').trim();
        const specializationValue = (info.specialization || '').trim();
        let departmentValue = (info.department || '').trim();

if (!departmentValue && this.isDepartmentUser) {
  departmentValue = this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string || '';
}

if (!departmentValue && !this.isDepartmentUser) {
  throw new Error(`Professional info entry ${index + 1}: Department is required`);
}

        if (!designationValue) {
          throw new Error(`Professional info entry ${index + 1}: Designation is required`);
        }
     
    
        
        const designationArray = [designationValue];
        const departmentArray = [departmentValue];
const specializationArray = specializationValue ? [specializationValue] : [];
        
        // Parse yearsOfExperience from string to number
        // Format could be "1-5", "6-10", "11-15", "16+", or a direct number like "10"
        let yearsOfExperienceNum = 0;
        const yearsStr = (info.yearsOfExperience || '').trim();
        if (!yearsStr) {
          throw new Error(`Professional info entry ${index + 1}: Years of experience is required`);
        }
        
        // If it's a range like "1-5", take the midpoint or upper bound
        if (yearsStr.includes('-')) {
          const parts = yearsStr.split('-');
          if (parts.length === 2) {
            const lower = parseInt(parts[0].trim(), 10);
            const upper = parseInt(parts[1].trim(), 10);
            if (!isNaN(lower) && !isNaN(upper) && lower >= 0 && upper > 0) {
              yearsOfExperienceNum = upper; // Use upper bound
            } else {
              throw new Error(`Professional info entry ${index + 1}: Invalid years of experience range`);
            }
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience format`);
          }
        } else if (yearsStr.endsWith('+')) {
          // Handle "16+" format
          const num = parseInt(yearsStr.replace('+', '').trim(), 10);
          if (!isNaN(num) && num > 0) {
            yearsOfExperienceNum = num;
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience format`);
          }
        } else {
          // Direct number
          const num = parseInt(yearsStr, 10);
          if (!isNaN(num) && num > 0) {
            yearsOfExperienceNum = num;
          } else {
            throw new Error(`Professional info entry ${index + 1}: Invalid years of experience`);
          }
        }
        
        // Validate yearsOfExperience is not zero
        if (yearsOfExperienceNum <= 0) {
          throw new Error(`Professional info entry ${index + 1}: Years of experience must be greater than 0`);
        }
        
        // Create object with ALL fields explicitly defined
        // IMPORTANT: Backend expects yearsOfExperience as ARRAY of numbers, not single number!
        const professionalInfoObj: {
          designation: string[];
          department: string[];
          specialization: string[];
          yearsOfExperience: number[]; // Backend expects ARRAY of numbers!
          qualifications: string[];
          certificates: string[];
        } = {
          designation: designationArray,
          department: departmentArray,
          specialization: specializationArray,
          yearsOfExperience: [yearsOfExperienceNum], // Send as ARRAY: [10] not 10
          qualifications: qualificationsArray,
          certificates: certificatesArray,
        };
        
        return professionalInfoObj;
      });
    } catch (error) {
      this.submittingFaculty = false;
      const errorMessage = error instanceof Error ? error.message : 'Invalid professional information data';
      this.notify.error(errorMessage);
      return;
    }

    // Backend expects professionalInformation as a single object, not an array.
    if (professionalInformation.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('At least one professional information entry is required');
      return;
    }
    
    // Use only the first professional information entry.
    const professionalInformationObj = professionalInformation[0];
    
    if (professionalInformation.length > 1) {
      console.warn('Multiple professional information entries provided. Only the first one will be saved.');
    }

    // Validate the professional information object has all required fields
    if (!professionalInformationObj.designation || professionalInformationObj.designation.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Designation is required');
      return;
    }
    if (!professionalInformationObj.department || professionalInformationObj.department.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Department is required');
      return;
    }
 
    // Validate yearsOfExperience is an array of numbers
    if (!Array.isArray(professionalInformationObj.yearsOfExperience) || professionalInformationObj.yearsOfExperience.length === 0 || !professionalInformationObj.yearsOfExperience.every((y: number) => typeof y === 'number' && y > 0)) {
      this.submittingFaculty = false;
      this.notify.error('Valid years of experience is required');
      return;
    }
    // Ensure qualifications and certificates are arrays (even if empty)
    // Backend accepts empty arrays, but let's ensure they're always arrays
    if (!Array.isArray(professionalInformationObj.qualifications)) {
      professionalInformationObj.qualifications = [];
    }
    if (!Array.isArray(professionalInformationObj.certificates)) {
      professionalInformationObj.certificates = [];
    }
    
    // Additional validation: Check for null or undefined values in arrays
    professionalInformationObj.designation = professionalInformationObj.designation.filter(d => d != null && d.trim() !== '');
    professionalInformationObj.department = professionalInformationObj.department.filter(d => d != null && d.trim() !== '');
    professionalInformationObj.specialization = professionalInformationObj.specialization.filter(s => s != null && s.trim() !== '');
    professionalInformationObj.qualifications = professionalInformationObj.qualifications.filter(q => q != null && q.trim() !== '');
    professionalInformationObj.certificates = professionalInformationObj.certificates.filter(c => c != null && c.trim() !== '');
    
    // Validate after filtering
    if (professionalInformationObj.designation.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Designation is required and cannot be empty');
      return;
    }
    if (professionalInformationObj.department.length === 0) {
      this.submittingFaculty = false;
      this.notify.error('Department is required and cannot be empty');
      return;
    }
 // specialization optional
if (!professionalInformationObj.specialization) {
  professionalInformationObj.specialization = [];
}

    // Prepare request data (JSON format - EXACTLY like backend expects)
    // IMPORTANT: Backend expects professionalInformation as a SINGLE OBJECT, not an array!
    // Backend format: { basicInformation: {...}, professionalInformation: {...} }
    const requestData: {
      basicInformation: {
        fullName: string;
        email: string;
        dateOfBirth: string;
        phoneNumber: string;
      };
      professionalInformation: {
        designation: string[];
        department: string[];
        specialization: string[];
        yearsOfExperience: number[]; // Array: [22]
        qualifications: string[];
        certificates: string[];
      };
    } = {
      basicInformation: {
        fullName: basicInformation.fullName,
        email: basicInformation.email,
        dateOfBirth: basicInformation.dateOfBirth,
        phoneNumber: basicInformation.phoneNumber,
      },
      professionalInformation: professionalInformationObj,
    };

    // Check authentication
    const token = this.authState.token();
    
    if (!token) {
      this.submittingFaculty = false;
      this.notify.error('Authentication required. Please login again.');
      return;
    }
    
    const isEditMode = this.isEditFacultyMode() && this.editingFacultyId;
    
    if (isEditMode && this.editingFacultyId) {
      this.campusApi.updateFaculty(this.editingFacultyId, {
        basicInformation: requestData.basicInformation,
        professionalInformation: requestData.professionalInformation,
      }, undefined, undefined, value.photo).subscribe({
        next: (response) => {
          setTimeout(() => {
            if (response === null) {
              this.submittingFaculty = false;
              this.notify.warn('Faculty might have been updated, but response format was unexpected. Please refresh the page.');
              this.closeModal();
              this.editingFacultyId = null;
              this.isEditFacultyMode.set(false);
              this.facultyToEdit.set(null);
              window.dispatchEvent(new Event('facultyAdded'));
              try { this.cdr.detectChanges(); } catch { /* ignore */ }
              return;
            }
            this.submittingFaculty = false;
            this.notify.success(response?.message || 'Faculty updated successfully!');
            this.editingFacultyId = null;
            this.isEditFacultyMode.set(false);
            this.facultyToEdit.set(null);
            this.closeModal();
            window.dispatchEvent(new Event('facultyAdded'));
            try { this.cdr.detectChanges(); } catch { /* ignore */ }
          }, 0);
        },
        error: (err) => {
          setTimeout(() => {
            this.submittingFaculty = false;
            let errorMessage = 'Failed to update faculty';
            if (err?.status === 401) errorMessage = 'Unauthorized: Your session has expired. Please login again.';
            else if (err?.status === 403) errorMessage = 'Forbidden: You do not have permission to update faculty.';
            else if (err?.error?.message) errorMessage = err.error.message;
            this.notify.error(errorMessage);
            try { this.cdr.detectChanges(); } catch { /* ignore */ }
          }, 0);
        },
      });
      return;
    }
    
    this.campusApi.addFaculty(requestData, undefined, undefined, value.photo).subscribe({
      next: (response) => {
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          // Check if response is null (API service returned null)
          if (response === null) {
            this.submittingFaculty = false;
            this.notify.warn('Faculty might have been added, but response format was unexpected. Please refresh the page.');
            this.facultyFormValue.set(this.getDefaultFacultyFormValue());
            this.closeModal();
            window.dispatchEvent(new Event('facultyAdded'));
            
            try {
              this.cdr.detectChanges();
            } catch {
              // Component might be destroyed, ignore
            }
            return;
          }
          
          this.submittingFaculty = false;
          const successMessage = response?.message || 'Faculty added successfully!';
          this.notify.success(successMessage);

          this.facultyFormValue.set(this.getDefaultFacultyFormValue());
          this.closeModal();
          window.dispatchEvent(new Event('facultyAdded'));

          try {
            this.cdr.detectChanges();
          } catch {
            // Component might be destroyed, ignore
          }
        }, 0);
      },
      error: (err) => {
        // Use setTimeout to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.submittingFaculty = false;
          
          // Log full error for debugging
          console.error('❌❌❌ FACULTY SUBMIT - FULL ERROR DETAILS ❌❌❌');
          console.error('Error Status:', err?.status);
          console.error('Error Status Text:', err?.statusText);
          console.error('Error URL:', err?.url);
          console.error('Error Message:', err?.message);
          console.error('Error Object:', err);
          console.error('Error Error (backend response):', err?.error);
          console.error('Error Error (stringified):', JSON.stringify(err?.error, null, 2));
          
          if (err?.error) {
            console.error('=== BACKEND ERROR RESPONSE ===');
            console.error('Success:', err.error.success);
            console.error('Message:', err.error.message);
            console.error('Error:', err.error.error);
            console.error('Data:', err.error.data);
            if (err.error.errors) {
              console.error('Validation Errors:', JSON.stringify(err.error.errors, null, 2));
              // If errors is an array, log each error
              if (Array.isArray(err.error.errors)) {
                err.error.errors.forEach((validationError: unknown, index: number) => {
                  console.error(`  Validation Error ${index + 1}:`, JSON.stringify(validationError, null, 2));
                });
              } else if (typeof err.error.errors === 'object') {
                // If errors is an object (like field validation errors)
                Object.keys(err.error.errors).forEach((key) => {
                  console.error(`  Field "${key}":`, err.error.errors[key]);
                });
              }
            }
            // Try to extract more specific error information
            if (err.error.message) {
              console.error('📌 BACKEND ERROR MESSAGE:', err.error.message);
            }
            if (err.error.error) {
              console.error('📌 BACKEND ERROR DETAIL:', err.error.error);
            }
            console.error('==============================');
          }
          
          let errorMessage = 'Failed to add faculty';
          if (err?.status === 401) {
            errorMessage = 'Unauthorized: Your session has expired. Please login again.';
          } else if (err?.status === 403) {
            errorMessage = 'Forbidden: You do not have permission to add faculty.';
          } else if (err?.status === 500) {
            // Handle 500 Internal Server Error - Get detailed message
            console.error('⚠️ 500 Internal Server Error - Checking backend error response...');
            
            // Check multiple possible error formats
            if (err?.error?.message && err.error.message !== 'null' && err.error.message.trim() !== '') {
              errorMessage = `Server Error: ${err.error.message}`;
            } else if (err?.error?.error && err.error.error !== 'null' && err.error.error.trim() !== '') {
              errorMessage = `Server Error: ${err.error.error}`;
            } else if (err?.error?.errors && typeof err.error.errors === 'object') {
              const validationErrors = Object.entries(err.error.errors)
                .map(([field, messages]) => {
                  const msg = Array.isArray(messages) ? messages.join(', ') : String(messages);
                  return `${field}: ${msg}`;
                })
                .join('; ');
              errorMessage = validationErrors || 'Server error: Validation failed. Please check all fields.';
            } else {
              errorMessage = 'Server Error (500): Please check browser console (F12) for detailed error message from backend.';
            }
            
            // Also log the full error for developer
            console.error('Final Error Message for User:', errorMessage);
          } else if (err?.status === 502) {
            errorMessage = 'Service temporarily unavailable. Please check your connection and try again.';
          } else if (err?.status === 0) {
            errorMessage = 'Network error: Unable to connect to server.';
          } else if (err?.error?.message && err.error.message !== 'null') {
            errorMessage = err.error.message;
          } else if (err?.error?.error && err.error.error !== 'null') {
            errorMessage = err.error.error;
          } else if (err?.message) {
            errorMessage = err.message;
          }

          // Check for validation errors again (for any status code)
          if (err?.error?.errors && typeof err.error.errors === 'object') {
            const validationErrors = Object.entries(err.error.errors)
              .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('; ');
            if (validationErrors.trim()) {
              errorMessage = validationErrors;
            }
          }
          
          console.error('❌❌❌ END OF ERROR LOG ❌❌❌');
          
          // CRITICAL: Don't close modal, don't redirect, don't clear token
          // Just show error and let user try again
          
          this.notify.error(errorMessage);
          
          // Trigger change detection after state update
          try {
            this.cdr.detectChanges();
          } catch {
            // Ignore if component is destroyed
          }
        }, 0);
      },
    });
  }




handleFacultyCancel(): void {
  this.isEditFacultyMode.set(false);
  this.facultyToEdit.set(null);
  this.facultyFormValue.set(null);
  this.editingFacultyId = null;
  this.modalService.closeModal();
}

  // -------------------- handle department ---------
  

  handleCourseFormSubmit(value: CourseFormValue): void {
    try {
      if (!value || !value.courseName || !value.duration || !value.totalSeats || !value.description) {
        console.error('CampusHomeComponent: ❌ Validation failed - value or fields are missing');
        console.error('CampusHomeComponent: Value object:', value);
        this.submittingCourseForm = false;
        this.notify.error('Please fill all required fields');
        return;
      }
      
      if (!value.courseName.trim() || !value.duration.trim() || !value.totalSeats.trim() || !value.description.trim()) {
        console.warn('CampusHomeComponent: Validation failed - empty required fields');
        this.submittingCourseForm = false;
        this.notify.error('Please fill all required fields');
        return;
      }
    } catch (error) {
      console.error('CampusHomeComponent: ❌ Error in handleCourseFormSubmit validation:', error);
      this.submittingCourseForm = false;
      this.notify.error('An error occurred while processing the form');
      return;
    }

    // Convert duration and totalSeats to numbers
    const durationNum = parseInt(value.duration.trim(), 10);
    const totalSeatsNum = parseInt(value.totalSeats.trim(), 10);

    // Validate that duration and totalSeats are valid numbers
    if (isNaN(durationNum) || durationNum <= 0) {
      console.warn('CampusHomeComponent: Validation failed - invalid duration');
      this.submittingCourseForm = false;
      this.notify.error('Duration must be a valid positive number');
      return;
    }

    if (isNaN(totalSeatsNum) || totalSeatsNum <= 0) {
      console.warn('CampusHomeComponent: Validation failed - invalid total seats');
      this.submittingCourseForm = false;
      this.notify.error('Total seats must be a valid positive number');
      return;
    }

    this.submittingCourseForm = true;

    const request = {
      courseName: value.courseName.trim(),
      duration: durationNum,
      totalSeats: totalSeatsNum,
      description: value.description.trim(),
    };


    try {
this.campusApi.addCourse(
  request,
  undefined,
  value.department || undefined
).subscribe({
      next: (response) => {
        this.submittingCourseForm = false;
        const successMessage = response?.message || 'Course added successfully';
        this.notify.success(successMessage);
        
        // Reset form before closing modal
        if (this.courseFormComponent) {
          this.courseFormComponent.resetForm();
        }
        
        this.closeModal();
        
        // Dispatch event to refresh courses list immediately
        window.dispatchEvent(new Event('courseAdded'));
        
        try {
          this.cdr.detectChanges();
        } 
       catch (e) {
  console.debug('detectChanges error ignored', e);
}

      },
      error: (err) => {
        console.error('CampusHomeComponent: addCourse API error');
        console.error('CampusHomeComponent: Error object:', err);
        console.error('CampusHomeComponent: Error status:', err?.status);
        console.error('CampusHomeComponent: Error URL:', err?.url);
        console.error('CampusHomeComponent: Error response:', err?.error);
        console.error('CampusHomeComponent: Error message:', err?.message);
        
        this.submittingCourseForm = false;
        
        // Extract detailed error message from server response
        let errorMessage = 'Failed to add course';
        if (err?.error) {
          const errorData = err.error;
          // Check if error has data object with field-specific errors
          if (errorData.data && typeof errorData.data === 'object') {
            const fieldErrors = Object.values(errorData.data).filter(msg => typeof msg === 'string');
            if (fieldErrors.length > 0) {
              errorMessage = fieldErrors.join(', ');
            } else if (errorData.message) {
              errorMessage = errorData.message;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        this.notify.error(errorMessage);
        try {
          this.cdr.detectChanges();
        } catch (e) {
  console.debug('detectChanges error ignored', e);
}

      },
    });
    } catch (error) {
      console.error('CampusHomeComponent: ❌ Exception in addCourse API call:', error);
      this.submittingCourseForm = false;
      this.notify.error('An error occurred while calling the API');
      try {
        this.cdr.detectChanges();
      } catch (e) {
  console.debug('detectChanges error ignored', e);
}

    }
  }

  // ---------------- valdation for notice board
validateNoticeTitle(): void {
  const length = (this.noticeTitle || '').trim().length;

  if (!length) {
    this.noticeTitleError = 'Title is required';
    return;
  }

  if (length > 35) {
    this.noticeTitleError = `Maximum 35 characters allowed (${length}/35)`;
    return;
  }

  this.noticeTitleError = '';
}
validateNoticeMessage(): void {
  const length = (this.noticeMessage || '').trim().length;

  if (!length) {
    this.noticeMessageError = 'Message is required';
    return;
  }

  if (length > 300) {
    this.noticeMessageError = `Minimum 300 characters required (${length}/300)`;
    return;
  }

  this.noticeMessageError = '';
}

  // ---------------------- submit notice board ----------------
submitNotice(): void {

  const title = this.noticeTitle?.trim();
  const message = this.noticeMessage?.trim();

  this.validateNoticeTitle();
this.validateNoticeMessage();

if (this.noticeTitleError || this.noticeMessageError) {
  return;
}

  if (!title) {
    this.notify.error('Please enter notice title');
    return;
  }

  if (!message) {
    this.notify.error('Please write a notice');
    return;
  }

  const departmentId =
    this.storage.get(STORAGE_KEYS.DEPARTMENT_ID) as string | null;

  const campusId = this.getCampusId();

  // =========================
  // EDIT MODE
  // =========================
  if (this.isEditMode && this.editingNoticeId) {

this.campusApi.updateNotice(
  this.editingNoticeId!,
  title,           
  message,         
  departmentId || undefined,
  campusId || undefined
)
     .subscribe({

        next: (res: unknown) => {

          const response = res as { message?: string };

          this.notify.success(response?.message || 'Notice updated successfully');

          this.resetNoticeForm();
          this.closeModal();
          this.refreshNoticeListInstant();
          window.dispatchEvent(new Event('noticeAdded'));
        },

        error: (err: unknown) => {

          const errorObj = err as {
            error?: { message?: string };
            message?: string;
          };

          this.notify.error(
            errorObj?.error?.message ||
            errorObj?.message ||
            'Failed to update notice'
          );
        }
      });

    return;
  }

  // =========================
  // CREATE MODE
  // =========================
  this.campusApi
    .createNotice(
      title,
      message,
      departmentId || undefined,
      campusId || undefined
    )
    .subscribe({

      next: (res: unknown) => {

        const response = res as { message?: string };

        this.notify.success(response?.message || 'Notice added successfully');

        this.resetNoticeForm();
        this.closeModal();
        this.refreshNoticeListInstant();
        window.dispatchEvent(new Event('noticeAdded'));
      },

      error: (err: unknown) => {

        const errorObj = err as {
          error?: { message?: string };
          message?: string;
        };

        this.notify.error(
          errorObj?.error?.message ||
          errorObj?.message ||
          'Failed to add notice'
        );
      }
    });
}





}

interface PersonCard {
  id?: string;
   publicStudentId?: string;
  name: string;
  subtitle: string;
  imageUrl: string;
}

interface NoticeItem {
  id?: string;
    title?: string; 
  message?: string;
  createdAt?: string;
  createdByType?: string;
}

function buildInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'A';
  const first = parts[0][0] || '';
  const second = parts.length > 1 ? parts[1][0] : '';
  return (first + second).toUpperCase();
}

/**
 * Create a data URL avatar with initials for cases where no photo URL is available.
 */
function createInitialsAvatar(name: string): string {
  const initials = buildInitials(name || 'A');
  const bg = '#E6F0FF';
  const fg = '#2F4A80';
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="32" ry="32" fill="${bg}"/>
  <text x="50%" y="54%" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${fg}" text-anchor="middle" dominant-baseline="middle">${initials}</text>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`;
}

function resolveImageUrl(value: string | undefined, name: string): string {
  const trimmed = (value || '').trim();
  if (!trimmed) {
    return createInitialsAvatar(name);
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    // If already a /files/... path, keep it; otherwise prefix with /api/v1
    return trimmed.startsWith('/files') ? `/api/v1${trimmed}` : `/api/v1/files${trimmed}`;
  }
  // Treat as relative filename
  return `/api/v1/files/${trimmed}`;
}

interface FeedPost {
  postId: string | null;
  author: string;
  authorId: string;
  authorImageUrl: string;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
  text: string;
  likedByMe: boolean;
  likeCount: number;
  createdAt?: string;
}

function mapPostsToFeedPost(posts: Post[]): FeedPost[] {
  return posts.map((p) => {
    const firstImage = p.imageUrls?.[0];
    const firstVideo = p.videoUrls?.[0];
    const hasImage = !!firstImage;
    const hasVideo = !!firstVideo;
    return {
      postId: p.postId ?? p.id ?? null,
      author: p.author?.displayName ?? p.authorDisplayName ?? 'Unknown',
      authorId: p.author?.authorId ?? p.authorId ?? '',
      authorImageUrl:
        p.authorImageUrl ?? p.author?.imageUrl ?? 'assets/images/login-news-image.png',
      mediaUrl: hasImage ? firstImage! : hasVideo ? firstVideo! : null,
      mediaType: hasImage ? 'image' : hasVideo ? 'video' : null,
      text: p.text ?? '',
      likedByMe: p.likedByMe ?? false,
      likeCount: p.likeCount ?? 0,
      createdAt: p.createdAt,
    };
  });
}

interface CompanyVisitedCard {
  id?: string;
    publicCompanyId?: string; 
  companyName: string;
  logoUrl: string;
    departmentId?: string | null;
  departmentName?: string | null;
}

