import json
import urllib.request
import urllib.error
import hashlib
import math
import sys
import os
import datetime
import time

def get_stargazers(owner, repo, token=None, limit=1000):
    url = f"https://api.github.com/repos/{owner}/{repo}/stargazers"
    stargazers = []
    page = 1
    per_page = 50 
    
    headers = {
        "Accept": "application/vnd.github.v3.star+json",
        "User-Agent": "GitVille-Stargazer-Fetcher"
    }
    if token:
        headers["Authorization"] = f"token {token}"
        
    print(f"Fetching max {limit} stargazers from {owner}/{repo}...")
    
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
                        success = True 
                        return stargazers
                    
                    remaining = limit - len(stargazers)
                    stargazers.extend(data[:remaining])
                    
                    print(f"Fetched page {page} (+{len(data[:remaining])}, total {len(stargazers)})")
                    
                    if len(data) < per_page:
                        success = True
                    else:
                        success = True
                        
                    page += 1
                    break
                    
            except (urllib.error.HTTPError, urllib.error.URLError, Exception) as e:
                print(f"Attempt {attempts+1} failed: {e}")
                attempts += 1
                time.sleep(2) 
                
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
        if len(data) == 0: 
            break
            
    return contributors

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
    
    if limit <= 1:
        return slots, facing_dir
        
    HOUSE_GAP = 2
    STREET_GAP = 2 
    MAIN_AVENUE_WIDTH = 6
    
    CLUSTER_ROWS = 4
    CLUSTER_COLS = 4
    HOUSES_PER_BLOCK = CLUSTER_ROWS * CLUSTER_COLS
    
    BLOCK_WIDTH = (CLUSTER_COLS - 1) * HOUSE_GAP
    BLOCK_HEIGHT = (CLUSTER_ROWS - 1) * HOUSE_GAP
    
    BLOCK_STRIDE_X = BLOCK_WIDTH + STREET_GAP
    BLOCK_STRIDE_Y = BLOCK_HEIGHT + STREET_GAP
    
    total_blocks = math.ceil(limit / HOUSES_PER_BLOCK)
    
    quadrants = [(1, -1), (-1, -1), (-1, 1), (1, 1)]
    
    abstract_block_positions = []
    layer = 0
    while len(abstract_block_positions) * 4 < total_blocks + 4:
        for x in range(layer + 1):
            y = layer - x
            abstract_block_positions.append((x, y))
        layer += 1
        
    houses_placed = 0
    road_tiles = set()
    
    for bx, by in abstract_block_positions:
        for q_idx in range(4):
            if houses_placed >= limit: break
            
            qx, qy = quadrants[q_idx]
            
            base_x = (MAIN_AVENUE_WIDTH / 2) * qx
            base_y = (MAIN_AVENUE_WIDTH / 2) * qy
            
            block_start_x = base_x + (bx * BLOCK_STRIDE_X * qx)
            block_start_y = base_y + (by * BLOCK_STRIDE_Y * qy)
            
            for i in range(HOUSES_PER_BLOCK):
                if len(slots) > limit: break 
                
                ix = i % CLUSTER_COLS
                iy = i // CLUSTER_COLS
                
                house_x = block_start_x + (ix * HOUSE_GAP * qx)
                house_y = block_start_y + (iy * HOUSE_GAP * qy)
                
                slots.append((house_x, house_y))
                
                if house_x > 0:
                    facing_dir.append("left")
                else:
                    facing_dir.append("right")
                
                houses_placed += 1
            
            # Roads
            def get_r_coord(idx):
                if idx == 0: return 0
                return 2 + idx * 8
            
            rx_in = get_r_coord(bx) * qx
            rx_out = get_r_coord(bx + 1) * qx
            ry_in = get_r_coord(by) * qy
            ry_out = get_r_coord(by + 1) * qy
            
            sx = int(min(rx_in, rx_out))
            ex = int(max(rx_in, rx_out))
            sy = int(min(ry_in, ry_out))
            ey = int(max(ry_in, ry_out))
            
            for x in range(sx, ex + 1):
                road_tiles.add((x, int(ry_in)))
                road_tiles.add((x, int(ry_out)))
            for y in range(sy, ey + 1):
                road_tiles.add((int(rx_in), y))
                road_tiles.add((int(rx_out), y))
                
    if slots:
        for i in range(-2, 3):
             if (0, i) in road_tiles: road_tiles.remove((0, i))
             if (i, 0) in road_tiles: road_tiles.remove((i, 0))
             
        ring_min = -2
        ring_max = 2
        for x in range(ring_min, ring_max + 1):
            road_tiles.add((x, ring_min))
            road_tiles.add((x, ring_max))
        for y in range(ring_min, ring_max + 1):
            road_tiles.add((ring_min, y))
            road_tiles.add((ring_max, y))
                
    return slots, facing_dir, list(road_tiles)

def sync_houses(live_users, contributors, owner_name):
    """
    Syncs the live list of users with the existing JSON database.
    Handles: New users, Abandoned users, Returning users, Terrace Upgrades.
    """
    filename = "stargazers_houses.json"
    existing_houses = []
    
    if os.path.exists(filename):
        with open(filename, "r") as f:
            try:
                existing_houses = json.load(f)
            except json.JSONDecodeError:
                existing_houses = []
                
    # Create Map of Existing Houses
    # user -> house_obj
    house_map = {h['username']: h for h in existing_houses if 'username' in h}
    
    today_str = datetime.datetime.now().isoformat()
    
    limit_processed = 0
    final_houses_list = []
    
    # 1. Process Live Users (Updates & New Inserts)
    live_usernames = set()
    
    # Add Owner first to 'live' list virtually (always active)
    live_usernames.add(owner_name)
    
    # Fix: live_users is a list of dicts {'user': {'login': 'name'}, ...} (standardized in get_followers)
    # OR it is a list of stargazers similar structure.
    standardized_live = []
    
    # Owner Entry
    standardized_live.append({
        'username': owner_name,
        'metadata': {} # Placeholder
    })
    
    for u in live_users:
        if 'user' in u and 'login' in u['user']:
            login = u['user']['login']
            standardized_live.append({
                'username': login,
                'metadata': u
            })
            live_usernames.add(login)
            
    # Now iterate and update/create
    for live_u in standardized_live:
        username = live_u['username']
        
        if username in house_map:
            # --- EXISTING HOUSE ---
            house = house_map[username]
            was_abandoned = house.get('abandoned', False)
            
            # Update Last Seen
            house['last_seen'] = today_str
            
            if was_abandoned:
                # --- RETURNING USER ---
                print(f"User {username} returned! Restoring house.")
                house['abandoned'] = False
                house['has_terrace'] = False # Reset terrace req
                house['joined_at'] = today_str # Reset timer
            else:
                # --- CONTINUING USER ---
                # Check Terrace Logic
                joined_at_str = house.get('joined_at', today_str) # Default to now if missing
                
                # Handle missing joined_at for legacy houses
                if 'joined_at' not in house:
                    house['joined_at'] = today_str # Start tracking from now
                    
                try:
                    # Parse ISO dates (handle Z or not)
                    joined_dt = datetime.datetime.fromisoformat(joined_at_str.replace('Z', ''))
                    now_dt = datetime.datetime.now()
                    delta = now_dt - joined_dt
                    
                    if delta.days >= 10:
                        if not house.get('has_terrace', False):
                            print(f"User {username} earned a terrace! ({delta.days} days)")
                            house['has_terrace'] = True
                except Exception as e:
                    print(f"Date error for {username}: {e}")
                    
        else:
            # --- NEW USER ---
            print(f"New citizen: {username}")
            attrs = string_to_pseudo_random(username)
            house = {
                "x": 0, "y": 0, # Placeholder
                "color": string_to_color(username),
                "roofStyle": attrs[0],
                "doorStyle": attrs[1],
                "windowStyle": attrs[2],
                "chimneyStyle": attrs[3],
                "wallStyle": attrs[4],
                "username": username,
                "facing": "down",
                "has_terrace": False,
                "abandoned": False,
                "joined_at": today_str,
                "last_seen": today_str
            }
            house_map[username] = house
            
    # 2. Process Abandoned Users (In Map but not in Live)
    for username, house in house_map.items():
        if username not in live_usernames:
            if not house.get('abandoned', False):
                print(f"User {username} left. House abandoned.")
                house['abandoned'] = True
            
            
    # 3. Assemble Final List & Sort
    all_houses = list(house_map.values())
    
    def sort_key(h):
        if h['username'] == owner_name:
            return "0000-00-00" # Owner always first
        return h.get('joined_at', today_str)

    all_houses.sort(key=sort_key)
    
    # 4. Generate Layout (Assign X/Y)
    
    # Filter out pure obstacles from previous load (re-generate trees)
    cleaned_houses = [h for h in all_houses if 'obstacle' not in h]
    
    estimated_total = int(len(cleaned_houses) * 1.3)
    if estimated_total < len(cleaned_houses) + 5: estimated_total = len(cleaned_houses) + 5
    
    slots, facings, roads = generate_city_slots(estimated_total)
    
    final_output = []
    house_idx = 0
    
    import random
    
    for i, (slot_x, slot_y) in enumerate(slots):
        if house_idx >= len(cleaned_houses):
            break
            
        remaining_slots = len(slots) - i
        remaining_houses = len(cleaned_houses) - house_idx
        
        place_tree = False
        if i > 0 and remaining_slots > remaining_houses:
            if random.random() < 0.2:
                place_tree = True
                
        if place_tree:
             final_output.append({
                "x": slot_x,
                "y": slot_y,
                "obstacle": "tree"
            })
        else:
            h = cleaned_houses[house_idx]
            h['x'] = slot_x
            h['y'] = slot_y
            h['facing'] = facings[i]
            
            if h['username'] in contributors:
                h['has_terrace'] = True
            
            final_output.append(h)
            house_idx += 1
            
    return final_output, roads

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_stargazers.py owner/repo [count] [token]")
        print("       python fetch_stargazers.py username (to add single user)")
        repo_input = "n8n-io/n8n"
    else:
        repo_input = sys.argv[1]
    
    limit = 100
    token = os.environ.get("GITHUB_TOKEN")
    
    if len(sys.argv) > 2:
        for arg in sys.argv[2:]:
            if arg.isdigit():
                limit = int(arg)
            else:
                token = arg
            
    if '/' not in repo_input:
         print(f"Detecting single username '{repo_input}'. Adding to existing city...")
         return
        
    owner, repo = repo_input.split('/')
    print(f"Fetch limit set to: {limit}")
    
    is_profile_repo = (owner == repo)
    
    live_users = []
    contributors = set()
    
    if is_profile_repo:
        print(f"Detected Profile Repository '{owner}/{repo}'. Fetching FOLLOWERS.")
        live_users = get_followers(owner, token, limit=limit)
    else:
        print(f"Fetching Stargazers.")
        live_users = get_stargazers(owner, repo, token, limit=limit)
        contributors = get_contributors(owner, repo, token, limit=limit)
        
    if live_users is not None:
        houses, roads = sync_houses(live_users, contributors, owner)
        
        with open("stargazers_houses.json", "w") as f:
            json.dump(houses, f, indent=4)
            
        road_data = [{"x": int(r[0]), "y": int(r[1])} for r in roads]
        with open("roads.json", "w") as f:
            json.dump(road_data, f, indent=4)
            
        print(f"Updated city with {len(houses)} entities.")
    else:
        print("Error fetching users.")

if __name__ == "__main__":
    main()
