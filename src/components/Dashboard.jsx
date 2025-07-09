import React, { useState, useEffect, useRef } from "react";
import ReportDialog from './ReportDialog';
import ReportButton from './ReportButton';
import { generateReport } from './ReportGenerator';
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
import annotationPlugin from 'chartjs-plugin-annotation';
ChartJS.register(annotationPlugin);

// Register annotation plugin
import mapboxgl from "mapbox-gl";
import Hls from "hls.js";
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
  // Dialog state for report
  const [reportOpen, setReportOpen] = useState(false);
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
  // Attach HLS stream when component mounts
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;

    const playlistUrl = "/L2.m3u8"; // generated HLS playlist placed in public folder

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(playlistUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.ERROR, (evt, data) => {
        console.error("HLS error", data);
      });
      return () => hls.destroy();
    } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS native HLS support
      videoEl.src = playlistUrl;
    } else {
      console.error("HLS not supported in this browser");
    }
  }, []);
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
                const ROUGHNESS_L2_IDX = 40; // roughness value for L2 lane
                const RUTTING_L2_IDX = 49; // rut depth for L2 lane
                const CRACKING_L2_IDX = 58; // cracking area L2 (corrected)
                const RAVELLING_L2_IDX = 67; // ravelling area L2 (corrected)
                console.log("Row:", row);

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

            // Make all L2 segments globally available for map condition markers
            window.allL2Segments = processedData;

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
      style: "mapbox://styles/mapbox/satellite-v9",
      center: [centerLng, centerLat],
      zoom: 14,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add road segments when map loads
    map.current.on("load", () => {
      // Add road source (L2 lane as detailed track)
      map.current.addSource("road-l2", {
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

      // Add detailed L2 lane line (highlighted)
      map.current.addLayer({
        id: "road-l2-line",
        type: "line",
        source: "road-l2",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#ffec3d", // Highlighted yellow
          "line-width": 10,
          "line-opacity": 0.85,
        },
      });

      // Draw each L2 segment as a colored line by condition
      const roughnessLimit = 2400;
      if (Array.isArray(window.allL2Segments)) {
        window.allL2Segments.forEach((seg, idx) => {
          const { start, end } = seg.coordinates.L2;
          if (!start || !end) return;
          const roughness = seg.roughness?.L2 || 0;
          let color = "#22c55e"; // green
          if (seg.status === 'maintenance') {
            color = "#fde047"; // yellow
          } else if (roughness >= roughnessLimit) {
            color = "#ef4444"; // red
          } else if (roughness >= 0.8 * roughnessLimit) {
            color = "#f59e42"; // orange
          }
          map.current.addLayer({
            id: `l2-segment-${idx}`,
            type: "line",
            source: {
              type: "geojson",
              data: {
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [start, end],
                },
              },
            },
            layout: {
              "line-join": "round",
              "line-cap": "round",
            },
            paint: {
              "line-color": color,
              "line-width": 8,
              "line-opacity": 0.85,
            },
          });
        });
      }

      // Add a marker for current position (on top)
      if (coordinates.length > 0) {
        markerRef.current = new mapboxgl.Marker({ color: "#6366f1", scale: 1.2 })
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
        label: "Roughness (scaled: /1000)",
        data: visibleSurveyData.map((item) => (item.roughness.L2 || 0) / 1000),
        borderColor: "#6366f1",
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        borderWidth: 2,
        tension: 0.4,
        fill: false,
      },
      {
        label: "Rutting (mm)",
        data: visibleSurveyData.map((item) => item.rutting.L2 || 0),
        borderColor: "#f59e42",
        backgroundColor: "rgba(245, 158, 66, 0.2)",
        borderWidth: 2,
        tension: 0.4,
        fill: false,
      },
      {
        label: "Cracking (%)(x10 for scale)",
        data: visibleSurveyData.map((item) => (item.cracking.L2 || 0) * 10),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.2)",
        borderWidth: 2,
        tension: 0.4,
        fill: false,
      },
      {
        label: "Ravelling (%) (x10 for scale)",
        data: visibleSurveyData.map((item) => (item.ravelling.L2 || 0) * 10),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.2)",
        borderWidth: 2,
        tension: 0.4,
        fill: false,
      },
    ],
  };

  const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      max: 6,
      title: {
        display: true,
        text: "Common Scale (Rutting mm, Cracking %, Ravelling % x5)",
      },
    },
  },
  plugins: {
    legend: {
      labels: {
        color: "rgba(255, 255, 255, 0.8)",
      },
    },
    annotation: {
      annotations: {
        currentValueLine: currentChainage !== null ? {
          type: 'line',
          xMin: currentChainage,
          xMax: currentChainage,
          borderColor: 'white',
          borderWidth: 2,
          label: {
            content: 'Current',
            enabled: true,
            position: 'start',
            color: 'white',
          },
        } : undefined,
        roughnessLimit: {
          type: 'line',
          yMin: 2.4,
          yMax: 2.4,
          borderColor: '#6366f1',
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            content: 'Roughness Limit',
            enabled: true,
            position: 'end',
            color: 'red',
          },
        },
        ruttingLimit: {
          type: 'line',
          yMin: 5,
          yMax: 5,
          borderColor: 'orange',
          borderWidth: 2,
          borderDash: [6, 6],
          label: {
            content: 'Rutting Limit',
            enabled: true,
            position: 'end',
            color: 'orange',
          },
        },
        crackingLimit: {
          type: 'line',
          yMin: 1,
          yMax: 1,
          borderColor: 'red',
          borderWidth: 2,
          borderDash: [3, 3],
          label: {
            content: 'Cracking Limit',
            enabled: true,
            position: 'end',
            color: 'red',
          },
        },
        ravellingLimit: {
          type: 'line',
          yMin: 1,
          yMax: 1,
          borderColor: 'green',
          borderWidth: 2,
          borderDash: [5, 5],
          label: {
            content: 'Ravelling Limit',
            enabled: true,
            position: 'end',
            color: 'green',
          },
        },
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
    if (roughness < 2400) return "bg-green-500 bg-opacity-50";
    return "bg-red-500 bg-opacity-50";
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          NSV Survey Dashboard -{" "}
          {currentChainage ? `Chainage: ${currentChainage}` : "Loading..."}
        </h1>
        <div className="flex justify-end ">
                <ReportButton onClick={() => setReportOpen(true)} />
              </div>
              <ReportDialog
                open={reportOpen}
                onClose={() => setReportOpen(false)}
                report={<div dangerouslySetInnerHTML={{ __html: generateReport(allSurveyData) }} />}
              />
      </header>
      <div className="flex justify-between">
      <div className="w-full py-4 space-y-4" >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4  px-4">
          {/* Left Column */}
          <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
            {/* Map */}
            <div className="relative h-96 w-full ">
              <div ref={mapContainer} className="absolute inset-0 h-full w-full z-0"></div>
              {/* Floating color legend */}
              <div className="absolute bottom-3 right-3 z-10 bg-white/90 text-black rounded shadow-lg px-4 py-2 text-xs flex flex-col space-y-1 border border-gray-200">
                <div className="flex items-center gap-2"><span className="inline-block w-5 h-2 rounded bg-green-500"></span> Good</div>
                <div className="flex items-center gap-2"><span className="inline-block w-5 h-2 rounded bg-orange-400"></span> Approaching Limit</div>
                <div className="flex items-center gap-2"><span className="inline-block w-5 h-2 rounded bg-red-500"></span> Exceeds Limit</div>
                <div className="flex items-center gap-2"><span className="inline-block w-5 h-2 rounded bg-yellow-300"></span> Under Maintenance</div>
              </div>
            </div>
          </div>
          {/* Roughness Chart */}
          <div className="p- w- h-full">
            <div className="container mx-auto">
              {/* Top bar for report button */}
              
              <div className="bg-gray-800 rounded-lg overflow-hidden shadow-lg p-4">
                
                <div className="h-88 w-full">
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
        <div className="">
          {/* Data Table */}
          <div className="px-4 w-">
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
                      <td
                        className={`px-6 py-2 whitespace-nowrap text-sm ${
                          item.rutting.L2 >= 5
                            ? "bg-red-600 text-white"
                            : "text-gray-300"
                        }`}
                      >
                        {item.rutting.L2.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-2 whitespace-nowrap text-sm ${
                          item.cracking.L2 >= 5
                            ? "bg-red-600 text-white"
                            : "text-gray-300"
                        }`}
                      >
                        {typeof item.cracking.L2 === "number"
                          ? item.cracking.L2.toFixed(3)
                          : "0.000"}
                        %
                      </td>
                      <td
                        className={`px-6 py-2 whitespace-nowrap text-sm ${
                          item.ravelling.L2 >= 1
                            ? "bg-red-600 text-white"
                            : "text-gray-300"
                        }`}
                      >
                        {typeof item.ravelling.L2 === "number"
                          ? item.ravelling.L2.toFixed(3)
                          : "0.000"}
                        %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="h-[120%] w-[62%] overflow-hidden shadow-lg pt-4 pr-4 pb-0">
        {/* Video Player */}
        <div className="relative h-[120%] ">
          <div className="bg-black h-full w-full flex items-center justify-center">
            <video
              ref={videoRef}
              /* src is set dynamically by HLS script */
              className="h-[120%] w-full object-contain"
              // controls
              //  autoPlay
              muted
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

    </div>
  );
};

export default Dashboard;
