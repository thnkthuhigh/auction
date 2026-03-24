# AS-52 API Auction Listing - Giai thich flow code

Tai lieu nay duoc viet theo kieu "doc code de hieu code".
Muc tieu la giai thich API danh sach dau gia dang chay nhu the nao, de khi nhin vao code ban biet:

1. Frontend goi API tu dau
2. Request di qua route nao cua backend
3. Controller xu ly query ra sao
4. Service backend dang loc du lieu theo rule nao
5. Response tra ve frontend co shape gi

Tai lieu nay khong co gang giai thich moi ky tu.
No tap trung vao flow "buyer xem danh sach san pham" va "API listing giao tiep voi FE qua dau".

---

## Part 1. Nhin tong the truoc

Flow cua chuc nang listing:

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
  -> prisma.auction.findMany(...)
  -> formatAuction(...)
  -> res.json({ success: true, data, total, page, limit, totalPages })
  -> frontend render AuctionCard
```

Neu nho duoc luong nay thi ban se biet API dang duoc goi qua dau va di den dau.

---

## Part 2. Frontend goi API tu dau

### 2.1. Route render trang danh sach

File lien quan:

- `frontend/src/App.tsx`

Doan code chinh:

```tsx
<Route path="/" element={<AuctionListPage />} />
<Route path="/auctions" element={<AuctionListPage />} />
```

Y nghia:

- vao `/` hoac `/auctions`
- React Router render `AuctionListPage`

---

### 2.2. `AuctionListPage` dung React Query

File lien quan:

- `frontend/src/pages/auction/AuctionListPage.tsx`

Doan code chinh:

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

- `useQuery` la noi page quyet dinh luc nao can goi API
- khi user doi search, status, category, sort, page
- query se goi lai `auctionService.getAuctions(...)`

Page khong tu dung `fetch`.
No goi qua service de tach UI va networking.

---

### 2.3. Service frontend goi HTTP request

File lien quan:

- `frontend/src/services/auction.service.ts`

Doan code:

```ts
getAuctions: async (filters: AuctionFilters = {}): Promise<PaginatedResponse<Auction>> => {
  const res = await api.get('/auctions', { params: filters });
  return res.data;
},
```

Y nghia:

- FE gui `GET /auctions`
- `filters` se thanh query string

Vi du:

```text
GET /api/auctions?status=ACTIVE&page=1&sortBy=createdAt&sortOrder=desc
```

---

### 2.4. `api.service.ts` noi voi backend

File lien quan:

- `frontend/src/services/api.service.ts`

Doan code:

```ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
});
```

Y nghia:

- neu `.env` co `VITE_API_URL=http://localhost:3001/api`
- thi `api.get('/auctions')` that su goi:

```text
http://localhost:3001/api/auctions
```

Day la diem FE "di ra ngoai" de giao tiep voi backend.

---

## Part 3. Backend nhan request qua dau

### 3.1. `app.ts` mount module auctions

File lien quan:

- `backend/src/app.ts`

Doan code:

```ts
app.use('/api/auctions', auctionRoutes);
```

Y nghia:

- moi request bat dau bang `/api/auctions`
- se chay vao `auctionRoutes`

---

### 3.2. `auction.routes.ts` map den controller

File lien quan:

- `backend/src/modules/auctions/auction.routes.ts`

Doan code:

```ts
auctionRoutes.get('/', auctionController.getAuctions);
auctionRoutes.get('/categories', auctionController.getCategories);
```

Y nghia:

- `GET /api/auctions` -> `auctionController.getAuctions`
- `GET /api/auctions/categories` -> `auctionController.getCategories`

Neu muon tim "API nay vao backend o dau" thi route la noi can xem truoc.

---

## Part 4. Controller lam gi

File lien quan:

- `backend/src/modules/auctions/auction.controller.ts`

Doan code chinh:

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

- controller doc query string
- doi `page`, `limit` tu string sang number
- day du lieu xuong service
- service xu ly xong thi tra nguoc JSON ve frontend

Controller o day mong.
No khong chua business logic listing.

---

## Part 5. Service backend xu ly nghiep vu

File lien quan:

- `backend/src/modules/auctions/auction.service.ts`

Ham quan trong:

```ts
export async function getAuctions(filters) { ... }
```

Day la noi xu ly business rules cua listing.

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

Sau do build `where` cho Prisma.

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
- `take = limit`

---

### 5.2. Query DB bang Prisma

Doan code chinh:

```ts
const [auctions, total] = await Promise.all([
  prisma.auction.findMany({
    where,
    include: {
      seller: { select: { id: true, username: true, avatar: true } },
      category: { select: { id: true, name: true, slug: true } },
      _count: { select: { bids: true } },
    },
    orderBy,
    skip,
    take: limit,
  }),
  prisma.auction.count({ where }),
]);
```

Y nghia:

- query 1 lay danh sach item
- query 2 lay tong so item
- chay song song cho nhanh hon

Backend lay kem:

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

## Part 6. Response tra ve FE

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

## Part 7. Flow categories

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

Muc dich:

- do select category tren UI

---

## Part 8. Diem can nho nhat

- FE goi API qua `frontend/src/services/auction.service.ts`
- request di ra backend qua `frontend/src/services/api.service.ts`
- backend nhan request o `backend/src/app.ts`
- route map o `backend/src/modules/auctions/auction.routes.ts`
- controller doc query va goi service
- service moi la noi xu ly rule listing that su
- Prisma query DB
- ket qua tra ve frontend de render danh sach

Neu can debug 1 request listing, thu tu doc nhanh nhat la:

1. `AuctionListPage.tsx`
2. `auction.service.ts` o frontend
3. `api.service.ts`
4. `app.ts`
5. `auction.routes.ts`
6. `auction.controller.ts`
7. `auction.service.ts` o backend

Neu nho duoc 7 diem nay, ban se biet API dang giao tiep qua dau.
