import api from './api.service';
import type {
  Auction,
  CreateAuctionDTO,
  AuctionFilters,
  PaginatedResponse,
  Category,
} from '@auction/shared';

export const auctionService = {
  getAuctions: async (filters: AuctionFilters = {}): Promise<PaginatedResponse<Auction>> => {
    const res = await api.get('/auctions', { params: filters });
    return res.data;
  },

  getAuctionById: async (id: string): Promise<Auction> => {
    const res = await api.get(`/auctions/${id}`);
    return res.data.data;
  },

  createAuction: async (data: CreateAuctionDTO): Promise<Auction> => {
    const res = await api.post('/auctions', data);
    return res.data.data;
  },

  deleteAuction: async (id: string): Promise<void> => {
    await api.delete(`/auctions/${id}`);
  },

  getCategories: async (): Promise<Category[]> => {
    const res = await api.get('/auctions/categories');
    return res.data.data;
  },

  getBids: async (auctionId: string, page = 1) => {
    const res = await api.get(`/bids/auction/${auctionId}`, {
      params: { page },
    });
    return res.data;
  },

  placeBid: async (auctionId: string, amount: number) => {
    const res = await api.post('/bids', { auctionId, amount });
    return res.data.data;
  },
};
