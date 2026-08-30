# Restoring the full site

The site is currently showing a **temporary minimal landing page**. The full site
(hero, impact metrics, about, career, tech specs, contact, resume page + PDF) is
preserved in git and can be restored in about a minute.

## Where the full site lives

| Ref | What it is |
| --- | --- |
| `full-site` branch | The complete site at its last published state (commit `3c52e85`) |
| `v1-full-site` tag | Same commit, tagged locally (see note below) |

Browse it on GitHub: <https://github.com/zactruelove/zactruelove.github.io/tree/full-site>

> Note: the `v1-full-site` tag exists locally but could not be pushed from the
> environment that created it. The `full-site` branch is the authoritative
> remote restore point. To publish the tag from your own machine:
> `git push origin v1-full-site`

## Restore everything (one command)

The takedown was a single commit, so reverting it brings the whole site back:

```bash
git checkout main
git revert --no-edit <takedown-commit-sha>
git push origin main
```

Find the sha with `git log --oneline -- index.html | head`, or look for the
commit titled "Replace site with temporary minimal landing page".

## Alternative: restore from the branch

If the history has moved on and a revert would conflict, take the files
straight from the preserved branch:

```bash
git checkout main
git checkout full-site -- index.html resume.html assets/Zac_Truelove_Resume.pdf
git commit -m "Restore full site"
git push origin main
```

## After restoring

- GitHub Pages redeploys automatically on push to `main` (~1 minute).
- Hard-refresh (Cmd/Ctrl+Shift+R) — the landing page will be cached.
- `resume.html` and the PDF return to their original URLs, so any link that
  pointed at them starts working again.

## What was left untouched

`css/`, `js/`, `favicon.svg`, `CNAME`, and `assets/images/og-image.png` were
deliberately kept in place. The landing page reuses them, and leaving them means
a restore is a pure content change with no supporting files to rebuild.
