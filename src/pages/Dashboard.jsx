import DashboardCard from "../components/dashboard/DashboardCard";
import AttendanceCard from "../components/dashboard/AttendanceCard";
import RecentActivity from "../components/dashboard/RecentActivity";

export default function Dashboard() {

    const cards = [

        {
            title: "Học sinh",
            value: 0,
            icon: "👨‍🎓",
            color: "bg-blue-600"
        },

        {
            title: "Giáo viên",
            value: 0,
            icon: "👩‍🏫",
            color: "bg-green-600"
        },

        {
            title: "Camera AI",
            value: "Offline",
            icon: "📷",
            color: "bg-red-600"
        },

        {
            title: "Drone AI",
            value: "Connected",
            icon: "🚁",
            color: "bg-purple-600"
        }

    ];

    return (

        <>

            <h1 className="text-4xl font-bold">

                Dashboard

            </h1>

            <p className="text-gray-500 mt-2">

                Chào mừng bạn đến với Smart School AI

            </p>

            <div className="grid grid-cols-4 gap-6 mt-8">

                {cards.map((card) => (

                    <DashboardCard
                        key={card.title}
                        title={card.title}
                        value={card.value}
                        icon={card.icon}
                        color={card.color}
                    />

                ))}

            </div>

            <div className="grid grid-cols-2 gap-6 mt-8">

                <AttendanceCard />

                <RecentActivity />

            </div>

        </>

    );

}