# AS-52 API Auction Listing - Giai thich flow tu FE toi BE

Tai lieu nay duoc viet theo kieu "doc code de hieu code".
Muc tieu la giai thich mot flow cu the:

- buyer mo trang danh sach dau gia
- frontend goi API danh sach
- backend nhan query, xu ly logic, query DB
- backend format response roi tra nguoc ve frontend

De khi nhin vao code ban biet:

1. API duoc goi tu dau
2. Route backend nao nhan request
3. Controller xu ly query ra sao
4. Service backend dang loc va sort du lieu theo rule nao
5. Response tra ve frontend co shape gi

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

Neu nho duoc flow nay thi ban se biet API dang giao tiep qua dau.

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

### 5.1. Search, filter, sort, pagination

Service nhan cac input:

- `status`
- `categoryId`
- `search`
- `page`
- `limit`
- `sortBy`
- `sortOrder`

Service build `where` cho Prisma.

Neu co `search`:

- tim trong `title`
- tim trong `description`
- khong phan biet hoa thuong

Neu co `categoryId`:

- chi lay item thuoc category do

Neu co `status`:

- chi lay dung status do

Sort hien tai cho phep:

- `createdAt`
- `endTime`
- `currentPrice`

Neu FE gui `sortBy` linh tinh:

- service fallback ve `createdAt`

Pagination:

- `skip = (page - 1) * limit`
- Prisma `take = limit`

---

### 5.2. Query DB bang Prisma

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

- thong tin seller
- thong tin category
- so luong bids

---

### 5.3. Format response

Backend khong tra nguyen xi object tu Prisma.
No dua qua `formatAuction(...)`.

Muc dich:

- doi `Decimal` sang `number`
- them `totalBids`
- giu payload de FE render de hon

Day la lop "chuan hoa du lieu" truoc khi response di ra ngoai.

---

## Part 6. Response tra ve frontend nhu the nao

Controller tra:

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

Frontend `AuctionListPage` dung `data.data` de render card.

---

## Part 7. Categories flow

Ngoai danh sach item, page con goi category list:

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

Muc dich:

- do select category tren UI
- create auction page cung co the dung lai

---

## Part 8. Diem can nho nhat

- FE goi API qua `frontend/src/services/auction.service.ts`
- request that su di ra backend qua `frontend/src/services/api.service.ts`
- backend nhan request o `backend/src/app.ts`
- route map o `backend/src/modules/auctions/auction.routes.ts`
- controller doc query va goi service
- service moi la noi xu ly rule listing that su
- Prisma la lop query DB
- `formatAuction(...)` la noi backend chuan hoa payload cho FE

Neu can debug 1 request listing, thu tu doc nhanh nhat la:

1. Network tab tren browser
2. `AuctionListPage.tsx`
3. `auction.service.ts` o frontend
4. `api.service.ts`
5. `app.ts`
6. `auction.routes.ts`
7. `auction.controller.ts`
8. `auction.service.ts` o backend

Neu nho duoc 8 diem nay, ban se biet API dang giao tiep qua dau.
