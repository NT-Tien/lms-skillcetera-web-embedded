import type { MDXComponents } from "mdx/types";
import Vocab from "@/components/Vocab";
import Col from "@/components/Col";

/**
 * Component MDX toàn cục — bắt buộc với App Router + @next/mdx.
 * Mọi file .mdx tự động dùng được các component/style khai báo ở đây,
 * không cần import trong từng bài.
 */
const components: MDXComponents = {
  // Component tuỳ biến cho MDX.
  Vocab,
  Col,
  // Ảnh: dùng <img> thường để hỗ trợ link ngoài, tự co giãn theo khung.
  img: (props) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      {...props}
      style={{ maxWidth: "100%", height: "auto", ...props.style }}
    />
  ),
};

export function useMDXComponents(): MDXComponents {
  return components;
}
