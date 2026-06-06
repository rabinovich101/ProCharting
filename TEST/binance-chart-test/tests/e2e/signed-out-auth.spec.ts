import { expect, test, type Page } from '@playwright/test';

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
};

const openApp = async (page: Page) => {
  await installMarketMocks(page);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Sign up' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
};

test.describe('signed-out chart access', () => {
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
