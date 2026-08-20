'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SITE_CATEGORIES,
  type ImageSourceKind,
  type MorningQueueItem,
  type MorningQueuePayload,
  type SiteCategory,
} from '@/lib/morning-queue-types';

type RowState = 'pending' | 'keeping' | 'kept' | 'tossed';

type UiItem = MorningQueueItem & {
  state: RowState;
  articleId?: string;
};

const COLORS = {
  bg: '#020817',
  card: '#1a1a2e',
  violet: '#8e5ae2',
  violetSoft: '#a855f7',
  violetDeep: '#9333ea',
  text: '#f8fafc',
  muted: '#94a3b8',
  border: '#463267',
};

function formatMetaDate(iso?: string) {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    timeZone: 'America/New_York',
  });
}

function selectedImage(item: UiItem) {
  return item.images.find((img) => img.kind === item.selectedImageKind) || item.images[0];
}

export default function MorningQueueClient() {
  const [payload, setPayload] = useState<MorningQueuePayload | null>(null);
  const [items, setItems] = useState<UiItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [swapOpen, setSwapOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tossStack, setTossStack] = useState<string[]>([]);
  const operatorName = 'James';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/morning', { cache: 'no-store' });
        if (res.status === 401) {
          window.location.href = '/auth/login';
          return;
        }
        if (!res.ok) throw new Error('Failed to load queue');
        const data: MorningQueuePayload = await res.json();
        if (cancelled) return;
        const next = data.items.map((item) => ({
          ...item,
          state: item.preKept ? ('kept' as const) : ('pending' as const),
        }));
        setPayload(data);
        setItems(next);
        const firstDecide = next.find((i) => i.state === 'pending');
        setActiveId(firstDecide?.id || next[0]?.id || null);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to load queue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const decideItems = useMemo(
    () => items.filter((i) => i.source === 'miniflux' && i.state !== 'tossed'),
    [items]
  );
  const savedItems = useMemo(
    () => items.filter((i) => i.source === 'recall' || i.state === 'kept'),
    [items]
  );
  const pendingDecide = useMemo(
    () => items.filter((i) => i.source === 'miniflux' && i.state === 'pending'),
    [items]
  );
  const recallKept = useMemo(
    () => items.filter((i) => i.source === 'recall').length,
    [items]
  );

  const setActive = useCallback((id: string) => {
    setActiveId(id);
    setSwapOpen(false);
  }, []);

  const advanceAfter = useCallback(
    (id: string, nextItems: UiItem[]) => {
      const pending = nextItems.filter((i) => i.source === 'miniflux' && i.state === 'pending');
      const currentIdx = pending.findIndex((i) => i.id === id);
      const fallback = pending[currentIdx] || pending[0] || null;
      setActiveId(fallback?.id || null);
      setSwapOpen(false);
    },
    []
  );

  const keepItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.state === 'kept' || item.state === 'keeping') return;
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, state: 'keeping' } : i)));
      const image = selectedImage(item);
      try {
        const res = await fetch('/api/admin/morning/keep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: item.id,
            title: item.title,
            url: item.url,
            excerpt: item.excerpt,
            category: item.category,
            featuredImage: image?.url,
            images: item.images.map((img) => img.url),
            extraReading: item.extraReading,
          }),
        });
        if (res.status === 401) {
          window.location.href = '/auth/login';
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Keep failed');
        }
        const data = await res.json();
        setItems((prev) => {
          const next = prev.map((i) =>
            i.id === id ? { ...i, state: 'kept' as const, articleId: data?.article?.id } : i
          );
          queueMicrotask(() => advanceAfter(id, next));
          return next;
        });
      } catch (err: any) {
        setError(err?.message || 'Keep failed');
        setItems((prev) => prev.map((i) => (i.id === id && i.state === 'keeping' ? { ...i, state: 'pending' } : i)));
      }
    },
    [advanceAfter, items]
  );

  const tossItem = useCallback(
    async (id: string) => {
      const item = items.find((i) => i.id === id);
      if (!item || item.state !== 'pending') return;
      try {
        const res = await fetch('/api/admin/morning/toss', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        });
        if (res.status === 401) {
          window.location.href = '/auth/login';
          return;
        }
        if (!res.ok) throw new Error('Toss failed');
        setTossStack((stack) => [...stack, id]);
        setItems((prev) => {
          const next = prev.map((i) => (i.id === id ? { ...i, state: 'tossed' as const } : i));
          queueMicrotask(() => advanceAfter(id, next));
          return next;
        });
      } catch (err: any) {
        setError(err?.message || 'Toss failed');
      }
    },
    [advanceAfter, items]
  );

  const undoToss = useCallback(() => {
    setTossStack((stack) => {
      const last = stack[stack.length - 1];
      if (!last) return stack;
      setItems((prev) => prev.map((i) => (i.id === last ? { ...i, state: 'pending' } : i)));
      setActiveId(last);
      setSwapOpen(false);
      return stack.slice(0, -1);
    });
  }, []);

  const changeCategory = useCallback((id: string, category: SiteCategory) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, category } : i)));
  }, []);

  const pickImage = useCallback((id: string, kind: ImageSourceKind) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, selectedImageKind: kind } : i)));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'escape') {
        setSwapOpen(false);
        return;
      }
      if (key === 'u') {
        event.preventDefault();
        undoToss();
        return;
      }
      if (!activeId) return;
      if (key === 's') {
        event.preventDefault();
        setSwapOpen((open) => !open);
        return;
      }
      if (key === 'k') {
        event.preventDefault();
        keepItem(activeId);
        return;
      }
      if (key === 't') {
        event.preventDefault();
        tossItem(activeId);
        return;
      }
      if (key === 'arrowdown' || key === 'j') {
        event.preventDefault();
        const idx = pendingDecide.findIndex((i) => i.id === activeId);
        const next = pendingDecide[idx + 1] || pendingDecide[0];
        if (next) setActive(next.id);
        return;
      }
      if (key === 'arrowup') {
        event.preventDefault();
        const idx = pendingDecide.findIndex((i) => i.id === activeId);
        const next = pendingDecide[idx - 1] || pendingDecide[pendingDecide.length - 1];
        if (next) setActive(next.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, keepItem, pendingDecide, setActive, tossItem, undoToss]);

  const busyLabel = payload?.busy ? 'busy morning' : 'light morning';

  return (
    <div
      className="-mx-4 -my-8 min-h-screen overflow-x-hidden px-4 py-8 sm:px-6"
      style={{ background: COLORS.bg, color: COLORS.text, fontFamily: 'Inter, ui-sans-serif, system-ui' }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 flex items-baseline gap-3">
              <span className="text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: COLORS.violetSoft }}>
                phipi
              </span>
              <span className="text-sm" style={{ color: COLORS.muted }}>
                Love of Tech
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-4xl">Morning queue</h1>
            <p className="mt-2 text-sm" style={{ color: COLORS.muted }}>
              {formatMetaDate(payload?.generatedAt)} · {items.filter((i) => i.state !== 'tossed').length} in queue · {busyLabel}
              {payload?.usedFixture ? ' · fixture data' : ''}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-3 py-1 text-sm font-medium"
                style={{ background: COLORS.violet, color: COLORS.text }}
              >
                {operatorName}
              </span>
              <span
                className="rounded-full px-3 py-1 text-sm"
                style={{ border: `1px solid ${COLORS.violet}`, color: COLORS.text }}
              >
                {recallKept} Recall kept
              </span>
              <span
                className="rounded-full px-3 py-1 text-sm"
                style={{ border: `1px solid ${COLORS.violet}`, color: COLORS.text }}
              >
                {pendingDecide.length} Miniflux left
              </span>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-xs md:flex" style={{ color: COLORS.muted }}>
            {[['K', 'keep'], ['T', 'toss'], ['U', 'undo'], ['S', 'swap']].map(([key, label]) => (
              <span key={key} className="flex items-center gap-1">
                <kbd
                  className="rounded px-1.5 py-0.5 font-mono"
                  style={{ background: COLORS.card, border: `1px solid ${COLORS.border}` }}
                >
                  {key}
                </kbd>
                {label}
              </span>
            ))}
          </div>
        </header>

        {error && (
          <div
            className="mb-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: '#3f1d2e', border: '1px solid #7f1d1d', color: '#fecaca' }}
          >
            {error}
          </div>
        )}

        {loading && (
          <p className="text-sm" style={{ color: COLORS.muted }}>
            Loading morning queue…
          </p>
        )}

        {!loading && (
          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: COLORS.muted }}>
                Already saved
              </h2>
              <div className="space-y-3">
                {savedItems.length === 0 && (
                  <p className="text-sm" style={{ color: COLORS.muted }}>
                    No Recall cards in this pile.
                  </p>
                )}
                {savedItems.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    active={false}
                    showDecideActions={false}
                    onActivate={() => {}}
                    onKeep={() => {}}
                    onToss={() => {}}
                    onCategory={changeCategory}
                    onToggleSwap={() => {}}
                    swapOpen={false}
                    onPickImage={pickImage}
                  />
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: COLORS.muted }}>
                Decide
              </h2>
              <div className="space-y-3">
                {decideItems.filter((i) => i.state !== 'kept').length === 0 && (
                  <p className="text-sm" style={{ color: COLORS.muted }}>
                    Decide pile is empty. Keeps already processed.
                  </p>
                )}
                {decideItems
                  .filter((i) => i.state !== 'kept')
                  .map((item, index) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      index={index + 1 + savedItems.length}
                      active={item.id === activeId}
                      showDecideActions
                      onActivate={() => setActive(item.id)}
                      onKeep={() => keepItem(item.id)}
                      onToss={() => tossItem(item.id)}
                      onCategory={changeCategory}
                      onToggleSwap={() => {
                        setActiveId(item.id);
                        setSwapOpen((open) => (activeId === item.id ? !open : true));
                      }}
                      swapOpen={swapOpen && item.id === activeId}
                      onPickImage={pickImage}
                    />
                  ))}
              </div>
            </section>
          </div>
        )}

        <footer
          className="mt-10 flex flex-col gap-3 rounded-lg px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.muted }}
        >
          <span className="leading-relaxed">Keeps process as you go. Last toss undoes.</span>
          <button
            type="button"
            onClick={undoToss}
            disabled={tossStack.length === 0}
            className="underline-offset-2 hover:underline disabled:no-underline disabled:opacity-40"
            style={{ color: COLORS.violetSoft }}
          >
            Undo toss
          </button>
        </footer>
      </div>
    </div>
  );
}

function QueueRow({
  item,
  index,
  active,
  showDecideActions,
  swapOpen,
  onActivate,
  onKeep,
  onToss,
  onCategory,
  onToggleSwap,
  onPickImage,
}: {
  item: UiItem;
  index?: number;
  active: boolean;
  showDecideActions: boolean;
  swapOpen: boolean;
  onActivate: () => void;
  onKeep: () => void;
  onToss: () => void;
  onCategory: (id: string, category: SiteCategory) => void;
  onToggleSwap: () => void;
  onPickImage: (id: string, kind: ImageSourceKind) => void;
}) {
  const image = selectedImage(item);
  const showExtra = item.state === 'kept' && item.extraReading;

  return (
    <div>
      <div
        onClick={onActivate}
        className="flex cursor-pointer flex-col gap-3 rounded-lg px-3 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-4"
        style={{
          background: COLORS.card,
          border: `1px solid ${active ? COLORS.violet : COLORS.border}`,
          borderRadius: 8,
        }}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div className="flex w-6 shrink-0 flex-col items-center gap-2 sm:w-8">
          {typeof index === 'number' && (
            <span className="text-xs" style={{ color: COLORS.muted }}>
              {index}
            </span>
          )}
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full text-xs"
            style={{
              border: `2px solid ${active || item.state === 'kept' ? COLORS.violet : COLORS.border}`,
              background: item.state === 'kept' ? COLORS.violet : 'transparent',
              color: COLORS.text,
            }}
          >
            {item.state === 'kept' ? '✓' : ''}
          </span>
        </div>

        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded" style={{ borderRadius: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image?.url} alt="" className="h-full w-full object-cover" />
          {showDecideActions && item.state === 'pending' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSwap();
              }}
              className="absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
              style={{ background: COLORS.violet, color: COLORS.text }}
            >
              Swap
            </button>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 font-medium leading-snug sm:truncate">{item.title}</div>
          <div className="text-sm" style={{ color: COLORS.muted }}>
            from {item.originLabel}
          </div>
        </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          {item.state === 'kept' && (
            <span
              className="rounded-md px-3 py-1.5 text-sm"
              style={{ background: COLORS.violet, color: COLORS.text }}
            >
              ✓ Kept
            </span>
          )}
          {item.state === 'keeping' && (
            <span className="text-sm" style={{ color: COLORS.muted }}>
              Saving draft…
            </span>
          )}
          {showDecideActions && item.state === 'pending' && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onKeep();
                }}
                className="min-h-10 flex-1 rounded-md px-3 py-2 text-sm font-medium sm:min-h-0 sm:flex-none sm:py-1.5"
                style={{ background: COLORS.violet, color: COLORS.text }}
              >
                Keep <span className="hidden opacity-70 sm:inline">K</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToss();
                }}
                className="min-h-10 flex-1 rounded-md px-3 py-2 text-sm sm:min-h-0 sm:flex-none sm:py-1.5"
                style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
              >
                Toss <span className="hidden opacity-70 sm:inline">T</span>
              </button>
            </>
          )}
        <select
          value={item.category}
          disabled={item.state === 'kept' || item.state === 'keeping'}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onCategory(item.id, e.target.value as SiteCategory)}
          className="rounded-full bg-transparent px-3 py-2 text-xs sm:py-1"
          style={{ border: `1px solid ${COLORS.border}`, color: COLORS.text }}
        >
          {SITE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat} style={{ background: COLORS.card }}>
              {cat}
            </option>
          ))}
        </select>
        </div>

        {showExtra && item.extraReading && (
          <a
            href={item.extraReading.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hidden max-w-[160px] truncate text-xs lg:inline"
            style={{ color: COLORS.violetSoft }}
          >
            🔒 {item.extraReading.title}
          </a>
        )}
      </div>

      {swapOpen && (
        <div
          className="mt-2 rounded-lg p-4"
          style={{ background: COLORS.card, border: `1px solid ${COLORS.violet}`, borderRadius: 8 }}
        >
          <div className="mb-3">
            <div className="font-medium">Image from source</div>
            <div className="text-sm" style={{ color: COLORS.muted }}>
              This is the image that will ship. Swap if it&apos;s wrong.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {item.images.map((img) => {
              const picked = img.kind === item.selectedImageKind;
              return (
                <div
                  key={img.kind}
                  className="overflow-hidden rounded-lg"
                  style={{ border: `1px solid ${picked ? COLORS.violet : COLORS.border}`, borderRadius: 8 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.label} className="h-28 w-full object-cover" />
                  <div className="flex items-center justify-between px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{img.label.split(' ')[0] === 'RSS' ? 'RSS' : img.kind === 'og' ? 'OG metadata' : 'Page'}</div>
                      {picked && (
                        <div className="text-xs" style={{ color: COLORS.violetSoft }}>
                          Picked
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onPickImage(item.id, img.kind)}
                      className="rounded-md px-2.5 py-1 text-xs font-medium"
                      style={
                        picked
                          ? { background: COLORS.violet, color: COLORS.text }
                          : { border: `1px solid ${COLORS.border}`, color: COLORS.text }
                      }
                    >
                      Use this
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs" style={{ color: COLORS.muted }}>
            S swap · Esc close
          </div>
        </div>
      )}
    </div>
  );
}
