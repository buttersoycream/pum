import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

export type Article = {
  slug: string;
  title: string;
  category: string;
  cycleStages: string[];
  summary: string;
  order: number;
  published: boolean;
  body: string;
};

const DIR = path.join(process.cwd(), "content/articles");

function read(file: string): Article {
  const raw = fs.readFileSync(path.join(DIR, file), "utf8");
  const { data, content } = matter(raw);
  return {
    slug: data.slug,
    title: data.title,
    category: data.category,
    cycleStages: data.cycle_stages ?? [],
    summary: data.summary ?? "",
    order: data.order ?? 99,
    published: data.published !== false,
    body: content.trim(),
  };
}

export function listArticles(): Article[] {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".md"))
    .map(read)
    .filter((a) => a.published !== false)
    .sort((a, b) => a.order - b.order);
}

export function getArticle(slug: string): Article | null {
  return listArticles().find((a) => a.slug === slug) ?? null;
}

/** stage 매칭(cycleStages 비었으면 전체 대상). */
export function articlesForStage(stage: string | null): Article[] {
  return listArticles().filter(
    (a) =>
      a.cycleStages.length === 0 ||
      (stage ? a.cycleStages.includes(stage) : false),
  );
}

export function articlesByCategory(category: string): Article[] {
  return listArticles().filter((a) => a.category === category);
}
