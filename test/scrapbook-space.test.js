const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createInitialState,
  reduceSpaceState,
  mountSpaceTools,
  mountNavigation,
  estimateReadingMinutes,
  shouldShowScrollTop,
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

  insertBefore(child, reference) {
    this.children ||= [];
    const index = this.children.indexOf(reference);
    if (index < 0) return this.appendChild(child);
    this.children.splice(index, 0, child);
    child.parentNode = this;
    return child;
  }

  cloneNode(deep = false) {
    const clone = new FakeElement({
      tagName: this.tagName,
      textContent: this.textContent,
      id: this.id,
      className: this.className
    });
    clone.attributes = { ...this.attributes };
    if (deep && this.children) this.children.forEach(child => clone.appendChild(child.cloneNode(true)));
    return clone;
  }

  focus() {
    this.focused = true;
  }

  dispatch(type, event = {}) {
    (this.listeners[type] || []).slice().forEach(listener => listener({ target: this, ...event }));
  }
}

function createDomFixture({ reducedMotion = false, tracks = [{ title: 'A', src: '/music/a.mp3' }] } = {}) {
  let playCalls = 0;
  let pauseCalls = 0;
  const scrollOptions = [];
  let audioVolume = 1;
  const audio = new FakeElement({
    src: tracks[0]?.src || '',
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
  const trackElements = tracks.map(track => new FakeElement({ dataset: { trackTitle: track.title, trackSrc: track.src } }));
  const elements = {
    '[data-space-dock]': new FakeElement(),
    '[data-space-panel]': new FakeElement({ hidden: true, dataset: { visitorStatus: 'disabled', commentsStatus: 'disabled' } }),
    '[data-space-close]': new FakeElement(),
    '[data-audio]': audio,
    '[data-audio-toggle]': new FakeElement({ disabled: false }),
    '[data-audio-volume]': new FakeElement({ value: '0.7' }),
    '[data-theme-toggle]': new FakeElement(),
    '[data-scroll-top]': new FakeElement(),
    '[data-space-status]': new FakeElement({ textContent: '' })
  };
  const panel = elements['[data-space-panel]'];
  panel.querySelector = selector => elements[selector] || null;
  panel.querySelectorAll = selector => selector === '[data-audio-track]' ? trackElements : [];
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
    querySelectorAll(selector) {
      if (selector === '[data-theme-toggle]') return [elements['[data-theme-toggle]']];
      return [];
    },
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

test('wraps previous and next actions across a multi-track playlist', () => {
  const initial = createInitialState({ tracks: [
    { src: '/music/a.mp3' },
    { src: '/music/b.mp3' },
    { src: '/music/c.mp3' }
  ] });

  assert.equal(reduceSpaceState(initial, { type: 'NEXT_TRACK' }).trackIndex, 1);
  assert.equal(reduceSpaceState({ ...initial, trackIndex: 2 }, { type: 'NEXT_TRACK' }).trackIndex, 0);
  assert.equal(reduceSpaceState(initial, { type: 'PREVIOUS_TRACK' }).trackIndex, 2);
});

test('switches audio source only from explicit previous and next controls', () => {
  const fixture = createDomFixture({ tracks: [
    { title: 'A', src: '/music/a.mp3' },
    { title: 'B', src: '/music/b.mp3' }
  ] });
  fixture.elements['[data-audio-previous]'] = new FakeElement();
  fixture.elements['[data-audio-next]'] = new FakeElement();
  fixture.elements['[data-audio-title]'] = new FakeElement({ textContent: '' });
  const panel = fixture.elements['[data-space-panel]'];
  panel.querySelector = selector => fixture.elements[selector] || null;

  const mounted = mountSpaceTools(fixture.document, null);
  assert.equal(fixture.calls.play, 0);
  fixture.elements['[data-audio-next]'].dispatch('click');
  assert.match(fixture.elements['[data-audio]'].src, /\/music\/b\.mp3$/);
  assert.equal(fixture.elements['[data-audio-title]'].textContent, 'B');
  assert.equal(fixture.calls.play, 0);
  fixture.elements['[data-audio-previous]'].dispatch('click');
  assert.match(fixture.elements['[data-audio]'].src, /\/music\/a\.mp3$/);
  mounted.destroy();
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

test('scopes space announcements away from the search live region', () => {
  const fixture = createDomFixture();
  const searchStatus = new FakeElement({ textContent: '找到 2 条结果' });
  fixture.elements['[data-search-status]'] = searchStatus;

  const mounted = mountSpaceTools(fixture.document, null);
  fixture.elements['[data-theme-toggle]'].dispatch('click');
  fixture.elements['[data-audio-volume]'].value = '0.5';
  fixture.elements['[data-audio-volume]'].dispatch('input');

  assert.equal(searchStatus.textContent, '找到 2 条结果');
  assert.equal(fixture.elements['[data-space-status]'].textContent, '音量 50%');
  mounted.destroy();
});

test('collapses mobile navigation with Escape and restores toggle focus', () => {
  const toggle = new FakeElement();
  const menu = new FakeElement({ dataset: {} });
  const document = {
    listeners: {},
    querySelector(selector) {
      return { '[data-nav-toggle]': toggle, '[data-nav-menu]': menu }[selector] || null;
    },
    addEventListener(type, listener) { this.listeners[type] = listener; },
    removeEventListener(type) { delete this.listeners[type]; }
  };

  const mounted = mountNavigation(document);
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  toggle.dispatch('click');
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(menu.dataset.mobileCollapsed, 'false');
  document.listeners.keydown({ key: 'Escape' });
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(menu.dataset.mobileCollapsed, 'true');
  assert.equal(toggle.focused, true);
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

test('shows return-to-top only after scrolling beyond one viewport', () => {
  assert.equal(shouldShowScrollTop(799, 800), false);
  assert.equal(shouldShowScrollTop(800, 800), false);
  assert.equal(shouldShowScrollTop(801, 800), true);
});

test('estimates a stable minimum reading time from article text', () => {
  assert.equal(estimateReadingMinutes('短文'), 1);
  assert.equal(estimateReadingMinutes('管'.repeat(701)), 3);
  assert.equal(estimateReadingMinutes(Array.from({ length: 401 }, () => 'pipeline').join(' ')), 3);
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

test('places mobile TOC before article content and adds reading time to title metadata', () => {
  const body = new FakeElement();
  body.setAttribute('layout', 'post');
  const main = new FakeElement();
  const article = new FakeElement({ textContent: '管'.repeat(701) });
  main.appendChild(article);
  const toc = new FakeElement({ id: 'data-toc' });
  const tocBody = new FakeElement();
  toc.appendChild(tocBody);
  const meta = new FakeElement();
  const document = {
    createElement(tagName) { return new FakeElement({ tagName }); },
    querySelector(selector) {
      return {
        '.l_body': body,
        '.l_main': main,
        'article.md-text.content': article,
        '#post-meta': meta,
        '.widgets .widget-wrapper.toc': toc,
        '.widgets .widget-wrapper.toc .widget-body': tocBody
      }[selector] || null;
    }
  };

  const mounted = mountArticleTools(document);

  assert.equal(main.children[0], mounted.mobileToc);
  assert.equal(main.children[1], article);
  assert.equal(mounted.mobileToc.tagName, 'details');
  assert.equal(meta.children.length, 1);
  assert.equal(meta.children[0].getAttribute('data-reading-time'), '');
  assert.equal(meta.children[0].textContent, '预计阅读 3 分钟');
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
