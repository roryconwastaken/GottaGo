import React, { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default icon paths for Vite
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const accentIcon = new L.DivIcon({
  html: `<div style="
    width:14px;height:14px;
    background:var(--accent);
    border:2px solid #0a0b0d;
    border-radius:50%;
    box-shadow:0 0 10px var(--accent-glow-strong);
  "></div>`,
  className: '',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const pickupIcon = new L.DivIcon({
  html: `<div style="
    width:20px;height:20px;
    background:#4cde80;
    border:2px solid #0a0b0d;
    border-radius:50%;
    box-shadow:0 0 12px rgba(76,222,128,0.5);
  "></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

const operatorIcon = new L.DivIcon({
  html: `<div style="
    width:16px;height:16px;
    background:var(--accent);
    border:2px solid #0a0b0d;
    border-radius:50%;
    box-shadow:0 0 10px var(--accent-glow-strong);
    animation:glow-pulse 1.5s infinite;
  "></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

interface MapPin {
  lat: number
  lng: number
  label?: string
  type?: 'default' | 'pickup' | 'operator' | 'accent'
}

interface AppMapProps {
  center?: [number, number]
  zoom?: number
  pins?: MapPin[]
  height?: string | number
  style?: React.CSSProperties
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(center, map.getZoom())
  }, [center[0], center[1]])
  return null
}

export function AppMap({ center = [-7.2575, 112.7521], zoom = 15, pins = [], height = 340, style }: AppMapProps) {
  const getIcon = (type?: string) => {
    if (type === 'pickup') return pickupIcon
    if (type === 'operator') return operatorIcon
    if (type === 'accent') return accentIcon
    return accentIcon
  }

  return (
    <div style={{ height, overflow: 'hidden', borderRadius: 12, border: '1px solid var(--border)', ...style }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />
        <RecenterMap center={center} />
        {pins.map((pin, i) => (
          <Marker key={i} position={[pin.lat, pin.lng]} icon={getIcon(pin.type)}>
            {pin.label && <Popup>{pin.label}</Popup>}
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
