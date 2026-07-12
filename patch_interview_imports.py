import sys

with open('src/app/api/interview/route.ts', 'r') as f:
    content = f.read()

# Update import to include InterviewType and buildInterviewSystemPrompt
old_import = "import {\n  type InterviewStyle,\n  INTERVIEW_STYLES,\n  buildStylePrompt,\n  buildDebriefPrompt,\n  detectDebriefIntent,\n  detectStyleSwitch,\n} from '@/lib/interview-styles';"

new_import = "import {\n  type InterviewStyle,\n  type InterviewType,\n  INTERVIEW_STYLES,\n  INTERVIEW_TYPES,\n  buildInterviewSystemPrompt,\n  buildDebriefPrompt,\n  detectDebriefIntent,\n  detectStyleSwitch,\n} from '@/lib/interview-styles';"

content = content.replace(old_import, new_import)

# Update request body parsing - add interview_type
old_body = "const body = await request.json();\n    const { message, conversationId, style: reqStyle, mode: reqMode } = body;"
new_body = "const body = await request.json();\n    const { message, conversationId, style: reqStyle, mode: reqMode, interview_type: reqInterviewType } = body;"
content = content.replace(old_body, new_body)

# Add interview type resolution after style resolution
old_type_resolve = "    // 多风格支持：默认温和模式\n    const style: InterviewStyle = (['warm', 'strict', 'pressure'].includes(reqStyle) ? reqStyle : 'warm') as InterviewStyle;"
new_type_resolve = "    // 多风格支持：默认温和模式\n    const style: InterviewStyle = (['warm', 'strict', 'pressure'].includes(reqStyle) ? reqStyle : 'warm') as InterviewStyle;\n\n    // 面试类型（P6.2新增）：常规/压力/无领导/英文\n    const interviewType: InterviewType = (['standard', 'pressure', 'group', 'english'].includes(reqInterviewType) ? reqInterviewType : 'standard') as InterviewType;"
content = content.replace(old_type_resolve, new_type_resolve)

# Update the DEMO_INTERVIEW_INTRO to include new types
old_intro = "const DEMO_INTERVIEW_INTRO = `👋 嘿，我是小职～\n\n模拟面试已就绪，我准备了三种风格陪你练：\n\n🤝 **温和模式** — 像朋友一样聊天，给足鼓励和引导\n🎯 **严格模式** — 专业严谨，追问细节和数据\n⚡ **压力模式** — 高压追问，提前适应最难面试\n\n回复「温和」「严格」或「压力」选择风格，或者直接告诉我你想面试的岗位，我默认用温和模式开始～\n`;"
new_intro = "const DEMO_INTERVIEW_INTRO = `👋 嘿，我是小职～\n\n模拟面试已就绪！我支持四种面试类型：\n\n🤝 **常规面试** — 真实校招全流程模拟\n⚡ **压力面试** — 高压追问，测试抗压能力\n👥 **无领导小组讨论** — 模拟群面，一人分饰多角\n🌍 **英文面试** — 全英文模拟，提升国际竞争力\n\n同时三种风格任你切换：温和 / 严格 / 压力\n\n告诉我你想面试什么岗位，我默认用【常规面试+温和模式】开始～\n`;"
content = content.replace(old_intro, new_intro)

# Replace buildStylePrompt with buildInterviewSystemPrompt in the POST handler
# Find the system prompt building section
old_system_prompt = "        // 构建系统提示词：面试模式 vs 本尊点评\n        let systemPrompt: string;\n        if (isDebrief) {\n          systemPrompt = buildDebriefPrompt(effectiveStyle, ragContext);\n        } else {\n          systemPrompt = buildStylePrompt(effectiveStyle, ragContext);\n        }"
new_system_prompt = "        // 构建系统提示词：面试模式 vs 本尊点评\n        let systemPrompt: string;\n        if (isDebrief) {\n          systemPrompt = buildDebriefPrompt(interviewType, effectiveStyle, ragContext);\n        } else {\n          systemPrompt = buildInterviewSystemPrompt(interviewType, effectiveStyle, ragContext);\n        }"
content = content.replace(old_system_prompt, new_system_prompt)

with open('src/app/api/interview/route.ts', 'w') as f:
    f.write(content)

print("Patched successfully")
