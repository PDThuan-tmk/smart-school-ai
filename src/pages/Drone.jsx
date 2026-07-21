import DroneStatus from "../components/drone/DroneStatus";
import DroneMap from "../components/drone/DroneMap";
import DroneCamera from "../components/drone/DroneCamera";
import DroneAI from "../components/drone/DroneAI";
import DroneControl from "../components/drone/DroneControl";

export default function Drone() {

    return (

        <div>

            <h1 className="text-4xl font-bold mb-8">

                🚁 Drone AI

            </h1>

            <div className="grid grid-cols-3 gap-6">

                <DroneStatus />

                <div className="col-span-2">

                    <DroneMap />

                </div>

            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">

                <DroneCamera />

                <DroneAI />

            </div>

            <div className="mt-6">

                <DroneControl />

            </div>

        </div>

    );

}