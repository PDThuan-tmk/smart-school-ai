import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { WAYPOINTS as INITIAL_WAYPOINTS } from '../../data/waypoints';

// Fix icon Leaflet
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// 4 TỌA ĐỘ CỦA TRƯỜNG THPT SỐ 1 TƯ NGHĨA
const BOUNDARY_POINTS = [
  [15.088611, 108.824167], // Đông Bắc
  [15.087249, 108.824965], // Đông Nam
  [15.086583, 108.823722], // Tây Nam
  [15.088083, 108.822861], // Tây Bắc
];

const BOUNDS = L.latLngBounds(BOUNDARY_POINTS);
const SCHOOL_CENTER = [15.087631, 108.823929];
const ROUTE_COLORS = ['#FF0000', '#0066FF', '#00CC44', '#FF00FF', '#FF9900'];

// Thuật toán Ray-Casting kiểm tra 1 điểm (lat, lng) nằm trong đa giác
const isPointInPolygon = (point, polygon) => {
  const x = point[0], y = point[1];
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
};

const createWaypointIcon = (index, isSelected, isInMission) => {
  let bgColor = '#2563EB';
  if (isSelected) bgColor = '#EF4444';
  else if (isInMission) bgColor = '#22C55E';

  return L.divIcon({
    className: 'custom-waypoint-icon',
    html: `<div style="
      background-color: ${bgColor};
      color: white;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 11px;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.4);
    ">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const droneIcon = L.divIcon({
  className: 'custom-drone-icon',
  html: `<div style="
    position: relative;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <span style="
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: #EF4444;
      opacity: 0.75;
      animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite;
    "></span>
    <span style="
      position: relative;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #DC2626;
      border: 2px solid white;
      box-shadow: 0 0 8px #DC2626;
    "></span>
  </div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function MapController({ missionLocked, onAddWaypoint, onMapReady }) {
  const map = useMapEvents({
    click(e) {
      if (missionLocked) return;

      const clickedLat = Number(e.latlng.lat.toFixed(6));
      const clickedLng = Number(e.latlng.lng.toFixed(6));

      const isInside = isPointInPolygon([clickedLat, clickedLng], BOUNDARY_POINTS);

      if (!isInside) {
        alert('⚠️ Vị trí đặt Waypoint phải nằm bên trong vùng giới hạn trường học!');
        return;
      }

      onAddWaypoint({
        lat: clickedLat,
        lng: clickedLng,
      });
    },
  });

  useEffect(() => {
    if (map) {
      onMapReady(map);
      map.fitBounds(BOUNDS, { padding: [20, 20] });
    }
  }, [map, onMapReady]);

  return null;
}

export default function SchoolMap({
  onSelectWaypoint,
  mission = [],
  missionLocked = false,
}) {
  const [waypoints, setWaypoints] = useState([]);
  const [selectedWp, setSelectedWp] = useState(null);

  const [dronePos, setDronePos] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  const [completedFlights, setCompletedFlights] = useState([]);
  const [mapInstance, setMapInstance] = useState(null);

  // 1. LẮNG NGHE DỮ LIỆU WAYPOINTS TỪ FIREBASE
  useEffect(() => {
    const unsubWaypoints = onSnapshot(doc(db, 'system', 'waypoints'), (snap) => {
      if (snap.exists() && snap.data().list) {
        setWaypoints(snap.data().list);
      } else {
        setDoc(doc(db, 'system', 'waypoints'), { list: INITIAL_WAYPOINTS });
        setWaypoints(INITIAL_WAYPOINTS);
      }
    });

    return () => unsubWaypoints();
  }, []);

  // 2. LẮNG NGHE TỌA ĐỘ VÀ TRẠNG THÁI DRONE TỪ ESP32 VIA FIREBASE
  useEffect(() => {
    const unsubDrone = onSnapshot(doc(db, 'system', 'droneState'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();

        if (data.lat && data.lng) {
          const newPos = [data.lat, data.lng];
          setDronePos(newPos);

          if (data.isArmed || data.missionRunning) {
            setCurrentPath((prev) => {
              // Bỏ qua nếu điểm mới trùng chính xác với điểm cuối cùng
              const lastPos = prev[prev.length - 1];
              if (lastPos && lastPos[0] === newPos[0] && lastPos[1] === newPos[1]) {
                return prev;
              }
              return [...prev, newPos];
            });
          } else {
            setCurrentPath((prevPath) => {
              if (prevPath.length > 1) {
                setCompletedFlights((prevFlights) => [...prevFlights, prevPath]);
              }
              return [];
            });
          }
        }
      }
    });

    return () => unsubDrone();
  }, []);

  // Xóa Waypoint & Cập nhật trực tiếp lên Firestore
  const handleDeleteWaypoint = async (e, wpId) => {
    e.stopPropagation();
    if (missionLocked) return;

    const updatedList = waypoints.filter((wp) => wp.id !== wpId);
    setWaypoints(updatedList);
    if (selectedWp?.id === wpId) setSelectedWp(null);

    try {
      await setDoc(doc(db, 'system', 'waypoints'), { list: updatedList });
    } catch (err) {
      console.error('Lỗi khi xóa Waypoint trên Firestore:', err);
    }
  };

  // Thêm Waypoint & Cập nhật trực tiếp lên Firestore
  const handleAddWaypoint = async (gps) => {
    const nextNum = waypoints.length + 1;
    const newWaypoint = {
      id: `WP_${Date.now()}`,
      name: `Điểm ${nextNum}`,
      lat: gps.lat,
      lng: gps.lng,
      alt: 5,
    };

    const updatedList = [...waypoints, newWaypoint];
    setWaypoints(updatedList);
    setSelectedWp(newWaypoint);
    if (onSelectWaypoint) onSelectWaypoint(newWaypoint);

    try {
      await setDoc(doc(db, 'system', 'waypoints'), { list: updatedList });
    } catch (err) {
      console.error('Lỗi khi thêm Waypoint lên Firestore:', err);
    }
  };

  // Gửi lệnh bay đơn lẻ tới Waypoint
  const handleFlyToWaypoint = async (e, wp) => {
    e.stopPropagation();
    try {
      // Đẩy lệnh sang collection commands để ESP32 nhận
      await setDoc(doc(db, 'commands', 'current'), {
        action: 'GOTO_WAYPOINT',
        targetWaypoint: wp.id,
        timestampValue: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Lỗi khi gửi lệnh bay:', err);
    }
  };

  const handleWaypointClick = (wp) => {
    setSelectedWp(wp);
    if (!missionLocked && onSelectWaypoint) {
      onSelectWaypoint(wp);
    }
  };

  const isWaypointInMission = (wpId) => {
    return mission.some((m) => m.id === wpId);
  };

  return (
    <div className='bg-white p-5 rounded-3xl shadow-sm border border-slate-200/80 flex flex-col gap-4'>
      <div className='flex items-center justify-between flex-wrap gap-2'>
        <h2 className='text-lg font-bold text-slate-800 flex items-center gap-2'>
          🔒 Bản đồ Giới hạn Khung [Trung học Phổ thông Số 1 Tư Nghĩa]
        </h2>

        <button
          onClick={() => {
            if (mapInstance) {
              mapInstance.fitBounds(BOUNDS, { padding: [20, 20] });
            }
          }}
          className='text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-md'
        >
          🎯 Căn Chuẩn Vùng
        </button>
      </div>

      <div className='relative w-full h-[520px] bg-[#020617] rounded-2xl overflow-hidden border border-slate-200 shadow-inner select-none'>
        <MapContainer
          center={SCHOOL_CENTER}
          zoom={18}
          minZoom={17}
          maxZoom={21}
          maxBounds={BOUNDS}
          maxBoundsViscosity={0.8}
          style={{ width: '100%', height: '100%', backgroundColor: '#020617' }}
        >
          <TileLayer
            url='https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}'
            maxZoom={21}
            attribution='&copy; Google Maps'
          />

          <MapController
            missionLocked={missionLocked}
            onAddWaypoint={handleAddWaypoint}
            onMapReady={setMapInstance}
          />

          <Polyline
            positions={[...BOUNDARY_POINTS, BOUNDARY_POINTS[0]]}
            color='#F59E0B'
            weight={3}
          />

          {completedFlights.map((flight, idx) => (
            <Polyline
              key={`flight-${idx}`}
              positions={flight}
              color={ROUTE_COLORS[idx % ROUTE_COLORS.length]}
              weight={2.5}
            />
          ))}

          {currentPath.length > 1 && (
            <Polyline
              positions={currentPath}
              color='#EF4444'
              weight={3}
              dashArray='5, 5'
            />
          )}

          {dronePos && <Marker position={dronePos} icon={droneIcon} />}

          {waypoints.map((wp, index) => (
            <Marker
              key={wp.id}
              position={[wp.lat, wp.lng]}
              icon={createWaypointIcon(
                index,
                selectedWp?.id === wp.id,
                isWaypointInMission(wp.id)
              )}
              eventHandlers={{
                click: (e) => {
                  e.originalEvent.stopPropagation();
                  handleWaypointClick(wp);
                },
              }}
            >
              <Popup>
                <div
                  className='p-1 text-slate-800 font-sans min-w-[170px]'
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className='flex justify-between items-center pb-1 mb-1.5 border-b border-slate-200'>
                    <span className='font-bold text-indigo-600 text-xs'>{wp.name}</span>
                    <span className='text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-500 font-mono'>
                      Alt: {wp.alt || 5}m
                    </span>
                  </div>

                  <div className='font-mono text-[10px] space-y-0.5 text-slate-600 mb-2'>
                    <p>Lat: {wp.lat}</p>
                    <p>Lng: {wp.lng}</p>
                  </div>

                  <div className='flex gap-1.5 pt-1'>
                    <button
                      onClick={(e) => handleFlyToWaypoint(e, wp)}
                      className='flex-1 py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 shadow-sm'
                    >
                      🚀 Bay Tới
                    </button>
                    {!missionLocked && (
                      <button
                        onClick={(e) => handleDeleteWaypoint(e, wp.id)}
                        className='py-1 px-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center shadow-sm'
                      >
                        🗑️ Xóa
                      </button>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className='absolute top-3 right-3 z-[1000] bg-slate-900/90 text-white backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-700/80 text-xs w-72 pointer-events-auto'>
          <div className='flex items-center justify-between pb-2 mb-2 border-b border-slate-700'>
            <span className='font-bold text-amber-400'>🔒 Vùng Giới Hạn (4 Tọa Độ)</span>
          </div>

          <div className='space-y-1.5 font-mono text-[11px]'>
            <p className='flex justify-between'>
              <span className='text-slate-400'>1. Đông Bắc:</span>
              <span>15.088611, 108.824167</span>
            </p>
            <p className='flex justify-between'>
              <span className='text-slate-400'>2. Đông Nam:</span>
              <span>15.087249, 108.824965</span>
            </p>
            <p className='flex justify-between'>
              <span className='text-slate-400'>3. Tây Nam:</span>
              <span>15.086583, 108.823722</span>
            </p>
            <p className='flex justify-between'>
              <span className='text-slate-400'>4. Tây Bắc:</span>
              <span>15.088083, 108.822861</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}