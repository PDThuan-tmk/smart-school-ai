import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from "../../services/firebase";

export default function DroneStatus() {
  const [drone, setDrone] = useState({
    device: 'drone01',
    status: 'Offline',
    battery: 0,
    lat: 0,
    lng: 0,
    alt: 0,
    speed: 0,
    satellites: 0,
    gps: 0,
    mode: 'STANDBY'
  });

  useEffect(() => {
    // Lắng nghe dữ liệu thời gian thực từ Firestore document: droneTelemetry/drone01
    const ref = doc(db, 'droneTelemetry', 'drone01');

    const unsubscribe = onSnapshot(
      ref, 
      (snapshot) => {
        if (snapshot.exists()) {
          setDrone(snapshot.data());
        }
      },
      (error) => {
        console.error("Lỗi khi lắng nghe dữ liệu Drone:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Xử lý đếm số lượng vệ tinh (hỗ trợ cả key 'satellites' từ ESP32 mới và 'gps' từ code cũ)
  const satCount = drone.satellites ?? drone.gps ?? 0;

  // Render trạng thái có màu sắc cho sinh động
  const renderStatus = () => {
    const st = (drone.status || '').toLowerCase();
    if (st === 'online' || st === 'ready') {
      return <span className="text-emerald-600 font-semibold">🟢 Online</span>;
    }
    if (st === 'flying' || st === 'arm' || st === 'guided') {
      return <span className="text-amber-500 font-semibold">🟡 Flying</span>;
    }
    return <span className="text-rose-500 font-semibold">🔴 Offline</span>;
  };

  const data = [
    { label: 'Tên Drone', value: drone.device || 'drone01' },
    { label: 'Trạng thái', customValue: renderStatus() },
    { 
      label: 'Pin', 
      value: `${drone.battery ?? 0}%`,
      // Hiển thị màu đỏ nếu Pin yếu dưới 20%
      highlight: (drone.battery ?? 0) <= 20 ? 'text-red-600 font-bold' : ''
    },
    { label: 'GPS', value: `${satCount} vệ tinh` },
    { label: 'Độ cao', value: `${Number(drone.alt || 0).toFixed(1)} m` },
    { label: 'Tốc độ', value: `${Number(drone.speed || 0).toFixed(1)} m/s` },
    { label: 'Mode', value: drone.mode || 'STANDBY' },
    {
      label: 'Tọa độ',
      value: drone.lat && drone.lng 
        ? `${Number(drone.lat).toFixed(5)}, ${Number(drone.lng).toFixed(5)}`
        : '0, 0'
    }
  ];

  return (
    <div className='bg-white rounded-2xl shadow-md p-6 border border-gray-100'>
      <div className="flex items-center justify-between mb-5">
        <h2 className='text-2xl font-bold text-gray-800 flex items-center gap-2'>
          🚁 Drone Status
        </h2>
        <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full font-medium">
          Real-time
        </span>
      </div>

      <div className="space-y-1">
        {data.map((item) => (
          <div
            key={item.label}
            className='flex justify-between items-center py-2.5 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 px-2 rounded-lg transition-colors'
          >
            <span className='text-gray-500 text-sm font-medium'>{item.label}</span>
            {item.customValue ? (
              item.customValue
            ) : (
              <strong className={`text-gray-900 text-sm ${item.highlight || ''}`}>
                {item.value}
              </strong>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}