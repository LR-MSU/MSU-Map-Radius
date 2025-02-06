// Worker.js
importScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js',
    'https://cdn.jsdelivr.net/npm/rbush@4.0.1/rbush.min.js'
  );
  
  self.onmessage = function(e) {
    let { circleGeoJSONs, michiganBoundary } = e.data;
  
    function kmToMiles(km) {
      return km * 0.62137;
    }
  
    // Known area of Michigan in square miles
    const knownMichiganArea = 96713.51;
  
    console.log('=== Starting Area Calculations ===');
    console.log(`Number of circles to process: ${circleGeoJSONs.length}`);
  
    // Calculate area from GeoJSON boundary
    const calculatedMichiganArea = kmToMiles(turf.area(michiganBoundary) / 1e6);
    console.log(`Raw Michigan boundary area: ${calculatedMichiganArea.toFixed(2)} sq mi`);
  
    // Declare adjustment factor outside the block so it’s available later
    let areaAdjustmentFactor = 1;
    if (Math.abs(calculatedMichiganArea - knownMichiganArea) > 1000) {
      console.warn(`⚠️ Area Discrepancy Warning ⚠️`);
      console.warn(`Expected: ${knownMichiganArea.toFixed(2)} sq mi`);
      console.warn(`Calculated: ${calculatedMichiganArea.toFixed(2)} sq mi`);
      console.warn(`Difference: ${Math.abs(calculatedMichiganArea - knownMichiganArea).toFixed(2)} sq mi`);
  
      areaAdjustmentFactor = knownMichiganArea / calculatedMichiganArea;
      console.log(`Applying area adjustment factor: ${areaAdjustmentFactor.toFixed(4)}`);
    }
  
    // Remove duplicate circles (using JSON.stringify is not ideal for huge arrays, but works for now)
    const originalLength = circleGeoJSONs.length;
    circleGeoJSONs = circleGeoJSONs.filter((circle, index, self) =>
      index === self.findIndex((c) => JSON.stringify(c) === JSON.stringify(circle))
    );
    if (originalLength !== circleGeoJSONs.length) {
      console.log(`Removed ${originalLength - circleGeoJSONs.length} duplicate circles`);
    }
  
    let areaOutsideMap = 0;
    let circleIntersectionsInfo = [];
  
    // Calculate water bodies as the difference between the bounding box and Michigan’s boundary.
    const bboxPolygon = turf.bboxPolygon(turf.bbox(michiganBoundary));
    const waterBodies = turf.difference(bboxPolygon, michiganBoundary);
    const waterBodiesArea = waterBodies ? kmToMiles(turf.area(waterBodies) / 1e6) : 0;
    console.log(`Water bodies area: ${waterBodiesArea.toFixed(2)} sq mi`);
  
    // --- Step 1: Union all circles ---
    console.time('Union circles operation');
    let unionedCircles = null;
    if (circleGeoJSONs.length > 0) {
      // Instead of using reduce, loop through the array.
      unionedCircles = circleGeoJSONs[0];
      for (let i = 1; i < circleGeoJSONs.length; i++) {
        unionedCircles = turf.union(unionedCircles, circleGeoJSONs[i]);
      }
    }
    console.timeEnd('Union circles operation');
  
    // --- Step 2: Calculate total area of all circles (including overlaps) ---
    let totalCircleArea = unionedCircles ? kmToMiles(turf.area(unionedCircles) / 1e6) : 0;
    console.log(`Total raw circle area (before adjustments): ${totalCircleArea.toFixed(2)} sq mi`);
  
    // --- Step 3: Calculate area of unioned circles outside the Michigan boundary ---
    console.time('Outside area calculation');
    let areaOfUnionedCirclesOutsideMap = turf.difference(unionedCircles, michiganBoundary);
    if (areaOfUnionedCirclesOutsideMap) {
      // Optionally include water bodies in the outside area calculation
      let areaOutsideMapAndWater = waterBodies
        ? turf.union(areaOfUnionedCirclesOutsideMap, waterBodies)
        : areaOfUnionedCirclesOutsideMap;
      areaOutsideMap = kmToMiles(turf.area(areaOutsideMapAndWater) / 1e6);
      console.log(`Area outside map (including water): ${areaOutsideMap.toFixed(2)} sq mi`);
      console.log(`Area outside map (excluding water): ${kmToMiles(turf.area(areaOfUnionedCirclesOutsideMap) / 1e6).toFixed(2)} sq mi`);
    }
    console.timeEnd('Outside area calculation');
  
    // --- Step 4: Calculate non-overlapping area ---
    const rawNonOverlappingArea = kmToMiles(totalCircleArea - areaOutsideMap);
    console.log(`Raw non-overlapping area (before capping): ${rawNonOverlappingArea.toFixed(2)} sq mi`);
  
    const adjustedNonOverlappingArea = rawNonOverlappingArea * areaAdjustmentFactor;
    console.log(`Adjusted non-overlapping area: ${adjustedNonOverlappingArea.toFixed(2)} sq mi`);
  
    const finalNonOverlappingArea = Math.min(adjustedNonOverlappingArea, knownMichiganArea);
    if (adjustedNonOverlappingArea > knownMichiganArea) {
      console.warn(`⚠️ Area exceeded Michigan's total area by: ${(adjustedNonOverlappingArea - knownMichiganArea).toFixed(2)} sq mi`);
    }
  
    // --- RBush Intersection Calculation ---
    console.time("RBush Intersection Calculation");
    const tree = new RBush();
    // Pre-calculate bounding boxes for circles to avoid repeated Turf calls.
    const circleBBoxes = circleGeoJSONs.map(circle => turf.bbox(circle));
  
    circleGeoJSONs.forEach((circle, i) => {
      const bbox = circleBBoxes[i];
      tree.insert({ minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], id: i });
    });
  
    let totalIntersectionArea = 0;
    circleGeoJSONs.forEach((circle, i) => {
      const bbox = circleBBoxes[i];
      const potentialIntersections = tree.search({
        minX: bbox[0],
        minY: bbox[1],
        maxX: bbox[2],
        maxY: bbox[3]
      });
  
      potentialIntersections.forEach(candidate => {
        if (candidate.id > i) {
          const intersection = turf.intersect(circle, circleGeoJSONs[candidate.id]);
          if (intersection) {
            const intersectionArea = turf.area(intersection) / 1e6;
            totalIntersectionArea += intersectionArea;
            circleIntersectionsInfo.push({
              circle1: i + 1,
              circle2: candidate.id + 1,
              area: intersectionArea
            });
          }
        }
      });
    });
    console.timeEnd("RBush Intersection Calculation");
    console.log(`Total intersection area: ${kmToMiles(totalIntersectionArea).toFixed(2)} sq mi`);
  
    // Output total intersection area before unioning (if needed)
    const totalIntersectionAreaBeforeUnioning = kmToMiles(
      circleIntersectionsInfo.reduce((acc, info) => acc + info.area, 0)
    );
  
    console.log('=== Final Area Calculations ===');
    console.log(`1. Michigan's known area: ${knownMichiganArea.toFixed(2)} sq mi`);
    console.log(`2. Michigan's calculated area from GeoJSON: ${calculatedMichiganArea.toFixed(2)} sq mi`);
    console.log(`3. Total circle area (raw): ${totalCircleArea.toFixed(2)} sq mi`);
    console.log(`4. Total intersection area: ${totalIntersectionAreaBeforeUnioning.toFixed(2)} sq mi`);
    console.log(`5. Area outside map: ${areaOutsideMap.toFixed(2)} sq mi`);
    console.log(`6. Final covered area: ${finalNonOverlappingArea.toFixed(2)} sq mi`);
    console.log('===========================');
  
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
  