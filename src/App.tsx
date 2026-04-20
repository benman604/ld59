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
    const [simulationRunning, setSimulationRunning] = useState(false);
    const [simulationLocked, setSimulationLocked] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const notificationTimerRef = useRef<number | null>(null);

    useEffect(() => {
        let frameId = 0;

        const tick = () => {
            const scene = phaserRef.current?.scene;
            if (scene && scene.input && scene.input.activePointer) {
                const pointer = scene.input.activePointer;
                const worldPoint = scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
                const x = Math.round(worldPoint.x);
                const y = Math.round(worldPoint.y);

                setMousePosition({ x, y });

                const roadNetwork = (scene as any).roadNetwork;
                if (roadNetwork?.getGridFromIso) {
                    const grid = roadNetwork.getGridFromIso(worldPoint.x, worldPoint.y);
                    setGridPosition({ x: grid.gridX, y: grid.gridY });
                }
            }

            frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameId);
    }, []);

    useEffect(() => {
        const handleNotify = (payload: { message: string; durationMs?: number }) => {
            setNotification(payload.message);

            if (notificationTimerRef.current !== null) {
                window.clearTimeout(notificationTimerRef.current);
            }

            const delay = payload.durationMs ?? 3000;
            notificationTimerRef.current = window.setTimeout(() => {
                setNotification(null);
                notificationTimerRef.current = null;
            }, delay);
        };

        EventBus.on('ui:notify', handleNotify);

        return () => {
            EventBus.removeListener('ui:notify', handleNotify);
            if (notificationTimerRef.current !== null) {
                window.clearTimeout(notificationTimerRef.current);
                notificationTimerRef.current = null;
            }
        };
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
        const handleSimulationLock = (payload: { locked: boolean }) => {
            setSimulationLocked(payload.locked);
        };

        const handleSimulationStarted = () => {
            setSimulationRunning(true);
            setSimulationLocked(false);
            setBuildMode(false);
            setBuildSummary(null);
            setRoadSummary(null);
        };

        const handleSimulationStopped = () => {
            setSimulationRunning(false);
            setSimulationLocked(false);
            setBuildMode(false);
        };

        EventBus.on('simulation:lock', handleSimulationLock);
        EventBus.on('simulation:started', handleSimulationStarted);
        EventBus.on('simulation:stopped', handleSimulationStopped);

        return () => {
            EventBus.removeListener('simulation:lock', handleSimulationLock);
            EventBus.removeListener('simulation:started', handleSimulationStarted);
            EventBus.removeListener('simulation:stopped', handleSimulationStopped);
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

        const builderActive = scene.scene.key !== 'MainMenu';
        setIsBuilderScene(builderActive);
        if (!builderActive) {
            setBuildMode(false);
            setBuildSummary(null);
            setRoadSummary(null);
            setSimulationRunning(false);
            setSimulationLocked(false);
            setNotification(null);
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

    const startSimulation = () => {
        EventBus.emit('simulation:start');
    };

    const stopSimulation = () => {
        EventBus.emit('simulation:stop');
    };

    return (
        <div id="app">
            <div className="game-shell">
                <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />
                {notification && (
                    <div className="ui-notification">
                        <div className="ui-notification__chip">{notification}</div>
                    </div>
                )}
                {isBuilderScene && (
                    <>
                        <div className="ui-overlay-left">
                            <button
                                className="button button--text"
                                onClick={simulationRunning ? stopSimulation : startSimulation}
                                disabled={simulationRunning ? simulationLocked : false}
                            >
                                {simulationRunning ? 'Stop' : 'Start'}
                            </button>
                        </div>
                        <div className="ui-overlay">
                            <BuildPanel
                                isBuilderScene={isBuilderScene}
                                buildMode={buildMode}
                                buildSummary={buildSummary}
                                disabled={simulationRunning}
                                onToggleBuildMode={toggleBuildMode}
                                onConfirmBuild={confirmBuild}
                                onCancelBuild={cancelBuild}
                            />
                            <RoadInspector summary={roadSummary} onDelete={deleteRoad} />
                        </div>
                    </>
                )}
            </div>
            <PositionPanel
                mousePosition={mousePosition}
                gridPosition={gridPosition}
            />
        </div>
    )
}

export default App
