# 릴리즈 가이드 — WhereMyTokens for macOS

이 파일은 macOS 에디션 전용 릴리즈 가이드와 이력입니다. 다른 플랫폼의 릴리즈 이력은 이 저장소의 macOS What's New에 섞지 않습니다.

## 버전 정책

- `package.json`의 `version`은 macOS 앱 번들 버전입니다.
- GitHub Release 태그는 `mac-vX.Y.Z` 형식을 사용합니다.
- macOS 릴리즈 트랙은 `mac-v1.0.0`부터 시작합니다.
- 패치: 버그 수정, 문서, 작은 UX 개선.
- 마이너: 사용자 기능 추가, provider 지원 확장, 패키징/설치 UX 개선.
- 메이저: 저장소/데이터 구조나 사용자 워크플로를 깨는 변경.

## 배포 흐름

```bash
npm install
npm run build
npm test
npm run dist:mac
```

릴리즈 전에는 실행 중인 개발용 Electron 앱을 종료합니다.

```bash
pkill -f "WhereMyTokens-mac.*Electron" || true
pkill -f "Electron .*WhereMyTokens-mac" || true
```

## 산출물 규칙

| 종류 | 파일명 |
|------|--------|
| DMG | `WhereMyTokens-{VERSION}-mac-arm64.dmg` |
| ZIP | `WhereMyTokens-{VERSION}-arm64-mac.zip` |
| 앱 번들 | `release/mac-arm64/WhereMyTokens.app` |

현재 배포 target은 Apple Silicon(`arm64`)입니다. Intel Mac까지 배포하려면 `mac.target` 또는 build matrix에 x64/universal 구성을 추가한 뒤 이 표를 업데이트합니다.

## 검증 체크리스트

- `npm run build` 성공.
- `npm test` 성공.
- `npm run dist:mac` 성공.
- `codesign --verify --deep --strict --verbose=2 release/mac-arm64/WhereMyTokens.app` 성공.
- `.app`에 `Resources/bridge/bridge.js`와 `Resources/shared/platformPaths.js` 포함.
- 앱 실행 후 Dock 아이콘 없이 macOS 메뉴 막대 항목 표시.
- 메뉴 막대 팝오버가 빈 창이 아니라 실제 사용량 대시보드를 렌더링.
- Claude, Codex, Antigravity provider 선택/비선택 상태가 유지.
- Claude Desktop credential discovery가 `no-credentials / local only`로 잘못 떨어지지 않음.
- DMG/ZIP 설치 후 `~/Library/Application Support/WhereMyTokens`를 사용.
- 공개 배포 전 Developer ID signing, notarization, stapling 완료.

## GitHub Release 생성

```bash
VERSION=1.0.0
TAG="mac-v${VERSION}"

gh release create "$TAG" \
  "release/WhereMyTokens-${VERSION}-mac-arm64.dmg" \
  "release/WhereMyTokens-${VERSION}-arm64-mac.zip" \
  --repo jeongwookie/WhereMyTokens-mac \
  --title "WhereMyTokens for macOS ${TAG}" \
  --notes-file release-notes.md
```

릴리즈 노트는 아래 형식을 사용합니다.

```markdown
## What's New

- ...

## Install

1. Download `WhereMyTokens-{VERSION}-mac-arm64.dmg`.
2. Open the DMG and drag `WhereMyTokens.app` to `/Applications`.
3. If Gatekeeper warns before notarization is available, right-click the app and choose Open.

## Notes

- Current build target: Apple Silicon (`arm64`).
```

## 릴리즈 이력

| 버전 | 날짜 | 주요 변경 |
|------|------|-----------|
| mac-v1.0.0 | 2026-06-17 | macOS 메뉴 막대 앱으로 첫 독립 버전 트랙 시작. DMG/ZIP 패키징, macOS 데이터 경로, Claude/Codex/Antigravity 사용량 추적, Claude Desktop credential discovery, 메뉴 막대 팝오버와 설치 문서 정리. |
