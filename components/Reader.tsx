"use client";

import { useState } from "react";

export type Collocation = { en: string; vi: string };

/**
 * Khung trang đọc: header + thanh điều khiển + 2 cột (bài đọc | sidebar cụm từ).
 * Nội dung bài (MDX) truyền vào qua `children`; sidebar dựng từ `collocations`.
 * Các nút toggle chỉ thêm/bớt class trên container, CSS trong globals.css lo phần ẩn/hiện.
 */
export default function Reader({
  title,
  level,
  words,
  collocations,
  children,
}: {
  title: string;
  level?: string;
  words?: number;
  collocations: Collocation[];
  children: React.ReactNode;
}) {
  const [showVocab, setShowVocab] = useState(true);
  const [showCol, setShowCol] = useState(true);
  const [scale, setScale] = useState(1);

  const cls = [
    "reader",
    showVocab ? "" : "reader-hide-vocab",
    showCol ? "" : "reader-hide-col",
  ]
    .filter(Boolean)
    .join(" ");

  const metaText = [level, words ? `${words} từ` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cls}>
      <header className="reader-head">
        <h1 className="reader-title">{title}</h1>
        {metaText && <p className="reader-meta">{metaText}</p>}

        <div className="reader-controls">
          <button
            type="button"
            className="ctrl"
            aria-pressed={showVocab}
            onClick={() => setShowVocab((v) => !v)}
          >
            Nghĩa từ
          </button>
          <button
            type="button"
            className="ctrl"
            aria-pressed={showCol}
            onClick={() => setShowCol((v) => !v)}
          >
            Cụm từ
          </button>
          <span className="ctrl-spacer" />
          <button
            type="button"
            className="ctrl ctrl-icon"
            aria-label="Giảm cỡ chữ"
            onClick={() => setScale((s) => Math.max(0.8, +(s - 0.1).toFixed(2)))}
          >
            A−
          </button>
          <button
            type="button"
            className="ctrl ctrl-icon"
            aria-label="Tăng cỡ chữ"
            onClick={() => setScale((s) => Math.min(1.6, +(s + 0.1).toFixed(2)))}
          >
            A+
          </button>
        </div>
      </header>

      <div className="reader-body">
        <article className="reader-article" style={{ fontSize: `${scale}em` }}>
          {children}
        </article>

        {collocations.length > 0 && (
          <aside className="reader-sidebar">
            <div className="sidebar-head">Cụm từ</div>
            <ol className="sidebar-list">
              {collocations.map((c, i) => (
                <li key={i} className="sidebar-item">
                  <span className="sidebar-en">{c.en}</span>
                  <span className="sidebar-vi">{c.vi}</span>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </div>
  );
}
