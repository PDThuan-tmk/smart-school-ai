export default function DroneAI() {

    const objects = [

        ["👨 Người",0],

        ["🚗 Xe",0],

        ["🚲 Xe đạp",0],

        ["🔥 Cháy",0],

        ["💨 Khói",0],

        ["⚠ Người lạ",0]

    ];

    return (

        <div className="bg-white rounded-2xl shadow p-6">

            <h2 className="text-2xl font-bold">

                🤖 AI Detection

            </h2>

            <div className="mt-5 space-y-3">

                {

                    objects.map((item)=>(

                        <div
                            key={item[0]}
                            className="flex justify-between"
                        >

                            <span>{item[0]}</span>

                            <strong>{item[1]}</strong>

                        </div>

                    ))

                }

            </div>

        </div>

    );

}