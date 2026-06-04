export type ChartGridArea = 'plot' | 'price-scale' | 'time-scale' | 'axis-corner' | 'bottom-control' | 'outside';

export type ChartGridControlId = 'zoom-out' | 'zoom-in' | 'scroll-left' | 'scroll-right' | 'reset' | 'latest';

export interface ChartGridOptions {
  /**
   * Preferred right price-scale width in CSS pixels. The default follows the
   * TradingView grid3 desktop measurement.
   */
  readonly priceScaleWidth?: number;
  /**
   * Minimum right price-scale width in CSS pixels for compact layouts.
   */
  readonly minPriceScaleWidth?: number;
  readonly timeScaleHeight?: number;
  readonly minPlotWidth?: number;
  readonly minPlotHeight?: number;
  /**
   * Number of logical bars to keep between the latest candle and the right plot
   * edge when fitting or scrolling to latest data.
   */
  readonly rightOffsetBars?: number;
  /**
   * Target spacing in CSS pixels between horizontal price gridlines.
   */
  readonly horizontalGridLineSpacing?: number;
  readonly bottomControls?: boolean;
  readonly legend?: boolean;
}
