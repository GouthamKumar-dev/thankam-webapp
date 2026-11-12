import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin,
  LocateFixed,
  ExternalLink,
  Trash2,
  CheckCircle2,
  Plus,
  Minus,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

declare global {
  interface Window {
    L?: any;
  }
}

export type LocationPinValue = {
  lat: number;
  lng: number;
  addressText?: string;
  mapUrl: string;
};

interface LocationPinMapProps {
  value: LocationPinValue | null;
  onChange: (val: LocationPinValue | null) => void;
  defaultCenter?: [number, number];
}

const DEFAULT_KOLLAM_CENTER: [number, number] = [8.8932, 76.6141];

export function LocationPinMap({
  value,
  onChange,
  defaultCenter = DEFAULT_KOLLAM_CENTER,
}: LocationPinMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [leafletLoaded, setLeafletLoaded] = useState(
    typeof window !== "undefined" && Boolean(window.L),
  );
  const [detectingGps, setDetectingGps] = useState(false);
  const [placeLabel, setPlaceLabel] = useState<string>("");

  // Accordion state: closed by default; open if data (value) is present
  const [isAccordionOpen, setIsAccordionOpen] = useState<boolean>(() => Boolean(value));
  const [hasBeenOpened, setHasBeenOpened] = useState<boolean>(() => Boolean(value));

  // Automatically open when pin data is present / detected
  useEffect(() => {
    if (value) {
      setIsAccordionOpen(true);
      setHasBeenOpened(true);
    }
  }, [value]);

  const toggleAccordion = () => {
    setIsAccordionOpen((prev) => {
      const next = !prev;
      if (next) setHasBeenOpened(true);
      return next;
    });
  };

  // When expanding accordion, invalidate Leaflet map size so canvas renders crisply
  useEffect(() => {
    if (isAccordionOpen && mapInstanceRef.current) {
      const t1 = setTimeout(() => {
        try {
          mapInstanceRef.current?.invalidateSize();
        } catch {}
      }, 60);
      const t2 = setTimeout(() => {
        try {
          mapInstanceRef.current?.invalidateSize();
        } catch {}
      }, 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [isAccordionOpen]);

  // Ensure Leaflet is available
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    let isMounted = true;
    const existingScript = document.querySelector('script[src*="leaflet.js"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        if (isMounted) setLeafletLoaded(true);
      });
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => {
      if (isMounted) setLeafletLoaded(true);
    };
    document.head.appendChild(script);

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch human-readable locality name for coordinates (reverse geocoding)
  const fetchPlaceName = useCallback((lat: number, lng: number) => {
    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      { headers: { "Accept-Language": "en" } },
    )
      .then((res) => res.json())
      .then((data) => {
        if (data?.display_name) {
          const parts = data.display_name.split(",").map((p: string) => p.trim());
          // Shorten to first 2-3 prominent segments
          const shortName = parts.slice(0, 3).join(", ");
          setPlaceLabel(shortName);
        }
      })
      .catch(() => null);
  }, []);

  // Update place label when value changes
  useEffect(() => {
    if (value) {
      fetchPlaceName(value.lat, value.lng);
    } else {
      setPlaceLabel("");
    }
  }, [value, fetchPlaceName]);

  // Create custom luxury gold pin icon with pixel-perfect bottom needle anchor
  const createGoldPinIcon = useCallback(() => {
    if (!window.L) return undefined;
    return window.L.divIcon({
      className: "thankam-pin-marker",
      html: `
        <div style="width: 32px; height: 42px; display: block; filter: drop-shadow(0 3px 6px rgba(8,12,20,0.45)); cursor: grab;">
          <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block;">
            <path d="M16 0C7.16344 0 0 7.16344 0 16C0 26 16 42 16 42C16 42 32 26 32 16C32 7.16344 24.8366 0 16 0Z" fill="#080C14"/>
            <path d="M16 1.5C7.99187 1.5 1.5 7.99187 1.5 16C1.5 24.2 16 39.5 16 39.5C16 39.5 30.5 24.2 30.5 16C30.5 7.99187 24.0081 1.5 16 1.5Z" stroke="#D4AF37" stroke-width="2"/>
            <circle cx="16" cy="16" r="5.5" fill="#F3CA52"/>
            <circle cx="16" cy="16" r="2.5" fill="#080C14"/>
          </svg>
        </div>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 42],
    });
  }, []);

  // Initialize and manage the Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !window.L || !mapContainerRef.current || !hasBeenOpened) return;

    // Destroy existing instance if container was remounted
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }

    const centerLat = value ? value.lat : defaultCenter[0];
    const centerLng = value ? value.lng : defaultCenter[1];
    const initialZoom = value ? 15 : 13;

    const map = window.L.map(mapContainerRef.current, {
      center: [centerLat, centerLng],
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
    });

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    const icon = createGoldPinIcon();

    // If initial value exists, add marker
    if (value) {
      const marker = window.L.marker([value.lat, value.lng], {
        icon,
        draggable: true,
      }).addTo(map);

      marker.on("dragend", () => {
        const pos = marker.getLatLng();
        const lat = Number(pos.lat.toFixed(6));
        const lng = Number(pos.lng.toFixed(6));
        onChange({
          lat,
          lng,
          mapUrl: `https://maps.google.com/?q=${lat},${lng}`,
        });
      });

      markerRef.current = marker;
    }

    // Map Click Listener -> Drop or move pin with precise coordinate mapping
    map.on("click", (e: any) => {
      // Invalidate size immediately so coordinates are calculated from current rendered box
      map.invalidateSize();
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const marker = window.L.marker([lat, lng], {
          icon,
          draggable: true,
        }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          const posLat = Number(pos.lat.toFixed(6));
          const posLng = Number(pos.lng.toFixed(6));
          onChange({
            lat: posLat,
            lng: posLng,
            mapUrl: `https://maps.google.com/?q=${posLat},${posLng}`,
          });
        });

        markerRef.current = marker;
      }

      onChange({
        lat,
        lng,
        mapUrl: `https://maps.google.com/?q=${lat},${lng}`,
      });
    });

    // Invalidate map size periodically as modal / container animations finish
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    const t1 = setTimeout(() => {
      try { map.invalidateSize(); } catch {}
    }, 150);
    const t2 = setTimeout(() => {
      try { map.invalidateSize(); } catch {}
    }, 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [leafletLoaded, defaultCenter, createGoldPinIcon, onChange, hasBeenOpened]);

  // Sync marker position when `value` prop changes externally
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    if (value) {
      if (markerRef.current) {
        markerRef.current.setLatLng([value.lat, value.lng]);
      } else {
        const icon = createGoldPinIcon();
        const marker = window.L.marker([value.lat, value.lng], {
          icon,
          draggable: true,
        }).addTo(mapInstanceRef.current);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          const lat = Number(pos.lat.toFixed(6));
          const lng = Number(pos.lng.toFixed(6));
          onChange({
            lat,
            lng,
            mapUrl: `https://maps.google.com/?q=${lat},${lng}`,
          });
        });

        markerRef.current = marker;
      }
      mapInstanceRef.current.panTo([value.lat, value.lng]);
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [value, createGoldPinIcon, onChange]);

  // 1-Click Detect GPS Location
  const handleDetectGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([lat, lng], 16);
          if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
          } else if (window.L) {
            const icon = createGoldPinIcon();
            const marker = window.L.marker([lat, lng], {
              icon,
              draggable: true,
            }).addTo(mapInstanceRef.current);

            marker.on("dragend", () => {
              const p = marker.getLatLng();
              const pLat = Number(p.lat.toFixed(6));
              const pLng = Number(p.lng.toFixed(6));
              onChange({
                lat: pLat,
                lng: pLng,
                mapUrl: `https://maps.google.com/?q=${pLat},${pLng}`,
              });
            });

            markerRef.current = marker;
          }
        }

        onChange({
          lat,
          lng,
          mapUrl: `https://maps.google.com/?q=${lat},${lng}`,
        });

        setDetectingGps(false);
        toast.success("Location pinned to your current GPS position!");
      },
      (err) => {
        setDetectingGps(false);
        toast.error(`Unable to retrieve GPS: ${err.message || "Permission denied"}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  return (
    <div className="rounded-2xl bg-white border border-[#D4AF37]/50 shadow-xs overflow-hidden transition-all">
      <style>{`
        .thankam-pin-marker {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
        }
      `}</style>

      {/* Accordion Trigger Header */}
      <button
        type="button"
        onClick={toggleAccordion}
        className="w-full p-4 sm:p-5 flex items-center justify-between gap-3 text-left hover:bg-amber-50/25 transition-colors select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#080C14] text-[#F3CA52] border border-[#D4AF37]/40 shadow-xs">
            <MapPin size={13} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[#B8860B]">
                Venue Location Pin Drop
              </span>
              <span className="text-[10px] font-bold bg-amber-50 text-[#B8860B] border border-[#D4AF37]/30 px-2 py-0.5 rounded-full shrink-0">
                Optional
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {value
                ? (placeLabel ? `📍 Pinned: ${placeLabel}` : `📍 Pinned: Lat ${value.lat.toFixed(4)}, Lng ${value.lng.toFixed(4)}`)
                : "Tap to open map and drop an exact venue pin for catering fleet logistics."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {value && !isAccordionOpen && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <CheckCircle2 size={12} className="text-emerald-600" />
              Pinned
            </span>
          )}
          <div
            className={`grid h-7 w-7 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-transform duration-200 ${
              isAccordionOpen ? "rotate-180 text-[#B8860B] border-[#D4AF37]/50" : ""
            }`}
          >
            <ChevronDown size={15} />
          </div>
        </div>
      </button>

      {/* Accordion Collapsible Body */}
      <div className={isAccordionOpen ? "block px-4 pb-4 sm:px-5 sm:pb-5 pt-0 border-t border-slate-100" : "hidden"}>
        <p className="text-xs text-slate-600 my-3 leading-relaxed">
          Tap anywhere on the map or drag the pin to mark your celebration venue.
        </p>

        {/* Interactive Map Canvas Container */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-300 bg-slate-100 shadow-inner">
          {/* Map View */}
          <div
            ref={mapContainerRef}
            className="h-56 w-full cursor-crosshair z-0"
            style={{ minHeight: "220px" }}
          />

          {/* Floating Instruction Banner */}
          <div className="absolute top-2.5 inset-x-0 z-10 flex justify-center pointer-events-none px-4">
            <div className="rounded-full bg-[#080C14]/90 backdrop-blur-md px-3.5 py-1 text-[11px] font-semibold text-[#F3CA52] border border-[#D4AF37]/50 shadow-md flex items-center gap-1.5">
              <MapPin size={11} className="text-[#F3CA52]" />
              <span>{value ? "Drag pin or tap map to re-position" : "Tap anywhere on map to drop pin"}</span>
            </div>
          </div>

          {/* Floating GPS Target Button */}
          <button
            type="button"
            onClick={handleDetectGps}
            disabled={detectingGps}
            className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 rounded-xl bg-white/95 hover:bg-white text-[#080C14] border border-slate-300 hover:border-[#D4AF37] px-3 py-1.5 text-xs font-bold shadow-md transition-all active:scale-95 disabled:opacity-60"
            title="Detect Current GPS Location"
          >
            {detectingGps ? (
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#B8860B] border-t-transparent" />
            ) : (
              <LocateFixed size={14} className="text-[#B8860B]" />
            )}
            <span className="hidden sm:inline">{detectingGps ? "Detecting…" : "Locate Me"}</span>
          </button>

          {/* Floating Zoom Controls */}
          <div className="absolute bottom-2.5 right-2.5 z-10 flex flex-col gap-1">
            <button
              type="button"
              onClick={handleZoomIn}
              className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-slate-700 hover:text-black border border-slate-300 shadow-sm transition active:scale-95"
              aria-label="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              className="grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-slate-700 hover:text-black border border-slate-300 shadow-sm transition active:scale-95"
              aria-label="Zoom out"
            >
              <Minus size={14} />
            </button>
          </div>
        </div>

        {/* Pinned Info & Actions Footer */}
        {value ? (
          <div className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-start sm:items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <p className="text-xs font-bold text-emerald-900 leading-tight">
                  {placeLabel || "Venue Location Pinned"}
                </p>
                <p className="text-[10px] text-emerald-700 font-mono mt-0.5">
                  Lat: {value.lat.toFixed(4)}, Lng: {value.lng.toFixed(4)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
              <a
                href={value.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#080C14] hover:text-[#B8860B] transition"
              >
                <span>Google Maps</span>
                <ExternalLink size={11} />
              </a>
              <button
                type="button"
                onClick={() => onChange(null)}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 transition"
              >
                <Trash2 size={11} />
                <span>Remove Pin</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 px-1">
            <span>No pin dropped yet. Tap on the map above to drop a marker.</span>
            <button
              type="button"
              onClick={handleDetectGps}
              className="font-bold text-[#B8860B] hover:text-[#080C14] transition shrink-0 ml-2"
            >
              Auto-Detect GPS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
