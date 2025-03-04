importScripts('https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js', 'https://cdn.jsdelivr.net/npm/rbush@4.0.1/rbush.min.js');

self.onmessage = function (event) {

    const {circleCoordinates, dotCoordinates} = event.data;

    const hiddenCircleIndices = new Set();
    const hiddenDotIndices = new Set();

    // Perform distance calculations to hide circles within 5 miles from eachother
    const PstartTime = performance.now()

    const tree = new RBush();

    // // Insert all circles into RBush
    circleCoordinates.forEach((circle, index) => {
        const bbox = turf.bbox(turf.point([circle.lon, circle.lat])); // Get bounding box
        tree.insert({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], id: index});
    });
    circleCoordinates.forEach((circle, index) => {
        if (hiddenCircleIndices.has(index)) return;

        // Get the bounding box of the circle
        const bbox = turf.bbox(turf.buffer(turf.point([circle.lon, circle.lat]), 5, {units: 'miles'}));

        // Query RBush for nearby circles
        const nearbyCircles = tree.search({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]});

        nearbyCircles.forEach((neighbor) => {
            if (neighbor.id !== index && !hiddenCircleIndices.has(neighbor.id)) {
                try {
                    const from = turf.point([circle.lon, circle.lat]);
                    const to = turf.point([circleCoordinates[neighbor.id].lon, circleCoordinates[neighbor.id].lat]);
                    const distance = turf.distance(from, to, {units: 'miles'});

                    if (distance <= 5) {
                        hiddenCircleIndices.add(neighbor.id);
                    }
                } catch (e) {
                    console.log("Error with circle buffer")
                }
            }
        });
    });

    const PendTime = performance.now();
    const executionTime = PendTime - PstartTime;
    console.log(`circleCoordinates.forEach in CircleWorker took ${executionTime} milliseconds to execute.`);

    const MstartTime = performance.now()

    // // Insert all dots into RBush
    dotCoordinates.forEach((dot, index) => {
        const bbox = turf.bbox(turf.point([dot.lon2, dot.lat2])); // Get bounding box
        tree.insert({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], id: index});
    });

    dotCoordinates.forEach((dot, index) => {
        if (hiddenDotIndices.has(index)) return;

        // Get the bounding box of the dots
        const bbox = turf.bbox(turf.buffer(turf.point([dot.lon2, dot.lat2]), 5, {units: 'miles'}));

        // Query RBush for nearby dots
        const nearbyDot = tree.search({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]});

        nearbyDot.forEach((neighbor) => {
            if (neighbor.id !== index && !hiddenDotIndices.has(neighbor.id)) {
                try {
                    const from = turf.point([dot.lon2, dot.lat2]);
                    const to = turf.point([dotCoordinates[neighbor.id].lon2, dotCoordinates[neighbor.id].lat2]);
                    const distance = turf.distance(from, to, {units: 'miles'});

                    if (distance <= 5) {
                        hiddenDotIndices.add(neighbor.id);
                    }
                } catch (e) {
                    console.log("Error with dot buffer")
                }
            }
        });
    });

    const MendTime = performance.now()
    const MexecutionTime = MendTime - MstartTime
    console.log(`dotCoordinates.forEach in CircleWorker took ${MexecutionTime} milliseconds to execute.`);

    // Send results back to the main thread
    self.postMessage({
        hiddenCircleIndices: Array.from(hiddenCircleIndices),
        hiddenDotIndices: Array.from(hiddenDotIndices),
    });
};

