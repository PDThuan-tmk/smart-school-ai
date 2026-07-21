export default function DroneControl() {

    return (

        <div className="bg-white rounded-2xl shadow p-6">

            <h2 className="text-2xl font-bold mb-6">

                🎮 Flight Control

            </h2>

            <div className="grid grid-cols-2 gap-4">

                <button className="bg-green-600 text-white py-3 rounded-xl">

                    🚀 Takeoff

                </button>

                <button className="bg-red-600 text-white py-3 rounded-xl">

                    🛬 Land

                </button>

                <button className="bg-blue-600 text-white py-3 rounded-xl">

                    🏠 RTL

                </button>

                <button className="bg-yellow-500 text-white py-3 rounded-xl">

                    ⏸ Pause

                </button>

            </div>

        </div>

    );

}