export interface LandingFeatureItem {
  title: string;
  description: string;
}

export interface CarouselItemResponse {
  id?: string;
  name?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  logoUrl?: string;
  companyName?: string;
  companyLogoUrl?: string;
  campusName?: string;
  campusLogoUrl?: string;
}

export interface ApiResponseListCarouselItemResponse {
  success: boolean;
  message: string | null;
  data: CarouselItemResponse[];
  error: string | null;
  statusCode?: number;
  timestamp?: string;
}

export interface InstitutionResponse {
  campusId?: string;
  campusName?: string;
  approvalStatus?: string;
  isEmailVerified?: boolean;
  description?: string;
  logoUrl?: string;
  imageUrl?: string;
}

export interface ApiResponseListInstitutionResponse {
  success: boolean;
  message: string | null;
  data: InstitutionResponse[];
  error: string | null;
  statusCode?: number;
  timestamp?: string;
}

export interface LandingAnnouncementItem {
  id?: string;
  title?: string;
  content?: string;
  type?: string;
  eventDate?: string;
  createdAt?: string;
  updatedAt?: string;
  imageUrl?: string;
}

export interface ApiResponseListLandingAnnouncement {
  success: boolean;
  message: string | null;
  data: LandingAnnouncementItem[];
  error: string | null;
}

export interface SearchResultResponse {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  type: string;
  publicId: string;
  routeUrl: string;
}

export interface ApiResponseListSearchResultResponse {
  success: boolean;
  message: string | null;
  data: SearchResultResponse[];
  error: string | null;
  statusCode?: number;
  timestamp?: string;
}


