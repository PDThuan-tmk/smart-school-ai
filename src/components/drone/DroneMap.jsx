import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import MapUpdater from "./MapUpdater";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function DroneMap() {

  const [position, setPosition] = useState([
    15.120352,
    108.804112
  ]);

  useEffect(() => {

    const timer = setInterval(() => {

      setPosition(([lat, lng]) => [
        lat + 0.00002,
        lng + 0.00001
      ]);

    }, 1000);

    return () => clearInterval(timer);

  }, []);

  return (

    <div className="bg-white rounded-2xl shadow p-5">

      <h2 className="text-2xl font-bold mb-4">
        🗺 Drone Map
      </h2>

      <MapContainer
        center={position}
        zoom={18}
        style={{
          height: "500px",
          width: "100%"
        }}
      >

        <MapUpdater position={position} />

        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={position}>
          <Popup>
            🚁 Drone SSAI-01
          </Popup>
        </Marker>

      </MapContainer>

      <div className="mt-5 grid grid-cols-3 gap-4">

        <div className="bg-slate-100 rounded-xl p-4">

          <p className="text-gray-500">
            Latitude
          </p>

          <h2 className="font-bold">
            {position[0].toFixed(6)}
          </h2>

        </div>

        <div className="bg-slate-100 rounded-xl p-4">

          <p className="text-gray-500">
            Longitude
          </p>

          <h2 className="font-bold">
            {position[1].toFixed(6)}
          </h2>

        </div>

        <div className="bg-slate-100 rounded-xl p-4">

          <p className="text-gray-500">
            Altitude
          </p>

          <h2 className="font-bold">
            20 m
          </h2>

        </div>

      </div>

    </div>

  );

}