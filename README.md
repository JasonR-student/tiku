# NEURAL·思政 | 智能刷题终端

赛博朋克风思政题库AI刷题系统。508道精选题目，DeepSeek AI驱动，Vercel一键部署。

## 🚀 一键部署（推荐）

### 方案A：Vercel + Supabase（免费额度足够）

**1. 准备Supabase数据库（2分钟）**
- 访问 [supabase.com](https://supabase.com) 注册
- 创建项目 → SQL Editor → 粘贴 `db/init.sql` 全部执行
- Project Settings → Database → 复制 `Connection string` (URI格式)

**2. 一键部署到Vercel**
- Fork 本项目到你的GitHub
- 访问 [vercel.com](https://vercel.com) → Import Git Repository
- 填写环境变量（见下方）→ Deploy

**3. 题库已内置**（`cleaned_questions_final.json` + `ai_answers_cache.json` 508题含AI答案），无需额外导入。

### 方案B：Neon + Vercel
- [Neon.tech](https://neon.tech) 注册，创建数据库
- SQL Editor 执行 `db/init.sql`
- Dashboard 复制连接字符串
- Vercel导入项目，填环境变量即可

---

## ⚙️ 环境变量

在Vercel项目 Settings → Environment Variables 添加：

| 变量 | 说明 | 示例值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL连接字符串 | `postgresql://...` |
| `AI_API_URL` | AI接口地址 | `https://api.deepseek.com/v1/chat/completions` |
| `AI_API_KEY` | AI密钥 | `sk-xxxxxxxx` |
| `AI_MODEL_NAME` | 模型名称 | `deepseek-chat` |
| `AI_GENERATE_LIMIT` | 每题最大生成次数 | `2` |
| `AI_REQUEST_TIMEOUT` | AI超时(毫秒) | `30000` |
| `ADMIN_USERNAME` | 管理员用户名 | `admin` |
| `ADMIN_PASSWORD` | 管理员密码 | `your-password` |
| `ADMIN_TOKEN` | Bearer Token（可选） | 留空 |
| `ALLOW_REGISTRATION` | 开放注册 | `false` |

---

## 🏗️ 架构设计

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  浏览器       │────▶│  Vercel边缘   │────▶│  Supabase    │
│ (设备ID)     │     │  Next.js API │     │  PostgreSQL  │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  DeepSeek AI │
                    │  (缓存优先)   │
                    └──────────────┘
```

### 数据隔离
- **公共数据**：题库 `questions`、AI缓存 `ai_cache` → 全局共享，摊薄成本
- **私有数据**：答题进度、错题本、收藏 → 按设备ID隔离存储
- **身份体系**：首次访问自动生成UUID设备ID，无需注册登录
- **降级策略**：数据库不可用时自动降级为 localStorage 本地模式

---

## 📖 使用说明

### 学习模式
1. 点击首页「学习模式」
2. 选项自动乱序，键盘 `1-4` 选择，`Enter` 提交
3. AI即时生成解析，答案不一致时自动复核
4. 答错题目自动回到题池，反复练习直至掌握
5. 支持「重新生成AI解析」（每题1次额外机会）

### 模拟考试
- 固定题型：单选30×1 + 多选10×2 + 判断20×1 + 简答2×7 + 材料分析1×8 = 100分
- 限时60分钟，倒计时结束自动交卷
- 交卷后展示总分、正确率、用时分

---

## 📁 项目结构

```
├── app/                  # Next.js 14 App Router
│   ├── api/             # API路由（题库/AI/考试）
│   ├── study/           # 学习模式
│   ├── exam/            # 模拟考试
│   └── ...
├── components/          # UI组件（赛博朋克主题）
├── lib/                 # 工具库
│   ├── db.ts           # 数据库客户端
│   ├── ai.ts           # AI接口封装
│   ├── auth.ts         # 设备ID认证
│   └── types.ts        # 类型定义
├── db/init.sql          # 数据库建表脚本
├── scripts/             # Python工具脚本
│   ├── parse_bank.py   # Word题库解析
│   ├── ai_clean_bank.py # AI清洗题库
│   └── batch_ai_answers.py # 批量AI答案生成
├── cleaned_questions_final.json  # 清洗后的题库(508题)
└── ai_answers_cache.json         # AI答案缓存
```

---

## 🔧 本地开发

```bash
npm install
cp .env.example .env.local  # 编辑填写配置
npm run dev                  # http://localhost:3000
```

---

## 📄 License

MIT
