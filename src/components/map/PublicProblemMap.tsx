import { useEffect, useRef, useState } from 'react';
import L, { type LayerGroup, type Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { MapBounds, MapProblem } from '../../types/map';

L.Icon.Default.mergeOptions({ iconUrl: markerIcon, iconRetinaUrl: markerIcon2x, shadowUrl: markerShadow });

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]!);

export function PublicProblemMap({ problems, bounds, onBoundsChange, onOpen, compact = false, loading = false }: {
  problems: MapProblem[];
  bounds: MapBounds;
  onBoundsChange?: (bounds: MapBounds) => void;
  onOpen: (id: string) => void;
  compact?: boolean;
  loading?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LayerGroup | null>(null);
  const [mapRevision, setMapRevision] = useState(0);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onOpenRef = useRef(onOpen);
  onBoundsChangeRef.current = onBoundsChange;
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      keyboard: true,
      scrollWheelZoom: !compact,
      zoomControl: true,
    });
    if (compact) map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { animate: false });
    else map.setView([-14.2, -51.9], 4, { animate: false });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    map.on('moveend', () => {
      if (!onBoundsChangeRef.current) return;
      const visible = map.getBounds();
      onBoundsChangeRef.current({ north: visible.getNorth(), south: visible.getSouth(), east: visible.getEast(), west: visible.getWest() });
    });
    map.on('zoomend', () => setMapRevision((revision) => revision + 1));
    mapRef.current = map;
    const invalidate = () => window.requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(invalidate);
    resizeObserver?.observe(containerRef.current);
    window.addEventListener('resize', invalidate);
    const initialInvalidation = window.setTimeout(invalidate, 0);
    return () => {
      window.clearTimeout(initialInvalidation);
      window.removeEventListener('resize', invalidate);
      resizeObserver?.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    window.requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    layer.clearLayers();

    // Grid clustering is recalculated from projected geographic coordinates at the current zoom.
    const cells = new Map<string, MapProblem[]>();
    for (const problem of problems) {
      const point = map.project([problem.location.latitude, problem.location.longitude], map.getZoom());
      const key = `${Math.floor(point.x / 60)}:${Math.floor(point.y / 60)}`;
      cells.set(key, [...(cells.get(key) ?? []), problem]);
    }

    for (const group of cells.values()) {
      const latitude = group.reduce((total, item) => total + item.location.latitude, 0) / group.length;
      const longitude = group.reduce((total, item) => total + item.location.longitude, 0) / group.length;
      if (group.length > 1) {
        const cluster = L.marker([latitude, longitude], { icon: L.divIcon({ className: 'map-cluster', html: `<span>${group.length}</span>`, iconSize: [42, 42] }) });
        cluster.bindTooltip(`Grupo com ${group.length} problemas`);
        cluster.on('click', () => map.setView([latitude, longitude], Math.min(map.getZoom() + 2, 19)));
        cluster.addTo(layer);
        continue;
      }
      const problem = group[0];
      const recent = Date.now() - Date.parse(problem.updatedAt) <= 30 * 86_400_000;
      const popup = document.createElement('div');
      popup.className = 'map-popup-content';
      popup.innerHTML = `<strong class="map-popup-title">${escapeHtml(problem.title)}</strong><p class="map-popup-meta">${escapeHtml(problem.category)} · ${escapeHtml(problem.status)}</p><p class="map-popup-location">${escapeHtml(problem.city)}, ${escapeHtml(problem.state)}</p><p class="map-popup-date">Atualizado em ${new Date(problem.updatedAt).toLocaleDateString('pt-BR')}${recent ? ' · <b>Atualizado recentemente</b>' : ''}</p>`;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'map-popup-button';
      button.textContent = 'Abrir problema';
      button.setAttribute('aria-label', `Abrir problema ${problem.title}`);
      button.addEventListener('click', () => onOpenRef.current(problem.id));
      popup.appendChild(button);
      L.marker([problem.location.latitude, problem.location.longitude], { title: problem.title, keyboard: true, alt: `Problema: ${problem.title}` }).bindPopup(popup).addTo(layer);
    }
  }, [problems, mapRevision]);

  return <div className={compact ? 'problem-map-shell problem-map-shell--compact' : 'problem-map-shell'} aria-busy={loading}>
    <div ref={containerRef} className="problem-map-canvas" role="application" aria-label="Mapa geográfico de problemas" />
    {loading && <div className="problem-map-loading" role="status" aria-label="Carregando mapa"><span className="problem-map-skeleton" /></div>}
  </div>;
}
