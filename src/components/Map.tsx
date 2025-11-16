'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { CrimeData, CRIME_CATEGORY_COLORS, CRIME_CATEGORY_MAPPING } from '@/lib/policeApi';

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
  policeCrimes?: CrimeData[];
  onMapClick?: (lat: number, lng: number) => void;
}

export default function Map({ incidents, policeCrimes = [], onMapClick }: MapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const policeMarkers = useRef<mapboxgl.Marker[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [showPoliceData, setShowPoliceData] = useState(true);

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

  // Update police crime markers
  useEffect(() => {
    if (!map.current) return;

    // Clear existing police markers
    policeMarkers.current.forEach((marker) => marker.remove());
    policeMarkers.current = [];

    if (!showPoliceData) return;

    console.log('Adding police crime markers:', policeCrimes.length);

    // Add police crime markers (smaller, semi-transparent)
    policeCrimes.forEach((crime) => {
      const color = CRIME_CATEGORY_COLORS[crime.category] || '#999999';
      const categoryName = CRIME_CATEGORY_MAPPING[crime.category] || crime.category;

      // Create a custom marker element for police data (smaller circle)
      const el = document.createElement('div');
      el.className = 'police-crime-marker';
      el.style.width = '12px';
      el.style.height = '12px';
      el.style.backgroundColor = color;
      el.style.borderRadius = '50%';
      el.style.opacity = '0.7';
      el.style.border = '1px solid rgba(255,255,255,0.3)';
      el.style.cursor = 'pointer';

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([crime.lng, crime.lat])
        .setPopup(
          new mapboxgl.Popup({ offset: 10 }).setHTML(`
            <div class="p-2 text-black">
              <p class="font-bold text-sm">${categoryName}</p>
              <p class="text-xs">${crime.street}</p>
              <p class="text-xs text-gray-600 mt-1">
                Police Data: ${crime.month}
              </p>
              ${crime.outcomeStatus ? `<p class="text-xs text-gray-500">Outcome: ${crime.outcomeStatus}</p>` : ''}
            </div>
          `)
        )
        .addTo(map.current!);

      policeMarkers.current.push(marker);
    });

    console.log('Police markers added:', policeMarkers.current.length);
  }, [policeCrimes, showPoliceData]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full rounded-lg" />

      {/* Toggle Police Data Button */}
      <button
        onClick={() => setShowPoliceData(!showPoliceData)}
        className={`absolute top-4 right-16 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
          showPoliceData
            ? 'bg-blue-600 text-white'
            : 'bg-gray-700 text-gray-300'
        }`}
      >
        {showPoliceData ? 'Hide' : 'Show'} Police Data ({policeCrimes.length})
      </button>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/80 p-3 rounded-lg text-sm">
        <div className="font-bold text-xs mb-2 text-gray-300">User Reports</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Theft</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span>Suspicious Activity</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span>Safe Zone</span>
        </div>

        <div className="font-bold text-xs mb-2 text-gray-300">Police Data</div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-red-600 opacity-70"></div>
          <span className="text-xs">Theft from Person</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-600 opacity-70"></div>
          <span className="text-xs">Robbery</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 opacity-70"></div>
          <span className="text-xs">Other Crimes</span>
        </div>
      </div>
    </div>
  );
}
