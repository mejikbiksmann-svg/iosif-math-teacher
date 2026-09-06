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

## Public preview

The repository includes a GitHub Pages deployment workflow. After the pull
request is merged into `main`, it installs dependencies, builds the dedicated
Pages bundle and publishes the lesson over HTTPS. The public route is:

```text
https://<github-owner>.github.io/iosif-math-teacher/lesson/
```

If Pages has not been used in the repository before, select **GitHub Actions**
once under **Settings → Pages → Build and deployment → Source**. Subsequent
updates are deployed automatically after they reach `main`.
