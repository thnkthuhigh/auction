import { create } from 'zustand';
import type { Auction, Bid } from '@auction/shared';

interface AuctionState {
  activeAuction: Auction | null;
  liveBids: Bid[];
  viewersCount: number;
  serverTimeOffsetMs: number;
  setActiveAuction: (auction: Auction) => void;
  updateAuctionPrice: (price: number, totalBids: number) => void;
  addLiveBid: (bid: Bid) => void;
  applyRealtimeBid: (payload: { bid: Bid; currentPrice: number; totalBids: number }) => void;
  applySnapshot: (payload: {
    bids: Bid[];
    currentPrice: number;
    totalBids: number;
    status: Auction['status'];
    endsAt: string;
  }) => void;
  setLiveBids: (bids: Bid[]) => void;
  setViewersCount: (count: number) => void;
  setServerTimeOffsetMs: (offsetMs: number) => void;
  updateAuctionRealtimeStatus: (payload: {
    status: Auction['status'];
    endTime?: string;
    winnerId?: string | null;
    winnerUsername?: string;
    currentPrice?: number;
  }) => void;
  resetAuction: () => void;
}

function isSameBidList(current: Bid[], next: Bid[]) {
  if (current.length !== next.length) return false;
  for (let index = 0; index < current.length; index += 1) {
    if (current[index]?.id !== next[index]?.id) {
      return false;
    }
  }
  return true;
}

export const useAuctionStore = create<AuctionState>((set) => ({
  activeAuction: null,
  liveBids: [],
  viewersCount: 0,
  serverTimeOffsetMs: 0,

  setActiveAuction: (auction) =>
    set((state) => {
      const currentAuction = state.activeAuction;
      if (!currentAuction || currentAuction.id !== auction.id) {
        return { activeAuction: auction, liveBids: [] };
      }

      return {
        activeAuction: {
          ...auction,
          currentPrice: Math.max(currentAuction.currentPrice, auction.currentPrice),
          totalBids: Math.max(currentAuction.totalBids, auction.totalBids),
        },
        liveBids: state.liveBids,
      };
    }),

  updateAuctionPrice: (price, totalBids) =>
    set((state) => {
      if (!state.activeAuction) return state;
      if (
        state.activeAuction.currentPrice === price &&
        state.activeAuction.totalBids === totalBids
      ) {
        return state;
      }
      return {
        activeAuction: { ...state.activeAuction, currentPrice: price, totalBids },
      };
    }),

  addLiveBid: (bid) =>
    set((state) => {
      const existed = state.liveBids.some((item) => item.id === bid.id);
      if (existed) return state;
      return {
        liveBids: [bid, ...state.liveBids].slice(0, 50), // keep last 50
      };
    }),

  applyRealtimeBid: ({ bid, currentPrice, totalBids }) =>
    set((state) => {
      const bidExists = state.liveBids.some((item) => item.id === bid.id);
      const nextBids = bidExists ? state.liveBids : [bid, ...state.liveBids].slice(0, 50);

      let nextAuction = state.activeAuction;
      if (state.activeAuction) {
        const shouldUpdateAuction =
          state.activeAuction.currentPrice !== currentPrice ||
          state.activeAuction.totalBids !== totalBids;

        if (shouldUpdateAuction) {
          nextAuction = {
            ...state.activeAuction,
            currentPrice,
            totalBids,
          };
        }
      }

      if (nextAuction === state.activeAuction && nextBids === state.liveBids) {
        return state;
      }

      return {
        activeAuction: nextAuction,
        liveBids: nextBids,
      };
    }),

  applySnapshot: ({ bids, currentPrice, totalBids, status, endsAt }) =>
    set((state) => {
      const nextBids = bids.slice(0, 50);
      const bidsChanged = !isSameBidList(state.liveBids, nextBids);

      let nextAuction = state.activeAuction;
      if (state.activeAuction) {
        const shouldUpdateAuction =
          state.activeAuction.currentPrice !== currentPrice ||
          state.activeAuction.totalBids !== totalBids ||
          state.activeAuction.status !== status ||
          state.activeAuction.endTime !== endsAt;

        if (shouldUpdateAuction) {
          nextAuction = {
            ...state.activeAuction,
            currentPrice,
            totalBids,
            status,
            endTime: endsAt,
          };
        }
      }

      if (!bidsChanged && nextAuction === state.activeAuction) {
        return state;
      }

      return {
        activeAuction: nextAuction,
        liveBids: bidsChanged ? nextBids : state.liveBids,
      };
    }),

  setLiveBids: (bids) =>
    set((state) => {
      const next = bids.slice(0, 50);
      const currentFirstId = state.liveBids[0]?.id;
      const nextFirstId = next[0]?.id;
      if (state.liveBids.length === next.length && currentFirstId === nextFirstId) {
        return state;
      }
      return { liveBids: next };
    }),

  setViewersCount: (count) =>
    set((state) => (state.viewersCount === count ? state : { viewersCount: count })),

  setServerTimeOffsetMs: (offsetMs) =>
    set((state) =>
      state.serverTimeOffsetMs === offsetMs ? state : { serverTimeOffsetMs: offsetMs },
    ),

  updateAuctionRealtimeStatus: ({ status, endTime, winnerId, winnerUsername, currentPrice }) =>
    set((state) => ({
      activeAuction: state.activeAuction
        ? {
            ...state.activeAuction,
            status,
            ...(endTime ? { endTime } : {}),
            ...(winnerId !== undefined ? { winnerId } : {}),
            ...(winnerUsername !== undefined ? { winnerUsername } : {}),
            ...(currentPrice !== undefined ? { currentPrice } : {}),
          }
        : null,
    })),

  resetAuction: () =>
    set({
      activeAuction: null,
      liveBids: [],
      viewersCount: 0,
      serverTimeOffsetMs: 0,
    }),
}));
