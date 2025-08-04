import { performance } from 'perf_hooks';

// Benchmark configuration
const SIZES = [1000, 10000, 100000, 1000000];
const ITERATIONS = 5;

// Generate test data
function generateData(size) {
  const data = new Float32Array(size * 6); // time, open, high, low, close, volume
  let time = Date.now() / 1000;
  
  for (let i = 0; i < size; i++) {
    const idx = i * 6;
    data[idx] = time;
    data[idx + 1] = 100 + Math.random() * 10; // open
    data[idx + 2] = 105 + Math.random() * 10; // high
    data[idx + 3] = 95 + Math.random() * 10;  // low
    data[idx + 4] = 100 + Math.random() * 10; // close
    data[idx + 5] = 1000 + Math.random() * 9000; // volume
    time += 60;
  }
  
  return data;
}

// Run benchmark
async function runBenchmark() {
  console.log('ProCharting Performance Benchmark');
  console.log('=================================\\n');
  
  const results = [];
  
  for (const size of SIZES) {
    console.log(`Testing with ${size.toLocaleString()} data points...`);
    
    const times = [];
    const data = generateData(size);
    
    for (let i = 0; i < ITERATIONS; i++) {
      const start = performance.now();
      
      // Simulate data processing
      // In real benchmark, this would create chart and render
      let sum = 0;
      for (let j = 0; j < data.length; j++) {
        sum += data[j];
      }
      
      const end = performance.now();
      times.push(end - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    results.push({
      size: size.toLocaleString(),
      avgTime: avgTime.toFixed(2) + 'ms',
      minTime: minTime.toFixed(2) + 'ms',
      maxTime: maxTime.toFixed(2) + 'ms',
      throughput: (size / avgTime * 1000).toFixed(0) + ' points/sec',
      memoryPerPoint: ((data.byteLength / size) + ' bytes')
    });
  }
  
  console.log('\\nResults:');
  console.table(results);
  
  console.log('\\nPerformance Targets:');
  console.log('- Initial render: < 16ms for 100,000 points');
  console.log('- Update latency: < 1ms');
  console.log('- Memory usage: < 100 bytes per point');
  console.log('- FPS: 144+ with 1M points');
}

runBenchmark().catch(console.error);