const assert = require('node:assert/strict');
const { existsSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const baseUrl = (process.env.SCRAPBOOK_BASE_URL || 'http://127.0.0.1:44120').replace(/\/$/, '');
const evidenceDir = join(__dirname, '../docs/qa/screenshots');
const viewports = [
  { width: 1440, height: 900 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
  { width: 320, height: 568 }
];

mkdirSync(evidenceDir, { recursive: true });

const seconds = value => Number.parseFloat(value) || 0;
const screenshotPath = name => join(evidenceDir, name);

async function openHome(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1024, height: 768 }
  });
  const page = await context.newPage();
  if (options.reducedMotion) {
    await page.emulateMedia({ reducedMotion: options.reducedMotion });
  }
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  return { context, page };
}

async function keyboardQa(browser) {
  const { context, page } = await openHome(browser);
  const result = { focusTrace: [] };
  const describeFocus = async (event, target = null) => {
    const entry = await page.evaluate(({ eventName, targetSelector }) => {
      const element = document.activeElement;
      const tag = element?.tagName?.toLowerCase() || null;
      const implicitRole = tag === 'a' && element.hasAttribute('href')
        ? 'link'
        : tag === 'button'
          ? 'button'
          : tag === 'input' && element.type === 'search'
            ? 'searchbox'
            : tag === 'input'
              ? 'input'
              : null;
      const text = (element?.getAttribute?.('aria-label') || element?.textContent || element?.value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 160);
      return {
        event: eventName,
        path: location.pathname,
        tag,
        role: element?.getAttribute?.('role') || implicitRole,
        ariaLabel: element?.getAttribute?.('aria-label'),
        text,
        href: element?.getAttribute?.('href'),
        id: element?.id || null,
        dataControl: [
          'search-open',
          'search-input',
          'space-dock',
          'audio-toggle',
          'theme-toggle',
          'scroll-top',
          'space-close'
        ].find(name => element?.hasAttribute?.(`data-${name}`)) || null,
        disabled: Boolean(element?.disabled),
        focusVisible: Boolean(element?.matches?.(':focus-visible')),
        matchesTarget: targetSelector ? Boolean(element?.matches?.(targetSelector)) : null
      };
    }, { eventName: event, targetSelector: target });
    result.focusTrace.push(entry);
    return entry;
  };
  const tabUntil = async (selector, { shift = false, max = 80, label = selector } = {}) => {
    for (let index = 1; index <= max; index += 1) {
      await page.keyboard.press(shift ? 'Shift+Tab' : 'Tab');
      const entry = await describeFocus(`${shift ? 'Shift+Tab' : 'Tab'} ${label} ${index}`, selector);
      if (entry.matchesTarget) return entry;
    }
    throw new Error(`Keyboard traversal did not reach ${label}`);
  };

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(650);
  const initial = await describeFocus('reload start');
  assert.equal(initial.tag, 'body');

  const skip = await tabUntil('.skip-link', { label: 'skip link' });
  assert.equal(skip.role, 'link');
  result.skipFocusedFirst = result.focusTrace.filter(entry => entry.event.startsWith('Tab')).length === 1;
  assert.equal(result.skipFocusedFirst, true);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => location.hash === '#main');
  const afterSkip = await describeFocus('Enter skip link');
  result.skipTarget = await page.evaluate(() => location.hash);

  await tabUntil('[data-search-open]', {
    shift: afterSkip.id === 'main',
    label: 'search button'
  });
  await page.keyboard.press('Enter');
  const searchOpened = await describeFocus('Enter search button', '[data-search-input]');
  assert.equal(searchOpened.matchesTarget, true);
  assert.equal(await page.locator('[data-search-panel]').isVisible(), true);
  result.searchOpenedWithEnter = true;
  await page.keyboard.press('Escape');
  const searchEscaped = await describeFocus('Escape search panel', '[data-search-open]');
  assert.equal(searchEscaped.matchesTarget, true);
  assert.equal(await page.locator('[data-search-panel]').isHidden(), true);
  result.searchEscapeReturnedFocus = true;

  await tabUntil('a[href="/categories/Maya/"]', { label: 'Maya ready category' });
  await Promise.all([
    page.waitForURL('**/categories/Maya/', { waitUntil: 'domcontentloaded' }),
    page.keyboard.press('Enter')
  ]);
  await describeFocus('Enter Maya ready category');
  result.categoryEnterPath = new URL(page.url()).pathname;

  await tabUntil('a[href="/"]', { label: 'category page home link' });
  await Promise.all([
    page.waitForURL(url => url.pathname === '/', { waitUntil: 'domcontentloaded' }),
    page.keyboard.press('Enter')
  ]);
  await page.waitForTimeout(650);
  await describeFocus('Enter category page home link');

  await tabUntil('[data-space-dock]', { label: 'space dock' });
  await page.keyboard.press('Space');
  const toolboxOpened = await describeFocus('Space space dock', '[data-space-dock]');
  assert.equal(toolboxOpened.matchesTarget, true);
  assert.equal(await page.locator('[data-space-panel]').isVisible(), true);
  assert.equal(await page.locator('[data-space-dock]').getAttribute('aria-expanded'), 'true');
  result.toolboxOpenedWithSpace = true;

  const readAudioState = () => page.evaluate(() => {
    const audio = document.querySelector('[data-audio]');
    return {
      exists: Boolean(audio),
      paused: audio?.paused ?? true,
      autoplay: audio?.hasAttribute('autoplay') ?? false
    };
  });
  const audioBefore = await readAudioState();
  assert.equal(await page.locator('[data-audio-toggle]').isDisabled(), true);
  const panelTraceStart = result.focusTrace.length;
  await tabUntil('[data-theme-toggle]', { label: 'theme button' });
  const panelTabTrace = result.focusTrace.slice(panelTraceStart);
  const disabledMusicSkipped = panelTabTrace.every(entry => entry.dataControl !== 'audio-toggle');
  assert.equal(disabledMusicSkipped, true);
  const audioAfter = await readAudioState();
  assert.deepEqual(audioAfter, audioBefore);
  result.missingMusicKeyboardAttempt = { disabled: true, disabledMusicSkipped, ...audioAfter };

  const themeBefore = await page.locator('html').getAttribute('data-theme');
  await page.keyboard.press('Enter');
  await describeFocus('Enter theme button', '[data-theme-toggle]');
  const themeAfter = await page.locator('html').getAttribute('data-theme');
  assert.notEqual(themeAfter, themeBefore);
  result.themeChangedWithEnter = { before: themeBefore, after: themeAfter };

  await tabUntil('[data-scroll-top]', { label: 'return top button' });
  let scrollBefore = await page.evaluate(() => scrollY);
  if (scrollBefore === 0) {
    await page.keyboard.press('End');
    await page.waitForTimeout(150);
    scrollBefore = await page.evaluate(() => scrollY);
    await describeFocus('End before return top');
  }
  assert.ok(scrollBefore > 0);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => scrollY === 0);
  await describeFocus('Enter return top button', '[data-scroll-top]');
  result.returnTopWithEnter = { before: scrollBefore, after: await page.evaluate(() => scrollY) };

  await page.keyboard.press('Escape');
  const toolboxEscaped = await describeFocus('Escape space panel', '[data-space-dock]');
  assert.equal(toolboxEscaped.matchesTarget, true);
  assert.equal(await page.locator('[data-space-panel]').isHidden(), true);
  const dockFocus = await page.locator('[data-space-dock]').evaluate(element => {
    const style = getComputedStyle(element);
    return {
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });
  assert.equal(dockFocus.focusVisible, true);
  assert.notEqual(dockFocus.outlineStyle, 'none');
  result.toolboxEscapeReturnedFocus = dockFocus;
  result.focusOrder = result.focusTrace
    .filter(entry => entry.event.startsWith('Tab') || entry.event.startsWith('Shift+Tab'))
    .map(({ event, path, tag, role, ariaLabel, text, href, dataControl, disabled, focusVisible }) => ({
      event,
      path,
      tag,
      role,
      ariaLabel,
      text,
      href,
      dataControl,
      disabled,
      focusVisible
    }));

  await context.close();
  return result;
}

async function viewportQa(browser, viewport) {
  const { context, page } = await openHome(browser, { viewport });
  const filename = `home-${viewport.width}x${viewport.height}.png`;
  await page.screenshot({ path: screenshotPath(filename) });

  const home = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.scrapbook-grid > section')];
    const headings = [...document.querySelectorAll(
      '.profile-polaroid h2,.scrapbook-post-notes h2,.scrapbook-project-photos h2'
    )];
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      tapeClear: headings.every(heading => {
        const headingRect = heading.getBoundingClientRect();
        const cardRect = heading.closest('section').getBoundingClientRect();
        return headingRect.top - cardRect.top > 18;
      }),
      domOrder: cards.map(card => card.querySelector('h2')?.textContent.trim()),
      readyTickets: [...document.querySelectorAll('.scrapbook-category-ticket--ready')].map(ticket => ({
        href: ticket.querySelector('a')?.getAttribute('href'),
        height: Math.round(ticket.getBoundingClientRect().height)
      })),
      learningHasLinks: [...document.querySelectorAll('.scrapbook-category-ticket--learning')]
        .some(ticket => ticket.querySelector('a')),
      autoplayCount: document.querySelectorAll('[autoplay]').length
    };
  });

  assert.equal(home.overflow, 0);
  assert.equal(home.tapeClear, true);
  assert.equal(home.learningHasLinks, false);
  assert.equal(home.autoplayCount, 0);
  assert.ok(home.readyTickets.every(ticket => ticket.href && ticket.height >= 44));
  if (viewport.width <= 390) {
    assert.deepEqual(home.domOrder, ['最新笔记', '学习分类', '精选项目', '个人档案']);
  }

  await page.goto(`${baseUrl}/2026/07/24/ue-submit-render-farm/#背景与痛点`, {
    waitUntil: 'domcontentloaded'
  });
  const closedOverlap = await page.evaluate(() => {
    const tool = document.querySelector('[data-space-dock]').getBoundingClientRect();
    return [...document.querySelectorAll('article.md-text.content p,article.md-text.content li,article.md-text.content h2')]
      .filter(element => [...element.getClientRects()].some(rect => (
        rect.left < tool.right && rect.right > tool.left && rect.top < tool.bottom && rect.bottom > tool.top
      ))).length;
  });
  assert.equal(closedOverlap, 0);

  await page.getByRole('button', { name: '打开文章工具盒' }).click();
  const opened = await page.evaluate(() => {
    const panel = document.querySelector('[data-space-panel]');
    const rect = panel.getBoundingClientRect();
    const overlap = [...document.querySelectorAll(
      'article.md-text.content p,article.md-text.content li,article.md-text.content h2'
    )].filter(element => [...element.getClientRects()].some(line => (
      line.left < rect.right && line.right > rect.left && line.top < rect.bottom && line.bottom > rect.top
    ))).length;
    return { hidden: panel.hidden, overlap, position: getComputedStyle(panel).position };
  });
  assert.equal(opened.hidden, false);
  assert.equal(opened.overlap, 0);

  await context.close();
  return { viewport, screenshot: filename, home, article: { closedOverlap, opened } };
}

async function stateQa(browser) {
  const result = {};

  {
    const { context, page } = await openHome(browser, { viewport: { width: 390, height: 844 } });
    await page.screenshot({ path: screenshotPath('theme-light-390x844.png') });
    result.light = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      paper: getComputedStyle(document.body).backgroundColor,
      ink: getComputedStyle(document.body).color
    }));
    assert.equal(result.light.theme, 'light');
    await context.close();
  }

  {
    const { context, page } = await openHome(browser, { viewport: { width: 390, height: 844 } });
    await page.getByRole('button', { name: '打开空间工具盒' }).click();
    await page.locator('[data-theme-toggle]').click();
    result.dark = await page.evaluate(() => ({
      theme: document.documentElement.dataset.theme,
      colorScheme: getComputedStyle(document.documentElement).colorScheme,
      paper: getComputedStyle(document.body).backgroundColor,
      ink: getComputedStyle(document.body).color
    }));
    assert.equal(result.dark.theme, 'dark');
    assert.equal(result.dark.colorScheme, 'dark');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'auto' }));
    await page.screenshot({ path: screenshotPath('theme-dark-390x844.png') });
    await context.close();
  }

  {
    const { context, page } = await openHome(browser, {
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce'
    });
    await page.locator('.scrapbook-hero').hover();
    await page.getByRole('button', { name: '搜索' }).click();
    result.reducedMotion = await page.evaluate(() => {
      const hero = getComputedStyle(document.querySelector('.scrapbook-hero'));
      const hovered = getComputedStyle(document.querySelector('.scrapbook-hero'));
      const focused = getComputedStyle(document.activeElement);
      return {
        mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        entryAnimationDuration: hero.animationDuration,
        hoverTransitionDuration: hovered.transitionDuration,
        focusTransitionDuration: focused.transitionDuration,
        scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior
      };
    });
    assert.equal(result.reducedMotion.mediaMatches, true);
    assert.ok(seconds(result.reducedMotion.entryAnimationDuration) <= 0.00001);
    assert.ok(seconds(result.reducedMotion.hoverTransitionDuration) <= 0.00001);
    assert.ok(seconds(result.reducedMotion.focusTransitionDuration) <= 0.00001);
    assert.equal(result.reducedMotion.scrollBehavior, 'auto');
    await page.screenshot({ path: screenshotPath('reduced-motion-390x844.png') });

    await page.getByRole('button', { name: '打开空间工具盒' }).click();
    await page.evaluate(() => {
      const nativeScrollTo = window.scrollTo.bind(window);
      window.__qaScrollCalls = [];
      window.scrollTo = options => {
        window.__qaScrollCalls.push(options);
        nativeScrollTo(options);
      };
    });
    await page.keyboard.press('End');
    await page.locator('[data-scroll-top]').click();
    result.reducedMotion.returnTop = await page.evaluate(() => window.__qaScrollCalls.at(-1));
    assert.equal(result.reducedMotion.returnTop.behavior, 'auto');
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.route('**/search.json', route => route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: '{"error":"qa"}'
    }));
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(650);
    await page.getByRole('button', { name: '搜索' }).click();
    await page.getByLabel('关键词').fill('Maya');
    await page.getByRole('button', { name: '查找' }).click();
    const note = page.locator('[data-search-results]');
    await assert.doesNotReject(() => note.waitFor({ state: 'visible' }));
    await page.waitForFunction(() => document.querySelector('[data-search-results]').textContent.includes('暂不可用'));
    result.searchFailure = await note.innerText();
    assert.match(result.searchFailure, /搜索索引暂不可用，请浏览技术分类/);
    await page.screenshot({ path: screenshotPath('search-failure-390x844.png') });
    await context.close();
  }

  {
    const { context, page } = await openHome(browser, { viewport: { width: 390, height: 844 } });
    await page.getByRole('button', { name: '打开空间工具盒' }).click();
    const spacePanel = page.locator('[data-space-panel]');
    assert.equal(await spacePanel.isVisible(), true, '空间工具盒应在点击后可见');
    result.disabledServices = await spacePanel.evaluate(panel => ({
      music: panel.querySelector('[data-audio-toggle]').textContent.trim(),
      musicDisabled: panel.querySelector('[data-audio-toggle]').disabled,
      visitor: panel.querySelector('[data-visitor-entry]').closest('section').textContent.trim(),
      comments: [...panel.querySelectorAll('section')].at(-1).textContent.trim(),
      autoplay: panel.querySelectorAll('[autoplay]').length
    }));
    assert.equal(result.disabledServices.musicDisabled, true);
    assert.match(result.disabledServices.music, /音乐暂未放入/);
    assert.match(result.disabledServices.visitor, /访问统计未启用/);
    assert.match(result.disabledServices.comments, /留言板暂未启用/);
    assert.equal(result.disabledServices.autoplay, 0);
    await page.waitForTimeout(850);
    await spacePanel.screenshot({ path: screenshotPath('disabled-services-390x844.png') });
    await context.close();
  }

  return result;
}

async function keyPathQa(browser) {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  const paths = [
    '/',
    '/blog/',
    '/projects/',
    '/2026/07/24/ue-submit-render-farm/',
    '/2026/07/23/maya-asset-batch-submit/'
  ];
  const result = [];
  for (const pathname of paths) {
    const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
    const evidence = await page.evaluate(() => ({
      bodyClass: document.body.className,
      layout: document.querySelector('.l_body')?.getAttribute('layout') || null,
      article: Boolean(document.querySelector('article.md-text.content')),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    result.push({ pathname, status: response.status(), ...evidence });
  }
  assert.ok(result.every(item => item.status === 200 && item.overflow === 0));
  assert.match(result[0].bodyClass, /scrapbook-home/);
  assert.ok(result.slice(-2).every(item => item.layout === 'post' && item.article));
  await context.close();
  return result;
}

if (require.main === module) {
  (async () => {
    const { chromium } = require('playwright');
    const chromiumExecutable = [
      chromium.executablePath(),
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
    ].find(existsSync);
    assert.ok(chromiumExecutable, 'No existing Chromium executable found; QA never downloads a browser');
    const browser = await chromium.launch({
      headless: true,
      executablePath: chromiumExecutable
    });
    try {
      const evidence = {
        generatedAt: new Date().toISOString(),
        baseUrl,
        browser: {
          name: 'playwright-chromium',
          version: browser.version(),
          executablePath: chromiumExecutable
        },
        keyPaths: await keyPathQa(browser),
        keyboard: await keyboardQa(browser),
        viewports: [],
        states: await stateQa(browser)
      };
      for (const viewport of viewports) {
        evidence.viewports.push(await viewportQa(browser, viewport));
      }
      writeFileSync(
        join(evidenceDir, 'qa-results.json'),
        `${JSON.stringify(evidence, null, 2)}\n`,
        'utf8'
      );
      console.log(`PASS scrapbook QA: ${evidence.viewports.length} viewports, keyboard, reduced-motion and fallbacks`);
      console.log(`PASS keyboard traversal: ${evidence.keyboard.focusOrder.length} Tab transitions / ${evidence.keyboard.focusTrace.length} total focus events`);
      console.log(`Evidence: ${evidenceDir}`);
    } finally {
      await browser.close();
    }
  })().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
}
