import { useState } from 'react';
import { PublicProblemMap } from '../components/map/PublicProblemMap';
import { useMapProblems } from '../hooks/useMapProblems';
import type { MapBounds, MapFilters } from '../types/map';
import { problemStatuses } from '../types/problemTimeline';

const categories = ['Infraestrutura', 'Educação', 'Saúde', 'Segurança', 'Tecnologia', 'Mobilidade', 'Meio Ambiente', 'Assistência Social', 'Empreendedorismo', 'Outros'];
const brazilBounds: MapBounds = { north: 6, south: -34, east: -32, west: -74 };
type FieldEvent = { target: { value: string; checked: boolean } };

export function PublicMap({ onOpen }: { onOpen: (id: string) => void }) {
  const [viewport, setViewport] = useState(brazilBounds);
  const [filters, setFilters] = useState<MapFilters>({});
  const { problems, loading, error, reload } = useMapProblems(viewport, filters);
  const setFilter = (key: keyof MapFilters, value: string | boolean) => setFilters((current) => ({ ...current, [key]: value || undefined }));

  return <section className="space-y-6">
    <header>
      <span className="text-sm font-semibold text-teal-700">Busca territorial</span>
      <h1 className="mt-2 text-4xl font-semibold">Mapa público de problemas</h1>
      <p className="mt-3 max-w-3xl text-muted">Explore apenas registros com geolocalização informada. Marcadores aproximados preservam a privacidade e nunca representam uma residência precisa.</p>
    </header>
    <div className="grid gap-3 rounded-3xl border border-line bg-white p-5 md:grid-cols-3 lg:grid-cols-5" aria-label="Filtros do mapa">
      <label className="text-sm">Estado<input aria-label="Pesquisar estado" className="mt-1 w-full rounded-xl border p-2" value={filters.state || ''} onChange={(event: FieldEvent) => setFilter('state', event.target.value)} /></label>
      <label className="text-sm">Cidade<input aria-label="Pesquisar cidade" className="mt-1 w-full rounded-xl border p-2" value={filters.city || ''} onChange={(event: FieldEvent) => setFilter('city', event.target.value)} /></label>
      <label className="text-sm">Bairro<input aria-label="Pesquisar bairro" className="mt-1 w-full rounded-xl border p-2" value={filters.neighborhood || ''} onChange={(event: FieldEvent) => setFilter('neighborhood', event.target.value)} /></label>
      <label className="text-sm">Categoria<select className="mt-1 w-full rounded-xl border p-2" value={filters.category || ''} onChange={(event: FieldEvent) => setFilter('category', event.target.value)}><option value="">Todas</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="text-sm">Status<select className="mt-1 w-full rounded-xl border p-2" value={filters.status || ''} onChange={(event: FieldEvent) => setFilter('status', event.target.value)}><option value="">Todos</option>{problemStatuses.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.verifiedOnly)} onChange={(event: FieldEvent) => setFilter('verifiedOnly', event.target.checked)} /> Somente verificados</label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(filters.recentlyUpdatedOnly)} onChange={(event: FieldEvent) => setFilter('recentlyUpdatedOnly', event.target.checked)} /> Atualizados recentemente</label>
      <button className="rounded-full border px-4 py-2 text-sm" onClick={() => setFilters({})}>Limpar filtros</button>
    </div>
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><span>Mapa temporariamente indisponível.</span><button className="rounded-full bg-amber-900 px-4 py-2 text-sm font-semibold text-white" onClick={reload}>Tentar novamente</button></div>}
    {!loading && !error && <div aria-live="polite" className="text-sm text-muted">{problems.length ? `${problems.length} problema(s) na área visível` : 'Nenhum problema geolocalizado encontrado.'}</div>}
    <PublicProblemMap problems={error ? [] : problems} bounds={viewport} onBoundsChange={setViewport} onOpen={onOpen} loading={loading} />
  </section>;
}
