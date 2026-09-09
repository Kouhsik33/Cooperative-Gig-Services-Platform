import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { colors, radius, spacing, type } from "../../theme/tokens";

// Live map for the en-route tracking view, on BOTH the customer's and the
// worker's screen. Rendered via react-native-webview + Leaflet + OSM
// tiles: no native map SDK, so it works in Expo Go with no dev-client
// rebuild and looks identical on iOS and Android. The worker marker is
// driven entirely from React Native (injectJavaScript) — movement is the
// SIMULATED, deterministic position streamed by the backend over
// Socket.io, never real device GPS.

export interface LatLng {
  latitude: number;
  longitude: number;
}

interface Props {
  destination: LatLng & { label: string };
  worker?: (LatLng & { label: string }) | null;
  phase: "IDLE" | "EN_ROUTE" | "ARRIVED";
  etaSeconds?: number | null;
  distanceKm?: number | null;
  etaLabel: string;
  arrivedLabel: string;
}

const PRIMARY = colors.primary;
const ACCENT = colors.secondary;

function buildHtml(dest: LatLng, worker: LatLng | null): string {
  const center = worker ?? dest;
  return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>
<style>
  html,body,#map{height:100%;margin:0;padding:0;background:#e8eef0}
  .pin{border-radius:50%;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.35)}
  .pin-worker{width:20px;height:20px;background:${PRIMARY};transition:transform .1s linear}
  .pin-dest{width:16px;height:16px;background:${ACCENT}}
  .leaflet-marker-icon.worker-wrap{transition:transform 2s linear}
</style></head><body><div id="map"></div>
<script>
  var map = L.map('map', { zoomControl:false, attributionControl:false, dragging:true, tap:false })
    .setView([${center.latitude}, ${center.longitude}], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

  var destIcon = L.divIcon({ className:'', html:'<div class="pin pin-dest"></div>', iconSize:[16,16], iconAnchor:[8,8] });
  var workerIcon = L.divIcon({ className:'worker-wrap', html:'<div class="pin pin-worker"></div>', iconSize:[20,20], iconAnchor:[10,10] });

  var dest = L.marker([${dest.latitude}, ${dest.longitude}], { icon: destIcon }).addTo(map);
  var worker = null, route = null;

  function setWorker(lat, lng) {
    if (!worker) {
      worker = L.marker([lat,lng], { icon: workerIcon }).addTo(map);
    } else {
      worker.setLatLng([lat,lng]);
    }
    if (route) { map.removeLayer(route); }
    route = L.polyline([[lat,lng],[${dest.latitude},${dest.longitude}]], { color:'${PRIMARY}', weight:4, opacity:.55, dashArray:'2,8' }).addTo(map);
    try { map.fitBounds(L.latLngBounds([[lat,lng],[${dest.latitude},${dest.longitude}]]).pad(0.35), { animate:true }); } catch(e){}
  }

  function arrived() {
    if (worker) worker.setLatLng([${dest.latitude}, ${dest.longitude}]);
    if (route) { map.removeLayer(route); route = null; }
    map.setView([${dest.latitude}, ${dest.longitude}], 16, { animate:true });
  }

  ${worker ? `setWorker(${worker.latitude}, ${worker.longitude});` : ``}
  document.addEventListener('message', function(e){ handle(e.data); });
  window.addEventListener('message', function(e){ handle(e.data); });
  function handle(raw){
    try { var m = JSON.parse(raw);
      if (m.type === 'worker') setWorker(m.lat, m.lng);
      else if (m.type === 'arrived') arrived();
    } catch(e){}
  }
</script></body></html>`;
}

export default function LiveMap({
  destination,
  worker,
  phase,
  etaSeconds,
  distanceKm,
  etaLabel,
  arrivedLabel,
}: Props) {
  const ref = useRef<WebView>(null);

  // HTML is built once with the INITIAL positions; every later update is
  // an injected message so the WebView never reloads mid-trip.
  const html = useMemo(
    () => buildHtml(destination, worker ?? null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const message =
    phase === "ARRIVED"
      ? JSON.stringify({ type: "arrived" })
      : worker
      ? JSON.stringify({ type: "worker", lat: worker.latitude, lng: worker.longitude })
      : "";

  const lastSent = useRef<string>("");
  useEffect(() => {
    if (message && message !== lastSent.current && ref.current) {
      lastSent.current = message;
      ref.current.injectJavaScript(`handle(${JSON.stringify(message)}); true;`);
    }
  }, [message]);

  const mins = etaSeconds != null ? Math.max(1, Math.round(etaSeconds / 60)) : null;

  return (
    <View style={styles.wrap}>
      <WebView
        ref={ref}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.web}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
        onMessage={() => {}}
      />
      <View style={styles.overlay} pointerEvents="none">
        {phase === "ARRIVED" ? (
          <Text style={styles.arrived}>{arrivedLabel}</Text>
        ) : phase === "EN_ROUTE" ? (
          <Text style={styles.eta}>
            {etaLabel}
            {mins != null ? ` · ~${mins} min` : ""}
            {distanceKm != null ? ` · ${distanceKm.toFixed(1)} km` : ""}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 220,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  web: { flex: 1, backgroundColor: "transparent" },
  overlay: {
    position: "absolute",
    left: spacing.md,
    top: spacing.md,
    right: spacing.md,
    alignItems: "flex-start",
  },
  eta: {
    ...type.smallMedium,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  arrived: {
    ...type.smallMedium,
    color: colors.textInverse,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    overflow: "hidden",
  },
});
