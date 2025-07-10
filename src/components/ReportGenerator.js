// Utility to generate a report from CSV survey data
export function generateReport(allSurveyData) {
  if (!allSurveyData || allSurveyData.length === 0) return 'No data available.';

  // Compute summary statistics
  const totalSegments = allSurveyData.length;
  const avgRoughness = (
    allSurveyData.reduce((sum, d) => sum + (d.roughness?.L2 || 0), 0) / totalSegments
  ).toFixed(2);
  const avgRutting = (
    allSurveyData.reduce((sum, d) => sum + (d.rutting?.L2 || 0), 0) / totalSegments
  ).toFixed(2);
  const avgCracking = (
    allSurveyData.reduce((sum, d) => sum + (d.cracking?.L2 || 0), 0) / totalSegments
  ).toFixed(2);
  const avgRavelling = (
    allSurveyData.reduce((sum, d) => sum + (d.ravelling?.L2 || 0), 0) / totalSegments
  ).toFixed(2);

  // Count segments exceeding limits
  const roughnessLimit = 2400;
  const ruttingLimit = 5;
  const crackingLimit = 1;
  const ravellingLimit = 1;
  const exceedingRoughness = allSurveyData.filter(d => (d.roughness?.L2 || 0) > roughnessLimit).length;
  const exceedingRutting = allSurveyData.filter(d => (d.rutting?.L2 || 0) > ruttingLimit).length;
  const exceedingCracking = allSurveyData.filter(d => (d.cracking?.L2 || 0) > crackingLimit).length;
  const exceedingRavelling = allSurveyData.filter(d => (d.ravelling?.L2 || 0) > ravellingLimit).length;

  // Calculate percentages for pie charts
  const roughnessPercentage = ((exceedingRoughness / totalSegments) * 100).toFixed(1);
  const ruttingPercentage = ((exceedingRutting / totalSegments) * 100).toFixed(1);
  const crackingPercentage = ((exceedingCracking / totalSegments) * 100).toFixed(1);
  const ravellingPercentage = ((exceedingRavelling / totalSegments) * 100).toFixed(1);

  // Prepare data for distribution charts
  const roughnessRanges = {
    '< 1000': 0,
    '1000-1500': 0,
    '1500-2000': 0,
    '2000-2400': 0,
    '> 2400': 0
  };

  const ruttingRanges = {
    '< 2': 0,
    '2-3': 0,
    '3-4': 0,
    '4-5': 0,
    '> 5': 0
  };

  // Calculate distribution
  allSurveyData.forEach(d => {
    const roughness = d.roughness?.L2 || 0;
    const rutting = d.rutting?.L2 || 0;

    // Roughness distribution
    if (roughness < 1000) roughnessRanges['< 1000']++;
    else if (roughness < 1500) roughnessRanges['1000-1500']++;
    else if (roughness < 2000) roughnessRanges['1500-2000']++;
    else if (roughness < 2400) roughnessRanges['2000-2400']++;
    else roughnessRanges['> 2400']++;

    // Rutting distribution
    if (rutting < 2) ruttingRanges['< 2']++;
    else if (rutting < 3) ruttingRanges['2-3']++;
    else if (rutting < 4) ruttingRanges['3-4']++;
    else if (rutting < 5) ruttingRanges['4-5']++;
    else ruttingRanges['> 5']++;
  });

  // Prepare trend data (simplified for demonstration)
  // In a real scenario, you might want to sample or aggregate data points
  const trendData = allSurveyData.slice(0, Math.min(50, allSurveyData.length)).map((d, i) => ({
    chainage: d.startChainage,
    roughness: d.roughness?.L2 || 0,
    rutting: d.rutting?.L2 || 0,
    cracking: d.cracking?.L2 || 0,
    ravelling: d.ravelling?.L2 || 0
  }));

  // Generate trend chart data points
  const trendChainages = trendData.map(d => d.chainage);
  const trendRoughness = trendData.map(d => d.roughness);
  const trendRutting = trendData.map(d => d.rutting);

  return `
    <div class="space-y-8">
      <!-- Header Section -->
      <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4 rounded-lg shadow-lg">
        <h2 class="text-3xl font-bold mb-2">Road Condition Analysis Report</h2>
        <p class="text-lg opacity-90">Comprehensive assessment of road surface parameters</p>
        <div class="text-sm mt-2">Generated on: ${new Date().toLocaleString()}</div>
      </div>

      <!-- Summary Statistics Section -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-2xl font-bold mb-4 text-blue-700 border-b pb-2">Survey Summary</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <table class="min-w-full bg-white text-black rounded">
            <tbody>
              <tr class="border-b">
                <td class="py-3 px-4 font-semibold">Total Segments Analyzed</td>
                <td class="py-3 px-4 font-bold text-blue-700">${totalSegments}</td>
              </tr>
              <tr class="bg-gray-50">
                <td class="py-3 px-4 font-semibold">Average Roughness (L2)</td>
                <td class="py-3 px-4"><span class="font-bold text-blue-600">${avgRoughness} mm/km</span></td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-semibold">Average Rutting (L2)</td>
                <td class="py-3 px-4"><span class="font-bold text-orange-600">${avgRutting} mm</span></td>
              </tr>
              <tr class="bg-gray-50">
                <td class="py-3 px-4 font-semibold">Average Cracking (L2)</td>
                <td class="py-3 px-4"><span class="font-bold text-red-600">${avgCracking}%</span></td>
              </tr>
              <tr>
                <td class="py-3 px-4 font-semibold">Average Ravelling (L2)</td>
                <td class="py-3 px-4"><span class="font-bold text-green-600">${avgRavelling}%</span></td>
              </tr>
            </tbody>
          </table>

          <!-- Compliance Summary -->
          <div>
            <h4 class="text-lg font-semibold mb-3 text-gray-700">Compliance Analysis</h4>
            <div class="space-y-3">
              <div class="bg-blue-50 px-4 py-3 rounded shadow">
                <div class="flex justify-between items-center">
                  <span class="text-blue-700 font-bold">Roughness > ${roughnessLimit}:</span>
                  <div>
                    <span class="inline-block px-3 py-1 rounded bg-blue-600 text-white font-bold">${exceedingRoughness}</span>
                    <span class="text-blue-700 ml-2">(${roughnessPercentage}%)</span>
                  </div>
                </div>
                <div class="w-full bg-blue-200 rounded-full h-2.5 mt-2">
                  <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${roughnessPercentage}%"></div>
                </div>
              </div>
              
              <div class="bg-orange-50 px-4 py-3 rounded shadow">
                <div class="flex justify-between items-center">
                  <span class="text-orange-700 font-bold">Rutting > ${ruttingLimit}:</span>
                  <div>
                    <span class="inline-block px-3 py-1 rounded bg-orange-600 text-white font-bold">${exceedingRutting}</span>
                    <span class="text-orange-700 ml-2">(${ruttingPercentage}%)</span>
                  </div>
                </div>
                <div class="w-full bg-orange-200 rounded-full h-2.5 mt-2">
                  <div class="bg-orange-600 h-2.5 rounded-full" style="width: ${ruttingPercentage}%"></div>
                </div>
              </div>
              
              <div class="bg-red-50 px-4 py-3 rounded shadow">
                <div class="flex justify-between items-center">
                  <span class="text-red-700 font-bold">Cracking > ${crackingLimit}:</span>
                  <div>
                    <span class="inline-block px-3 py-1 rounded bg-red-600 text-white font-bold">${exceedingCracking}</span>
                    <span class="text-red-700 ml-2">(${crackingPercentage}%)</span>
                  </div>
                </div>
                <div class="w-full bg-red-200 rounded-full h-2.5 mt-2">
                  <div class="bg-red-600 h-2.5 rounded-full" style="width: ${crackingPercentage}%"></div>
                </div>
              </div>
              
              <div class="bg-green-50 px-4 py-3 rounded shadow">
                <div class="flex justify-between items-center">
                  <span class="text-green-700 font-bold">Ravelling > ${ravellingLimit}:</span>
                  <div>
                    <span class="inline-block px-3 py-1 rounded bg-green-600 text-white font-bold">${exceedingRavelling}</span>
                    <span class="text-green-700 ml-2">(${ravellingPercentage}%)</span>
                  </div>
                </div>
                <div class="w-full bg-green-200 rounded-full h-2.5 mt-2">
                  <div class="bg-green-600 h-2.5 rounded-full" style="width: ${ravellingPercentage}%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Distribution Charts Section -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-2xl font-bold mb-4 text-blue-700 border-b pb-2">Parameter Distribution</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Roughness Distribution -->
          <div>
            <h4 class="text-lg font-semibold mb-3 text-gray-700">Roughness Distribution</h4>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Range (mm/km)</span>
                <span class="text-sm font-medium text-gray-600">Segments</span>
              </div>
              ${Object.entries(roughnessRanges).map(([range, count]) => {
                const percentage = ((count / totalSegments) * 100).toFixed(1);
                return `
                <div class="mb-3">
                  <div class="flex justify-between mb-1">
                    <span class="text-sm font-medium">${range}</span>
                    <span class="text-sm font-medium">${count} (${percentage}%)</span>
                  </div>
                  <div class="w-full bg-blue-200 rounded-full h-2.5">
                    <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Rutting Distribution -->
          <div>
            <h4 class="text-lg font-semibold mb-3 text-gray-700">Rutting Distribution</h4>
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex justify-between mb-2">
                <span class="text-sm font-medium text-gray-600">Range (mm)</span>
                <span class="text-sm font-medium text-gray-600">Segments</span>
              </div>
              ${Object.entries(ruttingRanges).map(([range, count]) => {
                const percentage = ((count / totalSegments) * 100).toFixed(1);
                return `
                <div class="mb-3">
                  <div class="flex justify-between mb-1">
                    <span class="text-sm font-medium">${range}</span>
                    <span class="text-sm font-medium">${count} (${percentage}%)</span>
                  </div>
                  <div class="w-full bg-orange-200 rounded-full h-2.5">
                    <div class="bg-orange-600 h-2.5 rounded-full" style="width: ${percentage}%"></div>
                  </div>
                </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- Trend Analysis Section -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-2xl font-bold mb-4 text-blue-700 border-b pb-2">Trend Analysis</h3>
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3 text-gray-700">Roughness & Rutting Trends</h4>
          <div class="relative" style="height: 300px;">
            <canvas id="trendChart" width="800" height="300"></canvas>
          </div>
          <script>
            // This script will execute when the report is displayed
            document.addEventListener('DOMContentLoaded', function() {
              const ctx = document.getElementById('trendChart').getContext('2d');
              new Chart(ctx, {
                type: 'line',
                data: {
                  labels: ${JSON.stringify(trendChainages)},
                  datasets: [
                    {
                      label: 'Roughness (mm/km)',
                      data: ${JSON.stringify(trendRoughness)},
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderWidth: 2,
                      tension: 0.3,
                      yAxisID: 'y'
                    },
                    {
                      label: 'Rutting (mm)',
                      data: ${JSON.stringify(trendRutting)},
                      borderColor: 'rgb(249, 115, 22)',
                      backgroundColor: 'rgba(249, 115, 22, 0.1)',
                      borderWidth: 2,
                      tension: 0.3,
                      yAxisID: 'y1'
                    }
                  ]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: 'Chainage'
                      }
                    },
                    y: {
                      type: 'linear',
                      display: true,
                      position: 'left',
                      title: {
                        display: true,
                        text: 'Roughness (mm/km)'
                      },
                      grid: {
                        drawOnChartArea: false
                      }
                    },
                    y1: {
                      type: 'linear',
                      display: true,
                      position: 'right',
                      title: {
                        display: true,
                        text: 'Rutting (mm)'
                      },
                      grid: {
                        drawOnChartArea: false
                      }
                    }
                  },
                  plugins: {
                    legend: {
                      position: 'top'
                    },
                    tooltip: {
                      mode: 'index',
                      intersect: false
                    }
                  }
                }
              });
            });
          </script>
        </div>
      </div>

      <!-- Maintenance Recommendations -->
      <div class="bg-white rounded-lg shadow-lg p-6">
        <h3 class="text-2xl font-bold mb-4 text-blue-700 border-b pb-2">Maintenance Recommendations</h3>
        <div class="space-y-4">
          <div class="p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded">
            <h4 class="font-bold text-yellow-700">Critical Sections</h4>
            <p class="text-gray-700 mt-1">Based on the analysis, ${exceedingRoughness + exceedingRutting} segments require immediate attention due to exceeding roughness or rutting limits.</p>
          </div>
          
          <div class="p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
            <h4 class="font-bold text-blue-700">Preventive Maintenance</h4>
            <p class="text-gray-700 mt-1">Consider scheduling preventive maintenance for sections with roughness values between 2000-2400 mm/km to prevent further deterioration.</p>
          </div>
          
          <div class="p-4 bg-green-50 border-l-4 border-green-500 rounded">
            <h4 class="font-bold text-green-700">Good Condition Sections</h4>
            <p class="text-gray-700 mt-1">${roughnessRanges['< 1000'] + roughnessRanges['1000-1500']} segments are in good condition with roughness values below 1500 mm/km.</p>
          </div>
        </div>
      </div>

      <div class="text-xs text-gray-500 mt-6 text-center">
        <p>National Highways Authority of India - Road Condition Analysis Report</p>
        <p>Generated on: ${new Date().toLocaleString()}</p>
      </div>
    </div>
  `;
}
