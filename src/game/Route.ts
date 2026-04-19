import { Road } from './Road';
import { Block } from './Block';
import { RoadNetwork } from './RoadNetwork';
import { Layers } from '../types';

export class Route {
    readonly road: Road;
    readonly source: Block;
    readonly destination: Block;
    readonly sourceOpening: Phaser.GameObjects.Image;
    readonly destinationOpening: Phaser.GameObjects.Image;

    constructor(scene: Phaser.Scene, roadNetwork: RoadNetwork, road: Road, source: Block, destination: Block) {
        this.road = road;
        this.source = source;
        this.destination = destination;

        this.sourceOpening = this.createOpening(scene, roadNetwork, source, road);
        const destinationRoad = this.findRoadForBlock(roadNetwork, destination) ?? road;
        this.destinationOpening = this.createOpening(scene, roadNetwork, destination, destinationRoad);
    }

    private findRoadForBlock(roadNetwork: RoadNetwork, block: Block): Road | null {
        for (const road of roadNetwork.getRoads()) {
            if (road.getBlockAt(block.gridX, block.gridY)) {
                return road;
            }
        }

        return null;
    }

    private createOpening(
        scene: Phaser.Scene,
        roadNetwork: RoadNetwork,
        block: Block,
        road: Road
    ): Phaser.GameObjects.Image {
        const textureKey = this.getOpeningTexture(road, block);
        const gridX = block.gridX - 1;
        const gridY = block.gridY - 1;

        const { x, y } = roadNetwork.getWorldFromGrid(gridX, gridY);
        const sprite = scene.add.image(x, y + 15, textureKey);
        sprite.setDepth(Layers.Openings + (sprite.y / 1000));
        return sprite;
    }

    private getOpeningTexture(road: Road, block: Block): string {
        if (road.orientation === 'ew') {
            return block.gridX <= road.minIndex ? 'opening_nw' : 'opening_hidden';
        }

        return block.gridY <= road.minIndex ? 'opening_ne' : 'opening_hidden';
    }

}
