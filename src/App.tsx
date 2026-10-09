import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Download,
  FlaskConical,
  GitBranch,
  Leaf,
  Menu,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Sprout,
  TrainFront,
  Trash2,
  Upload,
  Users,
  Wallet,
  X,
  GraduationCap,
  Heart,
  ExternalLink,
} from 'lucide-react';
import {
  COLORS,
  createExperiment,
  END_YEAR,
  fork,
  parseExperiment,
  PRESETS,
  simulate,
} from './engine';
import type { Experiment, Metric, Policy } from './engine';
import CityMap from './CityMap';
import TrendChart from './TrendChart';

const STORAGE_KEY = 'city-lab-experiment-v1';
const METRICS: { key: Metric; name: string; unit: string; icon: typeof Users; color: string }[] = [
  { key: 'population', name: '城市人口', unit: '万人', icon: Users, color: 'blue' },
  { key: 'budget', name: '财政储备', unit: '亿元', icon: Wallet, color: 'amber' },
  { key: 'environment', name: '环境质量', unit: '/ 100', icon: Leaf, color: 'green' },
  { key: 'happiness', name: '居民幸福感', unit: '/ 100', icon: Heart, color: 'purple' },
];
const POLICIES: { key: keyof Policy; name: string; icon: typeof Users; description: string }[] = [
  { key: 'transit', name: '公共交通', icon: TrainFront, description: '减少排放，提升通勤体验' },
  { key: 'green', name: '绿色建设', icon: Sprout, description: '改善环境，抵御极端天气' },
  { key: 'housing', name: '住房供给', icon: Building2, description: '吸引居民，提高生活满意度' },
  {
    key: 'education',
    name: '教育与创新',
    icon: GraduationCap,
    description: '培养人才，带动人口增长',
  },
  { key: 'tax', name: '综合税率', icon: Wallet, description: '增加收入，也影响居民幸福感' },
];
const formatMetric = (key: Metric, value: number) =>
  key === 'population' ? (value / 10000).toFixed(2) : value.toFixed(1);
function load(): Experiment {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? parseExperiment(text) : createExperiment();
  } catch {
    return createExperiment();
  }
}
type Modal = 'fork' | 'reset' | 'help' | null;

export default function App() {
  const [experiment, setExperiment] = useState<Experiment>(load);
  const [view, setView] = useState<'dashboard' | 'compare' | 'model'>('dashboard');
  const [timeIndex, setTimeIndex] = useState<number | null>(null);
  const [metric, setMetric] = useState<Metric>('happiness');
  const [modal, setModal] = useState<Modal>(null);
  const [branchName, setBranchName] = useState('');
  const [toast, setToast] = useState('');
  const [saved, setSaved] = useState(true);
  const [mobileNav, setMobileNav] = useState(false);
  const [fileMenu, setFileMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const active = experiment.branches.find((b) => b.id === experiment.activeId)!;
  const index =
    timeIndex === null ? active.history.length - 1 : Math.min(timeIndex, active.history.length - 1);
  const snapshot = active.history[index];
  const previous = active.history[Math.max(0, index - 1)];
  const isPast = index < active.history.length - 1;
  const finished = snapshot.year === END_YEAR;
  const policy = isPast ? snapshot.policy : active.policy;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(experiment));
      setSaved(true);
    } catch {
      setSaved(false);
    }
  }, [experiment]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (!modal) return;
    triggerRef.current = document.activeElement as HTMLElement;
    const element = modalRef.current;
    (nameRef.current ?? element?.querySelector<HTMLElement>('button'))?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
      if (e.key !== 'Tab' || !element) return;
      const focusable = [
        ...element.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]'),
      ];
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      }
      if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      triggerRef.current?.focus();
    };
  }, [modal]);
  const updatePolicy = (key: keyof Policy, value: number) =>
    setExperiment((e) => ({
      ...e,
      branches: e.branches.map((b) =>
        b.id === e.activeId ? { ...b, policy: { ...b.policy, [key]: value } } : b,
      ),
    }));
  const run = (years: number) => {
    setExperiment((e) => ({
      ...e,
      branches: e.branches.map((b) => (b.id === e.activeId ? simulate(b, e.seed, years) : b)),
    }));
    setTimeIndex(null);
    setToast(
      `已推演 ${Math.min(years, END_YEAR - active.history.at(-1)!.year)} 年，看看城市的新变化。`,
    );
  };
  const openFork = () => {
    setBranchName(`平行世界 ${experiment.branches.length}`);
    setModal('fork');
  };
  const createBranch = () => {
    if (!branchName.trim() || experiment.branches.length >= 4) return;
    const id = crypto.randomUUID();
    const color = COLORS.find((c) => !experiment.branches.some((b) => b.color === c)) ?? COLORS[0];
    const branch = fork(active, index, id, branchName.trim(), color);
    if (!isPast) branch.policy = { ...active.policy };
    setExperiment((e) => ({ ...e, activeId: id, branches: [...e.branches, branch] }));
    setTimeIndex(null);
    setModal(null);
    setToast(`已从 ${snapshot.year} 年创建新世界线，可以尝试不同政策了。`);
  };
  const exportFile = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(experiment, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `city-lab-${snapshot.year}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setFileMenu(false);
    setToast('实验已导出，可以在另一台设备导入继续。');
  };
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      if (file.size > 500000) throw new Error('实验文件不能超过 500 KB');
      const next = parseExperiment(await file.text());
      setExperiment(next);
      setTimeIndex(null);
      setFileMenu(false);
      setToast('实验已导入。');
    } catch (e) {
      setToast(`导入失败：${e instanceof Error ? e.message : '请检查文件'}`);
    }
    if (inputRef.current) inputRef.current.value = '';
  };
  const switchView = (v: typeof view) => {
    setView(v);
    setMobileNav(false);
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'mobile-open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            switchView('dashboard');
          }}
          aria-label="CITY:LAB 首页"
        >
          <span className="brand-mark">
            <Building2 size={22} />
          </span>
          <span>
            CITY<span className="brand-colon">:</span>LAB<small>平行城市实验室</small>
          </span>
        </a>
        <div className="nav-heading">
          探索工作台 <span>WORKSPACE</span>
        </div>
        <nav aria-label="主导航">
          <button
            className={view === 'dashboard' ? 'nav-item active' : 'nav-item'}
            onClick={() => switchView('dashboard')}
          >
            <FlaskConical size={19} />
            城市实验台
            <span className="nav-dot" />
          </button>
          <button
            className={view === 'compare' ? 'nav-item active' : 'nav-item'}
            onClick={() => switchView('compare')}
          >
            <GitBranch size={19} />
            平行世界线<span className="count">{experiment.branches.length}</span>
          </button>
          <button
            className={view === 'model' ? 'nav-item active' : 'nav-item'}
            onClick={() => switchView('model')}
          >
            <BookOpen size={19} />
            模型说明
          </button>
        </nav>
        <div className="sidebar-divider" />
        <div className="world-heading">
          <span>我的世界线</span>
          <button
            className="icon-btn"
            onClick={openFork}
            disabled={experiment.branches.length >= 4}
            aria-label="添加世界线"
          >
            <Plus size={16} />
          </button>
        </div>
        <div className="world-list">
          {experiment.branches.map((b) => (
            <button
              key={b.id}
              className={`world-item ${b.id === active.id ? 'selected' : ''}`}
              onClick={() => {
                setExperiment((e) => ({ ...e, activeId: b.id }));
                setTimeIndex(null);
                setMobileNav(false);
              }}
            >
              <span className="world-color" style={{ background: b.color }} />
              <span>{b.name}</span>
              <small>{b.history.at(-1)!.year}</small>
            </button>
          ))}
        </div>
        <div className="sidebar-note">
          <div className="mini-orbit">
            <Sparkles size={20} />
          </div>
          <strong>未来，从一次选择开始。</strong>
          <p>
            同一座城市，不同的可能。
            <br />
            大胆试试你的城市理想。
          </p>
          <button onClick={() => setModal('help')}>
            第一次来？看看怎么玩 <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">C</span>
          <div>
            <strong>创意实验项目</strong>
            <small>Built with Codex</small>
          </div>
          <button className="icon-btn" aria-label="使用帮助" onClick={() => setModal('help')}>
            <CircleHelp size={18} />
          </button>
        </div>
      </aside>
      {mobileNav && (
        <button
          className="nav-backdrop"
          aria-label="关闭导航"
          onClick={() => setMobileNav(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-toggle"
              onClick={() => setMobileNav(!mobileNav)}
              aria-label="打开导航"
            >
              <Menu size={20} />
            </button>
            <span>工作台</span>
            <ChevronRight size={13} />
            <strong>
              {view === 'dashboard' ? '城市实验台' : view === 'compare' ? '平行世界线' : '模型说明'}
            </strong>
          </div>
          <div className="header-actions">
            <span className={`save-status ${saved ? '' : 'unsaved'}`}>
              <span />
              {saved ? '已自动保存到此设备' : '保存不可用，请导出'}
            </span>
            <div className="file-menu-wrap">
              <button
                className="button small"
                onClick={() => setFileMenu(!fileMenu)}
                aria-expanded={fileMenu}
              >
                <Download size={15} />
                实验文件
                <ChevronDown size={13} />
              </button>
              {fileMenu && (
                <div className="file-menu">
                  <button onClick={exportFile}>
                    <Download size={15} />
                    导出当前实验
                  </button>
                  <button onClick={() => inputRef.current?.click()}>
                    <Upload size={15} />
                    导入实验文件
                  </button>
                  <button
                    onClick={() => {
                      setFileMenu(false);
                      setModal('reset');
                    }}
                  >
                    <RotateCcw size={15} />
                    重新开始
                  </button>
                </div>
              )}
            </div>
            <input
              type="file"
              accept=".json,application/json"
              ref={inputRef}
              hidden
              aria-label="导入实验文件"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span /> A SMALL CITY. INFINITE POSSIBILITIES.
              </div>
              <h1>
                {view === 'dashboard'
                  ? '把你的想象，变成一座城市。'
                  : view === 'compare'
                    ? '每一种选择，都有另一个未来。'
                    : '让每一次推演，都有迹可循。'}
              </h1>
              <p>
                {view === 'dashboard'
                  ? '调整政策，推演未来。在平行世界里，找到属于你的城市答案。'
                  : view === 'compare'
                    ? '同一起点、相同事件，对比不同政策如何改变一座城市。'
                    : '这是一个透明、可复现的城市沙盒。探索因果，也看见取舍。'}
              </p>
            </div>
            <div className="experiment-tag">
              <span className="pulse-dot" />
              实验进行中 <span className="tag-divider">/</span> SEED {experiment.seed}
            </div>
          </div>
          {view === 'dashboard' && (
            <>
              <div className="metrics-grid">
                {METRICS.map((m) => {
                  const value = snapshot[m.key];
                  const change = value - previous[m.key];
                  const Icon = m.icon;
                  return (
                    <section className="metric-card" key={m.key}>
                      <div className="metric-label">
                        {m.name}
                        <span className={`metric-icon ${m.color}`}>
                          <Icon size={17} />
                        </span>
                      </div>
                      <div className="metric-value">
                        {formatMetric(m.key, value)}
                        <span>{m.unit}</span>
                      </div>
                      <div className={`metric-change ${change < 0 ? 'down' : ''}`}>
                        {change >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownLeft size={13} />}
                        {change >= 0 ? '+' : ''}
                        {formatMetric(m.key, change)}
                        <span>较上一年</span>
                      </div>
                      <MetricSpark
                        values={active.history.slice(0, index + 1).map((s) => s[m.key])}
                        color={m.color}
                      />
                    </section>
                  );
                })}
              </div>
              <div className="workspace-grid">
                <section className="panel city-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        <span className="tiny-square" />
                        新岸市 <span className="muted-en">NEW SHORE</span>
                      </h2>
                      <p>
                        <span className="world-color" style={{ background: active.color }} />
                        {active.name}
                      </p>
                    </div>
                    <span className="year-tag">
                      {snapshot.year}
                      <small>年</small>
                    </span>
                  </div>
                  <div className="map-wrap">
                    <CityMap snapshot={snapshot} />
                    <div className="map-live">
                      <span />
                      {isPast ? '历史快照' : '城市实时沙盒'}
                    </div>
                    <div className="map-caption">
                      <span>
                        <i style={{ background: '#849b90' }} />
                        生活街区
                      </span>
                      <span>
                        <i style={{ background: '#b4c99b' }} />
                        生态空间
                      </span>
                      <span>
                        <i style={{ background: '#b7d4ce' }} />
                        城市水系
                      </span>
                    </div>
                  </div>
                  <div className="city-bottom">
                    <div>
                      <Sparkles size={17} />
                      <span>
                        {snapshot.environment >= 80
                          ? '城市与自然，正在找到平衡。'
                          : snapshot.happiness >= 85
                            ? '这里，正在成为人们理想的家。'
                            : '城市的下一章，由你来写。'}
                      </span>
                    </div>
                    <button onClick={() => setModal('help')}>
                      探索玩法 <ArrowUpRight size={14} />
                    </button>
                  </div>
                </section>
                <section className="panel policy-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        <Settings2 size={17} />
                        政策控制台
                      </h2>
                      <p>小小的调整，长远的改变</p>
                    </div>
                    <span className="mini-badge">{isPast ? '历史' : '可调整'}</span>
                  </div>
                  <div className="preset-row">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        disabled={isPast || finished}
                        title={p.caption}
                        className={
                          Object.keys(p.policy).every(
                            (k) => p.policy[k as keyof Policy] === policy[k as keyof Policy],
                          )
                            ? 'preset active'
                            : 'preset'
                        }
                        onClick={() =>
                          setExperiment((e) => ({
                            ...e,
                            branches: e.branches.map((b) =>
                              b.id === e.activeId ? { ...b, policy: { ...p.policy } } : b,
                            ),
                          }))
                        }
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                  <div className="policy-list">
                    {POLICIES.map((p) => {
                      const Icon = p.icon;
                      return (
                        <div className="policy-item" key={p.key}>
                          <div className="policy-title">
                            <label htmlFor={`policy-${p.key}`}>
                              <Icon size={16} />
                              {p.name}
                            </label>
                            <strong>
                              {policy[p.key]}
                              <small>{p.key === 'tax' ? '%' : '/100'}</small>
                            </strong>
                          </div>
                          <input
                            id={`policy-${p.key}`}
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            value={policy[p.key]}
                            disabled={isPast || finished}
                            onChange={(e) => updatePolicy(p.key, Number(e.target.value))}
                            style={{ '--progress': `${policy[p.key]}%` } as React.CSSProperties}
                          />
                          <p>{p.description}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="run-actions">
                    {isPast ? (
                      <button className="button primary full" onClick={() => setTimeIndex(null)}>
                        <ArrowRight size={16} />
                        返回最新年份
                      </button>
                    ) : (
                      <button
                        className="button primary full"
                        onClick={() => run(1)}
                        disabled={finished}
                      >
                        <Play size={15} fill="currentColor" />
                        {finished ? '已完成 20 年实验' : '推演下一年'}
                        <span>
                          {finished ? '2060' : `${snapshot.year + 1}`}
                          <ArrowRight size={15} />
                        </span>
                      </button>
                    )}
                    <div className="secondary-actions">
                      <button onClick={openFork} disabled={experiment.branches.length >= 4}>
                        <GitBranch size={14} />
                        从这里分叉
                      </button>
                      <button onClick={() => run(5)} disabled={isPast || finished}>
                        <ChevronsIcon />
                        快进 5 年
                      </button>
                    </div>
                  </div>
                </section>
              </div>
              <div className="bottom-grid">
                <section className="panel timeline-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        <RotateCcw size={17} />
                        时间胶囊
                      </h2>
                      <p>回到任意一年，让故事走向另一种可能</p>
                    </div>
                    <span className="mini-badge">{active.history.length} 个节点</span>
                  </div>
                  <div className="timeline-scroll">
                    <div className="timeline-track">
                      {active.history.map((s, i) => (
                        <button
                          className={`time-node ${index === i ? 'current' : ''}`}
                          key={s.year}
                          onClick={() => setTimeIndex(i)}
                          aria-label={`查看 ${s.year} 年`}
                          aria-pressed={index === i}
                        >
                          <span className="time-dot">{index === i && <span />}</span>
                          <strong>{s.year}</strong>
                          <small>
                            {i === 0
                              ? '故事起点'
                              : s.event === '热浪来袭'
                                ? '热浪来袭'
                                : s.event === '创新企业落地'
                                  ? '创新机遇'
                                  : '城市生长'}
                          </small>
                        </button>
                      ))}
                      {active.history.length === 1 && (
                        <div className="future-timeline">
                          <span />
                          <span />
                          <span />
                          <p>未来等待发生…</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="event-card">
                    <span className="event-symbol">
                      <Sparkles size={17} />
                    </span>
                    <div>
                      <strong>
                        {snapshot.event}
                        <span>{snapshot.year} 年城市纪事</span>
                      </strong>
                      <p>{snapshot.note}</p>
                    </div>
                  </div>
                </section>
                <section className="panel trend-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        <BarChart3 size={17} />
                        未来的轮廓
                      </h2>
                      <p>所有世界线，放在同一张图里</p>
                    </div>
                    <button
                      className="icon-btn"
                      onClick={() => switchView('compare')}
                      aria-label="查看完整对比"
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                  <div className="chart-tabs">
                    {METRICS.map((m) => (
                      <button
                        className={metric === m.key ? 'active' : ''}
                        key={m.key}
                        onClick={() => setMetric(m.key)}
                      >
                        {m.name
                          .replace('城市', '')
                          .replace('居民', '')
                          .replace('储备', '')
                          .replace('质量', '')}
                      </button>
                    ))}
                  </div>
                  <TrendChart branches={experiment.branches} metric={metric} compact />
                  <div className="chart-legend">
                    {experiment.branches.map((b) => (
                      <span key={b.id}>
                        <i style={{ background: b.color }} />
                        {b.name}
                      </span>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
          {view === 'compare' && (
            <>
              <div className="compare-banner">
                <div>
                  <GitBranch size={24} />
                  <div>
                    <strong>给未来，多一个选项。</strong>
                    <p>从任意历史节点分叉，试试另一种发展策略。最多保存 4 条世界线。</p>
                  </div>
                </div>
                <button
                  className="button primary"
                  onClick={openFork}
                  disabled={experiment.branches.length >= 4}
                >
                  <Plus size={16} />
                  创建世界线
                </button>
              </div>
              <section className="panel comparison-table">
                <div className="panel-heading">
                  <div>
                    <h2>世界线概览</h2>
                    <p>请选择相同年份，进行公平比较</p>
                  </div>
                  <select
                    aria-label="对比年份"
                    value={snapshot.year}
                    onChange={(e) => {
                      const year = Number(e.target.value);
                      setTimeIndex(year - 2040);
                    }}
                  >
                    {active.history.map((s) => (
                      <option key={s.year} value={s.year}>
                        {s.year} 年
                      </option>
                    ))}
                  </select>
                </div>
                <div className="table-overflow">
                  <table>
                    <thead>
                      <tr>
                        <th>世界线</th>
                        {METRICS.map((m) => (
                          <th key={m.key}>{m.name}</th>
                        ))}
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {experiment.branches.map((b) => {
                        const s = b.history.find((h) => h.year === snapshot.year);
                        return (
                          <tr key={b.id}>
                            <td>
                              <span className="world-color" style={{ background: b.color }} />
                              <strong>{b.name}</strong>
                              {b.id === active.id && <span className="current-label">当前</span>}
                              <small>已推演至 {b.history.at(-1)!.year} 年</small>
                            </td>
                            {METRICS.map((m) => (
                              <td key={m.key}>
                                {s ? (
                                  <>
                                    {formatMetric(m.key, s[m.key])}
                                    <small>{m.unit}</small>
                                  </>
                                ) : (
                                  <span className="no-data">尚未推演</span>
                                )}
                              </td>
                            ))}
                            <td>
                              <button
                                className="icon-btn"
                                aria-label={`进入 ${b.name}`}
                                onClick={() => {
                                  setExperiment((e) => ({ ...e, activeId: b.id }));
                                  setTimeIndex(null);
                                  switchView('dashboard');
                                }}
                              >
                                <ArrowUpRight size={17} />
                              </button>
                              {experiment.branches.length > 1 && (
                                <button
                                  className="icon-btn delete"
                                  aria-label={`删除 ${b.name}`}
                                  onClick={() => {
                                    const rest = experiment.branches.filter(
                                      (item) => item.id !== b.id,
                                    );
                                    setExperiment((e) => ({
                                      ...e,
                                      branches: rest,
                                      activeId: e.activeId === b.id ? rest[0].id : e.activeId,
                                    }));
                                    setTimeIndex(null);
                                    setToast(`已删除「${b.name}」。`);
                                  }}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
              <div className="comparison-charts">
                {METRICS.map((m) => (
                  <section className="panel" key={m.key}>
                    <div className="panel-heading">
                      <h2>
                        <m.icon size={17} />
                        {m.name}
                      </h2>
                      <span className="muted-en">{m.unit}</span>
                    </div>
                    <TrendChart branches={experiment.branches} metric={m.key} />
                    <div className="chart-legend">
                      {experiment.branches.map((b) => (
                        <span key={b.id}>
                          <i style={{ background: b.color }} />
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
          {view === 'model' && (
            <div className="model-page">
              <section className="model-hero">
                <span className="model-icon">
                  <FlaskConical size={34} />
                </span>
                <div>
                  <span className="eyebrow">OPEN MODEL · NO BLACK BOX</span>
                  <h2>一座小城，一个可解释的系统。</h2>
                  <p>
                    这里没有隐藏的 AI
                    预测。每次推演由公开的规则驱动，相同的种子、历史和政策，会得到相同的未来。它适合探索权衡与长期影响，不用于现实城市规划。
                  </p>
                </div>
              </section>
              <div className="model-cards">
                <section className="panel">
                  <h3>01 / 政策如何影响城市</h3>
                  <p>
                    交通和绿色建设改善环境；住房和教育吸引人口；税率增加收入，同时降低幸福感。公共投入消耗财政，财政赤字会进一步影响居民生活。
                  </p>
                  <div className="formula">政策投入 → 财政与环境 → 幸福感 → 人口增长</div>
                </section>
                <section className="panel">
                  <h3>02 / 世界线如何公平比较</h3>
                  <p>
                    外部事件由实验种子与年份共同决定。相同年份的热浪或创新机遇会同时发生在不同世界线，不会因点击顺序改变，方便隔离政策影响。
                  </p>
                  <div className="formula">相同年份 + 相同种子 = 相同外部事件</div>
                </section>
                <section className="panel">
                  <h3>03 / 从历史创建新未来</h3>
                  <p>
                    时间胶囊保留每一年的指标、政策和事件。历史快照只读；分叉会复制分叉点及之前的历史，然后独立发展，不会改变原来的世界线。
                  </p>
                  <div className="formula">回溯 → 分叉 → 调整 → 推演 → 比较</div>
                </section>
                <section className="panel">
                  <h3>04 / 数据留在你的设备</h3>
                  <p>
                    实验保存在浏览器本地。清除浏览器数据会删除实验，可导出 JSON
                    文件备份或分享。无需登录，没有远程模型、账户或付费 API。
                  </p>
                  <div className="formula">本地自动保存 + JSON 导入 / 导出</div>
                </section>
              </div>
              <section className="panel model-details">
                <h3>模拟规则与边界</h3>
                <p>
                  每年收入 = 13 + 税率 × 0.48 + 人口 / 16000；支出 = 8 + 交通 × 0.15 + 绿色 × 0.14 +
                  住房 × 0.12 + 教育 × 0.14（单位：亿元）。
                </p>
                <p>
                  环境变化 = 绿色 × 0.07 + 交通 × 0.03 − 4.8 − 人口 / 140000；幸福感变化 = 住房 ×
                  0.035 + 交通 × 0.025 + 教育 × 0.025 − 税率 × 0.055 − 1.8 + (环境 − 65) × 0.045。
                </p>
                <p>
                  人口增长率 = 0.003 + (幸福感 − 60) × 0.00065 + 住房 × 0.00016 + 教育 × 0.00012 −
                  税率 × 0.00012。年度人口增长限制为 −4% 至 +6%。
                </p>
                <p>
                  热浪：财政 −5、环境 −4、幸福感 −1.5。创新：财政 +6、人口增长率
                  +0.008。财政为负时幸福感 −4、人口增长率 −0.02。幸福感与环境范围 0–100，人口 3–50
                  万，财政 −120 至 600 亿元。每次实验从 2040 年开始，到 2060 年结束。
                </p>
                <p className="model-note">
                  模型是创作性的简化，不代表真实预测。地图以人口和环境指标变化，不对应真实地理位置。
                </p>
                <a
                  href="https://github.com/aaronzhan2001-code/tes"
                  target="_blank"
                  rel="noreferrer"
                >
                  查看项目源码 <ExternalLink size={14} />
                </a>
              </section>
            </div>
          )}
          <footer className="page-footer">
            <span>
              CITY:LAB <i />
              让可能性，被看见。
            </span>
            <span>
              Designed & built with Codex <span className="footer-spark">✳</span>
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{toast}</span>
          <button className="icon-btn" onClick={() => setToast('')} aria-label="关闭提示">
            <X size={16} />
          </button>
        </div>
      )}
      {modal && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div
            className="modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close icon-btn"
              onClick={() => setModal(null)}
              aria-label="关闭弹窗"
            >
              <X size={20} />
            </button>
            {modal === 'fork' ? (
              <>
                <span className="modal-icon">
                  <GitBranch size={25} />
                </span>
                <h2 id="modal-title">另一个未来，从这里开始。</h2>
                <p>
                  保留「{active.name}」至 {snapshot.year} 年的历史，创建一条独立的世界线。
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    createBranch();
                  }}
                >
                  <label className="input-label" htmlFor="branch-name">
                    给新世界线取个名字
                  </label>
                  <input
                    className="text-input"
                    id="branch-name"
                    ref={nameRef}
                    maxLength={30}
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="例如：绿意新岸"
                  />
                  <div className="modal-actions">
                    <button type="button" className="button" onClick={() => setModal(null)}>
                      取消
                    </button>
                    <button
                      type="submit"
                      className="button primary"
                      disabled={!branchName.trim() || experiment.branches.length >= 4}
                    >
                      <GitBranch size={16} />
                      创建世界线
                    </button>
                  </div>
                </form>
                {experiment.branches.length >= 4 && (
                  <p className="model-note">最多保存 4 条世界线，请先在对比页删除一条。</p>
                )}
              </>
            ) : modal === 'reset' ? (
              <>
                <span className="modal-icon">
                  <RotateCcw size={25} />
                </span>
                <h2 id="modal-title">开启一个全新的实验？</h2>
                <p>这会清除当前设备上的世界线与历史。你可以先导出实验文件，保留这些未来。</p>
                <div className="modal-actions">
                  <button
                    className="button"
                    onClick={() => {
                      exportFile();
                      setModal(null);
                    }}
                  >
                    导出并保留
                  </button>
                  <button
                    className="button primary"
                    onClick={() => {
                      setExperiment(createExperiment());
                      setTimeIndex(null);
                      setModal(null);
                      setToast('已回到 2040 年，新的故事开始了。');
                    }}
                  >
                    确认重新开始
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="modal-icon">
                  <Sparkles size={25} />
                </span>
                <h2 id="modal-title">用 3 分钟，探索另一种未来。</h2>
                <div className="help-steps">
                  <div>
                    <span>1</span>
                    <p>
                      <strong>设定你的城市理想</strong>在政策控制台调整投入，或选择一套预设。
                    </p>
                  </div>
                  <div>
                    <span>2</span>
                    <p>
                      <strong>让时间往前走</strong>推演下一年或快进 5 年，观察指标、地图与事件。
                    </p>
                  </div>
                  <div>
                    <span>3</span>
                    <p>
                      <strong>试试另一种选择</strong>在历史年份分叉，调整政策，再到世界线页面比较。
                    </p>
                  </div>
                </div>
                <button className="button primary full" onClick={() => setModal(null)}>
                  开始我的城市实验 <ArrowRight size={17} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChevronsIcon() {
  return <MoreHorizontal size={14} />;
}

function MetricSpark({ values, color }: { values: number[]; color: string }) {
  const min = Math.min(...values),
    max = Math.max(...values);
  const points =
    values.length === 1
      ? '2,17 90,17'
      : values
          .map(
            (v, i) =>
              `${2 + (i / (values.length - 1)) * 88},${max === min ? 17 : 30 - ((v - min) / (max - min)) * 26}`,
          )
          .join(' ');
  return (
    <svg viewBox="0 0 92 34" className={`metric-spark ${color}`} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
