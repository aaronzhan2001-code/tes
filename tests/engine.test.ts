import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advance,
  COLORS,
  createExperiment,
  END_YEAR,
  fork,
  parseExperiment,
  PRESETS,
  simulate,
} from '../src/engine.ts';

test('相同种子与政策产生可复现的 20 年结果', () => {
  const e = createExperiment();
  const a = simulate(e.branches[0], e.seed, 20);
  const b = simulate(e.branches[0], e.seed, 20);
  assert.deepEqual(a, b);
  assert.equal(a.history.length, 21);
  assert.equal(a.history.at(-1)!.year, END_YEAR);
  assert.equal(e.branches[0].history.length, 1);
});
test('历史分叉独立发展，不改写原来的政策和历史', () => {
  const e = createExperiment();
  const original = simulate(e.branches[0], e.seed, 5);
  const before = JSON.stringify(original);
  const parallel = fork(original, 2, 'parallel', '绿色城市', COLORS[1]);
  parallel.policy.green = 100;
  parallel.history[0].policy.housing = 99;
  const result = simulate(parallel, e.seed, 5);
  assert.equal(result.history.at(-1)!.year, 2047);
  assert.equal(parallel.history.length, 3);
  assert.equal(JSON.stringify(original), before);
  assert.throws(() => fork(original, 30, 'bad', '错误', COLORS[1]));
});
test('绿色方案改善环境，并体现财政取舍', () => {
  const e = createExperiment();
  const balanced = simulate(e.branches[0], e.seed, 10).history.at(-1)!;
  const green = simulate({ ...e.branches[0], policy: PRESETS[1].policy }, e.seed, 10).history.at(
    -1,
  )!;
  assert.ok(green.environment > balanced.environment);
  assert.ok(green.budget < balanced.budget);
});
test('相同年份的外部事件与政策和执行顺序无关', () => {
  const e = createExperiment();
  const a = simulate(e.branches[0], e.seed, 20);
  const b = simulate({ ...e.branches[0], policy: PRESETS[2].policy }, e.seed, 20);
  assert.ok(a.history.some((s) => s.event === '热浪来袭'));
  assert.ok(a.history.some((s) => s.event === '创新企业落地'));
  a.history.forEach((s, i) => {
    for (const event of ['热浪来袭', '创新企业落地'])
      assert.equal(s.event === event, b.history[i].event === event);
  });
});
test('极端政策与任意种子下指标保持边界，2060 年停止推演', () => {
  for (const seed of [0, 1, 2026, 4294967295])
    for (const p of [0, 100]) {
      const e = createExperiment(seed);
      const branch = simulate(
        { ...e.branches[0], policy: { transit: p, green: p, housing: p, education: p, tax: p } },
        seed,
        99,
      );
      assert.equal(branch.history.length, 21);
      for (const s of branch.history) {
        assert.ok(s.environment >= 0 && s.environment <= 100);
        assert.ok(s.happiness >= 0 && s.happiness <= 100);
        assert.ok(s.population >= 30000 && s.population <= 500000);
        assert.ok(s.budget >= -120 && s.budget <= 600);
      }
      assert.throws(() => advance(branch.history.at(-1)!, branch.policy, seed));
    }
});
test('实验可完整导出导入，后续推演保持一致', () => {
  const e = createExperiment();
  e.branches[0] = simulate(e.branches[0], e.seed, 8);
  const loaded = parseExperiment(JSON.stringify(e));
  assert.deepEqual(loaded, e);
  assert.deepEqual(
    simulate(loaded.branches[0], loaded.seed, 5),
    simulate(e.branches[0], e.seed, 5),
  );
});
test('拒绝无效、重复、超出边界或时间顺序错误的实验文件', () => {
  for (const mutate of [
    (e: any) => (e.version = 2),
    (e: any) => (e.seed = -1),
    (e: any) => (e.branches = []),
    (e: any) => (e.activeId = 'missing'),
    (e: any) => e.branches.push(e.branches[0]),
    (e: any) => (e.branches[0].policy.tax = null),
    (e: any) => (e.branches[0].policy.green = 101),
    (e: any) => (e.branches[0].color = 'url(javascript:alert(1))'),
    (e: any) => (e.branches[0].history[0].year = 2042),
    (e: any) => (e.branches[0].history[0].population = -100),
    (e: any) => (e.branches[0].history[0].environment = 120),
    (e: any) => (e.branches[0].history[0].budget = null),
  ]) {
    const e = createExperiment();
    mutate(e);
    assert.throws(() => parseExperiment(JSON.stringify(e)));
  }
  assert.throws(() => parseExperiment('not JSON'));
});
