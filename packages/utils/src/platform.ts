export const Platform = {
  isWebGPUSupported(): boolean {
    return 'gpu' in navigator && !!navigator.gpu;
  },

  isWebGL2Supported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!canvas.getContext('webgl2');
    } catch {
      return false;
    }
  },

  isSharedArrayBufferSupported(): boolean {
    return typeof SharedArrayBuffer !== 'undefined';
  },

  isOffscreenCanvasSupported(): boolean {
    return typeof OffscreenCanvas !== 'undefined';
  },

  getDevicePixelRatio(): number {
    return window.devicePixelRatio || 1;
  },

  getHardwareConcurrency(): number {
    return navigator.hardwareConcurrency || 4;
  },

  isTouchDevice(): boolean {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  isHighRefreshRate(): boolean {
    // Check if display refresh rate is > 60Hz
    if ('getDisplayMedia' in navigator.mediaDevices) {
      // This is an approximation - actual implementation would need more sophisticated detection
      return window.matchMedia('(min-resolution: 2dppx)').matches;
    }
    return false;
  },

  async getGPUInfo(): Promise<GPUInfo | null> {
    if (!this.isWebGPUSupported()) return null;

    try {
      const gpu = (navigator as any).gpu;
      const adapter = await gpu.requestAdapter();
      if (!adapter) return null;

      const info = await adapter.requestAdapterInfo();
      return {
        vendor: info.vendor,
        architecture: info.architecture,
        device: info.device,
        description: info.description,
      };
    } catch {
      return null;
    }
  },

  getMemoryInfo(): MemoryInfo | null {
    // This is a non-standard API, only available in Chrome
    const performance = window.performance as PerformanceWithMemory;
    if ('memory' in performance) {
      return {
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        usedJSHeapSize: performance.memory.usedJSHeapSize,
      };
    }
    return null;
  },

  getBrowserInfo(): BrowserInfo {
    const ua = navigator.userAgent;
    const isChrome = /Chrome/.test(ua) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(ua);
    const isSafari = /Safari/.test(ua) && /Apple Computer/.test(navigator.vendor);
    const isEdge = /Edg/.test(ua);

    return {
      isChrome,
      isFirefox,
      isSafari,
      isEdge,
      version: this.getBrowserVersion(ua),
    };
  },

  getBrowserVersion(ua: string): string {
    const match = ua.match(/(?:Chrome|Firefox|Safari|Edg)\/(\d+)/);
    return match?.[1] ?? 'unknown';
  },

  async checkFeatureSupport(): Promise<FeatureSupport> {
    return {
      webgpu: this.isWebGPUSupported(),
      webgl2: this.isWebGL2Supported(),
      sharedArrayBuffer: this.isSharedArrayBufferSupported(),
      offscreenCanvas: this.isOffscreenCanvasSupported(),
      webWorkers: typeof Worker !== 'undefined',
      webAssembly: typeof WebAssembly !== 'undefined',
      pointerEvents: 'PointerEvent' in window,
      touchEvents: this.isTouchDevice(),
      resizeObserver: 'ResizeObserver' in window,
      intersectionObserver: 'IntersectionObserver' in window,
    };
  },
};

interface GPUInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}

interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

interface BrowserInfo {
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  version: string;
}

interface FeatureSupport {
  webgpu: boolean;
  webgl2: boolean;
  sharedArrayBuffer: boolean;
  offscreenCanvas: boolean;
  webWorkers: boolean;
  webAssembly: boolean;
  pointerEvents: boolean;
  touchEvents: boolean;
  resizeObserver: boolean;
  intersectionObserver: boolean;
}

interface PerformanceWithMemory extends Performance {
  memory: {
    jsHeapSizeLimit: number;
    totalJSHeapSize: number;
    usedJSHeapSize: number;
  };
}