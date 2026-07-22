/**
 * Chú thích từ vựng nội tuyến: từ tiếng Anh highlight nền + nghĩa tiếng Việt bên cạnh.
 * Dùng trong MDX: <Vocab word="reign" vi="triều đại; cai trị" />
 * Nghĩa (.vocab-vi) có thể bật/tắt bằng nút trong Reader (qua class .reader-hide-vocab).
 */
export default function Vocab({ word, vi }: { word: string; vi: string }) {
  return (
    <span className="vocab" title={vi}>
      <mark className="vocab-word">{word}</mark>
      <span className="vocab-vi"> ({vi})</span>
    </span>
  );
}
