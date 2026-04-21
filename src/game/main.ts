import { Boot } from './scenes/Boot';
import { GameOver } from './scenes/GameOver';
import { TestGame } from './scenes/old/TestGame';
import { Level1 } from './scenes/old/Level1';
import { Level2 } from './scenes/old/Level2';
import { LevelBuilder } from './scenes/old/LevelBuilder';
import { LevelBuilder1 } from './scenes/Levels/LevelBuilder1';
import { LevelBuilder2 } from './scenes/Levels/LevelBuilder2';
import { LevelBuilder5 } from './scenes/Levels/LevelBuilder5';
import { LevelBuilder4 } from './scenes/Levels/LevelBuilder4';
import { LevelBuilder3 } from './scenes/Levels/LevelBuilder3';
import { MainMenu } from './scenes/MainMenu';
import { AUTO, Game } from 'phaser';
import { Preloader } from './scenes/Preloader';

//  Find out more information about the Game Config at:
//  https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Phaser.Types.Core.GameConfig = {
    type: AUTO,
    width: 960,
    height: 640,
    parent: 'game-container',
    backgroundColor: '#028af8',
    antialias: false,
    scene: [
        Boot,
        Preloader,
        MainMenu,
        Level1,
        Level2,
        LevelBuilder1,
        LevelBuilder2,
        LevelBuilder3,
        LevelBuilder4,
        LevelBuilder5,
        LevelBuilder,
        TestGame,
        GameOver
    ]
};

const StartGame = (parent: string) => {

    return new Game({ ...config, parent });

}

export default StartGame;
