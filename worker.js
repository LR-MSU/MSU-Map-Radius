importScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js',
    'https://cdn.jsdelivr.net/npm/rbush@4.0.1/rbush.min.js'
);

self.onmessage = function (e) {
    let { circleGeoJSONs, michiganBoundary } = e.data;

    circleGeoJSONs = circleGeoJSONs.filter((circle, index, self) =>
        index === self.findIndex((c) => JSON.stringify(c) === JSON.stringify(circle))
    );

    let areaOutsideMap = 0;
    let circleIntersectionsInfo = [];

    // Union all circles
    let unionedCircles = circleGeoJSONs.reduce((acc, current, index) => {
        if (!acc) return current;
        return turf.union(acc, current);
    }, null);

    // Calculate the total area of all circles (including overlaps)
    let totalCircleArea = unionedCircles ? turf.area(unionedCircles) / 1e6 : 0;

    // Calculate the area of the unioned circles that extends beyond the map (state boundary)
    const areaOfUnionedCirclesOutsideMap = turf.difference(unionedCircles, michiganBoundary);
    if (areaOfUnionedCirclesOutsideMap) {
        areaOutsideMap = turf.area(areaOfUnionedCirclesOutsideMap) / 1e6;
    }

    // Calculate the non-overlapping area by subtracting the area outside the map
    const finalNonOverlappingArea = totalCircleArea - areaOutsideMap;

    // Output detailed intersection information
    console.time("RBush Intersection Calculation");
    const tree = new RBush();

    // Insert all circles into the RBush tree
    circleGeoJSONs.forEach((circle, i) => {
        const bbox = turf.bbox(circle);
        tree.insert({ minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], id: i });
    });

    // For each circle, check for intersections only with nearby circles using RBush
    circleGeoJSONs.forEach((circle, i) => {
        const bbox = turf.bbox(circle);
        const potentialIntersections = tree.search({
            minX: bbox[0],
            minY: bbox[1],
            maxX: bbox[2],
            maxY: bbox[3]
        });

        potentialIntersections.forEach((candidate) => {
            if (candidate.id > i) { // Ensure each pair is only checked once
                const intersection = turf.intersect(circle, circleGeoJSONs[candidate.id]);
                if (intersection) {
                    const intersectionArea = turf.area(intersection) / 1e6;
                    circleIntersectionsInfo.push({ circle1: i + 1, circle2: candidate.id + 1, area: intersectionArea });
                    //self.postMessage({ type: 'log', message: `Intersection between circle ${i + 1} and circle ${candidate.id + 1}: ${intersectionArea.toFixed(2)} km²` });
                }
            }
        });
    });
    console.timeEnd("RBush Intersection Calculation");

    // Output total area taken by intersections before unioning
    const totalIntersectionAreaBeforeUnioning = circleIntersectionsInfo.reduce((acc, intersectionInfo) => acc + intersectionInfo.area, 0);
    self.postMessage({ type: 'log', message: `Total area taken by circle intersections (before unioning): ${totalIntersectionAreaBeforeUnioning.toFixed(2)} km²` });

    // Output results
    self.postMessage({ type: 'log', message: `Total area of all circles (before subtracting overlaps and areas outside map): ${totalCircleArea.toFixed(2)} km²` });
    self.postMessage({ type: 'log', message: `Total unioned overlap area: ${totalIntersectionAreaBeforeUnioning.toFixed(2)} km²` });
    self.postMessage({ type: 'log', message: `Total area outside map: ${areaOutsideMap.toFixed(2)} km²` });
    self.postMessage({ type: 'log', message: `Total non-overlapping area inside the map (after subtracting overlaps and areas outside map): ${finalNonOverlappingArea.toFixed(2)} km²` });

    // Output detailed intersection information
    self.postMessage({ type: 'log', message: 'Detailed intersection information:' });
    self.postMessage({ type: 'log', message: `Area outside the map for all unioned circles: ${areaOutsideMap.toFixed(2)} km²` });


    // Log final result
    self.postMessage({ type: 'log', message: `Final area covered by circles after subtracting overlaps and areas outside the map: ${finalNonOverlappingArea.toFixed(2)} km²` });

    // Send results back to the main thread
    self.postMessage({
        type: 'results',
        results: {
            totalCircleArea,
            totalIntersectionAreaBeforeUnioning,
            areaOutsideMap,
            finalNonOverlappingArea
        }
    });
};
