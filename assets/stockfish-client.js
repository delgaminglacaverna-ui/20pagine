// Stockfish is run in an isolated single-thread WASM worker, without external requests.
export class StockfishClient {
  constructor() { this.queue = Promise.resolve(); }
  reset() { this.worker?.terminate(); this.worker = null; }
  search(fen) {
    const job = () => new Promise((resolve, reject) => {
      if (!this.worker) this.worker = new Worker('/assets/vendor/stockfish-18-lite-single.js');
      const worker = this.worker;
      let score = null, depth = 0;
      const fail = () => { clearTimeout(timer); this.reset(); reject(Error('Stockfish non disponibile. Riprova con un browser che supporta WebAssembly.')); };
      const timer = setTimeout(fail, 20000);
      worker.onerror = fail;
      worker.onmessage = ({ data }) => {
        const line = String(data);
        if (line === 'readyok') {
          worker.postMessage('position fen ' + fen);
          worker.postMessage('go depth 12 movetime 700');
        }
        if (line.startsWith('info depth') && !line.includes(' upperbound') && !line.includes(' lowerbound')) {
          const s = line.match(/score (cp|mate) (-?\d+)/), d = line.match(/depth (\d+)/);
          if (s) { score = s[1] === 'mate' ? Math.sign(Number(s[2])) * (1000000 - Math.abs(Number(s[2]))) : Number(s[2]); depth = Number(d?.[1] || 0); }
        }
        if (line.startsWith('bestmove ')) {
          clearTimeout(timer); worker.onmessage = null;
          resolve({ bestmove: line.split(' ')[1], score, depth });
        }
      };
      worker.postMessage('uci');
      worker.postMessage('setoption name Hash value 16');
      worker.postMessage('isready');
    });
    const result = this.queue.then(job, job); this.queue = result.catch(() => {}); return result;
  }
}
