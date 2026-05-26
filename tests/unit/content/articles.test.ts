import { describe, it, expect } from "vitest";
import { listArticles, getArticle, articlesForStage } from "@/lib/content/articles";

describe("articles", () => {
  it("전체 목록을 읽는다", () => {
    const all = listArticles();
    expect(all.length).toBeGreaterThanOrEqual(4);
    expect(all[0]).toHaveProperty("slug");
    expect(all[0]).toHaveProperty("category");
  });
  it("slug 로 단건 + 본문을 읽는다", () => {
    const a = getArticle("coffee-caffeine");
    expect(a?.title).toContain("커피");
    expect(a?.body.length).toBeGreaterThan(0);
  });
  it("사이클 단계로 필터한다(태그 없으면 전체 노출)", () => {
    const forStim = articlesForStage("stim");
    expect(forStim.some((a) => a.slug === "coffee-caffeine")).toBe(true);
  });
});
