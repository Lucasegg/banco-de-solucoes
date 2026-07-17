import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapBounds, MapProblem } from "../../types/map";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]!);

export function PublicProblemMap({ problems, bounds, onBoundsChange, onOpen, compact = false }: {
  problems: MapProblem[];
  bounds: MapBounds;
  onBoundsChange?: (bounds: MapBounds) => void;
  onOpen: (id: string) => void;
  compact?: boolean;
}) {
  const containerRef = useRef<HTMLElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [mapRevision, setMapRevision] = useState(0);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const onOpenRef = useRef(onOpen);
  onBoundsChangeRef.current = onBoundsChange;
  onOpenRef.current = onOpen;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, { keyboard: true, scrollWheelZoom: !compact, zoomControl: true });
    map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { animate: false });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    markersRef.current = L.layerGroup().addTo(map);
    map.on("moveend", () => {
      if (!onBoundsChangeRef.current) return;
      const visible = map.getBounds();
      onBoundsChangeRef.current({ north: visible.getNorth(), south: visible.getSouth(), east: visible.getEast(), west: visible.getWest() });
    });
    map.on("zoomend", () => setMapRevision((revision) => revision + 1));
    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    resizeObserver.observe(container);
    map.invalidateSize({ pan: false });

    return () => {
      resizeObserver.disconnect();
      map.remove();
      markersRef.current = null;
      mapRef.current = null;
    };
  }, [compact]);

  useEffect(() => {
    const map = mapRef.current;
    const layer = markersRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    const cells = new globalThis.Map<string, MapProblem[]>();
    for (const problem of problems) {
      const point = map.project([problem.location.latitude, problem.location.longitude], map.getZoom());
      const key = `${Math.floor(point.x / 60)}:${Math.floor(point.y / 60)}`;
      cells.set(key, [...(cells.get(key) ?? []), problem]);
    }

    for (const group of cells.values()) {
      const latitude = group.reduce((total, item) => total + item.location.latitude, 0) / group.length;
      const longitude = group.reduce((total, item) => total + item.location.longitude, 0) / group.length;
      if (group.length > 1) {
        const cluster = L.marker([latitude, longitude], { icon: L.divIcon({ className: "map-cluster", html: `<span>${group.length}</span>`, iconSize: [42, 42] }) });
        cluster.bindTooltip(`Grupo com ${group.length} problemas`);
        cluster.on("click", () => map.setView([latitude, longitude], Math.min(map.getZoom() + 2, 19)));
        cluster.addTo(layer);
        continue;
      }
      const problem = group[0];
      const recent = Date.now() - Date.parse(problem.updatedAt) <= 30 * 86_400_000;
      const popup = document.createElement("div");
      popup.innerHTML = `<strong>${escapeHtml(problem.title)}</strong><p>${escapeHtml(problem.category)} · ${escapeHtml(problem.status)}</p><p>${escapeHtml(problem.city)}, ${escapeHtml(problem.state)}</p><p>Atualizado em ${new Date(problem.updatedAt).toLocaleDateString("pt-BR")}${recent ? " · <b>Atualizado recentemente</b>" : ""}</p>`;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-popup-button";
      button.textContent = "Abrir problema";
      button.setAttribute("aria-label", `Abrir problema ${problem.title}`);
      button.addEventListener("click", () => onOpenRef.current(problem.id));
      popup.appendChild(button);
      L.marker([problem.location.latitude, problem.location.longitude], { title: problem.title, keyboard: true, alt: `Problema: ${problem.title}` }).bindPopup(popup).addTo(layer);
    }
  }, [problems, mapRevision]);

  return <div ref={containerRef} className={`public-problem-map rounded-3xl ${compact ? "public-problem-map--compact" : ""}`} role="application" aria-label="Mapa geográfico de problemas" />;
}
