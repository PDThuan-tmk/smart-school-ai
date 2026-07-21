import {
  FaHome,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaCamera,
  FaClipboardCheck,
  FaChartBar,
  FaCog,
  FaHelicopter,
  FaCalendarAlt,
} from "react-icons/fa";

import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const menus = [
  {
    title: "Dashboard",
    path: "/dashboard",
    icon: <FaHome />,
  },
  {
    title: "Học sinh",
    path: "/students",
    icon: <FaUserGraduate />,
  },
  {
    title: "Giáo viên",
    path: "/teachers",
    icon: <FaChalkboardTeacher />,
  },
  {
    title: "Camera AI",
    path: "/camera",
    icon: <FaCamera />,
  },
  {
    title: "Drone AI",
    path: "/drone",
    icon: <FaHelicopter />,
  },
  {
    title: "Điểm danh",
    path: "/attendance",
    icon: <FaClipboardCheck />,
  },
  {
    title: "Báo cáo",
    path: "/reports",
    icon: <FaChartBar />,
  },
  {
    title: "Thời khóa biểu",
    icon: <FaCalendarAlt/>,
    path: "/timetable"
  },
  {
    title: "Cài đặt",
    path: "/settings",
    icon: <FaCog />,
  },
  
];

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-72 h-screen bg-slate-900 text-white flex flex-col shadow-2xl">

      {/* Logo */}
      <div className="p-8 border-b border-slate-700">

        <h1 className="text-3xl font-extrabold text-blue-400">
          🎓 Smart School AI
        </h1>

        <p className="text-sm text-slate-400 mt-2">
          School Management System
        </p>

      </div>

      {/* Thông tin người dùng */}
      <div className="flex items-center gap-4 p-6 border-b border-slate-700">

        <img
          src={
            user?.photoURL ||
            "https://ui-avatars.com/api/?name=Admin"
          }
          alt="avatar"
          className="w-14 h-14 rounded-full border-2 border-blue-500"
        />

        <div>

          <p className="font-semibold">
            {user?.displayName || "Administrator"}
          </p>

          <p className="text-xs text-slate-400">
            {user?.email}
          </p>

        </div>

      </div>

      {/* Menu */}
      <nav className="flex-1 py-6 overflow-y-auto">

        {menus.map((menu) => (

          <NavLink
            key={menu.path}
            to={menu.path}
            className={({ isActive }) =>
              `mx-4 mb-2 flex items-center gap-4 rounded-xl px-5 py-4 transition-all duration-300
              ${
                isActive
                  ? "bg-blue-600 shadow-lg"
                  : "hover:bg-slate-800 hover:translate-x-1"
              }`
            }
          >

            <span className="text-xl">
              {menu.icon}
            </span>

            <span className="font-medium">
              {menu.title}
            </span>

          </NavLink>

        ))}

      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-5 text-center">

        <p className="text-xs text-slate-500">
          Smart School AI v1.0
        </p>

      </div>

    </aside>
  );
}