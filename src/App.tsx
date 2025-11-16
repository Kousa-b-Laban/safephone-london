import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from 'firebase/firestore'

// Mapbox public token for demo purposes
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw'

// Firebase config - using demo project
const firebaseConfig = {
  apiKey: "AIzaSyDemo123456789",
  authDomain: "safephone-london-demo.firebaseapp.com",
  projectId: "safephone-london-demo",
  storageBucket: "safephone-london-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// London center coordinates
const LONDON_CENTER: [number, number] = [-0.1276, 51.5074]

// High-theft geofence zones in London (based on crime statistics)
const GEOFENCE_ZONES: Array<{ name: string; center: [number, number]; radius: number }> = [
  { name: 'Westminster', center: [-0.1357, 51.4975], radius: 1000 },
  { name: 'Camden Town', center: [-0.1426, 51.5394], radius: 800 },
  { name: 'Shoreditch', center: [-0.0777, 51.5267], radius: 700 },
  { name: 'Oxford Street', center: [-0.1413, 51.5152], radius: 600 },
  { name: 'King\'s Cross', center: [-0.1246, 51.5308], radius: 750 },
  { name: 'Brixton', center: [-0.1146, 51.4613], radius: 800 },
  { name: 'Stratford', center: [-0.0023, 51.5415], radius: 900 },
  { name: 'Elephant & Castle', center: [-0.0988, 51.4943], radius: 700 },
  { name: 'Tottenham Court Road', center: [-0.1307, 51.5165], radius: 500 },
  { name: 'Liverpool Street', center: [-0.0822, 51.5178], radius: 600 }
]

interface CrimeData {
  id: string
  latitude: number
  longitude: number
  category: string
  month: string
  location: string
}

interface UserReport {
  id?: string
  latitude: number
  longitude: number
  description: string
  timestamp: Date
}

function App() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const userMarker = useRef<mapboxgl.Marker | null>(null)
  const watchId = useRef<number | null>(null)

  const [locationPermission, setLocationPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAlert, setShowAlert] = useState(false)
  const [alertZone, setAlertZone] = useState('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportText, setReportText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [crimeCount, setCrimeCount] = useState(0)
  const [currentZone, setCurrentZone] = useState<string | null>(null)
  const alertedZones = useRef<Set<string>>(new Set())

  // Calculate distance between two points (Haversine formula)
  const getDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
  }, [])

  // Check if user is in any geofence zone
  const checkGeofences = useCallback((lat: number, lon: number) => {
    let inZone = false
    let zoneName = ''

    for (const zone of GEOFENCE_ZONES) {
      const distance = getDistance(lat, lon, zone.center[1], zone.center[0])
      if (distance <= zone.radius) {
        inZone = true
        zoneName = zone.name
        break
      }
    }

    setCurrentZone(inZone ? zoneName : null)

    if (inZone && !alertedZones.current.has(zoneName)) {
      alertedZones.current.add(zoneName)
      setAlertZone(zoneName)
      setShowAlert(true)

      // Vibrate if supported
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200])
      }
    }
  }, [getDistance])

  // Request location permission
  const requestLocationPermission = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      setLocationPermission('denied')
      return
    }

    setLocationPermission('granted')
    startLocationTracking()
  }

  // Start continuous location tracking
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) return

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation([longitude, latitude])
        checkGeofences(latitude, longitude)
      },
      (error) => {
        console.error('Error getting location:', error)
        setLocationPermission('denied')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )

    // Watch position for continuous updates
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setUserLocation([longitude, latitude])
        checkGeofences(latitude, longitude)
      },
      (error) => {
        console.error('Error watching location:', error)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    )
  }, [checkGeofences])

  // Fetch UK Police theft data
  const fetchPoliceData = async (lat: number, lon: number): Promise<CrimeData[]> => {
    try {
      // Fetch theft from person crimes
      const response = await fetch(
        `https://data.police.uk/api/crimes-street/theft-from-the-person?lat=${lat}&lng=${lon}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch police data')
      }

      const data = await response.json()
      return data.map((crime: { id: number; location: { latitude: string; longitude: string; street: { name: string } }; category: string; month: string }) => ({
        id: crime.id.toString(),
        latitude: parseFloat(crime.location.latitude),
        longitude: parseFloat(crime.location.longitude),
        category: crime.category,
        month: crime.month,
        location: crime.location.street.name
      }))
    } catch (error) {
      console.error('Error fetching police data:', error)
      return []
    }
  }

  // Fetch user reports from Firebase
  const fetchUserReports = async (): Promise<UserReport[]> => {
    try {
      const q = query(
        collection(db, 'reports'),
        orderBy('timestamp', 'desc'),
        limit(100)
      )
      const snapshot = await getDocs(q)
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserReport[]
    } catch (error) {
      console.error('Error fetching user reports:', error)
      return []
    }
  }

  // Submit theft report
  const submitReport = async () => {
    if (!userLocation || !reportText.trim() || reportText.length > 200) return

    setSubmitting(true)
    try {
      await addDoc(collection(db, 'reports'), {
        latitude: userLocation[1],
        longitude: userLocation[0],
        description: reportText.trim(),
        timestamp: Timestamp.now()
      })
      setReportText('')
      setShowReportModal(false)
      alert('Report submitted successfully!')
    } catch (error) {
      console.error('Error submitting report:', error)
      alert('Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: LONDON_CENTER,
      zoom: 12
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-left')

    map.current.on('load', async () => {
      // Add geofence circles
      GEOFENCE_ZONES.forEach((zone, index) => {
        const circle = createGeoJSONCircle(zone.center, zone.radius / 1000)

        map.current!.addSource(`geofence-${index}`, {
          type: 'geojson',
          data: circle
        })

        map.current!.addLayer({
          id: `geofence-fill-${index}`,
          type: 'fill',
          source: `geofence-${index}`,
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.1
          }
        })

        map.current!.addLayer({
          id: `geofence-outline-${index}`,
          type: 'line',
          source: `geofence-${index}`,
          paint: {
            'line-color': '#ef4444',
            'line-width': 2,
            'line-opacity': 0.5
          }
        })
      })

      // Fetch and display police crime data
      const crimes = await fetchPoliceData(LONDON_CENTER[1], LONDON_CENTER[0])
      setCrimeCount(crimes.length)

      // Add crime markers
      const crimeFeatures = crimes.map(crime => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [crime.longitude, crime.latitude]
        },
        properties: {
          category: crime.category,
          month: crime.month,
          location: crime.location
        }
      }))

      map.current!.addSource('crimes', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: crimeFeatures
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      })

      // Cluster circles
      map.current!.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'crimes',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#f59e0b',
            10,
            '#ef4444',
            30,
            '#dc2626'
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10,
            30,
            30,
            40
          ],
          'circle-opacity': 0.8
        }
      })

      // Cluster count
      map.current!.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'crimes',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      })

      // Individual crime points
      map.current!.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'crimes',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#f59e0b',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.8
        }
      })

      // Fetch and display user reports
      const reports = await fetchUserReports()
      reports.forEach(report => {
        new mapboxgl.Marker({ color: '#3b82f6' })
          .setLngLat([report.longitude, report.latitude])
          .setPopup(new mapboxgl.Popup().setHTML(`
            <div style="color: #000; padding: 8px;">
              <strong>User Report</strong><br/>
              <small>${report.description}</small>
            </div>
          `))
          .addTo(map.current!)
      })

      setLoading(false)
    })

    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current)
      }
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [])

  // Update user marker on location change
  useEffect(() => {
    if (!map.current || !userLocation) return

    if (!userMarker.current) {
      const el = document.createElement('div')
      el.style.width = '24px'
      el.style.height = '24px'
      el.style.borderRadius = '50%'
      el.style.background = '#4ade80'
      el.style.border = '3px solid white'
      el.style.boxShadow = '0 0 10px rgba(74, 222, 128, 0.5)'

      userMarker.current = new mapboxgl.Marker(el)
        .setLngLat(userLocation)
        .addTo(map.current)
    } else {
      userMarker.current.setLngLat(userLocation)
    }

    // Smoothly pan to user location
    map.current.easeTo({
      center: userLocation,
      zoom: 14,
      duration: 1000
    })
  }, [userLocation])

  // Helper function to create circle GeoJSON
  const createGeoJSONCircle = (center: [number, number], radiusKm: number) => {
    const points = 64
    const coords = []
    const distanceX = radiusKm / (111.32 * Math.cos((center[1] * Math.PI) / 180))
    const distanceY = radiusKm / 110.574

    for (let i = 0; i < points; i++) {
      const theta = (i / points) * (2 * Math.PI)
      const x = distanceX * Math.cos(theta)
      const y = distanceY * Math.sin(theta)
      coords.push([center[0] + x, center[1] + y])
    }
    coords.push(coords[0])

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coords]
      },
      properties: {}
    }
  }

  // Show permission prompt first
  if (locationPermission === 'prompt') {
    return (
      <div className="permission-prompt">
        <h1>SafePhone London</h1>
        <p>
          To help protect you from phone theft, we need access to your location.
          This allows us to alert you when you enter high-risk areas and provide
          personalized safety information.
        </p>
        <button className="permission-btn" onClick={requestLocationPermission}>
          Enable Location Tracking
        </button>
      </div>
    )
  }

  return (
    <div className="app">
      {showAlert && (
        <div className="alert-overlay">
          <div className="alert-content">
            <span className="alert-message">
              High theft area - {alertZone} - Stay alert!
            </span>
            <button className="alert-dismiss" onClick={() => setShowAlert(false)}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="map-container" ref={mapContainer}>
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <span>Loading crime data...</span>
          </div>
        )}

        <div className="legend">
          <div className="legend-item">
            <div className="legend-dot red"></div>
            <span>High theft zone</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot orange"></div>
            <span>Police reports ({crimeCount})</span>
          </div>
          <div className="legend-item">
            <div className="legend-dot blue"></div>
            <span>User reports</span>
          </div>
        </div>
      </div>

      <div className="controls">
        <div className="status-bar">
          <div className={`status-indicator ${currentZone ? 'danger' : ''}`}></div>
          <span>
            {currentZone
              ? `You are in ${currentZone} - High risk area`
              : userLocation
              ? 'Location active - You are in a safe area'
              : 'Acquiring location...'}
          </span>
        </div>
        <button
          className="report-btn"
          onClick={() => setShowReportModal(true)}
          disabled={!userLocation}
        >
          Report Theft
        </button>
      </div>

      {showReportModal && (
        <div className="modal-overlay" onClick={() => setShowReportModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Report Theft Incident</h2>
            <textarea
              placeholder="Describe what happened (max 200 characters)..."
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              maxLength={200}
            />
            <div className={`char-count ${reportText.length > 200 ? 'over' : ''}`}>
              {reportText.length}/200
            </div>
            <div className="modal-actions">
              <button
                className="modal-btn secondary"
                onClick={() => setShowReportModal(false)}
              >
                Cancel
              </button>
              <button
                className="modal-btn primary"
                onClick={submitReport}
                disabled={!reportText.trim() || reportText.length > 200 || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
