'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface Incident {
  id: string;
  type: string;
  lat: number;
  lng: number;
  description: string;
  timestamp: Date;
}

interface MapProps {
  incidents: Incident[];
  onMapClick?: (lat: number, lng: number) => void;
}

export default function Map({ incidents, onMapClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-0.1276, 51.5074], // London center
      zoom: 11,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([longitude, latitude]);

          if (map.current) {
            map.current.flyTo({
              center: [longitude, latitude],
              zoom: 14,
            });

            new mapboxgl.Marker({ color: '#3B82F6' })
              .setLngLat([longitude, latitude])
              .setPopup(new mapboxgl.Popup().setHTML('<p class="font-bold">Your Location</p>'))
              .addTo(map.current);
          }
        },
        (error) => {
          console.log('Location access denied:', error);
        }
      );
    }

    // Handle map clicks for reporting
    if (onMapClick) {
      map.current.on('click', (e) => {
        onMapClick(e.lngLat.lat, e.lngLat.lng);
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [onMapClick]);

  // Update markers when incidents change
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    // Add incident markers
    incidents.forEach((incident) => {
      const color = incident.type === 'theft' ? '#EF4444' :
                    incident.type === 'suspicious' ? '#F59E0B' : '#10B981';

      const marker = new mapboxgl.Marker({ color })
        .setLngLat([incident.lng, incident.lat])
        .setPopup(
          new mapboxgl.Popup().setHTML(`
            <div class="p-2">
              <p class="font-bold capitalize">${incident.type}</p>
              <p class="text-sm">${incident.description}</p>
              <p class="text-xs text-gray-500 mt-1">
                ${incident.timestamp.toLocaleString()}
              </p>
            </div>
          `)
        )
        .addTo(map.current!);

      markers.current.push(marker);
    });
  }, [incidents]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />
      <div className="absolute bottom-4 left-4 bg-black/80 p-3 rounded-lg text-sm">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Theft</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>Suspicious Activity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span>Safe Zone</span>
        </div>
      </div>
    </div>
  );
}
