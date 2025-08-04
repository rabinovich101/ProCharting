import { createChart } from '@procharting/core';

console.log('ProCharting example loaded');

// Get DOM elements
const chartContainer = document.getElementById('chart-container');
const rendererType = document.getElementById('renderer-type');
const fpsDisplay = document.getElementById('fps');
const dataPointsDisplay = document.getElementById('data-points');
const memoryDisplay = document.getElementById('memory');

// Create chart
let chart = null;
let candlestickSeries = null;
let dataPoints = [];

// Generate random OHLC data
function generateRandomData(count) {
  const data = [];
  let time = Date.now() / 1000 - count * 60;
  let lastClose = 100;
  
  for (let i = 0; i < count; i++) {
    const volatility = 0.02;
    const random = Math.random();
    const change = 2 * volatility * random - volatility;
    const open = lastClose * (1 + change);
    const close = open * (1 + (Math.random() - 0.5) * volatility);
    const high = Math.max(open, close) * (1 + Math.random() * volatility);
    const low = Math.min(open, close) * (1 - Math.random() * volatility);
    const volume = Math.floor(1000 + Math.random() * 9000);
    
    data.push({
      time: Math.floor(time),
      open,
      high,
      low,
      close,
      volume
    });
    
    lastClose = close;
    time += 60; // 1 minute intervals
  }
  
  return data;
}

// Initialize chart
async function initChart() {
  try {
    chart = createChart(chartContainer, {
      renderer: 'auto',
      theme: 'light',
      width: chartContainer.clientWidth,
      height: chartContainer.clientHeight
    });
    
    // Add initial data
    dataPoints = generateRandomData(1000);
    candlestickSeries = chart.addSeries({
      type: 'candlestick',
      data: dataPoints
    });
    
    // Update displays
    rendererType.textContent = chart.renderer;
    dataPointsDisplay.textContent = dataPoints.length.toLocaleString();
    
    console.log('Chart initialized with renderer:', chart.renderer);
  } catch (error) {
    console.error('Failed to initialize chart:', error);
    rendererType.textContent = 'Error: ' + error.message;
  }
}

// Initialize on load
initChart();

// FPS counter
let fps = 0;
let lastTime = performance.now();
let frameCount = 0;

function updateFPS() {
  frameCount++;
  const currentTime = performance.now();
  const deltaTime = currentTime - lastTime;
  
  if (deltaTime >= 1000) {
    fps = Math.round((frameCount * 1000) / deltaTime);
    fpsDisplay.textContent = fps;
    frameCount = 0;
    lastTime = currentTime;
  }
  
  requestAnimationFrame(updateFPS);
}

updateFPS();

// Memory display
if (performance.memory) {
  setInterval(() => {
    const mb = (performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    memoryDisplay.textContent = `${mb} MB`;
  }, 1000);
}

// Button handlers
document.getElementById('add-data').addEventListener('click', () => {
  if (!candlestickSeries) return;
  
  const newData = generateRandomData(100);
  dataPoints = dataPoints.concat(newData);
  candlestickSeries.setData(dataPoints);
  dataPointsDisplay.textContent = dataPoints.length.toLocaleString();
});

document.getElementById('clear-data').addEventListener('click', () => {
  if (!candlestickSeries) return;
  
  dataPoints = [];
  candlestickSeries.setData(dataPoints);
  dataPointsDisplay.textContent = '0';
});

document.getElementById('toggle-renderer').addEventListener('click', () => {
  // For now, just recreate with a different renderer
  if (chart) {
    chart.destroy();
  }
  initChart();
});

document.getElementById('benchmark').addEventListener('click', async () => {
  console.log('Running benchmark...');
  
  const sizes = [1000, 10000, 100000];
  const results = [];
  
  for (const size of sizes) {
    const data = generateRandomData(size);
    const startTime = performance.now();
    
    if (candlestickSeries) {
      candlestickSeries.setData(data);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    results.push({
      size,
      duration: duration.toFixed(2),
      throughput: (size / duration * 1000).toFixed(0)
    });
    
    console.log(`Rendered ${size} points in ${duration.toFixed(2)}ms`);
  }
  
  console.table(results);
  alert('Benchmark complete! Check console for results.');
});