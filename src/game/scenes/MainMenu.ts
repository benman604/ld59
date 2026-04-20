import { GameObjects } from 'phaser';
import { RoadNetwork } from '../RoadNetwork';
import { Road } from '../Road';
import { Block } from '../Block';
import { GameWrapper } from './GameWrapper';
import { Route } from '../Route';
import { Layers } from '../../types';

type MenuButton = {
    text: GameObjects.Text;
    bg: GameObjects.Rectangle;
};

export class MainMenu extends GameWrapper
{
    private creditsText: GameObjects.Text | null = null;
    private creditsOpen = false;
    private playButton: MenuButton | null = null;
    private creditsButton: MenuButton | null = null;
    private backButton: MenuButton | null = null;
    private menuZoom = 1.2;

    constructor ()
    {
        super('MainMenu');
        this.crashDistance = 0;
    }

    create ()
    {
        super.create();
        this.input.off('wheel');
        this.createMenuUi();
    }
    
    changeScene ()
    {
        this.scene.start('LevelBuilder2');
    }

    protected buildRoadNetwork(): RoadNetwork {
        const roadNetwork = new RoadNetwork(this, 400, 120);
        roadNetwork.build([
            { name: 'westbound1', orientation: 'ew', direction: 'w', startX: -6, endX: 60, y: 1 },
            { name: 'westbound2', orientation: 'ew', direction: 'w', startX: -6, endX: 60, y: 2 },
            { name: 'westbound3', orientation: 'ew', direction: 'w', startX: -6, endX: 60, y: 3 },
            { name: 'eastbound1', orientation: 'ew', direction: 'e', startX: -6, endX: 60, y: 5 },
            { name: 'eastbound2', orientation: 'ew', direction: 'e', startX: -6, endX: 60, y: 6 },
            { name: 'eastbound3', orientation: 'ew', direction: 'e', startX: -6, endX: 60, y: 7 }
        ]);

        return roadNetwork;
    }

    protected setupLevel(): void {
        const routes: Route[] = [];
        const westboundNames = ['westbound1', 'westbound2', 'westbound3'];
        const eastboundNames = ['eastbound1', 'eastbound2', 'eastbound3'];

        for (const name of westboundNames) {
            const road = this.roadNetwork.getRoadByName(name);
            this.pushRoute(routes, road, road?.getBase(), road?.getEnd());
        }

        for (const name of eastboundNames) {
            const road = this.roadNetwork.getRoadByName(name);
            this.pushRoute(routes, road, road?.getBase(), road?.getEnd());
        }

        this.startDynamicSpawning(routes);
        this.menuZoom = 1;
        this.camera.setZoom(this.menuZoom);

    }

    private createMenuUi(): void {
        const titleAnchor = this.roadNetwork.getWorldFromGrid(0, -2);
        this.add.image(titleAnchor.x, titleAnchor.y - 30, 'game_title_iso_ns')
            .setOrigin(0.5)
            .setScale(2)
            .setDepth(Layers.Buildings + 5);

        const buttonRowY = 560;
        this.playButton = this.createMenuButton('Play', buttonRowY, () => this.changeScene(), 420);
        this.creditsButton = this.createMenuButton('Credits', buttonRowY, () => this.toggleCredits(), 620);
        this.backButton = this.createMenuButton('Back', buttonRowY, () => this.hideCredits(), 520);
        this.setMenuButtonVisible(this.backButton, false);
    }

    private startDynamicSpawning(routes: Route[]): void {
        for (const route of routes) {
            const minDelay = Phaser.Math.Between(300, 900);
            const maxDelay = Phaser.Math.Between(1400, 3200);
            this.scheduleRouteSpawn(route, minDelay, maxDelay);
        }
    }

    private scheduleRouteSpawn(route: Route, minDelay: number, maxDelay: number): void {
        const spawnOnce = () => {
            const speed = Phaser.Math.Between(35, 75);
            this.spawnCar(route.road, speed, route.source, route.destination);

            const drift = Phaser.Math.Between(-200, 300);
            const nextMin = Math.max(200, minDelay + drift);
            const nextMax = Math.max(nextMin + 200, maxDelay + (drift * 2));
            const nextDelay = Phaser.Math.Between(nextMin, nextMax);
            this.time.delayedCall(nextDelay, spawnOnce);
        };

        spawnOnce();
    }

    private createMenuButton(label: string, y: number, onClick: () => void, x: number = 512): MenuButton {
        const button = this.add.text(x, y, label, {
            fontFamily: 'Pixeled',
            fontSize: '26px',
            color: '#ffffff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(Layers.UI + 2);

        const paddingX = 40;
        const paddingY = 14;
        const bounds = button.getBounds();
        const bg = this.add.rectangle(
            bounds.centerX,
            bounds.centerY,
            bounds.width + paddingX,
            bounds.height + paddingY,
            0x1b1b1b,
            0.65
        );
        bg.setStrokeStyle(2, 0xffffff, 0.7);
        bg.setOrigin(0.5);
        bg.setScrollFactor(0);
        bg.setDepth(Layers.UI + 1);

        const setHover = (active: boolean) => {
            bg.setFillStyle(0x2a2a2a, active ? 0.9 : 0.65);
            button.setColor(active ? '#ffd36a' : '#ffffff');
        };

        bg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => setHover(true))
            .on('pointerout', () => setHover(false))
            .on('pointerdown', onClick);

        button.setInteractive({ useHandCursor: true })
            .on('pointerover', () => setHover(true))
            .on('pointerout', () => setHover(false))
            .on('pointerdown', onClick);

        return { text: button, bg };
    }

    private toggleCredits(): void {
        if (this.creditsOpen) {
            this.hideCredits();
            return;
        }

        this.showCredits();
    }

    private showCredits(): void {
        if (!this.creditsText) {
            const anchor = this.roadNetwork.getWorldFromGrid(16, 25);
            this.creditsText = this.add.text(
                anchor.x,
                anchor.y,
                'Made by Benjamin Man in 72 hours for Ludum Dare 59.\n\nReference graphics credits 123RF, Alamy, Freepik\nFont from DaFont\n\nBuilt with Phaser 3',
                {
                    fontFamily: 'Pixeled',
                    fontSize: '15px',
                    color: '#f2f2f2',
                    align: 'center'
                }
            ).setOrigin(0.5).setDepth(Layers.UI + 4);
        }

        this.creditsText.setVisible(true);
        this.creditsOpen = true;
        this.camera.pan(this.creditsText.x, this.creditsText.y, 500, 'Sine.easeInOut');

        this.setMenuButtonVisible(this.playButton, false);
        this.setMenuButtonVisible(this.creditsButton, false);
        this.setMenuButtonVisible(this.backButton, true);
    }

    private hideCredits(): void {
        if (this.creditsText) {
            this.creditsText.setVisible(false);
        }

        this.creditsOpen = false;
        this.camera.pan(400, 120, 400, 'Sine.easeInOut');

        this.setMenuButtonVisible(this.playButton, true);
        this.setMenuButtonVisible(this.creditsButton, true);
        this.setMenuButtonVisible(this.backButton, false);
    }

    private setMenuButtonVisible(button: MenuButton | null, visible: boolean): void {
        if (!button) {
            return;
        }

        button.text.setVisible(visible);
        button.bg.setVisible(visible);
        button.text.setActive(visible);
        button.bg.setActive(visible);
    }

    private pushRoute(
        routes: Route[],
        road: Road | undefined,
        source: Block | undefined,
        destination: Block | undefined
    ): void {
        if (!road || !source || !destination) {
            return;
        }

        routes.push(new Route(this, this.roadNetwork, road, source, destination));
    }
}
