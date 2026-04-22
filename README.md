# 🏘️ GitVille - The Local City Generator

GitVille is a procedural engine that transforms a simple list of names into a living, interactive, isometric city. Originally built for GitHub, this version has been streamlined for **100% local, offline use**.

---

## 🌟 How it Works

Every name you provide is algorithmically transformed into a unique citizen with:
- **🎨 Custom House Style**: Unique colors, roofs, and architectural details.
- **📍 Deterministic Placement**: The same list of names will always produce the exact same city layout.
- **🛣️ Infrastructure**: The engine automatically generates road networks and clusters neighborhoods.
- **🌲 Organic Zoning**: Trees and greenery are procedurally scattered to fill the gaps.

---

## 🚀 Getting Started

### 1. Define Your Citizens
Create a `.txt` file (e.g., `names.txt`) and add names separated by commas or new lines:
```text
Hari, HP, Olivia, Alex, Samuel
```

### 2. Generate the City
Run the generator script with your text file as the input:
```bash
python scripts/fetch_stargazers.py names.txt
```
*This updates the local `data/` files used by the web engine.*

### 3. Explore Your World
Start a local server and open the `web/` directory in your browser:
```bash
# Example using Python 3
python -m http.server 8000
```
Then visit: `http://localhost:8000/web/`

---

## ✨ Features

- **∞ Unlimited Scale**: Visualize communities of any size, from a small village to a massive metropolis.
- **🎨 Live Aesthetics**:
  - **Dynamic Weather**: Rain, wind, and cloud systems.
  - **Day/Night Cycle**: Real-time atmospheric lighting.
- **🔍 City Directory**: Use the interactive search bar to find and navigate to any "citizen."
- **⚡️ Pure Performance**: Custom HTML5 Canvas isometric renderer with zero external dependencies.

---

## 📂 Project Structure

```text
GitVille/
├── data/               # The "source of truth" JSON world data
├── scripts/            # Python City Generator
│   └── fetch_stargazers.py
├── web/                # The Visual Engine (HTML/CSS/JS)
└── test_names.txt      # Your input names list
```

---

Made for the community • Local & Offline Version
