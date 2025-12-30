/**
 * GitVille Isometric Engine
 * Pure HTML5 Canvas + Vanilla JS
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for no transparency on bg

// --- Configuration ---
const TILE_SIZE = 64; // Base size of a tile side in pixels (before isometric projection)
// In 2:1 isometric, the width of the tile on screen is typically related to this.
// Let's say the sprite width is TILE_WIDTH.
// A common standard: TILE_WIDTH = 2 * TILE_HEIGHT.
const TILE_WIDTH = 100;
const TILE_HEIGHT = 50;
const HOUSE_HEIGHT = 60; // Height of the cube house

// Colors
const COLOR_GROUND_LIGHT = '#e8f5e9'; // Light checker pattern 1
const COLOR_GROUND_DARK = '#c8e6c9';  // Light checker pattern 2
const GRID_LINE_COLOR = 'rgba(0, 0, 0, 0.05)';
const HOUSE_SIDE_SHADE = 0.8; // Multiplier for side face
const HOUSE_TOP_SHADE = 1.0;  // Multiplier for top face
const HOUSE_FRONT_SHADE = 0.9; // Multiplier for front face

// --- State ---
let camera = {
    x: 0,
    y: 0,
    zoom: 1.0,
    minZoom: 0.5,
    maxZoom: 2.0
};

let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Touch state for pinch zoom
let initialPinchDistance = null;
let initialZoom = null;

// World Data
let houses = []; // Will be loaded from JSON

// --- Initialization ---
async function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    setupInputListeners();

    // Load data
    try {
        const response = await fetch('houses.json');
        houses = await response.json();
    } catch (e) {
        console.error("Failed to load houses.json", e);
        // Fallback data if file fetch fails (e.g. local file restriction)
        houses = [
            { x: 0, y: 0, color: "#ff6b6b" },
            { x: 2, y: 2, color: "#4ecdc4" }
        ];
    }

    requestAnimationFrame(render);
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // initial center if needed, but (0,0) is fine for now
}

// --- Input Handling ---
function setupInputListeners() {
    // Mouse
    canvas.addEventListener('mousedown', e => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => isDragging = false);

    window.addEventListener('mousemove', e => {
        if (!isDragging) return;
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;

        camera.x -= dx / camera.zoom;
        camera.y -= dy / camera.zoom;

        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });

    // Wheel Zoom
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;

        const oldZoom = camera.zoom;
        let newZoom = oldZoom + delta;
        newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, newZoom));

        // Zoom towards mouse pointer logic
        // World coordinates of mouse before zoom
        // Screen = (World - Camera) * Zoom + Center
        // World = (Screen - Center) / Zoom + Camera

        const screenX = e.clientX;
        const screenY = e.clientY;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const worldMouseX = (screenX - centerX) / oldZoom + camera.x;
        const worldMouseY = (screenY - centerY) / oldZoom + camera.y;

        camera.zoom = newZoom;

        // Adjust camera so worldMouse is still under screenMouse
        // worldMouse = (screen - center) / newZoom + newCamera
        // newCamera = worldMouse - (screen - center) / newZoom

        camera.x = worldMouseX - (screenX - centerX) / newZoom;
        camera.y = worldMouseY - (screenY - centerY) / newZoom;

    }, { passive: false });

    // Touch
    canvas.addEventListener('touchstart', e => {
        if (e.touches.length === 1) {
            isDragging = true;
            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            isDragging = false;
            initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
            initialZoom = camera.zoom;
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
        e.preventDefault(); // Prevent scrolling
        if (e.touches.length === 1 && isDragging) {
            const dx = e.touches[0].clientX - lastMouseX;
            const dy = e.touches[0].clientY - lastMouseY;

            camera.x -= dx / camera.zoom;
            camera.y -= dy / camera.zoom;

            lastMouseX = e.touches[0].clientX;
            lastMouseY = e.touches[0].clientY;
        } else if (e.touches.length === 2) {
            const currentDist = getDistance(e.touches[0], e.touches[1]);
            if (initialPinchDistance > 0) {
                const scale = currentDist / initialPinchDistance;
                let newZoom = initialZoom * scale;
                newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, newZoom));
                camera.zoom = newZoom;

                // Note: Pinch zoom to center could be improved here similarly to mouse wheel
            }
        }
    }, { passive: false });

    window.addEventListener('touchend', () => {
        isDragging = false;
        initialPinchDistance = null;
    });
}

function getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

// --- Core Math ---

// Convert Grid (iso) coords to World (screen-space-like 2D plane) coords
// Standard Isometric projection:
// x' = (x - y) * W/2
// y' = (x + y) * H/2
function gridToWorld(gridX, gridY) {
    return {
        x: (gridX - gridY) * (TILE_WIDTH / 2),
        y: (gridX + gridY) * (TILE_HEIGHT / 2)
    };
}

// Inverse: World to Grid
// Solving the system of equations above
function worldToGrid(worldX, worldY) {
    // worldX / (W/2) = x - y
    // worldY / (H/2) = x + y
    // let A = worldX / (W/2)
    // let B = worldY / (H/2)
    // 2x = A + B  => x = (A + B) / 2
    // 2y = B - A  => y = (B - A) / 2

    const halfW = TILE_WIDTH / 2;
    const halfH = TILE_HEIGHT / 2;
    const A = worldX / halfW;
    const B = worldY / halfH;

    return {
        x: (A + B) / 2,
        y: (B - A) / 2
    };
}


// --- Rendering ---
function render() {
    // 1. Clear background
    ctx.fillStyle = "#f0f4f8"; // matches CSS var
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Setup transform
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);

    // 3. Render Ground
    renderVisibleGrid();

    // 4. Render Houses
    renderHouses();

    ctx.restore();

    requestAnimationFrame(render);
}

function renderVisibleGrid() {
    // Determine visible world bounds to minimize drawing
    // This is an approximation. A robust solution projects screen corners to world space.

    // Screen boundaries in world space
    // We need to inverse project the screen corners to 'World Plane' (not Grid index yet)
    // Top-Left Screen (0,0) -> World
    // Bottom-Right Screen (W,H) -> World

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Screen corners relative to center
    const tlX = -centerX;
    const tlY = -centerY;
    const brX = centerX;
    const brY = centerY;

    // Transform to camera space
    // (ScreenPos / zoom) + cameraPos = WorldPos
    const worldLeft = (tlX / camera.zoom) + camera.x;
    const worldTop = (tlY / camera.zoom) + camera.y;
    const worldRight = (brX / camera.zoom) + camera.x;
    const worldBottom = (brY / camera.zoom) + camera.y;

    // Now convert these bounding box corners to Grid coordinates to find min/max Grid X/Y
    // Since isometric grid is rotated 45deg, the bounding box in grid space is also rotated.
    // We need to test all 4 corners to find min/max.

    const corners = [
        worldToGrid(worldLeft, worldTop),
        worldToGrid(worldRight, worldTop),
        worldToGrid(worldRight, worldBottom),
        worldToGrid(worldLeft, worldBottom)
    ];

    let minGridX = Infinity, maxGridX = -Infinity;
    let minGridY = Infinity, maxGridY = -Infinity;

    corners.forEach(p => {
        minGridX = Math.min(minGridX, p.x);
        maxGridX = Math.max(maxGridX, p.x);
        minGridY = Math.min(minGridY, p.y);
        maxGridY = Math.max(maxGridY, p.y);
    });

    // Add some padding to prevent popping at edges
    const startX = Math.floor(minGridX) - 2;
    const endX = Math.ceil(maxGridX) + 2;
    const startY = Math.floor(minGridY) - 2;
    const endY = Math.ceil(maxGridY) + 2;

    // Draw tiles
    ctx.lineWidth = 1;

    for (let gy = startY; gy <= endY; gy++) {
        for (let gx = startX; gx <= endX; gx++) {
            const worldPos = gridToWorld(gx, gy);

            // Checkboard pattern
            const isDark = (gx + gy) % 2 !== 0; // Simple parity check
            ctx.fillStyle = isDark ? COLOR_GROUND_DARK : COLOR_GROUND_LIGHT;

            // Draw Diamond path
            // Top: (0, -H/2)
            // Right: (W/2, 0)
            // Bottom: (0, H/2)
            // Left: (-W/2, 0)

            ctx.beginPath();
            ctx.moveTo(worldPos.x, worldPos.y - TILE_HEIGHT / 2);
            ctx.lineTo(worldPos.x + TILE_WIDTH / 2, worldPos.y);
            ctx.lineTo(worldPos.x, worldPos.y + TILE_HEIGHT / 2);
            ctx.lineTo(worldPos.x - TILE_WIDTH / 2, worldPos.y);
            ctx.closePath();

            ctx.fill();

            // Toggleable grid lines (drawing them always for now as they are subtle)
            ctx.strokeStyle = GRID_LINE_COLOR;
            ctx.stroke();

            // Debug coords
            // ctx.fillStyle = '#aaa';
            // ctx.font = '10px Arial';
            // ctx.fillText(`${gx},${gy}`, worldPos.x - 10, worldPos.y);
        }
    }
}

function renderHouses() {
    // Sort houses for painter's algorithm
    // In isometric, depth value is typically (x + y). 
    // Higher x + y means closer to the viewer (lower on screen)
    // So we render lower (x+y) first, and higher (x+y) last.

    const sortedHouses = [...houses].sort((a, b) => {
        return (a.x + a.y) - (b.x + b.y);
    });

    // We ideally should cull houses that are offscreen here too, 
    // but unless we have thousands, iterating is cheap. Drawing is the cost.

    for (const house of sortedHouses) {
        drawHouse(house.x, house.y, house.color);
    }
}

function drawHouse(gx, gy, color) {
    const pos = gridToWorld(gx, gy);
    const x = pos.x;
    const y = pos.y; // Center of the tile footprint

    // House Dimensions
    const spread = 0.8; // How much of the tile the house covers
    const w = TILE_WIDTH * spread;
    const h = TILE_HEIGHT * spread;

    // Wall Dimensions
    const wallHeight = 50;
    const roofHeight = 30;

    // Relative offsets for base corners (Ground)
    // 0: Top, 1: Right, 2: Bottom, 3: Left
    const hw = w / 2;
    const hh = h / 2;

    // Corners relative to (x,y)
    // T: (0, -hh), R: (hw, 0), B: (0, hh), L: (-hw, 0)

    // Screen coords for Ground Corners
    // Note: y is vertically centered. H is height of diamond.
    // So Top is y - hh, Bottom is y + hh
    const groundTop = { x: x, y: y - hh };
    const groundRight = { x: x + hw, y: y };
    const groundBottom = { x: x, y: y + hh };
    const groundLeft = { x: x - hw, y: y };

    // Eave Points (Top of walls) - shifted up by wallHeight
    const eaveTop = { x: groundTop.x, y: groundTop.y - wallHeight };
    const eaveRight = { x: groundRight.x, y: groundRight.y - wallHeight };
    const eaveBottom = { x: groundBottom.x, y: groundBottom.y - wallHeight };
    const eaveLeft = { x: groundLeft.x, y: groundLeft.y - wallHeight };

    // Ridge Points (Roof Peaks)
    // We will align the gable with the "Left" face (Bottom-Left in iso view).
    // This means the ridge runs from the center of the Left Face to the center of the Right Face? 
    // No, standard gable: Ridge runs parallel to one set of walls.
    // Let's make the Ridge run from "Front-Left Center" to "Back-Right Center".
    // Wait, ISO view:
    // "Left Face" is the wall between GroundLeft and GroundBottom.
    // "Right Face" is the wall between GroundBottom and GroundRight.

    // Configuration: Gable Triangle on the Left Face.
    // Ridge Start: Midpoint of EaveLeft and EaveBottom, shifted UP by roofHeight.
    const ridgeStartX = (eaveLeft.x + eaveBottom.x) / 2;
    const ridgeStartY = (eaveLeft.y + eaveBottom.y) / 2 - roofHeight;

    // Ridge End: Midpoint of EaveTop and EaveRight, shifted UP by roofHeight.
    const ridgeEndX = (eaveTop.x + eaveRight.x) / 2;
    const ridgeEndY = (eaveTop.y + eaveRight.y) / 2 - roofHeight;

    // --- Drawing ---

    // 1. Shadows (Optional, simple oval)
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Right Wall (Rectangular version)
    // Vertices: GroundBottom -> GroundRight -> EaveRight -> EaveBottom
    ctx.fillStyle = adjustColor(color, -40); // Darker shade
    ctx.beginPath();
    ctx.moveTo(groundBottom.x, groundBottom.y);
    ctx.lineTo(groundRight.x, groundRight.y);
    ctx.lineTo(eaveRight.x, eaveRight.y);
    ctx.lineTo(eaveBottom.x, eaveBottom.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Left Wall (Gable End)
    // Vertices: GroundLeft -> GroundBottom -> EaveBottom -> RidgeStart -> EaveLeft
    ctx.fillStyle = color; // Main color
    ctx.beginPath();
    ctx.moveTo(groundLeft.x, groundLeft.y);
    ctx.lineTo(groundBottom.x, groundBottom.y);
    ctx.lineTo(eaveBottom.x, eaveBottom.y);
    ctx.lineTo(ridgeStartX, ridgeStartY); // Peak
    ctx.lineTo(eaveLeft.x, eaveLeft.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Roof (Slope on the Right Side)
    // Vertices: RidgeStart -> RidgeEnd -> EaveRight -> EaveBottom
    // Use a standard roof color or a very dark version of house color
    const roofColor = "#455a64"; // Blue-Grey Roof
    // const roofColor = adjustColor(color, 40); // Or lighter version of house

    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(ridgeStartX, ridgeStartY);
    ctx.lineTo(ridgeEndX, ridgeEndY);
    ctx.lineTo(eaveRight.x, eaveRight.y);
    ctx.lineTo(eaveBottom.x, eaveBottom.y);
    ctx.closePath();
    ctx.fill();
    ctx.lineJoin = 'round'; // Soften spikes
    ctx.stroke();

    // 5. Door (On Gable End / Left Wall)
    // Centered on the Left Wall base line
    // Left Wall Base Line is from GroundLeft to GroundBottom
    const doorW = w * 0.15;
    const doorH = wallHeight * 0.5;

    // Midpoint of Base Left-Bottom
    const baseMidX = (groundLeft.x + groundBottom.x) / 2;
    const baseMidY = (groundLeft.y + groundBottom.y) / 2;

    // We need to move logic "along" the wall vector? 
    // Simple vertical door is fine, but perspective is better.
    // The wall baseline slopes down.
    // Door Bottom Left: Mid - delta
    // Door Bottom Right: Mid + delta

    const dx = (groundBottom.x - groundLeft.x) * 0.15; // Vector scale
    const dy = (groundBottom.y - groundLeft.y) * 0.15;

    const dblX = baseMidX - dx;
    const dblY = baseMidY - dy;
    const dbrX = baseMidX + dx;
    const dbrY = baseMidY + dy;

    // Door Top
    const dtlX = dblX;
    const dtlY = dblY - doorH;
    const dtrX = dbrX;
    const dtrY = dbrY - doorH;

    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.moveTo(dblX, dblY);
    ctx.lineTo(dbrX, dbrY);
    ctx.lineTo(dtrX, dtrY);
    ctx.lineTo(dtlX, dtlY);
    ctx.closePath();
    ctx.fill();

    // Frame
    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.stroke();

    // 6. Window (Circular or Rect on Right Wall)
    // Center of Right Wall: (GroundRight + GroundBottom + EaveRight + EaveBottom) / 4
    const rwCenterX = (groundRight.x + groundBottom.x + eaveRight.x + eaveBottom.x) / 4;
    const rwCenterY = (groundRight.y + groundBottom.y + eaveRight.y + eaveBottom.y) / 4;

    ctx.fillStyle = "#81ecec"; // Glassy
    ctx.beginPath();
    ctx.arc(rwCenterX, rwCenterY, wallHeight * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();

}

// Utility to darken/lighten hex color
function adjustColor(color, amount) {
    // Basic hex parsing
    let usePound = false;
    if (color[0] == "#") {
        color = color.slice(1);
        usePound = true;
    }
    let num = parseInt(color, 16);
    let r = (num >> 16) + amount;
    if (r > 255) r = 255; else if (r < 0) r = 0;

    let b = ((num >> 8) & 0x00FF) + amount;
    if (b > 255) b = 255; else if (b < 0) b = 0;

    let g = (num & 0x0000FF) + amount;
    if (g > 255) g = 255; else if (g < 0) g = 0;

    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
}

// Start
init();
