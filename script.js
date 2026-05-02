const canvas = document.getElementById('galaxyCanvas');
const ctx = canvas.getContext('2d');

let width, height;
let stars = [];
const numStars = 800; // Number of stars
const speed = 3;      // Speed of the warp effect

// Resize canvas to fit the window
function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Star Object
class Star {
    constructor() {
        this.reset();
    }

    reset() {
        // Random position spread across a wide 3D space
        this.x = (Math.random() - 0.5) * width * 2;
        this.y = (Math.random() - 0.5) * height * 2;
        this.z = Math.random() * width; 
        this.pz = this.z; // Previous Z for drawing the light trails
    }

    update() {
        this.z -= speed; // Move star closer to the viewer
        
        // If the star goes past the screen, reset it to the far distance
        if (this.z < 1) {
            this.reset();
            this.z = width;
            this.pz = this.z;
        }
    }

    draw() {
        // Calculate 2D screen coordinates based on 3D depth (z)
        const sx = (this.x / this.z) * width + width / 2;
        const sy = (this.y / this.z) * height + height / 2;
        
        // Calculate previous coordinates to draw the trail
        const px = (this.x / this.pz) * width + width / 2;
        const py = (this.y / this.pz) * height + height / 2;

        this.pz = this.z;

        // Draw the warp streak
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        
        // Calculate brightness based on distance (closer = brighter)
        const brightness = Math.min(255, (width / this.z) * 255);
        ctx.strokeStyle = `rgba(255, 255, 255, ${brightness / 255})`;
        
        // Calculate thickness based on distance
        ctx.lineWidth = Math.max(0.5, (1 - this.z / width) * 3);
        ctx.stroke();
    }
}

// Populate the stars array
for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
}

// Animation Loop
function animate() {
    // Fill the background with a slightly transparent black to create motion blur on trails
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Update and draw every star
    stars.forEach(star => {
        star.update();
        star.draw();
    });

    requestAnimationFrame(animate);
}

// Start animation
animate();