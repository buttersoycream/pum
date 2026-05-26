import { getArticle, listArticles } from "@/lib/content/articles";
import { BetaDisclaimer } from "@/components/safety/BetaDisclaimer";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return listArticles().map((a) => ({ slug: a.slug }));
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = getArticle(slug);
  if (!a) notFound();
  return (
    <article className="space-y-4 py-6">
      <h1 className="text-2xl font-semibold">{a.title}</h1>
      <div className="prose prose-sm max-w-none leading-relaxed">
        <ReactMarkdown>{a.body}</ReactMarkdown>
      </div>
      <BetaDisclaimer />
    </article>
  );
}
