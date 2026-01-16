// SVG Generator - Direct Integration Strategy
// Loads script.js and tree.js via script tags (handled in HTML)
// Uses setGlobalCtx to inject SVG context for rendering.

class SVGContext {
    constructor() {
        this.canvas = { width: 4000, height: 4000 }; // Mock for script compatibility
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
    
    scale(x, y) {} // Simple scaling support ignored for SVG path

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
    
    fillText(text, x, y) {}
}

const SVGGen = {
    generate: async function(username, totalCount, houses) {
        const myContext = new SVGContext();
        window.myContext = myContext; // Global access just in case

        // 1. INJECT CONTEXT
        if (window.setGlobalCtx) {
            window.setGlobalCtx(myContext);
        } else {
            console.error("setGlobalCtx not found. Ensure script.js is loaded.");
            return "";
        }
        
        // 2. PREPARE DATA
        const g2w = window.gridToWorld;
        if (!g2w) {
            console.error("gridToWorld not found.");
            return "";
        }
        
        // Logic: Spread houses to make the estate look bigger
        const spreadHouses = houses.map(h => ({
            ...h,
            x: h.x * 2,
            y: h.y * 2
        }));

        // Bounds Logic
        let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
        spreadHouses.forEach(e => {
            if (e.x < minGx) minGx = e.x;
            if (e.x > maxGx) maxGx = e.x;
            if (e.y < minGy) minGy = e.y;
            if (e.y > maxGy) maxGy = e.y;
        });

        // Add padding
        const padding = 2; 
        minGx -= padding; maxGx += padding;
        minGy -= padding; maxGy += padding;
        
        // --- GENERATE TREES IN GAPS ---
        const trees = [];
        const occupied = new Set();
        spreadHouses.forEach(h => occupied.add(`${h.x},${h.y}`));
        
        for (let gy = minGx; gy <= maxGx; gy++) { // Variable name reuse fix: Loop gy from minGy
        }
        
        // Correct Loops
        for (let gy = minGy; gy <= maxGy; gy++) {
            for (let gx = minGx; gx <= maxGx; gx++) {
                // Skip if occupied by house
                if (occupied.has(`${gx},${gy}`)) continue;
                
                // Deterministic Randomness
                const seed = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
                const noise = Math.abs(seed - Math.floor(seed));
                
                // 15% chance to put a tree in empty spot (Sparse)
                if (noise > 0.85) {
                     trees.push({
                         x: gx, y: gy,
                         obstacle: 'tree'
                     });
                }
            }
        }
        
        
        // --- CALCULATE TIGHT BOUNDS ---
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        // Helper to expand bounds for a point
        const addP = (x, y) => {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
        }
        
        // 1. Check all Grid Corners (Ground)
        const corners = [
            {x: minGx, y: minGy}, {x: maxGx, y: minGy},
            {x: maxGx, y: maxGy}, {x: minGx, y: maxGy}
        ];
        corners.forEach(p => {
             const m = g2w(p.x, p.y);
             addP(m.x, m.y);
        });
        
        // 2. Check all Objects (Houses/Trees) for height/width
        // A standard tile is 100 wide, 50 high.
        // A house can be ~120px tall (upwards from y).
        // Let's just add margins to the ground bounds to be safe.
        
        // Margins for "Exactly upto borders"
        // Top: Needs space for tall roofs/trees. ~150px.
        // Bottom: Needs space for bottom of tile/shadow. ~50px.
        // Left/Right: Needs space for tile width (50px each side).
        
        minY -= 140; 
        maxY += 60;
        minX -= 60;
        maxX += 60;

        let width = maxX - minX;
        let height = maxY - minY;
        
        // No Zoom, No Aspect Ratio enforcement - Just fit content.
        const viewBoxX = minX;
        const viewBoxY = minY;
        
        // --- START SVG ---
        let svgOut = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBoxX.toFixed(2)} ${viewBoxY.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)}" style="background-color: #81c784;">\n`;

        // Defs
        svgOut += `
    <defs>
        <filter id="cloudBlur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" />
        </filter>
        <radialGradient id="vignette" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="70%" style="stop-color:rgb(0,0,0);stop-opacity:0" />
            <stop offset="100%" style="stop-color:rgb(0,0,0);stop-opacity:0.3" />
        </radialGradient>
        <linearGradient id="sunlight" x1="0%" y1="0%" x2="100%" y2="100%">
             <stop offset="0%" style="stop-color:#fffce6;stop-opacity:0.25" />
             <stop offset="60%" style="stop-color:#fffce6;stop-opacity:0" />
        </linearGradient>
        <style>
            @keyframes treeSway {
                0%, 100% { transform: skewX(0deg); }
                50% { transform: skewX(2deg); }
            }
            .tree-anim {
                transform-origin: bottom center;
                animation: treeSway 4s ease-in-out infinite;
            }
            
            @keyframes fireflyFloat {
                0%, 100% { transform: translate(0, 0); opacity: 0.3; }
                50% { opacity: 1; transform: translate(10px, -15px); }
            }
            .firefly { animation: fireflyFloat 4s ease-in-out infinite alternate; }
            
            @keyframes cameraPan {
                0% { transform: translate(0, 0); }
                33% { transform: translate(-15px, -5px); }
                66% { transform: translate(5px, -10px); }
                100% { transform: translate(0, 0); }
            }
            .world-sway {
                animation: cameraPan 20s ease-in-out infinite;
                transform-origin: center center;
            }
            
            @keyframes smokeRise {
                0% { transform: translate(0, 0) scale(0.5); opacity: 0.6; }
                100% { transform: translate(15px, -50px) scale(2.5); opacity: 0; }
            }
            .smoke {
                transform-box: fill-box;
                transform-origin: center center;
            }
            
            @keyframes birdFly {
                0% { transform: translateX(0) translateY(0); }
                25% { transform: translateX(100px) translateY(15px); }
                50% { transform: translateX(200px) translateY(-5px); }
                75% { transform: translateX(300px) translateY(10px); }
                100% { transform: translateX(400px) translateY(0); }
            }
            .bird { animation: birdFly 20s linear infinite; }
            
            @keyframes grassWave {
                0%, 100% { transform: rotate(0deg); }
                50% { transform: rotate(10deg); }
            }
            .grass-anim {
                transform-box: fill-box;
                transform-origin: bottom center;
                animation: grassWave 3s ease-in-out infinite;
            }
            
            @keyframes floatAnim {
                0%, 100% { transform: translate(0, 0); }
                50% { transform: translate(0, -3px); }
            }
            .citizen { animation: floatAnim 1s ease-in-out infinite; }
        </style>
    </defs>
    `;

    // Start World Sway Group
    svgOut += '<g class="world-sway">';
    
    // --- LAYER 1: GROUND ---
    for (let gy = minGy; gy <= maxGy; gy++) {
        for (let gx = minGx; gx <= maxGx; gx++) {
            myContext.beginPath();
            
            const worldPos = g2w(gx, gy);
            
            // Draw Natural Grass (Logic matching script.js renderVisibleGrid)
            const seed = Math.sin(gx * 12.9898 + gy * 78.233) * 43758.5453;
            const noise = Math.abs(seed - Math.floor(seed));
            
            const grassBase = "#81c784";
            const grassDark = "#66bb6a";
            const grassLight = "#a5d6a7";
            
            if (noise < 0.6) myContext.fillStyle = grassBase;
            else if (noise < 0.9) myContext.fillStyle = grassDark;
            else myContext.fillStyle = grassLight;
            
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
                 
                 myContext.svgBuffer.push(`<g class="grass-anim" style="animation-delay: -${Math.random()*2}s">`);
                 
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
                 
                 myContext.svgBuffer.push(`</g>`);
            }
        }
    }
        
        // --- LAYER 2: OBJECTS ---
        
        const objects = [...spreadHouses.map(h => ({ z: h.x + h.y, data: h })), ...trees.map(t => ({ z: t.x + t.y, data: t }))];
        objects.sort((a,b) => a.z - b.z);
        
        objects.forEach(obj => {
            myContext.beginPath();
            const h = obj.data;
            const pos = g2w(h.x, h.y);
            
             // CHECK FOR TREE
             if (h.obstacle === 'tree') {
                 // Sways
                 myContext.beginGroup('class="tree-anim" style="transform-box: fill-box; transform-origin: bottom center;"');
                 if (window.drawTree) {
                    window.drawTree(h.x, h.y, myContext);
                 }
                 myContext.endGroup();
                 return; // Done for this object
             }
            
             // Drop Shadow for House
             myContext.fillStyle = "rgba(0, 0, 0, 0.2)";
             myContext.beginPath();
             // Ellipse shadow
             myContext.ellipse(pos.x, pos.y, 40, 20, 0, 0, Math.PI*2);
             myContext.fill();

             // Draw House
             if (window.drawHouse) {
                window.drawHouse(
                    h.x, h.y, h.color, h.roofStyle||0, h.doorStyle||0, h.windowStyle||0, h.chimneyStyle||0, h.wallStyle||0, 0, h.username, h.abandoned, h.facing, h.has_terrace
                );
             }
             
             // Render Smoke
             if (!h.abandoned) {
                const sx = pos.x;
                const sy = pos.y - 65; 
                myContext.svgBuffer.push(`<g class="smoke-stack">`);
                for(let k=0; k<3; k++) {
                   const delay = -Math.random() * 3;
                   const r = 3 + Math.random()*2;
                   myContext.svgBuffer.push(`<circle cx="${sx}" cy="${sy}" r="${r}" fill="rgba(255,255,255,0.4)" class="smoke" style="animation: smokeRise 4s ease-out infinite; animation-delay: ${delay}s;" />`);
                }
                myContext.svgBuffer.push(`</g>`);
            }
        });
        
        // --- BIRDS ---
        myContext.beginGroup('class="birds" opacity="0.6"');
        for(let i=0; i<5; i++) {
            const bx = minX + Math.random() * width * 0.5;
            const by = minY + Math.random() * height * 0.4;
            const delay = -Math.random() * 20;
            // Simple V shape path
            myContext.svgBuffer.push(`<path d="M ${bx} ${by} L ${bx+5} ${by+2} L ${bx+10} ${by}" fill="none" stroke="#333" stroke-width="1.5" class="bird" style="animation-duration: ${15+Math.random()*10}s; animation-delay:${delay}s;" />`);
        }
        myContext.endGroup();
        
        // CLOUDS REMOVED
        
        // --- FINALIZE SVG ---
        svgOut += myContext.svgBuffer.join("\n");
        svgOut += '</g>'; // Close world sway
        
        // --- OVERLAYS & UI ---
        
        // UI Constants
        const frameMargin = 15;
        const footerHeight = 70;
        const fx = viewBoxX + frameMargin;
        const fy = viewBoxY + frameMargin;
        const fw = width - (frameMargin * 2);
        const fh = height - (frameMargin * 2);
        
        const popText = totalCount >= 1000 ? (totalCount/1000).toFixed(1)+'k' : totalCount;

        svgOut += `
    <!-- Sunlight Overlay -->
    <rect x="${viewBoxX}" y="${viewBoxY}" width="${width}" height="${height}" fill="url(#sunlight)" pointer-events="none" style="mix-blend-mode: overlay;" />
    
    <!-- Vignette -->
    <rect x="${minX-500}" y="${minY-500}" width="${width+1000}" height="${height+1000}" fill="url(#vignette)" pointer-events="none" />
    
    <!-- Fireflies (Foreground Particles) -->
    <g class="fireflies" pointer-events="none">
    `;
    
    // Generate 15 Fireflies
    for(let i=0; i<15; i++) {
        const ffx = minX + Math.random() * width;
        const ffy = minY + Math.random() * height; // Fixed variable name collision (fx -> ffx)
        const delay = -Math.random() * 5;
        const dur = 3 + Math.random() * 4;
        svgOut += `<circle cx="${ffx.toFixed(2)}" cy="${ffy.toFixed(2)}" r="${(1+Math.random()*1.5).toFixed(1)}" fill="#fff59d" class="firefly" style="animation-delay:${delay}s; animation-duration:${dur}s;" />\n`;
    }
    
    svgOut += `</g>
    
    <!-- Floating Footer Info (No Background) -->
    <g transform="translate(${fx}, ${fy + fh - footerHeight + 20})">
        <!-- Text Content (Stacking) -->
        <text x="${fw/2}" y="15" fill="white" text-anchor="middle" font-family="'Segoe UI', -apple-system, sans-serif" font-weight="bold" font-size="28" style="text-shadow: 0 3px 8px rgba(0,0,0,0.8);">${username}'s GitVille</text>
        <text x="${fw/2}" y="45" fill="#e0e0e0" text-anchor="middle" font-family="'Segoe UI', -apple-system, sans-serif" font-size="18" font-weight="600" style="text-shadow: 0 3px 8px rgba(0,0,0,0.8);">Population: ${popText}</text>
    </g>
    
    <!-- Outer Rounded Frame -->
    <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" rx="20" ry="20" fill="none" stroke="#ffffff" stroke-width="6" opacity="0.8" />
    `;

        svgOut += "</svg>";
        return svgOut;
    }
};
