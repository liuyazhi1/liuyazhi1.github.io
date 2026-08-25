const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createInitialState,
  reduceSpaceState,
  mountSpaceTools,
  shouldMountArticleTools,
  mountArticleTools
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
    this.listeners[type] ||= [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type, listener) {
    this.listeners[type] = (this.listeners[type] || []).filter(candidate => candidate !== listener);
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  appendChild(child) {
    this.children ||= [];
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  focus() {
    this.focused = true;
  }

  dispatch(type, event = {}) {
    (this.listeners[type] || []).slice().forEach(listener => listener({ target: this, ...event }));
  }
}

function createDomFixture({ reducedMotion = false } = {}) {
  let playCalls = 0;
  let pauseCalls = 0;
  const scrollOptions = [];
  let audioVolume = 1;
  const audio = new FakeElement({
    src: '/music/a.mp3',
    play() { playCalls += 1; return Promise.resolve(); },
    pause() { pauseCalls += 1; }
  });
  Object.defineProperty(audio, 'volume', {
    get() { return audioVolume; },
    set(value) {
      if (value < 0 || value > 1) throw new RangeError('volume must be between 0 and 1');
      audioVolume = value;
    }
  });
  const elements = {
    '[data-space-dock]': new FakeElement(),
    '[data-space-panel]': new FakeElement({ hidden: true, dataset: { visitorStatus: 'disabled', commentsStatus: 'disabled' } }),
    '[data-space-close]': new FakeElement(),
    '[data-audio]': audio,
    '[data-audio-toggle]': new FakeElement({ disabled: false }),
    '[data-audio-volume]': new FakeElement({ value: '0.7' }),
    '[data-theme-toggle]': new FakeElement(),
    '[data-scroll-top]': new FakeElement(),
    '[aria-live="polite"]': new FakeElement({ textContent: '' })
  };
  const documentElement = new FakeElement({ dataset: {} });
  const document = {
    documentElement,
    defaultView: {
      matchMedia(query) {
        assert.equal(query, '(prefers-reduced-motion: reduce)');
        return { matches: reducedMotion };
      },
      scrollTo(options) { scrollOptions.push(options); }
    },
    listeners: {},
    querySelector(selector) { return elements[selector] || null; },
    addEventListener(type, listener) {
      this.listeners[type] ||= [];
      this.listeners[type].push(listener);
    },
    removeEventListener(type, listener) {
      this.listeners[type] = (this.listeners[type] || []).filter(candidate => candidate !== listener);
    },
    dispatch(type, event = {}) {
      (this.listeners[type] || []).slice().forEach(listener => listener(event));
    }
  };

  return {
    document,
    elements,
    calls: {
      get play() { return playCalls; },
      get pause() { return pauseCalls; },
      get scrollOptions() { return scrollOptions.slice(); }
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
  assert.equal(fixture.elements['[data-space-dock]'].focused, true);

  mounted.destroy();
});

test('clamps an out-of-range stored volume before assigning media volume', () => {
  const fixture = createDomFixture();
  const storage = {
    getItem(key) { return key === 'scrapbook-volume' ? '2' : null; },
    setItem() {}
  };

  const mounted = mountSpaceTools(fixture.document, storage);
  assert.equal(fixture.elements['[data-audio]'].volume, 1);
  assert.equal(mounted.getState().volume, 1);
  mounted.destroy();
});

test('uses non-smooth scrolling when reduced motion is requested', () => {
  const fixture = createDomFixture({ reducedMotion: true });
  const mounted = mountSpaceTools(fixture.document, null);

  fixture.elements['[data-scroll-top]'].dispatch('click');
  assert.deepEqual(fixture.calls.scrollOptions, [{ top: 0, behavior: 'auto' }]);
  mounted.destroy();
});

test('returns the existing controller instead of binding duplicate listeners', async () => {
  const fixture = createDomFixture();
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); }
  };

  const first = mountSpaceTools(fixture.document, storage);
  const second = mountSpaceTools(fixture.document, storage);
  assert.equal(second, first);

  fixture.elements['[data-theme-toggle]'].dispatch('click');
  assert.equal(fixture.document.documentElement.dataset.theme, 'dark');
  fixture.elements['[data-audio-toggle]'].dispatch('click');
  await Promise.resolve();
  assert.equal(fixture.calls.play, 1);
  first.destroy();
});

test('mounts article tools only once on post layouts', () => {
  assert.equal(shouldMountArticleTools('post', false), true);
  assert.equal(shouldMountArticleTools('post', true), false);
  assert.equal(shouldMountArticleTools('page', false), false);
  assert.equal(typeof mountArticleTools, 'function');
});

test('mounts one accessible article dock using the shared space protocol', () => {
  const body = new FakeElement();
  body.setAttribute('layout', 'post');
  const main = new FakeElement();
  const toc = new FakeElement({ id: 'data-toc' });
  const document = {
    createElement(tagName) { return new FakeElement({ tagName }); },
    querySelector(selector) {
      return {
        '.l_body': body,
        '.l_main': main,
        '.widgets .widget-wrapper.toc': toc
      }[selector] || null;
    }
  };

  mountArticleTools(document);
  mountArticleTools(document);

  assert.equal(body.getAttribute('data-scrapbook-mounted'), 'true');
  assert.equal(main.children.length, 2);
  assert.equal(main.children[0].getAttribute('data-space-dock'), '');
  assert.equal(main.children[0].getAttribute('aria-controls'), 'scrapbook-article-tools');
  assert.equal(main.children[1].getAttribute('data-space-panel'), '');
  assert.equal(main.children[1].hidden, true);
  assert.equal(toc.id, 'data-toc');
  assert.equal(main.children[1].children[0].children[2].getAttribute('aria-controls'), 'data-toc');
});

test('does not mount article tools outside post layouts', () => {
  const body = new FakeElement();
  body.setAttribute('layout', 'page');
  const main = new FakeElement();
  const document = {
    createElement(tagName) { return new FakeElement({ tagName }); },
    querySelector(selector) { return selector === '.l_body' ? body : main; }
  };

  assert.equal(mountArticleTools(document), null);
  assert.equal(main.children, undefined);
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
  assert.match(html, /data-visitor-entry[^>]*disabled/);
  assert.match(html, /留言板暂未启用/);
  assert.doesNotMatch(html, /autoplay/i);
});

test('renders a real visitor link only when visitor service is available', () => {
  const html = renderSpaceDock({
    visitor: { status: 'enabled', href: '/visitors/' }
  });

  assert.match(html, /<a[^>]*data-visitor-entry[^>]*href="\/visitors\/"[^>]*>查看访问统计<\/a>/);
  assert.doesNotMatch(html, /data-visitor-entry[^>]*disabled/);
});
