import { useMemo, useState } from "react";

export default function StudentTable({ students }) {

    // ==========================================
    // STATE
    // ==========================================

    const [search, setSearch] = useState("");

    const [openGrades, setOpenGrades] = useState({});

    const [openClasses, setOpenClasses] = useState({});

    // ==========================================
    // TÌM KIẾM
    // ==========================================

    const filteredStudents = useMemo(() => {

        if (!search.trim()) return students;

        const keyword = search.toLowerCase();

        return students.filter(student =>

            student.studentId?.toLowerCase().includes(keyword) ||

            student.fullName?.toLowerCase().includes(keyword) ||

            student.class?.toLowerCase().includes(keyword) ||

            student.grade?.toLowerCase().includes(keyword)

        );

    }, [students, search]);

    // ==========================================
    // NHÓM THEO KHỐI -> LỚP
    // ==========================================

    const groupedStudents = useMemo(() => {

        const result = {};

        filteredStudents.forEach(student => {

            const grade = student.grade || "Chưa có khối";

            const className = student.class || "Chưa có lớp";

            if (!result[grade]) {

                result[grade] = {};

            }

            if (!result[grade][className]) {

                result[grade][className] = [];

            }

            result[grade][className].push(student);

        });

        return result;

    }, [filteredStudents]);

    // ==========================================
    // ĐÓNG / MỞ KHỐI
    // ==========================================

    const toggleGrade = (grade) => {

        setOpenGrades(prev => ({

            ...prev,

            [grade]: !prev[grade]

        }));

    };

    // ==========================================
    // ĐÓNG / MỞ LỚP
    // ==========================================

    const toggleClass = (className) => {

        setOpenClasses(prev => ({

            ...prev,

            [className]: !prev[className]

        }));

    };

    // ==========================================
    // RETURN
    // ==========================================

    return (

                <div className="space-y-6">

            {/* ========================= */}
            {/* THANH TÌM KIẾM */}
            {/* ========================= */}

            <div className="bg-white rounded-2xl shadow p-5">

                <input
                    type="text"
                    placeholder="🔍 Tìm theo mã HS, họ tên, lớp hoặc khối..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                />

            </div>

            {

                Object.keys(groupedStudents).length === 0 && (

                    <div className="bg-white rounded-2xl shadow p-20 text-center text-gray-400">

                        Chưa có học sinh nào

                    </div>

                )

            }

            {

                Object.entries(groupedStudents)

                    .sort((a, b) => Number(a[0]) - Number(b[0]))

                    .map(([grade, classes]) => {

                        const totalStudents =
                            Object.values(classes)
                                .flat()
                                .length;

                        return (

                            <div
                                key={grade}
                                className="bg-white rounded-3xl shadow-xl overflow-hidden"
                            >

                                {/* ========================= */}
                                {/* HEADER KHỐI */}
                                {/* ========================= */}

                                <div

                                    onClick={() => toggleGrade(grade)}

                                    className="cursor-pointer bg-gradient-to-r from-blue-600 to-cyan-500 text-white px-8 py-6 flex justify-between items-center hover:opacity-95"

                                >

                                    <div>

                                        <h2 className="text-3xl font-bold">

                                            📘 Khối {grade}

                                        </h2>

                                        <p className="mt-1 opacity-90">

                                            {totalStudents} học sinh

                                        </p>

                                    </div>

                                    <div className="text-4xl">

                                        {

                                            openGrades[grade]

                                                ?

                                                "▼"

                                                :

                                                "►"

                                        }

                                    </div>

                                </div>

                                {

                                    openGrades[grade] && (

                                        <div className="p-6 space-y-4">

                                            {

                                                Object.entries(classes)

                                                    .sort()

                                                    .map(([className, classStudents]) => {

                                                        const present =
                                                            classStudents.filter(

                                                                s => s.attendance === "Có mặt"

                                                            ).length;

                                                        const absent =
                                                            classStudents.length - present;

                                                        return (

                                                            <div
                                                                key={className}
                                                                className="border rounded-2xl overflow-hidden"
                                                            >

                                                                {/* HEADER LỚP */}

                                                                <div

                                                                    onClick={() => toggleClass(className)}

                                                                    className="cursor-pointer bg-slate-100 hover:bg-slate-200 px-6 py-4 flex justify-between items-center"

                                                                >

                                                                    <div>

                                                                        <h3 className="text-2xl font-bold">

                                                                            📚 {className}

                                                                        </h3>

                                                                        <p className="text-gray-500 mt-1">

                                                                            {classStudents.length} học sinh

                                                                            {" • "}

                                                                            <span className="text-green-600">

                                                                                {present} Có mặt

                                                                            </span>

                                                                            {" • "}

                                                                            <span className="text-red-600">

                                                                                {absent} Vắng

                                                                            </span>

                                                                        </p>

                                                                    </div>

                                                                    <div className="text-3xl">

                                                                        {

                                                                            openClasses[className]

                                                                                ?

                                                                                "▼"

                                                                                :

                                                                                "►"

                                                                        }

                                                                    </div>

                                                                </div>

                                                                {
                                                                    openClasses[className] &&

                                                                    (
                                                                        <div className="overflow-x-auto">

                                                                            <table className="w-full">

                                                                                <thead className="bg-blue-600 text-white">

                                                                                    <tr>

                                                                                        <th className="p-4 text-center">STT</th>

                                                                                        <th className="text-center">Ảnh</th>

                                                                                        <th className="text-left">Họ tên</th>

                                                                                        <th className="text-center">Mã HS</th>

                                                                                        <th className="text-center">Giới tính</th>

                                                                                        <th className="text-center">Trạng thái</th>

                                                                                        <th className="text-center">Thao tác</th>

                                                                                    </tr>

                                                                                </thead>

                                                                                <tbody>

                                                                                    {

                                                                                        classStudents.map((student, index) => (

                                                                                            <tr
                                                                                                key={student.id}
                                                                                                className="border-t hover:bg-slate-50 transition"
                                                                                            >

                                                                                                <td className="text-center">

                                                                                                    {index + 1}

                                                                                                </td>

                                                                                                <td className="py-3">

                                                                                                    <div className="flex justify-center">

                                                                                                        <img

                                                                                                            src={
                                                                                                                student.imageUrl ||
                                                                                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(student.fullName)}`
                                                                                                            }

                                                                                                            alt="avatar"

                                                                                                            className="w-12 h-12 rounded-full object-cover"

                                                                                                        />

                                                                                                    </div>

                                                                                                </td>

                                                                                                <td className="font-medium">

                                                                                                    {student.fullName}

                                                                                                </td>

                                                                                                <td className="text-center">

                                                                                                    {student.studentId}

                                                                                                </td>

                                                                                                <td className="text-center">

                                                                                                    {student.gender}

                                                                                                </td>

                                                                                                <td className="text-center">

                                                                                                    {

                                                                                                        student.attendance === "Có mặt"

                                                                                                            ?

                                                                                                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">

                                                                                                                ✔ Có mặt

                                                                                                            </span>

                                                                                                            :

                                                                                                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm">

                                                                                                                ❌ Vắng

                                                                                                            </span>

                                                                                                    }

                                                                                                </td>

                                                                                                <td className="text-center">

                                                                                                    <button className="mr-2 hover:scale-110 text-xl">

                                                                                                        ✏️

                                                                                                    </button>

                                                                                                    <button className="hover:scale-110 text-xl">

                                                                                                        🗑️

                                                                                                    </button>

                                                                                                </td>

                                                                                            </tr>

                                                                                        ))

                                                                                    }

                                                                                </tbody>

                                                                            </table>

                                                                        </div>

                                                                    )

                                                                }

                                                            </div>

                                                        );

                                                    })

                                            }

                                        </div>

                                    )

                                }

                            </div>

                        );

                    })

            }

        </div>

    );

}