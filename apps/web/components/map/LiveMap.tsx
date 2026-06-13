'use client'

import { useEffect, useRef, useState } from 'react'
import { TrainPosition } from '@/lib/types'

interface LiveMapProps {
  positions: TrainPosition[]
  onTrainClick?: (train: TrainPosition) => void
  selectedTrain?: string | null
  center?: [number, number]
  zoom?: number
  height?: string
  routeCoords?: [number, number][]
  passedCoords?: [number, number][]
  singleTrain?: boolean
}

export default function LiveMap({
  positions,
  onTrainClick,
  selectedTrain,
  center = [22.5, 82.0],
  zoom = 5,
  height = '100%',
  routeCoords,
  passedCoords,
  singleTrain = false,
}: LiveMapProps) {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)
  const markersRef = useRef<Map<string, any>>(new Map())
  const routeLayerRef = useRef<any>(null)
  const passedLayerRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current || mapInstanceRef.current) return

    const initMap = async () => {
      const L = (await import('leaflet')).default

      // Fix Leaflet icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const map = L.map(mapRef.current!, {
        center,
        zoom,
        zoomControl: true,
        attributionControl: true,
      })

      // CartoDB Dark Matter tiles — free, no API key
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map)

      mapInstanceRef.current = map
      setMapReady(true)
    }

    initMap()

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markersRef.current.clear()
        setMapReady(false)
      }
    }
  }, [])

  // Draw route polylines
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return
    const initRoute = async () => {
      const L = (await import('leaflet')).default
      const map = mapInstanceRef.current

      if (routeLayerRef.current) { map.removeLayer(routeLayerRef.current) }
      if (passedLayerRef.current) { map.removeLayer(passedLayerRef.current) }

      if (routeCoords && routeCoords.length > 1) {
        routeLayerRef.current = L.polyline(routeCoords, {
          color: 'rgba(240,244,255,0.25)',
          weight: 3,
          dashArray: '6 4',
        }).addTo(map)
      }
      if (passedCoords && passedCoords.length > 1) {
        passedLayerRef.current = L.polyline(passedCoords, {
          color: 'rgba(232,33,59,0.5)',
          weight: 3,
        }).addTo(map)
      }
    }
    initRoute()
  }, [mapReady, routeCoords, passedCoords])

  // Update train markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return

    const updateMarkers = async () => {
      const L = (await import('leaflet')).default
      const map = mapInstanceRef.current
      const currentIds = new Set(positions.map((p) => p.trainRunId))

      // Remove stale markers
      markersRef.current.forEach((marker, id) => {
        if (!currentIds.has(id)) {
          map.removeLayer(marker)
          markersRef.current.delete(id)
        }
      })

      // Add/update markers
      for (const train of positions) {
        const isDelayed = train.status === 'DELAYED'
        const isSevere = train.status === 'SEVERELY_DELAYED'
        const isSelected = selectedTrain === train.trainNumber

        const color = isSevere ? '#E8213B' : isDelayed ? '#F59E0B' : '#10B981'
        const size = isSelected ? 18 : 14
        const pulseSize = isSelected ? 36 : 28

        const svgIcon = L.divIcon({
          className: '',
          iconSize: [pulseSize, pulseSize],
          iconAnchor: [pulseSize / 2, pulseSize / 2],
          html: `
            <div style="position:relative;width:${pulseSize}px;height:${pulseSize}px;display:flex;align-items:center;justify-content:center;">
              <div style="
                position:absolute;
                width:${pulseSize}px;height:${pulseSize}px;
                border-radius:50%;
                background:${color};
                opacity:0.2;
                animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;
              "></div>
              <div style="
                width:${size}px;height:${size}px;
                border-radius:50%;
                background:${color};
                border:2px solid rgba(255,255,255,0.6);
                box-shadow:0 0 ${isSelected ? 12 : 6}px ${color};
                display:flex;align-items:center;justify-content:center;
                cursor:pointer;
                position:relative;z-index:2;
              ">
                <div style="font-size:6px;color:white;font-weight:bold;">🚂</div>
              </div>
            </div>
          `,
        })

        const popupHtml = `
          <div style="font-family:'Space Grotesk',sans-serif;padding:12px;min-width:220px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
              <span style="font-weight:700;font-size:14px;color:#F0F4FF;">${train.trainName}</span>
              <span style="font-size:11px;color:#94a3b8;background:#1E3A5F;padding:2px 6px;border-radius:4px;">${train.trainNumber}</span>
            </div>
            <div style="display:grid;gap:4px;">
              <div style="display:flex;justify-content:space-between;font-size:12px;">
                <span style="color:#64748b;">Status</span>
                <span style="color:${color};font-weight:600;">${train.status.replace('_', ' ')}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;">
                <span style="color:#64748b;">Speed</span>
                <span style="color:#F0F4FF;">${Math.round(train.speed)} km/h</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;">
                <span style="color:#64748b;">Delay</span>
                <span style="color:${train.delayMinutes > 0 ? '#F59E0B' : '#10B981'};">${train.delayMinutes > 0 ? '+' + train.delayMinutes + ' min' : 'On time'}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:12px;">
                <span style="color:#64748b;">Last Station</span>
                <span style="color:#F0F4FF;">${train.lastStation}</span>
              </div>
              ${train.nextStation ? `<div style="display:flex;justify-content:space-between;font-size:12px;"><span style="color:#64748b;">Next</span><span style="color:#F0F4FF;">${train.nextStation}</span></div>` : ''}
            </div>
          </div>
        `

        const existing = markersRef.current.get(train.trainRunId)
        if (existing) {
          existing.setLatLng([train.lat, train.lng])
          existing.setIcon(svgIcon)
        } else {
          const marker = L.marker([train.lat, train.lng], { icon: svgIcon })
            .bindPopup(popupHtml, { className: 'train-popup', maxWidth: 280 })
            .addTo(map)

          if (onTrainClick) {
            marker.on('click', () => onTrainClick(train))
          }

          markersRef.current.set(train.trainRunId, marker)
        }
      }

      // Auto-center on single train
      if (singleTrain && positions.length === 1) {
        const p = positions[0]
        map.setView([p.lat, p.lng], map.getZoom())
      }
    }

    updateMarkers()
  }, [mapReady, positions, selectedTrain])

  return (
    <div style={{ width: '100%', height }} ref={mapRef} />
  )
}
