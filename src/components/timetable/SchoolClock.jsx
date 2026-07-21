import { useEffect, useState } from "react";

export default function SchoolClock() {

    const [now, setNow] = useState(new Date());

    useEffect(() => {

        const timer = setInterval(() => {

            setNow(new Date());

        }, 1000);

        return () => clearInterval(timer);

    }, []);

    const weekdays = [
        "Chủ nhật",
        "Thứ Hai",
        "Thứ Ba",
        "Thứ Tư",
        "Thứ Năm",
        "Thứ Sáu",
        "Thứ Bảy"
    ];

    const day = weekdays[now.getDay()];

    const date = now.toLocaleDateString("vi-VN");

    const time = now.toLocaleTimeString("vi-VN");

    return (

        <div className="bg-white rounded-3xl shadow-xl p-8">

            <div className="flex justify-between items-center">

                <div>

                    <h2 className="text-3xl font-bold">

                        🕒 Thời gian hiện tại

                    </h2>

                    <p className="text-gray-500 mt-2">

                        {day}, {date}

                    </p>

                </div>

                <div className="text-6xl font-bold text-blue-600">

                    {time}

                </div>

            </div>

        </div>

    );

}