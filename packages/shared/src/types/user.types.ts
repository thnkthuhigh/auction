export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  username: string;
  avatar?: string;
  balance: number;
  role: UserRole;
  createdAt: string;
}

export interface UserProfile extends User {
  totalAuctions: number;
  totalBids: number;
  wonAuctions: number;
}

export interface RegisterDTO {
  email: string;
  username: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface UpdateProfileDTO {
  username?: string;
  avatar?: string;
}
