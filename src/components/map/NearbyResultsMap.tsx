import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { GeoSearch, SearchResult } from '../../repositories/search';

export function NearbyResultsMap({ origin, items, onOpen }: { origin: GeoSearch; items: SearchResult[]; onOpen: (id: string) => void }) {
  const container = useRef<HTMLDivElement | null>(null);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    const points: L.LatLngExpression[] = [[origin.latitude, origin.longitude]];
    L.circle([origin.latitude, origin.longitude], { radius: origin.radiusKm * 1000, color: '#0f766e', fillOpacity: 0.06 }).addTo(map);
    L.circleMarker([origin.latitude, origin.longitude], { radius: 7, color: '#0f172a', fillColor: '#fff', fillOpacity: 1 }).bindTooltip('Sua localização').addTo(map);
    for (const item of items) {
      if (typeof item.latitude !== 'number' || typeof item.longitude !== 'number') continue;
      points.push([item.latitude, item.longitude]);
      const marker = L.marker([item.latitude, item.longitude], { title: item.title }).bindTooltip(`${item.title} · ${(item.distance_km ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`);
      marker.on('click', () => onOpenRef.current(item.id));
      marker.addTo(map);
    }
    map.fitBounds(L.latLngBounds(points).pad(0.2), { maxZoom: 14 });
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(container.current);
    return () => { observer.disconnect(); map.remove(); };
  }, [items, origin.latitude, origin.longitude, origin.radiusKm]);
  return <div ref={container} className="nearby-results-map rounded-3xl border border-line" role="application" aria-label="Mapa dos resultados próximos" />;
}
