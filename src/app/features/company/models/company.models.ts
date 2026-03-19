export interface CompanySummaryModel {
  companyName: string;
  website?: string;
}

export interface CampusItem {
  campusId: string;
  campusName: string;
}

export interface CampusSearchItem {
  id: string;
  campusName: string;
  campusAddress?: string;
}

export interface CampusSearchResponse {
  success?: boolean;
  data?: {
    content?: CampusSearchItem[];
  };
}

export interface FollowCompanyRequest {
  companyId: string;
  userType: 'STUDENT' | 'COMPANY' | 'CAMPUS';
  studentId?: string;
  followerCompanyId?: string;
  campusId?: string;
}

export interface FollowCompanyResponse {
  success: boolean;
  message: string;
  data: {
    followId?: string;
    companyId?: string;
    followerId?: string;
    userType?: string;
  };
}

export interface FollowerCountResponse {
  success: boolean;
  data: {
    companyId: string;
    followerCount: number;
  };
}

export interface PromotionsCountResponse {
  success: boolean;
  data: {
    companyId: string;
    promotionCount: number;
  };
}

export interface GetCampusesResponse {
  success: boolean;
  data: CampusItem[];
}


