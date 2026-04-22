import json
import hashlib
import math
import sys
import os
import datetime
import random

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
    
    # 0. Central House
    slots.append((0, 0))
    facing_dir.append("down")
    
    if limit <= 1:
        return slots, facing_dir, []
        
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
                facing_dir.append("left" if house_x > 0 else "right")
                houses_placed += 1
            
            # Road Logic
            def get_r_coord(idx):
                return 0 if idx == 0 else 2 + idx * 8
            
            rx_in = get_r_coord(bx) * qx
            rx_out = get_r_coord(bx + 1) * qx
            ry_in = get_r_coord(by) * qy
            ry_out = get_r_coord(by + 1) * qy
            
            for x in range(int(min(rx_in, rx_out)), int(max(rx_in, rx_out)) + 1):
                road_tiles.add((x, int(ry_in)))
                road_tiles.add((x, int(ry_out)))
            for y in range(int(min(ry_in, ry_out)), int(max(ry_in, ry_out)) + 1):
                road_tiles.add((int(rx_in), y))
                road_tiles.add((int(rx_out), y))
                
    # Clean up central roads
    for i in range(-2, 3):
         if (0, i) in road_tiles: road_tiles.remove((0, i))
         if (i, 0) in road_tiles: road_tiles.remove((i, 0))
         
    for x in range(-2, 3):
        road_tiles.add((x, -2))
        road_tiles.add((x, 2))
    for y in range(-2, 3):
        road_tiles.add((-2, y))
        road_tiles.add((2, y))
                
    return slots, facing_dir, list(road_tiles)

def build_city(names):
    today_str = datetime.datetime.now().isoformat()
    
    # Seed the random generator for stable tree placement
    seed_val = hashlib.md5("".join(names).encode()).hexdigest()
    random.seed(seed_val)
    
    # Generate population list
    cleaned_houses = []
    for name in names:
        attrs = string_to_pseudo_random(name)
        cleaned_houses.append({
            "color": string_to_color(name),
            "roofStyle": attrs[0],
            "doorStyle": attrs[1],
            "windowStyle": attrs[2],
            "chimneyStyle": attrs[3],
            "wallStyle": attrs[4],
            "username": name,
            "has_terrace": False,
            "abandoned": False,
            "joined_at": today_str,
            "last_seen": today_str
        })
    
    # Calculate slots (buffer for trees)
    estimated_total = int(len(cleaned_houses) * 1.3) + 5
    slots, facings, roads = generate_city_slots(estimated_total)
    
    final_output = []
    house_idx = 0
    
    for i, (slot_x, slot_y) in enumerate(slots):
        if house_idx >= len(cleaned_houses): break
            
        remaining_slots = len(slots) - i
        remaining_houses = len(cleaned_houses) - house_idx
        
        # Random trees
        if i > 0 and remaining_slots > remaining_houses and random.random() < 0.2:
             final_output.append({"x": slot_x, "y": slot_y, "obstacle": "tree"})
        else:
            h = cleaned_houses[house_idx]
            h['x'], h['y'], h['facing'] = slot_x, slot_y, facings[i]
            final_output.append(h)
            house_idx += 1
            
    return final_output, roads

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_stargazers.py names.txt")
        return
    
    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return

    print(f"Reading names from {file_path}...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        names = [n.strip() for n in content.replace(',', '\n').split('\n') if n.strip()]
    
    if not names:
        print("Error: No names found.")
        return

    print(f"Generating city for {len(names)} citizens...")
    houses, roads = build_city(names)
    
    if not os.path.exists("data"): os.makedirs("data")
        
    with open("data/houses.json", "w") as f: json.dump(houses, f, indent=4)
    with open("data/roads.json", "w") as f: json.dump([{"x": int(r[0]), "y": int(r[1])} for r in roads], f, indent=4)
    with open("data/world.json", "w") as f: json.dump({"weather": "none", "timeOfDay": "day"}, f, indent=4)
        
    print(f"Successfully generated city in data/houses.json")

if __name__ == "__main__":
    main()
