export type Dir = 'n' | 's' | 'e' | 'w';
export type LaneDirection = 'ns' | 'sn' | 'ew' | 'we';
export type LaneDirectionNS = 'ns' | 'sn';
export type LaneDirectionEW = 'ew' | 'we';

export function rgb(r: number, g: number, b: number): number {
    return (r << 16) + (g << 8) + b;
}