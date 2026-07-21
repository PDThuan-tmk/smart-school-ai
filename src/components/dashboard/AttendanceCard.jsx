export default function AttendanceCard() {

    return (

        <div className="bg-white rounded-2xl shadow-md p-6">

            <h2 className="text-xl font-bold">

                📋 Điểm danh hôm nay

            </h2>

            <div className="mt-6">

                <div className="flex justify-between">

                    <span>Có mặt</span>

                    <strong>0</strong>

                </div>

                <div className="flex justify-between mt-4">

                    <span>Vắng</span>

                    <strong>0</strong>

                </div>

                <div className="flex justify-between mt-4">

                    <span>Đi muộn</span>

                    <strong>0</strong>

                </div>

            </div>

        </div>

    );

}