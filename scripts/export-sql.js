/**
 * 批量导入SQL到数据库
 * 读取SQL文件并分批执行
 */

const fs = require('fs');
const path = require('path');

// 读取SQL文件
const sqlPath = path.join(__dirname, '../sql/import_jobs_data.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

// 按分号分割SQL语句
const statements = sqlContent.split(';').filter(s => s.trim());

console.log(`共 ${statements.length} 条INSERT语句`);

// 导出为可在exec_sql中使用的格式
console.log('\n=== SQL语句列表 ===\n');

statements.forEach((stmt, i) => {
  const trimmed = stmt.trim();
  if (trimmed) {
    console.log(`-- 第 ${i + 1} 条 --`);
    console.log(trimmed + ';');
    console.log('');
  }
});
