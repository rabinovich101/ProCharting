export interface GestureEvent {
  readonly type: GestureType;
  readonly touches: Touch[];
  readonly center: Point;
  readonly scale?: number;
  readonly rotation?: number;
  readonly velocity?: Vector;
  readonly pressure?: number;
}

export type GestureType = 
  | 'tap'
  | 'double-tap'
  | 'long-press'
  | 'pan'
  | 'pinch'
  | 'rotate'
  | 'swipe'
  | 'two-finger-rotate';

export interface Touch {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly pressure?: number;
  readonly radiusX?: number;
  readonly radiusY?: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Vector {
  readonly x: number;
  readonly y: number;
}

export interface KeyboardShortcut {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly alt?: boolean;
  readonly shift?: boolean;
  readonly meta?: boolean;
  readonly action: () => void;
}

export interface MouseEvent {
  readonly x: number;
  readonly y: number;
  readonly button: number;
  readonly buttons: number;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
  readonly metaKey: boolean;
}

export interface WheelEvent extends MouseEvent {
  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaZ: number;
  readonly deltaMode: number;
}