import React, { useEffect, useRef, useState } from "react";
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// Charts
import { Chart as ChartJS, ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import { Link } from "react-router-dom";
ChartJS.register(ArcElement, Tooltip, Legend, BarElement, CategoryScale, LinearScale);

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoiYWxvazIwMDMiLCJhIjoiY201anNwZXRnMTAzbzJpc2ZtaHhudG1kNiJ9.3y0a5jiMDl42FUAN-Wy1Fg'; // Replace with your actual token

const RoadMap = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalSegments, setTotalSegments] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ good: 0, warning: 0, exceed: 0, maintenance: 0 });
  const [barData, setBarData] = useState(null);
  const [pieData, setPieData] = useState(null);
  const [overallAvg, setOverallAvg] = useState(0);

  // Initialize map
  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: [76.2, 26.3], // [lng, lat]
      zoom: 12
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.ScaleControl());

    map.current.on('load', () => {
      loadNHAIData();
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // Helper function to draw lines on the map
  const drawLine = (coordinates, color, dashArray = null) => {
    if (!map.current) return null;

    const lineId = `line-${Math.random().toString(36).substr(2, 9)}`;
    
    map.current.addLayer({
      id: lineId,
      type: 'line',
      source: {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        }
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': color,
        'line-width': 3,
        'line-dasharray': dashArray || [1, 0]
      }
    });

    return lineId;
  };

  // Parse CSV data (keep your existing parseCSV function)
  const parseCSV = (text) => {
    return text.split("\n")
      .filter(line => line.trim() !== "")
      .map(line => line.split(",").map(cell => cell.trim()));
  };

  // Get lane coordinates (keep your existing getLaneCoordinates function)
  const getLaneCoordinates = (row, laneStartCol) => {
    const startLat = parseFloat(row[laneStartCol]);
    const startLng = parseFloat(row[laneStartCol + 1]);
    const endLat = parseFloat(row[laneStartCol + 2]);
    const endLng = parseFloat(row[laneStartCol + 3]);
    if (isNaN(startLat) || isNaN(startLng) || isNaN(endLat) || isNaN(endLng)) return null;
    
    return { startLat, startLng, endLat, endLng };
  };

  // Get road segment info (keep your existing getRoadSegmentInfo function)
  const getRoadSegmentInfo = (row) => {
    return {
      nhNumber: row[0],
      startChainage: row[1],
      endChainage: row[2],
      length: row[3],
      structureDetails: row[4],
      roughnessLimit: parseFloat(row[33]),
      l1Roughness: parseFloat(row[34]),
      l2Roughness: parseFloat(row[35]),
      l3Roughness: parseFloat(row[36]),
      l4Roughness: parseFloat(row[37]),
      r1Roughness: parseFloat(row[38]),
      r2Roughness: parseFloat(row[39]),
      r3Roughness: parseFloat(row[40]),
      r4Roughness: parseFloat(row[41]),
      remark: row[42] || ""
    };
  };

  const loadNHAIData = () => {
    setLoading(true);
    setError(null);
    
    fetch('/NHAI.csv')
      .then(response => response.text())
      .then(data => {
        const rows = parseCSV(data);
        const laneLabels = ["L1","L2","L3","L4","R1","R2","R3","R4"];
        const laneSums = Array(8).fill(0);
        const laneCounts = Array(8).fill(0);
        let good = 0, warning = 0, exceed = 0, maintenance = 0;
        // Collect features per status for efficient rendering
        const statusFeatures = { good: [], warning: [], exceed: [], maintenance: [] };
        
        // Skip header rows
        const dataRows = rows.slice(2);
        
        dataRows.forEach((row, idx) => {
          if (row.length < 40) {
            console.warn(`⚠ Skipping row ${idx}: insufficient data`, row);
            return;
          }
          
          const roadInfo = getRoadSegmentInfo(row);
          
          // Column indices for different lanes
          const laneColumns = {
            L1: { start: 5 },   // L1 lane start coords
            L2: { start: 9 },   // L2 lane start coords
            L3: { start: 13 },  // L3 lane start coords
            L4: { start: 17 },  // L4 lane start coords
            R1: { start: 21 },  // R1 lane start coords
            R2: { start: 25 },  // R2 lane start coords
            R3: { start: 29 },  // R3 lane start coords
            R4: { start: 33 }   // R4 lane start coords
          };
          
          // Plot each lane
          Object.entries(laneColumns).forEach(([laneName, { start }]) => {
            const coords = getLaneCoordinates(row, start);
            if (!coords) return;
            
            const roughnessLimit = roadInfo.roughnessLimit;
            const roughnessValue = roadInfo[`${laneName.toLowerCase()}Roughness`];
            
            // detect if maintenance marker in remark or coordinate cell
            const coordCell = row[start]?.toLowerCase?.() || "";
            const isMaintenanceCoord = coordCell.includes('under maintenance');
            const isMaintenance = roadInfo.remark.toLowerCase().includes('under maintenance') || isMaintenanceCoord;

            // accumulate for averages
            const laneIndex = laneLabels.indexOf(laneName);
            if (laneIndex !== -1 && !isNaN(roughnessValue)) {
              laneSums[laneIndex] += roughnessValue;
              laneCounts[laneIndex] += 1;
            }
            
            let color = 'green'; // Good condition
            let dashArray = null;
            
            if (isMaintenance) {
              color = 'yellow';
              dashArray = [4, 4];
              maintenance += 1;
            } else if (roughnessValue > roughnessLimit) {
              color = 'red'; // Exceeds limit
              dashArray = [5, 10];
              exceed += 1;
            } else if (roughnessValue > roughnessLimit * 0.8) {
              color = 'orange'; // Approaching limit
              warning += 1;
            } else {
              good += 1;
            }
            
            // Draw line using Mapbox
            const coordinates = [
              [coords.startLng, coords.startLat],
              [coords.endLng, coords.endLat]
            ];
            
            // Instead of drawing immediately, accumulate the feature for batch rendering later
            statusFeatures[(isMaintenance ? 'maintenance' : roughnessValue > roughnessLimit ? 'exceed' : roughnessValue > roughnessLimit * 0.8 ? 'warning' : 'good')].push({
              type: 'Feature',
              geometry: { type: 'LineString', coordinates },
              properties: {
                nhNumber: roadInfo.nhNumber || '',
                startChainage: roadInfo.startChainage,
                endChainage: roadInfo.endChainage,
                lane: laneName,
                roughnessValue,
                roughnessLimit,
                status: isMaintenance ? 'Under Maintenance' : roughnessValue > roughnessLimit ? 'Exceeds Limit' : roughnessValue > roughnessLimit * 0.8 ? 'Warning' : 'Good'
              }
            });
            const lineId = null; // placeholder to keep existing popup condition false
            
            // Add popup
            if (map.current && lineId) {
              const popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(`
                  <b>NH Number:</b> ${roadInfo.nhNumber || 'N/A'}<br>
                  <b>Chainage:</b> ${roadInfo.startChainage} - ${roadInfo.endChainage}<br>
                  <b>Lane:</b> ${laneName}<br>
                  <b>Roughness:</b> ${roughnessValue} mm/km (Limit: ${roughnessLimit} mm/km)<br>
                  <b>Status:</b> ${isMaintenance ? 'Under Maintenance' : 
                    roughnessValue > roughnessLimit ? 'Exceeds Limit' : 
                    roughnessValue > roughnessLimit * 0.8 ? 'Warning' : 'Good'}
                `);

              // Add click event to the line
              map.current.on('mouseenter', lineId, () => {
                map.current.getCanvas().style.cursor = 'pointer';
                popup.addTo(map.current);
              });

              map.current.on('mouseleave', lineId, () => {
                map.current.getCanvas().style.cursor = '';
                popup.remove();
              });
            }
          });
        });

        // Add aggregated GeoJSON sources & layers for performance
        const addStatusLayer = (key, features, color, dashArray) => {
          if (!map.current || features.length === 0) return;
          const sourceId = key + '-source';
          if (map.current.getSource(sourceId)) {
            map.current.getSource(sourceId).setData({ type: 'FeatureCollection', features });
          } else {
            map.current.addSource(sourceId, { type: 'geojson', data: { type: 'FeatureCollection', features } });
            map.current.addLayer({
              id: key + '-layer',
              type: 'line',
              source: sourceId,
              paint: {
                'line-color': color,
                'line-width': 3,
                'line-dasharray': dashArray
              }
            });
            // Popup interaction
            // use global popupRef instead of per-layer popup instance
            map.current.on('mouseenter', key + '-layer', (e) => {
              // Remove any existing popup first
              if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
              }
              map.current.getCanvas().style.cursor = 'pointer';
              const f = e.features?.[0];
              if (!f) return;
              const p = f.properties;
              popupRef.current = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: false })
                .setLngLat(e.lngLat)
                .setHTML(`
                  <b>NH Number:</b> ${p.nhNumber}<br>
                  <b>Chainage:</b> ${p.startChainage} - ${p.endChainage}<br>
                  <b>Lane:</b> ${p.lane}<br>
                  <b>Roughness:</b> ${p.roughnessValue} mm/km (Limit: ${p.roughnessLimit} mm/km)<br>
                  <b>Status:</b> ${p.status}
                `)
                .addTo(map.current);
            });
            map.current.on('mouseleave', key + '-layer', () => {
              if (popupRef.current) {
                popupRef.current.remove();
                popupRef.current = null;
              }
              map.current.getCanvas().style.cursor = '';
            });
          }
        };

        addStatusLayer('good', statusFeatures.good, '#22c55e', [1, 0]);
        addStatusLayer('warning', statusFeatures.warning, '#f97316', [1, 0]);
        addStatusLayer('exceed', statusFeatures.exceed, '#ef4444', [5, 10]);
        addStatusLayer('maintenance', statusFeatures.maintenance, '#eab308', [4, 4]);

        // compute averages and analytics
        const avgValues = laneSums.map((sum, idx) => laneCounts[idx] ? +(sum / laneCounts[idx]).toFixed(2) : 0);

        setBarData({
          labels: laneLabels,
          datasets: [{
            label: 'Avg Roughness (mm/km)',
            data: avgValues,
            backgroundColor: '#3b82f6'
          }]
        });

        setPieData({
          labels: ['Good', 'Near Limit', 'Exceeds Limit', 'Under Maintenance'],
          datasets: [{
            data: [good, warning, exceed, maintenance],
            backgroundColor: ['#22c55e', '#f97316', '#ef4444', '#eab308']
          }]
        });

        setTotalSegments(dataRows.length);
        setStatusCounts({ good, warning, exceed, maintenance });
        const overall = avgValues.length ? (avgValues.reduce((a,b)=>a+Number(b),0) / avgValues.length).toFixed(2) : 0;
        setOverallAvg(overall);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading NHAI CSV file:', error);
        setError('Failed to load road data');
        setLoading(false);
      });
  };

  // ... rest of your component JSX remains the same ...
  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-sky-600 to-blue-500 text-white p-4 shadow-md">
        <div className="mx-10 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-wide">
            NHAI Road Condition Dashboard
          </h1>
          <Link to="/dashboard">
            <button className="bg-blue-700 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              View Dashboard
            </button>
          </Link>
        </div>
      </header>

      <div className="flex mx-10 m-0 h-full p-4 gap-4">
        {/* Map Container */}
        <div className="w-[35%] flex flex-col justify-between h-full">
          <div
            ref={mapContainer}
            id="map"
            className="w-full h-full rounded-lg shadow-lg overflow-hidden"
          />
          {/* Legend */}
          <div className="bg-white p-4 rounded-lg shadow-lg mt-4">
            <h2 className="text-lg font-semibold mb-3 text-gray-700">Legend</h2>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center">
                <span className="inline-block w-8 h-2 bg-green-500 mr-2 rounded-sm"></span>
                <span className="text-gray-700">Good condition</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-8 h-2 bg-orange-500 mr-2 rounded-sm"></span>
                <span className="text-gray-700">Approaching roughness limit</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-8 h-2 bg-red-500 mr-2 rounded-sm border-t border-dashed"></span>
                <span className="text-gray-700">Exceeds roughness limit</span>
              </div>
              <div className="flex items-center">
                <span className="inline-block w-8 h-2 bg-yellow-400 mr-2 rounded-sm"></span>
                <span className="text-gray-700">Under maintenance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Panel (65% width) */}
        <div className="w-[65%] grid grid-cols-2 gap-4 ">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Total Segments</h3>
              <p className="text-2xl font-bold text-gray-800">{totalSegments}</p>
              <p className="text-xs text-gray-500 mt-1">Total road segments analyzed</p>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Average Roughness</h3>
              <p className="text-2xl font-bold text-gray-800">
                {overallAvg} mm/km
                <span className={`ml-2 text-sm ${overallAvg > 3 ? 'text-red-500' : overallAvg > 2 ? 'text-amber-500' : 'text-green-500'}`}>
                  {overallAvg > 3 ? '⚠️ Poor' : overallAvg > 2 ? '⚠️ Fair' : '✓ Good'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Lower is better (0-5 scale)</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Condition Summary</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  <span className="text-sm">Good: {statusCounts.good}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
                  <span className="text-sm">Warning: {statusCounts.warning}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  <span className="text-sm">Exceeded: {statusCounts.exceed}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></span>
                  <span className="text-sm">Maintenance: {statusCounts.maintenance}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-lg">
              <h3 className="text-sm font-medium text-gray-500 uppercase">Status</h3>
              <p className="text-2xl font-bold text-gray-800">
                {statusCounts.maintenance > 0 ? 'Maintenance Active' : 'All Clear'}
              </p>
              <p className="text-xs text-gray-500 mt-1">Last updated: {new Date().toLocaleString()}</p>
            </div>
          </div>

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 gap-4">
            {barData && (
              <div className="bg-white h-full p-4 rounded-lg shadow-lg">
                <h2 className="text-lg font-semibold mb-3 text-gray-700">Average Roughness per Lane</h2>
                <Bar data={barData} />
              </div>
            )}
            {pieData && (
              <div className="bg-white p-4 h-full rounded-lg shadow-lg">
                <h2 className="text-lg font-semibold mb-3 text-gray-700">Lane Condition Distribution</h2>
                <div className="w-full h-72 flex justify-center items-center mb-10">
                  <Doughnut options={{ responsive: true }} data={pieData} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadMap;