# LabStudio App — Deploy Runbook

This is the LabStudio-specific version of the generic runbook:
- See: `/Users/richardducat/clawd/docs/RUNBOOK_DEPLOY_GENERIC.md`

## Goal
Get changes from local → Namecheap production (https://app.labstudio.fit) reliably, without trial-and-error.

## 0) Know what is “live”
- `https://app.labstudio.fit/*` should serve the Namecheap/cPanel Node app rooted at `/app.labstudio.fit`.
- Vercel must not own `labstudio.fit` or `app.labstudio.fit`.
- Namecheap DNS must point `app` at the hosting IP, not `cname.vercel-dns.com`.

## 1) Local build sanity
```bash
cd /Users/richardducat/GITHUB/labstudio-app/labstudio-app
npm run build
npm run package:namecheap
```

## 2) Upload to Namecheap

```bash
NAMECHEAP_ENV_FILE=/Users/richardducat/GITHUB/tyfys-benefits/.env.namecheap.local \
  /Users/richardducat/GITHUB/wakeupyabish-landing/scripts/upload-namecheap-directory.sh \
  --local-dir /Users/richardducat/GITHUB/labstudio-app/labstudio-app/output/namecheap-deploy \
  --remote-dir /app.labstudio.fit
```

## 3) DNS and cPanel
- Namecheap Advanced DNS: `app A 162.213.253.62`.
- cPanel addon/domain app: `app.labstudio.fit`.
- Node app root: `/app.labstudio.fit`.
- Startup file: `app.js`.

## 4) Quick live verification
This checks the real production API behavior:
```bash
curl -I https://app.labstudio.fit/login
curl -I https://app.labstudio.fit/privacy
curl -I https://app.labstudio.fit/support
```
