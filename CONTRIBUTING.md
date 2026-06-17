# Contributing

Thanks for helping improve WhereMyTokens for macOS.

## Before You Start

- Open an issue for larger behavior changes so the direction is clear.
- Keep macOS-specific behavior in this repository and Windows-specific behavior in the Windows repository.
- Preserve the local-first privacy model: do not upload session logs or credentials.

## Development

```bash
npm install
npm run build
npm test
npm run dist:mac
```

Use `npm start` for local smoke testing after a successful build.

## Pull Requests

- Include a short summary of the user-visible change.
- Mention any privacy, credential, menu bar, packaging, or provider-data implications.
- Add or update focused tests when changing parser, provider, quota, ledger, IPC, notification, or macOS shell behavior.
- Update README or docs when changing installation, setup, provider support, or release assets.

## Release Notes

Release notes should group changes under:

- What's New
- Install
- Notes
