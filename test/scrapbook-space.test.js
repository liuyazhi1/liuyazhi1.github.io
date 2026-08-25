const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createInitialState,
  reduceSpaceState,
  mountSpaceTools
} = require('../source/js/scrapbook-space');
const { renderSpaceDock } = require('../scripts/scrapbook/render-home');

class FakeElement {
  constructor(properties = {}) {
    Object.assign(this, properties);
    this.attributes = {};
    this.listeners = {};
    this.dataset ||= {};
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  removeEventListener(type, listener) {
    if (this.listeners[type] === listener) delete this.listeners[type];
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  dispatch(type, event = {}) {
    this.listeners[type]?.({ target: this, ...event });
  }
}

function createDomFixture() {
  let playCalls = 0;
  let pauseCalls = 0;
  let scrollCalls = 0;
  const elements = {
    '[data-space-dock]': new FakeElement(),
    '[data-space-panel]': new FakeElement({ hidden: true, dataset: { visitorStatus: 'disabled', commentsStatus: 'disabled' } }),
    '[data-space-close]': new FakeElement(),
    '[data-audio]': new FakeElement({
      src: '/music/a.mp3',
      volume: 1,
      play() { playCalls += 1; return Promise.resolve(); },
      pause() { pauseCalls += 1; }
    }),
    '[data-audio-toggle]': new FakeElement({ disabled: false }),
    '[data-audio-volume]': new FakeElement({ value: '0.7' }),
    '[data-theme-toggle]': new FakeElement(),
    '[data-scroll-top]': new FakeElement(),
    '[aria-live="polite"]': new FakeElement({ textContent: '' })
  };
  const documentElement = new FakeElement({ dataset: {} });
  const document = {
    documentElement,
    defaultView: { scrollTo() { scrollCalls += 1; } },
    listeners: {},
    querySelector(selector) { return elements[selector] || null; },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type, listener) {
      if (this.listeners[type] === listener) delete this.listeners[type];
    },
    dispatch(type, event = {}) { this.listeners[type]?.(event); }
  };

  return {
    document,
    elements,
    calls: {
      get play() { return playCalls; },
      get pause() { return pauseCalls; },
      get scroll() { return scrollCalls; }
    }
  };
}

test('never starts music without an explicit play event', () => {
  const initial = createInitialState({ tracks: [{ src: '/music/a.mp3', title: 'A' }] });
  assert.equal(initial.playing, false);
  assert.equal(reduceSpaceState(initial, { type: 'OPEN_PANEL' }).playing, false);
  assert.equal(reduceSpaceState(initial, { type: 'PLAY' }).playing, true);
});

test('disables unavailable services honestly', () => {
  const initial = createInitialState({ tracks: [], visitorStatus: 'disabled', commentsStatus: 'disabled' });
  assert.equal(initial.musicStatus, 'missing');
  assert.equal(initial.visitorStatus, 'disabled');
  assert.equal(initial.commentsStatus, 'disabled');
});

test('reduces panel, playback and clamped volume state', () => {
  const initial = createInitialState({ tracks: [{ src: '/music/a.mp3' }] });
  assert.equal(reduceSpaceState(initial, { type: 'OPEN_PANEL' }).open, true);
  assert.equal(reduceSpaceState(initial, { type: 'CLOSE_PANEL' }).open, false);
  assert.equal(reduceSpaceState(initial, { type: 'PAUSE' }).playing, false);
  assert.equal(reduceSpaceState(initial, { type: 'SET_VOLUME', value: 2 }).volume, 1);
  assert.equal(reduceSpaceState(initial, { type: 'SET_VOLUME', value: -1 }).volume, 0);
  assert.equal(reduceSpaceState(createInitialState(), { type: 'PLAY' }).playing, false);
});

test('mounts stored preferences but only plays after the user clicks play', async () => {
  const fixture = createDomFixture();
  const values = new Map([
    ['scrapbook-theme', 'dark'],
    ['scrapbook-volume', '0.35']
  ]);
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };

  const mounted = mountSpaceTools(fixture.document, storage);
  assert.equal(fixture.calls.play, 0);
  assert.equal(fixture.document.documentElement.dataset.theme, 'dark');
  assert.equal(fixture.elements['[data-audio]'].volume, 0.35);

  fixture.elements['[data-space-dock]'].dispatch('click');
  assert.equal(fixture.calls.play, 0);
  assert.equal(fixture.elements['[data-space-panel]'].hidden, false);
  assert.equal(fixture.elements['[data-space-dock]'].getAttribute('aria-expanded'), 'true');

  fixture.elements['[data-audio-toggle]'].dispatch('click');
  await Promise.resolve();
  assert.equal(fixture.calls.play, 1);
  assert.equal(fixture.elements['[data-audio-toggle]'].getAttribute('aria-pressed'), 'true');

  fixture.elements['[data-audio-toggle]'].dispatch('click');
  assert.equal(fixture.calls.pause, 1);
  assert.equal(fixture.elements['[data-audio-toggle]'].getAttribute('aria-pressed'), 'false');

  fixture.elements['[data-audio-volume]'].value = '0.8';
  fixture.elements['[data-audio-volume]'].dispatch('input');
  assert.equal(values.get('scrapbook-volume'), '0.8');

  fixture.elements['[data-theme-toggle]'].dispatch('click');
  assert.equal(values.get('scrapbook-theme'), 'light');

  fixture.document.dispatch('keydown', { key: 'Escape' });
  assert.equal(fixture.elements['[data-space-panel]'].hidden, true);
  assert.equal(fixture.elements['[data-space-dock]'].getAttribute('aria-expanded'), 'false');

  mounted.destroy();
});

test('renders the complete dock protocol and honest missing states', () => {
  const html = renderSpaceDock({
    music: { tracks: [] },
    visitor: { status: 'disabled' },
    comments: { status: 'disabled' }
  });

  assert.match(html, /data-space-dock/);
  assert.match(html, /data-space-panel/);
  assert.match(html, /data-theme-toggle/);
  assert.match(html, /data-scroll-top/);
  assert.match(html, /data-audio-toggle[^>]*disabled/);
  assert.match(html, /音乐暂未放入/);
  assert.match(html, /访问统计未启用/);
  assert.match(html, /留言板暂未启用/);
  assert.doesNotMatch(html, /autoplay/i);
});
