(function (root, factory) {
  const api = factory();

  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }

  root.ScrapbookSpace = api;
  let spaceController = null;
  let searchController = null;
  let navigationController = null;
  const mount = () => {
    let storage = null;
    try {
      storage = root.localStorage;
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    spaceController?.destroy();
    searchController?.destroy();
    navigationController?.destroy();
    api.mountArticleTools(root.document);
    navigationController = api.mountNavigation(root.document);
    spaceController = api.mountSpaceTools(root.document, storage);
    searchController = api.mountSearch(root.document);
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
  const mountedSearchDocuments = new WeakMap();
  const mountedNavigationDocuments = new WeakMap();

  function mountNavigation(document) {
    const existingController = document && mountedNavigationDocuments.get(document);
    if (existingController) return existingController;
    const toggle = document?.querySelector?.('[data-nav-toggle]');
    const menu = document?.querySelector?.('[data-nav-menu]');
    if (!toggle || !menu) return null;

    const listeners = [];
    let open = false;
    const on = (target, type, listener) => {
      target?.addEventListener?.(type, listener);
      listeners.push(() => target?.removeEventListener?.(type, listener));
    };
    const render = () => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.dataset.mobileCollapsed = String(!open);
    };
    const close = ({ restoreFocus = false } = {}) => {
      open = false;
      render();
      if (restoreFocus) toggle.focus?.();
    };
    on(toggle, 'click', () => {
      open = !open;
      render();
    });
    on(document, 'keydown', event => {
      if (event.key === 'Escape' && open) close({ restoreFocus: true });
    });
    render();

    let destroyed = false;
    const controller = {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        listeners.splice(0).forEach(remove => remove());
        if (mountedNavigationDocuments.get(document) === controller) {
          mountedNavigationDocuments.delete(document);
        }
      }
    };
    mountedNavigationDocuments.set(document, controller);
    return controller;
  }

  function filterSearchEntries(entries, query, limit = 8) {
    const needle = String(query ?? '').trim().toLocaleLowerCase();
    if (!needle || !Array.isArray(entries)) return [];

    return entries.filter(entry => {
      const title = String(entry?.title ?? '').toLocaleLowerCase();
      const content = String(entry?.content ?? '').toLocaleLowerCase();
      return title.includes(needle) || content.includes(needle);
    }).slice(0, limit);
  }

  function localSearchPath(path) {
    const value = String(path ?? '').trim().replace(/^\/+/, '');
    return `/${value}`;
  }

  function mountSearch(document, fetchImpl) {
    const existingController = document && mountedSearchDocuments.get(document);
    if (existingController) return existingController;

    const openButton = document?.querySelector?.('[data-search-open]');
    const panel = document?.querySelector?.('[data-search-panel]');
    const form = document?.querySelector?.('[data-search-form]');
    const input = document?.querySelector?.('[data-search-input]');
    const status = panel?.querySelector?.('[data-search-status]')
      || document?.querySelector?.('[data-search-status]');
    const results = document?.querySelector?.('[data-search-results]');
    const closeButton = document?.querySelector?.('[data-search-close]');
    if (!openButton || !panel || !form || !input || !status || !results || !closeButton) return null;

    const request = fetchImpl || document.defaultView?.fetch?.bind(document.defaultView);
    const listeners = [];
    let indexEntries = null;
    let indexPromise = null;
    let indexFailed = false;

    const on = (target, type, listener) => {
      if (!target?.addEventListener) return;
      target.addEventListener(type, listener);
      listeners.push(() => target.removeEventListener?.(type, listener));
    };

    const showIndexFailure = () => {
      indexFailed = true;
      status.textContent = '搜索索引暂不可用，请浏览技术分类';
      results.textContent = status.textContent;
    };

    const loadIndex = () => {
      if (indexEntries) return Promise.resolve(indexEntries);
      if (indexPromise) return indexPromise;
      if (typeof request !== 'function') {
        showIndexFailure();
        return Promise.resolve(null);
      }

      status.textContent = '正在加载搜索索引…';
      try {
        indexPromise = Promise.resolve(request('/search.json'))
          .then(response => {
            if (!response || response.ok === false || typeof response.json !== 'function') {
              throw new Error('invalid search response');
            }
            return response.json();
          })
          .then(entries => {
            if (!Array.isArray(entries)) throw new Error('invalid search index');
            indexEntries = entries;
            indexFailed = false;
            status.textContent = '输入关键词，按标题与正文查找笔记';
            results.textContent = '';
            return entries;
          })
          .catch(() => {
            showIndexFailure();
            return null;
          });
      } catch {
        showIndexFailure();
        indexPromise = Promise.resolve(null);
      }
      return indexPromise;
    };

    const renderMatches = matches => {
      results.textContent = '';
      if (!matches.length) {
        status.textContent = '没有找到匹配笔记，请调整关键词或浏览技术分类';
        results.textContent = status.textContent;
        return;
      }

      status.textContent = `找到 ${matches.length} 条结果`;

      const list = document.createElement('ol');
      matches.forEach(entry => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = localSearchPath(entry.path);
        link.textContent = String(entry.title || '未命名文章');
        item.appendChild(link);
        list.appendChild(item);
      });
      results.appendChild(list);
    };

    const closePanel = () => {
      panel.hidden = true;
      openButton.setAttribute('aria-expanded', 'false');
      openButton.focus?.();
    };

    on(openButton, 'click', () => {
      panel.hidden = false;
      openButton.setAttribute('aria-expanded', 'true');
      input.focus?.();
      loadIndex();
    });
    on(closeButton, 'click', closePanel);
    on(form, 'submit', async event => {
      event.preventDefault();
      const query = String(input.value ?? '').trim();
      if (!query) {
        if (!indexFailed) {
          status.textContent = '请输入关键词后搜索';
          results.textContent = '';
        }
        return;
      }

      const entries = indexEntries || await loadIndex();
      if (!entries) return;
      renderMatches(filterSearchEntries(entries, query));
    });
    on(document, 'keydown', event => {
      if (event.key === 'Escape' && !panel.hidden) closePanel();
    });

    let destroyed = false;
    const controller = {
      destroy() {
        if (destroyed) return;
        destroyed = true;
        listeners.splice(0).forEach(remove => remove());
        if (mountedSearchDocuments.get(document) === controller) {
          mountedSearchDocuments.delete(document);
        }
      }
    };
    mountedSearchDocuments.set(document, controller);
    return controller;
  }

  function createInitialState(config = {}) {
    const trackCount = Array.isArray(config.tracks) ? config.tracks.length : 0;
    return {
      open: false,
      playing: false,
      trackIndex: 0,
      trackCount,
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
    if (event.type === 'NEXT_TRACK' && state.trackCount > 0) {
      return { ...state, playing: false, trackIndex: (state.trackIndex + 1) % state.trackCount };
    }
    if (event.type === 'PREVIOUS_TRACK' && state.trackCount > 0) {
      return {
        ...state,
        playing: false,
        trackIndex: (state.trackIndex - 1 + state.trackCount) % state.trackCount
      };
    }
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

  function estimateReadingMinutes(value) {
    const text = String(value ?? '').replace(/\s+/g, ' ').trim();
    const cjkCount = (text.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
    const latinText = text.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ');
    const wordCount = (latinText.match(/[\p{L}\p{N}]+/gu) || []).length;
    return Math.max(1, Math.ceil((cjkCount / 350) + (wordCount / 200)));
  }

  function shouldShowScrollTop(scrollY, viewportHeight) {
    const offset = Number(scrollY) || 0;
    const height = Number(viewportHeight) || 0;
    return height > 0 && offset > height;
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

    const article = document.querySelector('article.md-text.content');
    const postMeta = document.querySelector('#post-meta');
    const toc = document.querySelector('.widgets .widget-wrapper.toc');
    const tocBody = document.querySelector('.widgets .widget-wrapper.toc .widget-body');
    let mobileToc = null;
    let readingTime = null;

    if (article && toc && tocBody?.cloneNode && main.insertBefore) {
      mobileToc = setAttributes(document.createElement('details'), {
        id: 'scrapbook-mobile-toc',
        class: 'scrapbook-mobile-toc',
        'data-mobile-toc': ''
      });
      const summary = document.createElement('summary');
      summary.textContent = '文章目录';
      mobileToc.appendChild(summary);
      mobileToc.appendChild(tocBody.cloneNode(true));
      main.insertBefore(mobileToc, article);
    }

    if (article && postMeta?.appendChild) {
      const minutes = estimateReadingMinutes(article.textContent);
      readingTime = setAttributes(document.createElement('span'), {
        class: 'text reading-time',
        'data-reading-time': ''
      });
      readingTime.textContent = `预计阅读 ${minutes} 分钟`;
      postMeta.appendChild(readingTime);
    }

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
      'data-space-status': '',
      'aria-live': 'polite'
    });

    appendChildren(section, [title, musicButton, tocButton, scrollTopButton, closeButton, liveRegion]);
    panel.appendChild(section);
    main.appendChild(dock);
    main.appendChild(panel);
    body.setAttribute('data-scrapbook-mounted', 'true');

    return { dock, panel, mobileToc, readingTime };
  }

  function mountSpaceTools(document, storage) {
    const existingController = document && mountedDocuments.get(document);
    if (existingController) return existingController;

    const dock = document?.querySelector?.('[data-space-dock]');
    const panel = document?.querySelector?.('[data-space-panel]');
    if (!dock || !panel) return null;

    const findInPanel = selector => panel.querySelector?.(selector) || document.querySelector(selector);
    const closeButton = findInPanel('[data-space-close]');
    const audio = findInPanel('[data-audio]');
    const audioButton = findInPanel('[data-audio-toggle]');
    const previousButton = findInPanel('[data-audio-previous]');
    const nextButton = findInPanel('[data-audio-next]');
    const audioTitle = findInPanel('[data-audio-title]');
    const volumeInput = findInPanel('[data-audio-volume]');
    const scrollTopButton = findInPanel('[data-scroll-top]');
    const liveRegion = findInPanel('[data-space-status]');
    const queriedThemeButtons = document.querySelectorAll?.('[data-theme-toggle]');
    const themeButtons = queriedThemeButtons?.length
      ? Array.from(queriedThemeButtons)
      : [document.querySelector('[data-theme-toggle]')].filter(Boolean);
    const trackElements = Array.from(panel.querySelectorAll?.('[data-audio-track]') || []);
    const tracks = trackElements.map(element => ({
      title: element.dataset?.trackTitle || element.textContent || '未命名曲目',
      src: element.dataset?.trackSrc || ''
    })).filter(track => track.src);
    const storedVolume = Number.parseFloat(readStorage(storage, 'scrapbook-volume'));
    const initialVolume = Number.isFinite(storedVolume)
      ? Math.max(0, Math.min(1, storedVolume))
      : undefined;
    const audioSource = audio && (audio.currentSrc || audio.src || audio.getAttribute?.('src'));
    if (!tracks.length && audioSource) tracks.push({ title: '当前曲目', src: audioSource });
    let state = createInitialState({
      tracks,
      volume: initialVolume,
      visitorStatus: panel.dataset?.visitorStatus,
      commentsStatus: panel.dataset?.commentsStatus
    });
    const listeners = [];
    let renderedTrackIndex = -1;

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
      if (previousButton) previousButton.disabled = state.trackCount < 2;
      if (nextButton) nextButton.disabled = state.trackCount < 2;
      if (audio && tracks[state.trackIndex] && renderedTrackIndex !== state.trackIndex) {
        const track = tracks[state.trackIndex];
        if (renderedTrackIndex >= 0) audio.pause?.();
        audio.src = track.src;
        audio.setAttribute?.('src', track.src);
        audio.load?.();
        if (audioTitle) audioTitle.textContent = track.title;
        renderedTrackIndex = state.trackIndex;
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
    const renderThemeButtons = () => {
      themeButtons.forEach(button => button.setAttribute('aria-pressed', String(currentTheme() === 'dark')));
    };
    renderThemeButtons();

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
    const switchTrack = type => {
      if (state.trackCount < 2) return;
      dispatch({ type });
      announce(`已切换到 ${tracks[state.trackIndex].title}`);
    };
    on(previousButton, 'click', () => switchTrack('PREVIOUS_TRACK'));
    on(nextButton, 'click', () => switchTrack('NEXT_TRACK'));
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
    themeButtons.forEach(themeButton => on(themeButton, 'click', () => {
      const theme = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = theme;
      renderThemeButtons();
      writeStorage(storage, 'scrapbook-theme', theme);
      announce(theme === 'dark' ? '已切换为深色主题' : '已切换为浅色主题');
    }));
    const updateScrollTopVisibility = () => {
      if (!scrollTopButton) return;
      scrollTopButton.hidden = !shouldShowScrollTop(
        document.defaultView?.scrollY,
        document.defaultView?.innerHeight
      );
    };
    on(document.defaultView, 'scroll', updateScrollTopVisibility);
    on(document.defaultView, 'resize', updateScrollTopVisibility);
    updateScrollTopVisibility();
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
    filterSearchEntries,
    mountNavigation,
    mountSearch,
    estimateReadingMinutes,
    shouldShowScrollTop,
    shouldMountArticleTools,
    mountArticleTools,
    mountSpaceTools
  };
}));
