export const DEFAULT_ARTICLE_AUTHOR = 'Gloria';

export function articleAuthor(name?: string | null) {
  const trimmed = (name || '').trim();
  return trimmed || DEFAULT_ARTICLE_AUTHOR;
}
