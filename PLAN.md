# Relationship Manager — Kế hoạch dự án

## Stack công nghệ

| Layer      | Công nghệ                  | Ghi chú                                      |
|------------|----------------------------|----------------------------------------------|
| Frontend   | React + Vite (SPA)         | Deploy lên Cloudflare Pages                  |
| API        | Hono.js                    | Deploy lên Vercel (serverless functions)     |
| ORM        | Drizzle ORM                | Type-safe, tương thích tốt với Neon Postgres |
| Database   | Neon PostgreSQL            | Serverless, free tier                        |
| Auth       | Clerk                      | Đăng nhập bắt buộc, quản lý session         |
| UI         | Shadcn/ui + Tailwind CSS   | Component library                            |
| Monorepo   | pnpm workspaces            | Đơn giản, không cần Turborepo               |

---

## Cấu trúc thư mục

```
relationships/
├── apps/
│   ├── web/                        # React + Vite → Cloudflare Pages
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── ui/             # Shadcn components
│   │   │   │   └── contacts/       # ContactCard, ContactForm, ...
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── ContactsPage.tsx
│   │   │   │   ├── ContactDetailPage.tsx
│   │   │   │   ├── ContactNewPage.tsx
│   │   │   │   └── BirthdaysPage.tsx
│   │   │   ├── lib/
│   │   │   │   └── api.ts          # Fetch wrapper gọi API
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   └── package.json
│   │
│   └── api/                        # Hono.js → Vercel
│       ├── src/
│       │   ├── db/
│       │   │   ├── schema.ts       # Drizzle schema
│       │   │   ├── migrations/     # File SQL sinh ra bởi drizzle-kit
│       │   │   └── index.ts        # Neon connection
│       │   ├── routes/
│       │   │   ├── contacts.ts
│       │   │   └── birthdays.ts
│       │   ├── middleware/
│       │   │   └── auth.ts         # Xác thực Clerk token
│       │   └── index.ts            # Hono app entry
│       ├── vercel.json
│       └── package.json
│
├── package.json                    # pnpm workspaces root
└── pnpm-workspace.yaml
```

---

## Database Schema

```typescript
// apps/api/src/db/schema.ts
import { pgTable, uuid, text, integer, date, time, timestamp, jsonb, boolean, index, primaryKey } from "drizzle-orm/pg-core";

export const contacts = pgTable("contacts", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull(),   // Clerk user ID — mỗi user chỉ thấy data của mình
  createdAt:   timestamp("created_at").defaultNow(),
  updatedAt:   timestamp("updated_at").defaultNow(),

  // Thông tin cơ bản
  fullName:    text("full_name").notNull(),
  phone:       text("phone"),
  facebook:    text("facebook"),
  zalo:        text("zalo"),
  tiktok:      text("tiktok"),
  birthYear:   integer("birth_year"),
  birthday:    text("birthday"),            // Định dạng "MM-DD" để so sánh hàng năm

  // Địa lý
  hometown:    text("hometown"),
  address:     text("address"),

  // Học vấn
  university:  text("university"),
  highSchool:  text("high_school"),

  // Công việc
  jobTitle:        text("job_title"),
  hasWorkSchedule: boolean("has_work_schedule").default(false), // false = học sinh, nội trợ, thất nghiệp, ...
  workStartAm:     time("work_start_am"),   // Giờ vào làm sáng   — chỉ dùng khi hasWorkSchedule = true
  lunchBreak:      time("lunch_break"),     // Giờ nghỉ trưa
  workStartPm:     time("work_start_pm"),   // Giờ vào làm chiều
  workEndPm:       time("work_end_pm"),     // Giờ tan làm

  // Mở rộng
  family:      jsonb("family"),             // { "bố": "...", "mẹ": "...", "anh/chị": [] }
  hobbies:     text("hobbies").array(),
  notes:       text("notes"),

  // Archive — null nghĩa là active, có timestamp nghĩa là đã archive
  archivedAt:  timestamp("archived_at"),
}, (t) => [
  index("contacts_user_id_idx").on(t.userId),
  index("contacts_birthday_idx").on(t.birthday),
]);

// Categories — user-defined labels, mỗi user tự quản lý danh mục của mình
export const categories = pgTable("categories", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    text("user_id").notNull(),
  name:      text("name").notNull(),         // VD: "Bạn thân", "Đồng nghiệp", "Khách hàng"
  color:     text("color").notNull(),        // Hex color, VD: "#3b82f6"
  sortIndex: integer("sort_index").notNull().default(0), // Thứ tự hiển thị do user sắp xếp
  createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
  index("categories_user_id_idx").on(t.userId),
  uniqueIndex("categories_user_name_uidx").on(t.userId, t.name), // Không cho tạo 2 category cùng tên
]);

// Junction table — một contact có thể thuộc nhiều category
// Không dùng cascade delete phía category để tránh mất liên kết ngầm
export const contactCategories = pgTable("contact_categories", {
  contactId:  uuid("contact_id").notNull().references(() => contacts.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "restrict" }),
}, (t) => [
  primaryKey({ columns: [t.contactId, t.categoryId] }),
]);
```

---

## API Endpoints

### Contacts

| Method | Endpoint                      | Mô tả                                                          |
|--------|-------------------------------|----------------------------------------------------------------|
| GET    | `/api/contacts`               | Danh sách active, hỗ trợ `?search=&sort=&categoryId=`        |
| POST   | `/api/contacts`               | Tạo contact mới (body có thể kèm `categoryIds: string[]`)     |
| GET    | `/api/contacts/:id`           | Chi tiết một contact (kèm categories)                         |
| PUT    | `/api/contacts/:id`           | Cập nhật contact (body có thể kèm `categoryIds`)              |
| DELETE | `/api/contacts/:id`           | Xoá vĩnh viễn contact                                        |
| PATCH  | `/api/contacts/:id/archive`   | Archive contact (set `archivedAt = now()`)                    |
| PATCH  | `/api/contacts/:id/unarchive` | Khôi phục contact (`archivedAt = null`)                       |
| GET    | `/api/contacts/archived`      | Danh sách các contact đã archive                              |

### Birthdays

| Method | Endpoint                  | Mô tả                                     |
|--------|---------------------------|-------------------------------------------|
| GET    | `/api/birthdays/upcoming` | Sinh nhật trong 30 ngày tới (chỉ active) |

### Categories

| Method | Endpoint                      | Mô tả                                                                         |
|--------|-------------------------------|-------------------------------------------------------------------------------|
| GET    | `/api/categories`             | Danh sách tất cả category của user, sắp xếp theo `sortIndex`                 |
| POST   | `/api/categories`             | Tạo category mới — 409 nếu trùng tên                                         |
| PUT    | `/api/categories/:id`         | Đổi tên / màu / sortIndex — 409 nếu tên mới trùng category khác              |
| PATCH  | `/api/categories/reorder`     | Cập nhật `sortIndex` hàng loạt (body: `[{ id, sortIndex }]`)                 |
| DELETE | `/api/categories/:id`         | Xoá category — **block** nếu còn contact đang dùng, trả về số lượng bị ảnh hưởng |

Tất cả endpoints yêu cầu Clerk JWT token trong header `Authorization: Bearer <token>`.

---

## Giao diện (các trang)

### `/login`
- Màn hình đăng nhập qua Clerk

### `/categories` — Quản lý categories
- Danh sách categories của user (tên + màu), sắp xếp theo `sortIndex`
- Tạo category mới — báo lỗi rõ ràng nếu trùng tên
- Đổi tên / đổi màu inline
- Kéo thả để sắp xếp lại thứ tự (gọi PATCH `/api/categories/reorder`)
- Xoá: nếu category đang được dùng, hiện dialog "Category này đang gán cho X contact. Xoá sẽ gỡ khỏi tất cả — tiếp tục?" rồi mới cho phép xoá (client tự gỡ liên kết trước, sau đó xoá category)

### `/` — Danh sách contacts
- Search theo tên, số điện thoại
- Lọc theo category (sidebar hoặc filter chips)
- Hiển thị badge category trên mỗi ContactCard
- Nút thêm mới

### `/contacts/new` — Thêm contact
- Form đầy đủ tất cả các trường
- Chọn một hoặc nhiều category (multi-select từ danh sách category của user)
- Validation phía client

### `/contacts/:id` — Chi tiết contact
- Hiển thị toàn bộ thông tin
- Hiển thị các category badge (tên + màu)
- Nút chỉnh sửa / xoá / archive

### `/archived` — Danh sách đã archive
- Hiển thị các contact đã archive
- Nút khôi phục (unarchive) hoặc xoá vĩnh viễn

### `/birthdays` — Dashboard sinh nhật
- Danh sách sinh nhật trong 30 ngày tới
- Highlight người có sinh nhật hôm nay

---

## Các bước triển khai

- [x] **Bước 1** — Khởi tạo monorepo (pnpm workspaces)
- [x] **Bước 2** — Setup `apps/api`: Hono + Drizzle + Neon connection
- [x] **Bước 3** — Viết schema contacts, chạy migration lần đầu
- [x] **Bước 4** — Viết API routes contacts + birthdays + middleware xác thực Clerk
- [x] **Bước 5** — Setup `apps/web`: Vite + React + Tailwind + Clerk
- [x] **Bước 6** — Xây dựng các trang UI (contacts CRUD, archived, birthdays)
- [x] **Bước 7** — Bổ sung categories: schema + migration
- [x] **Bước 8** — Viết API routes `/api/categories` + cập nhật contacts routes (filter, join)
- [x] **Bước 9** — UI categories: trang `/categories`, filter trên ContactsPage, badge trên card/detail, multi-select trong form
- [ ] **Bước 10** — Deploy API lên Vercel, web lên Cloudflare Pages
- [ ] **Bước 11** — Cấu hình biến môi trường production

---

## Biến môi trường

### `apps/api/.env`
```
DATABASE_URL=          # Neon connection string
CLERK_SECRET_KEY=      # Clerk backend secret
```

### `apps/web/.env`
```
VITE_API_URL=          # URL của Vercel API
VITE_CLERK_PUBLISHABLE_KEY=   # Clerk frontend key
```
