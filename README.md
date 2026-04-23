<p align="center">
  <img src="https://raw.githubusercontent.com/BaRam-OSS/geo-checker/main/docs/assets/baram.png" alt="BaRam" width="260" />
</p>

<h1 align="center">geo-checker</h1>

<p align="center">
  <b>Generative Engine Optimization(GEO)</b>을 위한 Lighthouse급 감사 도구. ChatGPT · Claude · Gemini · Perplexity 같은 AI 검색 엔진이 내 사이트를 얼마나 잘 발견하고, 이해하고, 인용할 수 있는지 측정합니다.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/geo-checker"><img src="https://img.shields.io/npm/v/geo-checker.svg" alt="npm" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/geo-checker.svg" alt="license" /></a>
  <a href="https://github.com/BaRam-OSS/geo-checker/actions/workflows/ci.yml"><img src="https://github.com/BaRam-OSS/geo-checker/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
</p>

<p align="center">
  <b>한국어</b> · <a href="./README.en.md">English</a>
</p>

---

## 왜 필요한가요?

기존 SEO 도구는 **구글 검색이 내 페이지를 랭킹할 수 있는지**를 점검합니다. `geo-checker`는 한 걸음 더 나아가, **AI 검색 엔진이 내 페이지를 인용할 수 있는지**를 점검합니다. 25개의 온페이지 신호를 4개의 가중치 범주에 걸쳐 검사하고, 0–100점의 카테고리 점수와 함께 인터랙티브 HTML 리포트, 우선순위가 매겨진 개선 기회(Opportunities), 구체적인 수정 방법을 제공합니다.

Google Lighthouse에서 영감을 받아 만들었지만, 대상은 GEO입니다 — AI 크롤러 robots 규칙, `llms.txt`, schema.org 그래프 품질, 인용 신호 등.

## 설치

```sh
# 일회성 실행
npx geo-checker https://example.com

# 또는 개발 의존성으로 추가
npm install --save-dev geo-checker
```

Node.js **20.18.1 이상**이 필요합니다.

## 사용법 — CLI

```sh
# 터미널 출력 (impact 칩 + 타이밍 포함)
geo-checker https://example.com

# 독립 실행형 HTML 리포트 생성
geo-checker https://example.com --html report.html

# report.json + report.html을 함께 디렉터리에 저장
geo-checker https://example.com --out ./reports

# stdout으로 JSON 출력 (jq, CI 파이프라이닝용)
geo-checker https://example.com --json > report.json

# SPA / JS 렌더링 사이트 (playwright 선택 의존성 필요)
geo-checker https://example.com --render

# 특정 카테고리나 룰만 실행
geo-checker https://example.com --category crawler
geo-checker https://example.com --only crawler.https,sd.required-fields

# CI 모드 — warn 또는 fail 시 exit 1
geo-checker https://example.com --fail-on warn
```

**전체 플래그 목록:**

| 플래그 | 설명 |
|---|---|
| `--json` | JSON을 stdout으로 출력. |
| `--html <path>` | 독립 실행형 HTML 리포트를 `<path>`에 저장. `-`이면 stdout. |
| `--out <dir>` | `<dir>`에 `report.json` + `report.html`을 함께 저장 (디렉터리 자동 생성). |
| `--render` | Playwright 기반 헤드리스 Chromium 사용 (선택 의존성). |
| `--category <names>` | 쉼표 구분: `crawler`, `structured-data`, `citation`, `content`. |
| `--only <ids>` | 실행할 rule ID (또는 stableId) 쉼표 구분. |
| `--fail-on <level>` | `fail`(기본) 또는 `warn`. |
| `--timeout <ms>` | 요청당 타임아웃 (기본 20 000). |

**종료 코드:** `0` 성공 · `1` 정책 실패 · `2` 런타임 오류.

## HTML 리포트

`--html`은 외부 CSS, 폰트, 네트워크 호출 없이 작동하는 단일 HTML 파일을 생성합니다. 브라우저에서 바로 열면 Lighthouse와 유사한 UX를 경험할 수 있습니다:

- **점수 링(Score Ring)** — 전체 점수와 카테고리별 점수.
- **Opportunities** — 고치면 회복할 수 있는 점수 순으로 정렬된 개선 기회.
- **Diagnostics** — 나머지 비통과 감사 항목, 카테고리별로 그룹핑.
- **Passed audits** — 기본적으로 접혀 있음.
- **Raw JSON** — 다른 도구로 파이핑할 수 있는 Copy-to-clipboard 버튼.

라이트/다크 모드에 자동으로 대응합니다. 일반 페이지 기준 ~60–80 KB.

## 사용법 — 프로그래매틱 API

```ts
import { audit } from 'geo-checker';

const report = await audit('https://example.com', { render: false });

console.log(report.overall);                       // 78
console.log(report.categories.crawler.score);      // 92
console.log(report.timing);                        // { fetchMs, auditMs, totalMs }
console.log(report.meta);                          // { toolVersion, nodeVersion, ... }
```

### HTML 또는 JSON 리포트를 직접 렌더링

```ts
import { audit } from 'geo-checker';
import { toHtml } from 'geo-checker/dist/reporters/html.js';
import { toJson } from 'geo-checker/dist/reporters/json.js';

const report = await audit('https://example.com');
await fs.writeFile('report.html', toHtml(report));
await fs.writeFile('report.json', toJson(report));
```

## 무엇을 검사하나요?

| 카테고리 | 검사 항목 | 룰 수 | 가중치 |
|---|---|---:|---:|
| **AI Crawler Access** | HTTPS, robots.txt 도달성, AI 봇 허용 목록 (GPTBot, Google-Extended, ClaudeBot, PerplexityBot, CCBot, Amazonbot, anthropic-ai), `llms.txt`, sitemap.xml | 6 | 25 |
| **Structured Data** | JSON-LD 존재/유효성, 인식 가능한 schema.org 타입, 필수 필드 커버리지 (Article, FAQPage, HowTo, Product, Organization, …), microdata/RDFa 폴백, 중복 primary 타입 검사 | 6 | 30 |
| **Citation Signals** | `<title>`, meta description, canonical, Open Graph, Twitter Card, `<html lang>`, 저자, 게시/수정 날짜 | 8 | 25 |
| **Content Structure** | 단일 `<h1>`, 헤딩 계층, 이미지 alt 커버리지, TL;DR / FAQ 블록, 단어 수 | 5 | 20 |

모든 룰은 다음 필드를 선언합니다:

- **`stableId`** — CI 예산용 고정 식별자 (절대 변경되지 않음).
- **`impact`** — `critical` / `high` / `medium` / `low`.
- **`effort`** — `low` / `medium` / `high` (수정에 걸리는 시간의 대략적인 지표).
- **`group`** — `opportunity` (회복 가능한 점수) 또는 `diagnostic` (이진 신호).

전체 룰 목록과 수정 가이드는 [`docs/rules.md`](./docs/rules.md)를 참조하세요.

## 리포트 스키마

```ts
interface AuditReport {
  schemaVersion: 1;
  url: string;
  finalUrl: string;
  fetchedAt: string;
  renderMode: 'static' | 'rendered';
  overall: number;                                     // 0–100
  categories: Record<Category, CategoryReport>;
  warnings: string[];
  version: string;
  meta: { toolVersion: string; nodeVersion: string; userAgent?: string };
  timing: { fetchMs: number; auditMs: number; totalMs: number };
}
```

각 감사 결과는 `stableId`, `impact`, `effort`, `group`, `docsUrl`, 그리고 해당되는 경우 `estimatedImpact`(Opportunity가 얼마나 가치 있는 점수인지)를 함께 담고 있습니다.

## 확장성

커스텀 룰을 추가하는 방법:

```ts
import { audit, defineRule } from 'geo-checker';

const hasJsonFeed = defineRule({
  id: 'custom.has-json-feed',
  stableId: 'custom.has-json-feed',
  category: 'crawler',
  group: 'opportunity',
  weight: 2,
  impact: 'low',
  effort: 'low',
  title: 'JSON Feed present',
  description: 'Site should expose a JSON Feed at /feed.json',
  docsUrl: 'https://example.com/docs/json-feed',
  async run(ctx) {
    // ctx.$ / ctx.headers / ctx.robots 등을 활용한 검사 로직
    return { status: 'pass', score: 1, rationale: 'JSON feed found' };
  },
});

const report = await audit('https://example.com', { extraRules: [hasJsonFeed] });
```

커스텀 룰은 기본 룰과 자동으로 병합되며, 모든 reporter에서 동일하게 출력됩니다.

## CI 레시피

```yaml
# .github/workflows/geo.yml
name: GEO audit
on: [push, pull_request]
jobs:
  geo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npx -y geo-checker https://staging.example.com --fail-on warn --out ./geo
      - uses: actions/upload-artifact@v4
        with:
          name: geo-report
          path: ./geo
```

## 라이선스

MIT © BaRam-OSS. [LICENSE](./LICENSE) 참조.

## 기여하기

새로운 룰, 픽스처, 문서 개선 등 PR을 환영합니다. [CONTRIBUTING.md](./CONTRIBUTING.md) 참조.
