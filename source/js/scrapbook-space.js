(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  root.ScrapbookSpace = api;
  let controller = null;
  const mount = () => {
    let storage = null;
    try {
      storage = root.localStorage;
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    controller?.destroy();
    api.mountArticleTools(root.document);
    controller = api.mountSpaceTools(root.document, storage);
  };

  if (root.document?.readyState === 'loading') {
    root.document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else if (root.document) {
    mount();
  }
  root.document?.addEventListener?.('pjax:complete', mount);
}(typeof globalThis === 'undefined' ? this : globalThis, function () {
  'use strict';

  const mountedDocuments = new WeakMap();

  function createInitialState(config = {}) {
    return {
      open: false,
      playing: false,
      trackIndex: 0,
      volume: Number.isFinite(config.volume) ? config.volume : 0.7,
      musicStatus: config.tracks?.length ? 'ready' : 'missing',
      visitorStatus: config.visitorStatus || 'disabled',
      commentsStatus: config.commentsStatus || 'disabled'
    };
  }

  function reduceSpaceState(state, event) {
    if (event.type === 'OPEN_PANEL') return { ...state, open: true };
    if (event.type === 'CLOSE_PANEL') return { ...state, open: false };
    if (event.type === 'PLAY' && state.musicStatus === 'ready') return { ...state, playing: true };
    if (event.type === 'PAUSE') return { ...state, playing: false };
    if (event.type === 'SET_VOLUME') {
      return { ...state, volume: Math.max(0, Math.min(1, event.value)) };
    }
    return state;
  }

  function readStorage(storage, key) {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function writeStorage(storage, key, value) {
    try {
      storage?.setItem(key, value);
    } catch {
      // The UI remains usable when storage is unavailable or full.
    }
  }

  function shouldMountArticleTools(layout, mounted) {
    return layout === 'post' && mounted === false;
  }

  function setAttributes(element, attributes) {
    Object.entries(attributes).forEach(([name, value]) => {
      element.setAttribute(name, value);
    });
    return element;
  }

  function appendChildren(parent, children) {
    children.forEach(child => parent.appendChild(child));
    return parent;
  }

  function createArticleToolButton(document, text, attributes = {}) {
    const button = setAttributes(document.createElement('button'), {
      type: 'button',
      ...attributes
    });
    button.textContent = text;
    return button;
  }

  function mountArticleTools(document) {
    const body = document?.querySelector?.('.l_body');
    const layout = body?.getAttribute?.('layout');
    const mounted = body?.getAttribute?.('data-scrapbook-mounted') === 'true';
    if (!shouldMountArticleTools(layout, mounted)) return null;

    const main = document.querySelector('.l_main');
    if (!main || !document.createElement) return null;

    const dock = createArticleToolButton(document, '打开文章工具盒', {
      class: 'scrapbook-article-tools-toggle',
      'data-space-dock': '',
      'aria-controls': 'scrapbook-article-tools',
      'aria-expanded': 'false'
    });
    const panel = setAttributes(document.createElement('aside'), {
      id: 'scrapbook-article-tools',
      class: 'scrapbook-article-tools',
      'data-space-panel': '',
      'data-visitor-status': 'disabled',
      'data-comments-status': 'disabled',
      'aria-label': '文章工具盒'
    });
    panel.hidden = true;

    const section = document.createElement('section');
    const title = document.createElement('h2');
    title.textContent = '阅读工具';
    const musicButton = createArticleToolButton(document, '音乐暂未放入', {
      'data-audio-toggle': '',
      'aria-pressed': 'false',
      disabled: ''
    });
    musicButton.disabled = true;

    const toc = document.querySelector('.widgets .widget-wrapper.toc');
    const tocId = toc?.id || 'scrapbook-article-toc';
    if (toc && !toc.id) toc.id = tocId;
    const tocButton = createArticleToolButton(document, '打开目录', {
      'data-article-toc': '',
      'aria-controls': tocId
    });
    if (!toc) {
      tocButton.disabled = true;
      tocButton.setAttribute('disabled', '');
    } else {
      tocButton.addEventListener?.('click', () => {
        body.setAttribute('rightbar', '');
        toc.setAttribute?.('tabindex', '-1');
        toc.focus?.({ preventScroll: true });
      });
    }

    const scrollTopButton = createArticleToolButton(document, '返回顶部', {
      'data-scroll-top': ''
    });
    const closeButton = createArticleToolButton(document, '关闭工具盒', {
      'data-space-close': ''
    });
    const liveRegion = setAttributes(document.createElement('p'), {
      'aria-live': 'polite'
    });

    appendChildren(section, [title, musicButton, tocButton, scrollTopButton, closeButton, liveRegion]);
    panel.appendChild(section);
    main.appendChild(dock);
    main.appendChild(panel);
    body.setAttribute('data-scrapbook-mounted', 'true');

    return { dock, panel };
  }

  function mountSpaceTools(document, storage) {
    const existingController = document && mountedDocuments.get(document);
    if (existingController) return existingController;

    const dock = document?.querySelector?.('[data-space-dock]');
    const panel = document?.querySelector?.('[data-space-panel]');
    if (!dock || !panel) return null;

    const closeButton = document.querySelector('[data-space-close]');
    const audio = document.querySelector('[data-audio]');
    const audioButton = document.querySelector('[data-audio-toggle]');
    const volumeInput = document.querySelector('[data-audio-volume]');
    const themeButton = document.querySelector('[data-theme-toggle]');
    const scrollTopButton = document.querySelector('[data-scroll-top]');
    const liveRegion = document.querySelector('[aria-live="polite"]');
    const storedVolume = Number.parseFloat(readStorage(storage, 'scrapbook-volume'));
    const initialVolume = Number.isFinite(storedVolume)
      ? Math.max(0, Math.min(1, storedVolume))
      : undefined;
    const audioSource = audio && (audio.currentSrc || audio.src || audio.getAttribute?.('src'));
    let state = createInitialState({
      tracks: audioSource ? [{ src: audioSource }] : [],
      volume: initialVolume,
      visitorStatus: panel.dataset?.visitorStatus,
      commentsStatus: panel.dataset?.commentsStatus
    });
    const listeners = [];

    const announce = message => {
      if (liveRegion) liveRegion.textContent = message;
    };

    const render = () => {
      panel.hidden = !state.open;
      dock.setAttribute('aria-expanded', String(state.open));
      audioButton?.setAttribute('aria-pressed', String(state.playing));
      if (audioButton) {
        audioButton.disabled = state.musicStatus !== 'ready';
        audioButton.textContent = state.musicStatus === 'missing'
          ? '音乐暂未放入'
          : state.playing ? '暂停' : '播放';
      }
      if (audio) audio.volume = state.volume;
      if (volumeInput) volumeInput.value = String(state.volume);
    };

    const dispatch = event => {
      state = reduceSpaceState(state, event);
      render();
    };

    const on = (target, type, listener) => {
      if (!target?.addEventListener) return;
      target.addEventListener(type, listener);
      listeners.push(() => target.removeEventListener?.(type, listener));
    };

    const closePanel = () => {
      dispatch({ type: 'CLOSE_PANEL' });
      dock.focus?.();
    };

    const storedTheme = readStorage(storage, 'scrapbook-theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      document.documentElement.dataset.theme = storedTheme;
    }
    const currentTheme = () => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    themeButton?.setAttribute('aria-pressed', String(currentTheme() === 'dark'));

    on(dock, 'click', () => {
      dispatch({ type: state.open ? 'CLOSE_PANEL' : 'OPEN_PANEL' });
    });
    on(closeButton, 'click', closePanel);
    on(document, 'keydown', event => {
      if (event.key === 'Escape' && state.open) closePanel();
    });
    on(audioButton, 'click', () => {
      if (state.musicStatus !== 'ready' || !audio) return;
      if (state.playing) {
        audio.pause();
        dispatch({ type: 'PAUSE' });
        announce('音乐已暂停');
        return;
      }

      dispatch({ type: 'PLAY' });
      try {
        const playResult = audio.play();
        if (playResult?.catch) {
          playResult.catch(() => {
            dispatch({ type: 'PAUSE' });
            announce('音乐无法播放');
          });
        }
        announce('音乐正在播放');
      } catch {
        dispatch({ type: 'PAUSE' });
        announce('音乐无法播放');
      }
    });
    on(audio, 'ended', () => {
      dispatch({ type: 'PAUSE' });
      announce('音乐播放结束');
    });
    on(volumeInput, 'input', event => {
      const volume = Number.parseFloat(event.target.value);
      if (!Number.isFinite(volume)) return;
      dispatch({ type: 'SET_VOLUME', value: volume });
      writeStorage(storage, 'scrapbook-volume', String(state.volume));
      announce(`音量 ${Math.round(state.volume * 100)}%`);
    });
    on(themeButton, 'click', () => {
      const theme = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      themeButton.setAttribute('aria-pressed', String(theme === 'dark'));
      writeStorage(storage, 'scrapbook-theme', theme);
      announce(theme === 'dark' ? '已切换为深色主题' : '已切换为浅色主题');
    });
    on(scrollTopButton, 'click', () => {
      const reducedMotion = document.defaultView
        ?.matchMedia?.('(prefers-reduced-motion: reduce)')
        ?.matches;
      document.defaultView?.scrollTo?.({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    });

    render();
    announce(state.musicStatus === 'missing' ? '音乐暂未放入' : '音乐已就绪');

    let destroyed = false;
    const controller = {
      getState: () => ({ ...state }),
      destroy() {
        if (destroyed) return;
        destroyed = true;
        listeners.splice(0).forEach(remove => remove());
        if (mountedDocuments.get(document) === controller) {
          mountedDocuments.delete(document);
        }
      }
    };
    mountedDocuments.set(document, controller);
    return controller;
  }

  return {
    createInitialState,
    reduceSpaceState,
    shouldMountArticleTools,
    mountArticleTools,
    mountSpaceTools
  };
}));
