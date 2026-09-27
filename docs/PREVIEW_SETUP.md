# One-time PR Preview setup

GitHub Pages cannot host independent PR deployments alongside the production
Pages deployment of the same repository: a repository has one Pages site. The
free GitHub-only solution therefore publishes previews to a second public
repository, `mejikbiksmann-svg/iosif-math-teacher-previews`. Production remains
untouched in `iosif-math-teacher`.

The owner must perform this setup once:

1. Create a **public** repository named `iosif-math-teacher-previews` under
   `mejikbiksmann-svg`, without initializing files.
2. Generate a key locally:
   `ssh-keygen -t ed25519 -C "iosif PR preview" -f iosif-preview-key -N ""`.
3. In the preview repository open **Settings → Deploy keys → Add deploy key**,
   paste `iosif-preview-key.pub`, enable **Allow write access**, and save.
4. In `iosif-math-teacher` open **Settings → Secrets and variables → Actions →
   New repository secret**, name it `PR_PREVIEW_DEPLOY_KEY`, and paste the whole
   private `iosif-preview-key` file.
5. Push/update the PR once. The workflow creates `gh-pages` in the preview repo.
6. In the preview repository open **Settings → Pages**, choose **Deploy from a
   branch**, branch **gh-pages**, folder **/(root)**, and save.

Thereafter every push to a same-repository PR automatically updates its stable
URL: `https://mejikbiksmann-svg.github.io/iosif-math-teacher-previews/pr-<number>/dashboard/`.
No production environment permission needs to be changed.
