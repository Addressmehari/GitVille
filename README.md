# 🏘️ GitVille - The GitHub City Generator

[![GitVille Dynamic City](https://placehold.co/1200x400/2563eb/ffffff?text=GitVille:+Turn+GitHub+Profiles+into+Living+Cities)](https://addressmehari.github.io/GitVille/web/?u=addressmehari/GitVille)

> **🚀 NEW: Dynamic Mode is Live!**
>
> You can now instantly generate a city for **ANY** GitHub user or repository just by changing the URL.
>
> **[👉 Try it: Visualize potential AI overlord @torvalds](https://addressmehari.github.io/GitVille/web/?u=torvalds)**
> **[👉 Try it: See the massive city of @facebook/react](https://addressmehari.github.io/GitVille/web/?u=facebook/react)**

---

## 🌟 What is GitVille?

GitVille is a procedural generation engine that turns GitHub data into an interactive, isometric city.
Every **Follower** or **Stargazer** becomes a unique house, creating a living visualization of a community.

Originally designed to visualize just *this* repo's stargazers, it has evolved into a universal **"City Explorer"** for the entire GitHub ecosystem.

---

## ✨ Features

- **∞ Universal Compatibility**: Works with any public GitHub User or Repository.
- **⚡️ Client-Side Generation**: No backend required. Your browser fetches data directly from GitHub.
- **🏙️ Massive Scale**: Intelligently renders cities up to **1,000 houses** with zero lag using a creative "Ghost Citizen" system for huge communities.
- **🎨 Live Aesthetics**:
  - **Dynamic Weather**: Rain, wind, and cloud systems.
  - **Day/Night Cycle**: Real-time atmospheric lighting.
  - **Organic Zoning**: Algorithmically places houses and trees for a natural look.
- **🔍 Details**: Inspect any house to see the user's name and join date.

---

## 🚀 How to Use

### 1. The "Magic Link" Method

You don't need to install anything. Just add `?u=` to the URL:

**For Users:**

`https://addressmehari.github.io/GitVille/web/?u={USERNAME}`

> Example: `.../web/?u=shadcn`

**For Repositories:**

`https://addressmehari.github.io/GitVille/web/?u={OWNER}/{REPO}`

> Example: `.../web/?u=torvalds/linux`

### 2. Run It Locally

Want to hack on the engine?

```bash
# Clone the repo
git clone https://github.com/addressmehari/GitVille.git
cd GitVille

# Start a local server (Python 3)
python -m http.server 8000

# Open in browser
# http://localhost:8000/web/?u=your_username
```

---

## 🛠️ Technical Details

The core of GitVille is a lightweight, dependency-free JavaScript engine located in `web/script.js`.

### 🏗️ City Generation Algorithm

1. **Data Fetching**:
   - Fetches the target profile/repo info from GitHub API.
   - Pulls a sample of real followers/stargazers.
   - If the community is huge (e.g., 50k stars), it procedurally generates "Ghost Citizens" to fill the city without hitting API rate limits.

2. **Zoning**:
   - Uses a diamond-expansion algorithm to create city blocks.
   - Allocates slots for houses and generates a connected road network.
   - Injects trees into empty slots (20% probability) for organic distribution.

3. **Rendering**:
   - Custom HTML5 Canvas isometric renderer.
   - Handles z-sorting (depth) to ensure correct occlusion of buildings.

### ⚠️ API Limits

GitHub allows **60 requests/hour** for anonymous IP addresses.

- If you click too fast, you might see a **Red Alert** dialog.
- This is a GitHub limitation, not a bug. Just wait a few minutes or authenticate (if running locally).

---

## 📂 Project Structure

```text
GitVille/
├── data/               # Static JSON data (for the default view)
├── scripts/            # Python helpers & SVG generators
├── web/                # The Frontend Application
│   ├── images/         # Asset textures
│   ├── script.js       # Main Game Engine & Logic
│   ├── style.css       # UI Styling
│   └── index.html      # Entry Point
└── output/             # Generated artifacts (e.g. SVGs)
```

---

## 📸 Gallery

|      **Day Mode**      |      **Terrace Mode**      |
| :--------------------: | :----------------------: |
| ![Day](web/images/1.jpeg) | ![Terrace](web/images/2.jpeg) |

|   **Roads**    |    **Massive Scale**     |
| :--------------------: | :----------------------: |
| ![Roads](web/images/3.jpeg) | ![Scale](web/images/4.jpeg) |

---

Made with ❤️ for the Open Source Community

MIT License • Created by [Addressmehari](https://github.com/addressmehari)
