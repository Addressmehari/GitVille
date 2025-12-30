class NPC {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.z = 0;
        this.color = this.getRandomColor();

        // Movement state
        this.targetX = x;
        this.targetY = y;
        this.speed = 0.5 + Math.random() * 0.5;
        this.state = 'idle'; // idle, moving
        this.idleTimer = 0;

        // Visuals
        this.height = 16;
        this.width = 6;
        this.bounce = 0;
        this.bounceSpeed = 0.15;
    }

    getRandomColor() {
        const colors = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        // Simple AI State Machine
        if (this.state === 'idle') {
            this.idleTimer--;
            this.bounce = 0;
            if (this.idleTimer <= 0) {
                this.pickNewTarget();
            }
        } else if (this.state === 'moving') {
            this.move();
        }
    }

    pickNewTarget() {
        // Pick a random spot nearby
        // Range +/- 300
        const range = 200;
        this.targetX = this.x + (Math.random() - 0.5) * range;
        this.targetY = this.y + (Math.random() - 0.5) * range;
        this.state = 'moving';
    }

    move() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 1) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.state = 'idle';
            this.idleTimer = 60 + Math.random() * 120; // 1-3 seconds pause
            return;
        }

        // Normalize and move
        this.x += (dx / dist) * this.speed;
        this.y += (dy / dist) * this.speed;

        // Bouncing animation
        this.bounce = Math.abs(Math.sin(Date.now() * 0.01)) * 2;
    }

    render(ctx) {
        // Draw Isometric Character ("Chibi" Style)

        // Iso Projection
        const screenX = (this.x - this.y);
        const screenY = (this.x + this.y) * 0.5 - this.z - this.bounce;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.beginPath();
        // Shadow scales slightly with bounce to fake height
        const sS = 1 - this.bounce * 0.1;
        ctx.ellipse(screenX, screenY + this.bounce + 1, 6 * sS, 3.5 * sS, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dimensions
        const w = 10; // Wider body
        const h = 8;  // Shorter body (Cute proportions)
        const headRad = 7; // Big head

        // Body (Rounded Rect / "Bean" shape)
        ctx.fillStyle = this.color;

        // Simple Rounded drawing
        ctx.beginPath();
        // Bottom Center
        ctx.arc(screenX, screenY - h / 2, w / 2, 0, Math.PI, false); // Bottom curve
        ctx.lineTo(screenX - w / 2, screenY - h);
        ctx.arc(screenX, screenY - h, w / 2, Math.PI, 0, false); // Top curve (shoulders)
        ctx.lineTo(screenX + w / 2, screenY - h / 2);
        ctx.fill();

        // Darker side shading (fake 3D)
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.beginPath();
        ctx.moveTo(screenX + w / 2, screenY - h);
        ctx.lineTo(screenX + w / 2, screenY - h / 2);
        ctx.arc(screenX, screenY - h / 2, w / 2, 0, Math.PI * 0.5, false);
        ctx.lineTo(screenX, screenY - h);
        ctx.fill();

        // Head (Sphere)
        const headY = screenY - h - 4;
        ctx.fillStyle = "#ffeaa7"; // Skin tone (generic light)
        // Or keep matching color layout? "Hoodie" style?
        // Let's do distinct skin tone face vs hood.
        // Actually, simple colored blob is cutest.
        // Let's stick to the color but lighter for face area.

        // Draw "Hood" (Main Color)
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(screenX, headY, headRad, 0, Math.PI * 2);
        ctx.fill();

        // Face Window (Slightly lighter skin area)
        ctx.fillStyle = "#ffecd1";
        ctx.beginPath();
        ctx.ellipse(screenX, headY + 1, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (Wide set, dot eyes)
        const dx = this.targetX - this.x;
        const dirX = (dx > 0) ? 1 : -1;

        ctx.fillStyle = "#2d3436";
        const eyeOff = 2.5;
        // Left Eye
        ctx.beginPath(); ctx.arc(screenX - eyeOff + dirX, headY, 1.2, 0, Math.PI * 2); ctx.fill();
        // Right Eye
        ctx.beginPath(); ctx.arc(screenX + eyeOff + dirX, headY, 1.2, 0, Math.PI * 2); ctx.fill();

        // Cheeks (blush)
        ctx.fillStyle = "rgba(255, 105, 180, 0.4)";
        ctx.beginPath(); ctx.arc(screenX - eyeOff + dirX, headY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(screenX + eyeOff + dirX, headY + 2, 1.5, 0, Math.PI * 2); ctx.fill();
    }
}

class NPCManager {
    constructor(count = 10) {
        this.npcs = [];
        for (let i = 0; i < count; i++) {
            this.npcs.push(new NPC(i, (Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500));
        }
    }

    update() {
        this.npcs.forEach(npc => npc.update());
    }

    render(ctx) {
        // Sort by depth (Y + X) logic for World coords:
        // Screen Y is proportional to (x+y). Higher (x+y) is "closer" (lower on screen).
        // Standard painter's algo: Draw lower (x+y) first (Background), Higher (x+y) last (Foreground).

        const sorted = [...this.npcs].sort((a, b) => (a.x + a.y) - (b.x + b.y));

        sorted.forEach(npc => npc.render(ctx));
    }
}

// Helper to darken/lighten hex (Copied/Modified from script.js logic if needed, 
// but easier to just implement simple version here to be standalone)
function adjustColor_NPC(color, amount) {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0' + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}
