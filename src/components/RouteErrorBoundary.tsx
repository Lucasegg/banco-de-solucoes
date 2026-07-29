import { Component, type ErrorInfo, type ReactNode, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/I18nProvider';
import { logger } from '../lib/logger';

export type RouteErrorCategory = 'chunk-load' | 'render';

const chunkErrorNames = new Set(['ChunkLoadError', 'CSS_CHUNK_LOAD_FAILED']);
const chunkMessagePatterns = [
  /loading (?:css )?chunk [\w-]+ failed/i,
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
];

/** Classifies only well-known loader signals; all other failures stay generic. */
export function classifyRouteError(error: unknown): RouteErrorCategory {
  if (!error || typeof error !== 'object') return 'render';
  const candidate = error as { name?: unknown; message?: unknown; code?: unknown; type?: unknown; cause?: unknown };
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  if (
    (typeof candidate.name === 'string' && chunkErrorNames.has(candidate.name))
    || candidate.code === 'CSS_CHUNK_LOAD_FAILED'
    || candidate.type === 'vite:preloadError'
    || chunkMessagePatterns.some((pattern) => pattern.test(message))
  ) return 'chunk-load';
  if (candidate.cause && candidate.cause !== error) return classifyRouteError(candidate.cause);
  return 'render';
}

function RouteErrorFallback({ category, onRetry, onHome }: { category: RouteErrorCategory; onRetry: () => void; onHome: () => void }) {
  const { t } = useTranslation();
  const heading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <section role="alert" aria-labelledby="route-error-title" className="mx-auto my-10 max-w-2xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
    <h1 id="route-error-title" ref={heading} tabIndex={-1} className="text-2xl font-bold text-slate-900">{t('route.error.title')}</h1>
    <p className="mt-3 text-slate-700">{t(category === 'chunk-load' ? 'route.error.chunk' : 'route.error.generic')}</p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <button type="button" onClick={onRetry} className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">{t('route.error.retry')}</button>
      <button type="button" onClick={onHome} className="rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2">{t('route.error.home')}</button>
    </div>
  </section>;
}

type Props = { route: string; onHome: () => void; children: ReactNode };
type State = { error: unknown | null; category: RouteErrorCategory };

export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null, category: 'render' };

  static getDerivedStateFromError(error: unknown): State {
    return { error, category: classifyRouteError(error) };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    logger.warn('Route content failed', {
      category: classifyRouteError(error),
      route: this.props.route,
      build: import.meta.env.VITE_APP_VERSION || 'unknown',
    });
  }

  componentDidUpdate(previous: Props) {
    if (previous.route !== this.props.route && this.state.error) this.setState({ error: null, category: 'render' });
  }

  private retry = () => {
    // A rejected React.lazy promise is cached. A user-initiated reload retries the
    // asset request while the browser preserves the complete requested hash.
    window.location.reload();
  };

  render() {
    if (this.state.error) return <RouteErrorFallback category={this.state.category} onRetry={this.retry} onHome={this.props.onHome} />;
    return this.props.children;
  }
}
