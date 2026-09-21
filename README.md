# Galaga Browser Game 🎮

A browser-based arcade shooter inspired by the classic Galaga-style gameplay.

This project is being built from scratch using HTML5 Canvas and JavaScript as a learning project.

## Current Features

- Player movement with keyboard controls
- Custom Galaga-style player ship
- Player shooting
- Three enemy types:
  - Boss
  - Butterfly
  - Bee
- Enemy formation movement
- Enemy entrance animation
- Diving enemy attacks
- Enemy shooting
- Player-targeted enemy bullets
- Boss enemies require multiple hits
- Different scores for enemy types
- Explosion effects
- Sound effects using Web Audio API
- Three player lives
- Temporary invincibility after being hit
- Multiple stages with increasing difficulty
- Stage transition screen
- Pause / resume
- Start screen
- Game over / restart
- Persistent high score using localStorage
- Animated starfield background

## Controls

| Key | Action |
|---|---|
| Left Arrow | Move left |
| Right Arrow | Move right |
| Space | Fire |
| P | Pause / Resume |
| Enter | Start / Restart |

## Running Locally

Clone the repository or download the project, then open a terminal in the project directory.

Start a local web server:

```bash
python3 -m http.server 8000 --bind 127.0.0.1

### Open the game in your browser
http://127.0.0.1:8000

### Project Structure
galaga/
├── index.html
├── style.css
├── game.js
└── README.md

### Technology
- HTML5
- CSS
- JavaScript
- HTML5 Canvas
- Web Audio API
- Local Storage

### Development Status
The game is actively being developed.
Planned improvements include:
- Smoother enemy return-to-formation animation
- Improved enemy attack patterns
- More authentic Galaga-style enemy behavior
- Improved graphics and animation
- Additional sound effects
- Gameplay balancing

### Disclaimer
This is a personal educational project inspired by classic fixed-shooter arcade games. It is not affiliated with or endorsed by the original game's publisher.