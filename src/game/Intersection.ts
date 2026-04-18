import { Block } from './Block';
import { TrafficLight } from './TrafficLight';
import { Road } from './Road';

export class Intersection extends Block {
    private nsRoads: Road[] = [];
    private ewRoads: Road[] = [];
    private trafficLights: TrafficLight[] = [];

    private static readonly TEXTURE_KEY = 'intersection-iso';
    private static readonly TILE_WIDTH = 60;
    private static readonly TILE_HEIGHT = 30;

    constructor(
        scene: Phaser.Scene,
        worldX: number,
        worldY: number,
        gridX: number,
        gridY: number
    ) {
        Intersection.ensureTexture(scene);
        super(
            scene,
            worldX,
            worldY,
            gridX,
            gridY,
            Intersection.TEXTURE_KEY,
            0,
            undefined,
            Intersection.TILE_WIDTH,
            Intersection.TILE_HEIGHT
        );
    }

    private static ensureTexture(scene: Phaser.Scene): void {
        if (scene.textures.exists(Intersection.TEXTURE_KEY)) {
            return;
        }

        const gfx = scene.add.graphics();
        gfx.fillStyle(0x666666, 1);
        gfx.lineStyle(2, 0x000000, 1);

        const points = [
            { x: 30, y: 0 },
            { x: 60, y: 15 },
            { x: 30, y: 30 },
            { x: 0, y: 15 }
        ];

        gfx.beginPath();
        gfx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            gfx.lineTo(points[i].x, points[i].y);
        }
        gfx.closePath();
        gfx.fillPath();
        gfx.strokePath();

        gfx.generateTexture(Intersection.TEXTURE_KEY, Intersection.TILE_WIDTH, Intersection.TILE_HEIGHT);
        gfx.destroy();
    }

    addNSRoad(road: Road): void {
        if (!this.nsRoads.includes(road)) {
            this.nsRoads.push(road);
        }
    }

    addEWRoad(road: Road): void {
        if (!this.ewRoads.includes(road)) {
            this.ewRoads.push(road);
        }
    }

    addTrafficLight(light: TrafficLight): void {
        this.trafficLights.push(light);
    }

    getConnectedRoads(): { ns: Road[]; ew: Road[] } {
        return { ns: [...this.nsRoads], ew: [...this.ewRoads] };
    }

    getTrafficLights(): TrafficLight[] {
        return [...this.trafficLights];
    }
}
