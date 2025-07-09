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

  return `
    <div class="space-y-6">
      <div class="mb-4">
        <h3 class="text-2xl font-bold mb-2 text-blue-700">Survey Report Summary</h3>
        <table class="min-w-full bg-white text-black rounded shadow">
          <tbody>
            <tr class="border-b">
              <td class="py-2 px-4 font-semibold">Total Segments</td>
              <td class="py-2 px-4">${totalSegments}</td>
            </tr>
            <tr class="bg-gray-50">
              <td class="py-2 px-4 font-semibold">Avg. Roughness (L2)</td>
              <td class="py-2 px-4"><span class="font-bold text-blue-600">${avgRoughness}</span></td>
            </tr>
            <tr>
              <td class="py-2 px-4 font-semibold">Avg. Rutting (L2)</td>
              <td class="py-2 px-4"><span class="font-bold text-orange-600">${avgRutting}</span></td>
            </tr>
            <tr class="bg-gray-50">
              <td class="py-2 px-4 font-semibold">Avg. Cracking (L2)</td>
              <td class="py-2 px-4"><span class="font-bold text-red-600">${avgCracking}</span></td>
            </tr>
            <tr>
              <td class="py-2 px-4 font-semibold">Avg. Ravelling (L2)</td>
              <td class="py-2 px-4"><span class="font-bold text-green-600">${avgRavelling}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="mb-4">
        <h4 class="text-lg font-semibold mb-2 text-gray-700">Segments Exceeding Limits</h4>
        <div class="flex flex-wrap gap-3">
          <div class="bg-blue-50 px-4 py-2 rounded shadow flex items-center">
            <span class="text-blue-700 font-bold mr-2">Roughness &gt; ${roughnessLimit}:</span>
            <span class="inline-block px-2 py-1 rounded bg-blue-600 text-white font-bold">${exceedingRoughness}</span>
          </div>
          <div class="bg-orange-50 px-4 py-2 rounded shadow flex items-center">
            <span class="text-orange-700 font-bold mr-2">Rutting &gt; ${ruttingLimit}:</span>
            <span class="inline-block px-2 py-1 rounded bg-orange-600 text-white font-bold">${exceedingRutting}</span>
          </div>
          <div class="bg-red-50 px-4 py-2 rounded shadow flex items-center">
            <span class="text-red-700 font-bold mr-2">Cracking &gt; ${crackingLimit}:</span>
            <span class="inline-block px-2 py-1 rounded bg-red-600 text-white font-bold">${exceedingCracking}</span>
          </div>
          <div class="bg-green-50 px-4 py-2 rounded shadow flex items-center">
            <span class="text-green-700 font-bold mr-2">Ravelling &gt; ${ravellingLimit}:</span>
            <span class="inline-block px-2 py-1 rounded bg-green-600 text-white font-bold">${exceedingRavelling}</span>
          </div>
        </div>
      </div>
      <div class="text-xs text-gray-500 mt-4">
        <span>Report generated on: ${new Date().toLocaleString()}</span>
      </div>
    </div>
  `;
}
