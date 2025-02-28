importScripts('https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js', 'https://cdn.jsdelivr.net/npm/rbush@4.0.1/rbush.min.js');

self.onmessage = function (event) {

    const {circleCoordinates, dotCoordinates} = event.data;

    const hiddenCircleIndices = new Set();
    const hiddenDotIndices = new Set();
// 
    // Perform distance calculations to hide circles within 5 miles from eachother
    const PstartTime = performance.now()


    ///////////////////////////////////////Rank1/////////////////////////////
    const tree = new RBush();

    // // Insert all circles into RBush
    circleCoordinates.forEach((circle, index) => {
        const bbox = turf.bbox(turf.point([circle.lon, circle.lat])); // Get bounding box
        tree.insert({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], id: index});
    });
    circleCoordinates.forEach((circle, index) => {
        if (hiddenCircleIndices.has(index)) return;

        // Get the bounding box of the circle
        const bbox = turf.bbox(turf.buffer(turf.point([circle.lon, circle.lat]), 50, {units: 'miles'}));

        // Query RBush for nearby circles
        const nearbyCircles = tree.search({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]});

        nearbyCircles.forEach((neighbor) => {
            if (neighbor.id !== index && !hiddenCircleIndices.has(neighbor.id)) {
                const from = turf.point([circle.lon, circle.lat]);
                const to = turf.point([circleCoordinates[neighbor.id].lon, circleCoordinates[neighbor.id].lat]);
                const distance = turf.distance(from, to, {units: 'miles'});

                if (distance <= 50) {
                    hiddenCircleIndices.add(neighbor.id);
                }
            }
        });
    });


    // /////////////////////Rank 2/////////////////////////////////////
    // console.log("took circle length",circleCoordinates.length);
    // circleCoordinates.forEach((circleA, indexA) => {
    //     for (let indexB = indexA + 1; indexB < circleCoordinates.length; indexB++) {
    //         const circleB = circleCoordinates[indexB];

    //         const from = turf.point([circleA.lon, circleA.lat]);
    //         const to = turf.point([circleB.lon, circleB.lat]);
    //         const distance = turf.distance(from, to, { units: 'miles' });

    //         if (distance <= 5) {
    //             hiddenCircleIndices.add(indexB);
    //         }
    //     }
    // });


    //////////////////////////////OLD CODE////////////////////////////////////

    // circleCoordinates.forEach((circleA, indexA) => {
    //     if (hiddenCircleIndices.has(indexA)) return;

    //     circleCoordinates.forEach((circleB, indexB) => {
    //         if (indexA === indexB || hiddenCircleIndices.has(indexB)) return;

    //         const from = turf.point([circleA.lon, circleA.lat]);
    //         const to = turf.point([circleB.lon, circleB.lat]);
    //         const distance = turf.distance(from, to, { units: 'miles' });

    //         if (distance <= 5) {
    //             hiddenCircleIndices.add(indexB);
    //             console.log("distance", distance, indexB, indexA, circleA.lon, circleA.lat, circleB.lon, circleB.lat)
    //         }
    //     });
    // });

    const PendTime = performance.now();
    const executionTime = PendTime - PstartTime;
    console.log(`circleCoordinates.forEach in CircleWorker took ${executionTime} milliseconds to execute.`);


    //////////////////////////////
    const MstartTime = performance.now()
    console.log("took dot length", dotCoordinates.length);
    /////////////////////////Rank1 ///////////////////////////////////


    //  // Insert all dots into RBush for fast spatial lookups
    dotCoordinates.forEach((dot, index) => {
        const bbox = turf.bbox(turf.point([dot.lon2, dot.lat2]));
        tree.insert({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], id: index});
    });

    // Use a Typed Array for fast lookups instead of Set()


    // Array to store logs for batch logging
    const logMessages = [];

    // Optimized loop: Query only nearby dots using RBush
    dotCoordinates.forEach((dot, index) => {
        if (hiddenDotIndices[index]) return;

        // Get nearby dots (~5 miles radius)
        const bbox = turf.bbox(turf.buffer(turf.point([dot.lon2, dot.lat2]), 50, {units: 'miles'}));
        const nearbyDots = tree.search({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]});

        nearbyDots.forEach((neighbor) => {
            if (neighbor.id !== index && !hiddenDotIndices[neighbor.id]) {
                const from = turf.point([dot.lon2, dot.lat2]);
                const to = turf.point([dotCoordinates[neighbor.id].lon2, dotCoordinates[neighbor.id].lat2]);
                const distance = turf.distance(from, to, {units: 'miles'});

                if (distance <= 50) {
                    hiddenDotIndices[neighbor.id] = 1;
                    logMessages.push(`Hiding dot ${neighbor.id} (too close to ${index})`);
                }
            }
        });
    });
    ////////////////////////////Rank2/////////////////////////////////////////

    // dotCoordinates.forEach((circleA, indexA) => {
    //     if (hiddenDotIndices.has(indexA)) return;

    //     for (let indexB = indexA + 1; indexB < dotCoordinates.length; indexB++) {
    //         if (hiddenDotIndices.has(indexB)) continue;

    //         const circleB = dotCoordinates[indexB];

    //         const from = turf.point([circleA.lon2, circleA.lat2]);
    //         const to = turf.point([circleB.lon2, circleB.lat2]);
    //         const distance = turf.distance(from, to, { units: 'miles' });

    //         if (distance <= 5) {
    //             hiddenDotIndices.add(indexB);
    //         }
    //     }
    // });

    /////////////////////////OLD CODE///////////////////////////////////////////////////
    // dotCoordinates.forEach((circleA, indexA) => {
    //     if (hiddenDotIndices.has(indexA)) return;

    //     dotCoordinates.forEach((circleB, indexB) => {
    //         if (indexA === indexB || hiddenDotIndices.has(indexB)) return;

    //         const from = turf.point([circleA.lon2, circleA.lat2]);
    //         const to = turf.point([circleB.lon2, circleB.lat2]);
    //         const distance = turf.distance(from, to, { units: 'miles' });

    //         if (distance <= 5) {
    //             hiddenDotIndices.add(indexB);
    //         }
    //     });
    // });
    const MendTime = performance.now()
    const MexecutionTime = MendTime - MstartTime
    console.log(`dotCoordinates.forEach in CircleWorker took ${MexecutionTime} milliseconds to execute.`);


    // Send results back to the main thread
    self.postMessage({
        hiddenCircleIndices: Array.from(hiddenCircleIndices),
        hiddenDotIndices: Array.from(hiddenDotIndices),
    });
};

