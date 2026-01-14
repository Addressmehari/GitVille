const fs = require('fs');
const vm = require('vm');

// 1. Mock Browser Environment
const window = {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {},
    requestAnimationFrame: () => {}
};

// 2. Mock Canvas Context
class SVGContext {
    constructor() {
        this.svgBuffer = [];
        this.currentPath = [];
        this.fillStyle = "#000000";
        this.strokeStyle = "#000000";
        this.lineWidth = 1;
        this.lineCap = 'butt';
        this.lineJoin = 'miter';
        this.globalAlpha = 1.0;
        this.shadowColor = 'transparent';
        this.shadowBlur = 0;
        this.shadowOffsetY = 0;
        this.font = "10px sans-serif";
        this.textAlign = "start";
        this.textBaseline = "alphabetic";
        
        // Transform stack
        this.transformStack = [{ x: 0, y: 0, scale: 1 }];
    }

    get currentTransform() {
        return this.transformStack[this.transformStack.length - 1];
    }
    
    get tX() { return this.currentTransform.x; }
    get tY() { return this.currentTransform.y; }

    save() {
        this.transformStack.push({ ...this.currentTransform });
    }

    restore() {
        if (this.transformStack.length > 1) this.transformStack.pop();
    }

    translate(x, y) {
        const t = this.currentTransform;
        t.x += x;
        t.y += y;
    }
    
    scale(x, y) {
        // Simple uniform scaling support for SVG group transform? 
        // Or apply to coordinates. For SVG path generation, applying to coords is easier.
        // We accumulate scale in transform?
        // Note: script.js uses scale for some effects.
        // Let's simplified: SVG output usually doesn't need perfect scale emulation unless we output <g transform>.
        // For simplicity, we ignore scale effectively or assume it's just visual.
        // BUT drawTree uses scale. drawHouse does too.
        // Let's just track it but might be messy to apply to every point without matrix math.
    }
    
    setTransform(a, b, c, d, e, f) {
        // Reset
        this.transformStack[this.transformStack.length - 1] = { x: e, y: f };
    }

    beginPath() {
        this.currentPath = [];
    }

    moveTo(x, y) {
        const t = this.currentTransform;
        this.currentPath.push(`M ${(x + t.x).toFixed(2)} ${(y + t.y).toFixed(2)}`);
    }

    lineTo(x, y) {
        const t = this.currentTransform;
        this.currentPath.push(`L ${(x + t.x).toFixed(2)} ${(y + t.y).toFixed(2)}`);
    }
    
    quadraticCurveTo(cpx, cpy, x, y) {
        const t = this.currentTransform;
        this.currentPath.push(`Q ${(cpx + t.x).toFixed(2)} ${(cpy + t.y).toFixed(2)} ${(x + t.x).toFixed(2)} ${(y + t.y).toFixed(2)}`);
    }

    bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y) {
        const t = this.currentTransform;
        this.currentPath.push(`C ${(cp1x + t.x).toFixed(2)} ${(cp1y + t.y).toFixed(2)} ${(cp2x + t.x).toFixed(2)} ${(cp2y + t.y).toFixed(2)} ${(x + t.x).toFixed(2)} ${(y + t.y).toFixed(2)}`);
    }

    closePath() {
        this.currentPath.push("Z");
    }
    
    clip() {} // No-op

    // Group Support
    beginGroup(attrs = "") {
        this.svgBuffer.push(`<g ${attrs}>`);
    }
    
    endGroup() {
        this.svgBuffer.push(`</g>`);
    }

    fill() {
        if (this.currentPath.length === 0) return;
        const d = this.currentPath.join(" ");
        // opacity
        let style = `fill:${this.fillStyle}; stroke:none;`;
        if (this.globalAlpha < 1) style += ` opacity:${this.globalAlpha};`;
        this.svgBuffer.push(`<path d="${d}" style="${style}" />`);
    }

    setLineDash(segments) {
        this._lineDash = segments;
    }

    stroke() {
        if (this.currentPath.length === 0) return;
        const d = this.currentPath.join(" ");
        let style = `fill:none; stroke:${this.strokeStyle}; stroke-width:${this.lineWidth};`;
         if (this.globalAlpha < 1) style += ` opacity:${this.globalAlpha};`;
        
        // Handle dash
        if (this._lineDash && this._lineDash.length > 0) {
            style += ` stroke-dasharray:${this._lineDash.join(',')};`;
        }
        
        this.svgBuffer.push(`<path d="${d}" style="${style}" />`);
    }

    arc(x, y, radius, startAngle, endAngle) {
        const t = this.currentTransform;
        const cx = x + t.x;
        const cy = y + t.y;
        this.svgBuffer.push(`<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${radius}" fill="${this.fillStyle}" />`);
    }
    
    ellipse(x, y, radiusX, radiusY, rotation, startAngle, endAngle) {
         const t = this.currentTransform;
         const cx = x + t.x;
         const cy = y + t.y;
         this.svgBuffer.push(`<ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${radiusX}" ry="${radiusY}" fill="${this.fillStyle}" />`);
    }
    
    measureText(text) {
        return { width: text.length * 6 }; // Approximate
    }
    
    fillText(text, x, y) {
        // Basic SVG text
        const t = this.currentTransform;
         this.svgBuffer.push(`<text x="${(x+t.x).toFixed(2)}" y="${(y+t.y).toFixed(2)}" fill="${this.fillStyle}" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="14">${text}</text>`);
    }
}

// Global Context
const myContext = new SVGContext();

const mockCanvas = {
    getContext: () => myContext,
    width: 1920,
    height: 1080,
    addEventListener: () => {}
};

const document = {
    getElementById: (id) => {
        if (id === 'gameCanvas') return mockCanvas;
        return null;
    },
    createElement: () => ({ getContext: () => null })
};

// 3. Load Scripts
let scriptContent = fs.readFileSync('script.js', 'utf8');
const treeContent = fs.readFileSync('tree.js', 'utf8');

// Modify script.js to allow data injection and prevent auto-init
// 1. Remove local declarations using Regex to handle potential whitespace
scriptContent = scriptContent.replace(/let\s+houses\s*=\s*\[\];/, '// let houses = [];');
scriptContent = scriptContent.replace(/let\s+roads\s*=\s*new\s+Set\(\);/, '// let roads = new Set();');
// 2. Prevent auto-execution of init()
scriptContent = scriptContent.replace(/init\(\);/, '// init();');

// Global Variables State for Sandbox
const sandbox = {
    window, document,
    fetch: () => Promise.resolve({ ok: true, json: () => [] }),
    console: console,
    requestAnimationFrame: () => {}, 
    Path2D: class {}, 
    Image: class {},
    // Mock Classes
    CloudSystem: class { update(){} draw(){} },
    NPCManager: class { update(){} draw(){} },
    
    // Globals that script.js sets up
    roads: new Set(),
    houses: [],
    
    // Time Mock
    Date: { now: () => 100000 } // Fixed time for deterministic trees
};

vm.createContext(sandbox);

// Init Scripts
console.log("Loading modules...");
try {
    vm.runInContext(scriptContent, sandbox);
    vm.runInContext(treeContent, sandbox);
} catch (e) {
    console.log("Script loaded (warning):", e.message);
}

// 4. Generator
function generate() {
    console.log("Generating SVG...");
    
    if (!fs.existsSync('stargazers_houses.json')) {
        console.log("No data file found.");
        return;
    }

    const housesData = JSON.parse(fs.readFileSync('stargazers_houses.json', 'utf8'));
    let roadsData = [];
    if (fs.existsSync('roads.json')) {
        roadsData = JSON.parse(fs.readFileSync('roads.json', 'utf8'));
    }

    // 4. Generate SVG Content
    
    // Bounds Logic (Grid Space)
    let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
    
    [...housesData, ...roadsData].forEach(e => {
        if (e.x < minGx) minGx = e.x;
        if (e.x > maxGx) maxGx = e.x;
        if (e.y < minGy) minGy = e.y;
        if (e.y > maxGy) maxGy = e.y;
    });
    
    // Add padding
    const padding = 2; // 2 tiles padding
    minGx -= padding; maxGx += padding;
    minGy -= padding; maxGy += padding;
    
    // Verify Data Loading
    console.log(`Debug: Loaded ${roadsData.length} roads from file.`);
    
    // POPULATE SANDBOX GLOBALS
    sandbox.houses = housesData;
    sandbox.roads.clear();
    roadsData.forEach(r => {
        sandbox.roads.add(`${r.x},${r.y}`);
    });

    // Sort entities
    const entities = [];
    roadsData.forEach(r => {
        entities.push({ type: 'road', z: r.x + r.y - 100, data: r });
    });
    housesData.forEach(h => {
        entities.push({ type: 'house', z: h.x + h.y, data: h });
    });
    entities.sort((a, b) => a.z - b.z);
    
    // Bounds
    const gridToWorld = sandbox.gridToWorld;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    [...housesData, ...roadsData].forEach(e => {
        const p = gridToWorld(e.x, e.y);
        // Expand bounds just in case
        const margin = 50; 
        if (p.x - margin < minX) minX = p.x - margin;
        if (p.x + margin > maxX) maxX = p.x + margin;
        if (p.y - margin < minY) minY = p.y - margin;
        if (p.y + margin > maxY) maxY = p.y + margin;
    });
    
       // Add extra padding for height of buildings
    minY -= 150; 
    maxX += 50; minX -= 50; maxY += 50;

    let width = maxX - minX;
    let height = maxY - minY;
    
    // Zoom In Effect
    const zoom = 1.85; 
    let newW = width / zoom;
    const newH = height / zoom;
    
    // Cinematic Aspect Ratio Force (Wide 2.35:1 or at least 2:1)
    const aspect = 1.95;
    if (newW / newH < aspect) {
         newW = newH * aspect;
    }

    const cx = minX + width / 2;
    const cy = minY + height / 2;
    
    // Center the new viewBox
    // Shift Left: Subtract from X
    const panX = -200; 
    const viewBoxX = cx - newW / 2 + panX;
    const viewBoxY = cy - newH / 2;
    
    let svgOut = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX.toFixed(2)} ${viewBoxY.toFixed(2)} ${newW.toFixed(2)} ${newH.toFixed(2)}" style="background-color: #81c784;">\n`;
    
    // --- STYLES & ANIMATIONS ---
    svgOut += `
    <defs>
        <filter id="cloudBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
        </filter>
        <radialGradient id="vignette" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="70%" style="stop-color:rgb(0,0,0);stop-opacity:0" />
            <stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:0.3" />
        </radialGradient>
        <style>
            @keyframes treeSway {
                0%, 100% { transform: skewX(0deg); }
                50% { transform: skewX(2deg); }
            }
            .tree-anim {
                transform-origin: bottom center;
                animation: treeSway 4s ease-in-out infinite;
            }
            
            @keyframes cloudDriftSlow {
                0% { transform: translateX(0px); }
                100% { transform: translateX(100px); }
            }
            @keyframes cloudDriftFast {
                0% { transform: translateX(0px); }
                100% { transform: translateX(200px); }
            }
            
            .cloud-base { opacity: 0.9; }
            .c-slow { animation: cloudDriftSlow 60s linear infinite alternate; }
            .c-fast { animation: cloudDriftFast 40s linear infinite alternate; }
        </style>
    </defs>
    `;
    
    // Draw Functions from Sandbox
    const drawRoadTile = sandbox.drawRoadTile;
    const drawHouse = sandbox.drawHouse;
    const drawTree = sandbox.drawTree;
    
    // --- LAYER 1: GROUND (Grass & Roads) ---
    // Iterate Grid
    for (let gy = minGy; gy <= maxGy; gy++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
            myContext.beginPath();
            
            const worldPos = gridToWorld(gx, gy);
            const tileKey = `${gx},${gy}`;
            
            // Check if Road
            if (sandbox.roads.has(tileKey)) {
                drawRoadTile(gx, gy, worldPos);
            } else {
                // Draw Natural Grass (Logic matching script.js renderVisibleGrid)
                const seed = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
                const noise = Math.abs(seed - Math.floor(seed));
                
                // Colors (Hardcoded equivalent of PALETTE.day)
                const grassBase = "#81c784";
                const grassDark = "#66bb6a";
                const grassLight = "#a5d6a7";
                
                if (noise < 0.6) myContext.fillStyle = grassBase;
                else if (noise < 0.9) myContext.fillStyle = grassDark;
                else myContext.fillStyle = grassLight;
                
                // Draw Diamond
                const TILE_WIDTH = 100; // Expected constant
                const TILE_HEIGHT = 50;
                
                myContext.moveTo(worldPos.x, worldPos.y - TILE_HEIGHT/2);
                myContext.lineTo(worldPos.x + TILE_WIDTH/2, worldPos.y);
                myContext.lineTo(worldPos.x, worldPos.y + TILE_HEIGHT/2);
                myContext.lineTo(worldPos.x - TILE_WIDTH/2, worldPos.y);
                myContext.closePath();
                myContext.fill();
                
                // Details (Flowers/Tufts)
                if (noise > 0.70) {
                     const decType = Math.floor((seed * 100) % 10);
                     const ox = ((seed * 57.1) % 40) - 20;
                     const oy = ((seed * 21.3) % 18) - 9;
                     const tx = worldPos.x + ox;
                     const ty = worldPos.y + oy;
                     
                     if (decType < 6) {
                         // Tuft
                         myContext.strokeStyle = "#76c47c";
                         myContext.lineWidth = 1.5;
                         myContext.beginPath();
                         myContext.moveTo(tx, ty); myContext.lineTo(tx-3, ty-4);
                         myContext.moveTo(tx, ty); myContext.lineTo(tx+2, ty-5);
                         myContext.stroke();
                     } else if (decType < 9) {
                         // Flower
                         const colors = ["#ffb7b2", "#ffdac1", "#e2f0cb", "#b5ead7", "#c7ceea"];
                         const cIdx = Math.floor((seed * 13) % colors.length);
                         myContext.fillStyle = colors[cIdx];
                         myContext.beginPath();
                         myContext.arc(tx, ty-3, 2, 0, Math.PI*2);
                         myContext.fill();
                     }
                }
            }
        }
    }
    
    // --- LAYER 2: OBJECTS (Houses & Trees) ---
    // Sorted by Depth (x+y)
    
    // Filter entities to just House/Tree
    const objects = housesData.map(h => ({
        z: h.x + h.y,
        data: h
    }));
    objects.sort((a,b) => a.z - b.z);
    
    objects.forEach(obj => {
        myContext.beginPath();
        const h = obj.data;
        if (h.obstacle === 'tree') {
            // Apply Sway Animation Group
            myContext.beginGroup('class="tree-anim" style="transform-box: fill-box; transform-origin: bottom center;"');
            drawTree(h.x, h.y, myContext);
            myContext.endGroup();
        } else {
            drawHouse(
                h.x, h.y, h.color, h.roofStyle, h.doorStyle, h.windowStyle, h.chimneyStyle, h.wallStyle, 0, h.username, h.abandoned, h.facing, h.has_terrace
            );
        }
    });

    // --- LAYER 3: REALISTIC CLOUDS ---
    // Helper for fluffy cloud
    const drawCloud = (cx, cy, scale) => {
        myContext.fillStyle = "#ffffff";
        myContext.beginPath();
        // Base elongated ellipse
        myContext.ellipse(cx, cy, 60 * scale, 30 * scale, 0, 0, Math.PI*2);
        // Random puffs
        const puffs = 5 + Math.floor(Math.random() * 4);
        for(let i=0; i<puffs; i++) {
            const px = cx + (Math.random()-0.5) * 80 * scale;
            const py = cy + (Math.random()-0.5) * 20 * scale - 10*scale; // Tend towards top
            const r = (20 + Math.random() * 20) * scale;
            myContext.arc(px, py, r, 0, Math.PI*2);
        }
        myContext.fill();
    };

    // Separate groups for different speeds
    // Fast Layer
    myContext.beginGroup('class="cloud-base c-fast" filter="url(#cloudBlur)"');
    for(let i=0; i<4; i++) {
        const cx = minX + Math.random() * width;
        const cy = minY + Math.random() * height * 0.6; 
        drawCloud(cx, cy, 1.2);
    }
    myContext.endGroup();
    
    // Slow Layer (Background)
    myContext.beginGroup('class="cloud-base c-slow" filter="url(#cloudBlur)" opacity="0.7"');
    for(let i=0; i<6; i++) {
        const cx = minX + Math.random() * width;
        const cy = minY + Math.random() * height * 0.5; 
        drawCloud(cx, cy, 0.8);
    }
    myContext.endGroup();

    // --- OVERLAY: VIGNETTE & LOGO ---
    
    // Close the buffer iteration first to append final SVG tags
    svgOut += myContext.svgBuffer.join("\n");
    
    // Append Overlay rects directly
    // Vignette
    svgOut += `
    <rect x="${minX-500}" y="${minY-500}" width="${width+1000}" height="${height+1000}" fill="url(#vignette)" pointer-events="none" />
    
    <!-- Aesthetic Outline Frame -->
    <rect x="${viewBoxX + 10}" y="${viewBoxY + 10}" width="${newW - 20}" height="${newH - 20}" fill="none" stroke="#ffffff" stroke-width="8" opacity="0.6" />
    `;

    svgOut += "\n</svg>";
    
    fs.writeFileSync('city_snapshot.svg', svgOut);
    console.log("Success: city_snapshot.svg generated.");
}

generate();
