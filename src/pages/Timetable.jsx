import TimetableUpload from "../components/timetable/TimetableUpload";
import TimetableList from "../components/timetable/TimetableList";
import CurrentLesson from "../components/timetable/CurrentLesson";
import SchoolClock from "../components/timetable/SchoolClock";

export default function Timetable() {

    return (

        <div className="space-y-8">

            <div>

                <h1 className="text-4xl font-bold">

                    📅 Thời khóa biểu

                </h1>

                <p className="text-gray-500 mt-2 mb-8">

                    Quản lý thời khóa biểu của toàn trường

                </p>

                <p className="text-gray-500 mt-2">

                    Upload thời khóa biểu của tất cả các lớp và theo dõi tiết học hiện tại.

                </p>

            </div>

            <SchoolClock />

            <CurrentLesson />

            <TimetableUpload />

            <TimetableList />

        </div>

    );

}