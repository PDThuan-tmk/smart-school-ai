import { Routes, Route } from "react-router-dom";
import Drone from "./pages/Drone";
import Attendance from "./pages/Attendance";
import Login from "./pages/Login";

import Timetable from "./pages/Timetable";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Camera from "./pages/Camera";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import CameraAI from "./pages/CameraAI";

import MainLayout from "./layouts/MainLayout";
import PrivateRoute from "./components/PrivateRoute";

export default function App() {

  return (

    <Routes>

      <Route path="/drone" element={<Drone />} />

      <Route path="/attendance" element={<Attendance />} />

      <Route
        path="/"
        element={<Login />}
      />

      <Route
        element={
          <PrivateRoute>
            <MainLayout />
          </PrivateRoute>
        }
      >

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        <Route
          path="/students"
          element={<Students />}
        />

        <Route
          path="/teachers"
          element={<Teachers />}
        />

        <Route
          path="/camera"
          element={<CameraAI />}
        />

        <Route
          path="/reports"
          element={<Reports />}
        />

        <Route
          path="/settings"
          element={<Settings />}
        />

        <Route
          path="/timetable"
          element={<Timetable />}
      />

      </Route>

    </Routes>

  );

}