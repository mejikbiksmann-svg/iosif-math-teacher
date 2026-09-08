# External pull request previews

The repository uses a separate Cloudflare Pages project for pre-merge previews.
Production continues to use GitHub Pages and its protected `github-pages`
environment. A preview therefore cannot overwrite or block production.

## Why a separate host is used

GitHub Pages provides one published site per repository. Deploying a feature
branch through the production Pages environment would either be rejected by its
protection rules or replace the public site. Cloudflare Pages Direct Uploads
provide a unique HTTPS deployment URL and a stable branch alias without changing
the production workflow.

## One-time Cloudflare setup

1. Sign in to the Cloudflare dashboard.
2. Open **Workers & Pages** and select **Create application**.
3. Select **Pages** → **Upload assets** (Direct Upload).
4. Enter the project name exactly as `iosif-math-teacher-preview` and create the
   project. The initial assets may be any temporary static folder; the first
   workflow run will replace them.
5. Open the user menu → **My Profile** → **API Tokens** → **Create Token**.
6. Use **Create Custom Token** and grant:
   - **Account → Cloudflare Pages → Edit**;
   - scope it to the account containing the preview project.
7. Copy the token. Then copy the **Account ID** shown on the Pages project's
   overview page.

## One-time GitHub setup

1. Open the GitHub repository.
2. Go to **Settings → Secrets and variables → Actions**.
3. On the **Secrets** tab select **New repository secret** and add:
   - `CLOUDFLARE_API_TOKEN` — the token created above;
   - `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID.
4. Go to **Settings → Actions → General**.
5. Under **Workflow permissions**, select **Read and write permissions**.
6. Save the settings. Do not change the `github-pages` environment protection
   rules and do not change **Settings → Pages**; those remain production-only.

## Using previews

Push a branch in the repository and open a pull request. The **Deploy pull
request preview** workflow runs on open, reopen, and every new commit. When it
finishes, a bot comment named **Dashboard preview** contains the external HTTPS
URL. The same comment is updated on later commits.

For the current branch without opening a new task, open **Actions → Deploy pull
request preview → Run workflow**, select the branch, and run it. Its deployment
URL is available in the **Deploy isolated Cloudflare Pages preview** step.

Preview URLs serve the application at `/`; routes such as `/dashboard/`,
`/homework/`, `/tests/`, `/results/`, `/board/`, `/library/`, and
`/achievements/` are emitted as static entry points and can be refreshed
directly.

## Security and limitations

- Repository secrets are not exposed to workflows triggered from forks, so fork
  pull requests are intentionally skipped.
- Cloudflare preview deployments contain static client assets only; no runtime
  application secrets are bundled.
- Production deployment continues to run only after a push to `main` through
  `.github/workflows/deploy-pages.yml`.
