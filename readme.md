🏘️ GitVille

««GitHub, But You Can Walk Through It. 🌍»»

GitVille is one of my favorite projects. ❤️

It is a small visualization engine that turns GitHub data into a living isometric world.

GitVille is not just about turning stars into houses. The idea is to visualize GitHub communities and repository data as a world that people can explore.

Users can become houses and citizens, while roads, trees, NPCs, clouds, lighting, and other elements make the world feel alive.

---

✨ What is GitVille?

Instead of seeing GitHub data only as numbers:

⭐ Stars: 120
👥 Contributors: 18
🐛 Issues: 24
🔀 Pull Requests: 31

GitVille tries to turn that data into something visual:

        🏠
   🛣️       🛣️
🏠   🏠   🏠
   🌳  🧍  🌳
        🏠

The goal is simple:

Turn data into a world. 🏘️

---

🎮 Features

- 🏠 GitHub users represented as houses
- 🛣️ Procedurally generated roads and city layout
- 🌳 Trees and environmental objects
- 🧍 Moving NPCs
- ☁️ Clouds
- 🌙 Day/night appearance
- 🔍 Search for citizens
- 📱 Interactive camera and zoom
- 🎨 Deterministic house designs based on usernames
- 📦 JSON-based world data

---

🧰 Tech Stack

- Python — Data and city generation
- HTML
- CSS
- Vanilla JavaScript
- HTML5 Canvas
- JSON

GitVille doesn't use a large frontend framework or game engine. The world is rendered directly using Canvas.

---

📁 Project Structure

GitVille/
│
├── data/
│   ├── houses.json
│   ├── roads.json
│   └── world.json
│
├── scripts/
│   └── fetch_houses.py
│
├── web/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   ├── npc.js
│   ├── clouds.js
│   └── tree.js
│
├── test_names.txt
├── LICENSE
└── README.md

---

🚀 Run Locally

Clone the repository:

git clone https://github.com/Addressmehari/GitVille.git
cd GitVille

Generate the city:

python scripts/fetch_houses.py test_names.txt

Start a local server:

python -m http.server 8000

Then open:

http://localhost:8000/web/

---

🏗️ How It Works

GitHub Data
     ↓
Python Generator
     ↓
JSON World Data
     ↓
JavaScript
     ↓
HTML5 Canvas
     ↓
🏘️ GitVille

Python creates the world data, while JavaScript renders it as an interactive isometric world.

---

🔮 Future Ideas

Some ideas for GitVille:

- ⭐ Live GitHub data
- 👥 Contributor citizens
- 🔀 Pull request events
- 🐛 Issue events
- 📊 Repository statistics
- 🌦️ Dynamic weather
- 🌅 Full day/night cycle
- 🚶 Better NPC behavior
- 🔗 Open GitHub profiles from houses
- 🌍 Multiple repository worlds

---

🤝 Contributing

Contributions, ideas, improvements, and new visualization ideas are welcome!

1. Fork the repository
2. Create a branch
3. Make your changes
4. Commit your changes
5. Open a pull request

---

📜 License

GitVille is released under the MIT License.

See ""LICENSE"" (LICENSE) for the complete license.

---

❤️ My Favorite Project

GitVille is one of my favorite projects because it combines GitHub, procedural generation, visualization, and game-like worlds into one idea.

It's my attempt to answer a simple question:

«What if data could become a place?»

🏘️ GitVille — Turn GitHub data into a world.