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
                        return stargazers
                    
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
    road_tiles = set()
    
    # Loop over abstract positions (0,0), (1,0)...
    for bx, by in abstract_block_positions:
        # For this abstract position, place it in all 4 quadrants (subject to limit)
        
        for q_idx in range(4):
            if houses_placed >= limit: break
            
            qx, qy = quadrants[q_idx]
            
            # Start position of this block in World Space
            # ALGORITHM UPDATE: Fill OUTWARDS from center.
            # Base (Start of Cluster near center)
            base_x = (MAIN_AVENUE_WIDTH / 2) * qx
            base_y = (MAIN_AVENUE_WIDTH / 2) * qy
            
            # Add block strides (Move block origin away from center)
            block_start_x = base_x + (bx * BLOCK_STRIDE_X * qx)
            block_start_y = base_y + (by * BLOCK_STRIDE_Y * qy)
            
            # Fill the block with houses
            for i in range(HOUSES_PER_BLOCK):
                if houses_placed >= limit_remaining: break
                
                # Inner Grid (0..3, 0..3)
                ix = i % CLUSTER_COLS
                iy = i // CLUSTER_COLS
                
                # World Pos - Expanding OUTWARDS from block start
                # qx/qy determines direction of expansion
                house_x = block_start_x + (ix * HOUSE_GAP * qx)
                house_y = block_start_y + (iy * HOUSE_GAP * qy)
                
                slots.append((house_x, house_y))
                
                # Facing Logic: Face the vertical axis (Left/Right)
                if house_x > 0:
                    facing_dir.append("left")
                else:
                    facing_dir.append("right")
                
            # Facing Logic: Face the vertical axis (Left/Right)
                if house_x > 0:
                    facing_dir.append("left")
                else:
                    facing_dir.append("right")
                
                houses_placed += 1
            
            # --- Road Generation for this Block ---
            # We add the roads surrounding this specific block to the set.
            # Road lines indices: Inner = bx, Outer = bx+1
            # Coordinate Formula: 0 if 0, else 2 + idx*8
            def get_r_coord(idx):
                if idx == 0: return 0
                return 2 + idx * 8
            
            rx_in = get_r_coord(bx) * qx
            rx_out = get_r_coord(bx + 1) * qx
            ry_in = get_r_coord(by) * qy
            ry_out = get_r_coord(by + 1) * qy
            
            # Sort to handle negative quadrants correctly
            sx = int(min(rx_in, rx_out))
            ex = int(max(rx_in, rx_out))
            sy = int(min(ry_in, ry_out))
            ey = int(max(ry_in, ry_out))
            
            # Add Horizontal Segments (Top/Bottom of block)
            for x in range(sx, ex + 1):
                road_tiles.add((x, int(ry_in)))
                road_tiles.add((x, int(ry_out)))
                
            # Add Vertical Segments (Left/Right of block)
            for y in range(sy, ey + 1):
                road_tiles.add((int(rx_in), y))
                road_tiles.add((int(rx_out), y))
                
    if slots:
        # --- Central House Adjustment (Post-Process) ---
        # 1. Clear the road UNDER the central house (0,0) and immediate avenue connections
        # to make space for the ring.
        
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

import random

def generate_houses(stargazers, contributors, owner_name):
    # Sort
    stargazers.sort(key=lambda x: x.get('starred_at', '0'))
    
    # Prepend Owner
    # Create a mock entry
    owner_entry = {
         "user": { "login": owner_name },
         "starred_at": "1970-01-01T00:00:00Z" # Dummy date
    }
    
    full_list = [owner_entry] + stargazers
    
    # Get Slots
    # Request extra slots to accommodate trees (e.g. 20% more)
    estimated_total = int(len(full_list) * 1.3)
    # Ensure minimum buffer
    if estimated_total < len(full_list) + 5: estimated_total = len(full_list) + 5
    
    slots, facings, roads = generate_city_slots(estimated_total)
    
    processed_houses = []
    stargazer_idx = 0
    
    for i, (slot_x, slot_y) in enumerate(slots):
        # Stop if we've placed all stargazers
        if stargazer_idx >= len(full_list):
            break
            
        remaining_slots = len(slots) - i
        remaining_houses = len(full_list) - stargazer_idx
        
        # Decide if we place a tree here
        # Rules:
        # 1. Never at index 0 (Reserved for Owner)
        # 2. Only if we have enough spare slots so we don't run out for houses
        # 3. 20% Chance
        
        place_tree = False
        if i > 0 and remaining_slots > remaining_houses:
            if random.random() < 0.2:
                place_tree = True
                
        if place_tree:
            processed_houses.append({
                "x": slot_x,
                "y": slot_y,
                "obstacle": "tree"
            })
            # Do NOT increment stargazer_idx, we still need to place that house
        else:
            strgzr = full_list[stargazer_idx]
            username = strgzr['user']['login']
            attrs = string_to_pseudo_random(username)
            facing = facings[i]
            
            # Check if contributor
            has_terrace = username in contributors
            
            house = {
                "x": slot_x,
                "y": slot_y,
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
            stargazer_idx += 1

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
    if any(h.get('username') == username for h in houses):
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
    
    # Randomly add a tree before the user (20% chance) to maintain density
    if random.random() < 0.2:
        print("Randomly planting a new tree...")
        houses.append({
            "x": 0, "y": 0, # Position set by recalculate_layout
            "obstacle": "tree"
        })
    
    houses.append(new_house)
    print(f"Adding new house for {username}...")
    recalculate_layout(houses)

def get_followers(username, token=None, limit=1000):
    url = f"https://api.github.com/users/{username}/followers"
    followers = []
    page = 1
    per_page = 100
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "GitVille-Follower-Fetcher"
    }
    if token:
        headers["Authorization"] = f"token {token}"
        
    print(f"Fetching max {limit} followers for user {username}...")
    
    import time
    
    while len(followers) < limit:
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
                        success = True
                        return followers
                    
                    # Wrap followers to match stargazer structure: {'user': user_obj}
                    # API returns list of users directly: [{'login':...}, ...]
                    wrapped_data = [{'user': user} for user in data]
                    
                    remaining = limit - len(followers)
                    followers.extend(wrapped_data[:remaining])
                    
                    print(f"Fetched followers page {page} (+{len(wrapped_data[:remaining])}, total {len(followers)})")
                    
                    if len(data) < per_page:
                        success = True
                    else:
                        success = True
                        
                    page += 1
                    break
                    
            except (urllib.error.HTTPError, urllib.error.URLError, Exception) as e:
                print(f"Follower fetch attempt {attempts+1} failed: {e}")
                attempts += 1
                time.sleep(2)
                
        if not success or (len(followers) >= limit):
            if not success:
                print("Failed to fetch followers page after retries.")
            break
            
    return followers

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_stargazers.py owner/repo [count] [token]")
        print("       python fetch_stargazers.py username (to add single user)")
        repo_input = "n8n-io/n8n"
    else:
        repo_input = sys.argv[1]
    
    # Defaults
    limit = 100
    token = os.environ.get("GITHUB_TOKEN")
    
    # Parse optional args (count or token)
    if len(sys.argv) > 2:
        for arg in sys.argv[2:]:
            if arg.isdigit():
                limit = int(arg)
            else:
                token = arg
            
    # If no slash, treat as "Add User" mode
    if '/' not in repo_input:
        print(f"Detecting single username '{repo_input}'. Adding to existing city...")
        add_user(repo_input)
        return
        
    owner, repo = repo_input.split('/')
    
    print(f"Fetch limit set to: {limit}")
    
    # Special Case: Profile Repo (owner == repo) -> Fetch Followers
    if owner == repo:
        print(f"Detected Profile Repository '{owner}/{repo}'. Fetching FOLLOWERS instead of Stargazers.")
        stargazers = get_followers(owner, token, limit=limit)
        contributors = set() # Skip contributors for profile repo
    else:
        stargazers = get_stargazers(owner, repo, token, limit=limit)
        contributors = get_contributors(owner, repo, token, limit=limit)
    
    # We proceed even if stargazers is empty, because we always generate the owner's house
    if stargazers is not None:
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
        print("Error fetching users.")

if __name__ == "__main__":
    main()
