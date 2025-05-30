// static/js/learn.js

document.addEventListener('DOMContentLoaded', () => {
    const runCustomSimulationBtn = document.getElementById('runCustomSimulationBtn');
    const scenarioTypeSelect = document.getElementById('scenarioType');
    const practiceFrameCountInput = document.getElementById('practiceFrameCount');
    const practiceReferenceStringInput = document.getElementById('practiceReferenceString');
    const customSimulationResultsDiv = document.getElementById('customSimulationResults');
    const customPerformanceMetricsDiv = document.getElementById('customPerformanceMetrics');

    if (runCustomSimulationBtn) {
        runCustomSimulationBtn.addEventListener('click', () => {
            runPracticeSimulation(
                scenarioTypeSelect.value,
                practiceFrameCountInput,
                practiceReferenceStringInput,
                customSimulationResultsDiv,
                customPerformanceMetricsDiv
            );
        });
    }

    function runPracticeSimulation(algorithm, frameCountInput, referenceStringInput, simulationResultsDiv, performanceMetricsDiv) {
        const frames = parseInt(frameCountInput.value);
        const referenceStringText = referenceStringInput.value;

        if (!algorithm || isNaN(frames) || frames <= 0 || !referenceStringText) {
            alert('Please select an algorithm, enter valid frame count, and a reference string.');
            return;
        }

        const referenceString = referenceStringText.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));

        if (referenceString.length === 0) {
            alert('Please enter a valid comma-separated reference string of numbers.');
            return;
        }

        const data = {
            algorithm: algorithm,
            frames: frames,
            reference_string: referenceString
        };

        fetch('/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })
        .then(response => response.json())
        .then(result => {
            if (result.error) {
                alert('Error: ' + result.error);
                return;
            }
            displaySimulationResults(result, simulationResultsDiv);
            displayPerformanceMetrics(result, performanceMetricsDiv);
        })
        .catch(error => {
            console.error('Error running simulation:', error);
            alert('An error occurred during simulation. Please try again.');
        });
    }

    function displaySimulationResults(result, simulationResultsDiv) {
        simulationResultsDiv.innerHTML = '<h3>Simulation Steps</h3>';
        const steps = result.steps;
        const framesCapacity = result.frames_capacity; // Get frames_capacity from the result

        if (!steps || steps.length === 0) {
            simulationResultsDiv.innerHTML += '<p>No simulation steps to display.</p>';
            return;
        }

        const table = document.createElement('table');
        table.classList.add('simulation-table');
        
        // Create table header dynamically based on framesCapacity
        let frameHeaders = '';
        for (let i = 1; i <= framesCapacity; i++) {
            frameHeaders += `<th>F${i}</th>`;
        }

        let tableHTML = `
            <thead>
                <tr>
                    <th>Step</th>
                    <th>Reference</th>
                    ${frameHeaders}
                    <th>Event</th>
                    <th>Replaced</th>
                </tr>
            </thead>
            <tbody>
        `;

        steps.forEach((step, index) => {
            // Ensure frames array has enough elements for display, fill with '-' if less than capacity
            const displayFrames = Array.from({ length: framesCapacity }, (_, i) => {
                const frameValue = step.frames[i] !== undefined && step.frames[i] !== -1 ? step.frames[i] : '-';
                return frameValue;
            });

            const frameCells = displayFrames.map(frame => {
                let cellClass = '';
                // Highlight logic for hit/load - simplified to not highlight if the frame is empty
                if (frame === step.reference && step.event === 'Page Hit' && frame !== '-') {
                    cellClass = 'highlight-hit';
                } else if (frame === step.reference && (step.event === 'Page Fault (Load)' || step.event === 'Page Fault (Replace)') && frame !== '-') {
                    cellClass = 'highlight-load';
                }
                return `<td class="${cellClass}">${frame}</td>`;
            }).join('');

            const replacedPage = step.page_to_replace !== null && step.page_to_replace !== undefined ? step.page_to_replace : '-';
            tableHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${step.reference}</td>
                    ${frameCells}
                    <td>${step.event}</td>
                    <td>${replacedPage}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody>';
        table.innerHTML = tableHTML;
        simulationResultsDiv.appendChild(table);
    }

    function displayPerformanceMetrics(metrics, performanceMetricsDiv) {
        performanceMetricsDiv.innerHTML = '<h3>Performance Metrics</h3>';
        performanceMetricsDiv.innerHTML += `
            <p><strong>Total References:</strong> ${metrics.total_references}</p>
            <p><strong>Page Faults:</strong> ${metrics.page_faults}</p>
            <p><strong>Page Hits:</strong> ${metrics.page_hits}</p>
            <p><strong>Fault Rate:</strong> ${metrics.fault_rate}%</p>
            <p><strong>Hit Rate:</strong> ${metrics.hit_rate}%</p>
            <p><strong>Average Access Time:</strong> ${metrics.avg_access_time} ns</p>
            <p><strong>Throughput:</strong> ${metrics.throughput} pages/sec</p>
            <p><strong>Response Time:</strong> ${metrics.response_time} ns</p>
            <p><strong>Memory Utilization:</strong> ${metrics.memory_utilization}% (Estimated)</p>
            <p><strong>Average Search Length:</strong> ${metrics.avg_search_length} (Estimated)</p>
            <p><strong>Cost Function:</strong> ${metrics.cost_function}</p>
        `;
    }
});