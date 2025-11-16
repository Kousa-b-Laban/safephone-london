'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import IncidentForm from '@/components/IncidentForm';
import { fetchCrimeData, CrimeData, CRIME_CATEGORY_MAPPING } from '@/lib/policeApi';

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

interface PoliceStats {
  total: number;
  theftFromPerson: number;
  robbery: number;
  otherTheft: number;
}

export default function Home() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [policeCrimes, setPoliceCrimes] = useState<CrimeData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stats, setStats] = useState({ total: 0, theft: 0, suspicious: 0, safe: 0 });
  const [policeStats, setPoliceStats] = useState<PoliceStats>({ total: 0, theftFromPerson: 0, robbery: 0, otherTheft: 0 });
  const [crimeDataLoading, setCrimeDataLoading] = useState(false);
  const [crimeDataError, setCrimeDataError] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 51.5074, lng: -0.1276 }); // London default

  // Load UK Police crime data
  useEffect(() => {
    const loadPoliceCrimeData = async () => {
      setCrimeDataLoading(true);
      setCrimeDataError(null);

      try {
        console.log('Fetching Police API crime data for:', mapCenter);
        const crimes = await fetchCrimeData(mapCenter.lat, mapCenter.lng);
        setPoliceCrimes(crimes);

        // Calculate police crime stats
        const theftFromPerson = crimes.filter(c => c.category === 'theft-from-the-person').length;
        const robbery = crimes.filter(c => c.category === 'robbery').length;
        const otherTheft = crimes.filter(c => c.category === 'other-theft').length;

        setPoliceStats({
          total: crimes.length,
          theftFromPerson,
          robbery,
          otherTheft,
        });

        console.log('Police crime data loaded:', crimes.length, 'records');
      } catch (error) {
        console.error('Failed to load police crime data:', error);
        setCrimeDataError(error instanceof Error ? error.message : 'Failed to load crime data');
      } finally {
        setCrimeDataLoading(false);
      }
    };

    loadPoliceCrimeData();
  }, [mapCenter]);

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
            <div className="text-2xl font-bold">{policeStats.total}</div>
            <div className="text-xs text-gray-400">Police Records</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-500">{policeStats.theftFromPerson}</div>
            <div className="text-xs text-gray-400">Theft from Person</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-500">{policeStats.robbery}</div>
            <div className="text-xs text-gray-400">Robbery</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-500">{stats.total}</div>
            <div className="text-xs text-gray-400">User Reports</div>
          </div>
        </div>
      </div>

      {/* Map */}
      <main className="flex-1 relative">
        <Map
          incidents={incidents}
          policeCrimes={policeCrimes}
          onMapClick={handleMapClick}
        />

        {/* Loading/Error Overlay */}
        {crimeDataLoading && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-900/90 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Loading police crime data...
          </div>
        )}
        {crimeDataError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-900/90 px-4 py-2 rounded-lg text-sm">
            {crimeDataError}
          </div>
        )}
        {!crimeDataLoading && !crimeDataError && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/80 px-4 py-2 rounded-lg text-sm">
            Tap anywhere on the map to report an incident
          </div>
        )}
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
