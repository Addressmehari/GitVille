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

    const winY = 0;
    const winZ = wallHeight / 2 + 2;
    const winW = 10; // Total Width
    const winH = 14; // Total Height
    const winX = hw + 0.2; // Surface

    // Frame
    drawRightRect(winX, winY, winZ, winW + 3, winH + 3, "#dfe6e9");

    // Glass Background
    drawRightRect(winX + 0.5, winY, winZ, winW, winH, "#74b9ff");

    // Muntins (Cross)
    const bar = 1.2;
    // Vertical
    drawRightRect(winX + 0.6, winY, winZ, bar, winH, "#dfe6e9");
    // Horizontal
    drawRightRect(winX + 0.6, winY, winZ, winW, bar, "#dfe6e9");

    // Sill
    const sillW = winW + 5;
    const sillH = 2;
    // Sill sticks out? We simulate by drawing a slightly larger/lower rect
    drawRightRect(winX + 1, winY, winZ - winH / 2 - 1, sillW, sillH, "#b2bec3");


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
    // Coordinates
    const dW = 6;
    const dH = 22;
    const dFrame = 1.5;
    const doory = hd + 0.5; // Surface of wall + epsilon

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
    const d_bl = toScreen(-dW, doory, 0);
    const d_br = toScreen(dW, doory, 0);
    const d_tr = toScreen(dW, doory, dH);
    const d_tl = toScreen(-dW, doory, dH);

    ctx.fillStyle = "#5d4037"; // Dark Wood
    ctx.beginPath();
    ctx.moveTo(d_bl.x, d_bl.y);
    ctx.lineTo(d_br.x, d_br.y);
    ctx.lineTo(d_tr.x, d_tr.y);
    ctx.lineTo(d_tl.x, d_tl.y);
    ctx.fill();
    ctx.stroke();

    // 3. Panels
    function drawPanel(lx, lz, w, h) {
        const p_bl = toScreen(lx - w / 2, doory, lz - h / 2);
        const p_br = toScreen(lx + w / 2, doory, lz - h / 2);
        const p_tr = toScreen(lx + w / 2, doory, lz + h / 2);
        const p_tl = toScreen(lx - w / 2, doory, lz + h / 2);

        ctx.fillStyle = "rgba(0,0,0,0.2)"; // Shadow inset
        ctx.beginPath();
        ctx.moveTo(p_bl.x, p_bl.y);
        ctx.lineTo(p_br.x, p_br.y);
        ctx.lineTo(p_tr.x, p_tr.y);
        ctx.lineTo(p_tl.x, p_tl.y);
        ctx.fill();
    }

    const panW = 2.5;
    const panH = 7;

    // Four Panels
    drawPanel(-dW / 2, 6, panW, panH);
    drawPanel(dW / 2, 6, panW, panH);
    drawPanel(-dW / 2, 16, panW, panH);
    drawPanel(dW / 2, 16, panW, panH);

    // Doorknob
    const kn = toScreen(dW - 2, doory, dH / 2);
    ctx.fillStyle = "#ffb142"; // Gold
    ctx.beginPath();
    ctx.arc(kn.x, kn.y, 1.5, 0, Math.PI * 2);
    ctx.fill();

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

    // --- Texture: Shingles ---
    // Interpolate curves to draw rows of shingles
    function getQuadPoint(p0, cp, p1, t) {
        const invT = 1 - t;
        return {
            x: invT * invT * p0.x + 2 * invT * t * cp.x + t * t * p1.x,
            y: invT * invT * p0.y + 2 * invT * t * cp.y + t * t * p1.y
        };
    }

    const rows = 8;
    const cols = 6;

    ctx.beginPath();
    // Use a lighter/darker stroke for shingles
    ctx.strokeStyle = adjustColor(roofColorMain, -15); // Subtle dark lines
    ctx.lineWidth = 1;

    for (let r = 0; r < rows; r++) {
        // t goes from 0 (Ridge) to 1 (Eave)
        const tVal = r / rows;
        const tNext = (r + 1) / rows;

        // Start and End points of this row (along the slope curves)
        const pStart = getQuadPoint(rBack, cpBack, eBackRight, tVal);
        const pEnd = getQuadPoint(rFront, cpFront, eFrontRight, tVal);

        const pStartNext = getQuadPoint(rBack, cpBack, eBackRight, tNext);
        const pEndNext = getQuadPoint(rFront, cpFront, eFrontRight, tNext);

        // Draw Shingles across the row (Back to Front)
        const rowWidthX = pEnd.x - pStart.x;
        const rowWidthY = pEnd.y - pStart.y;

        // Stagger rows
        const offset = (r % 2 === 0) ? 0 : 0.5;

        for (let c = 0; c < cols; c++) {
            // Normalized params for columns
            let ct = (c + offset) / cols;
            let ctNext = (c + offset + 1) / cols;

            // Clip to 0-1 to keep shingles ON the roof
            if (ct < 0) ct = 0;
            if (ctNext > 1) ctNext = 1;

            // If squashed too thin, skip
            if (ctNext <= ct) continue;

            // Linear iterp along the row line
            // Top of shingle
            const sx = pStart.x + rowWidthX * ct;
            const sy = pStart.y + rowWidthY * ct;

            const ex = pStart.x + rowWidthX * ctNext;
            const ey = pStart.y + rowWidthY * ctNext;

            // Bottom of shingle (approx based on next row)
            // We want a curve "U" shape or just lines?
            // "Real like" often implies actual tiles.
            // Let's draw arcs hanging down.

            // Midpoint for arc control
            const midX = (sx + ex) / 2;
            const midY = (sy + ey) / 2;

            // Determine "Height" of shingle on screen (distance to next row)
            // Approx next row y
            // Simple approach: Use vectors
            // Let's just draw small quadratic dips.

            const tileH = 6; // pixel height of tile visual

            ctx.moveTo(sx, sy);
            // Draw curve to (ex, ey) dipping by tileH
            ctx.quadraticCurveTo(midX, midY + tileH, ex, ey);
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

    // 9. Chimney (Small and cute)
    const cw = 5;
    const ch = 12;
    // Position on Right Slope
    const cPos = { lx: 10, ly: -5 }; // Moved down from 6 to 10
    // Z height on slope?
    // Slope goes from Z=wall (at x=rhw) to Z=wall+roof (at x=0).
    const slopeRatio = 1 - (cPos.lx / rhw);
    const cBaseZ = wallHeight + roofHeight * slopeRatio - 2; // Embed slightly

    const cb1 = toScreen(cPos.lx + cw, cPos.ly + cw, cBaseZ);
    const ct1 = toScreen(cPos.lx + cw, cPos.ly + cw, cBaseZ + ch);
    const ct2 = toScreen(cPos.lx + cw, cPos.ly - cw, cBaseZ + ch);
    const ct3 = toScreen(cPos.lx - cw, cPos.ly - cw, cBaseZ + ch);
    const ct4 = toScreen(cPos.lx - cw, cPos.ly + cw, cBaseZ + ch);

    // Side Face
    ctx.fillStyle = "#636e72";
    ctx.beginPath();
    ctx.moveTo(cb1.x, cb1.y);
    ctx.lineTo(toScreen(cPos.lx + cw, cPos.ly - cw, cBaseZ).x, toScreen(cPos.lx + cw, cPos.ly - cw, cBaseZ).y);
    ctx.lineTo(ct2.x, ct2.y);
    ctx.lineTo(ct1.x, ct1.y);
    ctx.fill();
    ctx.stroke();

    // Front Face
    ctx.fillStyle = "#b2bec3";
    ctx.beginPath();
    ctx.moveTo(cb1.x, cb1.y);
    ctx.lineTo(toScreen(cPos.lx - cw, cPos.ly + cw, cBaseZ).x, toScreen(cPos.lx - cw, cPos.ly + cw, cBaseZ).y);
    ctx.lineTo(ct4.x, ct4.y);
    ctx.lineTo(ct1.x, ct1.y);
    ctx.fill();
    ctx.stroke();

    // Top
    ctx.fillStyle = "#2d3436";
    ctx.beginPath();
    ctx.moveTo(ct1.x, ct1.y);
    ctx.lineTo(ct2.x, ct2.y);
    ctx.lineTo(ct3.x, ct3.y);
    ctx.lineTo(ct4.x, ct4.y);
    ctx.closePath();
    ctx.fill();



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
