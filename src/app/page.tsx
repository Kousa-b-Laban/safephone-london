'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import IncidentForm from '@/components/IncidentForm';

// Dynamic import for Map to avoid SSR issues with Mapbox
const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading map...</p>
      </div>
    </div>
  ),
});

interface Incident {
  id: string;
  type: string;
  lat: number;
  lng: number;
  description: string;
  timestamp: Date;
}

export default function Home() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stats, setStats] = useState({ total: 0, theft: 0, suspicious: 0, safe: 0 });

  // Load incidents from Firebase
  useEffect(() => {
    const q = query(collection(db, 'incidents'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const incidentData: Incident[] = [];
      let theftCount = 0;
      let suspiciousCount = 0;
      let safeCount = 0;

      snapshot.forEach((doc) => {
        const data = doc.data();
        const incident = {
          id: doc.id,
          type: data.type,
          lat: data.lat,
          lng: data.lng,
          description: data.description,
          timestamp: data.timestamp?.toDate() || new Date(),
        };
        incidentData.push(incident);

        if (data.type === 'theft') theftCount++;
        else if (data.type === 'suspicious') suspiciousCount++;
        else if (data.type === 'safe') safeCount++;
      });

      setIncidents(incidentData);
      setStats({
        total: incidentData.length,
        theft: theftCount,
        suspicious: suspiciousCount,
        safe: safeCount,
      });
    });

    return () => unsubscribe();
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setShowForm(true);
  };

  const handleIncidentSubmit = async (data: { type: string; description: string; lat: number; lng: number }) => {
    try {
      await addDoc(collection(db, 'incidents'), {
        ...data,
        timestamp: Timestamp.now(),
      });
      setShowForm(false);
      setSelectedLocation(null);
    } catch (error) {
      console.error('Error adding incident:', error);
      alert('Failed to report incident. Please try again.');
    }
  };

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-400">SafePhone London</h1>
            <p className="text-sm text-gray-400">Phone theft prevention & crime mapping</p>
          </div>
          <button
            onClick={() => {
              navigator.geolocation.getCurrentPosition((pos) => {
                setSelectedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setShowForm(true);
              });
            }}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Report Incident
          </button>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-gray-900/50 border-b border-gray-800 p-3">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-gray-400">Total Reports</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{stats.theft}</div>
            <div className="text-xs text-gray-400">Thefts</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500">{stats.suspicious}</div>
            <div className="text-xs text-gray-400">Suspicious</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-500">{stats.safe}</div>
            <div className="text-xs text-gray-400">Safe Zones</div>
          </div>
        </div>
      </div>

      {/* Map */}
      <main className="flex-1 relative">
        <Map incidents={incidents} onMapClick={handleMapClick} />

        {/* Instructions Overlay */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 px-4 py-2 rounded-lg text-sm">
          Tap anywhere on the map to report an incident
        </div>
      </main>

      {/* Incident Form Modal */}
      {showForm && selectedLocation && (
        <IncidentForm
          lat={selectedLocation.lat}
          lng={selectedLocation.lng}
          onSubmit={handleIncidentSubmit}
          onCancel={() => {
            setShowForm(false);
            setSelectedLocation(null);
          }}
        />
      )}
    </div>
  );
}
