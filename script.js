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
        drawCube(house.x, house.y, house.color);
    }
}

function drawCube(gx, gy, color) {
    const pos = gridToWorld(gx, gy);

    // We are at the center of the tile.
    // The cube's base should sit on the tile.
    // Tile center is at pos.y. Tile bottom is at pos.y + TILE_HEIGHT/2.
    // Actually, in isometric standard, the (x,y) usually refers to the 'center' of the footprint.
    // So visual center is correct.

    const x = pos.x;
    const y = pos.y; // Center of the tile footprint

    // Cube dimensions
    // We want the cube to almost fill the tile
    const margin = 5;
    const w = TILE_WIDTH;
    const h = TILE_HEIGHT;

    // Vertices relative to center (x, y)
    // Base diamond is same as tile

    // Top Face: Floating above the base by HOUSE_HEIGHT
    // Top-Center: (0, -HOUSE_HEIGHT)
    // But it's a diamond. 
    // Top of TopFace: (0, -H/2 - HOUSE_HEIGHT)
    // Bottom of TopFace: (0, H/2 - HOUSE_HEIGHT)
    // Left of TopFace: (-W/2, -HOUSE_HEIGHT)
    // Right of TopFace: (W/2, -HOUSE_HEIGHT)

    // Let's compute 7 key points
    // Center of base: (0, 0)
    // Top of base (back corner): (0, -h/2) -> B_Back
    // Right of base: (w/2, 0) -> B_Right
    // Bottom of base (front corner): (0, h/2) -> B_Front
    // Left of base: (-w/2, 0) -> B_Left

    // Corresponding top points (shifted up by HOUSE_HEIGHT)
    // T_Back, T_Right, T_Front, T_Left

    // We only need to draw 3 faces: Top, Front-Left, Front-Right

    const halfW = w / 2;
    const halfH = h / 2;
    const hh = HOUSE_HEIGHT;

    // Adjust spread for a smaller cube if desired, otherwise it touches edges
    const spread = 0.8;
    const sw = halfW * spread;
    const sh = halfH * spread;

    // Top Face Points (Diamond)
    const tTopY = y - sh - hh;
    const tRightX = x + sw;
    const tRightY = y - hh;
    const tBottomY = y + sh - hh;
    const tLeftX = x - sw;
    const tLeftY = y - hh;

    // Bottom Face Points (for side connection)
    const bRightY = y;
    const bBottomY = y + sh;
    const bLeftY = y;

    // Colors
    // We need to parse the hex color to darken it

    // Draw Top Face
    ctx.fillStyle = color; // or lighten(color)
    ctx.beginPath();
    ctx.moveTo(x, tTopY);
    ctx.lineTo(tRightX, tRightY);
    ctx.lineTo(x, tBottomY);
    ctx.lineTo(tLeftX, tLeftY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.stroke();

    // Draw Right Face (Right side of diamond down)
    ctx.fillStyle = adjustColor(color, -20); // Darker
    ctx.beginPath();
    ctx.moveTo(tRightX, tRightY);
    ctx.lineTo(tRightX, tRightY + hh); // Down to bottom right
    // Actually, bottom right is simply (x+sw, y) if we went straight down? 
    // No, isometric vertical lines are straight.
    // The bottom point corresponds to the base diamond right corner (x+sw, y).
    // Let's re-verify:
    // T_Right is (x+sw, y-hh). 
    // B_Right is (x+sw, y).
    // B_Bottom is (x, y+sh). T_Bottom is (x, y+sh-hh).

    ctx.lineTo(x, bBottomY);          // To Bottom Center
    ctx.lineTo(x, tBottomY);          // Up to Top Bottom Center
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw Left Face
    ctx.fillStyle = adjustColor(color, -40); // Even Darker
    ctx.beginPath();
    ctx.moveTo(tLeftX, tLeftY);
    ctx.lineTo(tLeftX, tLeftY + hh); // Down to base left
    ctx.lineTo(x, bBottomY);         // To Bottom Center
    ctx.lineTo(x, tBottomY);         // Up to Top Bottom Center
    ctx.closePath();
    ctx.fill();
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
