import { expect, test, type Locator, type Page } from '@playwright/test';

const createMockKlines = () => {
  const start = Date.UTC(2026, 0, 1, 0, 0, 0);

  return Array.from({ length: 180 }, (_unused, index) => {
    const open = 100 + Math.sin(index / 8) * 6 + index * 0.08;
    const close = open + Math.cos(index / 5) * 2;
    const high = Math.max(open, close) + 1.25;
    const low = Math.min(open, close) - 1.1;
    const volume = 15_000 + index * 35;

    return [
      start + index * 60_000,
      open.toFixed(2),
      high.toFixed(2),
      low.toFixed(2),
      close.toFixed(2),
      volume.toFixed(2),
    ];
  });
};

const installMarketMocks = async (page: Page) => {
  await page.addInitScript(() => {
    class MockWebSocket {
      static readonly CONNECTING = 0;
      static readonly OPEN = 1;
      static readonly CLOSING = 2;
      static readonly CLOSED = 3;

      readyState = MockWebSocket.CONNECTING;
      onclose: ((event: Event) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onopen: ((event: Event) => void) | null = null;

      constructor(readonly url: string) {
        window.setTimeout(() => {
          this.readyState = MockWebSocket.OPEN;
          this.onopen?.(new Event('open'));
        }, 0);
      }

      addEventListener() {}

      close() {
        this.readyState = MockWebSocket.CLOSED;
        this.onclose?.(new Event('close'));
      }

      removeEventListener() {}

      send() {}
    }

    Object.assign(window, { WebSocket: MockWebSocket });
  });

  await page.route('**/api/binance**', async (route) => {
    await route.fulfill({
      body: JSON.stringify(createMockKlines()),
      contentType: 'application/json',
      status: 200,
    });
  });

  await page.route('https://www.googletagmanager.com/gtag/js**', async (route) => {
    await route.fulfill({
      body: '',
      contentType: 'application/javascript',
      status: 200,
    });
  });
};

const openApp = async (page: Page) => {
  await installMarketMocks(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactAccessibleName = (value: string) => new RegExp(`^${escapeRegExp(value)}$`);

interface IndicatorSettingsAuditItem {
  menuName?: string;
  settingsName: string;
  expectedLabels: readonly string[];
  defaultActive?: boolean;
}

const setColorInputValue = async (locator: Locator, value: string) => {
  await locator.evaluate((input, nextValue) => {
    const colorInput = input as HTMLInputElement;
    colorInput.value = nextValue;
    colorInput.dispatchEvent(new Event('input', { bubbles: true }));
    colorInput.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
};

const settingControlByLabel = (settings: Locator, label: string) =>
  settings
    .locator('label', { hasText: label })
    .locator('input, select')
    .first();

const INDICATOR_SETTINGS_AUDIT: readonly IndicatorSettingsAuditItem[] = [
  {
    settingsName: 'Volume',
    expectedLabels: ['Up color', 'Down color'],
    defaultActive: true,
  },
  {
    settingsName: 'Moving Average',
    expectedLabels: ['Color', 'Length', 'Source'],
    defaultActive: true,
  },
  {
    menuName: 'Moving Average 200 Long simple moving average SMA',
    settingsName: 'Moving Average 200',
    expectedLabels: ['Color', 'Length', 'Source'],
  },
  {
    menuName: 'Exponential Moving Average Fast exponential moving average EMA',
    settingsName: 'Exponential Moving Average',
    expectedLabels: ['Color', 'Length', 'Source'],
  },
  {
    menuName: 'EMA 20 Exponential moving average EMA',
    settingsName: 'EMA 20',
    expectedLabels: ['Color', 'Length', 'Source'],
  },
  {
    menuName: 'Bollinger Bands SMA envelope with standard deviation bands BB',
    settingsName: 'Bollinger Bands',
    expectedLabels: ['Basis color', 'Upper color', 'Lower color', 'Fill color', 'Length', 'Source', 'Std dev'],
  },
  {
    menuName: 'VWAP Session Session volume weighted average price VWAP',
    settingsName: 'VWAP Session',
    expectedLabels: ['Color', 'Source'],
  },
  {
    menuName: 'Donchian Channels High and low price channels DC',
    settingsName: 'Donchian Channels',
    expectedLabels: ['Upper color', 'Lower color', 'Basis color', 'Length'],
  },
  {
    menuName: 'Weighted Moving Average Weighted moving average WMA',
    settingsName: 'Weighted Moving Average',
    expectedLabels: ['Color', 'Length', 'Source'],
  },
  {
    menuName: 'Relative Strength Index Momentum oscillator RSI',
    settingsName: 'Relative Strength Index',
    expectedLabels: ['Color', 'Length', 'Source'],
  },
  {
    menuName: 'MACD Moving average convergence divergence MACD',
    settingsName: 'MACD',
    expectedLabels: [
      'MACD color',
      'Signal color',
      'Histogram positive',
      'Histogram negative',
      'Source',
      'Fast length',
      'Slow length',
      'Signal smoothing',
      'Oscillator MA type',
      'Signal line MA type',
    ],
  },
  {
    menuName: 'Stochastic Stochastic oscillator Stoch',
    settingsName: 'Stochastic',
    expectedLabels: ['%K color', '%D color', 'Length', 'Signal'],
  },
  {
    menuName: 'Momentum Close price momentum Mom',
    settingsName: 'Momentum',
    expectedLabels: ['Color', 'Length', 'Source'],
  },
  {
    menuName: 'Rate Of Change Percent rate of change ROC',
    settingsName: 'Rate Of Change',
    expectedLabels: ['Color', 'Length', 'Source'],
  },
  {
    menuName: 'Accumulation/Distribution Volume accumulation distribution line A/D',
    settingsName: 'Accumulation/Distribution',
    expectedLabels: ['Color'],
  },
  {
    menuName: 'Average True Range Average true range volatility ATR',
    settingsName: 'Average True Range',
    expectedLabels: ['Color', 'Length'],
  },
  {
    menuName: 'Bollinger Bands %b Close position inside Bollinger Bands BB %b',
    settingsName: 'Bollinger Bands %b',
    expectedLabels: ['Color', 'Length', 'Source', 'Std dev'],
  },
  {
    menuName: 'Bollinger BandWidth Relative Bollinger Band width BBW',
    settingsName: 'Bollinger BandWidth',
    expectedLabels: ['Color', 'Length', 'Source', 'Std dev'],
  },
];

const addAllMissingAuditIndicators = async (page: Page) => {
  await page.getByRole('button', { name: 'Indicators, 2 active' }).click();
  const indicatorsMenu = page.locator('#indicators-menu');
  await expect(indicatorsMenu).toBeVisible();

  for (const indicator of INDICATOR_SETTINGS_AUDIT) {
    if (indicator.defaultActive || !indicator.menuName) continue;

    await indicatorsMenu.getByRole('menuitemcheckbox', { name: indicator.menuName }).click();
  }

  await expect(page.getByRole('button', { name: 'Indicators, 18 active' })).toBeVisible();
  await page.keyboard.press('Escape');
};

test.describe('signed-out chart access', () => {
  test('renders the Google Analytics page tag', async ({ page }) => {
    await openApp(page);

    await expect
      .poll(async () =>
        page.evaluate(() =>
          Boolean(
            document.querySelector('script[src="https://www.googletagmanager.com/gtag/js?id=G-HW6ZYLMS7C"]') &&
              document.querySelector('script#google-analytics')
          )
        )
      )
      .toBe(true);

    const analyticsState = await page.evaluate(() => {
      const gtagScript = document.querySelector<HTMLScriptElement>(
        'script[src="https://www.googletagmanager.com/gtag/js?id=G-HW6ZYLMS7C"]'
      );
      const initScript = document.querySelector<HTMLScriptElement>('script#google-analytics');
      const analyticsWindow = window as Window & {
        dataLayer?: unknown[];
        gtag?: unknown;
      };

      return {
        gtagScriptStrategy: gtagScript?.dataset.nscript,
        initScriptStrategy: initScript?.dataset.nscript,
        initScriptText: initScript?.textContent ?? '',
        dataLayerEvents: analyticsWindow.dataLayer?.length ?? 0,
        hasGtagFunction: typeof analyticsWindow.gtag === 'function',
      };
    });

    expect(analyticsState.gtagScriptStrategy).toBe('afterInteractive');
    expect(analyticsState.initScriptStrategy).toBe('afterInteractive');
    expect(analyticsState.initScriptText).toContain("gtag('config', 'G-HW6ZYLMS7C')");
    expect(analyticsState.dataLayerEvents).toBeGreaterThanOrEqual(2);
    expect(analyticsState.hasGtagFunction).toBe(true);
  });

  test('shows signup/login entry points and keeps account tools gated', async ({ page }) => {
    await openApp(page);

    const header = page.locator('.top-command-bar');
    await expect(header.getByRole('button', { name: 'Symbol search' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Timeframe' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Chart type' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Indicators, 2 active' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Sign up' })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Trade' })).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Share your idea with the trade community' })).toHaveCount(0);
    await expect(header.getByRole('button', { name: 'Save all charts for all symbols and intervals on your layout' })).toHaveCount(0);

    await header.getByRole('button', { name: 'Sign up' }).click();
    const signupDialog = page.getByRole('dialog', { name: 'Sign up' });
    await expect(signupDialog).toBeVisible();
    await expect(signupDialog.getByText('Create your account')).toBeVisible();
    await expect(signupDialog.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(signupDialog.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
    await expect(signupDialog.getByText('Secure password standard')).toBeVisible();
    await expect(signupDialog.getByRole('button', { name: 'Generate secure password' })).toBeVisible();
    await expect(signupDialog.getByLabel('Name')).toHaveAttribute('placeholder', 'Jordan Lee');
    const signupPasswordInput = signupDialog.locator('#auth-password-input');
    await expect(signupDialog.locator('.auth-provider-button.google .auth-provider-icon')).toHaveAttribute(
      'src',
      '/auth/google.svg'
    );
    await expect(signupDialog.locator('.auth-provider-button.github .auth-provider-icon')).toHaveAttribute(
      'src',
      '/auth/github.svg'
    );
    await expect(signupDialog.getByText('Accounts are not connected on this deployment yet.')).toBeVisible();

    await signupDialog.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(signupDialog.getByText('Accounts are not connected on this deployment yet.')).toBeVisible();

    await signupDialog.getByRole('button', { name: 'Continue with GitHub' }).click();
    await expect(signupDialog.getByText('Accounts are not connected on this deployment yet.')).toBeVisible();

    await signupDialog.getByLabel('Name').fill('Chart Tester');
    await signupDialog.getByLabel('Email').fill('chart-tester@example.com');
    await signupPasswordInput.fill('testing-password');
    await signupDialog.getByRole('button', { name: 'Sign up' }).click();
    await expect(signupDialog.getByText('Secure password missing:')).toBeVisible();
    await expect(
      signupDialog.locator('.auth-password-requirements li.missing', { hasText: 'Use at least 3 character types' })
    ).toBeVisible();

    await signupDialog.getByRole('button', { name: 'Show password' }).click();
    await expect(signupPasswordInput).toHaveAttribute('type', 'text');
    await signupDialog.getByRole('button', { name: 'Hide password' }).click();
    await expect(signupPasswordInput).toHaveAttribute('type', 'password');

    await signupDialog.getByRole('button', { name: 'Generate secure password' }).click();
    await expect(signupPasswordInput).toHaveAttribute('type', 'text');
    const generatedPassword = await signupPasswordInput.inputValue();
    expect(generatedPassword.length).toBeGreaterThanOrEqual(15);
    await expect(signupDialog.locator('.auth-password-requirements li.missing')).toHaveCount(0);

    await signupDialog.getByRole('button', { name: 'Sign up' }).click();
    await expect(signupDialog.getByText('Accounts are not connected on this deployment yet.')).toBeVisible();

    await signupDialog.getByRole('button', { name: 'Log in instead' }).click();
    const loginDialog = page.getByRole('dialog', { name: 'Log in' });
    await expect(loginDialog).toBeVisible();
    await expect(loginDialog.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(loginDialog.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
    await expect(loginDialog.getByRole('button', { name: 'Create account' })).toBeVisible();
    const loginPasswordInput = loginDialog.locator('#auth-password-input');
    await loginPasswordInput.fill('old-password');
    await loginDialog.getByRole('button', { name: 'Show password' }).click();
    await expect(loginPasswordInput).toHaveAttribute('type', 'text');
    await loginDialog.getByRole('button', { name: 'Close menu' }).click();
    await expect(header.getByRole('button', { name: 'Sign up' })).toBeVisible();
  });

  test('allows signed-out users to change symbols, chart type, and indicators', async ({ page }) => {
    await openApp(page);

    await page.getByRole('button', { name: 'Symbol search' }).click();
    await page.getByLabel('Search symbols').fill('SOL');
    await page.locator('.symbol-search-result', { hasText: 'SOLUSDT' }).click();
    await expect(page.getByRole('button', { name: 'Symbol search' })).toContainText('SOLUSDT');

    await page.getByRole('button', { name: 'Chart type' }).click();
    await page.getByRole('menuitemradio', { name: 'Line Close price line' }).click();
    await page.getByRole('button', { name: 'Chart type' }).click();
    await expect(page.getByRole('menuitemradio', { name: 'Line Close price line' })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Indicators, 2 active' }).click();
    const indicatorsMenu = page.locator('#indicators-menu');
    await expect(indicatorsMenu).toBeVisible();
    await expect(indicatorsMenu.getByRole('menuitemcheckbox', { name: 'Moving Average Simple moving' })).toBeVisible();
    await expect(
      indicatorsMenu.getByRole('menuitemcheckbox', { name: 'Relative Strength Index Momentum oscillator RSI' })
    ).toBeVisible();
    await indicatorsMenu.getByRole('menuitemcheckbox', { name: 'Relative Strength Index Momentum oscillator RSI' }).click();
    await expect(page.getByRole('button', { name: 'Indicators, 3 active' })).toBeVisible();
  });

  test('adds every built-in indicator and exposes its configurable settings', async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1440, height: 1200 });
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await openApp(page);

    await addAllMissingAuditIndicators(page);

    for (const indicator of INDICATOR_SETTINGS_AUDIT) {
      const row = page.locator('.indicator-legend-row').filter({
        has: page.getByRole('button', {
          name: exactAccessibleName(`Settings for ${indicator.settingsName}`),
        }),
      });

      await expect(row.first(), `${indicator.settingsName} row should render`).toBeVisible();
      const settingsButton = row
        .first()
        .getByRole('button', { name: exactAccessibleName(`Settings for ${indicator.settingsName}`) });
      await settingsButton.focus();
      await expect(settingsButton).toBeVisible();
      await settingsButton.press('Enter');

      const settings = page.getByRole('group', {
        name: exactAccessibleName(`${indicator.settingsName} settings`),
      });
      await expect(settings, `${indicator.settingsName} settings should open`).toBeVisible();

      for (const label of indicator.expectedLabels) {
        await expect(
          settingControlByLabel(settings, label),
          `${indicator.settingsName} should expose ${label}`
        ).toBeVisible();
      }

      await settingsButton.press('Enter');
    }

    const canvasState = await page.locator('canvas').first().evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext('2d');
      if (!context || canvas.width === 0 || canvas.height === 0) return { width: canvas.width, height: canvas.height, nonBlank: 0 };

      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      let nonBlank = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] !== 0 || data[index + 1] !== 0 || data[index + 2] !== 0 || data[index + 3] !== 0) {
          nonBlank += 1;
        }
      }

      return { width: canvas.width, height: canvas.height, nonBlank };
    });

    expect(canvasState.width).toBeGreaterThan(0);
    expect(canvasState.height).toBeGreaterThan(0);
    expect(canvasState.nonBlank).toBeGreaterThan(0);
    expect(pageErrors).toEqual([]);
  });

  test('shows hover actions and TradingView-style settings for lower-pane MACD', async ({ page }) => {
    await openApp(page);

    await page.getByRole('button', { name: 'Indicators, 2 active' }).click();
    const indicatorsMenu = page.locator('#indicators-menu');
    await indicatorsMenu.getByRole('menuitemcheckbox', { name: 'Relative Strength Index Momentum oscillator RSI' }).click();
    await indicatorsMenu.getByRole('menuitemcheckbox', { name: 'MACD Moving average convergence divergence MACD' }).click();
    await expect(page.getByRole('button', { name: 'Indicators, 4 active' })).toBeVisible();
    await page.keyboard.press('Escape');

    const oscillatorRows = page.locator('.indicator-legend-overlay[data-visual-pane="oscillator"] .indicator-legend-row');
    await expect(oscillatorRows).toHaveCount(2);
    await expect(oscillatorRows.nth(0)).toContainText('RSI');
    await expect(oscillatorRows.nth(1)).toContainText('MACD');

    let macdRow = oscillatorRows.filter({
      hasText: 'MACD',
    });
    await expect(macdRow).toBeVisible();
    await macdRow.hover();
    await expect(macdRow.getByRole('button', { name: 'Settings for MACD' })).toBeVisible();
    await expect(macdRow.getByRole('button', { name: 'Hide MACD' })).toBeVisible();
    await expect(macdRow.getByRole('button', { name: 'Remove MACD' })).toBeVisible();

    await macdRow.getByRole('button', { name: 'More actions for MACD' }).click();
    let macdActions = page.getByRole('menu', { name: 'MACD actions' });
    await expect(macdActions.getByRole('menuitem', { name: 'Move down' })).toBeDisabled();
    await macdActions.getByRole('menuitem', { name: 'Move up' }).click();
    await expect(oscillatorRows.nth(0)).toContainText('MACD');
    await expect(oscillatorRows.nth(1)).toContainText('RSI');

    macdRow = oscillatorRows.filter({ hasText: 'MACD' });
    await macdRow.hover();
    await macdRow.getByRole('button', { name: 'More actions for MACD' }).click();
    macdActions = page.getByRole('menu', { name: 'MACD actions' });
    await expect(macdActions.getByRole('menuitem', { name: 'Move up' })).toBeDisabled();
    await macdActions.getByRole('menuitem', { name: 'Move down' }).click();
    await expect(oscillatorRows.nth(0)).toContainText('RSI');
    await expect(oscillatorRows.nth(1)).toContainText('MACD');

    macdRow = oscillatorRows.filter({ hasText: 'MACD' });
    await macdRow.hover();
    await macdRow.getByRole('button', { name: 'Settings for MACD' }).click();
    const settings = page.getByRole('group', { name: 'MACD settings' });
    await expect(settings.getByLabel('Source')).toHaveValue('close');
    await expect(settings.getByLabel('Fast length')).toHaveValue('12');
    await expect(settings.getByLabel('Slow length')).toHaveValue('26');
    await expect(settings.getByLabel('Signal smoothing')).toHaveValue('9');
    await expect(settings.getByLabel('Oscillator MA type')).toHaveValue('EMA');
    await expect(settings.getByLabel('Signal line MA type')).toHaveValue('EMA');
    await expect(settings.getByLabel('Histogram positive')).toHaveValue('#26a69a');
    await expect(settings.getByLabel('Histogram negative')).toHaveValue('#ef5350');

    await settings.getByLabel('Oscillator MA type').selectOption('SMA');
    await settings.getByLabel('Signal line MA type').selectOption('SMA');
    await setColorInputValue(settings.getByLabel('Histogram positive'), '#123456');
    await setColorInputValue(settings.getByLabel('Histogram negative'), '#654321');
    await expect(settings.getByLabel('Oscillator MA type')).toHaveValue('SMA');
    await expect(settings.getByLabel('Signal line MA type')).toHaveValue('SMA');
    await expect(settings.getByLabel('Histogram positive')).toHaveValue('#123456');
    await expect(settings.getByLabel('Histogram negative')).toHaveValue('#654321');
  });

  test('keeps signed-out auth buttons inside the mobile header', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openApp(page);

    const layoutState = await page.evaluate(() => {
      const topbar = document.querySelector('.chart-topbar')?.getBoundingClientRect();
      const authCluster = document.querySelector('.signed-out-auth-cluster')?.getBoundingClientRect();

      return {
        authInsideTopbar: Boolean(
          topbar &&
            authCluster &&
            authCluster.top >= topbar.top &&
            authCluster.bottom <= topbar.bottom
        ),
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      };
    });

    await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
    expect(layoutState).toEqual({
      authInsideTopbar: true,
      hasHorizontalOverflow: false,
    });
  });
});
