/**
 * 执行SQL的辅助函数
 * 用于在API路由中直接执行SQL语句
 * 支持参数化查询，防止SQL注入
 */

/**
 * PostgreSQL参数安全转义
 * 将参数值转换为安全的SQL字面量
 */
export function escapeParam(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  if (typeof value === 'number') {
    return String(value);
  }
  
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  
  if (typeof value === 'string') {
    // PostgreSQL标准转义：单引号替换为两个单引号
    const escaped = value.replace(/'/g, "''");
    return `'${escaped}'`;
  }
  
  if (value instanceof Date) {
    const escaped = value.toISOString().replace(/'/g, "''");
    return `'${escaped}'`;
  }
  
  // 其他类型：JSON序列化后转义
  const jsonStr = JSON.stringify(value);
  const escaped = jsonStr.replace(/'/g, "''");
  return `'${escaped}'`;
}

// 执行SQL查询（支持参数化）
export async function execSql(template: string, ...params: any[]): Promise<unknown[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!baseUrl || !serviceKey) {
    console.error('Missing config:', { baseUrl, hasServiceKey: !!serviceKey });
    return [];
  }

  try {
    let finalSql: string;
    
    if (params.length === 0) {
      // 旧调用方式：直接执行SQL字符串
      finalSql = template;
    } else {
      // 新调用方式：参数化查询（安全）
      // 将 %L 占位符依次替换为转义后的参数值
      let index = 0;
      finalSql = template.replace(/%L/g, () => {
        if (index < params.length) {
          return escapeParam(params[index++]);
        }
        return '%L'; // 参数不足，保留占位符
      });
    }

    // 调用exec_sql RPC函数
    const response = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: finalSql })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('SQL执行失败:', errorText);
      return [];
    }

    const data = await response.json();
    
    // 处理返回的数据 - RPC函数返回TEXT
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        console.error('[execSql] Failed to parse string data');
        return [];
      }
    }
    // RPC可能返回已解析的数组或对象
    if (Array.isArray(data)) {
      return data;
    }
    if (data && typeof data === 'object') {
      // 可能是 {result: "..."} 格式
      if (data.result && typeof data.result === 'string') {
        try {
          return JSON.parse(data.result);
        } catch {
          return [];
        }
      }
      // 可能是已解析的单行数据
      if (data.dau !== undefined || data.cnt !== undefined || data.count !== undefined || data.total !== undefined) {
        return [data];
      }
      // affected:true 表示SQL可能执行失败返回了元数据
      console.error('[execSql] Unexpected data format:', JSON.stringify(data).substring(0, 200));
      return [];
    }
    console.error('[execSql] Unknown data type:', typeof data);
    return [];
  } catch (error) {
    console.error('SQL执行异常:', error);
    return [];
  }
}
