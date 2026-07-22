import Link from "next/link";
import { getSlugs } from "@/lib/content";

// Trang index chỉ để xem trước/kiểm thử lúc dev — KHÔNG dùng để nhúng.
export default function Home() {
  const slugs = getSlugs();

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Content pages</h1>
      <ul className="space-y-2">
        {slugs.map((slug) => (
          <li key={slug}>
            <Link className="text-blue-600 underline" href={`/${slug}/`}>
              {slug}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
