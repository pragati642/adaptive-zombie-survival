import Phaser from "phaser";
import "./style.css";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: "#222222",
    scene: {
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let player;
let zombie;
let cursors;
let keys;
let playerHealth = 3;
let gameOver = false;
let lastAttackTime = 0;
let attackCooldown = 1500; // 1 second cooldown
let restartKey;
let bullets = [];
let canShoot = true;
let kills =0;
let minimumSpawnDistance = 250; // Minimum distance between player and zombie spawn
let shotsFired = 0;
let lastShotX = null;
let lastShotY = null;
let shotsText;
let roundText;
let currentRound = 1;
let roundKills = 0;
let zombieSpeed = 1.2; // Initial zombie speed

function setRound(round) {

    currentRound = round;

    if (round === 1) {

        zombieSpeed = 1.2;
        attackCooldown = 1500;
        minimumSpawnDistance = 250;

        roundText?.setText("Round: 1 - EASY");
        roundText?.setColor("#00ff00");

    } else if (round === 2) {

        zombieSpeed = 1.8;
        attackCooldown = 1000;
        minimumSpawnDistance = 200;

        roundText?.setText("Round: 2 - MODERATE");
        roundText?.setColor("#ffff00");

    } else if (round === 3) {

        zombieSpeed = 2.5;
        attackCooldown = 600;
        minimumSpawnDistance = 150;

        roundText?.setText("Round: 3 - DIFFICULT");
        roundText?.setColor("#ff0000");

    }
}

function create() {

    playerHealth = 3;
    gameOver = false;
    kills = 0;
    roundKills = 0;
    lastAttackTime = 0;

    lastShotX = null;
    lastShotY = null;

    setRound(1);

     // Create the player
    player = this.add.rectangle(
        400, //X position
        300, //Y position
        40, //Width
        40, //Height
        0x00ff00 //Color: Green
    );

    // Create the zombie
    zombie = this.add.rectangle(
        100, //X position
        100, //Y position
        40, //Width
        40, //Height
        0xff0000 //Color: Red
    );

    //Display health
    this.healthText = this.add.text(
        10,
        10, 
        "Health: " + playerHealth, 
        {
            fontSize: "24px",
            fill: "#ffffff"
        }
    );

    this.killsText = this.add.text(
        20,
        50,
        "Kills: 0",
        {
            fontSize: "24px",
            fill: "#ffffff"
        }
    );

    shotsText = this.add.text(
        20,
        80,
        "Shots: 0",
        {
            fontSize: "24px",
            fill: "#ffffff"
        }
    );

    roundText = this.add.text(
        20,
        110,
        "Round: 1 - EASY",
        {
            fontSize: "24px",
            fill: "#ffffff"
        }
    );

    // Enable keyboard input
    cursors = this.input.keyboard.createCursorKeys();

     // WASD keys
    keys = this.input.keyboard.addKeys("W,A,S,D");

    // Restart key
    restartKey = this.input.keyboard.addKey("R");

    this.input.keyboard.on("keydown-SPACE", () => {

        if (!gameOver) {
            shootBullet(this);
        }
    });
}

function update() {

    if(gameOver){
        if(Phaser.Input.Keyboard.JustDown(restartKey)){
            this.scene.restart();
        }
        return;
    }

    const speed = 3;

    if (cursors.left.isDown || keys.A.isDown) {
        player.x -= speed;
    }

    if (cursors.right.isDown || keys.D.isDown) {
        player.x += speed;
    }

    if (cursors.up.isDown || keys.W.isDown) {
        player.y -= speed;
    }

    if (cursors.down.isDown || keys.S.isDown) {
        player.y += speed;
    }

    // Keep player inside the game boundaries
    player.x = Phaser.Math.Clamp(
        player.x,
        20, // min; Half of the player's width (40 / 2)
        780 //max
    );

    player.y = Phaser.Math.Clamp(
        player.y,
        20, // min; Half of the player's height (40 / 2)
        580 // max
    );

    //Bullet movement
    bullets.forEach((bullet,index) => {

        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        const dx = zombie.x - bullet.x;
        const dy = zombie.y - bullet.y;

        const distance = Math.sqrt(dx*dx + dy*dy);

        if(distance < 25){
            kills ++;
            roundKills++;
            this.killsText.setText("Kills: " + kills);
            
            if (currentRound === 1 && roundKills >= 5) {

                currentRound = 2;
                roundKills = 0;

                setRound(2);

            } else if (currentRound === 2 && roundKills >= 10) {

                currentRound = 3;
                roundKills = 0;

                setRound(3);

            } else if (currentRound === 3 && roundKills >= 20) {

                // final completion
            }

            zombie.x = Phaser.Math.Between(50,750);
            zombie.y = Phaser.Math.Between(50,550);

            zombie.setVisible(true);
            bullet.destroy();
            bullets.splice(index,1);
            
        }
    });

    //Zombie follows player
    const dx=player.x - zombie.x;
    const dy=player.y - zombie.y;

    const distance=Math.sqrt(dx*dx + dy*dy);

    if(distance >40){
        zombie.x += (dx/distance)* zombieSpeed;
        zombie.y += (dy/distance)*zombieSpeed;
    }else{
        const currentTime = this.time.now;
        if(currentTime - lastAttackTime >= attackCooldown){
            playerHealth -=1;
            lastAttackTime = currentTime;
            this.healthText.setText("Health: " + playerHealth);

            if (playerHealth <= 0) {

                gameOver = true;

                this.add.text(
                    280,
                    280,
                    "GAME OVER",
                    {
                        fontSize: "40px",
                        color: "#ffffff"
                    }
                );

                this.add.text(
                    300,
                    340,
                    "Press R to Restart",
                    {
                        fontSize: "20px",
                        color: "#ffffff"
                    }
                );

                player.setVisible(false);
                zombie.setVisible(false);
            }
        }
        
    }
} 

function shootBullet(scene) {

    // Check how far the player has moved since the last shot
    if (lastShotX !== null && lastShotY !== null) {

        const moveX = player.x - lastShotX;
        const moveY = player.y - lastShotY;

        const movedDistance = Math.sqrt(
            moveX * moveX + moveY * moveY
        );

        // Player must move at least 40 pixels before shooting again
        if (movedDistance < 40) {
            return;
        }
    }

    // Remember the player's current position
    lastShotX = player.x;
    lastShotY = player.y;

    shotsFired++;
    shotsText.setText("Shots: " + shotsFired);

    const newBullet = scene.add.circle(
        player.x,
        player.y,
        6,
        0xffff00
    );

    const dx = zombie.x - player.x;
    const dy = zombie.y - player.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const bulletSpeed = 6;

    newBullet.dx = (dx / distance) * bulletSpeed;
    newBullet.dy = (dy / distance) * bulletSpeed;

    bullets.push(newBullet);
}

function spawnZombie() {

    let newX;
    let newY;
    let distance;

    do {

        zombie.x = Phaser.Math.Between(50, 750);
        zombie.y = Phaser.Math.Between(50, 550);

        const dx = zombie.x - player.x;
        const dy = zombie.y - player.y;

        distance = Math.sqrt(dx * dx + dy * dy);

    } while (distance < minimumSpawnDistance);

    zombie.setVisible(true);
}