export type AuctionStatus = 'PENDING' | 'REVIEW' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
export type AuctionReviewStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHANGES_REQUESTED';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface AuctionUserSummary {
  id: string;
  username: string;
  avatar?: string | null;
  email?: string;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  imageUrl?: string | null;
  startPrice: number;
  currentPrice: number;
  minBidStep: number;
  status: AuctionStatus;
  reviewStatus?: AuctionReviewStatus;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
  updatedAt?: string;
  sellerId: string;
  sellerUsername: string;
  seller?: AuctionUserSummary;
  winnerId?: string | null;
  winnerUsername?: string;
  winner?: AuctionUserSummary | null;
  reviewedById?: string | null;
  reviewedBy?: AuctionUserSummary | null;
  categoryId: string;
  categoryName: string;
  category?: Category;
  totalBids: number;
}

export interface CreateAuctionDTO {
  title: string;
  description: string;
  imageUrl?: string;
  startPrice: number;
  minBidStep?: number;
  startTime: string;
  endTime: string;
  categoryId: string;
}

export interface UpdateAuctionDTO {
  title?: string;
  description?: string;
  imageUrl?: string;
  startTime?: string;
  endTime?: string;
}

export interface AuctionFilters {
  status?: AuctionStatus;
  categoryId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'endTime' | 'currentPrice';
  sortOrder?: 'asc' | 'desc';
}
