import { useEffect, useRef, useState } from "react";

import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

export default function DroneMap() {

    const viewerRef = useRef(null);

    const mapRef = useRef(null);

    const droneEntity = useRef(null);

    const [position, setPosition] = useState({

        lat: 15.120352,

        lng: 108.804112,

        alt: 20

    });

    useEffect(() => {

        Cesium.Ion.defaultAccessToken =
            "DÁN_ACCESS_TOKEN_CỦA_BẠN";

        const viewer = new Cesium.Viewer(mapRef.current, {

            animation: false,

            timeline: false,

            homeButton: true,

            sceneModePicker: true,

            navigationHelpButton: false,

            geocoder: true,

            baseLayerPicker: true,

            shouldAnimate: true

        });

        viewer.scene.globe.depthTestAgainstTerrain = true;

        viewerRef.current = viewer;

        droneEntity.current = viewer.entities.add({

            name: "Drone SSAI-01",

            position: Cesium.Cartesian3.fromDegrees(

                position.lng,

                position.lat,

                position.alt

            ),

            point: {

                pixelSize: 12,

                color: Cesium.Color.RED

            }

        });

        viewer.flyTo(droneEntity.current);

        return () => {

            viewer.destroy();

        };

    }, []);

    useEffect(() => {

        const timer = setInterval(() => {

            setPosition(prev => ({

                lat: prev.lat + 0.00002,

                lng: prev.lng + 0.00001,

                alt: prev.alt

            }));

        }, 1000);

        return () => clearInterval(timer);

    }, []);

    useEffect(() => {

        if (!droneEntity.current) return;

        droneEntity.current.position =

            Cesium.Cartesian3.fromDegrees(

                position.lng,

                position.lat,

                position.alt

            );

    }, [position]);

    return (

        <div className="bg-white rounded-2xl shadow p-5">

            <h2 className="text-2xl font-bold mb-4">

                🗺 Drone Map

            </h2>

            <div

                ref={mapRef}

                style={{

                    width: "100%",

                    height: "500px"

                }}

            />

            <div className="mt-5 grid grid-cols-3 gap-4">

                <div className="bg-slate-100 rounded-xl p-4">

                    <p className="text-gray-500">

                        Latitude

                    </p>

                    <h2 className="font-bold">

                        {position.lat.toFixed(6)}

                    </h2>

                </div>

                <div className="bg-slate-100 rounded-xl p-4">

                    <p className="text-gray-500">

                        Longitude

                    </p>

                    <h2 className="font-bold">

                        {position.lng.toFixed(6)}

                    </h2>

                </div>

                <div className="bg-slate-100 rounded-xl p-4">

                    <p className="text-gray-500">

                        Altitude

                    </p>

                    <h2 className="font-bold">

                        {position.alt} m

                    </h2>

                </div>

            </div>

        </div>

    );

}