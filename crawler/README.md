# IWasThere 事件驱动爬虫

实时监控体育/娱乐赛事比分变化，自动从多平台搜索并下载"在现场"视频模板。

## 总览

```
TheSportsDB (赛程+比分) → 热度筛选 → 多平台视频搜索 → 视频质量筛选 → 下载+上传 Worker
```

**核心指标：** 事件发生后 3-5 分钟内，获取 2-5 个不同角度的现场视频。

---

## 数据流

```
┌──────────────────────────────────────────────────────────┐
│ 阶段 1：事件发现 (TheSportsDB)                              │
│                                                          │
│ 每 60s 轮询 eventsday.php                                 │
│ → 比赛状态变成 LIVE → 开始监控                             │
│ → 比分变化 (0→1) → 触发事件                                │
│                                                          │
│ 示例：Mexico vs South Africa，23分钟，1-0                   │
└──────────────────────┬───────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段 2：热度筛选                                           │
│                                                          │
│ hotness = 联赛权重 × 比赛阶段 × 比分重要性                  │
│         = 100 × 1.0 × 1.5 = 150                          │
│ 150 ≥ 40 阈值 ✅ → 触发视频搜索                            │
│                                                          │
│ 友谊赛 hotness = 30 → ❌ 不触发                            │
└──────────────────────┬───────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段 3：多平台并行搜索                                      │
│                                                          │
│ 关键词: "Mexico goal" "Mexico South Africa" "México gol"  │
│                                                          │
│ TikTok ──→ tikwm.com/api/feed/search ──→ ~10 个候选       │
│ Reddit ──→ r/soccer/search.rss?sort=new ──→ ~5 个候选     │
│ YouTube ─→ Data API search?order=date ──→ ~3 个候选       │
│                                                          │
│ 合计：~18 个候选                                           │
└──────────────────────┬───────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段 4：视频筛选                                           │
│                                                          │
│ ① 相关性过滤：标题不含事件关键词 → 去掉                    │
│ ② 时效过滤：发布时间太旧 → 去掉                            │
│ ③ 质量打分：平台 + 内容特征 + 热度 → 排序                   │
│ ④ 去重：同一 video URL → 只保留一次                        │
│ ⑤ 数量限制：每个事件最多 N 个                              │
│                                                          │
│ 18 个候选 → 筛选 → 4 个进入下载队列                        │
└──────────────────────┬───────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段 5：下载 + 上传                                        │
│                                                          │
│ TikTok  → HTTP 直接下载 (无水印 mp4)                       │
│ Reddit  → yt-dlp 下载 (YouTube/Streamable/v.redd.it)      │
│ YouTube → yt-dlp 下载                                     │
│                                                          │
│ → ffmpeg 质量检查/重编码 → 缩略图提取                       │
│ → multipart form POST /admin/events                      │
│ → R2 存储 + D1 记录                                       │
│                                                          │
│ 🎉 进球后 3-5 分钟，4 个不同角度的视频模板已入库             │
└──────────────────────────────────────────────────────────┘
```

---

## 阶段 1：事件发现

### 数据源

**TheSportsDB**（免费，无需 API Key）

```
GET https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d={date}&s=Soccer
```

返回数据示例：
```json
{
  "events": [
    {
      "strEvent": "Mexico vs South Africa",
      "strLeague": "FIFA World Cup",
      "strHomeTeam": "Mexico",
      "strAwayTeam": "South Africa",
      "intHomeScore": 1,
      "intAwayScore": 0,
      "strStatus": "LIVE",
      "strTime": "19:00:00",
      "strVenue": "Estadio Azteca",
      "intRound": "1",
      "strSeason": "2026",
      "strGroup": "A"
    }
  ]
}
```

### 轮询逻辑

```
每 60 秒：
  1. 获取今天所有比赛
  2. 筛选状态为 LIVE 的比赛
  3. 对比上一次缓存的比分
  4. 比分变化 → 触发事件
  5. 更新缓存
```

### 状态说明

| strStatus | 含义 | 是否监控 |
|-----------|------|----------|
| NS (Not Started) | 未开始 | ❌ |
| LIVE | 进行中 | ✅ |
| FT (Finished) | 已结束 | ❌ |

---

## 阶段 2：热度筛选

不是每个比分变化都值得抓。通过打分机制过滤低关注度事件。

### 联赛权重

| 联赛 | 权重 |
|------|------|
| FIFA World Cup | 100 |
| UEFA Champions League | 90 |
| NBA / NFL | 85 |
| English Premier League | 80 |
| La Liga / Serie A / Bundesliga | 70 |
| MLB / NHL | 60 |
| 次级联赛 | 30 |
| 友谊赛 | 10 |

### 比赛阶段加权

| 阶段 | 系数 |
|------|------|
| Final（决赛） | ×2.0 |
| Semi-Final（半决赛） | ×1.5 |
| Quarter-Final | ×1.3 |
| Round of 16 | ×1.2 |
| Group Stage / Regular Season | ×1.0 |

### 比分变化重要性

| 变化类型 | 系数 |
|----------|------|
| 打破僵局（0→1） | ×1.5 |
| 扳平球 | ×1.5 |
| 反超球 | ×1.3 |
| 80分钟后的进球 | ×2.0 |
| 扩大比分（2→3, 3→4） | ×0.7 |

### 阈值

```
hotness = 联赛权重 × 比赛阶段 × 比分重要性

hotness ≥ 40  →  触发视频搜索
hotness < 40  →  忽略
```

**示例：**

| 场景 | 计算 | 结果 |
|------|------|------|
| 世界杯决赛进球 | 100 × 2.0 × 1.5 = 300 | ✅ 触发 |
| 世界杯小组赛进球 | 100 × 1.0 × 1.5 = 150 | ✅ 触发 |
| 英超常规进球 | 80 × 1.0 × 1.5 = 120 | ✅ 触发 |
| MLB 常规得分 | 60 × 1.0 × 1.0 = 60 | ✅ 触发 |
| 友谊赛进球 | 10 × 1.0 × 1.5 = 15 | ❌ 忽略 |

---

## 阶段 3：多平台视频搜索

### 关键词生成

```
输入：{homeTeam: "Mexico", awayTeam: "South Africa", score: "1-0", league: "FIFA World Cup"}

生成：
  1. "{homeTeam} {awayTeam} goal"         → "Mexico South Africa goal"
  2. "{homeTeam} goal {league}"           → "Mexico goal World Cup"
  3. "{homeTeam} {awayTeam} {score}"      → "Mexico South Africa 1-0"
  4. "{homeTeam} highlight {league}"      → "Mexico highlight World Cup"
  5. "{homeTeam} {awayTeam} gol"          → "Mexico South Africa gol" (多语言)
```

### 3.1 TikTok

**API：** `https://www.tikwm.com/api/feed/search?keywords={keyword}&count=10`

**特点：**
- 无需 API Key，免费
- 返回视频列表：video_id, title, play_count, duration, cover, play (下载URL)
- 手机直拍，现场原声，天然"我在现场"感
- 播放量可作为热度信号

**下载方式：** HTTP 直接下载 `play` 字段（无水印 mp4），无需 yt-dlp

**搜索延迟：** 事件后 30s ~ 5min

### 3.2 Reddit

**API：** `https://www.reddit.com/r/{subreddit}/search.rss?q={keyword}&sort=new&restrict_sr=on`

**搜索 subreddit 列表：**
```
soccer, sports, nba, nfl, worldcup, mma, ufc, 
formula1, hockey, baseball, tennis, cricket
```

**特点：**
- 无需认证（RSS 公开）
- `sort=new` 拿到最新帖子
- 帖子外链多样：YouTube, Streamable, Streamja, v.redd.it
- 球迷社区，多个角度

**下载方式：** yt-dlp（自动处理不同域名）

**搜索延迟：** 事件后 30s ~ 3min

### 3.3 YouTube

**API：** YouTube Data API v3

```
GET https://www.googleapis.com/youtube/v3/search
  ?q={keyword}&order=date&type=video&videoDuration=short&key={YOUTUBE_API_KEY}
```

**特点：**
- 需要 `YOUTUBE_API_KEY`（Google Cloud 免费配额 10,000 单位/天）
- 高清回放、官方角度
- 出现速度比 TikTok/Reddit 慢

**下载方式：** yt-dlp

**搜索延迟：** 事件后 3min ~ 10min

**不填 API Key 则自动跳过此源。**

---

## 阶段 4：视频筛选

### 4.1 相关性过滤

标题必须包含至少一个事件关键词（球队名、联赛名），否则丢弃。

```
✅ "Mexico vs South Africa Highlights Today"    → 匹配 "Mexico" + "South Africa"
✅ "🇲🇽 México #gol #mundial"                    → 匹配 "México" + "gol"
❌ "Best goals in football history"              → 无当前事件关键词
❌ "Mexico travel vlog"                          → 无比赛关键词
```

### 4.2 时效过滤

| 平台 | 最大发布时间 | 原因 |
|------|-------------|------|
| Reddit | 30 分钟 | 粉丝发帖最快 |
| TikTok | 2 小时 | 上传有延迟 |
| YouTube | 4 小时 | 高清处理需要时间 |

### 4.3 质量打分

| 维度 | 条件 | 分值 |
|------|------|------|
| **平台** | TikTok | +40 |
| | Reddit (体育 subreddit) | +30 |
| | Reddit (其他 subreddit) | +15 |
| | YouTube | +10 |
| **内容** | 标题含 "highlight/clip/goal/gol" | +15 |
| | 标题含球员姓名 | +10 |
| | 时长 10-120 秒 | +10 |
| | 时长 < 5 秒 | -30 |
| | 时长 > 5 分钟 | -30 |
| | 竖屏视频 (YouTube Shorts) | -50 |
| **热度** | TikTok 播放量 > 10万 | +20 |
| | TikTok 播放量 > 1万 | +10 |
| | Reddit 点赞 > 1000 | +20 |
| **域名** | Streamable / Streamja | +20 |
| | v.redd.it | +15 |

**合格线：分数 ≥ 50 → 进入下载队列**

### 4.4 去重

按视频的实际 URL/ID 去重（不是按发帖去重）：

- YouTube：按 `videoId` 去重
- TikTok：按 `video_id` 去重
- Streamable：按完整 URL 去重
- 同一视频被不同人发多次 → 只保留最早出现的那条帖子

### 4.5 数量限制

每个事件最多下载 **5** 个视频（`MAX_VIDEOS_PER_EVENT`），按分数从高到低取。

---

## 阶段 5：下载 + 上传

复用现有 `downloader.ts` 和 `uploader.ts` 逻辑。

### 下载流程

```
TikTok:    HTTP GET play URL → raw.mp4 → ffmpeg 质量检查/重编码
Reddit:    yt-dlp 下载外链 → raw.mp4 → ffmpeg 质量检查/重编码
YouTube:   yt-dlp 下载 → raw.mp4 → ffmpeg 质量检查/重编码
```

- 最低质量：720p, 24fps
- 超过 720p → 自动缩放到 720p
- 超过 24fps → 降到 24fps
- 文件上限：100MB
- 缩略图：优先下载原图，失败则从视频提取第 1/3/5 秒帧

### 上传流程

```
POST /admin/events
Authorization: Bearer {CRAWLER_TOKEN}
Content-Type: multipart/form-data

  title:     "Mexico vs South Africa - Goal 23' (World Cup)"
  category:  "sports"
  video:     {mp4 file}
  thumbnail: {jpg file}
  status:    "draft"
```

---

## 项目文件结构

```
crawler/src/
├── index.ts              # 主循环：事件驱动 + 并行搜索 + 下载上传
├── scorer.ts             # 🆕 热度打分 + 视频质量打分 + 去重
├── downloader.ts         # 不变：yt-dlp/HTTP 下载 + ffmpeg 处理
├── uploader.ts           # 不变：multipart 上传 Worker
├── state.ts              # 不变：seen URL 去重持久化
├── types.ts              # 小改：加事件相关类型
└── sources/
    ├── thesportsdb.ts    # 🆕 赛程查询 + 比分轮询 + 事件触发
    ├── tiktok.ts         # 🆕 tikwm API 搜索 + 下载
    ├── reddit.ts         # 大改：keyword search + 保留原有 RSS 爬取
    ├── youtube.ts        # 小改：keyword search 方法
    └── pexels.ts         # 不变：VIP 热门视频
```

---

## 配置项 (`.env`)

```env
# ── 爬虫模式 ──────────────────────────────
# event-driven: 事件驱动（TheSportsDB → 搜索 → 下载）
# passive:      被动爬取（Reddit + YouTube 频道 RSS，原模式）
CRAWL_MODE=event-driven

# ── 事件驱动配置 ──────────────────────────
MAX_VIDEOS_PER_EVENT=5       # 每个事件最多下载几个视频
MIN_HOTNESS_SCORE=40         # 触发视频搜索的最低热度分
POLL_INTERVAL_SEC=60         # TheSportsDB 轮询间隔

# ── 搜索源开关 ─────────────────────────────
ENABLE_TIKTOK=true           # TikTok 搜索（推荐开启，现场感最强）
ENABLE_REDDIT=true           # Reddit 关键词搜索
ENABLE_YOUTUBE=false         # YouTube Data API（需要 YOUTUBE_API_KEY）

# ── API Keys ───────────────────────────────
YOUTUBE_API_KEY=             # Google Cloud API Key（可选）
PEXELS_API_KEY=              # Pexels API Key（可选）

# ── 原配置不变 ──────────────────────────────
WORKER_URL=https://hotinsert-api.zhengbijun123.workers.dev
CRAWLER_TOKEN=...
CRON_SCHEDULE=*/10 * * * *   # passive 模式下的定时频率
MAX_PER_SOURCE=5
```

---

## 运行方式

```bash
# 安装依赖
cd crawler
pnpm install

# 开发模式（直接运行）
pnpm dev

# 生产模式
pnpm start
```

---

## 与旧模式对比

| 维度 | 旧模式（被动爬取） | 新模式（事件驱动） |
|------|------------------|-------------------|
| 发现方式 | 定时爬 30+ subreddit hot | 比分变化即时触发 |
| 时效性 | 几小时前的热门 | 事件发生后 3-5 分钟 |
| 相关性 | 大量噪声（搞笑、日常） | 精准事件匹配 |
| 视频来源 | Reddit + YouTube 频道 | TikTok + Reddit + YouTube |
| 现场感 | 一般（多数是官方视频） | 强（TikTok 手机直拍） |
| 去重 | 按帖子 URL | 按视频 URL/ID |
| 依赖 | 无 | 无（TheSportsDB + tikwm 均免费） |
