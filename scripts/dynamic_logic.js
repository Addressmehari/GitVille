async function init() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    setupInputListeners();

    // Check for URL Param
    const urlParams = new URLSearchParams(window.location.search);
    const dynamicUser = urlParams.get('u') || urlParams.get('username');

    if (dynamicUser) {
        // --- DYNAMIC MODE ---
        console.log(`Dynamic Mode: Building city for ${dynamicUser}...`);
        try {
            const data = await fetchDynamicData(dynamicUser);
            houses = data.houses;
            roads = data.roads;
            worldConfig = { weather: "none", timeOfDay: "day" };
            console.log("Generated Dynamic City:", houses.length, "houses for", dynamicUser);
        } catch (e) {
            console.error(e);
            alert(`Failed to build city for ${dynamicUser}: ${e.message}`);
            houses = [{ x: 0, y: 0, color: "#ff6b6b", hoverAnim: 0, username: "Error" }];
        }
    } else {
        // --- STATIC MODE ---
        try {
            console.log("Fetching static data...");
            const [housesRes, worldRes, roadsRes] = await Promise.all([
                fetch('../data/stargazers_houses.json?t=' + Date.now()),
                fetch('../data/world.json?t=' + Date.now()),
                fetch('../data/roads.json?t=' + Date.now()).catch(e => null)
            ]);

            if (!housesRes.ok) throw new Error(`Houses fetch failed: ${housesRes.status}`);
            if (!worldRes.ok) throw new Error(`World fetch failed: ${worldRes.status}`);

            houses = await housesRes.json();
            worldConfig = await worldRes.json();

            if (roadsRes && roadsRes.ok) {
                try {
                    const roadData = await roadsRes.json();
                    if (Array.isArray(roadData)) {
                        roadData.forEach(r => roads.add(`${r.x},${r.y}`));
                    }
                } catch (e) { console.log("No roads found or invalid JSON"); }
            }
            houses.forEach(h => h.hoverAnim = 0);
        } catch (e) {
            console.error("Failed to load data detailed:", e);
            houses = [{ x: 0, y: 0, color: "#ff6b6b", hoverAnim: 0, username: "Error" }];
            alert("Failed to load data.\n" + e.message);
        }
    }

    // UI Updates
    if (houses.length > 0) {
        let owner = houses[0].username;
        owner = owner.replace(/[^a-zA-Z0-9_-]/g, ''); 
        
        const titleEl = document.getElementById('city-title');
        if (titleEl) titleEl.innerText = `${owner}'s City`;
        
        const badgeEl = document.getElementById('city-badge');
        if (badgeEl) {
            // Pseudo-hex ID
            let hash = 0;
            for (let i = 0; i < owner.length; i++) hash = owner.charCodeAt(i) + ((hash << 5) - hash);
            const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
            const hexId = "00000".substring(0, 6 - c.length) + c;
            
            if (dynamicUser) {
                badgeEl.innerText = `gitville:LIVE-UPLINK`;
                badgeEl.parentElement.href = `https://github.com/${owner}`;
            } else {
                badgeEl.innerText = `gitville:SECTOR-${hexId}`; 
            }
        }
    }

    cloudSystem = new CloudSystem();
    npcManager = new NPCManager(15);
    
    const loader = document.getElementById('loading-screen');
    if (loader) loader.classList.add('hidden');

    requestAnimationFrame(render);
}

// --- Dynamic Generation Utils ---

async function fetchDynamicData(username) {
    const userRes = await fetch(`https://api.github.com/users/${username}`);
    if (!userRes.ok) throw new Error("User not found: " + username);
    const user = await userRes.json();

    const followersRes = await fetch(`https://api.github.com/users/${username}/followers?per_page=100`);
    if (!followersRes.ok) throw new Error("Failed to fetch followers");
    const followers = await followersRes.json();

    let rawHouses = [];
    rawHouses.push({ username: user.login, joined_at: new Date().toISOString() });
    followers.forEach(f => {
        rawHouses.push({ username: f.login, joined_at: new Date().toISOString() });
    });

    return generateCityLayout(rawHouses, user.login);
}

function generateCityLayout(users, ownerName) {
    const HOUSE_GAP = 2;
    const STREET_GAP = 2;
    const MAIN_AVENUE_WIDTH = 6;
    const CLUSTER_ROWS = 4;
    const CLUSTER_COLS = 4;
    const HOUSES_PER_BLOCK = CLUSTER_ROWS * CLUSTER_COLS;
    
    const BLOCK_WIDTH = (CLUSTER_COLS - 1) * HOUSE_GAP;
    const BLOCK_HEIGHT = (CLUSTER_ROWS - 1) * HOUSE_GAP;
    const BLOCK_STRIDE_X = BLOCK_WIDTH + STREET_GAP;
    const BLOCK_STRIDE_Y = BLOCK_HEIGHT + STREET_GAP;

    const limit = users.length;
    const slots = [];
    const facings = [];
    
    slots.push({x: 0, y: 0});
    facings.push("down");
    
    if (limit > 1) {
        const total_blocks = Math.ceil(limit / HOUSES_PER_BLOCK);
        const quadrants = [{x:1, y:-1}, {x:-1, y:-1}, {x:-1, y:1}, {x:1, y:1}];
        let abstract_blocks = [];
        let layer = 0;
        while (abstract_blocks.length * 4 < total_blocks + 4) {
            for (let x = 0; x <= layer; x++) {
                let y = layer - x;
                abstract_blocks.push({x, y});
            }
            layer++;
        }
        
        let houses_placed = 1;
        for (let b of abstract_blocks) {
            for (let q = 0; q < 4; q++) {
                if (houses_placed >= limit) break;
                const qx = quadrants[q].x;
                const qy = quadrants[q].y;
                const base_x = (MAIN_AVENUE_WIDTH / 2) * qx;
                const base_y = (MAIN_AVENUE_WIDTH / 2) * qy;
                const block_start_x = base_x + (b.x * BLOCK_STRIDE_X * qx);
                const block_start_y = base_y + (b.y * BLOCK_STRIDE_Y * qy);
                
                for (let i = 0; i < HOUSES_PER_BLOCK; i++) {
                    if (houses_placed >= limit) break;
                    const ix = i % CLUSTER_COLS;
                    const iy = Math.floor(i / CLUSTER_COLS);
                    const hx = block_start_x + (ix * HOUSE_GAP * qx);
                    const hy = block_start_y + (iy * HOUSE_GAP * qy);
                    slots.push({x: hx, y: hy});
                    if (hx > 0) facings.push("left");
                    else facings.push("right");
                    houses_placed++;
                }
            }
        }
    }
    
    let finalHouses = [];
    let roadsSet = new Set();
    
    // Core Ring
    for(let i = -2; i <= 2; i++) {
        roadsSet.add(`${i},-2`); roadsSet.add(`${i},2`);
        roadsSet.add(`-2,${i}`); roadsSet.add(`2,${i}`);
    }
    
    const get_r_coord = (idx) => (idx === 0) ? 0 : 2 + idx * 8;
    slots.forEach(s => {
        const bx = Math.floor((Math.abs(s.x) - (MAIN_AVENUE_WIDTH/2)) / BLOCK_STRIDE_X);
        const by = Math.floor((Math.abs(s.y) - (MAIN_AVENUE_WIDTH/2)) / BLOCK_STRIDE_Y);
        if (bx >= 0 && by >= 0) {
             const qx = Math.sign(s.x) || 1;
             const qy = Math.sign(s.y) || 1;
             const rx_in = get_r_coord(bx) * qx;
             const rx_out = get_r_coord(bx+1) * qx;
             const ry_in = get_r_coord(by) * qy;
             const ry_out = get_r_coord(by+1) * qy;
             const sx = Math.min(rx_in, rx_out), ex = Math.max(rx_in, rx_out);
             const sy = Math.min(ry_in, ry_out), ey = Math.max(ry_in, ry_out);
             for(let xx=Math.ceil(sx); xx<=Math.floor(ex); xx++) {
                 roadsSet.add(`${xx},${Math.floor(ry_in)}`);
                 roadsSet.add(`${xx},${Math.floor(ry_out)}`);
             }
             for(let yy=Math.ceil(sy); yy<=Math.floor(ey); yy++) {
                 roadsSet.add(`${Math.floor(rx_in)},${yy}`);
                 roadsSet.add(`${Math.floor(rx_out)},${yy}`);
             }
        }
    });

    for(let i=-2; i<=2; i++) {
        roadsSet.delete(`0,${i}`);
        roadsSet.delete(`${i},0`);
    }
    for(let i=-2; i<=2; i++) {
        roadsSet.add(`${i},-2`); roadsSet.add(`${i},2`);
        roadsSet.add(`-2,${i}`); roadsSet.add(`2,${i}`);
    }

    users.forEach((u, i) => {
        if (i >= slots.length) return;
        const attrs = stringToPseudoRandom(u.username);
        finalHouses.push({
            x: slots[i].x,
            y: slots[i].y,
            color: stringToColor(u.username),
            roofStyle: attrs[0],
            doorStyle: attrs[1],
            windowStyle: attrs[2],
            chimneyStyle: attrs[3],
            wallStyle: attrs[4],
            username: u.username,
            facing: facings[i],
            has_terrace: false, 
            abandoned: false,
            joined_at: u.joined_at,
            last_seen: new Date().toISOString(),
            hoverAnim: 0
        });
    });
    
    return { houses: finalHouses, roads: roadsSet };
}

function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + "00000".substring(0, 6 - c.length) + c;
}

function stringToPseudoRandom(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) - hash) + str.charCodeAt(i);
    const nums = [];
    for(let i=0; i<5; i++) nums.push(Math.abs((hash >> i) % 4));
    return nums;
}
