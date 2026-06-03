/**
 * 生成批量INSERT语句
 */

const fs = require('fs');
const path = require('path');

// 读取SQL文件
const sqlPath = path.join(__dirname, '../sql/import_jobs_data.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

// 按分号分割并过滤空语句
const statements = sqlContent.split(';').filter(s => s.trim());

// 合并所有VALUES到一个INSERT语句
const insertMatch = statements[0].match(/INSERT INTO jobs \(([^)]+)\)/);
if (!insertMatch) {
  console.error('无法解析INSERT语句');
  process.exit(1);
}

const columns = insertMatch[1];
const allValues = statements.map(stmt => {
  const match = stmt.match(/VALUES \((.+)\)/s);
  return match ? `(${match[1]})` : null;
}).filter(Boolean);

const batchSql = `INSERT INTO jobs (${columns}) VALUES ${allValues.join(', ')};`;

// 输出到文件
const outputPath = path.join(__dirname, '../sql/import_jobs_batch.sql');
fs.writeFileSync(outputPath, batchSql);

console.log(`批量INSERT语句已生成`);
console.log(`包含 ${statements.length} 条数据`);
console.log(`文件: ${outputPath}`);
console.log(`\n前500字符预览:`);
console.log(batchSql.substring(0, 500) + '...');
