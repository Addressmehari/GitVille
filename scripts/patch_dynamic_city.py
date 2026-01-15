import os

script_js_path = r"c:\Users\sbava\OneDrive\Documents\gitville\web\script.js"
dynamic_logic_path = r"c:\Users\sbava\OneDrive\Documents\gitville\scripts\dynamic_logic.js"

with open(script_js_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the start of the init function
start_marker = "async function init() {"
start_idx = content.find(start_marker)

if start_idx == -1:
    print("Error: Could not find 'async function init() {' in script.js")
    exit(1)

# Find the end of the init function using brace counting
brace_count = 0
end_idx = -1
found_start_brace = False

for i in range(start_idx, len(content)):
    char = content[i]
    if char == '{':
        brace_count += 1
        found_start_brace = True
    elif char == '}':
        brace_count -= 1
        if found_start_brace and brace_count == 0:
            end_idx = i + 1
            break

if end_idx == -1:
    print("Error: Could not find matching closing brace for init function.")
    exit(1)

# Read the new content
with open(dynamic_logic_path, 'r', encoding='utf-8') as f:
    new_logic = f.read()

# Replace
new_content = content[:start_idx] + new_logic + content[end_idx:]

# Write back
with open(script_js_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Successfully patched script.js with dynamic logic.")
