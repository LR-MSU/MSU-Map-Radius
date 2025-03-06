importScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js',
    'https://cdn.jsdelivr.net/npm/rbush@4.0.1/rbush.min.js'
);

/**
 * Does the mathematics for the parameters.
 *
 * @param {MessageEvent} e - The message event containing data sent from the main thread.
 */
self.onmessage = function (e) {
    try {
        let {circleGeoJSONs, michiganBoundary} = e.data;

        function batchUnion(features, batchSize = 10) {
            let result = null;
            for (let i = 0; i < features.length; i += batchSize) {
                const batch = features.slice(i, i + batchSize);
                const batchUnion = batch.reduce((acc, feature) => acc ? turf.union(acc, feature) : feature, null);
                result = result ? turf.union(result, batchUnion) : batchUnion;
            }
            return result;
        }

        console.time("Union Processing");
        const unionedCircles = batchUnion(circleGeoJSONs, 10);
        console.timeEnd("Union Processing");

        let totalCircleArea = unionedCircles ? turf.area(unionedCircles) / 1e6 : 0; // Convert to km²
        let areaOutsideMap = 0;

        if (unionedCircles && michiganBoundary) {
            const areaOfUnionedCirclesOutsideMap = turf.difference(unionedCircles, michiganBoundary);
            if (areaOfUnionedCirclesOutsideMap) {
                areaOutsideMap = turf.area(areaOfUnionedCirclesOutsideMap) / 1e6;
            }
        }

        const finalNonOverlappingArea = totalCircleArea - areaOutsideMap;

        console.time("RBush Intersection Calculation");
        const tree = new RBush();
        circleGeoJSONs.forEach((circle, i) => {
            const bbox = turf.bbox(circle);
            tree.insert({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], id: i});
        });

        const circleIntersectionsInfo = [];
        circleGeoJSONs.forEach((circle, i) => {
            const bbox = turf.bbox(circle);
            const potentialIntersections = tree.search({
                minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]
            });

            potentialIntersections.forEach((candidate) => {
                if (candidate.id > i) {
                    const intersection = turf.intersect(circle, circleGeoJSONs[candidate.id]);
                    if (intersection) {
                        const intersectionArea = turf.area(intersection) / 1e6;
                        circleIntersectionsInfo.push({circle1: i, circle2: candidate.id, area: intersectionArea});
                    }
                }
            });
        });
        console.timeEnd("RBush Intersection Calculation");

        const totalIntersectionAreaBeforeUnioning = circleIntersectionsInfo.reduce((acc, intersectionInfo) => acc + intersectionInfo.area, 0);

        self.postMessage({
            type: 'results',
            results: {
                totalCircleArea,
                totalIntersectionAreaBeforeUnioning,
                areaOutsideMap,
                finalNonOverlappingArea
            }
        });
    } catch(err) {
        self.postMessage({
            type: 'log',
            message: err
        });
    }
};
