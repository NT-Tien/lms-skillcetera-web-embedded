import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  // Xuất web tĩnh -> thư mục `out/`, mỗi route thành 1 file HTML độc lập.
  output: "export",
  // Cho phép `.md`/`.mdx` được coi như page/route.
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // URL kiểu thư mục: /<slug>/ -> out/<slug>/index.html, tiện đặt vào iframe src.
  trailingSlash: true,
  images: {
    // Static export không có image server; cho phép <img>/next/image dùng link ngoài.
    unoptimized: true,
  },
};

const withMDX = createMDX({
  // Chưa thêm remark/rehype plugin: Turbopack dev chỉ nhận plugin dạng string.
});

export default withMDX(nextConfig);
