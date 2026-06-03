# Admin后台认证修复 - 环境变量配置说明

## 已完成的代码修复

### 问题根因
1. **UUID格式问题**: `getAuthenticatedUserId()` 返回UUID格式，但代码用 `Number(userId)` 转成数字，导致 NaN
2. **is_admin列缺失**: user_profiles表没有 is_admin 列，查询会失败

### 修复的文件
- `src/app/api/admin/auth/route.ts` - 移除Number()转换，使用UUID直接判断
- `src/app/api/admin/users/route.ts` - checkAdmin改用环境变量ADMIN_USER_IDS
- `src/app/api/admin/diagnostics/route.ts` - checkAdmin改用环境变量ADMIN_USER_IDS
- `src/app/api/admin/skills/route.ts` - checkAdmin改用环境变量ADMIN_USER_IDS

## 需要配置的环境变量

### 在Zeabur控制台添加

**变量名**: `ADMIN_USER_IDS`
**值**: `0e879f0d-180f-44f2-8b33-1960e9a2412c`

如果是多个admin，用逗号分隔:
```
ADMIN_USER_IDS=uuid1,uuid2,uuid3
```

### 配置步骤 (Zeabur控制台)
1. 登录 https://console.zeabur.com
2. 选择 zhituxing 项目
3. 进入 zhituxing 服务
4. 点击 Settings -> Environment Variables
5. 添加变量:
   - Name: `ADMIN_USER_IDS`
   - Value: `0e879f0d-180f-44f2-8b33-1960e9a2412c`
6. 点击 Save，Zeabur会自动重新部署

## 验证方式

部署完成后，访问 https://zhituxing.zeabur.app/admin

使用18775139647@phone.temp账号登录（UUID: 0e879f0d-180f-44f2-8b33-1960e9a2412c）

应该能看到admin后台界面，而不是"无权访问"页面。
