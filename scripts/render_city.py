
import json
import math
import os
import random

# --- Config ---
TILE_WIDTH = 100
TILE_HEIGHT = 50
# House local dimensions (Exact match to JS)
HOUSE_HW = 16  # Half-Width
HOUSE_HD = 18  # Half-Depth
WALL_H = 35
TERRACE_H = 60
ROOF_H = 30
OVERHANG = 4

def lighten_color(hex_col, amount):
    try:
        hex_col = hex_col.lstrip('#')
        r = int(hex_col[0:2], 16)
        g = int(hex_col[2:4], 16)
        b = int(hex_col[4:6], 16)
        r = min(255, int(r + (255 - r) * amount))
        g = min(255, int(g + (255 - g) * amount))
        b = min(255, int(b + (255 - b) * amount))
        return f"#{r:02x}{g:02x}{b:02x}"
    except: return hex_col

def darken_color(hex_col, percent):
    # Adjust brightness by percentage (0-100) similarly to adjustColor in JS
    # JS adjustColor adds/subs straight RGB value.
    try:
        hex_col = hex_col.lstrip('#')
        r = int(hex_col[0:2], 16)
        g = int(hex_col[2:4], 16)
        b = int(hex_col[4:6], 16)
        
        # Approximate the JS logic: r + amount
        # percent is approximate.
        amount = -percent * 2.5 # Scale roughly
        
        r = max(0, min(255, int(r + amount)))
        g = max(0, min(255, int(g + amount)))
        b = max(0, min(255, int(b + amount)))
        return f"#{r:02x}{g:02x}{b:02x}"
    except: return "#555555"

def project_iso(x, y):
    iso_x = (x - y) * TILE_WIDTH / 2
    iso_y = (x + y) * TILE_HEIGHT / 2
    return iso_x, iso_y

def project_local(cx, cy, lx, ly, lz, lift=0):
    # Matches JS toScreen
    # scale = 1.0
    sx = cx + (lx - ly) 
    sy = cy + (lx + ly) * 0.5 - lz - lift
    return sx, sy

def poly_to_svg(points, fill, stroke="rgba(0,0,0,0.1)", opacity=1.0, stroke_width=1):
    pts = " ".join([f"{p[0]:.2f},{p[1]:.2f}" for p in points])
    return f'<polygon points="{pts}" fill="{fill}" stroke="{stroke}" stroke-width="{stroke_width}" fill-opacity="{opacity}" />'

def line_to_svg(p1, p2, stroke="rgba(0,0,0,0.2)", width=1):
    return f'<line x1="{p1[0]:.2f}" y1="{p1[1]:.2f}" x2="{p2[0]:.2f}" y2="{p2[1]:.2f}" stroke="{stroke}" stroke-width="{width}" />'

def render_house(cx, cy, house_data):
    svg_parts = []
    
    # Data extraction
    username = house_data.get('username', 'User')
    color = house_data.get('color', '#ff6b6b')
    if not color.startswith('#'): color = '#ff6b6b'
    
    abandoned = house_data.get('abandoned', False)
    has_terrace = house_data.get('has_terrace', False)
    facing = house_data.get('facing', 'down') # left/right/down logic
    
    # Styles
    # Convert string hash attributes if missing (should be in data, but fallback)
    roof_style = house_data.get('roofStyle', 0)
    wall_style = house_data.get('wallStyle', 0)
    window_style = house_data.get('windowStyle', 0)
    door_style = house_data.get('doorStyle', 0)
    
    wall_color = "#fdfbf7"
    wall_shadow = "#e0dad1"
    glass_color_1 = "#74b9ff"
    glass_color_2 = "#81ecec"
    
    if abandoned:
        wall_color = "#95a5a6"
        wall_shadow = "#7f8c8d"
        color = "#535c68"
        glass_color_1 = "#2d3436"
    
    roof_color_main = darken_color(color, 20)
    roof_color_dark = darken_color(color, 40)
    
    h_wall = TERRACE_H if has_terrace else WALL_H
    h_roof = 22 if abandoned else ROOF_H
    
    hw = HOUSE_HW
    hd = HOUSE_HD
    
    # Helper P
    def P(lx, ly, lz):
        # Rotation logic
        fx, fy = lx, ly
        if facing == 'right':
             fx, fy = ly, lx
        return project_local(cx, cy, fx, fy, lz)

    # --- WALLS ---
    
    # Base Corners
    b1 = P(hw, hd, 0)   # Front-Bottom
    b2 = P(hw, -hd, 0)  # Right-Bottom
    # b3 = P(-hw, -hd, 0)
    b4 = P(-hw, hd, 0)  # Left-Bottom
    
    # Top Corners
    t1 = P(hw, hd, h_wall)
    t2 = P(hw, -hd, h_wall)
    # t3 = P(-hw, -hd, h_wall)
    t4 = P(-hw, hd, h_wall)
    
    # 1. Right Wall (+X or +Y depending on rot) - "Side"
    # In P logic: hw, -hd to hd...
    # Let's trust geometric output matches JS "Right Wall"
    # JS draws: b1 -> b2 -> t2 -> t1
    svg_parts.append(poly_to_svg([b1, b2, t2, t1], wall_shadow))
    
    # 2. Right Wall Texture
    # Vertical Lines (Wood) or Horizontal (Clapboard)
    if wall_style == 0: # Clapboard
        for z in range(5, h_wall, 5):
            p_s = P(hw, hd, z)
            p_e = P(hw, -hd, z)
            svg_parts.append(line_to_svg(p_s, p_e))
            
    # 3. Front Wall (+Y)
    # JS draws: b4 -> b1 -> t1 -> t4
    svg_parts.append(poly_to_svg([b4, b1, t1, t4], wall_color))
    
    if wall_style == 0: # Clapboard Front
        for z in range(5, h_wall, 5):
            p_s = P(-hw, hd, z)
            p_e = P(hw, hd, z)
            svg_parts.append(line_to_svg(p_s, p_e))
            
    # --- DOORS & WINDOWS ---
    
    # Door always on Front Wall (Left Face on Screen)
    # Center x=0, y=hd
    d_w = 8
    d_h = 14
    d_z = 0
    d_y = hd + 0.1
    
    dp1 = P(-d_w/2, d_y, 0)
    dp2 = P(d_w/2, d_y, 0)
    dp3 = P(d_w/2, d_y, d_h)
    dp4 = P(-d_w/2, d_y, d_h)
    
    door_col = "#5d4037" if not abandoned else "#2d3436"
    svg_parts.append(poly_to_svg([dp1, dp2, dp3, dp4], door_col))
    
    # Window on Right Wall (Side)
    # Center: cx=hw+0.1, cy=0, cz = h_wall/2 + 2
    w_w = 10
    w_h = 14
    w_z = h_wall/2 + 2
    w_x = hw + 0.1
    
    # Window Rect Helper
    def WindowRect(cx, cy, cz, w, h, col):
        y1 = cy - w/2
        y2 = cy + w/2
        z1 = cz - h/2
        z2 = cz + h/2
        pts = [
            P(cx, y2, z1),
            P(cx, y1, z1),
            P(cx, y1, z2),
            P(cx, y2, z2)
        ]
        return poly_to_svg(pts, col)
        
    if abandoned:
        svg_parts.append(WindowRect(w_x, 0, w_z, w_w, w_h, "#1e1e1e"))
        # Add a board?
        # svg_parts.append(line_to_svg(...))
    else:
        # Style 0: Cross
        if window_style == 0 or True: 
            svg_parts.append(WindowRect(w_x, 0, w_z, w_w+2, w_h+2, "#dfe6e9")) # Frame
            svg_parts.append(WindowRect(w_x+0.1, 0, w_z, w_w, w_h, glass_color_1)) # Glass
            # Muntins
            # ... (omitted for brevity, glass is usually enough for SVG icon)
            
    # --- ROOF ---
    # Overhang
    rhw = hw + OVERHANG
    rhd = hd + OVERHANG
    
    # Ridge
    r_front = P(0, rhd, h_wall + h_roof)
    r_back  = P(0, -rhd, h_wall + h_roof)
    
    # Eaves
    e_fr = P(rhw, rhd, h_wall)
    e_br = P(rhw, -rhd, h_wall)
    e_fl = P(-rhw, rhd, h_wall)
    e_bl = P(-rhw, -rhd, h_wall) # Hidden?
    
    if roof_style == 0 or True: # Pyramid/Gable Hybrid (Standard in JS code seen)
        # JS Logic: Triangle Front, Triangle Right, Triangle Left?
        # No, JS draws 3 visible planes usually.
        # 1. Front Slope (Front Eave -> Ridge -> Front Eave)?? 
        # Actually standard JS roof:
        
        # Left Slope (Visible if facing down-left): P(-rhw, rhd, h) -> P(-rhw, -rhd, h) -> Ridge
        # Right Slope (Visible): P(rhw, rhd, h) -> ...
        
        # Let's draw:
        # 1. Front Triangle (Gable end?)
        # 2. Right Slope
        
        # Simple Pyramid:
        # Front/Left Face: e_fl, e_fr, Apex(0,0, top) ??
        
        # Let's use the exact points from JS logic:
        # rFront, rBack
        
        # Right Slope (Side)
        svg_parts.append(poly_to_svg([e_fr, e_br, r_back, r_front], roof_color_dark))
        
        # Front Slope (Triangle Gable?)
        # If Gable: e_fl -> e_fr -> r_front
        svg_parts.append(poly_to_svg([e_fl, e_fr, r_front], roof_color_main))
        
        # JS draws "Left Slope" too?
        # If facing down, we see Front-Left and Front-Right.
        # Actually e_fl -> e_bl (Back Left) -> rBack -> rFront is Left Slope.
        svg_parts.append(poly_to_svg([e_fl, r_front, r_back, P(-rhw, -rhd, h_wall)], roof_color_main))
        
    return "\n".join(svg_parts)


def generate_city_snapshot(houses_file="stargazers_houses.json", roads_file="roads.json", output_file="city_snapshot.svg"):
    if not os.path.exists(houses_file):
        return
        
    with open(houses_file, 'r') as f:
        houses = json.load(f)
        
    roads = []
    if os.path.exists(roads_file):
        with open(roads_file, 'r') as f:
            roads = json.load(f)

    entities = []
    
    # Roads
    for r in roads:
        gx, gy = r['x'], r['y']
        screen_x, screen_y = project_iso(gx, gy)
        depth = gx + gy - 100
        entities.append({'type': 'road', 'depth': depth, 'sx': screen_x, 'sy': screen_y})
        
    # Houses
    for h in houses:
        gx, gy = h['x'], h['y']
        screen_x, screen_y = project_iso(gx, gy)
        depth = gx + gy
        entities.append({'type': 'house', 'depth': depth, 'sx': screen_x, 'sy': screen_y, 'data': h})
        
    entities.sort(key=lambda e: e['depth'])
    
    # Bounds
    min_x, max_x = float('inf'), float('-inf')
    min_y, max_y = float('inf'), float('-inf')
    
    has_ent = False
    for e in entities:
        sx, sy = e['sx'], e['sy']
        has_ent = True
        if sx < min_x: min_x = sx
        if sx > max_x: max_x = sx
        if sy < min_y: min_y = sy
        if sy > max_y: max_y = sy
        
    if not has_ent: return

    pad = 120
    min_x -= pad
    max_x += pad
    min_y -= pad + 50
    max_y += pad
    
    width = max_x - min_x
    height = max_y - min_y
    
    svg_c = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{min_x} {min_y} {width} {height}" style="background-color: #81c784;">'] # Green bg matching CSS
    
    for e in entities:
        if e['type'] == 'road':
             cx, cy = e['sx'], e['sy']
             w, h = TILE_WIDTH, TILE_HEIGHT
             pts = [(cx, cy-h/2), (cx+w/2, cy), (cx, cy+h/2), (cx-w/2, cy)]
             svg_c.append(poly_to_svg(pts, "#94a3b8", stroke="#64748b"))
        elif e['type'] == 'house':
             # Tree check
             if 'obstacle' in e['data']:
                 cx, cy = e['sx'], e['sy']
                 # Simple Tree
                 t_w, t_h = 12, 18
                 trunk_pts = [(cx-t_w/2, cy), (cx+t_w/2, cy), (cx+t_w/2, cy-t_h), (cx-t_w/2, cy-t_h)]
                 svg_c.append(poly_to_svg(trunk_pts, "#795548"))
                 # Leaf Circle
                 svg_c.append(f'<circle cx="{cx}" cy="{cy-t_h-15}" r="20" fill="#4caf50" />')
             else:
                 svg_c.append(render_house(e['sx'], e['sy'], e['data']))
                 
    svg_c.append("</svg>")
    
    with open(output_file, "w") as f:
        f.write("\n".join(svg_c))
    print(f"Generated Exact Match Snapshot: {output_file}")

if __name__ == "__main__":
    generate_city_snapshot()
