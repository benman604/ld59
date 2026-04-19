import { Block } from './Block';
import { TrafficLight } from './TrafficLight';
import { RoadNetwork } from './RoadNetwork';
import { Road } from './Road';
import { Dir, rgb } from '../types';

export class Intersection extends Block {
    private nsRoads: Road[] = [];
    private ewRoads: Road[] = [];
    // NS, SN, EW, WE order
    private trafficLights: Record<Dir, TrafficLight | null> = {
        n: null,
        s: null,
        e: null,
        w: null
    };
    private trafficLightLines: Phaser.GameObjects.Graphics[] = [];

    private static readonly TRAFFIC_LIGHT_X_OFFSET = 25;
    private static readonly TRAFFIC_LIGHT_Y_OFFSET = 55;

    private static readonly TEXTURE_KEY = 'intersection-iso';
    private static readonly TILE_WIDTH = 60;
    private static readonly TILE_HEIGHT = 30;

    constructor(
        scene: Phaser.Scene,
        roadNetwork: RoadNetwork,
        worldX: number,
        worldY: number,
        gridX: number,
        gridY: number
    ) {
        Intersection.ensureTexture(scene);
        super(
            scene,
            roadNetwork,
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

    addTrafficLight(direction: Dir, light: TrafficLight): void {
        if (direction == "n") {
            light.setState('green');
        } else {
            light.setState('red');
        }
        this.trafficLights[direction] = light;
        this.syncTrafficLightSprites();
    }

    getConnectedRoads(): { ns: Road[]; ew: Road[] } {
        return { ns: [...this.nsRoads], ew: [...this.ewRoads] };
    }

    getTrafficLights(): TrafficLight[] {
        return Object.values(this.trafficLights).filter((light): light is TrafficLight => light !== null);
    }

    private syncTrafficLightSprites(): void {
        this.trafficLightLines.forEach(line => line.destroy());
        this.trafficLightLines = [];

        const cx = this.sprite.x;
        const cy = this.sprite.y;
        const xOff = Intersection.TRAFFIC_LIGHT_X_OFFSET;
        const yOff = Intersection.TRAFFIC_LIGHT_Y_OFFSET;

        const edgeXOff = Intersection.TILE_WIDTH / 4;
        const edgeYOff = Intersection.TILE_HEIGHT / 4;

        const positions: Record<Dir, { x: number; y: number; edgeX: number; edgeY: number }> = {
            n: {
                x: cx + xOff,
                y: cy - yOff,
                edgeX: cx + edgeXOff,
                edgeY: cy - edgeYOff
            },
            s: {
                x: cx - xOff,
                y: cy + yOff,
                edgeX: cx - edgeXOff,
                edgeY: cy + edgeYOff
            },
            e: {
                x: cx + xOff,
                y: cy + yOff,
                edgeX: cx + edgeXOff,
                edgeY: cy + edgeYOff
            },
            w: {
                x: cx - xOff,
                y: cy - yOff,
                edgeX: cx - edgeXOff,
                edgeY: cy - edgeYOff
            }
        };

        (Object.keys(this.trafficLights) as Dir[]).forEach((dir) => {
            const light = this.trafficLights[dir];
            if (!light) {
                return;
            }

            const pos = positions[dir];
            
            const line = this.scene.add.graphics();
            line.lineStyle(2, rgb(201, 201, 201), 0.7);
            line.beginPath();
            line.moveTo(pos.x, pos.y);
            line.lineTo(pos.edgeX, pos.edgeY);
            line.strokePath();
            line.setDepth(this.sprite.depth + 1);
            this.trafficLightLines.push(line);

            light.render(this.scene, pos.x, pos.y, this.sprite.depth + 5, 2);
        });
    }
}
