import { useState } from 'react';
import { WAYPOINTS } from "../data/waypoints";

export default function MissionPlanner() {
const [mission, setMission] = useState([]);

function addWaypoint(wp) {
setMission((prev) => [...prev, wp]);
}

function removeWaypoint(index) {
setMission((prev) => prev.filter((_, i) => i !== index));
}

return ( <div className='p-6'> <h1 className='text-3xl font-bold mb-6'>🛰️ Mission Planner</h1>

```
  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
    <div className='bg-white rounded-2xl shadow p-4'>
      <h2 className='text-xl font-semibold mb-4'>Danh sách Waypoint</h2>

      <div className='space-y-2 max-h-[500px] overflow-y-auto'>
        {WAYPOINTS.map((wp) => (
          <button
            key={wp.id}
            onClick={() => addWaypoint(wp)}
            className='w-full text-left border rounded-lg p-3 hover:bg-blue-50 transition'
          >
            <div className='font-semibold'>
              {wp.id} - {wp.name}
            </div>
            <div className='text-sm text-gray-600'>
              {wp.lat}, {wp.lng}
            </div>
          </button>
        ))}
      </div>
    </div>

    <div className='bg-white rounded-2xl shadow p-4'>
      <h2 className='text-xl font-semibold mb-4'>Mission hiện tại</h2>

      {mission.length === 0 ? (
        <p className='text-gray-500'>Chưa có waypoint nào.</p>
      ) : (
        <div className='space-y-2'>
          {mission.map((wp, index) => (
            <div
              key={index}
              className='flex items-center justify-between border rounded-lg p-3'
            >
              <div>
                <div className='font-semibold'>
                  {index + 1}. {wp.id} - {wp.name}
                </div>
                <div className='text-sm text-gray-600'>
                  Alt: {wp.alt} m
                </div>
              </div>

              <button
                onClick={() => removeWaypoint(index)}
                className='text-red-600 hover:text-red-800'
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
</div>

);
}
