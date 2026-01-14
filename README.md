# 🏘️ GitVille - GitHub Stargazer City

[![GitVille](https://placehold.co/1200x400/f59e0b/1f2937?text=Star+the+Repo+%E2%86%92+Get+a+House)](https://addressmehari.github.io/GitVille/)

> **⭐️ Star this repository to get your own house in the city!**
>
> GitVille is a creative visualization of this repo's stargazers. Every star automatically builds a unique house in an infinite, interactive isometric world.
>
> **[👉 Visit the Live City](https://addressmehari.github.io/GitVille/)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python Version](https://img.shields.io/badge/python-3.8%2B-blue)](https://www.python.org/)
[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Website](https://img.shields.io/website?url=https%3A%2F%2Faddressmehari.github.io%2FGitVille%2F&label=Live%20Demo&up_message=online&style=flat-square)](https://addressmehari.github.io/GitVille/)

---

## 📖 Table of Contents

- [✨ Features](#-features)
- [📸 Gallery](#-gallery)
- [How It Works](#-how-it-works)
- [🚀 Quick Start](#-quick-start)
- [🎮 Controls](#-controls)
- [⚙️ Configuration](#-configuration)
- [🤖 Automations](#--automations)

---

## ✨ Features

- **Isometric Rendering**: A custom-built 2:1 isometric engine using HTML5 Canvas.
- **Dynamic World**: The city grows as the repository gets more stars.
- **Living Environment**:
  - 🌤️ **Day/Night Cycles**: Automatic transitions affecting lighting and shadows.
  - 🌧️ **Weather System**: Particle-based rain and environmental effects.
  - 💨 **Procedural Vegetation**: Grass, flowers, and trees that sway in the wind.
  - ☁️ **Cloud System**: Moving clouds casting shadows on the ground.
  - 🚶 **NPCs**: Tiny inhabitants wandering the streets.
- **Interactive**: Zoom, pan, and inspect houses.

---

## 📸 Gallery

<p align="center">
  <img src="images/1.jpeg" width="45%" />
  <img src="images/2.jpeg" width="45%" />
  <img src="images/3.jpeg" width="45%" />
  <img src="images/4.jpeg" width="45%" />
  <img src="images/5.png" width="45%" />
  <img src="images/6.png" width="45%" />
</p>

---

## 🔍 How It Works

GitVille supports two modes:

1. **Repository Mode**: Builds a city of **Stargazers** (if the target is a regular repo).
2. **Profile Mode**: Builds a city of **Followers** (if the target is a user profile repo, e.g., `username/username`).

### 🏙️ City Rules

The city is alive and reacts to user actions:

| Action                 | Result                                                                          |
| :--------------------- | :------------------------------------------------------------------------------ |
| **Follow / Star**      | A new house is built for you immediately.                                       |
| **Unfollow / Unstar**  | Your house becomes **Abandoned** (dark, broken windows).                        |
| **Re-Follow**          | Your house is restored! (Status resets).                                        |
| **Sentinel (10 Days)** | If you stay for **10 days**, your house gets a **Terrace** (2nd Floor Upgrade). |

### ⚙️ Data Flow

```
⭐ GitHub API (Followers/Stars)
     |
     v
🐍 fetch_stargazers.py (Daily Sync)
     |
     v
📁 stargazers_houses.json (State Database)
     |
     v
🌍 Frontend (Render)
```

1.  **Daily Sync**: The `daily_city_update` workflow runs every night at 12 AM.
2.  **State Tracking**: It compares the live list with the city records to detect unfollowers or upgrades.
3.  **Rendering**: The browser loads the data and renders the isometric world.

---

---

## 🎮 Controls

| Action       | Mouse               | Touch        |
| :----------- | :------------------ | :----------- |
| **Pan**      | Click & Drag        | Swipe        |
| **Zoom**     | Scroll Wheel        | Pinch        |
| **Interact** | Left Click on House | Tap on House |

---

## ⚙️ Configuration

You can manually tweak the world state by editing `world.json` or using the helper script.

<details>
<summary><strong>🌍 World State Commands</strong></summary>

Use `world.py` to toggle environmental effects:

```bash
# Randomize Weather (Rain/Clear)
python world.py weather

# Toggle Day/Night
python world.py daynightcycle
```

The frontend will automatically reflect these changes on the next reload (or if configured to poll).

</details>

---

## 🤖 Automations

This repository includes GitHub Actions to keep the city alive:

- **Update Stargazers**: Runs regularly to fetch new stars and expand the city.
- **Weather Cycle**: Changes the weather periodically to keep the view dynamic.
- **Day/Night Cycle**: Synchronizes the visual theme with scheduled times.

---

<p align="center">
  Made with ❤️ for the Open Source Community
</p>
