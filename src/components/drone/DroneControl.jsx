import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

export default function DroneControl() {
  const [missionRunning, setMissionRunning] = useState(false);
  const [currentMission, setCurrentMission] = useState('');

  // Theo dõi trạng thái drone từ Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'droneState'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMissionRunning(data.missionRunning || false);
        setCurrentMission(data.currentMission || '');
      }
    });

    return () => unsub();
  }, []);

  // Hàm gửi lệnh chung lên Firestore cho ESP32
  const sendCommand = async (action, targetWaypoint = '') => {
    try {
      await setDoc(
        doc(db, 'commands', 'current'),
        {
          action: action,
          targetWaypoint: targetWaypoint,
          timestamp: serverTimestamp(), // ESP32 đọc field 'timestampValue' từ đây
        },
        { merge: true }
      );

      console.log('Đã gửi lệnh:', action);
    } catch (err) {
      console.error('Lỗi khi gửi lệnh:', err);
      alert('Không gửi được lệnh, vui lòng thử lại!');
    }
  };

  // Dừng Mission khẩn cấp
  const stopMission = async () => {
    try {
      // Gửi lệnh STOP_MISSION cho ESP32
      await setDoc(
        doc(db, 'commands', 'current'),
        {
          action: 'STOP_MISSION',
          missionId: currentMission,
          timestamp: serverTimestamp(),
        },
        { merge: true }
      );

      // Cập nhật trạng thái hệ thống
      await setDoc(
        doc(db, 'system', 'droneState'),
        {
          missionRunning: false,
          currentMission: '',
        },
        { merge: true }
      );

      console.log('Đã dừng Mission');
    } catch (err) {
      console.error('Lỗi dừng mission:', err);
      alert('Không dừng được Mission');
    }
  };

  return (
    <div className='bg-white rounded-2xl shadow p-6'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-2xl font-bold flex items-center gap-2'>🎮 Flight Control</h2>

        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            missionRunning
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {missionRunning ? '🚁 Đang chạy Mission' : '🟢 Sẵn sàng'}
        </span>
      </div>

      {missionRunning && (
        <div className='mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm'>
          Drone đang thực hiện Mission. Các lệnh điều khiển thủ công đã bị khóa.
          Chỉ có thể dừng Mission.
        </div>
      )}

      <div className='grid grid-cols-2 gap-4'>
        {/* Nút Takeoff kích hoạt kịch bản Test Flight 1m trên ESP32 */}
        <button
          onClick={() => sendCommand('TEST_FLIGHT', 'TEST_1M')}
          disabled={missionRunning}
          className={`py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 ${
            missionRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          🚀 Takeoff (Test 1m)
        </button>

        {/* Nút Hạ cánh khẩn cấp */}
        <button
          onClick={() => sendCommand('LAND')}
          disabled={missionRunning}
          className={`py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 ${
            missionRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          🛬 Land
        </button>

        {/* Nút Bay về điểm cất cánh */}
        <button
          onClick={() => sendCommand('RTL')}
          disabled={missionRunning}
          className={`py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 ${
            missionRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          🏠 RTL
        </button>

        {/* Nút Tạm dừng / Hold */}
        <button
          onClick={() => sendCommand('HOLD')}
          disabled={missionRunning}
          className={`py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 ${
            missionRunning
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-yellow-500 hover:bg-yellow-600'
          }`}
        >
          ⏸ Pause
        </button>
      </div>

      {missionRunning && (
        <button
          onClick={stopMission}
          className='w-full mt-4 py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold transition-colors'
        >
          ⛔ Dừng Mission
        </button>
      )}
    </div>
  );
}