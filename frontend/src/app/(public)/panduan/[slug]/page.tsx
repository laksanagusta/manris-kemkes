import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentationArticlePage } from "@/components/documentation/article-page";
import { documentationArticles, getDocumentationArticle } from "@/lib/documentation-content";

type DocumentationRouteProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return documentationArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: DocumentationRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getDocumentationArticle(slug);
  if (!article) return { title: "Halaman tidak ditemukan | Panduan Manris" };
  return {
    title: `${article.title} | Panduan Manris`,
    description: article.description,
  };
}

export default async function DocumentationArticleRoute({ params }: DocumentationRouteProps) {
  const { slug } = await params;
  const article = getDocumentationArticle(slug);
  if (!article) notFound();
  return <DocumentationArticlePage article={article} />;
}
