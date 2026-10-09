import { test, expect } from '@playwright/test';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';

test('推演、历史回溯、分叉、对比与持久保存', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '把你的想象，变成一座城市。' })).toBeVisible();
  await page.getByRole('button', { name: '快进 5 年' }).click();
  await expect(page.getByRole('button', { name: '查看 2045 年' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: '查看 2042 年' }).click();
  await expect(page.getByLabel('公共交通', { exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '从这里分叉' }).click();
  await page.getByLabel('给新世界线取个名字').fill('绿色未来');
  await page.getByRole('button', { name: '创建世界线', exact: true }).click();
  await expect(page.getByLabel('公共交通', { exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '绿色乌托邦', exact: true }).click();
  await expect(page.getByLabel('绿色建设', { exact: true })).toHaveValue('85');
  await page.getByRole('button', { name: '快进 5 年' }).click();
  await page.getByRole('button', { name: '平行世界线' }).click();
  await expect(page.getByRole('row').filter({ hasText: '绿色未来' })).toBeVisible();
  await page.getByLabel('对比年份').selectOption('2045');
  const rows = page.getByRole('row');
  await expect(rows).toHaveCount(3);
  await expect(page.getByText('尚未推演')).toHaveCount(0);
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('city-lab-experiment-v1')!),
  );
  expect(saved.branches).toHaveLength(2);
  expect(saved.branches[0].history).toHaveLength(6);
  expect(saved.branches[1].history).toHaveLength(8);
  expect(errors).toEqual([]);
});

test('导出后导入恢复实验，错误文件不覆盖现有数据', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '快进 5 年' }).click();
  const before = await page.evaluate(() => localStorage.getItem('city-lab-experiment-v1'));
  await page.getByRole('button', { name: '实验文件' }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出当前实验' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('city-lab-2045.json');
  const file = await download.path();
  await page.getByLabel('导入实验文件').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":3}'),
  });
  await expect(page.getByRole('status')).toContainText('导入失败');
  expect(await page.evaluate(() => localStorage.getItem('city-lab-experiment-v1'))).toBe(before);
  await page.getByRole('button', { name: '推演下一年' }).click();
  await page.getByLabel('导入实验文件').setInputFiles(file!);
  await expect(page.getByRole('status')).toContainText('实验已导入');
  expect(await page.evaluate(() => localStorage.getItem('city-lab-experiment-v1'))).toBe(before);
});

test('推演至终点停止，重置需要明确确认', async ({ page }) => {
  await page.goto('/');
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '快进 5 年' }).click();
  await expect(page.getByRole('button', { name: '已完成 20 年实验' })).toBeDisabled();
  await expect(page.getByRole('button', { name: '快进 5 年' })).toBeDisabled();
  await page.getByRole('button', { name: '实验文件' }).click();
  await page.getByRole('button', { name: '重新开始', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '查看 2060 年' })).toBeVisible();
  await page.getByRole('button', { name: '实验文件' }).click();
  await page.getByRole('button', { name: '重新开始', exact: true }).click();
  await page.getByRole('button', { name: '确认重新开始' }).click();
  await expect(page.getByRole('button', { name: '查看 2040 年' })).toBeVisible();
  await expect(page.getByRole('button', { name: '查看 2060 年' })).toHaveCount(0);
});

test('世界线数量上限与删除后恢复创建能力', async ({ page }) => {
  await page.goto('/');
  for (let i = 1; i <= 3; i++) {
    await page.getByRole('button', { name: '从这里分叉' }).click();
    await page.getByLabel('给新世界线取个名字').fill(`方案 ${i}`);
    await page.getByRole('button', { name: '创建世界线', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: '从这里分叉' })).toBeDisabled();
  await page.getByRole('button', { name: '平行世界线' }).click();
  await page.getByRole('button', { name: '删除 方案 3' }).click();
  await expect(page.getByRole('button', { name: '创建世界线', exact: true })).toBeEnabled();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('city-lab-experiment-v1')!),
  );
  expect(saved.branches).toHaveLength(3);
  expect(saved.activeId).toBe('origin');
});

test('桌面和手机布局无横向溢出，手机导航与模态框可用', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto('/');
  await page.screenshot({ path: '/tmp/city-lab-desktop.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.sidebar')).toHaveCSS('transform', 'matrix(1, 0, 0, 1, -232, 0)');
  await page.screenshot({
    path: '/tmp/city-lab-mobile.png',
    fullPage: true,
    animations: 'disabled',
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '打开导航' }).click();
  await page.getByRole('button', { name: '模型说明', exact: true }).click();
  await expect(page.getByRole('heading', { name: '一座小城，一个可解释的系统。' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '打开导航' }).click();
  await page.getByRole('button', { name: '城市实验台', exact: true }).click();
  await page.getByRole('button', { name: '探索玩法' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '开始我的城市实验' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('键盘可调整政策，分叉弹窗聚焦输入框并支持 Escape', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('公共交通', { exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByLabel('公共交通', { exact: true })).toHaveValue('50');
  await page.getByRole('button', { name: '从这里分叉' }).click();
  await expect(page.getByLabel('给新世界线取个名字')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '从这里分叉' })).toBeFocused();
});

test('单文件发行版无需其他资源，断网后仍可推演与分叉', async ({ page, context }) => {
  const networkRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const html = await readFile(resolve('dist/index.html'), 'utf8');
  await page.route(/^https?:/, (route) => {
    if (route.request().url() === 'http://127.0.0.1:4173/') {
      return route.fulfill({ body: html, contentType: 'text/html' });
    }
    networkRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/');
  await context.setOffline(true);
  await expect(page.getByRole('heading', { name: '把你的想象，变成一座城市。' })).toBeVisible();
  await page.getByRole('button', { name: '快进 5 年' }).click();
  await page.getByRole('button', { name: '从这里分叉' }).click();
  await page.getByLabel('给新世界线取个名字').fill('离线未来');
  await page.getByRole('button', { name: '创建世界线', exact: true }).click();
  await page.getByRole('button', { name: '绿色乌托邦', exact: true }).click();
  await page.getByRole('button', { name: '推演下一年' }).click();
  await expect(page.getByRole('button', { name: '查看 2046 年' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(networkRequests).toEqual([]);
  expect(errors).toEqual([]);
});
