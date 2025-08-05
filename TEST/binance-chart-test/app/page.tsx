export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Binance Chart Test</h1>
        
        <div className="space-y-4">
          <a 
            href="/tradingview" 
            className="block p-6 bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <h2 className="text-xl font-semibold mb-2">📈 TradingView Style (PROFESSIONAL!)</h2>
            <p className="opacity-90">Exact TradingView look & feel - Professional proportions, colors, and scaling!</p>
          </a>
          
          <a 
            href="/floating" 
            className="block p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <h2 className="text-xl font-semibold mb-2">🎮 Floating Chart</h2>
            <p className="opacity-90">Full 2D freedom - Move the chart in ANY direction! Up, down, left, right!</p>
          </a>
          
          <a 
            href="/live" 
            className="block p-6 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
          >
            <h2 className="text-xl font-semibold mb-2">🔴 Live Chart</h2>
            <p className="opacity-90">Real-time candlestick chart with WebSocket streaming - No refresh needed!</p>
          </a>
          
          <a 
            href="/simple" 
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Simple Data Table</h2>
            <p className="text-gray-600">View BTCUSDT data in a table format</p>
          </a>
          
          <a 
            href="/canvas" 
            className="block p-6 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold mb-2">Canvas Chart</h2>
            <p className="text-gray-600">View BTCUSDT candlestick chart using HTML5 Canvas</p>
          </a>
        </div>
        
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            ✨ The Live Chart uses WebSocket connections to stream real-time data directly from Binance. 
            Candles update automatically as new trades occur!
          </p>
        </div>
      </div>
    </div>
  );
}