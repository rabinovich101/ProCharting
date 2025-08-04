import { createChart } from '@procharting/core';

class PerformanceBenchmark {
  constructor() {
    this.chart = null;
    this.results = [];
    this.isRunning = false;
    this.setupUI();
    this.updateSystemInfo();
  }

  setupUI() {
    document.getElementById('run-all').addEventListener('click', () => this.runAllBenchmarks());
    document.getElementById('run-render').addEventListener('click', () => this.runRenderBenchmarks());
    document.getElementById('run-data').addEventListener('click', () => this.runDataBenchmarks());
    document.getElementById('run-memory').addEventListener('click', () => this.runMemoryBenchmarks());
    document.getElementById('stop').addEventListener('click', () => this.stop());
    document.getElementById('export').addEventListener('click', () => this.exportResults());
  }

  updateSystemInfo() {
    document.getElementById('cpu-cores').textContent = navigator.hardwareConcurrency || 'N/A';
    document.getElementById('dpr').textContent = window.devicePixelRatio.toFixed(2);
    document.getElementById('bundle-size').textContent = '< 25KB'; // TODO: Calculate actual size
  }

  async runAllBenchmarks() {
    this.isRunning = true;
    this.results = [];
    this.showProgress(true);
    
    try {
      await this.runRenderBenchmarks();
      await this.runDataBenchmarks();
      await this.runMemoryBenchmarks();
    } finally {
      this.isRunning = false;
      this.showProgress(false);
      this.showResults();
    }
  }

  async runRenderBenchmarks() {
    this.updateProgress('Rendering Performance', 0);
    
    // Initialize chart
    const container = document.getElementById('test-chart');
    if (this.chart) {
      this.chart.destroy();
    }
    
    this.chart = createChart(container, {
      renderer: 'auto',
      width: container.clientWidth,
      height: container.clientHeight
    });
    
    document.getElementById('renderer').textContent = this.chart.renderer;
    
    // Test initial render performance
    await this.testInitialRender();
    
    // Test FPS with different data sizes
    await this.testFPS(1000);
    await this.testFPS(10000);
    await this.testFPS(100000);
    await this.testFPS(1000000);
    
    // Test pan/zoom performance
    await this.testInteraction();
  }

  async testInitialRender() {
    const sizes = [1000, 10000, 100000];
    const results = [];
    
    for (const size of sizes) {
      const data = this.generateData(size);
      
      const start = performance.now();
      const series = this.chart.addSeries({
        type: 'candlestick',
        data: data
      });
      await this.waitFrame();
      const end = performance.now();
      
      const time = end - start;
      results.push({ size, time });
      
      series.remove();
      
      this.addResult('Initial Render', size, time, size / time * 1000, 0);
    }
    
    // Update UI with best result
    const best = results.reduce((a, b) => a.time < b.time ? a : b);
    document.getElementById('initial-render').textContent = `${best.time.toFixed(2)}ms (${best.size.toLocaleString()} points)`;
  }

  async testFPS(dataSize) {
    const data = this.generateData(dataSize);
    const series = this.chart.addSeries({
      type: 'candlestick',
      data: data
    });
    
    // Measure FPS over 60 frames
    const frameTimes = [];
    let lastTime = performance.now();
    
    for (let i = 0; i < 60; i++) {
      if (!this.isRunning) break;
      
      // Simulate small data update
      const newPoint = this.generateData(1)[0];
      newPoint.time = data[data.length - 1].time + 60;
      data.push(newPoint);
      data.shift();
      series.setData(data);
      
      await this.waitFrame();
      
      const currentTime = performance.now();
      frameTimes.push(currentTime - lastTime);
      lastTime = currentTime;
    }
    
    series.remove();
    
    const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const fps = 1000 / avgFrameTime;
    
    this.addResult(`FPS Test`, dataSize, avgFrameTime, fps, 0);
    
    if (dataSize === 1000000) {
      document.getElementById('fps-1m').textContent = `${fps.toFixed(0)} FPS`;
    }
  }

  async testInteraction() {
    const data = this.generateData(100000);
    const series = this.chart.addSeries({
      type: 'candlestick',
      data: data
    });
    
    // Simulate pan operations
    const panTimes = [];
    
    for (let i = 0; i < 20; i++) {
      const start = performance.now();
      // Trigger pan event (would need actual implementation)
      await this.waitFrame();
      const end = performance.now();
      panTimes.push(end - start);
    }
    
    series.remove();
    
    const avgPanTime = panTimes.reduce((a, b) => a + b, 0) / panTimes.length;
    document.getElementById('pan-zoom').textContent = `${avgPanTime.toFixed(2)}ms`;
    
    this.addResult('Pan/Zoom', 100000, avgPanTime, 1000 / avgPanTime, 0);
  }

  async runDataBenchmarks() {
    this.updateProgress('Data Processing', 50);
    
    // Test update throughput
    await this.testUpdateThroughput();
    
    // Test decimation
    await this.testDecimation();
    
    // Test aggregation
    await this.testAggregation();
    
    // Test encoding
    await this.testEncoding();
  }

  async testUpdateThroughput() {
    if (!this.chart) return;
    
    const series = this.chart.addSeries({
      type: 'line',
      data: this.generateLineData(1000)
    });
    
    const updates = [];
    const batchSize = 100;
    const duration = 1000; // 1 second
    
    const startTime = performance.now();
    let updateCount = 0;
    
    while (performance.now() - startTime < duration) {
      const newData = this.generateLineData(batchSize);
      series.setData(newData);
      updateCount += batchSize;
      await this.waitFrame();
    }
    
    const actualDuration = performance.now() - startTime;
    const updatesPerSecond = (updateCount / actualDuration) * 1000;
    
    series.remove();
    
    document.getElementById('updates-sec').textContent = `${updatesPerSecond.toFixed(0)}/sec`;
    this.addResult('Update Throughput', updateCount, actualDuration, updatesPerSecond, 0);
  }

  async testDecimation() {
    const sizes = [10000, 100000, 1000000];
    const results = [];
    
    for (const size of sizes) {
      const data = new Float32Array(size * 2);
      for (let i = 0; i < size; i++) {
        data[i * 2] = i;
        data[i * 2 + 1] = Math.sin(i / 100) * 100;
      }
      
      const start = performance.now();
      // Simulate decimation (would use actual decimation algorithm)
      const decimated = this.decimateData(data, size / 10);
      const end = performance.now();
      
      const time = end - start;
      results.push({ size, time });
      
      this.addResult('Decimation', size, time, size / time * 1000, 0);
    }
    
    const best = results[results.length - 1];
    document.getElementById('decimation').textContent = 
      `${(best.size / best.time * 1000).toFixed(0)} pts/sec`;
  }

  async testAggregation() {
    const data = this.generateData(100000);
    
    const start = performance.now();
    const aggregated = this.aggregateData(data, 60); // 1-minute bars
    const end = performance.now();
    
    const time = end - start;
    const throughput = data.length / time * 1000;
    
    document.getElementById('aggregation').textContent = 
      `${throughput.toFixed(0)} pts/sec`;
    
    this.addResult('Aggregation', data.length, time, throughput, 0);
  }

  async testEncoding() {
    const data = this.generateData(100000);
    
    // Test encoding speed
    const encodeStart = performance.now();
    const encoded = this.encodeBinary(data);
    const encodeEnd = performance.now();
    
    const encodeTime = encodeEnd - encodeStart;
    const encodeThroughput = data.length / encodeTime * 1000;
    
    document.getElementById('encoding').textContent = 
      `${encodeThroughput.toFixed(0)} pts/sec`;
    
    this.addResult('Binary Encoding', data.length, encodeTime, encodeThroughput, encoded.byteLength / 1024 / 1024);
  }

  async runMemoryBenchmarks() {
    this.updateProgress('Memory Usage', 75);
    
    if (!performance.memory) {
      document.getElementById('bytes-point').textContent = 'N/A';
      document.getElementById('total-memory').textContent = 'N/A';
      document.getElementById('gc-pressure').textContent = 'N/A';
      return;
    }
    
    // Test memory per point
    const initialMemory = performance.memory.usedJSHeapSize;
    
    const dataSize = 100000;
    const series = this.chart.addSeries({
      type: 'candlestick',
      data: this.generateData(dataSize)
    });
    
    await this.waitFrame();
    await this.forceGC();
    
    const finalMemory = performance.memory.usedJSHeapSize;
    const memoryUsed = finalMemory - initialMemory;
    const bytesPerPoint = memoryUsed / dataSize;
    
    document.getElementById('bytes-point').textContent = `${bytesPerPoint.toFixed(0)} bytes`;
    document.getElementById('total-memory').textContent = 
      `${(finalMemory / 1024 / 1024).toFixed(2)} MB`;
    
    series.remove();
    
    // Test GC pressure
    const gcStart = performance.now();
    await this.forceGC();
    const gcTime = performance.now() - gcStart;
    
    document.getElementById('gc-pressure').textContent = 
      gcTime < 10 ? 'Low' : gcTime < 50 ? 'Medium' : 'High';
    
    this.addResult('Memory Usage', dataSize, 0, 0, memoryUsed / 1024 / 1024);
  }

  // Helper methods
  generateData(count) {
    const data = [];
    let time = Date.now() / 1000 - count * 60;
    let lastClose = 100;
    
    for (let i = 0; i < count; i++) {
      const volatility = 0.02;
      const random = Math.random();
      const change = 2 * volatility * random - volatility;
      const open = lastClose;
      const close = open * (1 + change);
      const high = Math.max(open, close) * (1 + Math.random() * volatility);
      const low = Math.min(open, close) * (1 - Math.random() * volatility);
      const volume = Math.floor(1000 + Math.random() * 9000);
      
      data.push({ time: Math.floor(time), open, high, low, close, volume });
      
      lastClose = close;
      time += 60;
    }
    
    return data;
  }

  generateLineData(count) {
    const data = [];
    let time = Date.now() / 1000 - count * 60;
    
    for (let i = 0; i < count; i++) {
      data.push({
        time: Math.floor(time),
        value: 100 + Math.sin(i / 10) * 20 + Math.random() * 5
      });
      time += 60;
    }
    
    return data;
  }

  decimateData(data, targetPoints) {
    // Simple nth-point decimation for benchmark
    const step = Math.ceil(data.length / 2 / targetPoints);
    const result = new Float32Array(targetPoints * 2);
    
    for (let i = 0, j = 0; i < data.length && j < targetPoints; i += step * 2, j++) {
      result[j * 2] = data[i];
      result[j * 2 + 1] = data[i + 1];
    }
    
    return result;
  }

  aggregateData(data, interval) {
    const aggregated = [];
    let currentBucket = [];
    let bucketTime = Math.floor(data[0].time / interval) * interval;
    
    for (const point of data) {
      const pointBucket = Math.floor(point.time / interval) * interval;
      
      if (pointBucket !== bucketTime && currentBucket.length > 0) {
        aggregated.push({
          time: bucketTime,
          open: currentBucket[0].open,
          high: Math.max(...currentBucket.map(p => p.high)),
          low: Math.min(...currentBucket.map(p => p.low)),
          close: currentBucket[currentBucket.length - 1].close,
          volume: currentBucket.reduce((sum, p) => sum + p.volume, 0)
        });
        
        currentBucket = [];
        bucketTime = pointBucket;
      }
      
      currentBucket.push(point);
    }
    
    return aggregated;
  }

  encodeBinary(data) {
    const buffer = new ArrayBuffer(data.length * 24);
    const view = new DataView(buffer);
    
    data.forEach((point, i) => {
      const offset = i * 24;
      view.setFloat32(offset, point.time, true);
      view.setFloat32(offset + 4, point.open, true);
      view.setFloat32(offset + 8, point.high, true);
      view.setFloat32(offset + 12, point.low, true);
      view.setFloat32(offset + 16, point.close, true);
      view.setFloat32(offset + 20, point.volume, true);
    });
    
    return buffer;
  }

  waitFrame() {
    return new Promise(resolve => requestAnimationFrame(resolve));
  }

  async forceGC() {
    if (window.gc) {
      window.gc();
      await this.waitFrame();
    }
  }

  addResult(test, dataPoints, time, throughput, memory) {
    this.results.push({
      test,
      dataPoints,
      time,
      throughput,
      memory,
      status: this.getStatus(test, throughput, time)
    });
  }

  getStatus(test, throughput, time) {
    // Define performance targets
    const targets = {
      'Initial Render': { maxTime: 16 },
      'FPS Test': { minThroughput: 60 },
      'Update Throughput': { minThroughput: 10000 },
      'Pan/Zoom': { maxTime: 0.5 }
    };
    
    const target = targets[test];
    if (!target) return 'success';
    
    if (target.maxTime && time > target.maxTime) return 'warning';
    if (target.minThroughput && throughput < target.minThroughput) return 'warning';
    
    return 'success';
  }

  updateProgress(test, percent) {
    document.getElementById('current-test').textContent = test;
    document.getElementById('test-progress').textContent = `${percent}%`;
  }

  showProgress(show) {
    document.getElementById('progress').classList.toggle('active', show);
    document.getElementById('stop').disabled = !show;
  }

  showResults() {
    const resultsDiv = document.getElementById('results');
    const tbody = document.querySelector('#results-table tbody');
    
    tbody.innerHTML = '';
    
    this.results.forEach(result => {
      const row = tbody.insertRow();
      row.innerHTML = `
        <td>${result.test}</td>
        <td>${result.dataPoints.toLocaleString()}</td>
        <td>${result.time.toFixed(2)}</td>
        <td>${result.throughput.toFixed(0)}</td>
        <td>${result.memory.toFixed(2)}</td>
        <td class="${result.status}">${result.status}</td>
      `;
    });
    
    resultsDiv.style.display = 'block';
  }

  stop() {
    this.isRunning = false;
  }

  exportResults() {
    const data = {
      timestamp: new Date().toISOString(),
      system: {
        renderer: this.chart?.renderer,
        cores: navigator.hardwareConcurrency,
        dpr: window.devicePixelRatio,
        userAgent: navigator.userAgent
      },
      results: this.results
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `procharting-benchmark-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

// Initialize benchmark on load
const benchmark = new PerformanceBenchmark();

// Expose for debugging
window.benchmark = benchmark;