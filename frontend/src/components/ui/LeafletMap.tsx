"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Coordinates } from "@/lib/distance";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

interface TrialLocation {
  name: string;
  location: string;
  coordinates: Coordinates;
  withinRadius: boolean;
  distance: number;
  distanceText: string;
}

interface LeafletMapProps {
  patientLocation: string;
  patientCoordinates: Coordinates;
  trials: TrialLocation[];
  radiusMiles?: number;
  center?: Coordinates;
}

export function LeafletMap({
  patientLocation,
  patientCoordinates,
  trials,
  radiusMiles = 100,
  center,
}: LeafletMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [L, setL] = useState<typeof import("leaflet") | null>(null);

  useEffect(() => {
    setIsMounted(true);
    import("leaflet").then((leaflet) => {
      setL(leaflet);
      
      delete (leaflet.Icon.Default.prototype as any)._getIconUrl;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    });
  }, []);

  const mapCenter = center || patientCoordinates;

  const patientIcon = L
    ? L.divIcon({
        className: "custom-marker",
        html: `<div style="
          background: #A7F3D0;
          border: 3px solid #000;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          box-shadow: 3px 3px 0 #000;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
    : undefined;

  const trialIcon = (withinRadius: boolean) =>
    L
      ? L.divIcon({
          className: "custom-marker",
          html: `<div style="
            background: ${withinRadius ? "#A7F3D0" : "#FF6B6B"};
            border: 3px solid #000;
            border-radius: 50%;
            width: 16px;
            height: 16px;
            box-shadow: 2px 2px 0 #000;
          "></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        })
      : undefined;

  if (!isMounted || !L) {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <div className="text-white font-mono text-sm">Loading map...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={[mapCenter.lat, mapCenter.lon]}
      zoom={8}
      style={{ height: "100%", width: "100%" }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      <Circle
        center={[patientCoordinates.lat, patientCoordinates.lon]}
        radius={radiusMiles * 1609.34}
        pathOptions={{
          color: "#000",
          weight: 2,
          fillColor: "#A7F3D0",
          fillOpacity: 0.1,
          dashArray: "10, 10",
        }}
      />
      
      <Marker
        position={[patientCoordinates.lat, patientCoordinates.lon]}
        icon={patientIcon!}
      >
        <Popup>
          <div className="font-mono text-sm">
            <strong className="block mb-1">Patient Location</strong>
            <span>{patientLocation}</span>
          </div>
        </Popup>
      </Marker>
      
      {trials.map((trial, index) => (
        <Marker
          key={index}
          position={[trial.coordinates.lat, trial.coordinates.lon]}
          icon={trialIcon(trial.withinRadius)!}
        >
          <Popup>
            <div className="font-mono text-sm">
              <strong className="block mb-1">{trial.name}</strong>
              <span className="block">{trial.location}</span>
              <span className={`block mt-1 ${trial.withinRadius ? "text-green-600" : "text-red-600"}`}>
                {trial.distanceText} {trial.withinRadius ? "✓" : "✗"}
              </span>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
