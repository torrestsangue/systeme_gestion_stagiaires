export interface ApiError {
  message: string;
  statusCode?: number;
}


export interface LoginResponse {
  access_token: string;
  user: import('./user.types').User;
}

export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  items: T[];
}