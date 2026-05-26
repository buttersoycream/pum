import { listArticles } from "@/lib/content/articles";
import Link from "next/link";

const CATEGORY_LABEL: Record<string, string> = {
  tips: "꿀팁", mind: "마음 돌봄", couple: "부부", places: "함께 갈 곳",
};

export default function ArticlesPage() {
  const all = listArticles();
  const cats = [...new Set(all.map((a) => a.category))];
  return (
    <div className="space-y-6 py-6">
      <h1 className="text-2xl font-semibold">이야기</h1>
      {cats.map((c) => (
        <section key={c} className="space-y-2">
          <h2 className="font-medium">{CATEGORY_LABEL[c] ?? c}</h2>
          <ul className="space-y-2">
            {all.filter((a) => a.category === c).map((a) => (
              <li key={a.slug}>
                <Link href={`/articles/${a.slug}`} className="hover:bg-muted block rounded-lg border p-3">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-muted-foreground text-sm">{a.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
