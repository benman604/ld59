export type BlockNeighborDirection = 'north' | 'south' | 'east' | 'west';

export class Block {
    static readonly SIZE = 30;

    readonly gridX: number;
    readonly gridY: number;
    readonly sprite: Phaser.GameObjects.Image;

    north: Block | null = null;
    south: Block | null = null;
    east: Block | null = null;
    west: Block | null = null;

    constructor(
        scene: Phaser.Scene,
        worldX: number,
        worldY: number,
        gridX: number,
        gridY: number,
        textureKey: string = 'laneblock',
        rotationRadians: number = 0,
        tint?: number
    ) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.sprite = scene.add.image(worldX, worldY, textureKey);
        this.sprite.setDisplaySize(Block.SIZE, Block.SIZE);
        this.sprite.setRotation(rotationRadians);

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
