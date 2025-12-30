import sys
import json
import random
import os

def load_world():
    if not os.path.exists('world.json'):
        return {"weather": "none", "timeOfDay": "day"}
    with open('world.json', 'r') as f:
        return json.load(f)

def save_world(data):
    with open('world.json', 'w') as f:
        json.dump(data, f, indent=4)

def update_weather():
    data = load_world()
    # 1/3 chance for rain, otherwise none
    if random.random() < 1/3:
        data['weather'] = 'rain'
    else:
        data['weather'] = 'none'
    save_world(data)
    print(f"Weather updated to: {data['weather']}")

def update_daynight():
    data = load_world()
    current = data.get('timeOfDay', 'day')
    if current == 'day':
        data['timeOfDay'] = 'night'
    else:
        data['timeOfDay'] = 'day'
    save_world(data)
    print(f"Time of day updated to: {data['timeOfDay']}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python world.py [weather|daynightcycle]")
        sys.exit(1)
    
    command = sys.argv[1]
    if command == 'weather':
        update_weather()
    elif command == 'daynightcycle':
        update_daynight()
    else:
        print(f"Unknown command: {command}")
