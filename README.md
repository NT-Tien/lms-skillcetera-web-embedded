# lms-skillcetera-web-embedded

Web tĩnh (Next.js static export) sinh ra **mỗi bài nội dung là một trang HTML độc lập, không header**, dùng để **nhúng sang trang khác qua `<iframe>`**.

## Thêm một bài mới

Tạo file `content/<slug>.mdx`:

```mdx
export const metadata = {
  title: "Tiêu đề bài",
  level: "IELTS",
  words: 402,
  collocations: [
    { en: "formal gardens", vi: "khu vườn được quy hoạch" },
    { en: "burnt down", vi: "bị cháy rụi" },
  ],
};

# Tiêu đề bài

Nội dung... in the <Vocab word="reign" vi="triều đại" /> of the Emperor, built
around <Col n={1}>formal gardens</Col> ... the palace <Col n={2}>burnt down</Col>.

![alt](https://link-anh-ngoai/…jpg)
```

- **Prose**: viết bằng Markdown thường.
- **`<Vocab word=".." vi=".." />`** — từ vựng nội tuyến: highlight + nghĩa hiện bên cạnh.
- **`<Col n={i}>cụm từ</Col>`** — đánh dấu collocation trong bài, ứng với mục thứ `i` của
  `metadata.collocations` (hiển thị ở sidebar bên phải). Có thể lồng `<Vocab>` bên trong.
- **`metadata.collocations`**: mảng `{ en, vi }` dựng nên sidebar cụm từ (đánh số theo thứ tự).
- **`level`, `words`**: hiển thị ở header bài. Ảnh dùng link ngoài qua `![]()` hoặc `<img>`.

Cả 2 component (`Vocab`, `Col`) dùng được ngay trong mọi `.mdx`, không cần import.
Slug (`<slug>` = tên file) tự động thành route `/<slug>/`.

## Chạy & build

```bash
npm run dev          # server dev, xem trước tại http://localhost:3001/<slug>/
npm run build        # build tĩnh → tạo thư mục out/
npm run start        # phục vụ bản out/ đã build tại http://localhost:3000  (= serve out -l 3000)
```

Sau `build`, mỗi bài nằm ở `out/<slug>/index.html`.

**Vì sao có cả `.next/` lẫn `out/`?** `next build` dựng bản trung gian trong `.next/` (cache,
code đã compile) rồi mới xuất bản tĩnh ra `out/`.

- `.next/` = xưởng nội bộ, **không đem deploy** (project này bật `output: 'export'` nên
  `next start` không dùng được).
- `out/` = **thành phẩm để deploy/nhúng** — host bằng static server bất kỳ (nginx, S3,
  Cloudflare Pages…). Lệnh `npm run start` chỉ là cách phục vụ nhanh `out/` để kiểm thử cục bộ.

Cả hai đã nằm trong `.gitignore`.

> `npm run dev` chạy ở cổng **3001**, còn `npm run start` phục vụ `out/` ở cổng **3000** (khớp
> `http://localhost:3000` trong allowlist bên dưới, để test nhúng iframe được).

## Nhúng

```html
<iframe src="https://<domain>/<slug>/" width="100%" height="600" frameborder="0"></iframe>
```

`app/page.tsx` (route `/`) chỉ là trang liệt kê để xem trước lúc dev — không dùng để nhúng.

## Giới hạn domain được nhúng

Allowlist khai báo **một chỗ duy nhất** — directive `frame-ancestors` trong [`vercel.json`](./vercel.json):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "frame-ancestors http://localhost:3000 https://lms-skillcetera.duckdev.work"
        }
      ]
    }
  ]
}
```

Khi deploy lên Vercel, header CSP ở trên được áp lên mọi phản hồi → trình duyệt **từ chối nhúng**
từ origin không có trong `frame-ancestors`, **không bypass được**. Đây là lớp bảo vệ thật.

- Host khác thì set header tương đương: nginx `add_header Content-Security-Policy "frame-ancestors ..." always;`, Cloudflare/Netlify dùng file `_headers`.
- `frame-ancestors` được các trình duyệt hiện đại hỗ trợ đầy đủ; nhiều domain thì liệt kê cách nhau bằng dấu cách.

> Đổi domain nhúng: **chỉ sửa `vercel.json`** rồi deploy lại. Không còn file cấu hình thứ hai.

## Cache

Header cache khai trong [`vercel.json`](./vercel.json), chia 2 nhóm:

| Đường dẫn | Cache-Control | Ý nghĩa |
|---|---|---|
| `/_next/static/*` | `public, max-age=31536000, immutable` | JS/CSS có hash trong tên → cache 1 năm; đổi nội dung sinh tên file mới nên tự "bust". |
| HTML & phần còn lại | `public, max-age=0, s-maxage=86400, must-revalidate` | CDN Vercel cache **24h** (`s-maxage`); browser revalidate mỗi lần load nhưng đánh vào CDN (ETag → 304, rất nhẹ). |

**Vì sao 24h đặt ở CDN chứ không phải browser?** Cache của browser là riêng từng máy, server
không purge từ xa được — nếu cho browser `max-age=86400` thì suốt 24h nó **không hỏi lại**, deploy
bản mới cũng không tới được máy đã cache. Đặt 24h ở `s-maxage` (CDN) thì:

- CDN giữ bản cache 24h → phục vụ nhanh, đỡ tải origin.
- **Deploy lại = Vercel tự purge CDN** → bản mới lên ngay, không cần thao tác reset thủ công.
- Browser luôn revalidate (`max-age=0`) nên không bao giờ kẹt bản cũ.

> Ảnh link ngoài (vd Wikimedia) cache theo header của chính máy chủ ảnh — mình không kiểm soát.

## Bảo trì (maintain)

- **Thêm / sửa / xoá bài**: chỉ thao tác trong `content/*.mdx`. Route, trang index và danh
  sách static params tự cập nhật theo file có trong thư mục — không phải sửa code.
- **Đổi danh sách domain nhúng**: chỉ sửa `frame-ancestors` trong `vercel.json` rồi deploy lại.
- **Sửa giao diện vocab/collocation**: `components/Vocab.tsx`, `components/Col.tsx`. Muốn thêm
  loại component MDX mới (vd audio, quiz): tạo trong `components/` rồi khai báo vào
  `mdx-components.tsx` là mọi bài `.mdx` dùng được, không cần import.
- **Bố cục & style trang đọc** (2 cột, header, nút điều khiển, sidebar): `components/Reader.tsx`
  + các class `.reader-*` trong `app/globals.css`. Font đọc dùng Lora (khai ở `app/layout.tsx`).
- **Nút điều khiển** (Nghĩa từ / Cụm từ / A- A+): logic trong `Reader.tsx`, ẩn/hiện bằng class
  `.reader-hide-vocab` / `.reader-hide-col` trong `globals.css`.
- **Sau mọi thay đổi nội dung**: chạy lại `npm run build` để tạo lại `out/` rồi deploy. (Nếu
  deploy qua Git + Vercel thì tự build khi push.)

## Cấu trúc thư mục

```
app/
  layout.tsx        # layout tối giản, không header (khung cho iframe)
  page.tsx          # trang index liệt kê bài — chỉ để xem trước lúc dev
  [slug]/page.tsx   # route động: mỗi slug -> 1 trang tĩnh
content/            # nội dung các bài (.mdx) — nơi thêm/sửa bài
components/
  Reader.tsx        # khung 2 cột + header + nút điều khiển (client, tương tác)
  Vocab.tsx         # từ vựng nội tuyến (highlight + nghĩa)
  Col.tsx           # đánh dấu collocation, liên kết sidebar
lib/content.ts      # đọc danh sách slug từ content/
mdx-components.tsx  # map component MDX toàn cục (bắt buộc)
vercel.json         # allowlist domain nhúng (CSP frame-ancestors) + cache + config Vercel
next.config.ts      # bật output:'export' + MDX
```
