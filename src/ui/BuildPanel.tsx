import type { BuildSummary } from './types';

type BuildPanelProps = {
    isBuilderScene: boolean;
    buildMode: boolean;
    buildSummary: BuildSummary | null;
    onToggleBuildMode: () => void;
    onConfirmBuild: () => void;
    onCancelBuild: () => void;
};

export function BuildPanel({
    isBuilderScene,
    buildMode,
    buildSummary,
    onToggleBuildMode,
    onConfirmBuild,
    onCancelBuild
}: BuildPanelProps) {
    return (
        <div>
            <div>
                <button
                    className="button button--text"
                    disabled={!isBuilderScene}
                    onClick={onToggleBuildMode}
                    aria-label={buildMode ? 'Switch to navigation mode' : 'Switch to build mode'}
                    title={buildMode ? 'Switch to navigation mode' : 'Switch to build mode'}
                >
                    {buildMode ? 'Cancel' : 'Build'}
                </button>
            </div>
            {buildSummary && (
                <div className="spritePosition">
                    <div>Build {buildSummary.name}</div>
                    <div>{buildSummary.length} blocks</div>
                    <div>{buildSummary.intersections} intersections</div>
                    <div>
                        ${buildSummary.blockCost} x {buildSummary.length} + ${buildSummary.intersectionCost} x {buildSummary.intersections} = ${buildSummary.cost}
                    </div>
                    <div>
                        <button
                            className="button button--text"
                            onClick={onConfirmBuild}
                            aria-label="Confirm build"
                            title="Confirm build"
                        >
                            Confirm
                        </button>
                        <button
                            className="button button--text"
                            onClick={onCancelBuild}
                            aria-label="Cancel build"
                            title="Cancel build"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
