/**
 * admin-auth 鉴权中间件测试（圣经 v3.1 L6.2 配套）
 * 注意：ADMIN_TOKEN 在模块加载时固化，必须用 require 延迟加载
 */
import { NextRequest } from 'next/server';

process.env.ADMIN_TOKEN = 'test-secret-token';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { verifyAdminAuth, requireAdmin } = require('@/lib/admin-auth') as typeof import('@/lib/admin-auth');

function req(headers: Record<string, string>): NextRequest {
  return new NextRequest('http://localhost:3000/admin/api/users', { headers });
}

describe('verifyAdminAuth 三通道验证', () => {
  it('x-admin-token header 正确 → 通过', () => {
    expect(verifyAdminAuth(req({ 'x-admin-token': 'test-secret-token' })).valid).toBe(true);
  });

  it('admin_token cookie 正确 → 通过', () => {
    expect(verifyAdminAuth(req({ cookie: 'admin_token=test-secret-token; other=1' })).valid).toBe(true);
  });

  it('Authorization Bearer 正确 → 通过', () => {
    expect(verifyAdminAuth(req({ authorization: 'Bearer test-secret-token' })).valid).toBe(true);
  });

  it('token 错误 → 拒绝', () => {
    expect(verifyAdminAuth(req({ 'x-admin-token': 'wrong' })).valid).toBe(false);
    expect(verifyAdminAuth(req({ cookie: 'admin_token=wrong' })).valid).toBe(false);
    expect(verifyAdminAuth(req({ authorization: 'Bearer wrong' })).valid).toBe(false);
  });

  it('无任何凭证 → 拒绝', () => {
    expect(verifyAdminAuth(req({})).valid).toBe(false);
  });
});

describe('requireAdmin 响应语义', () => {
  it('通过时返回 null', () => {
    expect(requireAdmin(req({ 'x-admin-token': 'test-secret-token' }))).toBeNull();
  });

  it('未授权返回 401 JSON', async () => {
    const res = requireAdmin(req({}));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
    const body = await res!.json();
    expect(body.code).toBe(401);
  });
});

describe('ADMIN_TOKEN 未配置时拒绝一切（防裸奔）', () => {
  it('env 缺失时即使 header 命中空串也不通过', () => {
    jest.isolateModules(() => {
      const saved = process.env.ADMIN_TOKEN;
      delete process.env.ADMIN_TOKEN;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fresh = require('@/lib/admin-auth') as typeof import('@/lib/admin-auth');
      expect(fresh.verifyAdminAuth(req({ 'x-admin-token': 'anything' })).valid).toBe(false);
      process.env.ADMIN_TOKEN = saved;
    });
  });
});
