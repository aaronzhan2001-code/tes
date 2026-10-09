export type Policy = {
  transit: number;
  green: number;
  housing: number;
  education: number;
  tax: number;
};
export type Metric = 'population' | 'budget' | 'environment' | 'happiness';
export type Snapshot = {
  year: number;
  population: number;
  budget: number;
  environment: number;
  happiness: number;
  policy: Policy;
  event: string;
  note: string;
};
export type Branch = {
  id: string;
  name: string;
  color: string;
  history: Snapshot[];
  policy: Policy;
};
export type Experiment = { version: 1; seed: number; activeId: string; branches: Branch[] };

export const START_YEAR = 2040;
export const END_YEAR = 2060;
export const DEFAULT_POLICY: Policy = {
  transit: 45,
  green: 40,
  housing: 50,
  education: 40,
  tax: 35,
};
export const COLORS = ['#517365', '#8870b8', '#cc9356', '#5799b9'];
export const PRESETS: { name: string; caption: string; policy: Policy }[] = [
  { name: '均衡发展', caption: '稳步向前', policy: { ...DEFAULT_POLICY } },
  {
    name: '绿色乌托邦',
    caption: '让城市呼吸',
    policy: { transit: 80, green: 85, housing: 45, education: 50, tax: 50 },
  },
  {
    name: '人才引力场',
    caption: '投资下一代',
    policy: { transit: 50, green: 35, housing: 80, education: 85, tax: 40 },
  },
];
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const round = (n: number) => Math.round(n * 10) / 10;
function random(seed: number, year: number) {
  let n = (seed ^ Math.imul(year, 2654435761)) >>> 0;
  n ^= n << 13;
  n ^= n >>> 17;
  n ^= n << 5;
  return (n >>> 0) / 4294967296;
}
export const initialSnapshot = (): Snapshot => ({
  year: START_YEAR,
  population: 128000,
  budget: 86,
  environment: 68,
  happiness: 72,
  policy: { ...DEFAULT_POLICY },
  event: '一座城市，无限可能',
  note: '从同一个起点，探索不同的未来。',
});
export function createExperiment(seed = 2026): Experiment {
  return {
    version: 1,
    seed,
    activeId: 'origin',
    branches: [
      {
        id: 'origin',
        name: '初始世界线',
        color: COLORS[0],
        history: [initialSnapshot()],
        policy: { ...DEFAULT_POLICY },
      },
    ],
  };
}
export function advance(previous: Snapshot, policy: Policy, seed: number): Snapshot {
  if (previous.year >= END_YEAR) throw new Error('已到达 2060 年，请回溯或新建实验。');
  const p = Object.fromEntries(
    Object.entries(policy).map(([k, v]) => [k, clamp(v, 0, 100)]),
  ) as Policy;
  const year = previous.year + 1;
  const noise = random(seed, year);
  const heatwave = noise < 0.2;
  const innovation = noise > 0.8;
  const revenue = 13 + p.tax * 0.48 + previous.population / 16000;
  const spending = 8 + p.transit * 0.15 + p.green * 0.14 + p.housing * 0.12 + p.education * 0.14;
  const budget = round(
    clamp(
      previous.budget + revenue - spending - (heatwave ? 5 : 0) + (innovation ? 6 : 0),
      -120,
      600,
    ),
  );
  const austerity = budget < 0 ? 4 : 0;
  const environment = round(
    clamp(
      previous.environment +
        p.green * 0.07 +
        p.transit * 0.03 -
        4.8 -
        previous.population / 140000 -
        (heatwave ? 4 : 0),
      0,
      100,
    ),
  );
  const happiness = round(
    clamp(
      previous.happiness +
        p.housing * 0.035 +
        p.transit * 0.025 +
        p.education * 0.025 -
        p.tax * 0.055 -
        1.8 +
        (environment - 65) * 0.045 -
        austerity -
        (heatwave ? 1.5 : 0),
      0,
      100,
    ),
  );
  const growth = clamp(
    0.003 +
      (happiness - 60) * 0.00065 +
      p.housing * 0.00016 +
      p.education * 0.00012 -
      p.tax * 0.00012 +
      (innovation ? 0.008 : 0) -
      austerity * 0.005,
    -0.04,
    0.06,
  );
  const population = Math.round(clamp(previous.population * (1 + growth), 30000, 500000));
  return {
    year,
    population,
    budget,
    environment,
    happiness,
    policy: { ...p },
    event: heatwave
      ? '热浪来袭'
      : innovation
        ? '创新企业落地'
        : environment > 80
          ? '绿色城市新里程碑'
          : budget < 0
            ? '财政压力增加'
            : happiness > 85
              ? '最宜居城市提名'
              : '城市稳步生长',
    note: heatwave
      ? '极端高温带来额外支出，绿色投入能帮助城市恢复。'
      : innovation
        ? '新企业带来财政收入，也吸引了更多居民。'
        : budget < 0
          ? '财政赤字影响公共服务，需要平衡税率与投入。'
          : '政策正在影响城市的长期走向。每一次选择都留下痕迹。',
  };
}
export function simulate(branch: Branch, seed: number, years = 1): Branch {
  const history = [...branch.history];
  for (let i = 0; i < years && history.at(-1)!.year < END_YEAR; i++)
    history.push(advance(history.at(-1)!, branch.policy, seed));
  return { ...branch, history };
}
export function fork(
  branch: Branch,
  index: number,
  id: string,
  name: string,
  color: string,
): Branch {
  if (!Number.isInteger(index) || index < 0 || index >= branch.history.length)
    throw new Error('无效的时间节点');
  const history = branch.history
    .slice(0, index + 1)
    .map((s) => ({ ...s, policy: { ...s.policy } }));
  return { id, name, color, history, policy: { ...history.at(-1)!.policy } };
}
export function parseExperiment(text: string): Experiment {
  const value = JSON.parse(text);
  if (
    !value ||
    value.version !== 1 ||
    !Number.isInteger(value.seed) ||
    value.seed < 0 ||
    value.seed > 0xffffffff ||
    !Array.isArray(value.branches) ||
    value.branches.length < 1 ||
    value.branches.length > 4
  )
    throw new Error('实验文件格式不正确');
  const validPolicy = (p: Policy) =>
    p &&
    ['transit', 'green', 'housing', 'education', 'tax'].every(
      (k) =>
        typeof p[k as keyof Policy] === 'number' &&
        Number.isFinite(p[k as keyof Policy]) &&
        p[k as keyof Policy] >= 0 &&
        p[k as keyof Policy] <= 100,
    );
  const ids = new Set();
  for (const b of value.branches) {
    if (
      !b ||
      typeof b.id !== 'string' ||
      b.id.length > 80 ||
      ids.has(b.id) ||
      typeof b.name !== 'string' ||
      !b.name.trim() ||
      b.name.length > 30 ||
      !/^#[0-9a-f]{6}$/i.test(b.color) ||
      !validPolicy(b.policy) ||
      !Array.isArray(b.history) ||
      b.history.length < 1 ||
      b.history.length > END_YEAR - START_YEAR + 1
    )
      throw new Error('世界线数据不正确');
    ids.add(b.id);
    for (const [i, s] of b.history.entries()) {
      if (
        !s ||
        s.year !== START_YEAR + i ||
        !validPolicy(s.policy) ||
        typeof s.event !== 'string' ||
        s.event.length > 100 ||
        typeof s.note !== 'string' ||
        s.note.length > 500 ||
        !Number.isInteger(s.population) ||
        s.population < 30000 ||
        s.population > 500000 ||
        !Number.isFinite(s.budget) ||
        s.budget < -120 ||
        s.budget > 600 ||
        !Number.isFinite(s.environment) ||
        s.environment < 0 ||
        s.environment > 100 ||
        !Number.isFinite(s.happiness) ||
        s.happiness < 0 ||
        s.happiness > 100
      )
        throw new Error('时间线数据不正确');
    }
  }
  if (!ids.has(value.activeId)) throw new Error('未找到当前世界线');
  return value as Experiment;
}
