# AS-38 UI Login - Giai thich code sat tung khoi

Tai lieu nay duoc viet theo kieu "doc code de hieu code".
Muc tieu la giai thich luong login tu frontend sang backend, de khi nhin vao code ban biet:

1. Route nao mo trang login
2. LoginPage render form va submit ra sao
3. Hook auth xu ly mutation nhu the nao
4. Service frontend goi API gi
5. Backend validate, controller, service xu ly request dang nhap nhu the nao

Tai lieu nay khong co gang giai thich moi ky tu.
Thay vao do, no tap trung vao cac khoi code quan trong, va tra loi 2 cau hoi:

- doan nay de lam gi
- sau do du lieu di tiep ve dau

---

## Part 1. Nhin tong the truoc khi doc tung dong

### Luong chay cua chuc nang login

```text
/login
  -> LoginPage
  -> useAuth().loginAsync(...)
  -> authService.login(...)
  -> api.post('/auth/login', data)
  -> backend auth route
  -> validate(loginSchema)
  -> authController.login
  -> authService.login
  -> prisma.user.findFirst(...)
  -> bcrypt.compare(...)
  -> generateTokens(...)
  -> tra ve user + tokens
  -> frontend setAuth(...)
  -> toast.success(...)
  -> navigate('/')
```

Neu nho duoc luong nay truoc, ban se doc cac file con lai nhanh hon rat nhieu.

---

## Part 2. Giai thich `frontend/src/App.tsx`

Doan code lien quan:

```tsx
<Route
  path="/login"
  element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
/>
```

### Giai thich tung dong

`path="/login"`

- Khi URL la `/login`, route nay duoc kich hoat.

`element={...}`

- Quy dinh component nao se duoc render khi route match.

`isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />`

- Neu da dang nhap roi thi khong cho vao trang login nua.
- Luc do app redirect user ve `/`.
- Neu chua dang nhap thi moi render `LoginPage`.

### Vi sao can doan nay

Vi login la trang danh cho guest.
Neu user da co session ma van vao login thi flow auth se roi va UX cung khong dep.

---

## Part 3. Giai thich `frontend/src/pages/auth/LoginPage.tsx`

Day la file UI chinh cua chuc nang dang nhap.

---

### 3.1. Doan import dau file

```ts
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Gavel } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { ApiResponse, LoginDTO } from '@auction/shared';
import type { AxiosError } from 'axios';
```

### Giai thich

`useState`

- Dung de giu loi tong quat cua lan submit.
- O day no duoc dat trong `submitError`.

`useForm`

- Thu vien quan ly form.
- No giup register input, bat submit, quan ly errors.

`zodResolver` va `z`

- Dung de gan schema validate cua `zod` vao `react-hook-form`.

`Link`

- Dung de tao link tu trang login sang trang register.

`Gavel`

- Chi la icon giao dien.
- Khong lien quan toi business logic.

`useAuth`

- LoginPage khong goi API truc tiep.
- No thong qua hook auth de tach UI va logic request.

`LoginDTO`

- Kieu du lieu cua form login.

`ApiResponse` va `AxiosError`

- Dung de doc loi tra ve tu backend khi request fail.

---

### 3.2. Schema validate

```ts
const schema = z.object({
  email: z.string().email('Email khong hop le'),
  password: z.string().min(1, 'Vui long nhap mat khau'),
});
```

### Giai thich tung dong

`email: z.string().email(...)`

- Bat buoc `email` phai la chuoi.
- Sau do chuoi nay phai dung format email.

`password: z.string().min(1, ...)`

- Password phai la chuoi.
- It nhat 1 ky tu, tuc la khong duoc de trong.

### Vi sao validate o UI

- Bat loi som truoc khi goi API.
- Giup user thay loi ngay tren form thay vi phai doi backend tra ve.

---

### 3.3. Khai bao component va state

```ts
export default function LoginPage() {
  const { loginAsync, isLoggingIn } = useAuth();
  const [submitError, setSubmitError] = useState('');
  const inputClassName = '...';
```

### Giai thich

`loginAsync`

- La ham dang nhap tra ve promise.
- Dung `await` duoc trong `try/catch`.

`isLoggingIn`

- Cho biet request login co dang chay hay khong.
- Dung de disable input va button.

`submitError`

- Day la loi tong quat cua ca form.
- Dung khi loi khong map rieng vao field `email` hay `password`.

`inputClassName`

- Gom class CSS dung chung cho input.
- Giup tranh lap lai class qua nhieu lan.

---

### 3.4. Khoi tao `useForm`

```ts
const {
  register,
  handleSubmit,
  setError,
  clearErrors,
  formState: { errors },
} = useForm<LoginDTO>({
  resolver: zodResolver(schema),
  defaultValues: {
    email: '',
    password: '',
  },
});
```

### Giai thich tung phan

`register`

- Dung de noi input voi form state.

`handleSubmit`

- Boc callback submit.
- Chi khi du lieu hop le thi callback moi chay.

`setError`

- Dung de gan loi server vao tung field.

`clearErrors`

- Xoa loi cu truoc lan submit moi.

`errors`

- Chua loi hien tai cua tung field.

`resolver: zodResolver(schema)`

- Bao cho form biet phai validate bang schema `zod`.

`defaultValues`

- Gia tri mac dinh ban dau cua form.

---

### 3.5. Ham `onSubmit`

Doan code lien quan:

```ts
const onSubmit = handleSubmit(async (data) => {
  setSubmitError('');
  clearErrors(['email', 'password']);

  try {
    await loginAsync({
      email: data.email.trim(),
      password: data.password,
    });
  } catch (error) {
    const apiError = error as AxiosError<ApiResponse>;
    const message = apiError.response?.data?.message || 'Dang nhap that bai';
    const fieldErrors = apiError.response?.data?.errors;
    const emailError = fieldErrors?.email?.[0];
    const passwordError = fieldErrors?.password?.[0];

    if (emailError) {
      setError('email', { type: 'server', message: emailError });
    }

    if (passwordError) {
      setError('password', { type: 'server', message: passwordError });
    }

    if (emailError || passwordError) {
      return;
    }

    setSubmitError(message);
  }
});
```

### Giai thich theo luong

`setSubmitError('')`

- Reset loi tong quat cua lan submit truoc.

`clearErrors(['email', 'password'])`

- Xoa loi cu tren hai field truoc khi gui request moi.

`await loginAsync(...)`

- Goi mutation login trong hook auth.
- Du lieu gui len da duoc trim email.

`catch (error)`

- Neu request fail thi vao day.

`fieldErrors?.email?.[0]` va `fieldErrors?.password?.[0]`

- Thu doc loi field-level do backend tra ve.

`setError('email', ...)` va `setError('password', ...)`

- Neu backend tra loi theo tung field thi hien dung ngay duoi input.

`if (emailError || passwordError) return;`

- Neu da map vao field roi thi dung tai day.
- Khong can gan them loi tong quat nua.

`setSubmitError(message)`

- Neu loi khong thuoc rieng field nao, hien loi chung cua ca form.

---

### 3.6. Phan JSX render

Trong JSX co 4 nhom chinh:

1. Header cua card login
2. Form gom email va password
3. Nut submit
4. Khu demo account va link sang register

### Input email

```tsx
<input
  {...register('email', {
    setValueAs: (value: string) => value.trim(),
  })}
  id="email"
  type="email"
  autoComplete="email"
  disabled={isLoggingIn}
  aria-invalid={Boolean(errors.email)}
/>
```

Y chinh:

- `register('email', ...)` noi input voi form state
- `setValueAs` trim khoang trang o hai dau
- `disabled={isLoggingIn}` tranh submit lap
- `aria-invalid` ho tro accessibility khi field dang loi

### Input password

```tsx
<input
  {...register('password')}
  id="password"
  type="password"
  autoComplete="current-password"
  disabled={isLoggingIn}
  aria-invalid={Boolean(errors.password)}
/>
```

Y chinh:

- `type="password"` de trinh duyet an ky tu
- `autoComplete="current-password"` ho tro trinh quan ly password

### Nut submit

```tsx
<button type="submit" disabled={isLoggingIn}>
  {isLoggingIn ? 'Dang dang nhap...' : 'Dang nhap'}
</button>
```

Y chinh:

- Khi mutation dang chay thi disable nut
- Text cua nut doi theo trang thai de user biet app dang xu ly

### Demo account

Khoi nay khong lien quan toi logic dang nhap.
No chi giup tester va nguoi doc biet co tai khoan mau de thu nhanh.

### Link sang register

```tsx
<Link to="/register">Dang ky ngay</Link>
```

- Neu chua co tai khoan thi user co the chuyen sang trang dang ky.

---

## Part 4. Giai thich `frontend/src/hooks/useAuth.ts`

LoginPage khong tu goi `authService.login`.
No thong qua hook `useAuth()` de gom logic auth vao mot cho.

Doan code lien quan:

```ts
const loginMutation = useMutation({
  mutationFn: authService.login,
  onSuccess: (data) => {
    setAuth(data.user, data.tokens);
    toast.success(`Chao mung ${data.user.username}!`);
    navigate(data.user.role === 'ADMIN' ? '/admin' : '/');
  },
  onError: (error: unknown) => {
    toast.error(getApiErrorMessage(error, 'Dang nhap that bai'));
  },
});
```

### Giai thich

`mutationFn: authService.login`

- Khi mutation chay, no goi ham login trong service frontend.

`onSuccess`

- `setAuth(data.user, data.tokens)`
  - Luu user va tokens vao auth store
  - Dong thoi dat `isAuthenticated = true`
- `toast.success(...)`
  - Hien thong bao dang nhap thanh cong
- `navigate(...)`
  - Neu la admin thi vao `/admin`
  - Nguoc lai vao `/`

`onError`

- Hien toast loi tong quat.
- Con page login van co the bat loi de gan vao tung field.

### Gia tri hook tra ve cho page

```ts
return {
  login: loginMutation.mutate,
  loginAsync: loginMutation.mutateAsync,
  isLoggingIn: loginMutation.isPending,
};
```

Y nghia:

- `login` dung neu chi can fire mutation
- `loginAsync` dung khi page muon `await` va `try/catch`
- `isLoggingIn` giup UI biet request dang chay

---

## Part 5. Giai thich `frontend/src/services/auth.service.ts`

Doan login o service:

```ts
login: async (data: LoginDTO): Promise<AuthResponse> => {
  const res = await api.post('/auth/login', data);
  return res.data.data;
},
```

### Giai thich

`api.post('/auth/login', data)`

- Gui request POST toi backend endpoint `/auth/login`.

`return res.data.data`

- Backend response co dang tong quat kieu:

```ts
{
  success: true,
  data: { user, tokens },
  message: 'Dang nhap thanh cong'
}
```

- Frontend service chi boc tach phan `data` cho page va hook dung.

---

## Part 6. Giai thich `frontend/src/store/auth.store.ts`

Doan quan trong nhat cua login la:

```ts
setAuth: (user, tokens) => set({ user, tokens, isAuthenticated: true }),
```

### Giai thich

Sau khi backend tra ve `user + tokens`, hook auth goi `setAuth(...)`.
Luc nay:

- `user` duoc luu vao store
- `tokens` duoc luu vao store
- `isAuthenticated` thanh `true`

Store nay duoc `persist`, nen auth state duoc luu lai qua lan reload trinh duyet.

---

## Part 7. Giai thich `frontend/src/services/api.service.ts`

File nay khong phai login page, nhung no rat quan trong voi auth flow.

### 7.1. Gan access token vao request

```ts
api.interceptors.request.use((config) => {
  const tokens = useAuthStore.getState().tokens;
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});
```

### Giai thich

- Sau khi login thanh cong, `accessToken` da nam trong store.
- Moi request sau do se tu dong gan header `Authorization`.

### 7.2. Auto refresh khi gap 401

Doan tom tat:

```ts
if (error.response?.status === 401 && !original._retry) {
  // goi /auth/refresh bang refreshToken
  // neu thanh cong thi setAuth(user, newTokens) va gui lai request cu
  // neu that bai thi clearAuth() va day user ve /login
}
```

### Giai thich

- Neu access token het han, app thu refresh token.
- Neu refresh thanh cong, request cu duoc gui lai.
- Neu refresh that bai, session bi xoa va user quay ve trang login.

Noi cach khac:
Login tao ra bo token ban dau, con `api.service.ts` giup session song tiep ve sau.

---

## Part 8. Giai thich backend route va validate

### 8.1. `backend/src/modules/auth/auth.routes.ts`

Doan lien quan:

```ts
authRoutes.post('/login', validate(loginSchema), authController.login);
```

### Giai thich

- Nhan request `POST /auth/login`
- Chay middleware `validate(loginSchema)` truoc
- Neu du lieu hop le moi chay sang controller

### 8.2. `backend/src/modules/auth/auth.schema.ts`

Doan schema login:

```ts
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email khong hop le')
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, 'Mat khau khong duoc trong'),
});
```

### Giai thich tung dong

`trim()`

- Cat khoang trang o dau va cuoi email.

`email(...)`

- Bat buoc dung dinh dang email.

`transform((value) => value.toLowerCase())`

- Dua email ve chu thuong de xu ly nhat quan.

`password: z.string().min(1, ...)`

- Bat buoc co password.

### Vi sao backend van validate du frontend da validate

Vi frontend khong duoc coi la noi dang tin tuyet doi.
Bat ky ai cung co the bo qua UI va goi API truc tiep.

---

## Part 9. Giai thich `backend/src/modules/auth/auth.controller.ts`

Doan code:

```ts
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result, message: 'Dang nhap thanh cong' });
  } catch (error) {
    next(error);
  }
}
```

### Giai thich

`authService.login(req.body)`

- Controller dua du lieu da validate xuong service.

`res.json(...)`

- Neu service chay thanh cong thi tra response ve frontend.

`next(error)`

- Neu co loi thi day sang error middleware chung.

Controller o day rat mong.
No khong chua business logic; phan quan trong nam trong service.

---

## Part 10. Giai thich `backend/src/modules/auth/auth.service.ts`

Day la noi xu ly business logic chinh cua login.

### 10.1. Chuan hoa email

```ts
const normalizedEmail = input.email.trim().toLowerCase();
```

### Giai thich

- Cat khoang trang thua
- Dua email ve chu thuong
- Giup viec tim user nhat quan hon

### 10.2. Tim user theo email

```ts
const user = await prisma.user.findFirst({
  where: {
    email: {
      equals: normalizedEmail,
      mode: 'insensitive',
    },
  },
});
```

### Giai thich

`findFirst`

- Tim user co email trung voi email vua nhap.

`mode: 'insensitive'`

- So sanh khong phan biet hoa thuong.

Nghia la:

- `A@MAIL.COM`
- `a@mail.com`

se duoc coi la cung mot email trong truy van nay.

### 10.3. Dung `DUMMY_PASSWORD_HASH`

Doan code:

```ts
const passwordHash = user?.password ?? DUMMY_PASSWORD_HASH;
const isValidPassword = await bcrypt.compare(input.password, passwordHash);
```

### Giai thich

Neu user khong ton tai, code van goi `bcrypt.compare(...)` voi mot hash gia.
Muc dich la:

- tranh de luong xu ly khac biet qua ro giua "sai email" va "sai password"
- giu flow check password nhat quan hon

Day la mot ky thuat nho de giam ro ri thong tin.

### 10.4. Kiem tra thong tin dang nhap

```ts
if (!user || !isValidPassword) {
  throw new AppError('Email hoac mat khau khong dung', 401);
}
```

### Giai thich

- Neu khong tim thay user
- Hoac password sai
- Thi tra loi 401

Thong diep loi duoc gom chung.
No khong tiet lo la email sai hay password sai.

### 10.5. Loai password khoi response

```ts
const { password: _pw, ...safeUser } = user;
```

### Giai thich

- Tach password ra va khong cho password di ra ngoai API response.
- `safeUser` la phan user an toan hon de gui len frontend.

### 10.6. Tao token va tra ket qua

```ts
const tokens = generateTokens(user.id);

return {
  user: { ...safeUser, balance: Number(safeUser.balance) },
  tokens,
};
```

### Giai thich

`generateTokens(user.id)`

- Tao `accessToken` va `refreshToken`.

`balance: Number(safeUser.balance)`

- Prisma Decimal duoc doi thanh number de frontend de xu ly hon.

Ket qua cuoi cung backend tra ve:

- thong tin user da bo password
- cap token moi

---

## Part 11. Ket noi lai toan bo flow

Khi user nhan nut "Dang nhap", chuoi xu ly dien ra nhu sau:

1. `LoginPage` validate du lieu bang `zod`
2. Page goi `loginAsync(...)`
3. `useAuth()` goi `authService.login`
4. Service frontend goi `POST /auth/login`
5. Backend validate `loginSchema`
6. Controller goi `authService.login`
7. Service tim user, check password, tao token
8. Backend tra ve `user + tokens`
9. Frontend `setAuth(...)` vao store
10. Toast hien thanh cong va dieu huong user vao trang phu hop

---

## Part 12. Diem can nho nhat

- `LoginPage` lo viec UI, form, hien loi
- `useAuth` lo mutation, luu auth state, navigate, toast
- `auth.service.ts` o frontend lo goi API
- `auth.routes` + `auth.schema` lo validate request
- `auth.controller` chi trung gian giua HTTP va service
- `auth.service.ts` o backend moi la noi xu ly logic dang nhap that su

Neu hieu ro 6 vai tro nay, ban se doc va sua flow login de dang hon rat nhieu.
