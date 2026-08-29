/**
 * Phase 2 · 接口契约测试（判断力引擎核心 API）
 *
 * 目标：锁定「前端 ↔ 后端」的接口契约，防止后端改坏契约导致前端崩溃。
 * 采用「直接调用路由处理器」的方式（不引入 MSW），因为 career-planning 全家桶
 * 都是「引擎纯函数 + auth 门禁」，无外部 LLM/DB 依赖，可直接断言真实契约。
 *
 * 契约三要素：
 *  ① 401 未登录 → 登录态 API 必须门禁（防越权）
 *  ② 400 非法请求体 / 缺参 → 输入校验契约
 *  ③ 200 + { success:true, data } 正常契约形状（关键字段存在且类型正确）
 *
 * 设计红线：判断力 ≠ 打分——data 均为「解释 + 路径 + 建议」结构，不含单一分数。
 */
import type { NextRequest } from 'next/server';

// ---- mock auth（jest.mock 工厂引用 mock 前缀变量，hoist 安全）----
const mockGetAuthenticatedUserId = jest.fn();
const mockGetAuthenticatedUser = jest.fn();
jest.mock('@/lib/auth', () => ({
  getAuthenticatedUserId: (...a: unknown[]) => mockGetAuthenticatedUserId(...a),
  getAuthenticatedUser: (...a: unknown[]) => mockGetAuthenticatedUser(...a),
}));

import { GET as careerPathGet, POST as careerPathPost } from '@/app/api/career-planning/career-path/route';
import { GET as radarGet, POST as radarPost } from '@/app/api/career-planning/interview-radar/route';
import { POST as cognitivePost } from '@/app/api/career-planning/cognitive-check/route';
import { GET as subtextGet, POST as subtextPost } from '@/app/api/career-planning/subtext-detect/route';
import { GET as capGet, POST as capPost } from '@/app/api/career-planning/capability-dictionary/route';
import { GET as personaGet, POST as personaPost } from '@/app/api/career-planning/persona/route';

// 构造一个满足路由处理器所需的最小 NextRequest（路由只用 request.json()）
function jsonReq(body?: unknown): NextRequest {
  return { json: async () => body } as unknown as NextRequest;
}
// 让 request.json() 抛错，触发路由的「请求体不是合法 JSON」分支
function invalidJsonReq(): NextRequest {
  return { json: async () => { throw new Error('invalid json'); } } as unknown as NextRequest;
}
function bodyOf(res: Response) {
  return res.json();
}
function authedUserId(): string {
  return 'u_contract_test';
}

beforeEach(() => {
  mockGetAuthenticatedUserId.mockReset();
  mockGetAuthenticatedUser.mockReset();
});

describe('契约 · 401 未登录门禁（登录态 API）', () => {
  it('career-path GET/POST 未登录返回 401', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);
    expect((await careerPathGet(jsonReq())).status).toBe(401);
    expect((await careerPathPost(jsonReq({ major: '计算机' }))).status).toBe(401);
  });
  it('interview-radar GET/POST 未登录返回 401', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);
    expect((await radarGet(jsonReq())).status).toBe(401);
    expect((await radarPost(jsonReq({ industry: 'ai' }))).status).toBe(401);
  });
  it('cognitive-check POST 未登录返回 401', async () => {
    mockGetAuthenticatedUser.mockResolvedValue(null);
    expect((await cognitivePost(jsonReq({ major: '计算机' }))).status).toBe(401);
  });
  it('subtext-detect GET/POST 未登录返回 401', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);
    expect((await subtextGet(jsonReq())).status).toBe(401);
    expect((await subtextPost(jsonReq({ text: '要有抗压能力' }))).status).toBe(401);
  });
  it('capability-dictionary GET/POST 未登录返回 401', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);
    expect((await capGet(jsonReq())).status).toBe(401);
    expect((await capPost(jsonReq({ targetJob: '工艺工程师' }))).status).toBe(401);
  });
  it('persona GET/POST 未登录返回 401', async () => {
    mockGetAuthenticatedUserId.mockResolvedValue(null);
    expect((await personaGet(jsonReq())).status).toBe(401);
    expect((await personaPost(jsonReq({ presetId: 'default' }))).status).toBe(401);
  });
});

describe('契约 · GET 列表契约（success+data）', () => {
  beforeEach(() => {
    mockGetAuthenticatedUserId.mockResolvedValue(authedUserId());
  });

  it('career-path GET 返回方向列表', async () => {
    const res = await careerPathGet(jsonReq());
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    const first = body.data[0];
    expect(first.key).toBeTruthy();
    expect(first.label).toBeTruthy();
  });

  it('interview-radar GET 返回行业列表', async () => {
    const res = await radarGet(jsonReq());
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].key).toBeTruthy();
    expect(body.data[0].label).toBeTruthy();
  });

  it('subtext-detect GET 返回词条库', async () => {
    const res = await subtextGet(jsonReq());
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    const e = body.data[0];
    expect(e.phrase).toBeTruthy();
    expect(e.category).toBeTruthy();
    expect(['low', 'medium', 'high']).toContain(e.risk);
    expect(e.advice).toBeTruthy();
  });

  it('capability-dictionary GET 返回岗位列表', async () => {
    const res = await capGet(jsonReq());
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
    expect(body.data[0].id).toBeTruthy();
    expect(body.data[0].name).toBeTruthy();
    expect(body.data[0].category).toBeTruthy();
  });

  it('persona GET 返回预设人格卡 + 可调维度说明', async () => {
    const res = await personaGet(jsonReq());
    expect(res.status).toBe(200);
    const body = await bodyOf(res);
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data.presets)).toBe(true);
    expect(body.data.presets.length).toBeGreaterThan(0);
    expect(Array.isArray(body.data.scenarios)).toBe(true);
    expect(body.data.scenarios).toContain('chat');
    expect(Array.isArray(body.data.dims)).toBe(true);
    expect(body.data.dims.length).toBeGreaterThan(0);
  });
});

describe('契约 · POST 校验与成功契约', () => {
  beforeEach(() => {
    mockGetAuthenticatedUserId.mockResolvedValue(authedUserId());
    mockGetAuthenticatedUser.mockResolvedValue({ id: authedUserId() });
  });

  describe('career-path', () => {
    it('非法 JSON 请求体返回 400', async () => {
      const res = await careerPathPost(invalidJsonReq());
      expect(res.status).toBe(400);
      expect((await bodyOf(res)).error).toBe('请求体不是合法 JSON');
    });

    it('合法输入返回成长路线（解释+路径+建议，无单一分数）', async () => {
      const res = await careerPathPost(jsonReq({ major: '计算机科学与技术', grade: '大四' }));
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body.success).toBe(true);
      const d = body.data;
      expect(typeof d.trackKey).toBe('string');
      expect(typeof d.trackLabel).toBe('string');
      expect(typeof d.currentStageLabel).toBe('string');
      expect(typeof d.summary).toBe('string');
      expect(Array.isArray(d.roadmap)).toBe(true);
      expect(d.roadmap.length).toBeGreaterThan(0);
      expect(typeof d.roadmap[0].stage).toBe('string');
      expect(typeof d.roadmap[0].focus).toBe('string');
      expect(Array.isArray(d.roadmap[0].actions)).toBe(true);
      // 不存在任何「分数」字段
      expect('score' in d).toBe(false);
      expect('verdict' in d).toBe(false);
    });
  });

  describe('interview-radar', () => {
    it('非法 JSON 请求体返回 400', async () => {
      const res = await radarPost(invalidJsonReq());
      expect(res.status).toBe(400);
      expect((await bodyOf(res)).error).toBe('请求体不是合法 JSON');
    });

    it('industry 与 major 均缺失返回 400', async () => {
      const res = await radarPost(jsonReq({}));
      expect(res.status).toBe(400);
      expect((await bodyOf(res)).error).toBe('请提供目标行业或你的专业');
    });

    it('合法输入返回面试雷达（重点/高频问题/雷区/建议）', async () => {
      const res = await radarPost(jsonReq({ industry: 'ai', major: '计算机科学与技术' }));
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body.success).toBe(true);
      const d = body.data;
      expect(typeof d.matchedIndustry).toBe('string');
      expect(typeof d.matchedKey).toBe('string');
      expect(typeof d.summary).toBe('string');
      expect(d.radar).toBeTruthy();
      expect(Array.isArray(d.radar.focus)).toBe(true);
      expect(Array.isArray(d.radar.questions)).toBe(true);
      expect(Array.isArray(d.radar.redFlags)).toBe(true);
      expect(Array.isArray(d.radar.prepTips)).toBe(true);
      // 判断力 ≠ 打分
      expect('score' in d).toBe(false);
    });
  });

  describe('cognitive-check', () => {
    it('缺少 major 返回 400', async () => {
      const res = await cognitivePost(jsonReq({}));
      expect(res.status).toBe(400);
      const body = await bodyOf(res);
      expect(body.code).toBe(400);
      expect(body.message).toBe('请填写专业');
    });

    it('合法输入返回认知校正（反推方向+为什么+行动建议）', async () => {
      const res = await cognitivePost(jsonReq({ major: '计算机科学与技术', grade: '大四' }));
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body.code).toBe(200);
      expect(body.message).toBe('认知校正完成');
      const d = body.data;
      expect(typeof d.major).toBe('string');
      expect(typeof d.categoryLabel).toBe('string');
      expect(Array.isArray(d.jobDirections)).toBe(true);
      expect(Array.isArray(d.actions)).toBe(true);
      expect(typeof d.summary).toBe('string');
      expect('score' in d).toBe(false);
    });
  });

  describe('subtext-detect', () => {
    it('非法 JSON 请求体返回 400', async () => {
      const res = await subtextPost(invalidJsonReq());
      expect(res.status).toBe(400);
      expect((await bodyOf(res)).error).toBe('请求体不是合法 JSON');
    });

    it('缺少 text 返回 400', async () => {
      const res = await subtextPost(jsonReq({}));
      expect(res.status).toBe(400);
      expect((await bodyOf(res)).error).toBe('请提供要拆解的文本');
    });

    it('合法输入返回潜台词拆解（命中词条+风险+应对）', async () => {
      const res = await subtextPost(jsonReq({ text: '要有较强的抗压能力' }));
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body.success).toBe(true);
      const d = body.data;
      expect(typeof d.input).toBe('string');
      expect(Array.isArray(d.items)).toBe(true);
      expect(typeof d.summary).toBe('string');
      if (d.items.length > 0) {
        expect(d.items[0].phrase).toBeTruthy();
        expect(['low', 'medium', 'high']).toContain(d.items[0].risk);
      }
    });
  });

  describe('capability-dictionary', () => {
    it('非法 JSON 请求体返回 400', async () => {
      const res = await capPost(invalidJsonReq());
      expect(res.status).toBe(400);
      expect((await bodyOf(res)).error).toBe('请求体不是合法 JSON');
    });

    it('合法输入返回能力差距诊断（覆盖/差距/推荐，无单一分数）', async () => {
      const res = await capPost(jsonReq({ targetJob: '工艺工程师', experience: '做过电池工艺' }));
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body.success).toBe(true);
      const d = body.data;
      expect(typeof d.matchedJob).toBe('string');
      expect(typeof d.matchedCategory).toBe('string');
      expect(typeof d.known).toBe('boolean');
      expect(Array.isArray(d.layers)).toBe(true);
      expect(typeof d.summary).toBe('string');
      expect('score' in d).toBe(false);
    });
  });

  describe('persona', () => {
    it('非法 JSON 请求体返回 400', async () => {
      const res = await personaPost(invalidJsonReq());
      expect(res.status).toBe(400);
      expect((await bodyOf(res)).error).toBe('请求体不是合法 JSON');
    });

    it('合法输入返回归一化人格 + 示例兜底话术', async () => {
      const res = await personaPost(jsonReq({ presetId: 'default' }));
      expect(res.status).toBe(200);
      const body = await bodyOf(res);
      expect(body.success).toBe(true);
      expect(body.data.persona).toBeTruthy();
      expect(typeof body.data.sampleReply).toBe('string');
      expect(body.data.sampleReply.length).toBeGreaterThan(0);
    });
  });
});
