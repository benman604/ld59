import { Scene } from 'phaser';

export class Boot extends Scene
{
    constructor ()
    {
        super('Boot');
    }

    preload ()
    {
        //  The Boot Scene is typically used to load in any assets you require for your Preloader, such as a game logo or background.
        //  The smaller the file size of the assets, the better, as the Boot Scene itself has no preloader.

        this.load.image('background', 'assets/bg.png');
        this.load.image('traffic-light-red', 'assets/traffic_light_red.png');
        this.load.image('traffic-light-yellow', 'assets/traffic_light_yellow.png');
        this.load.image('traffic-light-green', 'assets/traffic_light_green.png');
        this.load.image('laneblock', 'assets/road.png');
        this.load.image('car-sw', 'assets/car_sw.png');
        this.load.image('car-se', 'assets/car_se.png');
        this.load.image('car-ne', 'assets/car_ne.png');
        this.load.image('car-nw', 'assets/car_nw.png');
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}
