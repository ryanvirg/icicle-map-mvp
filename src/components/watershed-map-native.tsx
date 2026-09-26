"use client";

import { WATERSHED_FEATURES, type WatershedFeature } from "@/data/watershed";
import {
  addRemoteBasemapIfAvailable,
  createWatershedStyle,
} from "@/lib/watershed-map-style";
import { useEffect, useRef } from "react";

const kindColor: Record<WatershedFeature["kind"], string> = {
  lake: "#2563eb",
  tributary: "#0d9488",
  diversion: "#b45309",
  gage: "#ca8a04",
  channel: "#7c3aed",
  confluence: "#64748b",
};

type Props = {
  selectedId: string | null;
  onSelect: (feature: WatershedFeature) => void;
  onReady: () => void;
  onFailed: (message: string) => void;
};

type MapInstance = import("maplibre-gl").Map;

export function WatershedMapNative({
  selectedId,
  onSelect,
  onReady,
  onFailed,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  const onFailedRef = useRef(onFailed);
  onSelectRef.current = onSelect;
  onReadyRef.current = onReady;
  onFailedRef.current = onFailed;
  const readyRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;
    let map: MapInstance;

    const bindInteractions = () => {
      if (!map || cancelled) return;
      map.on("click", "watershed-points", (e) => {
        const id = e.features?.[0]?.properties?.id as string | undefined;
        if (!id) return;
        const feature = WATERSHED_FEATURES.find((f) => f.id === id);
        if (feature) onSelectRef.current(feature);
      });
      map.on("mouseenter", "watershed-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "watershed-points", () => {
        map.getCanvas().style.cursor = "";
      });
    };

    const finishReady = () => {
      if (cancelled || readyRef.current) return;
      const lngs = WATERSHED_FEATURES.map((f) => f.coordinates[0]);
      const lats = WATERSHED_FEATURES.map((f) => f.coordinates[1]);
      map.fitBounds(
        [
          [Math.min(...lngs) - 0.04, Math.min(...lats) - 0.03],
          [Math.max(...lngs) + 0.04, Math.max(...lats) + 0.03],
        ],
        { padding: 48, duration: 0 },
      );
      if (!map.getCanvas()) return;
      containerRef.current?.setAttribute("data-vectors-painted", "true");
      readyRef.current = true;
      map.triggerRepaint();
      onReadyRef.current();
    };

    import("maplibre-gl")
      .then((maplibregl) => {
        if (cancelled || !containerRef.current) return;
        map = new maplibregl.Map({
          container: containerRef.current,
          style: createWatershedStyle(),
          center: [-120.74, 47.56],
          zoom: 9,
          attributionControl: { compact: true },
        });
        mapRef.current = map;

        let interactionsBound = false;
        const attemptReady = () => {
          if (cancelled || readyRef.current) return;
          if (!interactionsBound) {
            bindInteractions();
            interactionsBound = true;
          }
          addRemoteBasemapIfAvailable(map);
          finishReady();
        };

        map.on("load", attemptReady);
        map.on("idle", attemptReady);
        window.setTimeout(attemptReady, 2000);
        window.setTimeout(attemptReady, 5000);

        map.on("error", () => {
          /* Ignore raster tile errors; offline vectors remain in the base style. */
        });
      })
      .catch((err) => onFailedRef.current(String(err)));

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getSource("watershed-points")) return;
    const source = map.getSource("watershed-points") as import("maplibre-gl").GeoJSONSource;
    source.setData({
      type: "FeatureCollection",
      features: WATERSHED_FEATURES.map((f) => ({
        type: "Feature",
        properties: {
          id: f.id,
          name: f.name,
          kind: f.kind,
          color: kindColor[f.kind],
        },
        geometry: { type: "Point", coordinates: f.coordinates },
      })),
    });
    map.setPaintProperty("watershed-points", "circle-radius", [
      "case",
      ["==", ["get", "id"], selectedId ?? ""],
      13,
      ["match", ["get", "kind"], "channel", 11, 9],
    ]);
  }, [selectedId]);

  return (
    <>
      <div
        ref={containerRef}
        className="absolute inset-0 h-full w-full"
        data-vectors-painted="false"
      />
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-xl bg-white/92 px-4 py-2 text-center shadow-md">
        <p className="text-[11px] font-semibold text-slate-800">Watershed legend</p>
        <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-600" /> Lakes
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-teal-600" /> Tributaries
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-700" /> Diversions
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-yellow-600" /> Gages
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-violet-600" /> Hist. Channel
          </span>
        </div>
      </div>
    </>
  );
}
