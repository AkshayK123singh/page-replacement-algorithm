let comparisonChart = null;

// Modern color scheme with gradients
const algorithmColors = {
    'FIFO': {
        gradient: ['rgba(75, 192, 192, 0.2)', 'rgba(75, 192, 192, 1)'],
        solid: 'rgba(75, 192, 192, 1)'
    },
    'LRU': {
        gradient: ['rgba(153, 102, 255, 0.2)', 'rgba(153, 102, 255, 1)'],
        solid: 'rgba(153, 102, 255, 1)'
    },
    'Optimal': {
        gradient: ['rgba(255, 159, 64, 0.2)', 'rgba(255, 159, 64, 1)'],
        solid: 'rgba(255, 159, 64, 1)'
    },
    'Clock': {
        gradient: ['rgba(255, 99, 132, 0.2)', 'rgba(255, 99, 132, 1)'],
        solid: 'rgba(255, 99, 132, 1)'
    }
};

const algorithms = ['FIFO', 'LRU', 'Optimal', 'Clock'];

// Performance constants
const MEMORY_ACCESS_TIME = 100;
const PAGE_FAULT_PENALTY = 1000;
const MEMORY_PAGE_SIZE = 4096;
const MEMORY_BUS_SPEED = 800;
const MEMORY_LATENCY = 50;

// Chart animation state
let isAnimationEnabled = true;

// Initialize Chart.js plugins
Chart.register(ChartDataLabels);

// Modern async initialization
const initializeApp = async () => {
    const controls = {
        referenceString: document.getElementById('referenceString'),
        numFrames: document.getElementById('numFrames'), // Get the new numFrames input
        metricSelect: document.getElementById('metricSelect'),
        chartType: document.getElementById('chartType')
    };

    // Add event listeners using modern syntax
    Object.values(controls).forEach(control => {
        control?.addEventListener('change', () => updateChart());
    });

    // Initialize metric select with grouped options
    updateMetricSelectOptions();

    // Initial chart update
    await updateChart();
};

// Modern event listener
document.addEventListener('DOMContentLoaded', initializeApp);

// Toggle chart animation
const toggleAnimation = () => {
    isAnimationEnabled = !isAnimationEnabled;
    updateChart();
};

// Export chart as image
const exportChart = () => {
    if (!comparisonChart) return;

    const link = document.createElement('a');
    link.download = 'algorithm-comparison.png';
    link.href = comparisonChart.toBase64Image();
    link.click();
};

// Modern async function for simulation
const runSimulation = async (algorithm, referenceString, frameCount) => {
    try {
        const response = await fetch('http://localhost:5000/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referenceString, frameCount, algorithm })
        });

        if (!response.ok) throw new Error('Simulation failed');

        const data = await response.json();
        
        if (data.metrics) {
            console.log(`=== Verification for ${algorithm} ===`);
            console.table(data.metrics);
            return data.metrics;
        }

        throw new Error('No metrics data in server response');
    } catch (error) {
        console.error(`Error running ${algorithm}:`, error);
        return null;
    }
};

// Prepare chart data based on chart type
const prepareChartData = (results, metric, chartType) => {
    const labels = Object.keys(results);
    const data = labels.map(algo => {
        const value = parseFloat(results[algo][metric]);
        return isNaN(value) ? 0 : value;
    });

    const baseConfig = {
        labels: labels.map(label => label.toUpperCase()),
        datasets: [{
            label: getMetricLabel(metric),
            data: data,
            borderWidth: 2
        }]
    };

    // Customize dataset based on chart type
    switch (chartType) {
        case 'bar':
            baseConfig.datasets[0] = {
                ...baseConfig.datasets[0],
                backgroundColor: labels.map(algo => algorithmColors[algo].gradient[0]),
                borderColor: labels.map(algo => algorithmColors[algo].solid),
                hoverBackgroundColor: labels.map(algo => algorithmColors[algo].gradient[1])
            };
            break;
        case 'line':
            baseConfig.datasets[0] = {
                ...baseConfig.datasets[0],
                borderColor: labels.map(algo => algorithmColors[algo].solid),
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                pointBackgroundColor: labels.map(algo => algorithmColors[algo].solid),
                fill: true,
                tension: 0.4
            };
            break;
        case 'radar':
            baseConfig.datasets[0] = {
                ...baseConfig.datasets[0],
                backgroundColor: labels.map(algo => algorithmColors[algo].gradient[0]),
                borderColor: labels.map(algo => algorithmColors[algo].solid),
                pointBackgroundColor: labels.map(algo => algorithmColors[algo].solid)
            };
            break;
        case 'polarArea':
        case 'doughnut':
            baseConfig.datasets[0] = {
                ...baseConfig.datasets[0],
                backgroundColor: labels.map(algo => algorithmColors[algo].gradient[0]),
                borderColor: labels.map(algo => algorithmColors[algo].solid)
            };
            break;
        case 'bubble':
            baseConfig.datasets = labels.map((algo, index) => ({
                label: algo,
                data: [{
                    x: index,
                    y: data[index],
                    r: data[index] / 2
                }],
                backgroundColor: algorithmColors[algo].gradient[0],
                borderColor: algorithmColors[algo].solid
            }));
            break;
        case 'scatter':
            baseConfig.datasets = labels.map((algo, index) => ({
                label: algo,
                data: [{
                    x: index,
                    y: data[index]
                }],
                backgroundColor: algorithmColors[algo].solid,
                borderColor: algorithmColors[algo].solid
            }));
            break;
    }

    return baseConfig;
};

// Create chart with modern options
const createChart = (data, type, metric) => {
    const ctx = document.getElementById('comparisonChart').getContext('2d');
    
    if (comparisonChart) {
        comparisonChart.destroy();
    }

    const formatValue = (value) => {
        switch(metric) {
            case 'hitRatio':
            case 'missRatio':
            case 'efficiency':
            case 'memoryUtilization':
                return value.toFixed(2) + '%';
            case 'avgAccessTime':
            case 'responseTime':
                return value.toFixed(2) + ' ns';
            case 'throughput':
                return value.toFixed(2) + ' pages/sec';
            case 'costFunction':
                return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
            default:
                return value.toFixed(type === 'bubble' ? 1 : 0);
        }
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: isAnimationEnabled ? 1000 : 0,
            easing: 'easeInOutQuart'
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: { size: 14, weight: 'bold' },
                    color: '#ffffff',
                    usePointStyle: true,
                    padding: 20
                }
            },
            title: {
                display: true,
                text: `${getMetricLabel(metric)} Comparison`,
                color: '#ffffff',
                font: { size: 18, weight: 'bold' },
                padding: { top: 10, bottom: 30 }
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                padding: 12,
                callbacks: {
                    label: (context) => `${context.dataset.label}: ${formatValue(context.parsed.y || context.parsed)}`
                }
            },
            datalabels: {
                color: '#ffffff',
                anchor: 'end',
                align: 'top',
                formatter: (value) => formatValue(value),
                font: { size: 11 }
            }
        },
        scales: type !== 'doughnut' && type !== 'polarArea' ? {
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                },
                ticks: {
                    color: '#ffffff',
                    callback: (value) => formatValue(value)
                }
            },
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)',
                    drawBorder: false
                },
                ticks: { color: '#ffffff' }
            }
        } : undefined
    };

    // Add chart type specific options
    switch(type) {
        case 'radar':
            options.scales = {
                r: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    pointLabels: { color: '#ffffff' },
                    ticks: { color: '#ffffff', backdropColor: 'transparent' }
                }
            };
            break;
        case 'bubble':
            options.scales.x.type = 'linear';
            options.scales.x.position = 'bottom';
            break;
    }

    comparisonChart = new Chart(ctx, {
        type,
        data: data,
        options,
        plugins: [{
            id: 'customBackground',
            beforeDraw: (chart) => {
                const ctx = chart.ctx;
                ctx.save();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.fillRect(0, 0, chart.width, chart.height);
                ctx.restore();
            }
        }]
    });
};

// Add loading overlay functions
function showLoading() {
    const overlay = document.querySelector('.loading-overlay');
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    overlay.classList.remove('active');
}

// Update runSimulationForAll with loading animation and frameCount
async function runSimulationForAll() {
    const referenceString = document.getElementById('referenceString').value
        .trim()
        .split(/\s+/)
        .map(Number);
    const numFramesInput = document.getElementById('numFrames');
    const frameCount = parseInt(numFramesInput.value, 10);

    if (!referenceString.length || referenceString.some(isNaN)) {
        showErrorPopup('Please enter a valid reference string');
        return;
    }
    
    if (isNaN(frameCount) || frameCount < 1) {
        showErrorPopup('Please enter a valid number of frames (minimum 1)');
        return;
    }

    const results = {};

    // Show loading animation
    showLoading();

    try {
        // Run simulations for all algorithms
        for (const algorithm of algorithms) {
            console.log(`Running simulation for ${algorithm}`);
            const result = await runSimulation(algorithm, referenceString, frameCount);
            if (result) {
                results[algorithm] = result;
                console.log(`Results for ${algorithm}:`, result);
            }
        }

        // Save results to file
        const saveResult = await saveToFile(referenceString, frameCount, results);
        console.log('Save operation result:', saveResult);
        
        // Hide loading animation
        hideLoading();
        
        // Update chart with new data
        await updateChart();
    } catch (error) {
        console.error('Error in runSimulationForAll:', error);
        hideLoading();
        showErrorPopup(error.message || 'Failed to run simulations');
    }
}

// Update updateChart with loading animation and frameCount
async function updateChart() {
    try {
        const referenceString = document.getElementById('referenceString').value
            .trim()
            .split(/\s+/)
            .map(Number);
        const numFramesInput = document.getElementById('numFrames');
        const frameCount = parseInt(numFramesInput.value, 10);

        if (!referenceString.length || referenceString.some(isNaN)) {
            // No need to show error immediately on initial load if string is empty
            // The runSimulationForAll will handle it when the button is clicked.
            return; 
        }

        if (isNaN(frameCount) || frameCount < 1) {
            showErrorPopup('Please enter a valid number of frames (minimum 1)');
            return;
        }

        const metric = document.getElementById('metricSelect').value;
        const chartType = document.getElementById('chartType').value;

        // Show loading animation
        showLoading();

        // Fetch stored results
        const response = await fetch('http://localhost:5000/get_results');
        if (!response.ok) {
            throw new Error('Failed to fetch results');
        }
        const data = await response.json();

        // Hide loading animation
        hideLoading();

        if (!data) {
            showErrorPopup('No data available. Would you like to run the simulation?', true);
            return;
        }

        // Find results for this reference string AND frame count
        const key = Object.keys(data).find(key => {
            const storedRefString = data[key].referenceString;
            const storedFrameCount = data[key].frameCount;
            return Array.isArray(storedRefString) && 
                   storedRefString.join(',') === referenceString.join(',') &&
                   storedFrameCount === frameCount;
        });

        if (!key) {
            showErrorPopup(
                'No data found for this reference string and frame count combination. Would you like to run the simulation?',
                true
            );
            return;
        }

        const results = data[key].results;
        
        // Prepare chart data
        const chartData = prepareChartData(results, metric, chartType);
        
        // Create or update chart
        createChart(chartData, chartType, metric);

    } catch (error) {
        console.error('Error updating chart:', error);
        hideLoading();
        showErrorPopup(error.message || 'Failed to update chart');
    }
}

// Update showErrorPopup with modern styling
function showErrorPopup(message, isConfirm = false) {
    // Remove any existing error popups
    const existingPopups = document.querySelectorAll('.error-popup');
    existingPopups.forEach(popup => popup.remove());

    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(42, 42, 42, 0.95);
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        backdrop-filter: blur(10px);
        z-index: 1000;
        max-width: 400px;
        width: 90%;
        border: 2px solid #4CAF50;
        animation: fadeInScale 0.3s ease-out forwards;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
        color: #ffffff;
        margin: 0 0 15px 0;
        font-size: 1.2em;
        text-transform: uppercase;
        letter-spacing: 1px;
    `;
    title.textContent = isConfirm ? 'Confirmation' : 'Error';

    const text = document.createElement('p');
    text.style.cssText = `
        color: #dddddd;
        margin: 10px 0;
        line-height: 1.5;
    `;
    text.textContent = message;

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
    `;

    const createButton = (label, primary = false) => {
        const button = document.createElement('button');
        button.style.cssText = `
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: ${primary ? '#4CAF50' : '#666'};
            color: white;
            cursor: pointer;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s ease;
        `;
        button.textContent = label;
        button.onmouseover = () => {
            button.style.transform = 'translateY(-2px)';
            button.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.2)';
        };
        button.onmouseout = () => {
            button.style.transform = 'translateY(0)';
            button.style.boxShadow = 'none';
        };
        return button;
    };

    if (isConfirm) {
        const yesButton = createButton('Yes', true);
        yesButton.onclick = () => {
            popup.remove();
            runSimulationForAll();
        };
        const noButton = createButton('No');
        noButton.onclick = () => popup.remove();
        buttonContainer.appendChild(yesButton);
        buttonContainer.appendChild(noButton);
    } else {
        const closeButton = createButton('Close', true);
        closeButton.onclick = () => popup.remove();
        buttonContainer.appendChild(closeButton);
    }

    popup.appendChild(title);
    popup.appendChild(text);
    popup.appendChild(buttonContainer);
    document.body.appendChild(popup);

    // Add keydown event listener for Escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            popup.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);
}

async function fetchStoredResults() {
    try {
        const response = await fetch('http://localhost:5000/get_results');
        if (!response.ok) {
            throw new Error('Failed to fetch results');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching results:', error);
        showErrorPopup('Failed to fetch stored results');
        return null;
    }
}

function findResultsForReferenceString(data, referenceString, frameCount) {
    const key = Object.keys(data).find(key => {
        const storedRefString = data[key].referenceString;
        const storedFrameCount = data[key].frameCount;
        return Array.isArray(storedRefString) && 
               storedRefString.join(',') === referenceString.join(',') &&
               storedFrameCount === frameCount;
    });
    return key ? data[key] : null;
}

async function saveToFile(referenceString, frameCount, results) {
    try {
        const newData = {
            referenceString: referenceString,
            frameCount: frameCount,
            timestamp: new Date().toISOString(),
            results: {}
        };

        // Store the metrics directly as they come from the simulation
        Object.entries(results).forEach(([algo, metrics]) => {
            newData.results[algo] = metrics;

            // Log verification
            console.log(`\n=== Verification for ${algo} ===`);
            console.log('Core Metrics:');
            console.log(`Total Pages: ${metrics.totalPages}`);
            console.log(`Total Hits: ${metrics.totalHits}`);
            console.log(`Total Misses: ${metrics.totalMisses}`);
            console.log(`Hit Ratio: ${metrics.hitRatio}%`);
            
            console.log('\nPerformance Metrics:');
            console.log(`Avg Access Time: ${metrics.avgAccessTime} ns`);
            console.log(`Throughput: ${metrics.throughput} pages/sec`);
            console.log(`Response Time: ${metrics.responseTime} ns`);
            console.log(`Cost: ${metrics.costFunction}`);
        });

        const key = `${referenceString.join(',')}_${frameCount}`;
        
        const response = await fetch('http://localhost:5000/save_results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                key: key,
                data: newData
            })
        });

        const responseData = await response.json();
        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to save results');
        }

        return responseData;
    } catch (error) {
        console.error('Error in saveToFile:', error);
        showErrorPopup(error.message || 'Failed to save results');
        throw error;
    }
}

function getMetricLabel(metric) {
    const labels = {
        totalHits: 'Total Hits',
        totalMisses: 'Total Misses',
        hitRatio: 'Hit Ratio (%)',
        missRatio: 'Miss Ratio (%)',
        pageFaults: 'Page Faults',
        efficiency: 'Memory Efficiency (%)',
        faultRate: 'Fault Rate',
        hitMissRatio: 'Hit/Miss Ratio',
        avgAccessTime: 'Average Access Time (ns)',
        throughput: 'Throughput (pages/ms)',
        memoryUtilization: 'Memory Utilization (%)',
        avgSearchLength: 'Average Search Length',
        responseTime: 'Response Time (ns)',
        costFunction: 'Cost Function'
    };
    return labels[metric] || metric;
}

// Update the metric select options with better organization
function updateMetricSelectOptions() {
    const metricSelect = document.getElementById('metricSelect');
    if (!metricSelect) return;

    const metricGroups = {
        'Basic Metrics': {
            totalHits: 'Total Hits',
            totalMisses: 'Total Misses',
            pageFaults: 'Page Faults',
            hitRatio: 'Hit Ratio (%)',
            missRatio: 'Miss Ratio (%)'
        },
        'Performance Metrics': {
            avgAccessTime: 'Average Access Time (ns)',
            responseTime: 'Response Time (ns)',
            throughput: 'Throughput (pages/sec)',
            avgSearchLength: 'Average Search Length'
        },
        'Efficiency Metrics': {
            efficiency: 'Memory Efficiency (%)',
            memoryUtilization: 'Memory Utilization (%)',
            faultRate: 'Fault Rate',
            hitMissRatio: 'Hit/Miss Ratio',
            costFunction: 'Cost Function'
        }
    };

    // Clear existing options
    metricSelect.innerHTML = '';

    // Add grouped options
    Object.entries(metricGroups).forEach(([groupName, metrics]) => {
        const group = document.createElement('optgroup');
        group.label = groupName;

        Object.entries(metrics).forEach(([value, label]) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            group.appendChild(option);
        });

        metricSelect.appendChild(group);
    });
}