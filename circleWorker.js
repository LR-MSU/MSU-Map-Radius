// circleWorker.js
importScripts(
    'https://cdnjs.cloudflare.com/ajax/libs/Turf.js/6.5.0/turf.min.js',
    'https://cdn.jsdelivr.net/npm/rbush@4.0.1/rbush.min.js'
  );
  
  self.onmessage = function(event) {
    const { circleCoordinates, dotCoordinates } = event.data;
  
    // Sets to store indices to hide
    const hiddenCircleIndices = new Set();
    const hiddenDotIndices = new Set();
  
    // Helper: approximate search box delta for 5 miles.
    // 1 degree latitude is roughly 69 miles.
    const milesToLatDegrees = miles => miles / 69;
  
    // Build a spatial index for circleCoordinates
    const circleTree = new RBush();
    circleCoordinates.forEach((pt, i) => {
      const lat = pt.lat;
      const lon = pt.lon;
      const deltaLat = milesToLatDegrees(5);
      // For longitude, adjust by cosine of the latitude (in radians)
      const deltaLon = 5 / (69 * Math.cos(lat * Math.PI / 180));
      circleTree.insert({
        minX: lon - deltaLon,
        minY: lat - deltaLat,
        maxX: lon + deltaLon,
        maxY: lat + deltaLat,
        id: i
      });
    });
  
    // For each circle point, query the spatial index for neighbors within the search box.
    circleCoordinates.forEach((pt, i) => {
      if (hiddenCircleIndices.has(i)) return;
  
      const lat = pt.lat;
      const lon = pt.lon;
      const deltaLat = milesToLatDegrees(5);
      const deltaLon = 5 / (69 * Math.cos(lat * Math.PI / 180));
      const searchBBox = {
        minX: lon - deltaLon,
        minY: lat - deltaLat,
        maxX: lon + deltaLon,
        maxY: lat + deltaLat
      };
  
      const neighbors = circleTree.search(searchBBox);
      neighbors.forEach(neighbor => {
        if (neighbor.id === i) return; // Skip self
        if (hiddenCircleIndices.has(neighbor.id)) return;
        // Only process each pair once
        if (neighbor.id > i) {
          const from = turf.point([lon, lat]);
          const to = turf.point([circleCoordinates[neighbor.id].lon, circleCoordinates[neighbor.id].lat]);
          const distance = turf.distance(from, to, { units: 'miles' });
          if (distance <= 5) {
            hiddenCircleIndices.add(neighbor.id);
          }
        }
      });
    });
  
    // Repeat a similar process for dotCoordinates (which use lon2/lat2)
    const dotTree = new RBush();
    dotCoordinates.forEach((pt, i) => {
      const lat = pt.lat2;
      const lon = pt.lon2;
      const deltaLat = milesToLatDegrees(5);
      const deltaLon = 5 / (69 * Math.cos(lat * Math.PI / 180));
      dotTree.insert({
        minX: lon - deltaLon,
        minY: lat - deltaLat,
        maxX: lon + deltaLon,
        maxY: lat + deltaLat,
        id: i
      });
    });
  
    dotCoordinates.forEach((pt, i) => {
      if (hiddenDotIndices.has(i)) return;
  
      const lat = pt.lat2;
      const lon = pt.lon2;
      const deltaLat = milesToLatDegrees(5);
      const deltaLon = 5 / (69 * Math.cos(lat * Math.PI / 180));
      const searchBBox = {
        minX: lon - deltaLon,
        minY: lat - deltaLat,
        maxX: lon + deltaLon,
        maxY: lat + deltaLat
      };
  
      const neighbors = dotTree.search(searchBBox);
      neighbors.forEach(neighbor => {
        if (neighbor.id === i) return;
        if (hiddenDotIndices.has(neighbor.id)) return;
        if (neighbor.id > i) {
          const from = turf.point([lon, lat]);
          const to = turf.point([dotCoordinates[neighbor.id].lon2, dotCoordinates[neighbor.id].lat2]);
          const distance = turf.distance(from, to, { units: 'miles' });
          if (distance <= 5) {
            hiddenDotIndices.add(neighbor.id);
          }
        }
      });
    });
  
    // Send results back to the main thread
    self.postMessage({
      hiddenCircleIndices: Array.from(hiddenCircleIndices),
      hiddenDotIndices: Array.from(hiddenDotIndices)
    });
  };
  