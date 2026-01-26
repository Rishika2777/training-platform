export interface VisionMetric {
  name: string;
  value: string;
  year: string;
}

export interface VisionPerformanceFormValue {
  vision: string;
  metrics: VisionMetric[];
}

export interface VisionRequest {
  vision: string;
  metricName: string;
  value: string;
  year: string;
}

export interface VisionResponse {
  success: boolean;
  message: string;
  data: unknown;
  statusCode: number;
  timestamp: string;
}
