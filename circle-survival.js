(function() {
    var Game = function() {
        var screen = document.getElementById('game').getContext('2d');
        this.size = { x: screen.canvas.width, y: screen.canvas.height };
        this.center = { x: this.size.x / 2, y: this.size.y / 2 };
        this.start = new Date().getTime();
        this.keyboarder = new Keyboarder();
        this.clock = 0;
        this.players = [new Player(this)];
        this.enemies = MakeEnemies(this, 100);
        this.bodies = this.players.concat(this.enemies);
        var self = this;
        var tick = function() {
            self.clock = new Date().getTime() - self.start;
            self.update();
            self.draw(screen);
            requestAnimationFrame(tick);
        };

        tick();
    };

    Game.prototype = {
        update : function() {
            for (var i = 0; i < this.bodies.length; i++) {
                if (this.bodies[i].update !== undefined) {
                    this.bodies[i].update();
                }
            }
            if (this.keyboarder.isDown(this.keyboarder.KEYS.ESC)) {
                //Take this out of final game.  Just here to not turn my laptop
                //into a toaster when debugging :)
                throw "Exiting because received ESC";
            }
            var collisions = reportCollisions(this.players, this.enemies);
            for (var i = 0; i < collisions.length; i++) {
                for (var j = 0; j < collisions[i].length; j++) {
                    if (collisions[i][j].collide !== undefined) {
                        collisions[i][j].collide();
                    }
                }
            }
        },

        draw: function(screen) {
            screen.clearRect(0,0, this.size.x, this.size.y);
            for (var i = 0; i < this.bodies.length; i++) {
                if (this.bodies[i].draw !== undefined) {
                    this.bodies[i].draw(screen);
                }
            }
        },

        addBody: function(body) {
            this.bodies.push(body);
        }
    };

    var Player = function(game) {
        this.game = game;
        this.size = {r : 5};
        this.center = { x: game.center.x, y: game.center.y + game.size.y/4 };
        this.movespeed = 3;
        this.keyboarder = new Keyboarder();
    };

    Player.prototype = {
        update: function() {
            if (this.keyboarder.isDown(this.keyboarder.KEYS.LEFT)) {
                this.center.x -= this.movespeed; 
            }
            if (this.keyboarder.isDown(this.keyboarder.KEYS.RIGHT)) {
                this.center.x += this.movespeed; 
            }
            if (this.keyboarder.isDown(this.keyboarder.KEYS.DOWN)) {
                this.center.y += this.movespeed; 
            }
            if (this.keyboarder.isDown(this.keyboarder.KEYS.UP)) {
                this.center.y -= this.movespeed; 
            }
        },

        draw: function(screen) {
            screen.beginPath();
            screen.arc(this.center.x, this.center.y, this.size.r, 0, 2 * Math.PI, false);
            screen.fillStyle = 'blue';
            screen.fill();
            screen.closePath();
        },

        collide: function() {
            console.log("game over, man.");
        }
    };

    var Enemy = function(game, x_start, y_start) {
        this.game = game;
        this.size = {x: 10, y: 10};
        this.center = { x: x_start, y: y_start};
        this.speed_mult = 3;
        this.speed = { x: (Math.random() - 0.5) * this.speed_mult, y: (Math.random() - 0.5) * this.speed_mult}
    };

    Enemy.prototype = {
        update: function() {
            //Randomly change directions sometimes.
            if (Math.random() > 0.995) {
                this.speed.x = (Math.random() - 0.5) * this.speed_mult; 
                this.speed.y = (Math.random() - 0.5) * this.speed_mult; 
            }
            if (this.center.x  + (0.5 * this.size.x) >= this.game.size.x && this.speed.x > 0) {
                this.speed.x *= -1;
                this.center.x = this.game.size.x - (0.5 * this.size.x);
            }
            if (this.center.x  - (0.5 * this.size.x) <= 0 && this.speed.x < 0) {
                this.speed.x *= -1;
                this.center.x = 0.5 * this.size.x;
            }
            if (this.center.y  + (0.5 * this.size.y) >= this.game.size.y && this.speed.y > 0) {
                this.speed.y *= -1;
                this.center.y = this.game.size.y - (0.5 * this.size.y);
            }
            if (this.center.y  - (0.5 * this.size.y) <= 0 && this.speed.y < 0) {
                this.speed.y *= -1;
                this.center.y = 0.5 * this.size.y;
            }
            this.center.x += this.speed.x;
            this.center.y += this.speed.y;

        },

        draw: function(screen) {
            screen.beginPath();
            screen.rect(this.center.x - this.size.x/2, this.center.y - this.size.y/2, this.size.x, this.size.y);
            screen.fillStyle = 'green';
            screen.fill();
            screen.closePath();
        }
    };

    var Keyboarder = function() {
        var keyState = {};

        window.addEventListener('keydown', function(e) {
            keyState[e.keyCode] = true;
        });

        window.addEventListener('keyup', function(e) {
            keyState[e.keyCode] = false;
        });

        this.isDown = function(keyCode) {
            return keyState[keyCode] === true;
        };

        this.KEYS = { LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40, SPACE: 32, ESC: 27 };
    };

    var MakeEnemies = function(game, n_enemies) {
        var enemies = [];
        var rows = 10;
        var columns = 10;
        var num_enemies = n_enemies;
        var count = 0;
        var x,y;
        for (var i = 0; i < rows; i++) {
            y = (game.size.y / (rows + 1)) * (i + 1);
            for (var j = 0; j < columns; j++) {
                x = (game.size.x / (columns + 1)) * (j + 1);
                if (count >= num_enemies) {
                    return enemies;
                } else {
                    enemies.push(new Enemy(game,x,y));
                    count++;
                }
            }
        }
        return enemies;
    }

    var reportCollisions = function(players, enemies) {
        //assumes players are cicles, enemies are squares.
        var collisions = [];
        var player, enemy;
        for (var i = 0; i < players.length; i++) {
            player = players[i];
            for (var j = 0; j < enemies.length; j++) {
                enemy = enemies[j];
                if ((enemy.center.x + enemy.size.x/2) < (player.center.x - player.size.r)) {
                    //Player is to the right of the enemy
                    continue;
                }
                if ((enemy.center.x - enemy.size.x/2) > (player.center.x + player.size.r)) {
                    //Player is to the left of the enemy
                    continue;
                }
                if ((enemy.center.y + enemy.size.y/2) < (player.center.y - player.size.r)) {
                    //player is above the enemy
                    continue;
                }
                if ((enemy.center.y - enemy.size.y/2) > (player.center.y + player.size.r)) {
                    //player is above the enemy
                    continue;
                }

                //TODO: Implement better collision detection, might want hitboxes or true circular detection.
                collisions.push([player, enemy]);
            }
        }
        return collisions;
    }

    window.addEventListener('load', function() {
        new Game();
    });
})();
