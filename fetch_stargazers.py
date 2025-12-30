import json
import urllib.request
import urllib.error
import hashlib
import math
import sys
import os

def get_stargazers(owner, repo, token=None, limit=1000):
    url = f"https://api.github.com/repos/{owner}/{repo}/stargazers"
    stargazers = []
    page = 1
    per_page = 50 # Reduced from 100 to improve stability
    
    headers = {
        "Accept": "application/vnd.github.v3.star+json",
        "User-Agent": "GitVille-Stargazer-Fetcher"
    }
    if token:
        headers["Authorization"] = f"token {token}"
        
    print(f"Fetching max {limit} stargazers from {owner}/{repo}...")
    
    import time
    
    while len(stargazers) < limit:
        attempts = 0
        success = False
        
        while attempts < 3:
            try:
                req = urllib.request.Request(f"{url}?page={page}&per_page={per_page}", headers=headers)
                with urllib.request.urlopen(req, timeout=10) as response:
                    content = response.read().decode()
                    if not content.strip():
                        data = []
                    else:
                        data = json.loads(content)
                        
                    if not data:
                        success = True # End of results
                        break
                    
                    remaining = limit - len(stargazers)
                    stargazers.extend(data[:remaining])
                    
                    print(f"Fetched page {page} (+{len(data[:remaining])}, total {len(stargazers)})")
                    
                    if len(data) < per_page:
                        success = True
                        # End of results
                    else:
                        success = True
                        
                    page += 1
                    break
                    
            except (urllib.error.HTTPError, urllib.error.URLError, Exception) as e:
                print(f"Attempt {attempts+1} failed: {e}")
                attempts += 1
                time.sleep(2) # Wait before retry
                
        if not success or (len(stargazers) >= limit):
            if not success:
                print("Failed to fetch page after retries.")
            break
            
    return stargazers

def get_contributors(owner, repo, token=None, limit=5000):
    url = f"https://api.github.com/repos/{owner}/{repo}/contributors"
    contributors = set()
    page = 1
    per_page = 100
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitVille-Contributor-Fetcher"
    }
    if token:
        headers["Authorization"] = f"token {token}"
        
    print(f"Fetching contributors from {owner}/{repo}...")
    
    import time
    
    while len(contributors) < limit:
        attempts = 0
        success = False
        
        while attempts < 3:
            try:
                req = urllib.request.Request(f"{url}?page={page}&per_page={per_page}&anon=true", headers=headers)
                with urllib.request.urlopen(req, timeout=10) as response:
                    content = response.read().decode()
                    if not content.strip():
                        data = []
                    else:
                        data = json.loads(content)
                        
                    if not data:
                        success = True
                        break
                    
                    for item in data:
                        if 'login' in item:
                            contributors.add(item['login'])
                    
                    print(f"Fetched contributors page {page} (+{len(data)}, total {len(contributors)})")
                    
                    if len(data) < per_page:
                        success = True
                    else:
                        success = True
                        
                    page += 1
                    break
                    
            except (urllib.error.HTTPError, urllib.error.URLError, Exception) as e:
                print(f"Contributor fetch attempt {attempts+1} failed: {e}")
                attempts += 1
                time.sleep(2)
                
        if not success:
            print("Failed to fetch contributors page after retries.")
            break
        if len(data) == 0: # Stop if no data returned
            break
            
    return contributors

def string_to_color(s):
    hash_object = hashlib.md5(s.encode())
    hex_dig = hash_object.hexdigest()
    return "#" + hex_dig[:6]

def string_to_pseudo_random(s):
    hash_object = hashlib.md5(s.encode())
    hex_dig = hash_object.hexdigest()
    nums = [int(hex_dig[i], 16) % 4 for i in range(5)]
    return nums

def generate_city_slots(limit):
    slots = []
    facing_dir = []
    
    # 0. Central House for Author
    slots.append((0, 0))
    facing_dir.append("down")
    
    # If limit is 1, we are done
    if limit <= 1:
        return slots, facing_dir
        
    # Generate remaining slots
    limit_remaining = limit - 1
    
    # "Grand Cross" Layout
    # Hierarchy of spaces:
    # 1. House-to-House: 2 units (Dense)
    # 2. Block-to-Block: 4 units (Street)
    # 3. Quadrant-to-Quadrant: 12 units (Main Avenue)
    
    HOUSE_GAP = 2
    STREET_GAP = 2 # Reduced from 4 to be closer
    MAIN_AVENUE_WIDTH = 6
    
    CLUSTER_ROWS = 4
    CLUSTER_COLS = 4
    HOUSES_PER_BLOCK = CLUSTER_ROWS * CLUSTER_COLS
    
    # Calculate Block Size
    BLOCK_WIDTH = (CLUSTER_COLS - 1) * HOUSE_GAP
    BLOCK_HEIGHT = (CLUSTER_ROWS - 1) * HOUSE_GAP
    
    # Stride (How much space one block takes including its street)
    BLOCK_STRIDE_X = BLOCK_WIDTH + STREET_GAP
    BLOCK_STRIDE_Y = BLOCK_HEIGHT + STREET_GAP
    
    # Number of houses needed
    total_blocks = math.ceil(limit / HOUSES_PER_BLOCK)
    
    # We distribute blocks into 4 Quadrants symmetrically
    # 0: NE (+x, -y), 1: NW (-x, -y), 2: SW (-x, +y), 3: SE (+x, +y)
    # Note: Y-axis direction depends on engine. Assuming:
    # Right: +x, Down: +y, Left: -x, Up: -y
    
    # Quadrant Multipliers
    quadrants = [
        (1, -1),  # NE
        (-1, -1), # NW
        (-1, 1),  # SW
        (1, 1)    # SE
    ]
    
    # We will spiral OUTWARDS in terms of "Grid Coordinates" (col, row) of blocks
    # Logic: For each quadrant, we fill blocks in a pattern (0,0), (1,0), (0,1), (1,1)...
    # Simple way: Imagine a single quadrant filling up diagonally (Triangle/Diamond)
    # Layer 0: (0,0)
    # Layer 1: (1,0), (0,1)
    # Layer 2: (2,0), (1,1), (0,2)
    
    # Generate abstract block positions for ONE quadrant
    # Then mirror them to 4 quadrants
    
    abstract_block_positions = []
    layer = 0
    while len(abstract_block_positions) * 4 < total_blocks + 4: # +4 buffer
        for x in range(layer + 1):
            y = layer - x
            abstract_block_positions.append((x, y))
        layer += 1
        
    # Generate Houses
    current_block_idx = 0
    current_quadrant = 0
    
    # We iterate until we fill 'limit' houses
    # We cycle through quadrants for each BLOCK we place.
    # So Q1 gets Block 0, Q2 gets Block 0... then Q1 gets Block 1...
    
    # But wait, 'limit' is house count, not block count.
    # We fill one block fully, then move to next block in next quadrant?
    # Or fill all blocks partially?
    # Better: Fill block by block.
    
    houses_placed = 0
    
    # Loop over abstract positions (0,0), (1,0)...
    for bx, by in abstract_block_positions:
        # For this abstract position, place it in all 4 quadrants (subject to limit)
        
        for q_idx in range(4):
            if houses_placed >= limit: break
            
            qx, qy = quadrants[q_idx]
            
            # Start position of this block in World Space
            # Base offset is Main Avenue Half-Width
            base_x = (MAIN_AVENUE_WIDTH / 2) * qx
            base_y = (MAIN_AVENUE_WIDTH / 2) * qy
            
            # Add block strides
            # Note: We must ensure we move AWAY from axes.
            # If qx is positive, we add. If negative, we subtract.
            block_world_x = base_x + (bx * BLOCK_STRIDE_X * qx)
            block_world_y = base_y + (by * BLOCK_STRIDE_Y * qy)
            
            # Adjust if qx/qy is negative, we need to shift the block origin?
            # A block spans [x, x+width]. If we are at -100, we want [-100-width, -100].
            if qx < 0: block_world_x -= BLOCK_WIDTH
            if qy < 0: block_world_y -= BLOCK_HEIGHT
            
            # Fill the block with houses
            for i in range(HOUSES_PER_BLOCK):
                if houses_placed >= limit_remaining: break
                
                # Inner Grid (0..3, 0..3)
                ix = i % CLUSTER_COLS
                iy = i // CLUSTER_COLS
                
                # World Pos
                house_x = block_world_x + (ix * HOUSE_GAP)
                house_y = block_world_y + (iy * HOUSE_GAP)
                
                slots.append((house_x, house_y))
                
                # Facing Logic
                # Face the Main Avenues (the axes) primarily.
                # NE (1, -1): Face Left (to Y-axis) or Down (to X-axis).
                # Let's say: Face the "Primary" Main Avenue.
                # Or alternating.
                
                # Let's simple face the vertical axis (Left/Right)
                if house_x > 0:
                    facing_dir.append("left")
                else:
                    facing_dir.append("right")
                
                houses_placed += 1
                
    road_tiles = set()
    if slots:
        min_x = int(min(s[0] for s in slots))
        max_x = int(max(s[0] for s in slots))
        min_y = int(min(s[1] for s in slots))
        max_y = int(max(s[1] for s in slots))
        
        # Grid lines logic
        # Axis: 0 (Main Avenue)
        # Block Width: 6. Start offset: 3.
        # First Road at: 3 (start) + 6 (width) + 1 (half gap) = 10.
        # Stride: 6 + 2 = 8.
        
        def get_grid_lines(min_val, max_val):
            lines = set()
            lines.add(0) # Main Avenue
            
            # Positive
            curr = 10
            while curr <= max_val + 2:
                lines.add(curr)
                curr += 8
            
            # Negative
            curr = -10
            while curr >= min_val - 2:
                lines.add(curr)
                curr -= 8
            return lines

        x_lines = get_grid_lines(min_x, max_x)
        y_lines = get_grid_lines(min_y, max_y)
        
        # Fill grid
        # Add Horizontal roads (+/- 2 padding for visual connection)
        for y in y_lines:
            for x in range(min_x - 3, max_x + 4):
                road_tiles.add((x, y))
                
        # Add Vertical roads
        for x in x_lines:
            for y in range(min_y - 3, max_y + 4):
                road_tiles.add((x, y))
                
        # --- Central House Adjustment ---
        # 1. Clear the road UNDER the central house (0,0) and immediate avenue connections
        # to make space for the ring.
        # Central house is at (0,0).
        # We want to clear (0,0) and maybe (0, +/-1), (+/-1, 0)?
        # Let's clear a 3x3 box in the center from the Main Avenues.
        
        for i in range(-2, 3):
             if (0, i) in road_tiles: road_tiles.remove((0, i))
             if (i, 0) in road_tiles: road_tiles.remove((i, 0))
             
        # 2. Add Ring Road around Central House
        # House at 0,0. Ring at +/- 2.
        ring_min = -2
        ring_max = 2
        
        # Horizontal segments
        for x in range(ring_min, ring_max + 1):
            road_tiles.add((x, ring_min))
            road_tiles.add((x, ring_max))
            
        # Vertical segments
        for y in range(ring_min, ring_max + 1):
            road_tiles.add((ring_min, y))
            road_tiles.add((ring_max, y))
                
    return slots, facing_dir, list(road_tiles)

def generate_houses(stargazers, contributors, owner_name):
    # Sort
    stargazers.sort(key=lambda x: x['starred_at'])
    
    # Prepend Owner
    # Create a mock entry
    owner_entry = {
         "user": { "login": owner_name },
         "starred_at": "1970-01-01T00:00:00Z" # Dummy date
    }
    
    full_list = [owner_entry] + stargazers
    
    # Get Slots
    slots, facings, roads = generate_city_slots(len(full_list))
    
    processed_houses = []
    
    for i, strgzr in enumerate(full_list):
        if i >= len(slots): break
        
        username = strgzr['user']['login']
        attrs = string_to_pseudo_random(username)
        x, y = slots[i]
        facing = facings[i]
        
        # Check if contributor
        has_terrace = username in contributors
        
        house = {
            "x": x,
            "y": y,
            "color": string_to_color(username),
            "roofStyle": attrs[0],
            "doorStyle": attrs[1],
            "windowStyle": attrs[2],
            "chimneyStyle": attrs[3],
            "wallStyle": attrs[4],
            "username": username,
            "facing": facing,
            "has_terrace": has_terrace
        }
        processed_houses.append(house)

    return processed_houses, roads

def recalculate_layout(houses):
    # Recalculate slots for the entire list (existing + new)
    slots, facings, roads = generate_city_slots(len(houses))
    
    # Update positions and facings
    for i, house in enumerate(houses):
        if i < len(slots):
            house['x'] = slots[i][0]
            house['y'] = slots[i][1]
            house['facing'] = facings[i]
            
    # Save Houses
    with open("stargazers_houses.json", "w") as f:
        json.dump(houses, f, indent=4)
        
    # Save Roads
    road_data = [{"x": int(r[0]), "y": int(r[1])} for r in roads]
    with open("roads.json", "w") as f:
        json.dump(road_data, f, indent=4)
        
    print(f"Updated layout with {len(houses)} houses and {len(road_data)} road tiles.")

def add_user(username):
    filename = "stargazers_houses.json"
    if not os.path.exists(filename):
        print(f"File {filename} not found. Please run with owner/repo first to generate the base city.")
        return

    with open(filename, "r") as f:
        houses = json.load(f)
        
    # Check if user exists
    if any(h['username'] == username for h in houses):
        print(f"User {username} already exists in the city.")
        return

    # Generate attributes for new user
    attrs = string_to_pseudo_random(username)
    
    # Create new house object (position will be set by recalculate_layout)
    new_house = {
        "x": 0, "y": 0, # Placeholders
        "color": string_to_color(username),
        "roofStyle": attrs[0],
        "doorStyle": attrs[1],
        "windowStyle": attrs[2],
        "chimneyStyle": attrs[3],
        "wallStyle": attrs[4],
        "username": username,
        "facing": "down",
        "has_terrace": False # Default for manual add
    }
    
    houses.append(new_house)
    print(f"Adding new house for {username}...")
    recalculate_layout(houses)

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_stargazers.py owner/repo [token]")
        repo_input = "n8n-io/n8n"
    else:
        repo_input = sys.argv[1]
    
    token = os.environ.get("GITHUB_TOKEN")
    if len(sys.argv) > 2:
        token = sys.argv[2]
            
    # If no slash, treat as "Add User" mode
    if '/' not in repo_input:
        print(f"Detecting single username '{repo_input}'. Adding to existing city...")
        add_user(repo_input)
        return
        
    owner, repo = repo_input.split('/')
    
    stargazers = get_stargazers(owner, repo, token, limit=100)
    contributors = get_contributors(owner, repo, token, limit=100)
    
    if stargazers:
        houses, roads = generate_houses(stargazers, contributors, owner)
        
        with open("stargazers_houses.json", "w") as f:
            json.dump(houses, f, indent=4)
            
        # Format roads for JSON
        road_data = [{"x": int(r[0]), "y": int(r[1])} for r in roads]
        with open("roads.json", "w") as f:
            json.dump(road_data, f, indent=4)
            
        print(f"Successfully generated {len(houses)} houses in stargazers_houses.json")
        print(f"Successfully generated {len(road_data)} road tiles in roads.json")
    else:
        print("No stargazers found (or error).")

if __name__ == "__main__":
    main()
