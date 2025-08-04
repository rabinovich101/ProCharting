export interface WorkerMessage<T = unknown> {
  readonly id: string;
  readonly type: string;
  readonly data: T;
  readonly transfer?: Transferable[];
}

export interface WorkerResponse<T = unknown> {
  readonly id: string;
  readonly type: 'success' | 'error';
  readonly data: T;
  readonly error?: Error;
}

export class WorkerPool {
  private readonly workers: Worker[] = [];
  private readonly available: Worker[] = [];
  private readonly pending = new Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
  }>();
  private nextId = 0;

  constructor(
    private readonly workerFactory: () => Worker,
    private readonly size: number = navigator.hardwareConcurrency || 4,
  ) {
    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.size; i++) {
      const worker = this.workerFactory();
      worker.addEventListener('message', (event) => this.handleMessage(event));
      worker.addEventListener('error', (event) => this.handleError(event));
      this.workers.push(worker);
      this.available.push(worker);
    }
  }

  async execute<T, R>(type: string, data: T, transfer?: Transferable[]): Promise<R> {
    const worker = await this.getWorker();
    const id = String(this.nextId++);

    return new Promise<R>((resolve, reject) => {
      this.pending.set(id, { 
        resolve: resolve as (value: unknown) => void, 
        reject 
      });
      
      const message: WorkerMessage<T> = { id, type, data, transfer };
      if (transfer) {
        worker.postMessage(message, transfer);
      } else {
        worker.postMessage(message);
      }
    });
  }

  private async getWorker(): Promise<Worker> {
    if (this.available.length === 0) {
      await new Promise<void>((resolve) => {
        const checkAvailable = (): void => {
          if (this.available.length > 0) {
            resolve();
          } else {
            setTimeout(checkAvailable, 10);
          }
        };
        checkAvailable();
      });
    }
    return this.available.pop()!;
  }

  private handleMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, type, data, error } = event.data;
    const pending = this.pending.get(id);
    
    if (!pending) return;
    
    this.pending.delete(id);
    const worker = event.target as Worker;
    this.available.push(worker);

    if (type === 'success') {
      pending.resolve(data);
    } else {
      pending.reject(error || new Error('Worker error'));
    }
  }

  private handleError(event: ErrorEvent): void {
    console.error('Worker error:', event);
  }

  terminate(): void {
    this.workers.forEach((worker) => worker.terminate());
    this.workers.length = 0;
    this.available.length = 0;
    this.pending.clear();
  }
}

export function createWorkerFromFunction(fn: Function): Worker {
  const blob = new Blob([`
    self.addEventListener('message', async (event) => {
      const { id, type, data } = event.data;
      try {
        const result = await (${fn.toString()})(type, data);
        self.postMessage({ id, type: 'success', data: result });
      } catch (error) {
        self.postMessage({ id, type: 'error', error });
      }
    });
  `], { type: 'application/javascript' });
  
  return new Worker(URL.createObjectURL(blob), { type: 'module' });
}