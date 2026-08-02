import { test, expect } from '@playwright/test';

const roomUrl = process.env.E2E_ROOM_URL;

test.describe('room observers', () => {
  test.skip(!roomUrl, 'Set E2E_ROOM_URL to a live multiplayer room for the Socket.IO scenario.');

  test('host, player and observer can share a room without leaking controls', async ({ browser }) => {

    const hostContext = await browser.newContext();
    const playerContext = await browser.newContext();
    const observerContext = await browser.newContext();

    const host = await hostContext.newPage();
    const player = await playerContext.newPage();
    const observer = await observerContext.newPage();

    await Promise.all([
      host.goto(`${roomUrl}?role=player`),
      player.goto(`${roomUrl}?role=player`),
      observer.goto(`${roomUrl}?role=observer`),
    ]);

    await expect(observer.getByText(/obserwator|spectator/i).first()).toBeVisible();
    await expect(observer.locator('button').filter({ hasText: /ruch|move|start|rozpocznij/i })).toHaveCount(0);

    await hostContext.close();
    await playerContext.close();
    await observerContext.close();
  });
});
