export default function ValidationDashboard({ validation }) {

    return (

        <div className="grid grid-cols-4 gap-4 mt-6">

            <div className="bg-white rounded-xl shadow p-4">

                Trùng mã HS

                <div className="text-3xl font-bold text-orange-600">

                    {validation.duplicate}

                </div>

            </div>

            <div className="bg-white rounded-xl shadow p-4">

                Thiếu mã HS

                <div className="text-3xl font-bold text-red-600">

                    {validation.noId}

                </div>

            </div>

            <div className="bg-white rounded-xl shadow p-4">

                Thiếu ảnh

                <div className="text-3xl font-bold text-red-600">

                    {validation.noImage}

                </div>

            </div>

            <div className="bg-white rounded-xl shadow p-4">

                Ảnh nhiều mặt

                <div className="text-3xl font-bold text-yellow-600">

                    {validation.multiFace}

                </div>

            </div>

        </div>

    );

}