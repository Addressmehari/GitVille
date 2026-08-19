# GitVille Test Tracker

A quick checklist of what works and what still needs fixing in the project.

## Expected Working Plan Workflow
1. Read names from a local text file like test_names.txt.
2. Split the read text file into a clean list of individual usernames.
3. Hash usernames in Python to create stable color and architectural designs.
4. Calculate placement coordinates block-by-block for houses, roads, and trees.
5. Save the generated layout arrays to houses.json, roads.json, and world.json files.
6. Fetch the generated JSON files locally from the browser using JavaScript.
7. Map Cartesian grid coordinates from JSON to 2D isometric screen coordinates.
8. Set up mouse and touch listeners for camera panning, zooming, and clicking.
9. Render the ground tiles, roads, obstacles, and houses onto the HTML5 canvas.
10. Start the main update loop to animate the grass, clouds, rain, and citizens.


## House Builder
1. Read username text input
2. Create username hash in Python generator
3. Create username hash in JavaScript
4. Map hashes to color choices
5. Choose house style based on hash
6. Check if user merged a PR (for second floor)
7. Turn on second floor for PR contributors
8. Draw the main walls and side walls with shadows
9. Draw the second floor if it is unlocked
10. Put the front door on the bottom wall
11. Put the main window on the bottom wall
12. Put the extra window on the second floor
13. Put the chimney on the roof
14. Show smoke puffing out of the chimney
15. Draw wall patterns (lines, bricks, stones, vertical siding)
16. Draw the four roof styles (fish scales, flat brick, metal lines, zig-zags)
17. Draw the four window styles (double window, round circle, striped awning, flower box)
18. Draw the four door styles (standard wood panels, stone arch, glass door, double french doors)
19. Draw wooden boards on doors and windows for empty/abandoned houses
20. Draw sketchy/wobbly outlines for abandoned houses
21. Make the roofs sag on abandoned houses
22. Grid placement (no houses overlapping)

## Citizen NPC AI & Behaviors
1. Spawn citizens in random colors
2. Give them random speeds (fast or slow)
3. Simple AI movement (idle, walking, going home)
4. Calculate path towards their walk destination
5. Keep house citizens close to home (within 30 units)
6. Let street citizens wander the whole map (within 800 units)
7. Make their eyes look left or right based on which way they walk
8. Draw pink cheeks on their faces
9. Make them bounce up and down while walking
10. Start walking home when their timer runs out
11. Delete citizens once they reach their door
12. Make citizens walk behind houses instead of on top of roofs

## Trees & Environmental Details
1. Spawn trees as obstacles in empty slots
2. Keep tree spawn chance at 20%
3. Randomly size trees (small to large)
4. Sway trees back and forth to simulate wind
5. Make nearby trees sway at slightly different times
6. Draw the base of the tree trunk flared out
7. Draw tree shadows on the grass
8. Draw leaves in layers from back to front (bottom, middle, top)
9. Draw shadows inside leaf clusters
10. Draw highlights on the top of trees
11. Grow yellow flowers on 20% of the trees

## Weather & Time Cycles
1. Change background and grass colors for day and night
2. Turn on glowing yellow windows at night
3. Spawn falling rain drops when rain is on
4. Angle rain drops to show wind direction
5. Loop rain drops when they hit the bottom of the screen
6. Load weather settings from the configuration file

## Cloud System
1. Spawn clouds at the screen edges
2. Give clouds random heights in the sky
3. Build cloud shapes using overlapping circles
4. Randomly size clouds (small to large)
5. Drift clouds slowly from left to right
6. Draw dark green cloud shadows on the grass
7. Draw 3D shading on clouds (lighter on the top-left)
8. Delete clouds from memory when they go off screen

## Controls & Navigation
1. Drag to pan the camera map
2. Swipe to pan on mobile screens
3. Scroll wheel to zoom in and out
4. Pinch to zoom on mobile screens
5. Limit zoom levels (not too close, not too far)
6. Translate screen clicks to map grid coordinates
7. Show hover outlines on houses under the cursor
8. Show floating username tags above hovered houses
9. Point a floating arrow/ring helper at searched houses
10. Pan and zoom camera to the house when you search a citizen
11. Click a house to spawn a wandering citizen

## Backend, CLI & Python Script
1. Read input files with name lists
2. Handle names separated by commas
3. Handle names separated by new lines
4. Fetch stargazers from GitHub API
5. Fetch followers from GitHub API
6. Limit how many names are fetched via command arguments
7. Cache API results in case of connection dropouts
8. Detect end of pages when fetching from GitHub
9. Create the data directory if it is missing
10. Save house, road, and world data to JSON files
11. Build roads around blocks containing houses (Bug: makes roads for empty blocks)
12. Show warning popup when data files are missing

## UI, Styling & Optimization
1. Center the map canvas on load
2. Auto-resize map canvas when window size changes
3. Disable double-tap/pinch page scaling on mobile browsers
4. Show "Building City" loading screen during setup
5. Use timestamps in URLs to bypass browser cache
6. Show search bar input overlay
7. Show search result dropdown overlay
8. Show the core badge link in the footer

## Automation & Extra Features
1. Capture city snapshots to off-screen canvases
2. Download snapshots as image files
3. Export city maps as vector SVG files
4. Run GitHub Action scripts to auto-rebuild the city
5. Warn users when GitHub API rate limits are hit
6. Place the repository owner's house in the center (0,0)


