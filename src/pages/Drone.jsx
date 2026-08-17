import { useEffect, useState, useRef } from 'react';
import {
  collection,
  getDoc,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { WAYPOINTS } from '../data/waypoints';

import DroneStatus from '../components/drone/DroneStatus';
import SchoolMap from '../components/drone/SchoolMap';
import DroneCamera from '../components/drone/DroneCamera';
import DroneAI from '../components/drone/DroneAI';
import DroneControl from '../components/drone/DroneControl';
import TimetableManager from '../components/drone/TimetableManager';

// Cấu hình kiểm tra thời tiết
const WEATHER_API_KEY = 'YOUR_OPENWEATHERMAP_API_KEY'; // 👈 Thay OpenWeatherMap API Key của bạn vào đây
const MAX_WIND_SPEED_MS = 8.0; // Tốc độ gió tối đa cho phép bay (m/s)
const LAT_SCHOOL = 15.0875; // Tọa độ trường học
const LNG_SCHOOL = 108.8238;

// --- COMPONENT MODAL XEM LẠI LỊCH SỬ CAMERA (15 NGÀY) ---
function CameraPlaybackModal({ isOpen, onClose }) {
  const [recordings, setRecordings] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRecordings = async () => {
      setLoading(true);
      try {
        // Chỉ lấy các bản ghi trong vòng 15 ngày gần nhất
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

        const q = query(
          collection(db, 'drone_recordings'),
          where('createdAt', '>=', fifteenDaysAgo),
          orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setRecordings(list);
        if (list.length > 0) {
          setSelectedVideo(list[0].videoUrl);
        }
      } catch (err) {
        console.error('Lỗi khi tải lịch sử camera:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecordings();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex p-6 backdrop-blur-sm">
      <div className="flex-1 flex flex-col items-center justify-center bg-black rounded-2xl overflow-hidden p-4 relative">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 bg-white/20 text-white px-3 py-1.5 rounded-xl text-sm font-bold hover:bg-white/40 transition"
        >
          ✕ Đóng
        </button>

        {selectedVideo ? (
          <video
            src={selectedVideo}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-xl shadow-2xl"
          />
        ) : (
          <p className="text-gray-400">
            {loading ? 'Đang tải dữ liệu...' : 'Không có video xem lại trong 15 ngày qua'}
          </p>
        )}
      </div>

      <div className="w-96 bg-white rounded-2xl p-5 ml-6 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div>
            <h3 className="font-bold text-lg text-gray-800">📹 Lịch sử Camera</h3>
            <p className="text-xs text-gray-500">Tự động xóa sau 15 ngày</p>
          </div>
          <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
            {recordings.length} bản ghi
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {recordings.map((rec) => (
            <div
              key={rec.id}
              onClick={() => setSelectedVideo(rec.videoUrl)}
              className={`p-3 rounded-xl cursor-pointer border transition-all ${
                selectedVideo === rec.videoUrl
                  ? 'bg-blue-50 border-blue-500 shadow-sm'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <div className="font-semibold text-sm text-gray-800">
                {rec.createdAt?.seconds
                  ? new Date(rec.createdAt.seconds * 1000).toLocaleString('vi-VN')
                  : 'Thời gian không xác định'}
              </div>
              <div className="text-xs text-gray-500 mt-1 flex justify-between items-center">
                <span>{rec.title || 'Video tuần tra'}</span>
                {rec.duration && <span>{rec.duration}s</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Drone() {
  const [missions, setMissions] = useState([]);
  const [selectedMissionId, setSelectedMissionId] = useState(null);

  const [mission, setMission] = useState([]);
  const [missionName, setMissionName] = useState('');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('07:15');
  const [speed, setSpeed] = useState(3);
  const [loop, setLoop] = useState(true);
  const [lastTriggered, setLastTriggered] = useState('');

  const [missionLocked, setMissionLocked] = useState(false);

  // Trạng thái Modal xem lại Camera
  const [showPlaybackModal, setShowPlaybackModal] = useState(false);

  // Trạng thái kiểm tra thời tiết
  const [weatherChecking, setWeatherChecking] = useState(false);
  const [weatherMessage, setWeatherMessage] = useState('');
  const weatherTimerRef = useRef(null);

  useEffect(() => {
    loadMissions();
  }, []);

  // --- 1. HÀM KIỂM TRA THỜI TIẾT ---
  const fetchWeatherData = async () => {
    try {
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${LAT_SCHOOL}&lon=${LNG_SCHOOL}&appid=${WEATHER_API_KEY}&units=metric`
      );
      const data = await res.json();

      const windSpeed = data.wind?.speed || 0;
      const isRaining =
        Boolean(data.rain) ||
        data.weather?.some((w) => w.main.toLowerCase().includes('rain'));

      const safe = windSpeed <= MAX_WIND_SPEED_MS && !isRaining;

      return { safe, windSpeed, isRaining };
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu thời tiết:', err);
      return { safe: false, windSpeed: 0, isRaining: false };
    }
  };

  // Kiểm tra 3 lần trước khi cho phép cất cánh / chạy Mission
  const verifyWeather3Times = async () => {
    setWeatherChecking(true);
    setWeatherMessage('🌤️ Bắt đầu kiểm tra thời tiết...');

    for (let attempt = 1; attempt <= 3; attempt++) {
      setWeatherMessage(`🌤️ Đang kiểm tra thời tiết lần ${attempt}/3...`);

      const res = await fetchWeatherData();

      if (!res.safe) {
        const reason = res.isRaining
          ? 'Phát hiện có MƯA'
          : `GIÓ LỚN (${res.windSpeed} m/s)`;
        const errorMsg = `❌ Lần ${attempt}/3 thất bại: ${reason}. HỦY CẤT CÁNH!`;
        setWeatherMessage(errorMsg);
        setWeatherChecking(false);
        return false;
      }

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 3000)); // Đợi 3 giây giữa các lần test
      }
    }

    setWeatherMessage('✅ Thời tiết An Toàn (Đã qua 3/3 lần kiểm tra). Rất thích hợp để bay!');
    setWeatherChecking(false);
    return true;
  };

  // Vòng lặp kiểm tra thời tiết định kỳ khi drone đang bay (In-flight Monitoring)
  const startInFlightWeatherCheck = () => {
    stopInFlightWeatherCheck();

    weatherTimerRef.current = setInterval(async () => {
      const res = await fetchWeatherData();
      if (!res.safe) {
        console.warn('⚠️ Phát hiện thời tiết xấu! Tự động gửi lệnh Quay Về Home (RTL)...');
        setWeatherMessage('⚠️ Phát hiện mưa/gió lớn khi đang bay! Đang quay về Home (RTL)...');

        // Gửi lệnh RTL
        await setDoc(
          doc(db, 'commands', 'current'),
          {
            action: 'RTL',
            reason: 'WEATHER_SAFETY_AUTO_RETURN',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        // Dừng Mission
        await setDoc(
          doc(db, 'system', 'droneState'),
          {
            missionRunning: false,
            currentMission: '',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        stopInFlightWeatherCheck();
      }
    }, 30000); // Kiểm tra mỗi 30 giây
  };

  const stopInFlightWeatherCheck = () => {
    if (weatherTimerRef.current) {
      clearInterval(weatherTimerRef.current);
      weatherTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopInFlightWeatherCheck();
  }, []);

  // --- 2. SCHEDULER TỰ ĐỘNG THEO LỊCH TRÌNH ---
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const snapshot = await getDocs(collection(db, 'missions'));

        const activeMission = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .find((m) => m.active);

        if (!activeMission) return;

        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        const current = `${hh}:${mm}`;

        // Đúng giờ bắt đầu
        if (
          current === activeMission.startTime &&
          lastTriggered !== `START-${current}`
        ) {
          // Kiểm tra thời tiết 3 lần trước khi khởi động Mission tự động
          const isWeatherSafe = await verifyWeather3Times();

          if (isWeatherSafe) {
            await setDoc(
              doc(db, 'commands', 'current'),
              {
                action: 'START_MISSION',
                missionId: activeMission.id,
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            await setDoc(
              doc(db, 'system', 'droneState'),
              {
                missionRunning: true,
                currentMission: activeMission.id,
                readyToScan: false,
                currentWaypoint: '',
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );

            startInFlightWeatherCheck(); // Kích hoạt giám sát trong lúc bay
            console.log('🚁 START_MISSION', activeMission.name, current, activeMission.startTime);
            setLastTriggered(`START-${current}`);
          } else {
            console.warn('❌ Không thể bắt đầu Mission do thời tiết không đạt tiêu chuẩn.');
            setLastTriggered(`START-FAILED-${current}`);
          }
        }

        // Đúng giờ kết thúc
        if (
          current === activeMission.endTime &&
          lastTriggered !== `STOP-${current}`
        ) {
          await setDoc(
            doc(db, 'commands', 'current'),
            {
              action: 'STOP_MISSION',
              missionId: activeMission.id,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          await setDoc(
            doc(db, 'system', 'droneState'),
            {
              missionRunning: false,
              currentMission: '',
              readyToScan: false,
              currentWaypoint: '',
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          stopInFlightWeatherCheck();
          console.log('🛑 STOP_MISSION', activeMission.name, current, activeMission.endTime);
          setLastTriggered(`STOP-${current}`);
        }
      } catch (err) {
        console.error('Scheduler error:', err);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lastTriggered]);

  const loadMissions = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'missions'));

      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setMissions(list);

      if (list.length > 0) {
        selectMission(list[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const selectMission = (m) => {
    setSelectedMissionId(m.id);
    setMissionName(m.name || '');
    setStartTime(m.startTime || '07:00');
    setEndTime(m.endTime || '07:15');
    setSpeed(m.speed || 3);
    setLoop(m.loop ?? true);

    const routeObjects = (m.route || [])
      .map((id) => WAYPOINTS.find((w) => w.id === id))
      .filter(Boolean);

    setMission(routeObjects);
    setMissionLocked(true);
  };

  const createMission = async () => {
    try {
      const ref = await addDoc(collection(db, 'missions'), {
        name: `Mission ${missions.length + 1}`,
        startTime: '07:00',
        endTime: '07:15',
        speed: 3,
        loop: true,
        active: false,
        route: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await loadMissions();

      const created = {
        id: ref.id,
        name: `Mission ${missions.length + 1}`,
        startTime: '07:00',
        endTime: '07:15',
        speed: 3,
        loop: true,
        active: false,
        route: [],
      };

      selectMission(created);
      setMissionLocked(false);
    } catch (err) {
      console.error(err);
      alert('Không tạo được Mission');
    }
  };

  const handleSelectWaypoint = (wp) => {
    if (missionLocked) return;

    setMission((prev) => {
      const exists = prev.some((item) => item.id === wp.id);
      if (exists) return prev;
      return [...prev, wp];
    });
  };

  const removeWaypoint = (id) => {
    if (missionLocked) return;
    setMission((prev) => prev.filter((item) => item.id !== id));
  };

  const clearMission = () => {
    if (missionLocked) return;
    setMission([]);
  };

  const saveMission = async () => {
    if (!selectedMissionId) {
      alert('Chưa chọn Mission');
      return;
    }

    try {
      await setDoc(
        doc(db, 'missions', selectedMissionId),
        {
          name: missionName,
          startTime,
          endTime,
          speed,
          loop,
          active: false,
          route: mission.map((wp) => wp.id),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setMissionLocked(true);
      await loadMissions();

      alert('Đã lưu Mission');
    } catch (err) {
      console.error(err);
      alert('Lỗi khi lưu Mission');
    }
  };

  const editMission = () => {
    setMissionLocked(false);
  };

  const activateMission = async () => {
    if (!selectedMissionId) return;

    try {
      for (const m of missions) {
        await updateDoc(doc(db, 'missions', m.id), {
          active: m.id === selectedMissionId,
          updatedAt: serverTimestamp(),
        });
      }

      await loadMissions();

      alert('Mission đã được kích hoạt');
    } catch (err) {
      console.error(err);
      alert('Không kích hoạt được Mission');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-4xl font-bold">🚁 Drone AI</h1>
        
        {/* Nút Xem lại Lịch sử Camera */}
        <button
          onClick={() => setShowPlaybackModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-md transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Xem lại Lịch sử Camera (15 ngày)
        </button>
      </div>

      {/* Modal phát lại camera */}
      <CameraPlaybackModal
        isOpen={showPlaybackModal}
        onClose={() => setShowPlaybackModal(false)}
      />

      {/* Hiển thị thông báo trạng thái kiểm tra thời tiết */}
      {weatherMessage && (
        <div className={`mb-6 p-4 rounded-2xl border flex items-center justify-between ${
          weatherMessage.includes('❌') ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          <span className="font-semibold text-sm">{weatherMessage}</span>
          <button 
            onClick={() => verifyWeather3Times()} 
            disabled={weatherChecking}
            className="text-xs bg-white px-3 py-1.5 rounded-xl border shadow-sm hover:bg-gray-50 font-bold"
          >
            {weatherChecking ? 'Đang kiểm tra...' : 'Kiểm tra ngay 🌤️'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <DroneStatus />

        <div className="col-span-2">
          <SchoolMap onSelectWaypoint={handleSelectWaypoint} />
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow p-6 border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">📋 Mission Planner</h2>

          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              missionLocked
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {missionLocked ? '🔒 Đã khóa' : '✏️ Đang chỉnh sửa'}
          </span>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {missions.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMission(m)}
              className={`px-3 py-2 rounded-xl border ${
                selectedMissionId === m.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              {m.name}
              {m.active ? ' 🚁' : ''}
            </button>
          ))}

          <button
            onClick={createMission}
            className="px-3 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            + Tạo Mission
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Tên Mission
            </label>
            <input
              type="text"
              value={missionName}
              onChange={(e) => setMissionName(e.target.value)}
              disabled={missionLocked}
              className="w-full border rounded-xl px-3 py-2 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Giờ bắt đầu
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={missionLocked}
              className="w-full border rounded-xl px-3 py-2 disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Giờ kết thúc
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={missionLocked}
              className="w-full border rounded-xl px-3 py-2 disabled:bg-gray-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Tốc độ (m/s)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              disabled={missionLocked}
              className="w-full border rounded-xl px-3 py-2 disabled:bg-gray-100"
            />
          </div>

          <div className="flex items-center gap-2 mt-7">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              disabled={missionLocked}
            />
            <span>Bay lặp (Loop)</span>
          </div>
        </div>

        <h3 className="text-lg font-bold mb-3">Waypoints</h3>

        {mission.length === 0 ? (
          <p className="text-gray-500">
            Chưa có waypoint nào trong Mission.
          </p>
        ) : (
          <div className="space-y-2">
            {mission.map((wp, index) => (
              <div
                key={wp.id}
                className="flex items-center justify-between border rounded-lg p-3"
              >
                <div>
                  <div className="font-semibold">
                    {index + 1}. {wp.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {wp.id} • Alt: {wp.alt}m
                  </div>
                </div>

                <button
                  onClick={() => removeWaypoint(wp.id)}
                  disabled={missionLocked}
                  className={`${
                    missionLocked
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-red-600 hover:text-red-800'
                  }`}
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={clearMission}
            disabled={missionLocked}
            className={`px-4 py-2 rounded-xl ${
              missionLocked
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            Xóa toàn bộ
          </button>

          <button
            onClick={saveMission}
            disabled={missionLocked}
            className={`px-4 py-2 rounded-xl text-white ${
              missionLocked
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {missionLocked ? 'Mission đã khóa' : 'Lưu Mission'}
          </button>

          <button
            onClick={editMission}
            className="px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600"
          >
            Chỉnh sửa Mission
          </button>

          <button
            onClick={activateMission}
            className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700"
          >
            Đặt làm Active
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <DroneCamera />
        <TimetableManager />
        <DroneAI />
      </div>

      <div className="mt-6">
        <DroneControl />
      </div>
    </div>
  );
}