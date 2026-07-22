/**
 * Đánh dấu một cụm từ (collocation) trong bài, liên kết tới mục số `n` ở sidebar.
 * Dùng trong MDX: <Col n={3}>formal gardens</Col>
 * Có thể bật/tắt hiển thị số qua class .reader-hide-col trong Reader.
 */
export default function Col({
  n,
  children,
}: {
  n: number;
  children: React.ReactNode;
}) {
  return (
    <span className="col" data-col={n}>
      <span className="col-word">{children}</span>
      <sup className="col-num">{n}</sup>
    </span>
  );
}
