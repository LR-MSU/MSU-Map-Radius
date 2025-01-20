importScripts('https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js');

self.onmessage = function (event) {
    const { circleCoordinates, dotCoordinates } = event.data;

    const hiddenCircleIndices = new Set();
    const hiddenDotIndices = new Set();

    // Perform distance calculations to hide circles within 5 miles from eachother
    circleCoordinates.forEach((circleA, indexA) => {
        if (hiddenCircleIndices.has(indexA)) return;

        circleCoordinates.forEach((circleB, indexB) => {
            if (indexA === indexB || hiddenCircleIndices.has(indexB)) return;

            const from = turf.point([circleA.lon, circleA.lat]);
            const to = turf.point([circleB.lon, circleB.lat]);
            const distance = turf.distance(from, to, { units: 'miles' });

            if (distance <= 5) {
                hiddenCircleIndices.add(indexB);
                console.log("distance", distance, indexB, indexA, circleA.lon, circleA.lat, circleB.lon, circleB.lat)
            }
        });
    });

    dotCoordinates.forEach((circleA, indexA) => {
        if (hiddenDotIndices.has(indexA)) return;

        dotCoordinates.forEach((circleB, indexB) => {
            if (indexA === indexB || hiddenDotIndices.has(indexB)) return;

            const from = turf.point([circleA.lon2, circleA.lat2]);
            const to = turf.point([circleB.lon2, circleB.lat2]);
            const distance = turf.distance(from, to, { units: 'miles' });

            if (distance <= 5) {
                hiddenDotIndices.add(indexB);
            }
        });
    });

    // Send results back to the main thread
    self.postMessage({
        hiddenCircleIndices: Array.from(hiddenCircleIndices),
        hiddenDotIndices: Array.from(hiddenDotIndices),
    });
};
