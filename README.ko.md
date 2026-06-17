<p align="center">
  <img src="assets/readme-icon.svg" width="88" alt="WhereMyTokens app mark" />
</p>

<h1 align="center">WhereMyTokens for macOS</h1>

<p align="center">
  <strong>Claude Code, Codex, Antigravity 사용량을 macOS 메뉴 막대에서 보는 로컬 우선 앱.</strong>
</p>

<p align="center">
  <img alt="macOS menu bar" src="https://img.shields.io/badge/macOS-menu_bar-000000?style=for-the-badge">
  <img alt="Claude Code" src="https://img.shields.io/badge/Claude_Code-supported-d97706?style=for-the-badge">
  <img alt="Codex tracking" src="https://img.shields.io/badge/Codex-supported-4f46e5?style=for-the-badge">
  <img alt="Antigravity" src="https://img.shields.io/badge/Antigravity-local_RPC-0f766e?style=for-the-badge">
  <img alt="Local only" src="https://img.shields.io/badge/local_first-no_cloud_sync-0f766e?style=for-the-badge">
</p>

<p align="center">
  <a href="README.md">English</a> · <a href="README.ja.md">日本語</a> · <a href="README.zh-CN.md">中文</a> · <a href="README.es.md">Español</a>
</p>

<p align="center">
  <a href="#설치"><strong>설치</strong></a>
  ·
  <a href="#첫-실행">첫 실행</a>
  ·
  <a href="#macos-디자인">macOS 디자인</a>
  ·
  <a href="#개인정보">개인정보</a>
</p>

WhereMyTokens는 macOS 메뉴 막대에 상주하면서 Claude Code, Codex, Antigravity의 토큰, 비용, 캐시 효율, quota, 세션 상태, 모델별 사용량, 활동 차트, git 산출 지표를 빠르게 보여줍니다.

이 저장소는 WhereMyTokens의 macOS 에디션을 배포합니다. macOS 릴리스는 다른 플랫폼과 별도 버전 트랙으로 관리하며 GitHub Release 태그는 `mac-vX.Y.Z` 형식을 사용합니다.

<a id="screenshots"></a>

<table>
  <tr>
    <th>다크 오버뷰</th>
  </tr>
  <tr>
    <td><img src="assets/screenshot-overview-dark.png" alt="WhereMyTokens 다크 오버뷰" /></td>
  </tr>
  <tr>
    <th>라이트 오버뷰</th>
  </tr>
  <tr>
    <td><img src="assets/screenshot-overview-light.png" alt="WhereMyTokens 라이트 오버뷰" /></td>
  </tr>
</table>

## 최신 업데이트

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| **mac-v1.0.0** | 2026-06-17 | 첫 macOS 릴리스 트랙. 메뉴 막대 앱 shell, DMG/ZIP 패키징, macOS 데이터 경로, Claude/Codex/Antigravity 사용량 추적, Claude Desktop credential discovery 포함. |

## 설치

### 방법 1: DMG 설치

일반 사용자에게 권장하는 설치 방식입니다. 릴리스 asset이 올라간 뒤 사용합니다.

1. 릴리스에서 `WhereMyTokens-<version>-mac-arm64.dmg`를 다운로드합니다.
2. DMG를 엽니다.
3. `WhereMyTokens.app`을 `/Applications`로 드래그합니다.
4. DMG를 eject합니다.
5. `/Applications`에서 `WhereMyTokens`를 실행합니다.

현재 로컬 빌드는 ad-hoc signing은 되었지만 Apple notarization은 아직 없습니다. Developer ID 인증서와 notarization pipeline을 붙이기 전까지는 첫 실행 때 Gatekeeper가 "확인되지 않은 개발자" 경고를 띄울 수 있습니다. 내부 테스트에서는 앱을 우클릭한 뒤 **열기**를 선택하거나 **시스템 설정 -> 개인정보 보호 및 보안 -> 그래도 열기**를 사용할 수 있습니다. 공개 배포 전에는 Developer ID signing, notarization, stapling이 필요합니다.

### 방법 2: ZIP 앱 아카이브

DMG 대신 단순 압축 파일로 배포할 때 사용합니다.

1. `WhereMyTokens-<version>-arm64-mac.zip`을 다운로드합니다.
2. 압축을 풉니다.
3. `WhereMyTokens.app`을 `/Applications`로 옮깁니다.
4. `/Applications`에서 실행합니다.

### 방법 3: 소스에서 빌드

개발이나 비공개 테스트 빌드에 사용합니다.

```bash
npm install
npm run dist:mac
```

생성되는 산출물:

| 산출물 | 용도 |
|--------|------|
| `release/mac-arm64/WhereMyTokens.app` | macOS 앱 번들. |
| `release/WhereMyTokens-<version>-mac-arm64.dmg` | `/Applications`로 드래그하는 설치 이미지. |
| `release/WhereMyTokens-<version>-arm64-mac.zip` | 압축된 앱 아카이브. |

현재 패키징 target은 Apple Silicon(`arm64`)입니다. Intel Mac까지 공개 배포하려면 x64 또는 universal build target을 추가해야 합니다.

빌드하거나 설치하면 [최종 사용자 라이선스 계약](EULA.ko.txt)에 동의하는 것으로 간주됩니다.

## 첫 실행

1. macOS 메뉴 막대에서 WhereMyTokens 항목을 찾습니다.
2. 클릭하면 대시보드가 열립니다. 앱은 Dock 아이콘을 숨기고 메뉴 막대 유틸리티처럼 동작합니다.
3. **Settings**에서 추적할 provider를 고릅니다: Claude Code, Codex, Antigravity.
4. 선택 사항: **Claude Code Integration**을 켜면 `statusLine` bridge를 등록해 Claude context와 fallback rate-limit 데이터를 실시간으로 받을 수 있습니다.
5. 선택 사항: **Start at login**을 켜면 macOS 로그인 후 자동 실행됩니다.

기본 앱 데이터 위치:

```text
~/Library/Application Support/WhereMyTokens
```

Claude bridge snapshot 위치:

```text
~/Library/Application Support/WhereMyTokens/live-session.json
```

## 주요 기능

### 사용량과 quota

- Claude Code, Codex, Antigravity provider 체크박스.
- Provider adapter는 `src/main/providers/` 아래에 있어 이후 provider도 같은 quota/session/usage 형태로 붙일 수 있습니다.
- Provider reset window와 model quota target을 위한 Rich quota card.
- Cache efficiency, saved cost, provider health chip.
- Claude는 Anthropic API, 로컬 `statusLine` bridge fallback, cache fallback을 사용.
- Codex는 live usage endpoint, cache fallback, 로컬 JSONL `rate_limits`를 사용.
- Antigravity는 실행 중인 IDE의 `127.0.0.1` local language server만 사용.

### 세션

- Claude와 Codex의 로컬 JSONL/session 파일 발견.
- Antigravity IDE 실행 중 local RPC로 cascade 발견.
- 로컬 git metadata 기반 프로젝트/브랜치 그룹.
- 활성/최근 작업의 context, 상태, 모델, 토큰, 비용 요약.

### 분석

- 오늘과 전체 기간 합계.
- 로컬에 `usage-ledger.json`, `git-output-ledger.json`로 저장되는 usage ledger와 git output ledger.
- Settings의 **Rebuild ledger**로 저장된 usage ledger를 로컬 히스토리에서 다시 재생해 복구할 수 있습니다.
- 사용 비용/토큰과 git 순 라인 산출을 같이 보여주는 Trend card.
- 활동 히트맵, rhythm chart, model breakdown, tool activity summary.

### macOS 유틸리티

- 메뉴 막대 라벨에 사용률, 토큰 수, 비용 표시.
- 항상 위에 둘 수 있는 Floating quota widget.
- Light, dark, system-auto theme.
- 로그인 시 자동 실행.
- quota threshold 시스템 알림.

## macOS 디자인

macOS 앱은 메뉴 막대 유틸리티답게 동작하도록 설계했습니다.

| 영역 | 현재 결정 |
|------|-----------|
| 앱 shell | 시작 시 Dock 아이콘을 숨기는 메뉴 막대 유틸리티. |
| 상태 항목 | macOS light/dark 메뉴 막대에서 tint가 자연스럽게 먹는 template-style 아이콘. |
| 팝업 위치 | macOS에서는 메뉴 막대 항목 아래로 열리고, 현재 display work area 안에 clamp. |
| 데이터 위치 | legacy roaming app data 대신 `~/Library/Application Support/WhereMyTokens`. |
| 로그 위치 | debug instrumentation은 `~/Library/Logs/WhereMyTokens`. |
| 앱 아이콘 | 기존 앱 마크를 `.icns`로 생성해 `WhereMyTokens.app`에 포함. |
| 설치 파일 | `electron-builder`로 DMG와 ZIP 산출물 생성. |

공개 배포 전 디자인 상태:

- 대시보드 UI는 macOS에서 실제 팝업 렌더링까지 확인했습니다.
- packaged `.app` 실행 smoke test를 통과했습니다.
- 앱 번들 아이콘은 기술적으로 연결되어 있고 macOS가 인식합니다. 다만 현재는 기존 흑백 마크를 ICNS로 변환한 상태라 내부 테스트용으로는 충분하지만, 공개 배포 전에는 1024x1024 원본, macOS Big Sur 이후 아이콘 비율, Finder 크기별 식별성, 밝은/어두운 배경 대비를 기준으로 최종 아이콘 디자인 패스가 필요합니다.
- DMG는 현재 `electron-builder` 기본 프레젠테이션입니다. 공개 배포 전에는 DMG 배경, Applications shortcut 배치, Developer ID signing, notarization, stapling을 추가해야 합니다.

## 개인정보

WhereMyTokens는 local-first 앱입니다. 클라우드 동기화 서비스가 없고 세션 로그를 업로드하지 않습니다.

| 로컬 경로 또는 endpoint | 용도 |
|-------------------------|------|
| `~/.claude/sessions/*.json` | Claude 세션 metadata. |
| `~/.claude/projects/**/*.jsonl` | Claude token, cost, context, activity summary. |
| Claude Code credentials | 표준 Claude credentials 파일, macOS Keychain 항목, 또는 실행 중인 Claude Desktop-launched Claude Code 프로세스에서 발견. Anthropic 사용량 요청에만 사용. |
| `~/.codex/sessions/**/*.jsonl` | 최근 Codex 세션 사용량과 tool activity. |
| `~/.codex/archived_sessions/**/*.jsonl` | all-time totals에 포함되는 Codex archive. |
| `~/.codex/session-cleanup-archive/**/*.jsonl` | all-time totals에 포함되는 Codex cleanup archive. |
| `~/.codex/auth.json` | live usage snapshot용 ChatGPT/Codex OAuth 정보. |
| `127.0.0.1` Antigravity language server | Antigravity 실행 중 local-only session, quota, token metadata. |
| `~/Library/Application Support/WhereMyTokens` | 앱 설정, 로컬 캐시, ledger, 알림 기록, bridge 상태. |

네트워크 접근은 활성화된 provider의 usage endpoint로 제한됩니다. Antigravity는 loopback local RPC만 사용하며 Google OAuth, refresh token, Google cloud usage endpoint, offline database fallback을 사용하지 않습니다.

Claude Code bridge를 끄려면 **Settings -> Claude Code Integration -> Disable**을 누릅니다. 앱은 WhereMyTokens가 소유한 `statusLine` entry만 제거하며 다른 custom `statusLine` 설정은 건드리지 않습니다.

## 개발

```bash
npm install
npm run build
npm test
npm run dist:mac
```

macOS 에디션 검증 명령:

```bash
npm run dist:mac
codesign --verify --deep --strict --verbose=2 release/mac-arm64/WhereMyTokens.app
"release/mac-arm64/WhereMyTokens.app/Contents/MacOS/WhereMyTokens"
```

런타임 smoke test 체크리스트:

- 실행 후 앱 프로세스가 유지됨.
- startup 중 fatal stderr가 없음.
- child process args의 `--user-data-dir`가 `.../Library/Application Support/WhereMyTokens`를 가리킴.
- 메뉴 막대 항목이 표시됨.
- 대시보드 팝업이 빈 창이 아니라 실제 내용을 렌더링함.
- 종료 후 `WhereMyTokens` 프로세스가 남지 않음.

## 릴리스 체크리스트

- 깨끗한 macOS 환경에서 DMG와 ZIP 빌드.
- `.app` 내부에 `Resources/bridge/bridge.js`, `Resources/shared/platformPaths.js` 포함 확인.
- code signing 검증.
- 공개 배포 전 Developer ID signing과 notarization 추가.
- Finder, Dock, Spotlight, DMG 크기에서 최종 앱 아이콘 검토.
- 첫 실행 설치 문구와 Gatekeeper 동작 확인.
