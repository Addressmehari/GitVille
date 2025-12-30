import json
import urllib.request
import urllib.error
import hashlib
import math
import sys
import os

def get_stargazers(owner, repo, token=None, limit=300):
    url = f"https://api.github.com/repos/{owner}/{repo}/stargazers"
    stargazers = []
    page = 1
    per_page = 100
    
    headers = {
        "Accept": "application/vnd.github.v3.star+json"
    }
    if token:
        headers["Authorization"] = f"token {token}"
        
    print(f"Fetching max {limit} stargazers from {owner}/{repo}...")
    
    while len(stargazers) < limit:
        try:
            req = urllib.request.Request(f"{url}?page={page}&per_page={per_page}", headers=headers)
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                if not data:
                    break
                
                remaining = limit - len(stargazers)
                stargazers.extend(data[:remaining])
                
                print(f"Fetched page {page} ({len(data[:remaining])} new items, total {len(stargazers)})")
                
                if len(data) < per_page:
                    break
                    
                page += 1
        except urllib.error.HTTPError as e:
            print(f"Error fetching data: {e}")
            if e.code == 403:
                print("Rate limit exceeded. Try providing a GitHub token.")
            break
        except Exception as e:
            print(f"An error occurred: {e}")
            break
            
    return stargazers

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
    
def generate_city_slots(limit):
    slots = []
    facing_dir = []
    
    # Configuration for "Cluster Grid"
    # Organized "Neighborhoods" with clear separation
    CLUSTER_ROWS = 4
    CLUSTER_COLS = 4
    HOUSES_PER_BLOCK = CLUSTER_ROWS * CLUSTER_COLS
    
    HOUSE_GAP = 2  # Dense spacing inside block
    STREET_GAP = 4 # Gap between blocks (Total distance = Size + Gap)
    
    # Size of one block in coordinate units
    BLOCK_WIDTH = (CLUSTER_COLS - 1) * HOUSE_GAP
    BLOCK_HEIGHT = (CLUSTER_ROWS - 1) * HOUSE_GAP
    
    # Stride to next block
    BLOCK_STRIDE_X = BLOCK_WIDTH + STREET_GAP
    BLOCK_STRIDE_Y = BLOCK_HEIGHT + STREET_GAP
    
    # We need ceil(limit / 16) blocks
    total_blocks = math.ceil(limit / HOUSES_PER_BLOCK)
    
    # 1. Generate Block Origins (Spiral Pattern for Blocks)
    # This ensures the city grows centrally
    block_origins = []
    x, y = 0, 0
    dx, dy = 1, 0
    segment_length = 1
    segment_passed = 0
    turns = 0
    
    for _ in range(total_blocks):
        block_origins.append((x, y))
        
        x += dx
        y += dy
        segment_passed += 1
        
        if segment_passed == segment_length:
            segment_passed = 0
            dx, dy = -dy, dx
            turns += 1
            if turns % 2 == 0:
                segment_length += 1
                
    # 2. Fill Houses
    for i in range(limit):
        # Which block is this house in?
        block_idx = i // HOUSES_PER_BLOCK
        # Which position inside the block?
        inner_idx = i % HOUSES_PER_BLOCK
        
        # Block Coordinates (Grid Units)
        bx_grid, by_grid = block_origins[block_idx]
        
        # Inner Coordinates (Grid Units 0..3)
        ix_grid = inner_idx % CLUSTER_COLS
        iy_grid = inner_idx // CLUSTER_COLS
        
        # Calculate Final World Coordinates
        # World Axis: X is Right/Left, Y is Down/Up
        
        # Block Origin in World Units
        # We need to center the spiral a bit? 
        # Spiral starts at 0,0, but goes positive mostly first.
        # Let's just stick to the calculation, (0,0) is the center block.
        
        origin_x = bx_grid * BLOCK_STRIDE_X
        origin_y = by_grid * BLOCK_STRIDE_Y
        
        # House Offset
        offset_x = ix_grid * HOUSE_GAP
        offset_y = iy_grid * HOUSE_GAP
        
        final_x = origin_x + offset_x
        final_y = origin_y + offset_y
        
        # Center the block itself? 
        # A 4x4 block is centered if we subtract half its size. 
        # But (0,0) is usually top-left of the first block in this logic. 
        # To make (0,0) the TRUE center of the layout, we'd need global bounds.
        # Let's adjust slightly so the visually "center" house is near 0,0
        # The spiral expands around block 0. Block 0 is at 0,0.
        # Simply centering Block 0 around the origin is enough for a good look.
        final_x -= BLOCK_WIDTH / 2
        final_y -= BLOCK_HEIGHT / 2
        
        slots.append((final_x, final_y))
        
        # Facing Logic
        # Face the nearest street (Edge of the block)
        # 0..3 index logic
        # If col 0 -> Face Left (Street)
        # If col 3 -> Face Right (Street)
        # If row 0 -> Face Up/Down?
        # Let's prioritize Left/Right facing as distinct "fronts".
        # Inner columns (1, 2) can face outwards too.
        
        if ix_grid < CLUSTER_COLS / 2:
            facing_dir.append("left")
        else:
            facing_dir.append("right")
            
    return slots, facing_dir

def generate_houses(stargazers):
    # Sort
    stargazers.sort(key=lambda x: x['starred_at'])
    
    # Get Slots
    slots, facings = generate_city_slots(len(stargazers))
    
    processed_houses = []
    
    for i, strgzr in enumerate(stargazers):
        if i >= len(slots): break
        
        username = strgzr['user']['login']
        attrs = string_to_pseudo_random(username)
        x, y = slots[i]
        facing = facings[i]
        
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
            "facing": facing
        }
        processed_houses.append(house)

    return processed_houses

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_stargazers.py owner/repo [token]")
        repo_input = "octocat/Hello-World"
    else:
        repo_input = sys.argv[1]
    
    token = os.environ.get("GITHUB_TOKEN")
    if len(sys.argv) > 2:
        token = sys.argv[2]
            
    if '/' not in repo_input:
        print("Invalid format. Use owner/repo")
        return
        
    owner, repo = repo_input.split('/')
    stargazers = get_stargazers(owner, repo, token, limit=300)
    
    if stargazers:
        houses = generate_houses(stargazers)
        with open("stargazers_houses.json", "w") as f:
            json.dump(houses, f, indent=4)
        print(f"Successfully generated {len(houses)} houses in stargazers_houses.json")

if __name__ == "__main__":
    main()
