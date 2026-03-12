# Coding Conventions

> **Tất cả AI tools (Copilot, Cursor, ChatGPT...) và thành viên đều phải tuân theo tài liệu này.**  
> ESLint sẽ tự động bắt hầu hết các lỗi — nhưng một số quy tắc cần ý thức thủ công.

---

## 1. Cấu trúc thư mục

```
auction/
├── packages/shared/src/types/     ← ALL shared types go here
├── backend/src/modules/<feature>/ ← One folder per feature
│   ├── <feature>.routes.ts
│   ├── <feature>.controller.ts
│   ├── <feature>.service.ts
│   └── <feature>.schema.ts
├── frontend/src/
│   ├── components/<category>/     ← Reusable UI building blocks
│   ├── pages/<feature>/           ← Route-level pages
│   ├── hooks/                     ← Custom hooks (data + logic)
│   ├── services/                  ← API call wrappers
│   └── store/                     ← Zustand stores
```

**❌ Không được đặt file sai vị trí:**

- Business logic trong controller → đưa vào service
- API call trực tiếp trong component → đưa vào hooks/service
- Type được dùng ở cả 2 phía → đưa vào `packages/shared`

---

## 2. Đặt tên (Naming)

| Thứ               | Quy tắc                | Ví dụ                          |
| ----------------- | ---------------------- | ------------------------------ |
| File TypeScript   | `kebab-case.ts`        | `auction-scheduler.service.ts` |
| File React        | `PascalCase.tsx`       | `AuctionCard.tsx`              |
| Interface / Type  | `PascalCase`           | `AuctionDto`, `BidPayload`     |
| Hook              | `useCamelCase`         | `useAuctionSocket`             |
| Zustand store     | `camelCase.store.ts`   | `auth.store.ts`                |
| Zod schema object | `camelCaseSchema`      | `createBidSchema`              |
| Constant          | `SCREAMING_SNAKE_CASE` | `MAX_BID_AMOUNT`               |
| Env variable      | `SCREAMING_SNAKE_CASE` | `VITE_API_URL`                 |

---

## 3. TypeScript — không có `any`

```typescript
// ❌ ESLint sẽ báo lỗi
const data: any = response.data;
function process(input: any) {}

// ✅ Dùng generics hoặc type cụ thể
const data: AuctionDto = response.data;
function process<T extends Record<string, unknown>>(input: T) {}

// ✅ Khi thực sự không biết type — dùng unknown + type guard
function handleError(err: unknown) {
  if (err instanceof Error) console.error(err.message);
}
```

**Cấm tuyệt đối:**

```typescript
// @ts-ignore    ← bị ban
// @ts-nocheck   ← bị ban
```

**Nếu Prisma chưa expose field — dùng @ts-expect-error với description:**

```typescript
// @ts-expect-error: Prisma generated type doesn't include virtual field yet
const total = auction._count.bids;
```

---

## 4. Import — luôn dùng path alias

```typescript
// ❌ Relative imports qua nhiều cấp
import { AppError } from '../../../utils/AppError';
import { AuctionStatus } from '../../../../packages/shared/src/types/auction.types';

// ✅ Path alias
import { AppError } from '@/utils/AppError';
import { AuctionStatus } from '@auction/shared';

// ✅ Type-only imports (bắt buộc cho interface/type)
import type { AuctionDto } from '@auction/shared';
```

---

## 5. Backend — Controller / Service / Route

### Controller: chỉ nhận request, gọi service, trả response

```typescript
// ✅ Thin controller
export const createBid = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bid = await bidService.create(req.user!.id, req.params.auctionId, req.body);
    res.status(201).json({ success: true, data: bid });
  } catch (error) {
    next(error); // ALWAYS delegate to error middleware
  }
};
```

### Service: tất cả business logic, query DB

```typescript
// ✅ Atomic transaction cho multi-step writes
const result = await prisma.$transaction(async (tx) => {
  const auction = await tx.auction.findUnique({ where: { id: auctionId } });
  if (!auction) throw new AppError('Auction not found', 404);
  if (amount <= auction.currentPrice) throw new AppError('Bid too low', 400);
  return tx.bid.create({ data: { amount, auctionId, userId } });
});
```

### Route: chỉ middleware chain + controller

```typescript
// ✅ Route file rõ ràng, dễ đọc security config
router.post(
  '/:auctionId/bids',
  authenticate, // 1. xác thực JWT
  validateRequest(bidSchema), // 2. validate input
  bidController.create, // 3. xử lý
);
```

### Prisma — không bao giờ raw unsafe

```typescript
// ❌ ESLint error - bị block bởi no-restricted-syntax
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email = '${email}'`);

// ✅ Tagged template (tự parameterize)
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${email}`;

// ✅ Tốt nhất - dùng Prisma model method
await prisma.user.findUnique({ where: { email } });
```

---

## 6. Frontend — Component / Hook / Store

### Component: UI only, không fetch data

```typescript
// ✅ Component chỉ nhận props, hiển thị UI
interface AuctionCardProps {
  auction: AuctionSummary;
  onBid?: (id: string) => void;
}

export function AuctionCard({ auction, onBid }: AuctionCardProps) {
  return (
    <div className="rounded-lg border p-4">
      <h3>{auction.title}</h3>
      <button onClick={() => onBid?.(auction.id)}>Bid Now</button>
    </div>
  );
}
```

### Data fetching: React Query + service layer

```typescript
// ✅ Hook xử lý fetching, component chỉ xài data
export function useAuctions(filters?: AuctionFilters) {
  return useQuery({
    queryKey: ['auctions', filters],
    queryFn: () => auctionService.getList(filters),
    staleTime: 30_000,
  });
}

// ❌ KHÔNG fetch trong useEffect
useEffect(() => {
  fetch('/api/auctions') // bypasses auth headers, loading state, error handling
    .then((r) => r.json())
    .then(setAuctions);
}, []);
```

### API service: luôn dùng centralized client

```typescript
// ❌ ESLint sẽ warn
import axios from 'axios';
const res = await axios.get('/auctions');

// ✅ Dùng service wrapper (có auth interceptor, base URL)
import { auctionService } from '@/services/auction.service';
const auctions = await auctionService.getList();
```

### Form: React Hook Form + Zod

```typescript
// ✅ Validate bằng schema — không validate thủ công trong component
const form = useForm<BidFormData>({
  resolver: zodResolver(bidFormSchema),
  defaultValues: { amount: currentPrice + 1000 },
});
```

### State: Zustand cho global, useState cho local

```typescript
// Global auth/user state
const { user, logout } = useAuthStore();

// Global realtime bids
const { bids, addBid } = useAuctionStore();

// Local UI state (modal open, form step, etc.)
const [isOpen, setIsOpen] = useState(false);
```

---

## 7. Error Handling

```typescript
// Backend — throw AppError, never res.status() in services or controllers
if (!auction) throw new AppError('Auction not found', 404);
if (!isOwner) throw new AppError('Forbidden', 403);

// Frontend — React Query handles loading/error states
const { data, isLoading, error } = useAuctions();
if (error) return <ErrorMessage message={error.message} />;
```

---

## 8. Response format (API)

Tất cả API response phải theo format chuẩn:

```typescript
// ✅ Success
res.status(200).json({ success: true, data: result });
res.status(201).json({ success: true, data: created });

// ✅ Paginated
res.status(200).json({
  success: true,
  data: items,
  pagination: { total, page, limit, totalPages },
});

// ✅ Error (do global error middleware xử lý — không tự viết)
{ success: false, message: 'Auction not found', statusCode: 404 }
```

---

## 9. Environment Variables

```typescript
// Backend — đọc từ process.env, đã được validate khi app start
const port = process.env.PORT ?? '5000';

// Frontend — chỉ đọc biến VITE_ prefix, có type từ env.d.ts
const apiUrl = import.meta.env.VITE_API_URL;

// ❌ KHÔNG hardcode URL hoặc secret
const url = 'http://localhost:5000'; // fail khi deploy
const secret = 'my-jwt-secret'; // security risk
```

---

## 10. Những thứ AI thường sinh ra SAI — kiểm tra kỹ

| AI thường làm                             | Đúng phải làm                                  |
| ----------------------------------------- | ---------------------------------------------- |
| `any` type                                | Dùng generic hoặc type cụ thể                  |
| `useEffect` + `fetch`                     | `useQuery` + service function                  |
| `import axios from 'axios'`               | `import { api } from '@/services/api.service'` |
| `res.status(404).json(...)` trong service | `throw new AppError('...', 404)`               |
| Route không có `authenticate`             | Thêm middleware vào route                      |
| `$queryRawUnsafe`                         | `$queryRaw` tagged template                    |
| Type trong component file                 | Move vào `packages/shared/src/types/`          |
| Tạo file mới cho util dùng 1 chỗ          | Viết thẳng vào file cần                        |
| Relative import `../../..`                | Path alias `@/` hoặc `@auction/shared`         |
| `console.log` production code             | Xóa trước commit                               |
