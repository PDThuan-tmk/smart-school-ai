import { useState } from "react";
import * as XLSX from "xlsx";
import { saveTimetable } from "../../services/timetableService";

export default function TimetableUpload() {

    const [files, setFiles] = useState([]);

    async function handleFiles(e) {

        const selectedFiles = Array.from(e.target.files);

        setFiles(selectedFiles);

        for (const file of selectedFiles) {

            const buffer = await file.arrayBuffer();

            const workbook = XLSX.read(buffer);

            const sheet =
                workbook.Sheets[
                    workbook.SheetNames[0]
                ];

            const data =
                XLSX.utils.sheet_to_json(sheet);

            console.log("==========");

            const className = file.name.replace(".xlsx", "");

            await saveTimetable(

                className,

                data

            );

            console.log(

                "Đã lưu",

                className

            );

        }

    }

    return (

        <div className="bg-white rounded-3xl shadow-xl p-8">

            <h2 className="text-3xl font-bold mb-6">

                📥 Upload thời khóa biểu

            </h2>

            <label

                className="
                    flex
                    flex-col
                    items-center
                    justify-center
                    border-2
                    border-dashed
                    border-blue-400
                    rounded-2xl
                    p-16
                    cursor-pointer
                    hover:bg-blue-50
                "

            >

                <div className="text-6xl">

                    📄

                </div>

                <div className="mt-4 text-2xl">

                    Chọn nhiều file Excel

                </div>

                <div className="text-gray-500 mt-2">

                    (*.xlsx)

                </div>

                <input

                    type="file"

                    multiple

                    accept=".xlsx"

                    hidden

                    onChange={handleFiles}

                />

            </label>

            {

                files.length > 0 &&

                <div className="mt-8">

                    <h3 className="font-bold text-xl">

                        Đã chọn

                    </h3>

                    <ul className="mt-4 space-y-2">

                        {

                            files.map(file=>(

                                <li
                                    key={file.name}
                                    className="bg-slate-100 rounded-lg px-4 py-3"
                                >

                                    📄 {file.name}

                                </li>

                            ))

                        }

                    </ul>

                </div>

            }

        </div>

    );

}