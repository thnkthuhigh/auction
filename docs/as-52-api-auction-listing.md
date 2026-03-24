# AS-52 API Auction Listing - Giai thich flow tu FE toi BE

Tai lieu nay giai thich mot flow cu the:

- buyer mo trang danh sach dau gia
- frontend goi API danh sach
- backend nhan query, xu ly business rules, query DB
- backend format response roi tra nguoc ve frontend

Muc tieu la de khi doc code ban biet:

1. API duoc goi tu dau
2. Route backend nao nhan request
3. Service backend dang loc du lieu theo rule nao
4. Response shape tra ve frontend co gi

---

## Part 1. Nhin tong the truoc

Flow cua chuc nang danh sach dau gia:

```text
/auctions
  -> AuctionListPage
  -> useQuery(...)
  -> auctionService.getAuctions(filters)
  -> api.get('/auctions', { params: filters })
  -> GET /api/auctions
  -> auctionRoutes.get('/')
  -> auctionController.getAuctions
  -> auctionService.getAuctions
  -> prisma.auction.findMany + prisma.auction.count
  -> formatAuction(...)
  -> res.json({ success: true, data, total, page, limit, totalPages })
  -> frontend render AuctionCard
```

Neu nho duoc flow nay thi ban se biet "API dang giao tiep qua dau".

---

## Part 2. Frontend goi API tu dau

### 2.1. Route render trang danh sach

File:

- `frontend/src/App.tsx`

Doan lien quan:

```tsx
<Route path="/" element={<AuctionListPage />} />
<Route path="/auctions" element={<AuctionListPage />} />
```

Y nghia:

- khi vao `/` hoac `/auctions`
- React Router render `AuctionListPage`

---

### 2.2. Page danh sach goi service

File:

- `frontend/src/pages/auction/AuctionListPage.tsx`

Doan chinh:

```tsx
const { data } = useQuery({
  queryKey: ['auctions', { search, status, categoryId, sortBy, sortOrder, page }],
  queryFn: () =>
    auctionService.getAuctions({
      search,
      status,
      categoryId,
      sortBy,
      sortOrder,
      page,
    }),
});
```

Y nghia:

- `useQuery` la noi page quyet dinh "goi API"
- moi lan `search`, `status`, `categoryId`, `sortBy`, `sortOrder`, `page` doi
- React Query se goi lai `auctionService.getAuctions(...)`

Noi cach khac:

- page khong goi `fetch` truc tiep
- page goi qua `auctionService`

---

### 2.3. Service frontend goi HTTP request

File:

- `frontend/src/services/auction.service.ts`

Doan chinh:

```ts
getAuctions: async (filters: AuctionFilters = {}): Promise<PaginatedResponse<Auction>> => {
  const res = await api.get('/auctions', { params: filters });
  return res.data;
},
```

Y nghia:

- frontend gui `GET /auctions`
- `filters` duoc dua vao query string

Vi du:

```text
GET /api/auctions?status=ACTIVE&page=1&sortBy=createdAt&sortOrder=desc
```

---

### 2.4. `api.service.ts` gan base URL

File:

- `frontend/src/services/api.service.ts`

Doan chinh:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
```

Y nghia:

- neu `VITE_API_URL=http://localhost:3001/api`
- thi `api.get('/auctions')` se thanh:

```text
http://localhost:3001/api/auctions
```

Day la diem frontend "di ra ngoai" de giao tiep voi backend.

---

## Part 3. Backend nhan request qua dau

### 3.1. `app.ts` mount module auctions

File:

- `backend/src/app.ts`

Doan chinh:

```ts
app.use('/api/auctions', auctionRoutes);
```

Y nghia:

- moi request bat dau bang `/api/auctions`
- se chay vao `auctionRoutes`

---

### 3.2. `auction.routes.ts` map route den controller

File:

- `backend/src/modules/auctions/auction.routes.ts`

Doan chinh:

```ts
auctionRoutes.get('/', auctionController.getAuctions);
auctionRoutes.get('/categories', auctionController.getCategories);
```

Y nghia:

- `GET /api/auctions` -> `auctionController.getAuctions`
- `GET /api/auctions/categories` -> `auctionController.getCategories`

Neu muon tim "route nao nhan API" thi day la noi can nhin dau tien.

---

## Part 4. Controller lam gi

File:

- `backend/src/modules/auctions/auction.controller.ts`

Doan chinh:

```ts
export async function getAuctions(req, res, next) {
  const { status, categoryId, search, page, limit, sortBy, sortOrder } = req.query;

  const data = await auctionService.getAuctions({
    status,
    categoryId,
    search,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    sortBy,
    sortOrder,
  });

  res.json({ success: true, ...data });
}
```

Y nghia:

- controller doc `req.query`
- doi `page`, `limit` tu string sang number
- dua du lieu xuong service
- service xu ly xong thi controller tra JSON ve client

Controller o day khong chua business logic lon.
Business logic nam o service.

---

## Part 5. Service backend xu ly nghiep vu gi

File:

- `backend/src/modules/auctions/auction.service.ts`

Ham quan trong:

```ts
export async function getAuctions(filters) { ... }
```

Phan nay la "trai tim" cua `AS-52`.

---

### 5.1. Rule visibility cho buyer

Service dang ap cac rule chinh:

- chi lay auction co `reviewStatus = APPROVED`
- chi cho buyer thay cac status public:
  - `PENDING`
  - `ACTIVE`
  - `ENDED`
  - `CANCELLED`
- neu ai do gui `status=REVIEW` thi service tra mang rong

Y nghia nghiep vu:

- seller gui duyet xong ma admin chua duyet thi khong duoc hien trong buyer listing
- buyer khong duoc thay item dang o trang thai noi bo `REVIEW`

---

### 5.2. Search, filter, sort, pagination

Service build `where` cho Prisma:

```ts
const where: Prisma.AuctionWhereInput = {
  reviewStatus: 'APPROVED',
  status: status ? status : { in: PUBLIC_AUCTION_STATUSES },
  ...(categoryId && { categoryId }),
  ...(normalizedSearch && {
    OR: [
      { title: { contains: normalizedSearch, mode: 'insensitive' } },
      { description: { contains: normalizedSearch, mode: 'insensitive' } },
    ],
  }),
};
```

Y nghia:

- filter theo `status`
- filter theo `categoryId`
- search theo `title` va `description`
- search khong phan biet hoa thuong

Sort:

- chi cho phep:
  - `createdAt`
  - `endTime`
  - `currentPrice`
- neu FE gui linh tinh thi fallback ve `createdAt`

Pagination:

- `skip = (page - 1) * limit`
- Prisma `take = limit`

---

### 5.3. Query DB bang Prisma

Doan chinh:

```ts
const [auctions, total] = await Promise.all([
  prisma.auction.findMany({
    where,
    include: {
      seller: { select: { id: true, username: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { bids: true } },
    },
    orderBy: { [validSortBy]: sortOrder },
    skip,
    take: limit,
  }),
  prisma.auction.count({ where }),
]);
```

Y nghia:

- query 1 lay danh sach item
- query 2 lay tong so ban ghi
- chay song song bang `Promise.all`

Data backend lay kem:

- `seller`
- `category`
- so bid qua `_count.bids`

---

### 5.4. Format response cho frontend

Backend khong tra nguyen xi Prisma object.
No chay qua `formatAuction(...)`.

Muc dich:

- doi `Decimal` thanh `number`
- bo ra field tien ich cho FE:
  - `sellerUsername`
  - `winnerUsername`
  - `categoryName`
  - `totalBids`
- van giu nested object neu man khac can:
  - `seller`
  - `winner`
  - `reviewedBy`
  - `category`

Y nghia:

- FE danh sach va chi tiet de render hon
- admin screens cung van co nested data neu can

---

## Part 6. Response tra ve frontend nhu the nao

Backend controller tra:

```ts
res.json({ success: true, ...data });
```

Shape cuoi cung:

```ts
{
  success: true,
  data: Auction[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

Moi item `Auction` hien tai co ca:

- field co san cho FE render nhanh:
  - `sellerUsername`
  - `categoryName`
  - `winnerUsername`
  - `totalBids`
- va nested object:
  - `seller`
  - `category`
  - `winner`

---

## Part 7. Frontend render nguoc lai ra sao

Sau khi response ve:

- React Query luu `data`
- `AuctionListPage` map `data.data`
- moi item dua vao `AuctionCard`

Trong `AuctionCard`:

- ten nguoi ban uu tien `sellerUsername`
- ten danh muc uu tien `categoryName`
- neu can van fallback sang `seller?.username` va `category?.name`

Noi cach khac:

- backend format de frontend render gon hon
- frontend card chi tap trung vao view

---

## Part 8. Categories flow

Ngoai danh sach chinh, page con goi:

```ts
auctionService.getCategories()
```

Flow:

```text
AuctionListPage
  -> auctionService.getCategories()
  -> GET /api/auctions/categories
  -> auctionRoutes.get('/categories')
  -> auctionController.getCategories
  -> auctionService.getCategories
  -> prisma.category.findMany(...)
```

Endpoint nay hien dang tra toan bo category theo ten tang dan.

Ly do:

- buyer listing dung duoc
- create auction page cung dung duoc
- tranh lam endpoint nay bi "qua buyer-only"

---

## Part 9. Diem can nho nhat

- FE goi API qua `frontend/src/services/auction.service.ts`
- request that su di qua `frontend/src/services/api.service.ts`
- backend nhan request o `backend/src/app.ts`
- route map o `backend/src/modules/auctions/auction.routes.ts`
- controller doc query va goi service
- service moi la noi xu ly nghiep vu listing
- Prisma la lop query DB
- `formatAuction(...)` la noi backend chuan hoa payload cho FE

Neu ban muon debug 1 request that su, thu tu nhin nhanh nhat la:

1. Network tab tren browser
2. `frontend/src/services/auction.service.ts`
3. `backend/src/modules/auctions/auction.routes.ts`
4. `backend/src/modules/auctions/auction.controller.ts`
5. `backend/src/modules/auctions/auction.service.ts`

---

## Part 10. Tom tat nghiep vu cua AS-52

`AS-52` trong phan listing API hien tai tap trung vao:

- cho buyer lay danh sach auction public
- khong lo item chua duyet vao listing
- ho tro search, filter, sort, page
- tra response co shape de FE dung on dinh

Neu hieu ro flow nay, ban se de doc duoc cac API khac trong du an theo cung kieu.
