# 泼茶 · 半私域读书纸条墙

> 一个让你和朋友共享读书札记的 Web App。前端 Vercel，数据 Supabase，钉钉做镜像。

## 链接

- 朋友访问：`https://poucha-xxx.vercel.app/?t=poucha-2026-friends`
- 你审核：`https://poucha-xxx.vercel.app/admin` → 贴入 ADMIN_TOKEN

## 部署 SOP（首次约 20 分钟）

### 1. 创建 Supabase 项目

1. 打开 https://supabase.com → Sign in（用 GitHub）
2. New Project，Region 选 `Northeast Asia (Tokyo)` 或 `Singapore`（杭州延迟较低）
3. 等待初始化 ~2 分钟
4. 在 Project Settings → API 复制：
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key → `SUPABASE_SERVICE_KEY`（注意：service_role，不是 anon）
5. 在 SQL Editor 打开 `supabase/migrations/0001_init.sql` 粘贴，点 Run。应看到 5 条种子被插入。

### 2. 准备 Vercel 项目

1. 把 `poucha/` 整个目录推到 GitHub 仓库（建议 private）
   ```bash
   cd outputs/poucha
   git init
   git add .
   git commit -m "init poucha v0.2"
   gh repo create poucha --private --source=. --push
   # 或手动 git remote add origin && git push -u origin main
   ```
2. 打开 https://vercel.com → Add New Project → Import 这个仓库
3. **Build & Output Settings 全部留空**（这是个 Edge Functions + 静态 HTML 项目，Vercel 自动识别）
4. Environment Variables 填入以下 8 项：

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | （Supabase 复制的 Project URL）|
   | `SUPABASE_SERVICE_KEY` | （Supabase 复制的 service_role key）|
   | `PUBLIC_TOKEN` | `poucha-2026-friends` |
   | `ADMIN_TOKEN` | 生成一个 32 字节随机串（见下） |
   | `SALT` | 生成一个 32 字节 base64（见下） |
   | `DINGTALK_APP_KEY` | （钉钉开放平台应用的 AppKey）|
   | `DINGTALK_APP_SECRET` | （钉钉应用 AppSecret）|

   生成随机密钥的快捷方式：
   ```bash
   # ADMIN_TOKEN
   openssl rand -hex 32
   # SALT
   openssl rand -base64 32
   ```

5. Deploy。等 1-2 分钟。
6. 拿到形如 `poucha-xxx.vercel.app` 的域名。

### 3. 验收

- 朋友链接：`https://poucha-xxx.vercel.app/?t=poucha-2026-friends`
  - 不带 `?t=` 应该显示「请通过完整的邀请链接进入」
  - 带正确 token 应能看到 5 条种子纸条
  - 提交一条新纸条，应该 toast 「已投递 · 等候局长上墙」，但前台暂不显示
- 管理台：`https://poucha-xxx.vercel.app/admin`
  - 贴入 ADMIN_TOKEN，应看到刚才那条 pending
  - 点通过，回到前台刷新应看到上墙
- cron：在 Vercel 项目设置里 Cron 应该看到一条 `30 14 * * *`（UTC，对应 UTC+8 22:30）

### 4. 钉钉镜像（可选）

如果你跳过钉钉变量，cron 同步会失败但不影响主功能。开启需：

1. 到 https://open-dev.dingtalk.com 创建一个企业内部应用
2. 应用 → 凭证基本信息：复制 AppKey + AppSecret 到 Vercel env
3. 应用 → 权限管理：开 `AI 表格` 读写权限
4. 应用 → 协作空间：把"悄悄话墙·吉光片羽"基础信息表（base `o14dA3GK8gQlkoYwcnpdLjaPV9ekBD76`）共享给应用
5. 在 Vercel Deployment → Functions → `/api/cron/sync-dingding` 点 Test，应返回 `{synced: N}`

## 目录结构

```
poucha/
├── public/
│   ├── index.html         前台（原 泼茶_v0.1.html 改造）
│   └── admin.html         管理台
├── api/
│   ├── feathers.ts        GET /api/feathers   公开读
│   ├── drop.ts            POST /api/drop      公开投递
│   ├── admin/
│   │   ├── pending.ts     GET 拉待审核
│   │   ├── approve.ts     POST 通过
│   │   └── reject.ts      POST 拒绝
│   └── cron/
│       └── sync-dingding.ts  每晚 22:30 同步到钉钉
├── lib/
│   ├── supabase.ts        Supabase client
│   ├── auth.ts            token 校验 + IP hash
│   └── dingtalk.ts        钉钉 OpenAPI 封装
├── supabase/
│   └── migrations/
│       └── 0001_init.sql  Postgres schema + 种子
├── vercel.json            cron 配置
├── package.json
├── tsconfig.json
└── .env.example
```

## 本地开发

```bash
npm install
npx vercel link             # 关联到 Vercel 项目
npx vercel env pull         # 拉环境变量到 .env.local
npx vercel dev              # 启动 localhost:3000
```

打开 `http://localhost:3000/?t=poucha-2026-friends`

## 维护小事

- **删一条纸条**：去 Supabase Dashboard → Table Editor → feathers → 把 status 改为 `hidden`
- **改 token**：Vercel env 改 PUBLIC_TOKEN，重新 Deploy。旧链接立即失效
- **看投递日志**：Supabase → drop_log 表
- **同步失败重试**：feathers 表里 synced_dingding=false 的下次 cron 会重试

## 数据流图

```
朋友浏览器
   ├ GET /api/feathers?t=PUB → Supabase WHERE status='live'
   └ POST /api/drop          → Supabase INSERT status='pending'

你的浏览器（/admin）
   ├ GET /api/admin/pending  → Supabase WHERE status='pending'
   └ POST /api/admin/approve → Supabase UPDATE status='live'

Vercel cron (UTC 14:30 / UTC+8 22:30)
   └ /api/cron/sync-dingding → Supabase 取未同步 live 条
                            → 钉钉 hERWDMS 表 batchCreate
                            → 标 synced_dingding=true
```
