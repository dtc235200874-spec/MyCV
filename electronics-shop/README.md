# ElectroShop - E-commerce Demo (Cloudflare Full Stack)

Full-stack demo cửa hàng điện tử chạy trên **Cloudflare Workers**, database **D1**, lưu trữ ảnh **R2**, frontend React (Vite).

## Chuẩn bị

1. Đăng nhập Cloudflare (chỉ cần khi deploy):
   ```bash
   npx wrangler login
   ```
2. Tạo D1 và R2:
   ```bash
   npx wrangler d1 create electronics_shop_db
   npx wrangler r2 bucket create electronics-shop-images
   ```
   Cập nhật `database_id` trong `wrangler.toml` theo kết quả lệnh trên.

## Chạy local

```bash
cd electronics-shop
npm install
cd client && npm install && cd ..
npm run build
npm run db:migrate:local
npm run dev
# → http://localhost:8787
```

## Deploy

```bash
npm run db:migrate:remote
npm run deploy
```

## Tài khoản demo

- Admin: admin@shop.com / admin123
- Customer: user@shop.com / 123456

## Tính năng

- Xem sản phẩm, tìm kiếm, lọc danh mục, sắp xếp
- Chi tiết sản phẩm, giỏ hàng, thanh toán (guest & user)
- Đăng ký / đăng nhập (JWT)
- Lịch sử đơn hàng
- Admin: CRUD sản phẩm (upload ảnh lên R2), quản lý đơn hàng & trạng thái