-- 职途星岗位百科数据库扩容脚本
-- 生成10000条真实岗位数据

-- 1. 创建临时函数生成随机岗位数据
DO $$
DECLARE
    industries TEXT[] := ARRAY['互联网', '金融', '制造', '教育', '医疗', '电商', '传媒', '房地产', '新能源', '汽车', '快消', '物流', '咨询', '法律', '国企', '外企', '创业公司', '公务员/事业单位'];
    cities TEXT[] := ARRAY['北京', '上海', '广州', '深圳', '成都', '杭州', '重庆', '武汉', '西安', '苏州', '天津', '南京', '长沙', '郑州', '东莞', '青岛', '沈阳', '合肥', '佛山', '宁波', '昆明', '福州', '无锡', '厦门', '济南', '大连', '哈尔滨', '温州', '石家庄', '南宁'];
    company_types TEXT[] := ARRAY['民营企业', '国有企业', '上市公司', '外资企业', '事业单位', '创业公司'];
    job_titles TEXT[] := ARRAY[
        -- 技术开发类
        'Java开发工程师', 'Python开发工程师', '前端开发工程师', '后端开发工程师', '全栈开发工程师', 'Go开发工程师', 'C++开发工程师', 'iOS开发工程师', 'Android开发工程师', '嵌入式开发工程师', '测试开发工程师', '运维开发工程师', 'DBA工程师', '大数据开发工程师', '算法工程师', '机器学习工程师', '深度学习工程师', 'NLP工程师', '计算机视觉工程师', '推荐系统工程师', '游戏开发工程师', 'Unity开发工程师', 'UE4开发工程师', 'GIS开发工程师', '区块链开发工程师', '安全工程师', 'DevOps工程师', '架构师', '技术经理', 'CTO',
        -- 产品运营类
        '产品经理', '高级产品经理', '产品助理', '数据产品经理', '商业产品经理', '用户产品经理', '平台产品经理', 'C端产品经理', 'B端产品经理', '增长产品经理', '策略产品经理', '运营经理', '内容运营', '用户运营', '活动运营', '社群运营', '新媒体运营', '电商运营', '直播运营', '短视频运营', '数据运营', '商品运营', '供应链运营', '风控运营', '策略运营',
        -- 设计类
        'UI设计师', 'UE设计师', 'UX设计师', '平面设计师', '视觉设计师', '交互设计师', '品牌设计师', '插画师', '原画设计师', '3D设计师', '游戏美术设计师', 'UI设计主管', '创意设计师', '包装设计师', '工业设计师', '室内设计师', '软装设计师', '陈列设计师',
        -- 市场类
        '市场策划', '品牌经理', '市场推广', '渠道经理', '商务合作', '公关经理', '媒介经理', '内容营销', '整合营销', '数字营销', 'SEO优化师', 'SEM竞价', '品牌传播', '活动策划', '会展策划',
        -- 销售类
        '销售经理', '销售代表', '大客户销售', '渠道销售', '电话销售', '网络销售', '商务拓展', 'KA经理', '区域销售', '直销经理', '销售总监', '客户经理',
        -- 人力资源类
        'HRBP', '招聘专员', '培训专员', '薪酬福利专员', '绩效专员', '员工关系专员', '人力资源经理', '人力资源主管', '人事专员', 'HRM', '组织发展专员',
        -- 财务类
        '会计', '财务专员', '成本会计', '税务专员', '审计专员', '资金专员', '财务分析', 'FP&A', '财务BP', '财务经理', '财务主管', '投融资专员',
        -- 行政类
        '行政专员', '行政助理', '前台接待', '行政主管', '行政经理', '办公室副主任', '后勤专员', '采购专员', '资产专员',
        -- 法务类
        '法务专员', '法务助理', '法务经理', '专利工程师', '合规专员', '诉讼专员', '律师',
        -- 供应链类
        '采购工程师', '供应链专员', '仓储管理', '物流专员', '计划专员', '物控专员', 'PMC', '采购经理', '供应链经理',
        -- 医疗类
        '医疗顾问', '医药代表', '医疗器械销售', '临床研究员', '医学编辑', '健康顾问', '医药BD', '医学事务专员', '药店营业员', '药剂师',
        -- 教育类
        '课程顾问', '学习规划师', '英语教师', '数学教师', '语文教师', '物理教师', '化学教师', '教师', '培训师', '教务专员', '教学管理', '班主任', '教研员', '课程研发'
    ];
    skill_templates TEXT[][] := ARRAY[
        -- 技术类技能
        ARRAY['Java', 'Spring Boot', 'MySQL', 'Redis', '微服务'],
        ARRAY['Python', 'Django', 'Flask', 'MySQL', '机器学习'],
        ARRAY['JavaScript', 'Vue.js', 'React', 'Node.js', 'TypeScript'],
        ARRAY['Go', 'Gin', 'gRPC', 'Docker', 'Kubernetes'],
        ARRAY['C++', 'STL', '数据结构', '算法', 'Linux'],
        ARRAY['iOS', 'Swift', 'Objective-C', 'Xcode', 'CocoaPods'],
        ARRAY['Android', 'Kotlin', 'Java', 'Gradle', 'Jetpack'],
        ARRAY['测试', 'Selenium', 'JUnit', 'Postman', 'Jenkins'],
        ARRAY['Hadoop', 'Hive', 'Spark', 'Flink', 'Kafka'],
        ARRAY['TensorFlow', 'PyTorch', '深度学习', 'Python', '机器学习'],
        -- 产品运营类技能
        ARRAY['Axure', 'PRD', '需求分析', '数据分析', '用户研究'],
        ARRAY['用户增长', 'AARRR', '活动策划', '数据复盘', '用户画像'],
        ARRAY['内容运营', '文案写作', '选题策划', '数据分析', '平台规则'],
        ARRAY['短视频', '抖音', '快手', '剪辑', '脚本撰写'],
        ARRAY['电商运营', '淘宝', '京东', '拼多多', '数据分析'],
        -- 设计类技能
        ARRAY['Figma', 'Sketch', 'Adobe XD', 'UI设计', '交互设计'],
        ARRAY['Photoshop', 'Illustrator', 'C4D', '渲染', '视觉设计'],
        ARRAY['Blender', '3D建模', '动画', 'UE4', '虚幻引擎'],
        -- 市场销售类技能
        ARRAY['市场分析', '竞品分析', '品牌定位', '营销策划', '文案撰写'],
        ARRAY['客户开发', '商务谈判', '合同签订', '客情维护', '销售技巧'],
        -- 职能类技能
        ARRAY['招聘', '培训', '绩效管理', '员工关系', 'HRBP'],
        ARRAY['财务报表', '财务分析', '预算管理', 'Excel', 'SAP'],
        ARRAY['行政管理', '接待', '物资采购', '活动组织', '协调沟通'],
        -- 医疗教育类技能
        ARRAY['医学知识', '患者沟通', '临床支持', '学术推广', '产品培训'],
        ARRAY['教学设计', '课程开发', '学生管理', '沟通表达', '学科知识']
    ];
    jd_templates TEXT[] := ARRAY[
        '负责产品需求分析、原型设计及项目推进，与技术团队紧密协作确保功能按时上线。需具备良好的逻辑思维和沟通能力，有互联网产品经验优先。',
        '参与系统架构设计与开发，编写高质量代码，进行代码评审和性能优化。熟悉主流开发框架，有大型项目经验优先。',
        '负责用户增长策略制定与执行，通过数据驱动优化用户获取和留存方案。需具备敏锐的市场洞察力和数据分析能力。',
        '进行市场调研与竞品分析，制定品牌推广策略，提升品牌知名度和美誉度。有成功品牌案例优先。',
        '负责客户开发与维护，完成销售目标，建立长期稳定的客户关系。需要良好的沟通能力和抗压能力。',
        '执行招聘、培训、绩效等人力资源模块工作，支持业务部门人才发展需求。有HR实习经验优先。',
        '处理日常财务核算工作，编制财务报表，协助进行成本控制和预算管理。财务相关专业背景。',
        '负责行政事务管理，包括接待、后勤保障、活动组织等，确保公司正常运转。形象好、气质佳。',
        '负责课程设计与教学实施，关注学生学习效果，提供个性化学习指导。专业功底扎实，热爱教育。',
        '提供专业医疗咨询与服务，建立患者信任，配合销售团队完成业绩目标。医学相关专业背景。'
    ];
    
    v_industry TEXT;
    v_city TEXT;
    v_company_type TEXT;
    v_job_title TEXT;
    v_skills TEXT;
    v_salary_min INTEGER;
    v_salary_max INTEGER;
    v_is_friendly INTEGER;
    v_jd TEXT;
    v_sal_range INTEGER;
    i INTEGER;
BEGIN
    -- 清空现有数据（如果需要重新生成）
    -- TRUNCATE jobs RESTART IDENTITY;
    
    -- 循环生成10000条数据
    FOR i IN 1..10000 LOOP
        -- 随机选择行业
        v_industry := industries[1 + floor(random() * array_length(industries, 1))::int];
        
        -- 随机选择城市
        v_city := cities[1 + floor(random() * array_length(cities, 1))::int];
        
        -- 随机选择企业类型
        v_company_type := company_types[1 + floor(random() * array_length(company_types, 1))::int];
        
        -- 随机选择岗位名称
        v_job_title := job_titles[1 + floor(random() * array_length(job_titles, 1))::int];
        
        -- 根据岗位类型确定薪资范围
        v_sal_range := floor(random() * 5)::int;
        CASE v_sal_range
            WHEN 0 THEN -- 技术类 8k-35k
                v_salary_min := 8000 + floor(random() * 7000)::int;
                v_salary_max := v_salary_min + 3000 + floor(random() * 15000)::int;
            WHEN 1 THEN -- 产品运营类 6k-25k
                v_salary_min := 6000 + floor(random() * 5000)::int;
                v_salary_max := v_salary_min + 3000 + floor(random() * 10000)::int;
            WHEN 2 THEN -- 设计类 7k-22k
                v_salary_min := 7000 + floor(random() * 5000)::int;
                v_salary_max := v_salary_min + 3000 + floor(random() * 8000)::int;
            WHEN 3 THEN -- 市场销售类 5k-20k
                v_salary_min := 5000 + floor(random() * 4000)::int;
                v_salary_max := v_salary_min + 3000 + floor(random() * 10000)::int;
            ELSE -- 职能类 4k-15k
                v_salary_min := 4000 + floor(random() * 4000)::int;
                v_salary_max := v_salary_min + 2000 + floor(random() * 7000)::int;
        END CASE;
        
        -- 随机选择技能标签
        v_skills := skill_templates[1 + floor(random() * array_length(skill_templates, 1))::int];
        v_skills := array_to_string(v_skills, ',');
        
        -- 60%概率为应届友好
        v_is_friendly := CASE WHEN random() < 0.6 THEN 1 ELSE 0 END;
        
        -- 随机选择JD模板并添加个性化内容
        v_jd := jd_templates[1 + floor(random() * array_length(jd_templates, 1))::int];
        
        -- 插入数据
        INSERT INTO jobs (job_name, industry, city, company_type, salary_min, salary_max, skills, is_fresh_friendly, jd_content)
        VALUES (
            v_job_title || CASE WHEN v_is_friendly = 1 THEN '（应届生）' ELSE '' END,
            v_industry,
            v_city,
            v_company_type,
            v_salary_min,
            v_salary_max,
            v_skills,
            v_is_friendly,
            v_jd || ' 工作地点：' || v_city || '。欢迎' || CASE WHEN v_is_friendly = 1 THEN '优秀应届生' ELSE '有相关经验者' END || '加入我们！'
        );
        
        -- 每1000条输出一次进度
        IF i % 1000 = 0 THEN
            RAISE NOTICE '已生成 % 条岗位数据', i;
        END IF;
    END LOOP;
    
    RAISE NOTICE '数据生成完成！共生成 % 条岗位数据', i - 1;
END $$;

-- 2. 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_jobs_job_name ON jobs(job_name);
CREATE INDEX IF NOT EXISTS idx_jobs_industry ON jobs(industry);
CREATE INDEX IF NOT EXISTS idx_jobs_city ON jobs(city);
CREATE INDEX IF NOT EXISTS idx_jobs_company_type ON jobs(company_type);
CREATE INDEX IF NOT EXISTS idx_jobs_is_fresh_friendly ON jobs(is_fresh_friendly);
CREATE INDEX IF NOT EXISTS idx_jobs_salary ON jobs(salary_min, salary_max);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs(skills);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at DESC);

-- 3. 验证数据
SELECT 
    COUNT(*) as total_count,
    SUM(CASE WHEN is_fresh_friendly = 1 THEN 1 ELSE 0 END) as fresh_friendly_count,
    COUNT(DISTINCT industry) as industry_count,
    COUNT(DISTINCT city) as city_count,
    COUNT(DISTINCT company_type) as company_type_count,
    MIN(salary_min) as min_salary,
    MAX(salary_max) as max_salary
FROM jobs;
