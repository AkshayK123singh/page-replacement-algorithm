import json
import os
import math
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from datetime import datetime # Import datetime for timestamps

app = Flask(__name__, template_folder='templates')
CORS(app)

# Constants for performance calculations
MEMORY_ACCESS_TIME = 100    # nanoseconds
PAGE_FAULT_PENALTY = 1000   # nanoseconds
MEMORY_PAGE_SIZE = 4096     # bytes
MEMORY_BUS_SPEED = 800      # MHz
MEMORY_LATENCY = 50         # nanoseconds

# Ensure the path is absolute for algorithm results
RESULTS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'js', 'algorithm_results.json')

# Define the path to your JSON file for contact messages
CONTACT_MESSAGES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'contact_messages.json')

def calculate_metrics(algorithm, reference_string, frame_count, page_faults):
    """Calculate all performance metrics for a given algorithm."""
    total_pages = len(reference_string)
    total_misses = page_faults
    total_hits = total_pages - total_misses

    # Basic metrics
    hit_ratio = (total_hits / total_pages) * 100 if total_pages > 0 else 0
    miss_ratio = (total_misses / total_pages) * 100 if total_pages > 0 else 0
    fault_rate = total_misses / total_pages if total_pages > 0 else 0

    # Calculate algorithm-specific search length
    if algorithm == 'LRU':
        avg_search_length = math.log2(frame_count)
    elif algorithm == 'Optimal':
        avg_search_length = 1    # Best case
    elif algorithm == 'Clock':
        avg_search_length = frame_count * 0.75  # Average case
    else:    # FIFO
        avg_search_length = frame_count / 2

    # Performance metrics
    avg_access_time = MEMORY_ACCESS_TIME + (fault_rate * PAGE_FAULT_PENALTY)
    memory_utilization = (frame_count / total_pages) * 100 if total_pages > 0 else 0
    response_time = avg_access_time + (MEMORY_LATENCY * avg_search_length)
    throughput = 1000000 / response_time if response_time > 0 else 0    # pages per second
    cost_function = (total_misses * PAGE_FAULT_PENALTY) + (total_hits * MEMORY_ACCESS_TIME)

    return {
        'totalHits': total_hits,
        'totalMisses': total_misses,
        'totalPages': total_pages,
        'pageFaults': total_misses,
        'hitRatio': f"{hit_ratio:.2f}",
        'missRatio': f"{miss_ratio:.2f}",
        'efficiency': f"{hit_ratio:.2f}",
        'faultRate': f"{fault_rate:.4f}",
        'hitMissRatio': f"{(total_hits / total_misses if total_misses > 0 else 0):.2f}",
        'avgAccessTime': f"{avg_access_time:.2f}",
        'throughput': f"{throughput:.2f}",
        'memoryUtilization': f"{memory_utilization:.2f}",
        'avgSearchLength': f"{avg_search_length:.2f}",
        'responseTime': f"{response_time:.2f}",
        'costFunction': f"{cost_function:.2f}"
    }

class PageReplacementSimulator:
    def __init__(self, frame_count, reference_string):
        self.frame_count = frame_count
        self.reference_string = reference_string
        self.frames = [-1] * frame_count
        self.page_faults = 0
        self.history = []

    def _reset(self):
        self.frames = [-1] * self.frame_count
        self.page_faults = 0
        self.history = []

    def fifo(self):
        self._reset()
        queue = []
        for page in self.reference_string:
            if page not in self.frames:
                self.page_faults += 1
                if -1 in self.frames:
                    idx = self.frames.index(-1)
                    self.frames[idx] = page
                    queue.append(idx)
                else:
                    idx = queue.pop(0)
                    self.frames[idx] = page
                    queue.append(idx)
            self.history.append(self.frames[:])
        return self.history, self.page_faults

    def lru(self):
        self._reset()
        recent = []
        for page in self.reference_string:
            if page not in self.frames:
                self.page_faults += 1
                if -1 in self.frames:
                    idx = self.frames.index(-1)
                else:
                    lru_page = recent.pop(0)
                    idx = self.frames.index(lru_page)
                self.frames[idx] = page
            else:
                # If page is already in frames, remove it from recent and re-add to mark as most recent
                if page in recent: # Ensure page is in recent before trying to remove
                    recent.remove(page)
            recent.append(page)
            self.history.append(self.frames[:])
        return self.history, self.page_faults

    def optimal(self):
        self._reset()
        for i, page in enumerate(self.reference_string):
            if page not in self.frames:
                self.page_faults += 1
                if -1 in self.frames:
                    self.frames[self.frames.index(-1)] = page
                else:
                    future = self.reference_string[i+1:]
                    indices = []
                    for f_page in self.frames:
                        if f_page in future:
                            indices.append(future.index(f_page))
                        else:
                            indices.append(float('inf'))
                    idx_to_replace = indices.index(max(indices))
                    self.frames[idx_to_replace] = page
            self.history.append(self.frames[:])
        return self.history, self.page_faults

    def clock(self):
        self._reset()
        pointer = 0
        used = [0] * self.frame_count
        for page in self.reference_string:
            if page in self.frames:
                idx = self.frames.index(page)
                used[idx] = 1
            else:
                self.page_faults += 1
                while used[pointer] == 1:
                    used[pointer] = 0
                    pointer = (pointer + 1) % self.frame_count
                self.frames[pointer] = page
                used[pointer] = 1
                pointer = (pointer + 1) % self.frame_count
            self.history.append(self.frames[:])
        return self.history, self.page_faults

@app.route('/simulate', methods=['POST'])
def simulate():
    try:
        data = request.json
        reference_string = data.get("referenceString", [])
        frame_count = data.get("frameCount", 3)
        algorithm = data.get("algorithm", "FIFO")

        simulator = PageReplacementSimulator(frame_count, reference_string)

        if algorithm == "FIFO":
            history, faults = simulator.fifo()
        elif algorithm == "LRU":
            history, faults = simulator.lru()
        elif algorithm == "Optimal":
            history, faults = simulator.optimal()
        elif algorithm == "Clock":
            history, faults = simulator.clock()
        else:
            return jsonify({"error": "Invalid algorithm selected"}), 400

        # Calculate all metrics
        metrics = calculate_metrics(algorithm, reference_string, frame_count, faults)
        
        return jsonify({
            "reference_string": reference_string,
            "frame_count": frame_count,
            "page_faults": faults,
            "history": history,
            "algorithm": algorithm,
            "metrics": metrics
        })

    except Exception as e:
        print(f"Error in simulate: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/save_results', methods=['POST'])
def save_results_endpoint():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        print("Received data for saving:", data)
            
        if 'key' not in data or 'data' not in data:
            return jsonify({'error': 'Missing key or data field'}), 400

        # Load existing results
        results = load_results()
            
        # Update with new results
        key = data['key']
        results_data = data['data']
            
        if not isinstance(results_data, dict):
            return jsonify({'error': 'Invalid data format'}), 400

        # Store the results with verification
        results[key] = {
            'referenceString': results_data['referenceString'],
            'frameCount': results_data['frameCount'],
            'timestamp': results_data['timestamp'],
            'results': {}
        }

        # Process each algorithm's results with verification
        for algo, metrics_from_client in results_data['results'].items():
            # Recalculate metrics to ensure accuracy (using pageFaults from client for consistency)
            verified_metrics = calculate_metrics(
                algo,
                results_data['referenceString'],
                results_data['frameCount'],
                metrics_from_client['pageFaults'] # Use the pageFaults from the client for recalculation
            )
            results[key]['results'][algo] = verified_metrics

        # Save to file
        save_results(results)
            
        return jsonify({
            'message': 'Results saved successfully',
            'key': key
        })

    except Exception as e:
        print(f"Error in save_results_endpoint: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/get_results', methods=['GET'])
def get_results():
    try:
        results = load_results()
        return jsonify(results)
    except Exception as e:
        print(f"Error in get_results: {str(e)}")
        return jsonify({'error': str(e)}), 500

def load_results():
    try:
        if os.path.exists(RESULTS_FILE):
            with open(RESULTS_FILE, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        print(f"Error loading results: {str(e)}")
        return {}

def save_results(data):
    try:
        os.makedirs(os.path.dirname(RESULTS_FILE), exist_ok=True)
        with open(RESULTS_FILE, 'w') as f:
            json.dump(data, f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving results: {str(e)}")
        return False

@app.route('/')
def index():
    return render_template('home.html')

@app.route('/simulator')
def simulator():
    return render_template('index.html')

# Modified /contact route to handle POST requests
@app.route('/contact', methods=['GET', 'POST'])
def contact():
    if request.method == 'POST':
        try:
            data = request.get_json()
            name = data.get('name')
            email = data.get('email')
            message = data.get('message')

            if not name or not email or not message:
                return jsonify({'success': False, 'message': 'All fields are required!'}), 400

            new_message = {
                'name': name,
                'email': email,
                'message': message,
                'timestamp': datetime.now().isoformat()
            }

            messages = []
            if os.path.exists(CONTACT_MESSAGES_FILE) and os.path.getsize(CONTACT_MESSAGES_FILE) > 0:
                with open(CONTACT_MESSAGES_FILE, 'r', encoding='utf-8') as f:
                    try:
                        messages = json.load(f)
                    except json.JSONDecodeError:
                        messages = [] # Initialize as empty if file is corrupt/empty

            messages.append(new_message)

            with open(CONTACT_MESSAGES_FILE, 'w', encoding='utf-8') as f:
                json.dump(messages, f, indent=4, ensure_ascii=False)

            return jsonify({'success': True, 'message': 'Message sent successfully!'})

        except Exception as e:
            print(f"Error handling contact form submission: {e}")
            return jsonify({'success': False, 'message': 'An error occurred. Please try again.'}), 500

    # For GET requests to /contact, render the template
    return render_template('contact.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/compare')
def compare():
    return render_template('compare.html')

@app.route('/learn')
def learn():
    return render_template('learn.html')

if __name__ == '__main__':
    # Ensure the 'static/js' directory exists for results file
    os.makedirs(os.path.dirname(RESULTS_FILE), exist_ok=True)
    # Ensure the contact messages JSON file exists and is initialized
    if not os.path.exists(CONTACT_MESSAGES_FILE):
        with open(CONTACT_MESSAGES_FILE, 'w', encoding='utf-8') as f:
            json.dump([], f)
    app.run(debug=True)