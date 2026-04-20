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
        this.load.image('roadblock-iso', 'assets/roadblock_single_iso_ew.png');
        this.load.image('roadblock-iso-nesw', 'assets/roadblock_single_iso_ns.png');
        this.load.image('grass-iso-ns', 'assets/grass2_iso_ns.png');
        this.load.image('car-sw', 'assets/car_sw.png');
        this.load.image('car-se', 'assets/car_se.png');
        this.load.image('car-ne', 'assets/car_ne.png');
        this.load.image('car-nw', 'assets/car_nw.png');
        this.load.image('arrow_n', 'assets/arrow_n.png');
        this.load.image('arrow_s', 'assets/arrow_s.png');
        this.load.image('arrow_e', 'assets/arrow_e.png');
        this.load.image('arrow_w', 'assets/arrow_w.png');
        this.load.image('skyscraper', 'assets/skyscraper.png');
        this.load.image('opening_ne', 'assets/opening_ne.png');
        this.load.image('opening_nw', 'assets/opening_nw.png');
        this.load.image('opening_hidden', 'assets/opening_hidden.png');
        this.load.image('game_title_iso_ns', 'assets/game_title_iso_ns.png');
    }

    create ()
    {
        this.scene.start('Preloader');
    }
}
