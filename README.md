# iosif-math-teacher
AI mathematics teacher for Iosif — interactive lessons, whiteboard and Solomon Borisovich

## Production preview

Build and start the production preview on the fixed preview port:

```bash
npm run build
npm run preview
```

The preview server binds to all network interfaces on port `4173`, so the Codex
preview/port-forwarding layer can publish it instead of exposing a container-only
`localhost` address. The lesson entry point is `/lesson`.

## Pull request preview

Pull requests from branches in this repository are deployed to a separate
Cloudflare Pages project. The workflow builds the app for the domain root,
publishes the current commit and adds the external preview URL to the pull
request. It does not use the protected `github-pages` environment and cannot
replace the production GitHub Pages deployment.

One-time repository setup is documented in
[`docs/PREVIEW_SETUP.md`](docs/PREVIEW_SETUP.md). Fork pull requests are skipped
because GitHub does not provide repository secrets to untrusted fork workflows.

## Production deployment

The existing GitHub Pages workflow remains production-only. After a pull
request is merged into `main`, it installs dependencies, builds the dedicated
Pages bundle and publishes the dashboard over HTTPS. The public route is:

```text
https://<github-owner>.github.io/iosif-math-teacher/dashboard/
```

If Pages has not been used in the repository before, select **GitHub Actions**
once under **Settings → Pages → Build and deployment → Source**. Subsequent
updates are deployed automatically after they reach `main`.
