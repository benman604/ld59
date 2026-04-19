import { useEffect, useRef, useState } from 'react';
import { IRefPhaserGame, PhaserGame } from './PhaserGame';
import { EventBus } from './game/EventBus';
import { BuildPanel } from './ui/BuildPanel';
import { PositionPanel } from './ui/PositionPanel';
import { RoadInspector } from './ui/RoadInspector';
import type { BuildSummary, RoadSummary } from './ui/types';

function App()
{
    //  References to the PhaserGame component (game and scene are exposed)
    const phaserRef = useRef<IRefPhaserGame | null>(null);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const [gridPosition, setGridPosition] = useState({ x: 0, y: 0 });
    const [buildMode, setBuildMode] = useState(false);
    const [buildSummary, setBuildSummary] = useState<BuildSummary | null>(null);
    const [roadSummary, setRoadSummary] = useState<RoadSummary | null>(null);
    const [isBuilderScene, setIsBuilderScene] = useState(false);

    useEffect(() => {
        let frameId = 0;

        const tick = () => {
            const scene = phaserRef.current?.scene;
            if (scene && scene.input && scene.input.activePointer) {
                const pointer = scene.input.activePointer;
                const x = Math.round(pointer.worldX ?? pointer.x);
                const y = Math.round(pointer.worldY ?? pointer.y);

                setMousePosition({ x, y });

                const roadNetwork = (scene as any).roadNetwork;
                if (roadNetwork?.getGridFromIso) {
                    const grid = roadNetwork.getGridFromIso(pointer.worldX ?? pointer.x, pointer.worldY ?? pointer.y);
                    setGridPosition({ x: grid.gridX, y: grid.gridY });
                }
            }

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, []);

    useEffect(() => {
        const handleProposal = (summary: BuildSummary) => {
            setBuildSummary(summary);
        };

        const handleClear = () => {
            setBuildSummary(null);
        };

        EventBus.on('builder:proposal', handleProposal);
        EventBus.on('builder:clear', handleClear);

        return () => {
            EventBus.removeListener('builder:proposal', handleProposal);
            EventBus.removeListener('builder:clear', handleClear);
        };
    }, []);

    useEffect(() => {
        const handleInspect = (summary: RoadSummary) => {
            setRoadSummary(summary);
        };

        const handleClear = () => {
            setRoadSummary(null);
        };

        EventBus.on('road:inspect', handleInspect);
        EventBus.on('road:clear', handleClear);

        return () => {
            EventBus.removeListener('road:inspect', handleInspect);
            EventBus.removeListener('road:clear', handleClear);
        };
    }, []);

    // Event emitted from the PhaserGame component
    const currentScene = (scene: Phaser.Scene) => {

        const builderActive = scene.scene.key === 'LevelBuilder';
        setIsBuilderScene(builderActive);
        if (!builderActive) {
            setBuildMode(false);
            setBuildSummary(null);
            setRoadSummary(null);
        }
        
    }

    const toggleBuildMode = () => {
        const next = !buildMode;
        setBuildMode(next);
        setBuildSummary(null);
        setRoadSummary(null);
        EventBus.emit('builder:mode', { enabled: next });
    };

    const confirmBuild = () => {
        EventBus.emit('builder:confirm');
        setBuildSummary(null);
        setBuildMode(false);
        EventBus.emit('builder:mode', { enabled: false });
    };

    const cancelBuild = () => {
        EventBus.emit('builder:cancel');
        setBuildSummary(null);
        setBuildMode(false);
        EventBus.emit('builder:mode', { enabled: false });
    };

    const deleteRoad = (name: string) => {
        EventBus.emit('road:delete', { name });
        setRoadSummary(null);
    };

    return (
        <div id="app">
            <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
            <div>
                <PositionPanel
                    mousePosition={mousePosition}
                    gridPosition={gridPosition}
                />
                <BuildPanel
                    isBuilderScene={isBuilderScene}
                    buildMode={buildMode}
                    buildSummary={buildSummary}
                    onToggleBuildMode={toggleBuildMode}
                    onConfirmBuild={confirmBuild}
                    onCancelBuild={cancelBuild}
                />
                <RoadInspector summary={roadSummary} onDelete={deleteRoad} />
            </div>
        </div>
    )
}

export default App
