export default function DroneStatus() {

    const data = [

        { label: "Tên Drone", value: "SSAI-01" },

        { label: "Trạng thái", value: "🟢 Online" },

        { label: "Pin", value: "100%" },

        { label: "GPS", value: "0 vệ tinh" },

        { label: "Độ cao", value: "0 m" },

        { label: "Tốc độ", value: "0 m/s" },

        { label: "Mode", value: "STANDBY" }

    ];

    return (

        <div className="bg-white rounded-2xl shadow p-6">

            <h2 className="text-2xl font-bold mb-5">

                🚁 Drone Status

            </h2>

            {

                data.map((item) => (

                    <div
                        key={item.label}
                        className="flex justify-between py-2 border-b"
                    >

                        <span>{item.label}</span>

                        <strong>{item.value}</strong>

                    </div>

                ))

            }

        </div>

    );

}