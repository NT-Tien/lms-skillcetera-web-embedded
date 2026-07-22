import type { Metadata } from "next";
import { getSlugs } from "@/lib/content";
import Reader, { type Collocation } from "@/components/Reader";

type ArticleMeta = {
  title?: string;
  level?: string;
  words?: number;
  collocations?: Collocation[];
};

// Sinh sẵn 1 trang tĩnh cho mỗi slug trong content/.
export function generateStaticParams() {
  return getSlugs().map((slug) => ({ slug }));
}

// Slug ngoài danh sách -> 404 (không render động lúc runtime).
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { metadata } = (await import(`@/content/${slug}.mdx`)) as {
    metadata?: ArticleMeta;
  };
  return { title: metadata?.title ?? slug };
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mod = (await import(`@/content/${slug}.mdx`)) as {
    default: React.ComponentType;
    metadata?: ArticleMeta;
  };
  const Post = mod.default;
  const meta = mod.metadata ?? {};

  return (
    <Reader
      title={meta.title ?? slug}
      level={meta.level}
      words={meta.words}
      collocations={meta.collocations ?? []}
    >
      <Post />
    </Reader>
  );
}
