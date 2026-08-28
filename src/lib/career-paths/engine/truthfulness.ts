// 职途星真实性红线引擎 · A4 四真质检
// 核心命题：求职内容（简历/经历/自述）必须守住「四真」——真实发生 / 真实负责 / 真实可背调 / 不编造。
// 本引擎做「防夸大、保真实」的判断力：逐条扫描描述，标出违反/边缘信噪比的风险点，
// 并给出「收敛到真实可背调」的改写建议。判断力 ≠ 打分，只解释 + 给路径。
//
// 用法：walkTruthfulness(experience, targetJob?) → TruthfulnessReport
//
// 四真定义：
//   真实发生：事件确实发生过，不是编的
//   真实负责：写的是本人职责，不是把团队/他人成果写到自己名下
//   真实可背调：关键数据/成果有证据支撑，可被面试官追查
//   不编造：不夸大数字/头衔/成就，不使用无事实支撑的营销词

/** 风险等级 */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 单条风险 */
export interface TruthRisk {
  level: RiskLevel;
  /** 触发规则 key */
  rule: string;
  /** 触发原文片段 */
  snippet: string;
  /** 为什么违规（四真解释） */
  why: string;
  /** 收敛建议（改成真实可背调的写法） */
  fix: string;
}

/** 四真维度通过情况 */
export interface TruthDimension {
  key: 'happened' | 'owned' | 'backable' | 'noFabrication';
  label: string;
  status: 'pass' | 'warn' | 'risk';
  count: number;
}

/** 引擎结果 */
export interface TruthfulnessReport {
  input: string;
  riskCount: number;
  highCount: number;
  dimensions: TruthDimension[];
  risks: TruthRisk[];
  verdict: 'verifiable' | 'needs_fix' | 'high_risk';
  summary: string;
}

// ============================================================
// 检测规则（Heuristic，纯本地不调模型）
// ============================================================

const DIM_LABELS: Record<TruthDimension['key'], string> = {
  happened: '真实发生',
  owned: '真实负责',
  backable: '真实可背调',
  noFabrication: '不编造',
};

/** 无主语 / 边界模糊的模糊表述（真实负责） */
const VAGUE_OWNERS = [
  { re: /[^;。，]{0,12}(参与|协助|配合|帮忙).{0,10}?(研发|开发|项目|工作|业务)/, why: '用了「参与/协助/配合」这类边界模糊词，无法证明你本人承担了什么职责，容易被面试官追问「你具体做了什么」而答不上来。', fix: '改成第一人称 + 具体职责：把「参与XX项目」改为「我负责XX模块，完成了XX动作，产出XX结果」，谁做了、做了什么、做成了什么都要说清。' },
];

/** 独立/主导但无成果支撑（真实负责 + 可背调） */
const LEAD_WITHOUT_PROOF = [
  { re: /(主导|独立|全程负责|统筹|牵头).{0,15}(项目|方案|系统|模块|建设|设计)/, why: '用了「主导/独立/全程负责」这类强事实词，但没有对应成果/证据，属于「有承诺无条件」，背调时极容易翻车。', fix: '给证据链：主导了什么，产出/结果是什么（上线、节省、效率提升、被谁采用），最好有数字或可复核的事实支撑。' },
];

/** 数字无来源 / 夸大比例（不编造 + 可背调） */
const UNSUPPORTED_NUMBER = [
  { re: /([1-9][0-9]{0,2})\s*%|提升了\s*([1-9][0-9]{0,2})\s*%|达成\s*([1-9][0-9]{0,2})\s*%/, why: '出现百分比/量化收益，但没给来源或口径，易被质疑「这数字哪来的」。四真要求真实可背调，编造或无法溯源的数据会被直接戳穿。', fix: '写明统计口径 + 数据来源 + 时间范围：如「2026上半年经我优化的流程，返工率由X%降至Y%（数据来自Z系统导出）」。给不出就换成定性的真实成果。' },
];

/** 团队成果写成个人成果（真实负责） */
const TEAM_AS_OWN = [
  { re: /[^。]{0,20}(团队|组内|公司|部门|大家)?.{0,10}(获得|拿下|实现|完成|达成).{0,15}(奖|成绩|XX万|第一|突破)/, why: '把团队/组织成果写成「我」的成绩，模糊个人贡献边界。背调时若还原不出个人份额，就成了「抢功」，是四真里最伤信任的一条。', fix: '写明个人份额：团队取得X，我具体负责Y，贡献Z。例：「团队获X奖，我负责Y环节，完成Z」。' },
];

/** 营销词 / 无事实支撑的夸大专有（不编造） */
const MARKETING_PHRASE = [
  { re: /(赋能|颠覆|赋能|领先|顶级|行业第一|不可替代|重塑|重新定义|跨越式|革命性)/, why: '用了营销词（赋能/颠覆/领先/重塑），这些词没有可核事实支撑，四真里的「真实发生」要求内容可验证，营销词会让人怀疑整段真实性。', fix: '换成可背调的事实描述：把「赋能业务」改为「为业务方做了xx培训/工具，解决xx问题，有xx使用数据」，用具体代替空洞。' },
];

/** 经历与专业/时间明显不符（真实发生） */
const TIMELINE_MISMATCH = [
  { re: /(在校期间|大学期间).{0,30}(拿下|完成|负责|主导).{0,20}(千万|百万|国家级|重大)/, why: '在校生/应届背景下出现「千万/国家级/重特大」量级成果，与常理明显不符，属于最容易被一眼看穿的夸大。', fix: '还原真实量级：写清是「参与某规模项目中的具体子任务」，用真实的口径描述，量级宁愿小些也不能假。' },
];

const ALL_RULES = [
  ...VAGUE_OWNERS,
  ...LEAD_WITHOUT_PROOF,
  ...UNSUPPORTED_NUMBER,
  ...TEAM_AS_OWN,
  ...MARKETING_PHRASE,
  ...TIMELINE_MISMATCH,
];

/** 规则 → 维度映射 */
function ruleToDimension(rule: string): TruthDimension['key'] {
  if (rule === 'VAGUE_OWNERS' || rule === 'TEAM_AS_OWN') return 'owned';
  if (rule === 'LEAD_WITHOUT_PROOF') return 'owned';
  if (rule === 'UNSUPPORTED_NUMBER' || rule === 'MARKETING_PHRASE') return 'noFabrication';
  if (rule === 'TIMELINE_MISMATCH') return 'happened';
  if (rule === 'UNSUPPORTED_NUMBER') return 'backable';
  return 'noFabrication';
}

/**
 * 真实性红线质检主入口
 * @param experience 求职者经历/简历/自述文本
 * @param targetJob 目标岗位（用于context提示，可选）
 */
export function walkTruthfulness(experience: string, targetJob?: string): TruthfulnessReport {
  const input = (experience || '').trim();
  if (!input) {
    return {
      input,
      riskCount: 0,
      highCount: 0,
      dimensions: DIM_LABELS_EMPTY(),
      risks: [],
      verdict: 'verifiable',
      summary: '暂无可质检内容，请先输入你的经历/简历文本。',
    };
  }

  const risks: TruthRisk[] = [];
  const visited = new Set<string>();

  for (const rule of ALL_RULES) {
    const m = input.match(rule.re);
    if (m) {
      const key = rule.re.source;
      if (visited.has(key)) {
        // 同一规则只提示一次（避免刷屏）
        continue;
      }
      visited.add(key);
      // 防误伤：若句中已出现明确职责动词（负责/完成/主导/承担/统筹），
      // 则「参与/协助」不算模糊无主，跳过该条
      if (rule.re === VAGUE_OWNERS[0].re && /负责|完成|主导|承担|统筹|我/.test(input)) {
        continue;
      }
      const level: RiskLevel =
        rule.re === VAGUE_OWNERS[0].re && m[0].length < 14
          ? 'medium'
          : rule.re === MARKETING_PHRASE[0].re
            ? 'medium'
            : 'high';
      risks.push({
        level,
        rule: itemId(rule.re.source),
        snippet: m[0],
        why: rule.why,
        fix: rule.fix,
      });
    }
  }

  const highCount = risks.filter((r) => r.level === 'high').length;
  const dims = buildDimensions(risks);
  const verdict = highCount > 0 ? 'high_risk' : risks.length > 0 ? 'needs_fix' : 'verifiable';

  return {
    input,
    riskCount: risks.length,
    highCount,
    dimensions: dims,
    risks,
    verdict,
    summary: buildSummary(verdict, risks.length, targetJob),
  };
}

function DIM_LABELS_EMPTY(): TruthDimension[] {
  return (['happened', 'owned', 'backable', 'noFabrication'] as const).map((k) => ({
    key: k,
    label: DIM_LABELS[k],
    status: 'pass',
    count: 0,
  }));
}

function buildDimensions(risks: TruthRisk[]): TruthDimension[] {
  const base = DIM_LABELS_EMPTY();
  for (const r of risks) {
    const key = ruleToDimension(r.rule);
    const dim = base.find((d) => d.key === key);
    if (dim) {
      dim.count += 1;
      if (r.level === 'high' || r.level === 'medium') {
        dim.status = r.level === 'high' ? 'risk' : 'warn';
      }
    }
  }
  return base;
}

function buildSummary(verdict: TruthfulnessReport['verdict'], riskCount: number, targetJob?: string): string {
  const clamp = targetJob ? `面向「${targetJob}」` : '';
  if (verdict === 'verifiable') {
    return `这段内容经四真红线扫描${clamp}未见明显夸大或失实，可以用。` +
      '（仍建议：保持第一人称 + 具体职责 + 可核实的成果，这是最稳的写法。）';
  }
  if (verdict === 'high_risk') {
    return `这段内容${clamp}有 ${riskCount} 处真实性风险（含高险 ${riskCount} 处）。` +
      '核心问题在于「夸大了个人贡献、无证据的成果或营销词」，这在背调和面试追问时最容易翻车。' +
      '建议逐条按下方「收敛建议」改成真实、可背调的表述——小职可以帮你，但底子必须真。';
  }
  return `这段内容${clamp}有 ${riskCount} 处边缘风险。不算硬伤，但建议收敛：把模糊的「参与/协助」补成具体职责，把营销词换成可核实的事实。` +
    '宁可写得小而真，也不要大而虚。';
}

/** 规则标识（给命名用） */
function itemId(source: string): string {
  if (source.includes('参与|协助')) return 'VAGUE_OWNERS';
  if (source.includes('主导|独立')) return 'LEAD_WITHOUT_PROOF';
  if (source.includes('s*%')) return 'UNSUPPORTED_NUMBER';
  if (source.includes('获得|拿下')) return 'TEAM_AS_OWN';
  if (source.includes('赋能|颠覆')) return 'MARKETING_PHRASE';
  if (source.includes('千万|百万')) return 'TIMELINE_MISMATCH';
  return 'TRUTH_RISK';
}

export { DIM_LABELS };
