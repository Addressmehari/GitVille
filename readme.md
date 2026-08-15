🏘️ GitVille

«⭐ Every Star, 🏠 Turned into a House!»

GitVille is a small isometric world that turns a GitHub community into a living city.

Instead of looking at GitHub statistics as numbers, GitVille gives them a visual form. GitHub users can become houses and citizens, while roads, trees, NPCs, clouds, day/night lighting, and other world elements make the city feel alive.

The project is built with Python, HTML, CSS, Vanilla JavaScript, and HTML5 Canvas.

✨ What is GitVille?

GitVille takes GitHub community data and converts it into a procedurally generated city.

Each user can be represented by a unique house. House appearance is generated from the username, giving different users different colors and architectural styles.

The generated city is then displayed as an interactive isometric world directly in the browser.

GitHub Community
       │
       ▼
   User Names
       │
       ▼
 Python City Generator
       │
       ├── houses.json
       ├── roads.json
       └── world.json
       │
       ▼
 HTML5 Canvas
       │
       ▼
    🏘️ GitVille

🎮 Features

🏠 Community → Houses

GitHub users are represented as houses inside the city.

Each house can contain information such as:

- Username
- Position
- Color
- Roof style
- Door style
- Window style
- Chimney style
- Wall style
- Facing direction
- Join/last-seen information

The visual style of a house is generated deterministically from the username, so the same username can consistently produce the same appearance.

🛣️ Procedural City Layout

GitVille automatically generates positions for houses and roads instead of requiring every object to be manually placed.

The generator creates:

- A central area
- Residential blocks
- Streets
- Roads connecting blocks
- Space for environmental objects such as trees

This allows the city to grow as the community grows.

🌳 Living Environment

The world isn't just a collection of houses.

The browser renderer includes environmental elements such as:

- Trees
- Clouds
- NPCs
- Day/night appearance
- Shadows
- Animated characters

NPCs have a simple movement system with idle, moving, and returning states, making the city feel less static.

🔍 City Directory

GitVille includes a search interface that lets you search for a citizen inside the generated city.

This is useful when the city becomes large and finding a particular house manually becomes difficult.

🌙 Day & Night

The rendering system supports different world lighting configurations.

The current renderer includes separate day and night palettes, allowing the city to visually change depending on the configured time of day.

📱 Interactive Camera

The isometric world supports camera interaction and zooming, including touch-oriented input handling for mobile devices.

---

🧰 Tech Stack

Technology| Purpose
HTML5| Web structure
CSS| UI and styling
Vanilla JavaScript| Game/world logic
HTML5 Canvas| Isometric rendering
Python| City/data generation
JSON| World and house data

GitVille does not depend on a large frontend framework or game engine. The visual world is rendered directly using the browser's Canvas API.

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

"scripts/fetch_houses.py"

This is the city-generation script.

It reads a list of usernames, generates house properties and positions, creates roads, and writes the resulting world data into the "data/" directory.

names.txt
   ↓
Username processing
   ↓
House generation
   ↓
City layout generation
   ↓
Road generation
   ↓
JSON world data

The generator also uses hashing to derive repeatable visual properties from usernames and a seeded random process for environmental placement.

"data/"

This directory contains the generated world.

- "houses.json" — houses/citizens and their properties
- "roads.json" — generated road positions
- "world.json" — world configuration such as weather and time of day

"web/"

This contains the actual browser-based city.

"script.js" contains the main isometric rendering engine and loads the generated JSON data.

"npc.js" contains the NPC system, including movement, idle behavior, temporary residents, animation, and depth sorting.

---

🚀 Running Locally

Clone the repository:

git clone https://github.com/Addressmehari/GitVille.git
cd GitVille

Generate the city data from a username list:

python scripts/fetch_houses.py test_names.txt

Then serve the project using a local HTTP server:

python -m http.server 8000

Open:

http://localhost:8000/web/

«A local web server is recommended because the browser loads the JSON world files using "fetch()".»

---

🏗️ How the City Works

GitVille separates data generation from visual rendering.

The Python side creates the city data:

GitHub usernames
      ↓
House attributes
      ↓
House positions
      ↓
Road positions
      ↓
JSON

The JavaScript side takes that data and turns it into an interactive world:

JSON
 ↓
Canvas renderer
 ↓
Isometric projection
 ↓
Houses + roads
 ↓
NPCs + trees + clouds
 ↓
Interactive GitVille

This separation makes it possible to change the city-generation logic without rewriting the renderer.

---

🧪 Example

Suppose the input contains:

alice
bob
charlie

GitVille can transform those users into something conceptually like:

          🏠
     🛣️       🛣️
  🏠    🏠    🏠
     🌳   🧍   🌳
          🏠

Each house is associated with its GitHub username, creating a visual representation of the community.

---

💡 Why GitVille?

GitHub communities are usually represented using numbers:

Stars:  ⭐ 120
Contributors:  👥 18
Issues:  🐛 24
Pull Requests:  🔀 31

GitVille asks:

«What if those numbers and people could become a place?»

Instead of simply checking statistics, you can explore your community as a little digital city. 🏘️

---

🔮 Future Ideas

Some possible directions for GitVille include:

- ⭐ Live GitHub star synchronization
- 👥 Contributor-based citizens
- 🔀 Pull requests represented as city events
- 🐛 Issues represented as city problems
- 📊 Repository statistics displayed inside the city
- 🏪 Special buildings for major contributors
- 🏛️ Repository owner as the central building
- 🌦️ Dynamic weather
- 🌅 Full day/night cycle
- 🚶 More advanced NPC behavior
- 🌍 Multiple repository cities
- 🔗 Clicking a house to open the user's GitHub profile
- 📈 City growth based on repository activity

---

🤝 Contributing

Contributions are welcome!

If you have an idea for improving GitVille, feel free to:

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Commit your changes
5. Open a pull request

Ideas, improvements, bug fixes, and new city mechanics are all welcome.

---

📜 License

GitVille is released under the MIT License.

See ""LICENSE"" (LICENSE) for the complete license text.

---

⭐ Support

If you like the idea of turning GitHub communities into little cities, consider giving the project a ⭐ on GitHub.

GitVille — turn your GitHub community into a world. 🏘️