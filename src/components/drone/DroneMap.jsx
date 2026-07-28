import { useState } from "react";

export default function DroneMap() {

    const [drone, setDrone] = useState({

        x: 520,

        y: 310

    });

    return (

        <div className="bg-white rounded-2xl shadow p-5">

            <h2 className="text-2xl font-bold mb-4">

                🗺 Drone Map

            </h2>

            <div

                style={{

                    position: "relative",

                    width: "100%",

                    maxWidth: "900px"

                }}

            >

                <img

                    src="/images/school.jpg"

                    style={{

                        width: "100%",

                        display: "block"

                    }}

                />

                <div

                    style={{

                        position: "absolute",

                        left: drone.x,

                        top: drone.y,

                        width: 18,

                        height: 18,

                        borderRadius: "50%",

                        background: "red",

                        border: "3px solid white"

                    }}

                />

            </div>

        </div>

    );

}