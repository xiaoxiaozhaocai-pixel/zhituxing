import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 上传简历内容
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    const { content, targetPosition } = await request.json();

    if (!content || content.trim().length < 50) {
      return NextResponse.json(
        { error: '简历内容不能少于50个字符' },
        { status: 400 }
      );
    }

    if (!targetPosition) {
      return NextResponse.json(
        { error: '请选择目标岗位' },
        { status: 400 }
      );
    }

    // 创建优化记录
    const result = await execSql(
      `INSERT INTO resume_optimizations (user_id, target_position, original_content, status)
       VALUES ('${userId}', '${targetPosition.replace(/'/g, "''")}', '${content.replace(/'/g, "''")}', 'pending')
       RETURNING id, created_at`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '创建优化任务失败' },
        { status: 500 }
      );
    }

    const record = result[0] as { id: string; created_at: string };

    // TODO: 这里可以触发异步任务调用智能体进行优化
    // 目前先标记为完成，模拟智能体返回的优化结果
    const mockOptimizedContent = `
## 优化后的简历内容

### 简历优化建议

1. **个人信息完善**
   - 建议添加清晰的求职意向描述
   - 确保联系方式准确无误

2. **工作经历优化**
   - 使用STAR法则描述工作成果
   - 量化工作成果（如：提升效率30%）

3. **技能描述提升**
   - 按掌握程度分层级展示
   - 添加与目标岗位相关的技能关键词

### 优化后的简历正文

[此处将由AI智能体重写完整简历内容]

### 面试准备建议

针对${targetPosition}岗位，建议准备以下面试内容：
1. 自我介绍（1-2分钟版本）
2. 项目经历详细介绍
3. 岗位相关专业知识
4. 职业规划阐述
`;

    const mockSuggestions = [
      { type: 'content', title: '求职意向', suggestion: '建议明确写出期望岗位和薪资范围' },
      { type: 'content', title: '工作经历', suggestion: '使用STAR法则量化工作成果' },
      { type: 'format', title: '排版格式', suggestion: '建议控制在一页A4纸内' },
      { type: 'skill', title: '技能关键词', suggestion: '增加与目标岗位匹配的技能描述' }
    ];

    // 更新优化结果
    await execSql(
      `UPDATE resume_optimizations 
       SET optimized_content = '${mockOptimizedContent.replace(/'/g, "''")}',
           suggestions = '${JSON.stringify(mockSuggestions).replace(/'/g, "''")}',
           status = 'completed',
           updated_at = NOW()
       WHERE id = '${record.id}'`
    );

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        status: 'completed',
        suggestions: mockSuggestions,
        optimized_content: mockOptimizedContent
      }
    });

  } catch (error) {
    console.error('简历优化失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
