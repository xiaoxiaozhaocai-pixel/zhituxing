import {
  PERSONA_PRESETS,
  getPersonaPreset,
  resolvePersona,
  listPersonas,
  personaFallbackReply,
  personaPromptFragment,
} from '@/lib/career-paths/engine/persona';

describe('getPersonaPreset 人格卡查找', () => {
  it('无参数返回默认（第一个预设）', () => {
    expect(getPersonaPreset().id).toBe(PERSONA_PRESETS[0].id);
  });
  it('按 id 命中', () => {
    expect(getPersonaPreset('strict_teacher').name).toBe('严肃老师');
  });
  it('未知 id 兜底到默认', () => {
    expect(getPersonaPreset('not_exist').id).toBe(PERSONA_PRESETS[0].id);
  });
});

describe('resolvePersona 归一化', () => {
  it('无输入 → 默认冷酷学长', () => {
    const p = resolvePersona();
    expect(p.presetId).toBe('cool_senior');
    expect(p.name).toBe('冷酷学长');
    expect(p.dims).toEqual({ warmth: 25, directness: 85, encouragement: 30, humor: 25 });
  });
  it('指定 presetId 取基线维度', () => {
    const p = resolvePersona({ presetId: 'warm_junior' });
    expect(p.dims.warmth).toBe(90);
    expect(p.dims.encouragement).toBe(85);
  });
  it('dims 覆写并 clamp 到 [0,100]', () => {
    const p = resolvePersona({ dims: { warmth: 200, directness: -5 } });
    expect(p.dims.warmth).toBe(100);
    expect(p.dims.directness).toBe(0);
  });
  it('description 覆写一句话人设', () => {
    const p = resolvePersona({ description: '  我自定义的人设  ' });
    expect(p.tagline).toBe('我自定义的人设');
    expect(p.description).toBe('我自定义的人设');
  });
});

describe('listPersonas 预设列表', () => {
  it('返回全部预设（4个）且结构完整', () => {
    const list = listPersonas();
    expect(list.length).toBe(4);
    for (const item of list) {
      expect(item.id).toBeTruthy();
      expect(item.name).toBeTruthy();
      expect(item.emoji).toBeTruthy();
      expect(item.tagline).toBeTruthy();
      expect(typeof item.dims.warmth).toBe('number');
      expect(typeof item.dims.directness).toBe('number');
      expect(typeof item.dims.encouragement).toBe('number');
      expect(typeof item.dims.humor).toBe('number');
    }
  });
});

describe('personaFallbackReply 场景兜底', () => {
  const senior = resolvePersona({ presetId: 'cool_senior' });
  it('empty 场景有感知', () => {
    expect(personaFallbackReply(senior, 'empty')).toContain('没看到你输入');
  });
  it('fail 场景如实卡点', () => {
    expect(personaFallbackReply(senior, 'fail')).toContain('卡了一下');
  });
  it('no_data 场景不编造', () => {
    expect(personaFallbackReply(senior, 'no_data')).toContain('不跟你瞎编');
  });
  it('unknown 场景坦诚', () => {
    expect(personaFallbackReply(senior, 'unknown')).toContain('没太抓住');
  });
  it('chat 场景有温度', () => {
    expect(personaFallbackReply(senior, 'chat')).toContain('你有什么想问的');
  });
  it('返回以 emoji 开头', () => {
    expect(personaFallbackReply(senior, 'chat').startsWith(senior.emoji)).toBe(true);
  });
});

describe('personaPromptFragment 人格约束片段', () => {
  it('含人格设定与姓名', () => {
    const p = resolvePersona({ presetId: 'strict_teacher' });
    const frag = personaPromptFragment(p);
    expect(frag).toContain('人格设定');
    expect(frag).toContain('严肃老师');
    expect(frag).toContain('直接度');
  });
});
