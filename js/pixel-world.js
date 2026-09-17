(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  root.PixelWorld = api;
  let destroy = () => {};
  const mount = () => { destroy(); destroy = api.mount(root.document); };
  if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
  root.document.addEventListener('pjax:complete', mount);
}(typeof globalThis === 'undefined' ? this : globalThis, function () {
  const colors = { o:'#66506e', r:'#d982a4', w:'#fff6eb', s:'#f4d79f', k:'#493a52', y:'#efd270', b:'#bdcee8', g:'#dfe8f5' };
  const sprites = {
    mushroom: ['....oooo....','..oorrrroo..','.orwwrrrrro.','orwwwrrwwrro','orwwwrrwwwro','orrrrrrwwwro','orrrwwrrrrro','.oooooooooo.','..oswsswso..','..osksksso..','..osssssso..','...oooooo...'],
    star: ['.....oo.....','....oyyo....','....oyyo....','.oooyyyyooo.','oyyyyyyyyyyo','.oyykyykyyo.','..oyyyyyyo..','..oyyyyyyo..','.oyyyoyyyo..','.oyyo..oyyo.','.ooo....ooo.','............'],
    coin: ['....oooo....','...oyyyyo...','..oyywwyyo..','..oyywyyyo..','..oyywyyyo..','..oyywyyyo..','..oyywyyyo..','..oyywyyyo..','..oyywyyyo..','..oyywwyyo..','...oyyyyo...','....oooo....'],
    cloud: ['............','............','....bbbb....','...bggggb...','.bbgggggbb..','bgggggggggb.','bggggggggggb','bggggggggggb','.bbbbbbbbbb.','............','............','............']
  };
  function paintSprite(element, name, document) {
    if (!element || !sprites[name] || element.getAttribute('data-painted')) return;
    sprites[name].forEach(row => Array.from(row.padEnd(12, '.').slice(0, 12)).forEach(pixel => {
      const cell = document.createElement('i');
      cell.setAttribute('style', `background:${colors[pixel] || 'transparent'}`);
      element.appendChild(cell);
    }));
    element.setAttribute('data-painted', name);
  }
  function mount(document) {
    document.querySelectorAll('[data-pixel-art]').forEach(el => paintSprite(el, el.getAttribute('data-pixel-art'), document));
    const game = document.querySelector('[data-pixel-game]');
    if (!game) return () => {};
    const win = document.defaultView;
    const scene = game.querySelector('.pixel-scene');
    const player = game.querySelector('.pixel-mushroom');
    const obstacle = game.querySelector('.pixel-obstacle');
    const start = game.querySelector('[data-game-start]');
    const jump = game.querySelector('[data-game-jump]');
    const exit = game.querySelector('[data-game-exit]');
    const hint = game.querySelector('[data-game-hint]');
    const scoreLabel = game.querySelector('[data-game-score]');
    const block = game.querySelector('.pixel-block');
    const listeners = [];
    const on = (target, type, callback) => {
      target.addEventListener(type, callback);
      listeners.push(() => target.removeEventListener(type, callback));
    };
    let mode = 'idle', score = 0, y = 0, velocity = 0, x = 0, passed = false, frame = 0, last = 0;
    function paint() {
      scene.dataset.runner = mode;
      player.style.transform = `translateY(${-y}px)`;
      obstacle.style.transform = `translateX(${x}px)`;
      scoreLabel.textContent = `SCORE ${String(score).padStart(2, '0')}`;
    }
    function setMode(next, message) {
      win.cancelAnimationFrame(frame);
      mode = next;
      start.textContent = { idle:'开始游戏', running:'暂停', paused:'继续游戏', over:'再来一次' }[mode];
      jump.hidden = exit.hidden = mode === 'idle';
      jump.disabled = mode !== 'running';
      hint.textContent = message;
      paint();
    }
    function pause() { if (mode === 'running') setMode('paused', '已暂停 · 点击「继续游戏」接着玩'); }
    function leap() { if (mode === 'running' && y === 0) velocity = 470; }
    function tick(now) {
      if (mode !== 'running' || !game.isConnected) return;
      const dt = Math.min((now - last) / 1000, .035);
      last = now;
      const width = scene.clientWidth;
      const speed = Math.min(230, width * .58) * (1 + Math.min(score, 15) * .025);
      velocity -= 1450 * dt;
      y = Math.max(0, y + velocity * dt);
      if (y === 0) velocity = 0;
      x -= speed * dt;
      if (x < 62 && x + 28 > 34 && y < 25) {
        setMode('over', `碰到砖块啦！本次 ${score} 分 · 再试一次？`);
        start.focus({ preventScroll:true });
        return;
      }
      if (!passed && x + 28 < 28) { score++; passed = true; }
      if (x < -32) { x = width + 35 + Math.random() * 70; passed = false; }
      paint();
      frame = win.requestAnimationFrame(tick);
    }
    on(start, 'click', () => {
      if (mode === 'running') { pause(); return; }
      if (mode !== 'paused') { score = 0; y = 0; velocity = 0; x = scene.clientWidth + 40; passed = false; }
      setMode('running', '空格 / ↑ 或点击「跳跃」 · 躲过一块 +1 分');
      jump.focus({ preventScroll:true });
      last = win.performance.now();
      frame = win.requestAnimationFrame(tick);
    });
    on(jump, 'click', leap);
    on(jump, 'keydown', event => {
      if (event.code === 'Space' || event.code === 'ArrowUp') { event.preventDefault(); if (!event.repeat) leap(); }
    });
    on(game, 'keydown', event => { if (event.code === 'Escape') pause(); });
    on(exit, 'click', () => {
      y = 0; score = 0;
      setMode('idle', '小蘑菇跳一跳 · 越过砖块得分 · 无音效');
      start.focus({ preventScroll:true });
    });
    on(block, 'click', () => {
      block.textContent = '★';
      hint.textContent = '发现一颗隐藏星星！';
    });
    on(game, 'focusout', event => { if (!game.contains(event.relatedTarget)) pause(); });
    on(document, 'visibilitychange', () => { if (document.hidden) pause(); });
    on(win, 'blur', pause);
    on(win, 'resize', pause);
    setMode('idle', '小蘑菇跳一跳 · 越过砖块得分 · 无音效');
    return () => { win.cancelAnimationFrame(frame); listeners.forEach(remove => remove()); };
  }
  return { paintSprite, mount };
}));
