# MSU-Map-Radius

This extension plots current vs previous year locations on a map, and generates the area covered in the current year.

Instructions to use this map:

1. Download the Manifest.trex file
2. In a new sheet in Tableau, select the dropdown in the marks card. Select "+ Add Extension"
3. Select "Access Local Viz Extensions", and use the downloaded Manifest file.
4. Move your latitude and longitude fields to the corresponding New/Old options in the Marks card.
5. Place the location id (if applicable) on detail.
6. Create the parameters in the "parameters populated" section of this description as "float" data types. The names of the parameters must match the names listed below exactly for the number population to work.

Detailed features:
1. Calculates area covered in the current year, using a 20-mile radius around each point.
2. Parameters are populated with areas covered.
3. When one location is close to another (>= 5 miles), one is hidden for the purposes of the above calculations.

Parameters populated:
1. **FinalArea**
<br /> Area covered by map excluding overlaps, and area covered that goes outside the coast/Michigan. *This is likely the value you will need.*
2. **TotalArea**
<br /> Total area covered by all radius's, *including* overlaps.
2. **OverlapArea**
<br /> Amount of area that overlaps between the radius's of locations.
3. **OutsideMapArea**
<br /> Area covered that's outside the map.

**Please note**: All areas are in mi². The extension is not able to account for small lakes (all lakes smaller than, and including Houghton Lake, which are not part of the Great Lakes System), and will count them as a part of the land area covered.

For information, support, or changes, contact Luiz Ramos.