// 钉钉 AI 表格写入 SDK 封装
// 文档：https://open.dingtalk.com/document/orgapp/yida-open-api-overview

const APP_KEY    = process.env.DINGTALK_APP_KEY    || '';
const APP_SECRET = process.env.DINGTALK_APP_SECRET || '';
const BASE_ID    = process.env.DINGTALK_BASE_ID    || '';
const TABLE_ID   = process.env.DINGTALK_TABLE_ID   || '';

let cachedToken: { value: string; expireAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expireAt > Date.now() + 60_000) {
    return cachedToken.value;
  }
  const res = await fetch('https://api.dingtalk.com/v1.0/oauth2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appKey: APP_KEY, appSecret: APP_SECRET })
  });
  const data: any = await res.json();
  if (!data.accessToken) throw new Error('get accessToken failed: ' + JSON.stringify(data));
  cachedToken = {
    value: data.accessToken,
    expireAt: Date.now() + (data.expireIn || 7200) * 1000
  };
  return data.accessToken;
}

// 钉钉 AI 表格字段 ID（来自 hERWDMS 表，定义见 MEMORY.md）
const FIELDS = {
  title:       '01ZM8y7',
  excerpt:     'kzJ8Zfn',
  pen_name:    'buyIfoF',
  mbti:        'dWRPIqe',
  source:      'zvrCEag',
  tags:        'tIxL841',
  mood:        'xv4iUc5',
  allow_claim: 'J64mwBR'
};

export type FeatherToSync = {
  title: string;
  excerpt: string;
  pen_name: string;
  mbti: string | null;
  source: string | null;
  tags: string[];
  mood: string;
  allow_claim: boolean;
};

export async function appendFeathers(rows: FeatherToSync[]): Promise<number> {
  if (rows.length === 0) return 0;
  const token = await getAccessToken();

  // 钉钉 AI 表格 records.create 一次最多 10 条
  const BATCH = 10;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const slice = rows.slice(i, i + BATCH);
    const body = {
      records: slice.map(r => ({
        cells: {
          [FIELDS.title]:       r.title,
          [FIELDS.excerpt]:     r.excerpt,
          [FIELDS.pen_name]:    r.pen_name,
          [FIELDS.mbti]:        r.mbti || '',
          [FIELDS.source]:      r.source || '',
          [FIELDS.tags]:        r.tags,
          [FIELDS.mood]:        r.mood,
          [FIELDS.allow_claim]: r.allow_claim
        }
      }))
    };
    const res = await fetch(
      `https://api.dingtalk.com/v1.0/aiTables/bases/${BASE_ID}/tables/${TABLE_ID}/records/batchCreate`,
      {
        method: 'POST',
        headers: {
          'x-acs-dingtalk-access-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) {
      throw new Error(`dingtalk batchCreate failed ${res.status}: ${await res.text()}`);
    }
    total += slice.length;
  }
  return total;
}
