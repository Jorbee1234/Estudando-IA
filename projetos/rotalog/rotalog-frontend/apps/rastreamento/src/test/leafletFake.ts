/** Leaflet falso: registra o que o app pede, sem desenhar nada. */
export interface LeafletFake {
  popups: unknown[];
  icons: Record<string, unknown>[];
  polylines: unknown[][];
  removedLayers: unknown[];
  mapsCreated: number;
  mapsRemoved: number;
  invalidated: number;
  L: Record<string, unknown>;
}

export function criarLeafletFake(): LeafletFake {
  const fake: LeafletFake = { popups: [], icons: [], polylines: [], removedLayers: [], mapsCreated: 0, mapsRemoved: 0, invalidated: 0, L: {} };
  const chain = () => {
    const o: Record<string, unknown> = {
      addTo: () => o,
      bindPopup: (c: unknown) => {
        fake.popups.push(c);
        return o;
      },
    };
    return o;
  };
  fake.L = {
    map: () => {
      fake.mapsCreated++;
      return {
        remove: () => fake.mapsRemoved++,
        removeLayer: (l: unknown) => fake.removedLayers.push(l),
        fitBounds: () => undefined,
        setView: () => undefined,
        invalidateSize: () => fake.invalidated++,
      };
    },
    tileLayer: () => chain(),
    layerGroup: () => {
      const g: Record<string, unknown> = chain();
      g.addLayer = () => g;
      g.clearLayers = () => undefined;
      return g;
    },
    divIcon: (o: Record<string, unknown>) => {
      fake.icons.push(o);
      return o;
    },
    marker: () => chain(),
    polyline: (pts: unknown[]) => {
      fake.polylines.push(pts);
      return chain();
    },
    latLng: (lat: number, lng: number) => ({ lat, lng }),
    latLngBounds: (...a: unknown[]) => a,
  };
  return fake;
}

/** Instância única, usada por jest.mock("leaflet"). */
export const leafletFake = criarLeafletFake();

export function resetarLeafletFake() {
  leafletFake.popups.length = 0;
  leafletFake.icons.length = 0;
  leafletFake.polylines.length = 0;
  leafletFake.removedLayers.length = 0;
  leafletFake.mapsCreated = 0;
  leafletFake.mapsRemoved = 0;
  leafletFake.invalidated = 0;
}
