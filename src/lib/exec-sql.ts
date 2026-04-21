/**
 * 执行SQL的辅助函数
 * 用于在API路由中直接执行SQL语句
 */

// 直接执行SQL查询
export async function execSql(sql: string): Promise<unknown[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceKey) {
    console.error('Missing config:', { baseUrl, hasServiceKey: !!serviceKey });
    return [];
  }

  try {
    // 调用exec_sql RPC函数
    const response = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SQL执行失败:', errorText);
      return [];
    }

    const data = await response.json();
    
    // 处理返回的数据 - RPC函数返回TEXT
    if (typeof data === 'string') {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('SQL执行异常:', error);
    return [];
  }
}
