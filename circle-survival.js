(function() {
    var Game = function() {
        var screen = document.getElementById('game').getContext('2d');
        this.size = { x: screen.canvas.width, y: screen.canvas.height };
        this.center = { x: this.size.x / 2, y: this.size.y / 2 };
        this.start = new Date().getTime();
        this.keyboarder = new Keyboarder();
        this.ui = new Ui();
        this.clock = 0;
        this.last_clock = 0;
        this.interval = 1;
        this.score = 0;
        this.score_multiplier = 1;
        this.player_types = ['slower', 'ender', 'hero'];
        this.next_player_type_index = 0;
        //From http://www.colorpicker.com/12BFE6 -> analogic
        this.player_colours = [
            "rgba(18, 191, 230, 1)",
            "rgba(163, 18, 230, 1)",
            "rgba(230, 57, 18, 1)",
            "rgba(85, 230, 18, 1)"
        ];
        this.players = [new Player(this, 'P1', 'hero')];
        this.enemies = MakeEnemies(this, 10);
        this.bodies = this.players.concat(this.enemies);
        var self = this;
        var tick = function() {
            self.clock = new Date().getTime() - self.start;
            self.interval = self.clock - self.last_clock;
            self.update();
            self.draw(screen);
            self.last_clock = self.clock;
            requestAnimationFrame(tick);
        };

        window.addEventListener('keyup', function(e) {
            if (e.keyCode === self.keyboarder.KEYS.GENERAL.SPACE) {
                self.addPlayer();
            }
            if (e.keyCode === self.keyboarder.KEYS.GENERAL.ENTER) {
                self.toggleNextPlayerTypeIndex();
            }
        });

        tick();
    };

    Game.prototype = {
        update : function() {
            this.bodies = this.players.concat(this.enemies);
            for (var i = 0; i < this.bodies.length; i++) {
                if (this.bodies[i].update !== undefined) {
                    this.bodies[i].update();
                }
            }
            if (this.keyboarder.isDown(this.keyboarder.KEYS.GENERAL.ESC)) {
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
            this.score += this.interval * this.score_multiplier;
            this.ui.updateScore(this.score, this.interval);
        },

        draw: function(screen) {
            screen.clearRect(0,0, this.size.x, this.size.y);
            for (var i = 0; i < this.bodies.length; i++) {
                if (this.bodies[i].draw !== undefined) {
                    this.bodies[i].draw(screen);
                }
            }
        },

        addPlayer: function() {
            var n = this.players.length;
            if (n >= 4) {
                console.log("nope, can't add more than 4 at the moment, sorry!");
                return;
            }
            var next_id = 'P' + (n + 1);
            this.players.push(new Player(this, next_id, this.player_types[this.next_player_type_index]));
            if (this.player_types[this.next_player_type_index] === 'hero') {
                this.score_multiplier *= 1.2;
            }
        },

        toggleNextPlayerTypeIndex: function() {
            this.next_player_type_index = (this.next_player_type_index + 1) % (this.player_types.length);
            this.ui.updateNextPlayer(this.player_types[this.next_player_type_index]);
        },

        addBody: function(body) {
            this.bodies.push(body);
        }
    };

    var Player = function(game, id, type) {
        this.game = game;
        this.id = id;
        this.type = type;
        this.center = { x: game.center.x, y: game.center.y + game.size.y/4 };
        this.n = Number(id[1]) - 1;
        this.colour = this.game.player_colours[this.n];
        this.size = {r : 5};
        this.movespeed = 3;
        if (this.type === 'hero') {
            this.size = {r : 5};
            this.movespeed = 3;
        } else if (this.type === 'slower') {
            this.size = {r : 20};
            this.movespeed = 2;
        } else if (this.type === 'ender') {
            this.size = {r : 3};
            this.movespeed = 5;
        }
    };

    Player.prototype = {
        update: function() {
            if (this.game.keyboarder.isDown(this.game.keyboarder.KEYS[this.id].LEFT)) {
                this.center.x -= this.movespeed; 
            }
            if (this.game.keyboarder.isDown(this.game.keyboarder.KEYS[this.id].RIGHT)) {
                this.center.x += this.movespeed; 
            }
            if (this.game.keyboarder.isDown(this.game.keyboarder.KEYS[this.id].DOWN)) {
                this.center.y += this.movespeed; 
            }
            if (this.game.keyboarder.isDown(this.game.keyboarder.KEYS[this.id].UP)) {
                this.center.y -= this.movespeed; 
            }
        },

        draw: function(screen) {
            screen.beginPath();
            screen.arc(this.center.x, this.center.y, this.size.r, 0, 2 * Math.PI, false);
            screen.fillStyle = this.colour;
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

        this.KEYS = {
            GENERAL: { SPACE: 32, ESC: 27, ENTER: 13 },
            //P1 : arrow keys.
            P1: { LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40 },
            //P2 : WASD
            P2: { LEFT: 65, RIGHT: 68, UP: 87, DOWN: 83 },
            //P3 : IJKL
            P3: { LEFT: 74, RIGHT: 76, UP: 73, DOWN: 75 },
            //P4 : GVBN
            P4: { LEFT: 86, RIGHT: 78, UP: 71, DOWN: 66}
        };

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

    var Ui = function() {
        this.score = document.getElementById('score');
        this.next_player = document.getElementById('next-player');
        this.timer = 0;
    };

    Ui.prototype = {
        updateScore : function(score, interval) {
            if (this.timer > 330) {
                this.score.innerText = "Score : " + parseInt(score);
                this.timer = 0;
            } else {
                this.timer += interval;
            }
        },

        updateNextPlayer : function(next_player) {
            this.next_player.innerText = "Next player to spawn is : " + next_player;
        }
    };

    window.addEventListener('load', function() {
        new Game();
    });
})();
