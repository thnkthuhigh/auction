export type AuctionStatus = 'PENDING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Auction {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  startPrice: number;
  currentPrice: number;
  minBidStep: number;
  status: AuctionStatus;
  startTime: string;
  endTime: string;
  createdAt: string;
  sellerId: string;
  sellerUsername: string;
  winnerId?: string;
  winnerUsername?: string;
  categoryId: string;
  categoryName: string;
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
