# Google indexing for Manrisk

Production URL: https://manrisk.dikalaksana.com

## Configuration

- `src/lib/site.ts` defines the production URL used by metadata and sitemap.
- The homepage and public documentation explicitly allow indexing.
- Root metadata defaults to `noindex, nofollow`, including account and internal application routes. New public pages must explicitly opt in and define their own canonical URL.
- `/sitemap.xml` includes the homepage and articles from `documentationArticles`. Add any future public pages to this sitemap.
- `/robots.txt` allows page crawling so crawlers can read `noindex` directives. API routes are excluded from crawling. Authentication still controls access to private data.
- Sitemap entries omit `lastModified` until actual content modification dates are available.

## After deployment

1. Confirm `/robots.txt` and `/sitemap.xml` return HTTP 200 on the production domain.
2. Open Google Search Console and add the URL-prefix property `https://manrisk.dikalaksana.com/`.
3. Complete ownership verification. The HTML-file method can use the exact file Google supplies in `frontend/public/`, then redeploy. Alternatively, verify through your DNS provider.
4. Submit `https://manrisk.dikalaksana.com/sitemap.xml` in the Sitemaps report.
5. Inspect the homepage and `/docs/introduction`, run the live URL test, and request indexing.
6. Monitor the Page Indexing report for crawl or indexing issues.

Ownership verification requires access to the site's Google Search Console account or DNS provider. A sitemap and indexing requests do not guarantee indexing or ranking.

The repository's `.github/workflows/deploy.yml` deploys production on pushes to `main`.
