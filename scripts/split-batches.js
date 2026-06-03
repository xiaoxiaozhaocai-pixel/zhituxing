/**
 * 分批执行SQL导入
 * 把115条数据分成6批，每批约20条
 */

const fs = require('fs');
const path = require('path');

// 读取SQL文件
const sqlPath = path.join(__dirname, '../sql/import_jobs_data.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

// 按分号分割并过滤空语句
const statements = sqlContent.split(';').filter(s => s.trim());

// 分批，每批20条
const batchSize = 20;
const batches = [];

for (let i = 0; i < statements.length; i += batchSize) {
  const batch = statements.slice(i, i + batchSize);
  batches.push(batch);
}

console.log(`共 ${statements.length} 条数据，分成 ${batches.length} 批\n`);

// 生成每批的SQL
batches.forEach((batch, batchIndex) => {
  const insertMatch = batch[0].match(/INSERT INTO jobs \(([^)]+)\)/);
  if (!insertMatch) return;
  
  const columns = insertMatch[1];
  const allValues = batch.map(stmt => {
    const match = stmt.match(/VALUES \((.+)\)/s);
    return match ? `(${match[1]})` : null;
  }).filter(Boolean);
  
  const batchSql = `INSERT INTO jobs (${columns}) VALUES ${allValues.join(', ')};`;
  
  // 输出文件名
  const outputPath = path.join(__dirname, `../sql/import_jobs_batch_${batchIndex + 1}.sql`);
  fs.writeFileSync(outputPath, batchSql);
  console.log(`批次 ${batchIndex + 1}: ${batch.length} 条 -> ${outputPath}`);
});

console.log('\n批次SQL文件已生成');
