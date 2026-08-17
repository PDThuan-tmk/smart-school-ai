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

// Hàm gửi lệnh lên Firestore
const sendCommand = async (action) => {
try {
await setDoc(
doc(db, 'commands', 'current'),
{
action,
updatedAt: serverTimestamp(),
},
{ merge: true }
);


  console.log('Đã gửi lệnh:', action);
} catch (err) {
  console.error(err);
  alert('Không gửi được lệnh');
}


};

// Dừng Mission
const stopMission = async () => {
try {
// Gửi lệnh STOP_MISSION
await setDoc(
doc(db, 'commands', 'current'),
{
action: 'STOP_MISSION',
missionId: currentMission,
updatedAt: serverTimestamp(),
},
{ merge: true }
);


  // Cập nhật trạng thái hệ thống
  await setDoc(
    doc(db, 'system', 'droneState'),
    {
      missionRunning: false,
      currentMission: '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  console.log('Đã dừng Mission');
} catch (err) {
  console.error(err);
  alert('Không dừng được Mission');
}


};

return ( <div className='bg-white rounded-2xl shadow p-6'> <div className='flex items-center justify-between mb-6'> <h2 className='text-2xl font-bold'>🎮 Flight Control</h2>


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
      Drone đang thực hiện Mission.
      Các lệnh điều khiển thủ công đã bị khóa.
      Chỉ có thể dừng Mission.
    </div>
  )}

  <div className='grid grid-cols-2 gap-4'>
    <button
      onClick={() => sendCommand('TAKEOFF')}
      disabled={missionRunning}
      className={`py-3 rounded-xl text-white font-semibold ${
        missionRunning
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-green-600 hover:bg-green-700'
      }`}
    >
      🚀 Takeoff
    </button>

    <button
      onClick={() => sendCommand('LAND')}
      disabled={missionRunning}
      className={`py-3 rounded-xl text-white font-semibold ${
        missionRunning
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-red-600 hover:bg-red-700'
      }`}
    >
      🛬 Land
    </button>

    <button
      onClick={() => sendCommand('RTL')}
      disabled={missionRunning}
      className={`py-3 rounded-xl text-white font-semibold ${
        missionRunning
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      🏠 RTL
    </button>

    <button
      onClick={() => sendCommand('HOLD')}
      disabled={missionRunning}
      className={`py-3 rounded-xl text-white font-semibold ${
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
      className='w-full mt-4 py-3 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold'
    >
      ⛔ Dừng Mission
    </button>
  )}
</div>


);
}
