# AS-53 UI Auction Detail - Giai thich flow code

Tai lieu nay duoc viet theo kieu "doc code de hieu code".
Muc tieu la giai thich luong "buyer xem chi tiet san pham" de khi nhin vao code ban biet:

1. Route nao mo trang detail
2. Page detail goi API gi
3. Timer, bid form, winner card duoc render theo status nhu the nao
4. Socket realtime chen vao flow o dau
5. Backend detail API tra du lieu gi cho UI

Tai lieu nay khong co gang giai thich tung ky tu.
No tap trung vao flow du lieu va vai tro cua tung khoi code.

---

## Part 1. Nhin tong the truoc

Flow cua trang chi tiet:

```text
/auctions/:id
  -> AuctionDetailPage
  -> auctionService.getAuctionById(id)
  -> GET /api/auctions/:id
  -> auctionRoutes.get('/:id')
  -> auctionController.getAuctionById
  -> auctionService.getAuctionById
  -> prisma.auction.findUnique(...)
  -> formatAuction(...)
  -> frontend render hero + info + timer + bid panel + history

socket:
  -> useAuctionSocket(id)
  -> join room auction
  -> nghe bid:new / auction:started / auction:ended
  -> update local store
  -> page re-render
```

Neu nho duoc flow nay thi ban se doc code detail nhanh hon rat nhieu.

---

## Part 2. Route mo trang detail

File lien quan:

- `frontend/src/App.tsx`

Doan code:

```tsx
<Route path="/auctions/:id" element={<AuctionDetailPage />} />
```

Y nghia:

- khi URL co dang `/auctions/abc123`
- app render `AuctionDetailPage`

`id` trong URL chinh la khoa de page biet can tai dau gia nao.

---

## Part 3. `AuctionDetailPage` lay data nhu the nao

File lien quan:

- `frontend/src/pages/auction/AuctionDetailPage.tsx`

Doan code chinh:

```tsx
const { id } = useParams<{ id: string }>();

const { data: auction } = useQuery({
  queryKey: ['auction', id],
  queryFn: () => auctionService.getAuctionById(id!),
  enabled: Boolean(id),
});

const { data: bidsData } = useQuery({
  queryKey: ['bids', id],
  queryFn: () => auctionService.getBids(id!),
  enabled: Boolean(id),
});
```

Y nghia:

- page lay `id` tu URL
- goi 2 request:
  - detail cua auction
  - lich su bids

Noi cach khac:

- 1 query de render thong tin phien
- 1 query de render bid history

---

## Part 4. Service frontend goi API gi

File lien quan:

- `frontend/src/services/auction.service.ts`

Doan code:

```ts
getAuctionById: async (id: string): Promise<Auction> => {
  const res = await api.get(`/auctions/${id}`);
  return res.data.data;
},

getBids: async (auctionId: string, page = 1) => {
  const res = await api.get(`/bids/auction/${auctionId}`, {
    params: { page },
  });
  return res.data;
},
```

Y nghia:

- detail page goi `GET /api/auctions/:id`
- va `GET /api/bids/auction/:id`

Do la request giao tiep that su giua FE va BE.

---

## Part 5. Backend detail API di qua dau

### 5.1. `app.ts`

File:

- `backend/src/app.ts`

Doan code:

```ts
app.use('/api/auctions', auctionRoutes);
```

Y nghia:

- request detail cua auction vao module `auctionRoutes`

---

### 5.2. `auction.routes.ts`

File:

- `backend/src/modules/auctions/auction.routes.ts`

Doan code:

```ts
auctionRoutes.get('/:id', auctionController.getAuctionById);
```

Y nghia:

- `GET /api/auctions/:id`
- map vao `auctionController.getAuctionById`

---

### 5.3. `auction.controller.ts`

File:

- `backend/src/modules/auctions/auction.controller.ts`

Doan code:

```ts
export async function getAuctionById(req, res, next) {
  const data = await auctionService.getAuctionById(req.params.id);
  res.json({ success: true, data });
}
```

Y nghia:

- controller nhan `id`
- day xuong service
- tra response ve FE

Controller chi lam viec trung gian.

---

### 5.4. `auction.service.ts`

File:

- `backend/src/modules/auctions/auction.service.ts`

Doan code:

```ts
const auction = await prisma.auction.findUnique({
  where: { id },
  include: {
    seller: { select: { id: true, username: true, avatar: true } },
    winner: { select: { id: true, username: true } },
    category: true,
    _count: { select: { bids: true } },
  },
});
```

Y nghia:

- lay 1 auction theo `id`
- include seller
- include winner
- include category
- include tong so bids

Sau do dua qua `formatAuction(...)` de:

- doi `Decimal` sang `number`
- them `totalBids`

---

## Part 6. UI detail render theo status nhu the nao

Trong `AuctionDetailPage` co 3 nhom lon:

1. Hero section
2. Detail content ben trai
3. Sidebar action ben phai

---

### 6.1. Hero section

Hero hien:

- tieu de auction
- category
- status
- current price
- start price
- min bid step
- total bids

Muc dich:

- buyer vao page la quet duoc thong tin quan trong ngay

---

### 6.2. `AuctionTimer`

File:

- `frontend/src/components/auction/AuctionTimer.tsx`

Component nay khong con chi hien khi `ACTIVE`.
No render khac nhau theo status:

- `ACTIVE`
  - dem nguoc den `endTime`
- `PENDING`
  - neu chua den gio mo thi dem nguoc den `startTime`
  - neu van la draft thi hien note cho biet chua mo cong khai
- `REVIEW`
  - hien panel cho duyet
- `ENDED` / `CANCELLED`
  - hien panel thong bao phien da dong

Y nghia:

- timer la noi phan biet ro trang thai cua phien
- user khong can tu doan tu text rong rai nua

---

### 6.3. `BidForm`

File:

- `frontend/src/components/auction/BidForm.tsx`

Nhiem vu:

- tinh `minBid = currentPrice + minBidStep`
- hien quick bid buttons
- validate gia dat bang `zod`
- disable khi khong duoc dat gia

Rule co ban:

- chi dat gia khi `status === ACTIVE`
- neu da het gio thi disable
- neu `PENDING`, `REVIEW`, `CANCELLED`, `ENDED` thi hien reason

---

### 6.4. `WinnerCard`

File:

- `frontend/src/components/auction/WinnerCard.tsx`

Khi phien da ket thuc va co nguoi thang:

- hien gia chot
- hien ten winner
- hien thoi diem chot
- bao cho current user biet minh co thang hay khong

Neu phien ket thuc ma khong co nguoi thang:

- page detail hien panel thong bao rieng trong sidebar

---

## Part 7. Realtime chen vao flow o dau

File lien quan:

- `frontend/src/hooks/useAuctionSocket.tsx`
- `frontend/src/store/auction.store.ts`

Flow:

```text
AuctionDetailPage
  -> useAuctionSocket(id)
  -> socket emit auction:join
  -> server phat su kien bid:new / auction:started / auction:ended
  -> hook nhan event
  -> update store
  -> page re-render
```

Trong hook:

- `bid:new`
  - add live bid vao store
  - update current price
- `auction:started`
  - toast thong bao phien da mo
- `auction:ended`
  - toast thong bao winner / final price

Y nghia:

- detail page khong chi doc data ban dau
- no con nghe update realtime qua socket

---

## Part 8. Fallback data tren UI

Trong page detail, data co the den tu:

- `sellerUsername`
- `categoryName`
- `winnerUsername`

nhung neu API dang tra nested data thi page van fallback sang:

- `seller?.username`
- `category?.name`
- `winner?.username`

Muc dich:

- UI detail van render on ngay ca khi contract API chua that su dep 100%

---

## Part 9. Seller action tren trang detail

Neu current user la seller cua auction:

- page khong hien bid form
- thay vao do hien panel action cua seller

Neu status la `PENDING`:

- co nut `Gui duyet san pham`
- nut nay goi `auctionService.submitForReview(id)`

Neu status la `REVIEW`:

- page hien note "dang cho admin kiem tra"

Y nghia:

- cung 1 page detail
- nhung UI thay doi theo vai tro va status

---

## Part 10. Diem can nho nhat

- route detail nam o `App.tsx`
- page detail nam o `AuctionDetailPage.tsx`
- page goi 2 API:
  - auction detail
  - bid history
- backend detail API di qua:
  - `app.ts`
  - `auction.routes.ts`
  - `auction.controller.ts`
  - `auction.service.ts`
- socket chen vao sau khi page mount
- `AuctionTimer`, `BidForm`, `WinnerCard` la 3 component phu trach action/status chinh

Neu can debug 1 issue cua man detail, thu tu doc nhanh nhat la:

1. `AuctionDetailPage.tsx`
2. `auction.service.ts` o frontend
3. `api.service.ts`
4. `auction.routes.ts`
5. `auction.controller.ts`
6. `auction.service.ts` o backend
7. `useAuctionSocket.tsx`

Neu nho duoc 7 diem nay, ban se de sua man detail hon rat nhieu.
