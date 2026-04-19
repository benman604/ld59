import type { RoadNetwork } from './RoadNetwork';
import { Layers } from '../types';
export type BlockNeighborDirection = 'north' | 'south' | 'east' | 'west';

export class Block {
    static readonly SIZE = 30;

    protected readonly scene: Phaser.Scene;
    readonly roadNetwork: RoadNetwork;
    readonly gridX: number;
    readonly gridY: number;
    readonly sprite: Phaser.GameObjects.Image;

    north: Block | null = null;
    south: Block | null = null;
    east: Block | null = null;
    west: Block | null = null;

    constructor(
        scene: Phaser.Scene,
        roadNetwork: RoadNetwork,
        worldX: number,
        worldY: number,
        gridX: number,
        gridY: number,
        textureKey: string = 'laneblock',
        rotationRadians: number = 0,
        tint?: number,
        displayWidth: number = Block.SIZE,
        displayHeight: number = Block.SIZE
    ) {
        this.scene = scene;
        this.roadNetwork = roadNetwork;
        this.gridX = gridX;
        this.gridY = gridY;
        this.sprite = scene.add.image(worldX, worldY, textureKey);
        this.sprite.setDisplaySize(displayWidth, displayHeight);
        this.sprite.setRotation(rotationRadians);
        this.sprite.setDepth(Layers.Roads);

        if (typeof tint === 'number') {
            this.sprite.setTint(tint);
        }
    }

    setNeighbor(direction: BlockNeighborDirection, neighbor: Block | null): void {
        if (direction === 'north') this.north = neighbor;
        if (direction === 'south') this.south = neighbor;
        if (direction === 'east') this.east = neighbor;
        if (direction === 'west') this.west = neighbor;
    }

    destroy(): void {
        this.sprite.destroy();
        this.north = null;
        this.south = null;
        this.east = null;
        this.west = null;
    }
}
