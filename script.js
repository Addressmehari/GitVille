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
        drawHouse(house.x, house.y, house.color, house.roofStyle, house.doorStyle, house.windowStyle, house.chimneyStyle);
    }
}

function drawHouse(gx, gy, color, roofStyle, doorStyle, windowStyle, chimneyStyle) {
    const isoCenter = gridToWorld(gx, gy);

    function toScreen(lx, ly, lz) {
        // Simple projection reuse
        const sx = isoCenter.x + (lx - ly);
        const sy = isoCenter.y + (lx + ly) * 0.5 - lz;
        return { x: sx, y: sy };
    }

    // House Dimensions - "Less Wide"
    const hw = 16;  // Half-Width (Side to side relative to gable)
    const hd = 18;  // Half-Depth (Front to back)
    const wallHeight = 35;
    const roofHeight = 30; // Higher roof looks cozier
    const overhang = 4;    // Roof overhang magnitude (Key for 'good' look)

    // Colors
    const wallColor = "#fdfbf7";
    const wallShadow = "#e0dad1";
    const roofColorMain = adjustColor(color, -20);
    const roofColorDark = adjustColor(color, -40);
    const roofEdgeColor = adjustColor(color, -50);

    // --- Geometry Points ---

    // 1. Wall Ground Corners
    // Note: With rotation logic, let's say "Front" is +Y face (Bottom Left on screen)
    // "Side" is +X face (Bottom Right on screen)
    const b1 = toScreen(hw, hd, 0);   // Front-Bottom Corner
    const b2 = toScreen(hw, -hd, 0);  // Right-Bottom Corner
    const b3 = toScreen(-hw, -hd, 0); // Back-Bottom
    const b4 = toScreen(-hw, hd, 0);  // Left-Bottom

    // 2. Wall Top Corners
    const t1 = toScreen(hw, hd, wallHeight);
    const t2 = toScreen(hw, -hd, wallHeight);
    const t3 = toScreen(-hw, -hd, wallHeight);
    const t4 = toScreen(-hw, hd, wallHeight);

    // 3. Roof Geometry (With Overhangs)
    const rhw = hw + overhang; // Roof width radius
    const rhd = hd + overhang; // Roof depth radius

    // Ridge (Peak) - Centered X, runs along Y
    const rFront = toScreen(0, rhd, wallHeight + roofHeight);
    const rBack = toScreen(0, -rhd, wallHeight + roofHeight);

    // Eaves (Bottom corners of roof slope)
    const eFrontRight = toScreen(rhw, rhd, wallHeight);
    const eBackRight = toScreen(rhw, -rhd, wallHeight);
    const eFrontLeft = toScreen(-rhw, rhd, wallHeight);
    // eBackLeft not visible

    // --- Draw Cycle ---

    // 1. Shadow (Circular base shadow)
    ctx.fillStyle = "rgba(0,0,0,0.15)";
    ctx.beginPath();
    ctx.ellipse(isoCenter.x, isoCenter.y, hw * 1.5, hd * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Right Wall (+X facing) - The "Side" of the house
    // Let's add corner posts (trim) for better structure
    const trimW = 2; // Width of corner trim

    ctx.fillStyle = wallShadow;
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.stroke();

    // Right Wall Corner Trim (Right Edge)
    ctx.fillStyle = adjustColor(wallColor, -10); // Slightly distinct trim
    ctx.beginPath();
    ctx.moveTo(b2.x, b2.y); // Bottom Right
    ctx.lineTo(toScreen(hw - trimW, -hd, 0).x, toScreen(hw - trimW, -hd, 0).y); // In slightly
    ctx.lineTo(toScreen(hw - trimW, -hd, wallHeight).x, toScreen(hw - trimW, -hd, wallHeight).y); // Up
    ctx.lineTo(t2.x, t2.y); // Top Right
    ctx.fill();

    // Window on Right Wall
    // 1. Setup Helper for Right Wall Rects (facing +X)
    function drawRightRect(cx, cy, cz, w, h, color) {
        // Center (cx, cy, cz). Width w (along Y), Height h (along Z)
        // Rect on plane X = cx
        const y1 = cy - w / 2;
        const y2 = cy + w / 2;
        const z1 = cz - h / 2;
        const z2 = cz + h / 2;

        const p1 = toScreen(cx, y2, z1); // BL
        const p2 = toScreen(cx, y1, z1); // BR 
        const p3 = toScreen(cx, y1, z2); // TR
        const p4 = toScreen(cx, y2, z2); // TL

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
        // ctx.stroke(); // Optional stroke
    }

    const wStyle = (windowStyle !== undefined) ? windowStyle : 0;
    const winY = 0; // Centered on wall Y
    const winZ = wallHeight / 2 + 2;
    const winX = hw + 0.2; // Surface

    if (wStyle === 0) {
        // --- Style 0: Classic Muntins (Cross) ---
        const winW = 10;
        const winH = 14;

        // Frame
        drawRightRect(winX, winY, winZ, winW + 3, winH + 3, "#dfe6e9");
        // Glass Background
        drawRightRect(winX + 0.5, winY, winZ, winW, winH, "#74b9ff");
        // Muntins (Cross)
        const bar = 1.2;
        drawRightRect(winX + 0.6, winY, winZ, bar, winH, "#dfe6e9"); // Vert
        drawRightRect(winX + 0.6, winY, winZ, winW, bar, "#dfe6e9"); // Horz
        // Sill
        drawRightRect(winX + 1, winY, winZ - winH / 2 - 1, winW + 5, 2, "#b2bec3");

    } else if (wStyle === 1) {
        // --- Style 1: Arched Window ---
        const winW = 10;
        const winH = 16;
        const archStartH = 10; // Height of the rectangular part

        // 1. Frame
        const fW = winW + 3;
        const fRad = fW / 2;
        const fCenterY = winY;
        const fBaseZ = (winZ - winH / 2) + archStartH; // Z where arch starts
        const bottomZ = winZ - winH / 2;

        ctx.fillStyle = "#dfe6e9";
        ctx.beginPath();

        // Start Bottom-Left (Front side bottom)
        const p_bl = toScreen(winX, fCenterY + fRad, bottomZ);
        // Bottom-Right (Back side bottom)
        const p_br = toScreen(winX, fCenterY - fRad, bottomZ);
        // Top-Right (Back side start of arch)
        const p_tr = toScreen(winX, fCenterY - fRad, fBaseZ);

        ctx.moveTo(p_bl.x, p_bl.y);
        ctx.lineTo(p_br.x, p_br.y);
        ctx.lineTo(p_tr.x, p_tr.y);

        // Arch: From Back (-Y) to Front (+Y)
        // theta 0 -> Back (-radius), theta PI -> Front (+radius)
        // y = -cos(t) * r
        // z = sin(t) * r
        const steps = 16;
        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * Math.PI; // 0 to PI
            const ly = -Math.cos(t) * fRad;
            const lz = Math.sin(t) * fRad;
            const p = toScreen(winX, fCenterY + ly, fBaseZ + lz);
            ctx.lineTo(p.x, p.y);
        }

        // Close back to Bottom-Left
        ctx.lineTo(p_bl.x, p_bl.y);
        ctx.fill();

        // 2. Glass (Inset)
        const gW = winW;
        const gRad = gW / 2;
        const gBaseZ = fBaseZ; // Glass arch starts at same height relative to its rect
        // Actually, glass usually starts slightly higher? No, alignment is better.

        ctx.fillStyle = "#74b9ff";
        ctx.beginPath();

        const g_bl = toScreen(winX + 0.5, fCenterY + gRad, bottomZ + 1);
        const g_br = toScreen(winX + 0.5, fCenterY - gRad, bottomZ + 1);
        const g_tr = toScreen(winX + 0.5, fCenterY - gRad, gBaseZ);

        ctx.moveTo(g_bl.x, g_bl.y);
        ctx.lineTo(g_br.x, g_br.y);
        ctx.lineTo(g_tr.x, g_tr.y);

        for (let i = 0; i <= steps; i++) {
            const t = (i / steps) * Math.PI;
            const ly = -Math.cos(t) * gRad;
            const lz = Math.sin(t) * gRad;
            const p = toScreen(winX + 0.5, fCenterY + ly, gBaseZ + lz);
            ctx.lineTo(p.x, p.y);
        }

        ctx.lineTo(g_bl.x, g_bl.y);
        ctx.fill();

        // 3. Details: Keystone or Muntins?
        // Simple muntin bar
        drawRightRect(winX + 0.6, winY, winZ, 1.5, winH - 2, "#dfe6e9"); // Vertical bar
        // Horizontal bar at arch base
        drawRightRect(winX + 0.6, winY, fBaseZ, gW, 1.5, "#dfe6e9");


    } else if (wStyle === 2) {
        // --- Style 2: Canvas Awning Window ---
        const winW = 10;
        const winH = 12;

        // 1. Basic Window
        drawRightRect(winX, winY, winZ, winW, winH, "#b2bec3"); // Grey Frame
        drawRightRect(winX + 0.2, winY, winZ, winW - 2, winH - 2, "#81ecec"); // Glass

        // 2. Awning
        // Slopes down from Wall (Top of window + small gap) to Front-Out
        const awnW = winW + 4;
        const awnD = 5; // Sticks out
        const awnH = 4; // Drop height

        const topZ = winZ + winH / 2 + 1; // Wall attachment
        const botZ = topZ - awnH;         // Front edge height

        const wallY1 = winY + awnW / 2;
        const wallY2 = winY - awnW / 2;

        const outX = winX + awnD;
        // Front edge matches width
        const outY1 = wallY1;
        const outY2 = wallY2;

        // Points for Side Triangles (to draw later/under)
        const p_tl = toScreen(winX, wallY1, topZ); // Wall Top-Left (Front-ish)
        const p_fl = toScreen(outX, outY1, botZ);  // Out Front-Left
        const p_wall_bl = toScreen(winX, wallY1, botZ); // Wall Bottom-Left

        const p_tr = toScreen(winX, wallY2, topZ); // Wall Top-Right
        const p_fr = toScreen(outX, outY2, botZ);  // Out Front-Right
        const p_wall_br = toScreen(winX, wallY2, botZ); // Wall Bottom-Right

        // Draw Stripes (5 bands)
        const steps = 5;
        for (let i = 0; i < steps; i++) {
            // Alternating Red and White
            ctx.fillStyle = (i % 2 === 0) ? "#e17055" : "#dfe6e9";

            // Interpolate Y slice
            const t1 = i / steps;
            const t2 = (i + 1) / steps;

            const y_a = wallY1 + (wallY2 - wallY1) * t1;
            const y_b = wallY1 + (wallY2 - wallY1) * t2;

            // 4 points for the stripe quad
            const pa_wall = toScreen(winX, y_a, topZ);
            const pb_wall = toScreen(winX, y_b, topZ);
            const pb_front = toScreen(outX, y_b, botZ);
            const pa_front = toScreen(outX, y_a, botZ);

            ctx.beginPath();
            ctx.moveTo(pa_wall.x, pa_wall.y);
            ctx.lineTo(pb_wall.x, pb_wall.y);
            ctx.lineTo(pb_front.x, pb_front.y);
            ctx.lineTo(pa_front.x, pa_front.y);
            ctx.fill();
        }

        // Side Triangles (Fabric sides)
        ctx.fillStyle = "#d63031"; // Darker red for sides

        // Left Side (+Y side) - Visible
        ctx.beginPath();
        ctx.moveTo(p_tl.x, p_tl.y);
        ctx.lineTo(p_fl.x, p_fl.y);
        ctx.lineTo(p_wall_bl.x, p_wall_bl.y);
        ctx.fill();

        // Right Side (-Y side)
        ctx.beginPath();
        ctx.moveTo(p_tr.x, p_tr.y);
        ctx.lineTo(p_fr.x, p_fr.y);
        ctx.lineTo(p_wall_br.x, p_wall_br.y);
        ctx.fill();

        // Optional: Scalloped edge at bottom?
        // Keep it simple for now.

    } else {
        // --- Style 3: Flower Box ---
        const winW = 12;
        const winH = 12;

        // Window (Diamond Pattern?)
        drawRightRect(winX, winY, winZ, winW + 2, winH + 2, "#636e72"); // Dark Frame
        drawRightRect(winX + 0.5, winY, winZ, winW, winH, "#81ecec"); // Light Glass

        // Diamond Lead
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        const center = toScreen(winX + 0.6, winY, winZ);
        const top = toScreen(winX + 0.6, winY, winZ + winH / 2);
        const bot = toScreen(winX + 0.6, winY, winZ - winH / 2);
        const left = toScreen(winX + 0.6, winY + winW / 2, winZ);
        const right = toScreen(winX + 0.6, winY - winW / 2, winZ);
        ctx.moveTo(top.x, top.y); ctx.lineTo(left.x, left.y);
        ctx.lineTo(bot.x, bot.y); ctx.lineTo(right.x, right.y); ctx.lineTo(top.x, top.y);
        ctx.stroke();

        // Flower Box
        const boxH = 5;
        const boxD = 4; // Sticks out in X
        const boxZ = winZ - winH / 2 - boxH / 2 + 1;

        // We need to draw a generic box attached to the wall
        // Front face of box (at X = winX + boxD)
        drawRightRect(winX + boxD, winY, boxZ, winW + 4, boxH, "#8d6e63"); // Wood

        // Top "Soil"
        // Connect wall to front face top
        ctx.fillStyle = "#3e2723"; // Soil
        ctx.beginPath();
        const t1 = toScreen(winX, winY + (winW + 4) / 2, boxZ + boxH / 2);
        const t2 = toScreen(winX + boxD, winY + (winW + 4) / 2, boxZ + boxH / 2);
        const t3 = toScreen(winX + boxD, winY - (winW + 4) / 2, boxZ + boxH / 2);
        const t4 = toScreen(winX, winY - (winW + 4) / 2, boxZ + boxH / 2);
        ctx.moveTo(t1.x, t1.y); ctx.lineTo(t2.x, t2.y); ctx.lineTo(t3.x, t3.y); ctx.lineTo(t4.x, t4.y);
        ctx.fill();

        // Flowers/Greenery
        ctx.fillStyle = "#2ecc71"; // Green
        for (let i = 0; i < 3; i++) {
            const fx = winX + 2;
            const fy = winY - winW / 3 + i * (winW / 3);
            const fz = boxZ + boxH / 2 + 2;
            const p = toScreen(fx, fy, fz);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();

            // Red Flower
            if (i % 2 === 0) {
                ctx.fillStyle = "#e74c3c";
                ctx.beginPath();
                ctx.arc(p.x, p.y - 1, 1.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#2ecc71"; // Reset
            }
        }
    }


    // 3. Front Wall (+Y Face)
    ctx.fillStyle = wallColor;
    ctx.beginPath();
    ctx.moveTo(b4.x, b4.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(t4.x, t4.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Front Wall Trim (Corners)
    ctx.fillStyle = adjustColor(wallColor, -5);
    // Left Corner Trim
    ctx.beginPath();
    ctx.moveTo(b4.x, b4.y);
    ctx.lineTo(toScreen(-hw, hd - trimW, 0).x, toScreen(-hw, hd - trimW, 0).y);
    ctx.lineTo(toScreen(-hw, hd - trimW, wallHeight).x, toScreen(-hw, hd - trimW, wallHeight).y);
    ctx.lineTo(t4.x, t4.y);
    ctx.fill();

    // Foundation / Base Plinth
    // A dark band at the bottom of both visible walls
    const plinthH = 4;
    ctx.fillStyle = "#636e72"; // Grey Stone

    // Right Base
    ctx.beginPath();
    ctx.moveTo(b1.x, b1.y);
    ctx.lineTo(b2.x, b2.y);
    ctx.lineTo(toScreen(hw, -hd, plinthH).x, toScreen(hw, -hd, plinthH).y);
    ctx.lineTo(toScreen(hw, hd, plinthH).x, toScreen(hw, hd, plinthH).y);
    ctx.fill();

    // Front Base
    ctx.beginPath();
    ctx.moveTo(b4.x, b4.y);
    ctx.lineTo(b1.x, b1.y);
    ctx.lineTo(toScreen(hw, hd, plinthH).x, toScreen(hw, hd, plinthH).y);
    ctx.lineTo(toScreen(-hw, hd, plinthH).x, toScreen(-hw, hd, plinthH).y);
    ctx.fill();

    // Door on Front Wall
    const dStyle = (doorStyle !== undefined) ? doorStyle : 0;
    const dW = 6;
    const dH = 22;
    const dFrame = 1.5;
    const doory = hd + 0.5; // Surface of wall + epsilon

    // Helper to draw door rect
    function drawDoorRect(x, z, w, h, color, doStroke) {
        // x center, z bottom
        const p_bl = toScreen(x - w / 2, doory, z);
        const p_br = toScreen(x + w / 2, doory, z);
        const p_tr = toScreen(x + w / 2, doory, z + h);
        const p_tl = toScreen(x - w / 2, doory, z + h);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p_bl.x, p_bl.y);
        ctx.lineTo(p_br.x, p_br.y);
        ctx.lineTo(p_tr.x, p_tr.y);
        ctx.lineTo(p_tl.x, p_tl.y);
        ctx.fill();
        if (doStroke) {
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    if (dStyle === 0) {
        // --- Style 0: Classic Panelled ---
        // 1. Door Frame
        const df_bl = toScreen(-dW - dFrame, doory, 0);
        const df_br = toScreen(dW + dFrame, doory, 0);
        const df_tr = toScreen(dW + dFrame, doory, dH + dFrame);
        const df_tl = toScreen(-dW - dFrame, doory, dH + dFrame);

        ctx.fillStyle = "#dfe6e9"; // White/Grey Frame
        ctx.beginPath();
        ctx.moveTo(df_bl.x, df_bl.y);
        ctx.lineTo(df_br.x, df_br.y);
        ctx.lineTo(df_tr.x, df_tr.y);
        ctx.lineTo(df_tl.x, df_tl.y);
        ctx.fill();
        ctx.stroke();

        // 2. Door Leaf (Inset)
        drawDoorRect(0, 0, dW * 2, dH, "#5d4037"); // Dark Wood

        // 3. Panels
        const panW = 2.5;
        const panH = 7;
        const panColor = "rgba(0,0,0,0.3)";

        drawDoorRect(-dW / 2, 3, panW, panH, panColor);
        drawDoorRect(dW / 2, 3, panW, panH, panColor);
        drawDoorRect(-dW / 2, 12, panW, panH, panColor);
        drawDoorRect(dW / 2, 12, panW, panH, panColor);

        // Doorknob
        const kn = toScreen(dW - 2, doory, dH / 2);
        ctx.fillStyle = "#ffb142"; // Gold
        ctx.beginPath();
        ctx.arc(kn.x, kn.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

    } else if (dStyle === 1) {
        // --- Style 1: Arched / Round Top ---
        const archH = 16; // Height where arch starts
        const totalH = dH;

        // Frame Background
        const fw = dW + dFrame;
        const fh = dH + dFrame;

        ctx.fillStyle = "#b2bec3"; // Stone/Grey Frame
        ctx.beginPath();

        // Frame points
        const f_bl = toScreen(-fw, doory, 0);
        const f_br = toScreen(fw, doory, 0);
        const f_tr_start = toScreen(fw, doory, archH);

        ctx.moveTo(f_bl.x, f_bl.y);
        ctx.lineTo(f_br.x, f_br.y);
        ctx.lineTo(f_tr_start.x, f_tr_start.y);

        // Accurate Isometric Arch Trace
        const steps = 16;
        for (let i = 1; i <= steps; i++) {
            const t = (i / steps) * Math.PI; // 0 to PI
            const lx = Math.cos(t) * fw;
            const lz = Math.sin(t) * (totalH + 2 - archH);
            const p = toScreen(lx, doory, archH + lz);
            ctx.lineTo(p.x, p.y);
        }

        ctx.lineTo(f_bl.x, f_bl.y);
        ctx.fill();
        ctx.stroke();

        // Door Leaf
        ctx.fillStyle = "#6d4c41"; // Medium Wood Brown
        ctx.beginPath();
        const d_bl = toScreen(-dW, doory, 0);
        const d_br = toScreen(dW, doory, 0);
        const d_tr_start = toScreen(dW, doory, archH);

        ctx.moveTo(d_bl.x, d_bl.y);
        ctx.lineTo(d_br.x, d_br.y);
        ctx.lineTo(d_tr_start.x, d_tr_start.y);

        // Arch Trace for Door
        for (let i = 1; i <= steps; i++) {
            const t = (i / steps) * Math.PI;
            const lx = Math.cos(t) * dW;
            const lz = Math.sin(t) * (totalH - archH);
            const p = toScreen(lx, doory, archH + lz);
            ctx.lineTo(p.x, p.y);
        }

        ctx.lineTo(d_bl.x, d_bl.y);
        ctx.fill();

        // Vertical Planks
        ctx.strokeStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        for (let i = -1; i <= 1; i += 1) {
            if (i === 0) continue;
            const lx = i * (dW / 2);
            const p_bot = toScreen(lx, doory, 0);
            const p_top = toScreen(lx, doory, totalH - 1);
            ctx.moveTo(p_bot.x, p_bot.y);
            ctx.lineTo(p_top.x, p_top.y);
        }
        ctx.stroke();

        // Ring Handle
        const kn = toScreen(dW / 2, doory, dH / 2);
        ctx.fillStyle = "#2d3436";
        ctx.beginPath();
        ctx.arc(kn.x, kn.y, 2, 0, Math.PI * 2);
        ctx.fill();

    } else if (dStyle === 2) {
        // --- Style 2: Modern Glass ---
        // Dark minimal frame
        drawDoorRect(0, 0, dW * 2 + 2, dH + 1, "#2d3436");

        // Grey Door Leaf
        drawDoorRect(0, 0, dW * 2, dH, "#636e72");

        // Vertical Glass Insert
        drawDoorRect(0, 2, 4, dH - 4, "#81ecec");

        // Long Bar Handle
        const hVal = 12;
        const hBot = dH / 2 - 5;
        const hTop = dH / 2 + 5;
        const hX = dW - 2;

        const h_b = toScreen(hX, doory + 0.2, hBot);
        const h_t = toScreen(hX, doory + 0.2, hTop);

        ctx.strokeStyle = "#dfe6e9";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(h_b.x, h_b.y);
        ctx.lineTo(h_t.x, h_t.y);
        ctx.stroke();

    } else {
        // --- Style 3: Double French Glass Doors ---
        // Wide Frame (White/Grey)
        drawDoorRect(0, 0, dW * 2 + 2, dH + 1, "#b2bec3", true);

        // Split leaves (Left and Right)
        const leafW = dW - 0.2;
        // Left Leaf (White)
        drawDoorRect(-dW / 2, 0, leafW * 2, dH, "#ecf0f1", true);
        // Right Leaf (White)
        drawDoorRect(dW / 2, 0, leafW * 2, dH, "#ecf0f1", true);

        // Central seam
        ctx.strokeStyle = "#b2bec3";
        ctx.lineWidth = 1;
        const seamB = toScreen(0, doory + 0.1, 0);
        const seamT = toScreen(0, doory + 0.1, dH);
        ctx.beginPath();
        ctx.moveTo(seamB.x, seamB.y);
        ctx.lineTo(seamT.x, seamT.y);
        ctx.stroke();

        // Glass Panes (Grid on each door)
        // 2 cols x 3 rows per door
        const paneW = 2;
        const paneH = 4;
        const glassColor = "#81ecec";

        // Helper for panes
        function drawPanes(centerX) {
            for (let r = 0; r < 3; r++) {
                // Top half of door
                const pz = dH - 3 - (r * (paneH + 1));
                // Left col
                drawDoorRect(centerX - 1.5, pz, paneW, paneH, glassColor);
                // Right col
                drawDoorRect(centerX + 1.5, pz, paneW, paneH, glassColor);
            }
        }

        drawPanes(-dW / 2);
        drawPanes(dW / 2);

        // Handles (Two small knobs in center)
        const kh = dH / 2 - 2;
        const k1 = toScreen(-1, doory + 0.3, kh);
        const k2 = toScreen(1, doory + 0.3, kh);

        ctx.fillStyle = "#2d3436";
        ctx.beginPath();
        ctx.arc(k1.x, k1.y, 1, 0, Math.PI * 2);
        ctx.arc(k2.x, k2.y, 1, 0, Math.PI * 2);
        ctx.fill();
    }

    // 4. Gable Triangle (Wall material, flush with walls)
    // Runs from t4 to t1 to Peak(0, hd, wallHeight + roofHeight)
    // Wait, the peak of the wall is aligned with the wall plane y=hd.
    // The roof peak rFront is at y=rhd (overhanging). 
    // We need a Wall Peak at y=hd.
    const wallPeak = toScreen(0, hd, wallHeight + roofHeight);

    ctx.fillStyle = wallColor;
    ctx.beginPath();
    ctx.moveTo(t4.x, t4.y);
    ctx.lineTo(t1.x, t1.y);
    ctx.lineTo(wallPeak.x, wallPeak.y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Attic Window (Round)
    const awC = toScreen(0, hd + 0.5, wallHeight + roofHeight * 0.4);
    ctx.fillStyle = "#55efc4";
    ctx.beginPath();
    ctx.arc(awC.x, awC.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    // 5. Roof - Underside of Overhangs (Darker)
    // Visible on the front-right overhang area?
    // Front Overhang: rFront -> eFrontRight -> t1 -> wallPeak
    // Skipped for now.

    // 6. Main Roof Slope (Right Side)
    // Vertices: rFront -> rBack -> eBackRight -> eFrontRight

    // Helper to get midpoint dip
    function getCurveCP(p1, p2) {
        // Midpoint
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        // Dip amount 
        return { x: mx, y: my + 5 };
    }

    const cpBack = getCurveCP(rBack, eBackRight);

    // Note: Direction matters for consistency. Let's define curve from Ridge to Eave for both sides.
    // Front Edge: rFront -> eFrontRight.
    const cpFront = getCurveCP(rFront, eFrontRight);

    // Draw Base Fill First
    ctx.fillStyle = roofColorMain;
    ctx.beginPath();
    ctx.moveTo(rFront.x, rFront.y);
    ctx.lineTo(rBack.x, rBack.y);
    // Back Curve
    ctx.quadraticCurveTo(cpBack.x, cpBack.y, eBackRight.x, eBackRight.y);
    // Eave Line
    ctx.lineTo(eFrontRight.x, eFrontRight.y);
    // Front Curve (Reverse direction for shape closing: Eave -> Ridge)
    // cpFront is symmetric so it works, just traverse backwards
    ctx.quadraticCurveTo(cpFront.x, cpFront.y, rFront.x, rFront.y);

    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = roofEdgeColor;
    ctx.stroke();

    // --- Texture: Shingles / Patterns ---
    // Select variation based on parameter or position fallback
    const styleIndex = (roofStyle !== undefined) ? roofStyle : (Math.abs(gx + gy) % 4);

    // Interpolate curves helper
    function getQuadPoint(p0, cp, p1, t) {
        const invT = 1 - t;
        return {
            x: invT * invT * p0.x + 2 * invT * t * cp.x + t * t * p1.x,
            y: invT * invT * p0.y + 2 * invT * t * cp.y + t * t * p1.y
        };
    }

    ctx.beginPath();
    ctx.strokeStyle = adjustColor(roofColorMain, -15);
    ctx.lineWidth = 1;

    if (styleIndex === 0) {
        // --- Style 0: Scalloped (Fish Scale) ---
        const rows = 8;
        const cols = 6;
        for (let r = 0; r < rows; r++) {
            const tVal = r / rows;
            const tNext = (r + 1) / rows;
            const pStart = getQuadPoint(rBack, cpBack, eBackRight, tVal);
            const pEnd = getQuadPoint(rFront, cpFront, eFrontRight, tVal);
            const rowWidthX = pEnd.x - pStart.x;
            const rowWidthY = pEnd.y - pStart.y;
            const offset = (r % 2 === 0) ? 0 : 0.5;

            for (let c = 0; c < cols; c++) {
                let ct = (c + offset) / cols;
                let ctNext = (c + offset + 1) / cols;
                if (ct < 0) ct = 0;
                if (ctNext > 1) ctNext = 1;
                if (ctNext <= ct) continue;

                const sx = pStart.x + rowWidthX * ct;
                const sy = pStart.y + rowWidthY * ct;
                const ex = pStart.x + rowWidthX * ctNext;
                const ey = pStart.y + rowWidthY * ctNext;
                const midX = (sx + ex) / 2;
                const midY = (sy + ey) / 2;
                const tileH = 6;

                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo(midX, midY + tileH, ex, ey);
            }
        }
    } else if (styleIndex === 1) {
        // --- Style 1: Rectangular Slate / Bricks ---
        const rows = 8;
        const cols = 5;
        for (let r = 0; r < rows; r++) {
            const tVal = r / rows;
            const tNext = (r + 1) / rows; // Needed for slope direction

            const pStart = getQuadPoint(rBack, cpBack, eBackRight, tVal);
            const pEnd = getQuadPoint(rFront, cpFront, eFrontRight, tVal);

            // Calculate slope direction vector for seams
            const pStartNext = getQuadPoint(rBack, cpBack, eBackRight, tNext);
            let slopeDX = pStartNext.x - pStart.x;
            let slopeDY = pStartNext.y - pStart.y;
            const slopeLen = Math.sqrt(slopeDX * slopeDX + slopeDY * slopeDY);
            // Normalize and scale
            const tickLen = 5;
            const tickX = (slopeDX / slopeLen) * tickLen;
            const tickY = (slopeDY / slopeLen) * tickLen;

            const rowWidthX = pEnd.x - pStart.x;
            const rowWidthY = pEnd.y - pStart.y;
            const offset = (r % 2 === 0) ? 0 : 0.5;

            // Horizontal lines for rows
            ctx.moveTo(pStart.x, pStart.y);
            ctx.lineTo(pEnd.x, pEnd.y);

            // Vertical seams aligned with slope (not 90 degrees screen)
            for (let c = 0; c < cols; c++) {
                let ct = (c + offset) / cols;
                if (ct < 0 || ct > 1) continue;
                const sx = pStart.x + rowWidthX * ct;
                const sy = pStart.y + rowWidthY * ct;
                // Line down along slope
                ctx.moveTo(sx, sy);
                ctx.lineTo(sx + tickX, sy + tickY);
            }
        }
    } else if (styleIndex === 2) {
        // --- Style 2: Vertical Standing Seam (Metal) ---
        const cols = 7;
        for (let c = 0; c <= cols; c++) {
            const t = c / cols;
            // Line from Ridge to Eave interpolating the roof surface
            // We need to trace the surface curve at column t
            // Surface is defined by 2 curves: BackCurve and FrontCurve
            // We interpolate tween them.

            // Just drawing straight lines from Ridge to Eave is visibly wrong on a curved roof.
            // We need 3 points: Ridge, Mid, Eave for the seam.

            // Point on Ridge
            const ridgeP = {
                x: rBack.x + (rFront.x - rBack.x) * t,
                y: rBack.y + (rFront.y - rBack.y) * t
            };

            // Point on Eave
            const eaveP = {
                x: eBackRight.x + (eFrontRight.x - eBackRight.x) * t,
                y: eBackRight.y + (eFrontRight.y - eBackRight.y) * t
            };

            // Point on Control Curve (Connects cpBack to cpFront)
            const midCP = {
                x: cpBack.x + (cpFront.x - cpBack.x) * t,
                y: cpBack.y + (cpFront.y - cpBack.y) * t
            };

            ctx.moveTo(ridgeP.x, ridgeP.y);
            ctx.quadraticCurveTo(midCP.x, midCP.y, eaveP.x, eaveP.y);
        }
    } else {
        // --- Style 3: Sawtooth / Zig-Zag Slate ---
        const rows = 10; // Denser
        const cols = 8;
        for (let r = 0; r < rows; r++) {
            const tVal = r / rows;
            const pStart = getQuadPoint(rBack, cpBack, eBackRight, tVal);
            const pEnd = getQuadPoint(rFront, cpFront, eFrontRight, tVal);
            const rowWidthX = pEnd.x - pStart.x;
            const rowWidthY = pEnd.y - pStart.y;
            // Stagger rows
            const offset = (r % 2 === 0) ? 0 : 0.5;

            for (let c = 0; c < cols; c++) {
                let ct = (c + offset) / cols;
                let ctNext = (c + offset + 1) / cols;

                // Clip
                if (ct < 0) ct = 0;
                if (ctNext > 1) ctNext = 1;
                if (ctNext <= ct) continue;

                const sx = pStart.x + rowWidthX * ct;
                const sy = pStart.y + rowWidthY * ct;
                const ex = pStart.x + rowWidthX * ctNext;
                const ey = pStart.y + rowWidthY * ctNext;

                const midX = (sx + ex) / 2;
                const midY = (sy + ey) / 2;
                const tileH = 5;

                // Draw pointy triangle (V shape)
                ctx.moveTo(sx, sy);
                ctx.lineTo(midX, midY + tileH);
                ctx.lineTo(ex, ey);
            }
        }
    }

    ctx.stroke();

    // 7. Roof Thickness / Fascia (Right edge)
    ctx.fillStyle = roofColorDark;
    ctx.beginPath();
    ctx.moveTo(eFrontRight.x, eFrontRight.y);
    ctx.lineTo(eBackRight.x, eBackRight.y);
    // Drop down slighty for thickness
    const thick = 3;
    const eBackRightDown = { x: eBackRight.x, y: eBackRight.y + thick };
    const eFrontRightDown = { x: eFrontRight.x, y: eFrontRight.y + thick };
    ctx.lineTo(eBackRightDown.x, eBackRightDown.y);
    ctx.lineTo(eFrontRightDown.x, eFrontRightDown.y);
    ctx.closePath();
    ctx.fill();

    // 8. Front Eave / Gable Edge (Fascia Board)

    // We need to draw the "Face" of the board.
    // Top Edge is the Roof Line (Curved).
    // Bottom Edge is parallel to Top Edge, shifted down by 'fasciaHeight'.
    const fasciaHeight = 4;

    ctx.fillStyle = adjustColor(roofColorMain, -10);
    ctx.strokeStyle = roofEdgeColor;

    ctx.beginPath();

    // 1. Trace Top Edge (Left to Right)
    ctx.moveTo(eFrontLeft.x, eFrontLeft.y);
    const cpLeft = getCurveCP(eFrontLeft, rFront);
    ctx.quadraticCurveTo(cpLeft.x, cpLeft.y, rFront.x, rFront.y);

    const cpRight = getCurveCP(rFront, eFrontRight);
    ctx.quadraticCurveTo(cpRight.x, cpRight.y, eFrontRight.x, eFrontRight.y);

    // 2. Trace Right Side down
    ctx.lineTo(eFrontRight.x, eFrontRight.y + fasciaHeight);

    // 3. Trace Bottom Edge (Right to Left) - Reverse curves with Y shift
    const cpRightBottom = { x: cpRight.x, y: cpRight.y + fasciaHeight };
    const rFrontBottom = { x: rFront.x, y: rFront.y + fasciaHeight };
    const cpLeftBottom = { x: cpLeft.x, y: cpLeft.y + fasciaHeight };
    const eFrontLeftBottom = { x: eFrontLeft.x, y: eFrontLeft.y + fasciaHeight };

    ctx.quadraticCurveTo(cpRightBottom.x, cpRightBottom.y, rFrontBottom.x, rFrontBottom.y);
    ctx.quadraticCurveTo(cpLeftBottom.x, cpLeftBottom.y, eFrontLeftBottom.x, eFrontLeftBottom.y);

    // 4. Close Left Side
    ctx.lineTo(eFrontLeft.x, eFrontLeft.y);

    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 9. Chimney
    const cStyle = (chimneyStyle !== undefined) ? chimneyStyle : 0;

    if (cStyle !== 0) {
        let cw, ch, cPos, cColorMain, cColorSide, cColorTop;
        // Texturing flags
        let doBricks = false;
        let doStones = false;
        let doCap = false;

        if (cStyle === 1) {
            // --- Style 1: Classic Stone with Flue ---
            cw = 4; // reduced from 5
            ch = 12; // reduced from 14
            cPos = { lx: 10, ly: -5 };
            cColorMain = "#7f8c8d"; // Concrete
            cColorSide = "#556068";
            cColorTop = "#95a5a6";
            doCap = true;

        } else if (cStyle === 2) {
            // --- Style 2: Industrial Brick with Stone Cap ---
            cw = 4; // reduced from 5
            ch = 18; // reduced from 20
            cPos = { lx: 8, ly: -6 };
            cColorMain = "#a04000"; // Darker Burnt Orange/Brown
            cColorSide = "#6e2c00"; // Dark contrast side
            cColorTop = "#d35400";
            doBricks = true;
            doCap = true; // Add cap for stone finish
        } else if (cStyle === 3) {
            // --- Style 3: Creative Cottage (Double Pot) ---
            cw = 6; // reduced from 7
            ch = 7; // reduced from 8
            cPos = { lx: 10, ly: -4 };
            cColorMain = "#95a5a6"; // Stone Grey
            cColorSide = "#7f8c8d";
            cColorTop = "#bdc3c7"; // Light stone top
            doStones = true; // Keep stone texture on base
        }

        // --- Slanted Base Logic ---
        function getRoofH(lx) {
            const ratio = 1 - (Math.abs(lx) / rhw);
            return wallHeight + roofHeight * ratio - 2;
        }

        const xInner = cPos.lx - cw;
        const xOuter = cPos.lx + cw;
        const yFront = cPos.ly + cw;
        const yBack = cPos.ly - cw;

        const zInner = getRoofH(xInner);
        const zOuter = getRoofH(xOuter);
        const zCenterBase = getRoofH(cPos.lx);

        let zTop = zCenterBase + ch;
        if (doCap) zTop -= 2; // Reserve space for cap

        // Vertices for Main Shaft
        // Front Face (+Y)
        const p_tf_tl = toScreen(xInner, yFront, zTop);
        const p_tf_tr = toScreen(xOuter, yFront, zTop);
        const p_tf_br = toScreen(xOuter, yFront, zOuter);
        const p_tf_bl = toScreen(xInner, yFront, zInner);

        // Side Face (+X)
        const p_sf_tr = toScreen(xOuter, yBack, zTop);
        const p_sf_br = toScreen(xOuter, yBack, zOuter);

        // Top Points (for Top Face or Cap Base)
        const p_top_bl = toScreen(xInner, yBack, zTop);


        // 1. Draw Side Face (+X)
        ctx.fillStyle = cColorSide;
        ctx.beginPath();
        ctx.moveTo(p_tf_tr.x, p_tf_tr.y);
        ctx.lineTo(p_sf_tr.x, p_sf_tr.y);
        ctx.lineTo(p_sf_br.x, p_sf_br.y);
        ctx.lineTo(p_tf_br.x, p_tf_br.y);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(0,0,0,0.1)";
        ctx.stroke();

        // 2. Draw Front Face (+Y)
        ctx.fillStyle = cColorMain;
        ctx.beginPath();
        ctx.moveTo(p_tf_tl.x, p_tf_tl.y);
        ctx.lineTo(p_tf_tr.x, p_tf_tr.y);
        ctx.lineTo(p_tf_br.x, p_tf_br.y);
        ctx.lineTo(p_tf_bl.x, p_tf_bl.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // --- Textures ---
        if (doBricks) {
            ctx.strokeStyle = "rgba(255,255,255,0.3)"; // Lighter Mortar
            ctx.lineWidth = 1;
            const brickH = 4;

            // Calc constants for inverse roof height (Slope)
            const h_peak = wallHeight + roofHeight - 2;
            const slope = roofHeight / rhw; // drop per unit x

            // Draw lines on Front Face (+Y, vary X) and Side Face (+X, vary Y)
            // Start from zTop go down
            for (let z = zTop - brickH; z > zOuter + 0.5; z -= brickH) {
                // Front Face Line (Along X)
                // CLIPPING: The bottom edge is diagonal from (xInner, zInner) to (xOuter, zOuter).
                // If z < zInner, the wall starts at x > xInner.

                let bxStart = xInner;
                if (z < zInner) {
                    // z = h_peak - slope * x  =>  x = (h_peak - z) / slope
                    bxStart = (h_peak - z) / slope;
                    // Safety clamp
                    if (bxStart < xInner) bxStart = xInner;
                }

                // If our start point is beyond the outer edge, don't draw (shouldn't happen with z > zOuter)
                if (bxStart < xOuter) {
                    ctx.beginPath();
                    const b_start = toScreen(bxStart, yFront, z);
                    const b_end = toScreen(xOuter, yFront, z);
                    ctx.moveTo(b_start.x, b_start.y);
                    ctx.lineTo(b_end.x, b_end.y);
                    ctx.stroke();
                }

                // Side Face Line (Along Y)
                // Side face bottom is flat at zOuter, so just check z > zOuter
                if (z > zOuter) {
                    ctx.beginPath();
                    const s_start = toScreen(xOuter, yFront, z);
                    const s_end = toScreen(xOuter, yBack, z);
                    ctx.moveTo(s_start.x, s_start.y);
                    ctx.lineTo(s_end.x, s_end.y);
                    ctx.stroke();
                }
            }
        }



        // --- Cap / Top Logic ---
        if (doCap) {
            // Draw a wider, short box on top
            const capOut = 1.5;
            const capH = 2;
            const czBot = zTop;
            const czTop = zTop + capH;

            // Cap Coords
            const cx1 = xInner - capOut;
            const cx2 = xOuter + capOut;
            const cy1 = yFront + capOut;
            const cy2 = yBack - capOut;

            // Helper to draw Cap Prism
            const c_fl_bot = toScreen(cx1, cy1, czBot);
            const c_fr_bot = toScreen(cx2, cy1, czBot);
            const c_fr_top = toScreen(cx2, cy1, czTop);
            const c_fl_top = toScreen(cx1, cy1, czTop);
            const c_br_top = toScreen(cx2, cy2, czTop);
            const c_bl_top = toScreen(cx1, cy2, czTop);
            const c_br_bot = toScreen(cx2, cy2, czBot);

            // Cap Front
            ctx.fillStyle = adjustColor(cColorMain, 10);
            ctx.beginPath();
            ctx.moveTo(c_fl_bot.x, c_fl_bot.y); ctx.lineTo(c_fr_bot.x, c_fr_bot.y);
            ctx.lineTo(c_fr_top.x, c_fr_top.y); ctx.lineTo(c_fl_top.x, c_fl_top.y);
            ctx.fill(); ctx.stroke();

            // Cap Side
            ctx.fillStyle = adjustColor(cColorSide, 10);
            ctx.beginPath();
            ctx.moveTo(c_fr_bot.x, c_fr_bot.y); ctx.lineTo(c_br_bot.x, c_br_bot.y);
            ctx.lineTo(c_br_top.x, c_br_top.y); ctx.lineTo(c_fr_top.x, c_fr_top.y);
            ctx.fill(); ctx.stroke();

            // Cap Top
            ctx.fillStyle = cColorTop;
            ctx.beginPath();
            ctx.moveTo(c_fl_top.x, c_fl_top.y); ctx.lineTo(c_fr_top.x, c_fr_top.y);
            ctx.lineTo(c_br_top.x, c_br_top.y); ctx.lineTo(c_bl_top.x, c_bl_top.y);
            ctx.closePath();
            ctx.fill();

        } else {
            // Standard Top Face
            ctx.fillStyle = cColorTop;
            ctx.beginPath();
            ctx.moveTo(p_tf_tl.x, p_tf_tl.y);
            ctx.lineTo(p_tf_tr.x, p_tf_tr.y);
            ctx.lineTo(p_sf_tr.x, p_sf_tr.y);
            ctx.lineTo(p_top_bl.x, p_top_bl.y);
            ctx.closePath();
            ctx.fill();
        }

        // Decoration: Style 1 Flue Box
        if (cStyle === 1) {
            // Rectangular Flue Liner sticking out
            const fH = 2.5;
            const fW = 2; // Reduced from 2.5
            const fBase = zTop + 2;

            const fColor = "#e17055"; // Clay

            // Box
            const fx1 = cPos.lx - fW;
            const fx2 = cPos.lx + fW;
            const fy1 = cPos.ly + fW;
            const fy2 = cPos.ly - fW;

            const fl_fl_bot = toScreen(fx1, fy1, fBase);
            const fl_fr_bot = toScreen(fx2, fy1, fBase);
            const fl_fl_top = toScreen(fx1, fy1, fBase + fH);
            const fl_fr_top = toScreen(fx2, fy1, fBase + fH);

            const fl_br_bot = toScreen(fx2, fy2, fBase);
            const fl_br_top = toScreen(fx2, fy2, fBase + fH);
            const fl_bl_top = toScreen(fx1, fy2, fBase + fH);

            // Front
            ctx.fillStyle = fColor;
            ctx.beginPath();
            ctx.moveTo(fl_fl_bot.x, fl_fl_bot.y); ctx.lineTo(fl_fr_bot.x, fl_fr_bot.y);
            ctx.lineTo(fl_fr_top.x, fl_fr_top.y); ctx.lineTo(fl_fl_top.x, fl_fl_top.y);
            ctx.fill();

            // Side
            ctx.fillStyle = adjustColor(fColor, -15);
            ctx.beginPath();
            ctx.moveTo(fl_fr_bot.x, fl_fr_bot.y); ctx.lineTo(fl_br_bot.x, fl_br_bot.y);
            ctx.lineTo(fl_br_top.x, fl_br_top.y); ctx.lineTo(fl_fr_top.x, fl_fr_top.y);
            ctx.fill();

            // Top rim/hole
            ctx.fillStyle = "#2d3436";
            ctx.beginPath();
            ctx.moveTo(fl_fl_top.x, fl_fl_top.y); ctx.lineTo(fl_fr_top.x, fl_fr_top.y);
            ctx.lineTo(fl_br_top.x, fl_br_top.y); ctx.lineTo(fl_bl_top.x, fl_bl_top.y);
            ctx.fill();

            // Rim highlight
            ctx.strokeStyle = adjustColor(fColor, 20);
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(fl_fl_top.x, fl_fl_top.y); ctx.lineTo(fl_fr_top.x, fl_fr_top.y);
            ctx.lineTo(fl_br_top.x, fl_br_top.y); ctx.lineTo(fl_bl_top.x, fl_bl_top.y);
            ctx.closePath();
            ctx.stroke();
        }

        // Decoration: Pot for Style 2
        if (cStyle === 2) {
            const potBaseZ = doCap ? (zTop + 2) : zTop;
            const potC = toScreen(cPos.lx, cPos.ly, potBaseZ);
            ctx.fillStyle = "#e67e22";
            ctx.beginPath();
            ctx.ellipse(potC.x, potC.y, 3, 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Pot Rim/Hole
            ctx.fillStyle = "#d35400";
            ctx.beginPath();
            ctx.ellipse(potC.x, potC.y, 1.5, 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // Decoration: Double Pots for Style 3 (Creative Cottage)
        if (cStyle === 3) {
            // 1. Two Chimney Pots
            const potH = 8; // Reduced height
            const potRad = 2; // Reduced radius
            const potColor = "#e67e22";

            // Positions on the flat top
            const pot1Pos = { x: cPos.lx - 2, y: cPos.ly };
            const pot2Pos = { x: cPos.lx + 2, y: cPos.ly };

            [pot1Pos, pot2Pos].forEach(pos => {
                const b = toScreen(pos.x, pos.y, zTop);
                // Draw Cylinder
                const t = toScreen(pos.x, pos.y, zTop + potH);

                // Body (Simple Rect for iso cylinder)
                // const w = potRad * 2; 
                ctx.fillStyle = potColor;
                ctx.beginPath();
                // Bottom is ellipse-ish... just draw box for now essentially
                const b_l = toScreen(pos.x, pos.y + potRad, zTop);
                const b_r = toScreen(pos.x, pos.y - potRad, zTop);
                const t_r = toScreen(pos.x, pos.y - potRad, zTop + potH);
                const t_l = toScreen(pos.x, pos.y + potRad, zTop + potH);

                ctx.moveTo(b_l.x, b_l.y); ctx.lineTo(b_r.x, b_r.y);
                ctx.lineTo(t_r.x, t_r.y); ctx.lineTo(t_l.x, t_l.y);
                ctx.fill();

                // Rim
                ctx.fillStyle = "#d35400"; // Darker rim
                ctx.beginPath();
                ctx.ellipse(t.x, t.y, 3, 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
                // Hole
                ctx.fillStyle = "#2d3436";
                ctx.beginPath();
                ctx.ellipse(t.x, t.y, 1.5, 0.8, 0, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }



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
