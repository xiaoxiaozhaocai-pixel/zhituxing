## 诊断结果：描述不准

经过仔细比对，**契约、API 实际返回、context 消费三者字段名完全一致**，不存在 snake_case vs camelCase 的不匹配问题：

1. **契约 `QuotaDataSchema`** 使用全驼峰：`userType`, `quota`, `usedQuota`, `monthlyQuota`, `monthlyUsed`, `interviewQuota`, `assessmentQuota`, `memberExpiresAt`, `quotaResetTime`

2. **API `buildQuotaData()`** 返回的对象字段名也是全驼峰，与契约完全一致

3. **`MembershipContext.tsx`** 中根本没有 `fetchQuota()` 方法，也没有消费 `quota` 相关数据。它只处理 `/api/membership` 的 `MembershipData` 类型

**实际现象**：用户看到的 `NaN` 或 `undefined` 问题不在 `MembershipContext` 与 `quota` 契约之间，而是另有原因。可能的原因包括：
- 消费 `quota` 的页面直接调用了 `/api/quota` 但未正确解析响应
- 或者使用了其他 context（如 `QuotaContext`）但未正确映射字段

**建议**：请提供实际消费 `quota` 数据的页面代码或 context 代码，以便进一步定位问题。