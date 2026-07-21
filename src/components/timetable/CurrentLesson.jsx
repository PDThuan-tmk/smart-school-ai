import { useEffect, useState } from "react";
import { listenTimetables } from "../../services/timetableService";

export default function CurrentLesson() {

    const [currentPeriod, setCurrentPeriod] = useState(null);

    const [remainingTime, setRemainingTime] = useState("");

    const [timetables, setTimetables] = useState([]);

    const [currentTime, setCurrentTime] = useState(new Date());

    const periods = [

        {
            name: "15 phút đầu giờ",
            start: "06:45",
            end: "07:00"
        },

        {
            name: "Tiết 1",
            start: "07:00",
            end: "07:45"
        },

        {
            name: "Tiết 2",
            start: "07:50",
            end: "08:35"
        },

        {
            name: "Tiết 3",
            start: "08:45",
            end: "09:30"
        },

        {
            name: "Tiết 4",
            start: "09:35",
            end: "10:20"
        },

        {
            name: "Tiết 5",
            start: "10:25",
            end: "11:10"
        },

        {
            name: "Tiết 6",
            start: "13:00",
            end: "13:45"
        },

        {
            name: "Tiết 7",
            start: "13:50",
            end: "14:35"
        },

        {
            name: "Tiết 8",
            start: "14:45",
            end: "15:30"
        },

        {
            name: "Tiết 9",
            start: "15:35",
            end: "16:20"
        }

    ];

    useEffect(() => {

        const unsubscribe =

            listenTimetables(setTimetables);

        function updateCurrentPeriod() {

            const now = new Date();

            const minutes =
                now.getHours() * 60 +
                now.getMinutes();

            let found = null;

            for (const period of periods) {

                const [sh, sm] = period.start.split(":").map(Number);
                const [eh, em] = period.end.split(":").map(Number);

                const start = sh * 60 + sm;
                const end = eh * 60 + em;

                if (minutes >= start && minutes <= end) {

                    found = period;
                    break;

                }

            }

            setCurrentPeriod(found);

            if (found) {

                const [eh, em] = found.end.split(":").map(Number);

                const endDate = new Date();

                endDate.setHours(eh);
                endDate.setMinutes(em);
                endDate.setSeconds(0);

                const diff = endDate - now;

                if (diff > 0) {

                    const minutes = Math.floor(diff / 60000);

                    const seconds = Math.floor((diff % 60000) / 1000);

                    setRemainingTime(

                        `${minutes} phút ${seconds} giây`

                    );

                } else {

                    setRemainingTime("");

                }

            }
            else {

                setRemainingTime("");

            }

        }

        updateCurrentPeriod();

        const timer = setInterval(updateCurrentPeriod, 1000);

        return () => {

            clearInterval(timer);

            unsubscribe();

        };

    }, []);

    useEffect(() => {

        const timer = setInterval(() => {

            setCurrentTime(new Date());

        }, 1000);

        return () => clearInterval(timer);

    }, []);

    const today = [

        "Chủ nhật",

        "Thứ Hai",

        "Thứ Ba",

        "Thứ Tư",

        "Thứ Năm",

        "Thứ Sáu",

        "Thứ Bảy"

    ][new Date().getDay()];

    const currentLessons = [];

    if (currentPeriod) {

        timetables.forEach(table => {

            const lesson =

                table.lessons.find(

                    item =>

                        item["Thứ"] === today &&

                        item["Tiết"] === currentPeriod.name

                );

            if (lesson) {

                currentLessons.push({

                    className: table.className,

                    subject: lesson["Môn"]

                });

            }

        });

    }

    // ==========================================
    // THỐNG KÊ
    // ==========================================

    const totalClasses = timetables.length;

    const studyingClasses = currentLessons.length;

    const totalStudents = timetables.reduce(

        (sum, item) => sum + (item.studentCount || 0),

        0

    );
    
    return (

        <div className="bg-white rounded-3xl shadow-xl p-8">

            <div className="grid grid-cols-3 gap-6 mb-8">

                <div className="bg-blue-600 text-white rounded-2xl p-6">

                    <div className="text-4xl font-bold">

                        {totalClasses}

                    </div>

                    <div className="mt-2">

                        Tổng số lớp

                    </div>

                </div>

                <div className="bg-green-600 text-white rounded-2xl p-6">

                    <div className="text-4xl font-bold">

                        {studyingClasses}

                    </div>

                    <div className="mt-2">

                        Đang học

                    </div>

                </div>

                <div className="bg-purple-600 text-white rounded-2xl p-6">

                    <div className="text-4xl font-bold">

                        {totalStudents}

                    </div>

                    <div className="mt-2">

                        Tổng học sinh

                    </div>

                </div>

            </div>

            <div className="flex justify-between items-center mb-8">

                <div>

                    <h2 className="text-3xl font-bold">

                        📖 Tiết học hiện tại

                    </h2>

                    <p className="text-gray-500 mt-2">

                        {currentTime.toLocaleDateString("vi-VN", {

                            weekday: "long",

                            day: "2-digit",

                            month: "2-digit",

                            year: "numeric"

                        })}

                    </p>

                </div>

                <div className="text-right">

                    <div className="text-5xl font-bold text-blue-600">

                        {currentTime.toLocaleTimeString("vi-VN")}

                    </div>

                    <div className="text-gray-500">

                        Thời gian thực

                    </div>

                </div>

            </div>

            {

                currentPeriod ?

                    <div className="mt-6">

                        <div className="text-green-600 text-xl font-bold">

                            🟢 Đang diễn ra

                        </div>

                        <div className="text-5xl font-bold mt-3">

                            {currentPeriod.name}

                        </div>

                        <div className="text-gray-500 text-xl mt-2">

                            {currentPeriod.start}

                            {" - "}

                            {currentPeriod.end}

                        </div>

                        <div className="mt-6">

                            <div className="text-lg text-gray-500">

                                ⏰ Còn lại

                            </div>

                            <div className="text-4xl font-bold text-red-500 mt-2">

                                {remainingTime}

                            </div>

                        </div>

                    </div>

                    :

                    <div className="mt-6">

                        <div className="text-4xl">

                            🏠

                        </div>

                        <div className="text-2xl font-bold mt-3">

                            Ngoài giờ học

                        </div>

                    </div>

                        }

            <div className="mt-10 border-t pt-8">

                <h3 className="text-2xl font-bold mb-5">

                    📚 Các lớp đang học

                </h3>

                {

                    currentLessons.length === 0 ?

                    (

                        <div className="text-gray-400">

                            Hiện chưa có lớp nào đang học.

                        </div>

                    )

                    :

                    currentLessons.map((lesson, index) => (

                        <div

                            key={index}

                            className="flex justify-between items-center border-b py-3"

                        >

                            <div className="font-bold text-lg">

                                {lesson.className}

                            </div>

                            <div className="text-blue-600 font-semibold">

                                {lesson.subject}

                            </div>

                        </div>

                    ))

                }

            </div>

        </div>

    );

}