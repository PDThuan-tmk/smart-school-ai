import { useEffect, useRef } from "react";

import * as Cesium from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";

export default function CesiumMap() {

    const mapRef = useRef(null);

    useEffect(() => {

        Cesium.Ion.defaultAccessToken =
            eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzN2YwODlkNS1jZjA5LTQ0ZjItOTczOC04ZjlhMWU5Zjc5ZTQiLCJpZCI6NDYwOTUzLCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODUxNDU1NDh9.d4FLu45azXAT9iDlQcrZTk85hA81c2053H7Hh6qdZr8;

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

        return () => {

            viewer.destroy();

        };

    }, []);

    return (

        <div

            ref={mapRef}

            style={{

                width: "100%",

                height: "100vh"

            }}

        />

    );

}