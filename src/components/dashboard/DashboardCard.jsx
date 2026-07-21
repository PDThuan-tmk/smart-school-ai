export default function DashboardCard({
    title,
    value,
    icon,
    color
}) {

    return (

        <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition p-6">

            <div className="flex justify-between items-center">

                <div>

                    <p className="text-gray-500">

                        {title}

                    </p>

                    <h2 className="text-4xl font-bold mt-4">

                        {value}

                    </h2>

                </div>

                <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white text-3xl ${color}`}
                >

                    {icon}

                </div>

            </div>

        </div>

    );

}