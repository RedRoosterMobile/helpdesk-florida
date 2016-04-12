// Constants
var PHYSICS_DEBUG = false;
var BOUNDS_INSET = 15;
var MOVE_SPEED = 20;
var WALK_ANIMATION_SPEED = 400;

// Globals
var game = new Phaser.Game(64, 64, Phaser.CANVAS, 'phaser', {
    preload: preload,
    create: create,
    update: update,
    render: render
});
var pixelcontext = null;
var pixelwidth = 0;
var pixelheight = 0;
var scale;

var bgColors = [0x6347AB, 0xC6B4B8, 0x2A6C5E, 0x660852, 0xB3D3E9];
var bgIndex = 0;

var player, cursor;
var mouseX, mouseY, rotation = 0;
var cursors;

function preload() {
    game.load.spritesheet('player', 'assets/sprites/player.png', 4, 4);
    game.load.image('cursor', 'assets/sprites/cursor.png');
    game.load.image('wall_h', 'assets/sprites/wall_h.png');
    game.load.image('wall_v', 'assets/sprites/wall_v.png');
}

function create() {
    var pixelCanvas = document.getElementById('pixel');
    pixelcontext = pixelCanvas.getContext('2d');
    pixelwidth = pixelCanvas.width;
    pixelheight = pixelCanvas.height;
    scale = pixelwidth / 64;

    game.renderer.renderSession.roundPixels = true
    Phaser.Canvas.setSmoothingEnabled(pixelcontext, false);

    // Background color
    game.stage.backgroundColor = bgColors[bgIndex];
    tweenBg();

    // Player + cursor
    player = game.add.sprite(25, 25, 'player');
    player.lastFrameUpdate = 0;
    game.camera.follow(player, Phaser.Camera.FOLLOW_TOPDOWN_TIGHT);

    cursor = game.add.sprite(0, 0, 'cursor');
    cursor.visible = false;
    cursor.fixedToCamera = true;

    // Physics
    game.physics.startSystem(Phaser.Physics.P2JS);
    game.physics.p2.enable(player);
    player.body.fixedRotation = true;
    player.body.collideWorldBounds = true;
    player.body.debug = PHYSICS_DEBUG;

    // Bounds
    setWorldBounds(200, 200);

    createRoom(50, 50, 100, 100);

    // Input
    pixelCanvas.addEventListener('mousedown', requestLock);
    document.addEventListener('mousemove', move, false);
    cursors = game.input.keyboard.createCursorKeys();
}

function setWorldBounds(w, h) {
    game.world.setBounds(0, 0, 200, 200);
    var sim = game.physics.p2;

    var left = new p2.Body({mass: 0, position: [sim.pxmi(BOUNDS_INSET), sim.pxmi(BOUNDS_INSET)], angle: 1.5707963267948966});
    left.addShape(new p2.Plane());

    var right = new p2.Body({mass: 0, position: [sim.pxmi(w - BOUNDS_INSET), sim.pxmi(BOUNDS_INSET)], angle: -1.5707963267948966});
    right.addShape(new p2.Plane());

    var top = new p2.Body({mass: 0, position: [sim.pxmi(BOUNDS_INSET), sim.pxmi(BOUNDS_INSET)], angle: -3.141592653589793});
    top.addShape(new p2.Plane());

    var bottom = new p2.Body({mass: 0, position: [sim.pxmi(BOUNDS_INSET), sim.pxmi(h - BOUNDS_INSET)]});
    bottom.addShape(new p2.Plane());

    sim.world.addBody(left);
    sim.world.addBody(right);
    sim.world.addBody(top);
    sim.world.addBody(bottom);
}

function requestLock() {
    game.input.mouse.requestPointerLock();
}

function move(e) {
    if (game.input.mouse.locked) {
        // Limit cursor to just slightly outside playing field
        if (e.x + e.movementX + mouseX >= 0 && e.x + e.movementX + mouseX <= (64 - cursor.width) * scale) {
            mouseX += e.movementX;
        }
        if (e.y + e.movementY + mouseY >= 0 && e.y + e.movementY + mouseY <= (64 - cursor.width) * scale) {
            mouseY += e.movementY;
        }

        var x = (e.x + mouseX) / scale;
        var y = (e.y + mouseY) / scale;

        cursor.visible = true;
        cursor.cameraOffset.x = Math.round(x);
        cursor.cameraOffset.y = Math.round(y);

        rotation = ((Math.atan2(game.camera.y + y - player.y, game.camera.x + x - player.x) * 180 / Math.PI) + 450) % 360;
    } else {
        cursor.visible = false;
        mouseX = 0;
        mouseY = 0;
    }
}


function update() {
    // Player
    updatePlayerPhysics();
    updateFrame(player, rotation);

    // render game canvas to big canvas
    pixelcontext.drawImage(game.canvas, 0, 0, 64, 64, 0, 0, pixelwidth, pixelheight);
}

function render() {
    /*player.x = Math.floor(player.x);
    player.y = Math.floor(player.y);
    var camera = game.camera;
    camera.x = Math.floor(camera.x);
    camera.y = Math.floor(camera.y);*/
}

function updatePlayerPhysics() {
    player.body.angle = rotation;
    player.body.setZeroVelocity();

    if (cursors.down.isDown) {
        player.body.moveDown(MOVE_SPEED);
    }
    if (cursors.up.isDown) {
        player.body.moveUp(MOVE_SPEED);
    }
    if (cursors.left.isDown) {
        player.body.moveLeft(MOVE_SPEED);
    }
    if (cursors.right.isDown) {
        player.body.moveRight(MOVE_SPEED);
    }

}

function createRoom(x, y, w, h) {
    createWall(x, y, w - 3, 3, 'h'); // north
    createWall(x + w - 3, y, 3, h - 3, 'v'); // east
    createWall(x, y + h - 3, w - 3, 3, 'h'); // south
    createWall(x, y, 3, h - 3, 'v'); // west
}

function createWall(x, y, w, h, direction) {
    var wall = game.add.sprite(x, y, 'wall_' + direction);
    wall.width = w;
    wall.height = h;

    game.physics.p2.enable(wall);
    wall.anchor.setTo(0, 0);
    wall.body.setRectangle(w, h, w / 2, h / 2);
    wall.body.static = true;
    wall.body.debug = PHYSICS_DEBUG;
}

function updateFrame(sprite, rotation) {
    sprite.frame = Math.round((rotation / 45)) % 8;

    if (sprite.body.velocity.x !== 0 || sprite.body.velocity.y !== 0) {
        var diff = game.time.now - sprite.lastFrameUpdate;
        if (diff > WALK_ANIMATION_SPEED) {
            sprite.lastFrameUpdate = game.time.now;
        } else if (diff > WALK_ANIMATION_SPEED / 2) {
            sprite.frame += 16;
        } else {
            sprite.frame += 8;
        }
    }
}

function tweenBg() {
    var steps = 500;
    var colorBlend = {step: 0};
    var colorTween = game.add.tween(colorBlend).to({step: steps}, 4000);
    colorTween.onUpdateCallback(function () {
        var color = Phaser.Color.interpolateColor(bgColors[bgIndex % bgColors.length], bgColors[(bgIndex + 1) % bgColors.length], steps, Math.round(colorBlend.step), 1);
        game.stage.backgroundColor = color & 0xffffff;
    });

    colorTween.onComplete.add(function () {
        bgIndex++;
        tweenBg();
    });

    colorTween.start();
}