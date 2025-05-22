from flask import Flask, render_template, request, jsonify
from flask_cors import CORS

app = Flask(__name__, template_folder='templates')
CORS(app)

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

@app.route('/')
def index():
    return render_template('home.html')

@app.route('/simulator')
def simulator():
    return render_template('index.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/simulate', methods=['POST'])
def simulate():
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

    return jsonify({
        "reference_string": reference_string,
        "frame_count": frame_count,
        "page_faults": faults,
        "history": history,
        "algorithm": algorithm
    })

if __name__ == '__main__':
    app.run(debug=True)