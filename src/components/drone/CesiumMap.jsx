import { useEffect, useRef } from "react";
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";

export default function CesiumMap() {
  const mapRef = useRef(null);

  useEffect(() => {
    const viewer = new Cesium.Viewer(mapRef.current, {
      animation: false,
      timeline: false,
      homeButton: true,
      sceneModePicker: true,
      navigationHelpButton: false,
      geocoder: false,
      baseLayerPicker: false,
      shouldAnimate: true,
      imageryProvider: new Cesium.UrlTemplateImageryProvider({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      }),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    });

    viewer.scene.globe.depthTestAgainstTerrain = true;

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(108.804112, 15.120352, 2500),
    });

    return () => {
      viewer.destroy();
    };
  }, []);

  return (
    <div
      ref={mapRef}
      style={{
        width: "100%",
        height: "500px",
      }}
    />
  );
}