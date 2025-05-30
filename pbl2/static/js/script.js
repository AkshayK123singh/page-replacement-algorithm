let chartInstance = null;
let memoryManagementChartInstance = null;
let previousReferenceString = '';
let memoryUsage = [];
let algorithmName = '';

document.getElementById('inputForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const referenceString = document.getElementById('referenceString').value.trim().split(/\s+/).map(Number);
  const frameCount = parseInt(document.getElementById('frameCount').value);
  const algorithm = document.getElementById('algorithm').value;

  // Store algorithm name for performance matrix
  algorithmName = algorithm;

  // Check if the reference string has changed
  const referenceStringChanged = previousReferenceString !== referenceString.join(' ');

  if (referenceStringChanged) {
    resetChart();
    resetMemoryManagementChart();
    memoryUsage = [];
    previousReferenceString = referenceString.join(' ');
  }

  fetch('http://localhost:5000/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceString, frameCount, algorithm })
  })
    .then(res => res.json())
    .then(data => {
      let totalHits = 0;
      let totalMisses = 0;
      let totalPages = referenceString.length;
      document.getElementById('result').textContent = `Total Page Faults: ${data.page_faults}`;
      resetHitMissRatio(); // Reset previous hit/miss ratio
      animateSimulation(data, algorithm, totalHits, totalMisses, totalPages);
    })
    .catch(err => {
      console.error(err);
      document.getElementById('result').textContent = 'Simulation failed. Please check your input and backend.';
    });
});

async function animateSimulation(data, algorithm, totalHits, totalMisses, totalPages) {
  const vis = document.getElementById('visualization');
  vis.innerHTML = '';

  const descriptionBox = document.getElementById('descriptionBox');
  descriptionBox.innerHTML = '';

  const { history, reference_string, frame_count } = data;

  const headerRow = document.createElement('div');
  headerRow.className = 'header-row';
  reference_string.forEach(val => {
    const header = document.createElement('div');
    header.className = 'header-cell';
    header.textContent = val;
    headerRow.appendChild(header);
  });
  vis.appendChild(headerRow);

  const frameRows = [];
  for (let f = 0; f < frame_count; f++) {
    const row = document.createElement('div');
    row.className = 'frame-row';
    vis.appendChild(row);
    frameRows.push(row);
  }

  let hits = [];
  let misses = [];
  let memoryUsageData = [];

  for (let t = 0; t < reference_string.length; t++) {
    await new Promise(resolve => setTimeout(resolve, 700));
    const currentPages = history[t];
    const prevPages = t > 0 ? history[t - 1] : Array(frame_count).fill(-1);
    const pageIn = reference_string[t];
    let isPageFault = true;

    let stepDescription = `<span class="step-text">Step ${t + 1}: </span>`;
    stepDescription += `Checking if page ${pageIn} is already in the frames...<br>`;

    for (let f = 0; f < frame_count; f++) {
      const cell = document.createElement('div');
      cell.className = 'frame-cell';
      const val = currentPages[f];
      cell.textContent = val !== -1 ? val : '-';

      if (prevPages.includes(pageIn) && currentPages.includes(pageIn)) {
        cell.classList.add('hit');
        isPageFault = false;
      } else if (val === pageIn) {
        cell.classList.add('miss');
      }

      frameRows[f].appendChild(cell);
    }

    if (isPageFault) {
      totalMisses++;
      memoryUsageData.push(totalMisses);
      stepDescription += `<span class="page-fault">Page Fault: Page not found in any frame. Replacing a page if needed.</span><br>`;
    } else {
      totalHits++;
      memoryUsageData.push(totalHits);
      stepDescription += `<span class="page-hit">Hit: Page ${pageIn} found in frames, no replacement needed.</span><br>`;
    }
    stepDescription += `Frames after this step: [${currentPages.join(', ')}]<br><br>`;
    descriptionBox.innerHTML += stepDescription;
    descriptionBox.scrollTop = descriptionBox.scrollHeight;

    hits.push(totalHits);
    misses.push(totalMisses);

    const hitRatio = ((totalHits / totalPages) * 100).toFixed(2);
    const missRatio = ((totalMisses / totalPages) * 100).toFixed(2);
    updateHitMissRatio(hitRatio, missRatio);
  }

  updateHitsChart(hits, misses, algorithm);
  updateMemoryManagementChart(memoryUsageData);
  updatePerformanceMatrix(totalHits, totalMisses, totalPages, algorithm);  // Update performance matrix
}

function updateHitMissRatio(hitRatio, missRatio) {
  const hitMissRatioDiv = document.getElementById('hitMissRatio');
  hitMissRatioDiv.innerHTML = ` 
    <div class="ratio-text">
      <span class="hit-ratio">Hit Ratio: ${hitRatio}%</span><br>
      <span class="miss-ratio">Miss Ratio: ${missRatio}%</span>
    </div>
  `;
}

function resetHitMissRatio() {
  document.getElementById('hitMissRatio').innerHTML = '';
}

function updateHitsChart(hits, misses, algorithm) {
  const ctx = document.getElementById('pageHitsChart').getContext('2d');

  if (!chartInstance) {
    chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: hits.length }, (_, i) => i + 1),
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: 'Steps' }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Cumulative Hits/Misses' }
          }
        }
      }
    });
  }

  chartInstance.data.labels = Array.from({ length: hits.length }, (_, i) => i + 1);

  chartInstance.data.datasets.push({
    label: `${algorithm} Hits`,
    data: hits,
    borderColor: getColorForAlgorithm(algorithm),
    backgroundColor: 'transparent',
    tension: 0.3
  });

  chartInstance.data.datasets.push({
    label: `${algorithm} Misses`,
    data: misses,
    borderColor: 'rgba(255, 99, 132, 1)',
    backgroundColor: 'transparent',
    tension: 0.3
  });

  chartInstance.update();
}

function resetChart() {
  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }
}

function resetMemoryManagementChart() {
  if (memoryManagementChartInstance) {
    memoryManagementChartInstance.destroy();
    memoryManagementChartInstance = null;
  }
}

function updateMemoryManagementChart(memoryUsageData) {
  const ctx = document.getElementById('memoryManagementChart').getContext('2d');

  if (!memoryManagementChartInstance) {
    memoryManagementChartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array.from({ length: memoryUsageData.length }, (_, i) => i + 1),
        datasets: [{
          label: 'Memory Usage (Page Faults)',
          data: memoryUsageData,
          borderColor: 'rgba(54, 162, 235, 1)',
          backgroundColor: 'transparent',
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: { display: true, text: 'Steps' }
          },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Memory Usage (Faults)' }
          }
        }
      }
    });
  } else {
    memoryManagementChartInstance.data.datasets[0].data = memoryUsageData;
    memoryManagementChartInstance.update();
  }
}

function updatePerformanceMatrix(totalHits, totalMisses, totalPages, algorithm) {
  const matrix = document.getElementById('performanceMatrix');

  // Clear previous data in the matrix
  matrix.innerHTML = '';

  // Add headers to the matrix
  const headerRow = document.createElement('tr');
  const algorithmHeader = document.createElement('th');
  algorithmHeader.textContent = 'Algorithm';
  const hitHeader = document.createElement('th');
  hitHeader.textContent = 'Total Hits';
  const missHeader = document.createElement('th');
  missHeader.textContent = 'Total Misses';
  const hitRatioHeader = document.createElement('th');
  hitRatioHeader.textContent = 'Hit Ratio (%)';
  const missRatioHeader = document.createElement('th');
  missRatioHeader.textContent = 'Miss Ratio (%)';
  const faultHeader = document.createElement('th');
  faultHeader.textContent = 'Total Faults';

  headerRow.appendChild(algorithmHeader);
  headerRow.appendChild(hitHeader);
  headerRow.appendChild(missHeader);
  headerRow.appendChild(hitRatioHeader);
  headerRow.appendChild(missRatioHeader);
  headerRow.appendChild(faultHeader);
  matrix.appendChild(headerRow);

  // Add data for the selected algorithm
  const row = document.createElement('tr');
  const algorithmCell = document.createElement('td');
  algorithmCell.textContent = algorithm;
  const hitCell = document.createElement('td');
  hitCell.textContent = totalHits;
  const missCell = document.createElement('td');
  missCell.textContent = totalMisses;
  const hitRatioCell = document.createElement('td');
  const hitRatio = ((totalHits / totalPages) * 100).toFixed(2);
  hitRatioCell.textContent = hitRatio + '%';
  const missRatioCell = document.createElement('td');
  const missRatio = ((totalMisses / totalPages) * 100).toFixed(2);
  missRatioCell.textContent = missRatio + '%';
  const faultCell = document.createElement('td');
  faultCell.textContent = totalMisses;

  row.appendChild(algorithmCell);
  row.appendChild(hitCell);
  row.appendChild(missCell);
  row.appendChild(hitRatioCell);
  row.appendChild(missRatioCell);
  row.appendChild(faultCell);
  matrix.appendChild(row);
}

function getColorForAlgorithm(algorithm) {
  switch (algorithm) {
    case 'FIFO':
      return 'rgba(75, 192, 192, 1)';
    case 'LRU':
      return 'rgba(153, 102, 255, 1)';
    case 'Optimal':
      return 'rgba(255, 159, 64, 1)';
    case 'Clock':
      return 'rgba(255, 99, 132, 1)';
    default:
      return 'rgba(0, 0, 0, 1)';
  }
}
