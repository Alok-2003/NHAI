import React, { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Papa from "papaparse";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Set your Mapbox access token here
mapboxgl.accessToken =
  "pk.eyJ1IjoiYWxvazIwMDMiLCJhIjoiY201anNwZXRnMTAzbzJpc2ZtaHhudG1kNiJ9.3y0a5jiMDl42FUAN-Wy1Fg";

const Dashboard = () => {
  // State for CSV data
  const [allSurveyData, setAllSurveyData] = useState([]);
  const [visibleSurveyData, setVisibleSurveyData] = useState([]);
  const [roadCoordinates, setRoadCoordinates] = useState([]);
  const [currentChainage, setCurrentChainage] = useState(null);

  // Current survey info
  const [currentSurvey, setCurrentSurvey] = useState({
    id: "NH148N",
    user: "USR",
    spaces: 31,
    date: "NEL08032020",
    lat: 26.34,
    lng: 76.24,
    direction: "East",
  });

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);

  // Refs
  const mapContainer = useRef(null);
  const map = useRef(null);
  const videoRef = useRef(null);
  const animationFrameRef = useRef(null);
  const markerRef = useRef(null);
  const playbackIntervalRef = useRef(null);
  const currentPositionRef = useRef(0);

  // Load CSV data
  useEffect(() => {
    const fetchCSVData = async () => {
      try {
        const response = await fetch("/NHAI.csv");
        const csvText = await response.text();

        Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
          complete: (results) => {
            // Process the CSV data
            const processedData = results.data
              .filter(
                (row, idx) =>
                  row.length > 10 && row[0] && row[0].startsWith("NH")
              ) // skip header rows
              .map((row) => {
                // Index constants based on CSV layout
                const L2_START_LAT_IDX = 9; // L2 start latitude
                const L2_START_LNG_IDX = 10; // L2 start longitude
                const L2_END_LAT_IDX = 11; // L2 end latitude
                const L2_END_LNG_IDX = 12; // L2 end longitude
                const ROUGHNESS_L2_IDX = 35; // roughness value for L2 lane
                const RUTTING_L2_IDX = 49; // rut depth for L2 lane
                const CRACKING_L2_IDX = 57; // cracking area L2 (approx)
                const RAVELLING_L2_IDX = 66; // ravelling area L2 (approx)

                const startLat = parseFloat(row[L2_START_LAT_IDX]);
                const startLng = parseFloat(row[L2_START_LNG_IDX]);
                const endLat = parseFloat(row[L2_END_LAT_IDX]);
                const endLng = parseFloat(row[L2_END_LNG_IDX]);
                if (isNaN(startLat) || isNaN(startLng)) return null;

                return {
                  nhNumber: row[0],
                  startChainage: row[1],
                  endChainage: row[2],
                  length: row[3],
                  coordinates: {
                    L2: {
                      start: [startLng, startLat],
                      end:
                        !isNaN(endLat) && !isNaN(endLng)
                          ? [endLng, endLat]
                          : null,
                    },
                  },
                  roughness: {
                    L2: parseInt(row[ROUGHNESS_L2_IDX]) || 0,
                  },
                  rutting: {
                    L2: parseFloat(row[RUTTING_L2_IDX]) || 0,
                  },
                  cracking: {
                    L2: parseFloat(row[CRACKING_L2_IDX]) || 0,
                  },
                  ravelling: {
                    L2: parseFloat(row[RAVELLING_L2_IDX]) || 0,
                  },
                };
              })
              .filter(Boolean);

            console.log("Processed rows:", processedData.length);
            console.log("Processed data:", processedData);
            setAllSurveyData(processedData);
            setVisibleSurveyData(processedData.slice(0, 7));

            // Extract road coordinates for the map
            const coords = [];
            processedData.forEach((item) => {
              const { start, end } = item.coordinates.L2;
              if (start) coords.push(start);
              if (end) coords.push(end);
            });

            setRoadCoordinates(coords);

            // Initialize map with the road data
            initializeMap(coords);
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
          },
        });
      } catch (error) {
        console.error("Error fetching CSV:", error);
      }
    };

    fetchCSVData();
  }, []);

  // Initialize map with road data
  const initializeMap = (coordinates) => {
    if (map.current) return;

    // Find center of coordinates
    const centerLat =
      coordinates.reduce((sum, coord) => sum + coord[1], 0) /
      coordinates.length;
    const centerLng =
      coordinates.reduce((sum, coord) => sum + coord[0], 0) /
      coordinates.length;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [centerLng, centerLat],
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add road segments when map loads
    map.current.on("load", () => {
      // Add road source
      map.current.addSource("road", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        },
      });

      // Add road layer
      map.current.addLayer({
        id: "road-line",
        type: "line",
        source: "road",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#22c55e",
          "line-width": 8,
          "line-offset": 0,
        },
      });

      // Add a marker for current position
      if (coordinates.length > 0) {
        markerRef.current = new mapboxgl.Marker({ color: "#3b82f6" })
          .setLngLat(coordinates[0])
          .addTo(map.current);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  };

  // Video initialization and synchronization
  useEffect(() => {
    if (!videoRef.current || allSurveyData.length === 0) return;

    // Set up video event listeners
    const videoElement = videoRef.current;

    const handleLoadedMetadata = () => {
      setVideoDuration(videoElement.duration);
    };

    const handleTimeUpdate = () => {
      // Update progress bar
      const currentProgress =
        (videoElement.currentTime / videoElement.duration) * 100;
      setProgress(currentProgress);
      currentPositionRef.current = currentProgress;

      // Calculate which chainage we should be showing based on video progress
      const dataIndex = Math.floor(
        (currentProgress / 100) * allSurveyData.length
      );
      const safeIndex = Math.min(dataIndex, allSurveyData.length - 1);

      // Update current chainage
      const currentData = allSurveyData[safeIndex];
      setCurrentChainage(currentData.startChainage);

      // Update visible data (show 7 items centered around current position)
      const startIdx = Math.max(0, safeIndex - 3);
      const endIdx = Math.min(allSurveyData.length, startIdx + 7);
      setVisibleSurveyData(allSurveyData.slice(startIdx, endIdx));

      // Update map marker position (use coordIndex proportional to coordinates array)
      const coordIndex = Math.floor(
        (videoElement.currentTime / videoElement.duration) *
          (roadCoordinates.length - 1)
      );
      if (markerRef.current && roadCoordinates[coordIndex]) {
        markerRef.current.setLngLat(roadCoordinates[coordIndex]);
        // Center map on current position
        if (map.current) {
          map.current.easeTo({
            center: roadCoordinates[coordIndex],
            duration: 500,
          });
        }
      }
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [videoRef.current, allSurveyData, roadCoordinates]);

  // Generate chart data based on visible survey data
  const chartData = {
    labels: visibleSurveyData.map((item) => item.startChainage),
    datasets: [
      {
        label: "Mean Condition Index (L2)",
        data: visibleSurveyData.map((item) => {
          const rough = item.roughness.L2 || 0;
          const rut = item.rutting.L2 || 0;
          const crack = item.cracking.L2 || 0;
          const rav = item.ravelling.L2 || 0;
          return (rough + rut + crack + rav) / 4;
        }),
        borderColor: "#38bdf8",
        borderWidth: 2,
        backgroundColor: "rgba(56, 189, 248, 0.4)",
        tension: 0.4,
        fill: true,
      },
    ],
  };
  console.log("Chart data:", chartData);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: false,
        min: 0,
        max: 10,
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.8)",
        },
      },
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
        },
        ticks: {
          color: "rgba(255, 255, 255, 0.8)",
        },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: "rgba(255, 255, 255, 0.8)",
        },
      },
    },
  };

  // Video playback controls
  const togglePlay = () => {
    if (!videoRef.current) return;

    setIsPlaying(!isPlaying);
    if (isPlaying) {
      videoRef.current.pause();
      cancelAnimationFrame(animationFrameRef.current);
    } else {
      videoRef.current.play();
    }
  };

  const handleProgressChange = (e) => {
    if (!videoRef.current) return;

    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);

    // Update video time
    videoRef.current.currentTime =
      (videoRef.current.duration * newProgress) / 100;

    // Update current position for synchronization
    currentPositionRef.current = newProgress;
  };

  // Helper function to determine row background color based on roughness
  const getRowClass = (roughness) => {
    if (roughness < 1800) return "bg-green-500 bg-opacity-50";
    if (roughness < 2500) return "bg-yellow-500 bg-opacity-50";
    return "bg-red-500 bg-opacity-50";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          NSV Survey Dashboard -{" "}
          {currentChainage ? `Chainage: ${currentChainage}` : "Loading..."}
        </h1>
        <div className="relative">
          <input
            type="text"
            placeholder="Search Survey ID / Date"
            className="bg-gray-700 px-4 py-2 rounded-lg text-white w-64"
          />
          <svg
            className="w-5 h-5 absolute right-3 top-2.5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Left Column */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          {/* Map */}
          <div ref={mapContainer} className="h-96 w-full"></div>
        </div>

        {/* Right Column */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          {/* Survey Info */}

          {/* Video Player */}
          <div className="relative">
            <div className="bg-black h-96 flex items-center justify-center">
              <video
                ref={videoRef}
                src="/L2.mp4"
                className="h-full w-full object-contain"
                preload="metadata"
                onError={(e) => {
                  console.error("Video error:", e);
                }}
              />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-2 flex items-center">
              <button onClick={togglePlay} className="text-white mr-2">
                {isPlaying ? (
                  <span className="w-6 h-6 flex items-center justify-center">
                    ⏸
                  </span>
                ) : (
                  <span className="w-6 h-6 flex items-center justify-center">
                    ▶️
                  </span>
                )}
              </button>
              <button
                className="text-white mr-2"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = videoRef.current.duration;
                  }
                }}
              >
                <span className="w-6 h-6 flex items-center justify-center">
                  ⏭
                </span>
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={progress}
                onChange={handleProgressChange}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex -gap-2">
        {/* Data Table */}
        <div className="p-4 w-2/3">
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Chainage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Lane
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Roughness (mm/km)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Rutting (mm)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Cracking (% area)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ravelling (% area)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {visibleSurveyData.map((item, index) => (
                  <tr
                    key={index}
                    className={
                      currentChainage === item.startChainage
                        ? "bg-blue-900 bg-opacity-30"
                        : ""
                    }
                  >
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-300">
                      {item.startChainage}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-300">
                      L2
                    </td>
                    <td
                      className={`px-6 py-2 whitespace-nowrap text-sm text-white ${getRowClass(
                        item.roughness.L2
                      )}`}
                    >
                      {item.roughness.L2}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-300">
                      {item.rutting.L2.toFixed(1)}
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-300">
                      {typeof item.cracking.L2 === "number"
                        ? item.cracking.L2.toFixed(1)
                        : "0.0"}
                      %
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-300">
                      {typeof item.ravelling.L2 === "number"
                        ? item.ravelling.L2.toFixed(1)
                        : "0.0"}
                      %
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Roughness Chart */}
        <div className="p-4 w-1/3 h-full">
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg p-4">
            <h2 className="text-xl font-bold mb-4">
              Roughness <span className="text-sm">(mm/km)</span>
            </h2>
            <div className="h-56 w-full">
              <Line
                key={visibleSurveyData[0]?.startChainage || "chart"}
                data={chartData}
                options={chartOptions}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
