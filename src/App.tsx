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
    const [simulationPaused, setSimulationPaused] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [budgetRemaining, setBudgetRemaining] = useState<number | null>(null);
    const [budgetTotal, setBudgetTotal] = useState<number | null>(null);
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
            setSimulationPaused(false);
            setMenuOpen(false);
            setBuildMode(false);
            setBuildSummary(null);
            setRoadSummary(null);
        };

        const handleSimulationStopped = () => {
            setSimulationRunning(false);
            setSimulationLocked(false);
            setSimulationPaused(false);
            setMenuOpen(false);
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
        const handlePaused = () => {
            setSimulationPaused(true);
            setMenuOpen(true);
        };

        const handleResumed = () => {
            setSimulationPaused(false);
            setMenuOpen(false);
        };

        EventBus.on('simulation:paused', handlePaused);
        EventBus.on('simulation:resumed', handleResumed);

        return () => {
            EventBus.removeListener('simulation:paused', handlePaused);
            EventBus.removeListener('simulation:resumed', handleResumed);
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

    useEffect(() => {
        const handleBudgetUpdate = (payload: { remaining: number; total: number }) => {
            setBudgetRemaining(payload.remaining);
            setBudgetTotal(payload.total);
        };

        EventBus.on('budget:update', handleBudgetUpdate);

        return () => {
            EventBus.removeListener('budget:update', handleBudgetUpdate);
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
            setSimulationPaused(false);
            setMenuOpen(false);
            setNotification(null);
            setBudgetRemaining(null);
            setBudgetTotal(null);
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

    const pauseSimulation = () => {
        EventBus.emit('simulation:pause');
    };

    const resumeSimulation = () => {
        EventBus.emit('simulation:resume');
    };

    const restartSimulation = () => {
        EventBus.emit('simulation:restart');
    };

    const openMenu = () => {
        if (simulationRunning && !simulationPaused) {
            pauseSimulation();
        }
        setMenuOpen(true);
    };

    const handleResumeClick = () => {
        if (simulationPaused) {
            resumeSimulation();
        }
        setMenuOpen(false);
    };

    const handleRestartClick = () => {
        restartSimulation();
        setMenuOpen(false);
    };

    const spentBudget = (budgetRemaining !== null && budgetTotal !== null)
        ? Math.max(0, budgetTotal - budgetRemaining)
        : null;

    const pendingCost = buildSummary?.cost ?? null;
    const pendingRemaining = (budgetRemaining !== null && pendingCost !== null)
        ? budgetRemaining - pendingCost
        : null;
    const pendingSpent = (spentBudget !== null && pendingCost !== null)
        ? spentBudget + pendingCost
        : null;

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
                            {!menuOpen && (
                                <>
                                    <button
                                        className="button button--text"
                                        onClick={simulationRunning ? stopSimulation : startSimulation}
                                        disabled={simulationRunning ? (simulationLocked) : false}
                                    >
                                        {simulationRunning ? 'Stop' : 'Start'}
                                    </button>
                                    <button
                                        className="button button--text"
                                        onClick={openMenu}
                                        disabled={simulationLocked}
                                    >
                                        Menu
                                    </button>
                                </>
                            )}
                            {menuOpen && (
                                <>
                                    <button
                                        className="button button--text"
                                        onClick={handleResumeClick}
                                        style={{marginTop: 60}}
                                    >
                                        Resume
                                    </button>
                                    <button
                                        className="button button--text"
                                        onClick={handleRestartClick}
                                    >
                                        Start Over
                                    </button>
                                </>
                            )}
                        </div>
                        {!menuOpen && (
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
                        )}
                    </>
                )}
                {budgetRemaining !== null && budgetTotal !== null && (
                    <div className="ui-budget-panel">
                        <div className="ui-budget">
                            {pendingCost !== null && pendingRemaining !== null && pendingSpent !== null ? (
                                <>
                                    <div className="ui-budget__label">
                                        Remaining Budget:
                                    </div>
                                    <div className='ui-budget__value'>
                                        ${budgetRemaining} - ${pendingCost} = ${pendingRemaining}
                                    </div>
                                    <div className="ui-budget__spent">
                                        Spent: ${spentBudget} + ${pendingCost} = ${pendingSpent}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="ui-budget__label">Remaining Budget:</div>
                                    <div className="ui-budget__value">${budgetRemaining}</div>
                                    <div className="ui-budget__spent">Spent: ${spentBudget}</div>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {/* <PositionPanel
                mousePosition={mousePosition}
                gridPosition={gridPosition}
            /> */}
        </div>
    )
}

export default App
