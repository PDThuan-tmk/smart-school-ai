import { useMap } from "react-leaflet";
import { useEffect } from "react";

export default function MapUpdater({ position }) {

  const map = useMap();

  useEffect(() => {

    map.setView(position);

  }, [position, map]);

  return null;

}