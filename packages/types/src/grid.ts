export type ChartGridArea = 'plot' | 'price-scale' | 'time-scale' | 'axis-corner' | 'bottom-control' | 'outside';

export type ChartGridControlId = 'zoom-out' | 'zoom-in' | 'scroll-left' | 'scroll-right' | 'reset' | 'latest';

export interface ChartGridOptions {
  readonly priceScaleWidth?: number;
  readonly timeScaleHeight?: number;
  readonly minPlotWidth?: number;
  readonly minPlotHeight?: number;
  readonly bottomControls?: boolean;
  readonly legend?: boolean;
}
