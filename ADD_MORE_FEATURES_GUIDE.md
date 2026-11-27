# Customize Mukesh Portfolio Ultimate 100

This site uses plain HTML, CSS, and JavaScript. There is no build step or package installation.

## Main files
- `index.html` — sections, buttons, dialogs, metadata, and visible text.
- `styles.css` — colours, layout, responsive rules, dark mode, and preference controls.
- `script.js` — interactions, project metadata, preferences, bookmarks, compare/export tools, contact draft, and the local Portfolio Guide.
- `UPGRADE_CATALOG_100.md` — 100 current/next upgrade ideas with statuses.

## Change contact links
Search `index.html` and `script.js` for `mukesh9696fc@gmail.com`, `https://github.com/MukeshKrct`, and `https://www.linkedin.com/in/mukesh96fc/`. Update every occurrence that should change, including structured data and the recruiter summary. Do not put credentials or API keys in frontend JavaScript.

## Change the main accent colour
The default accent is `#92A8D1`. Change the `blue` entry in `paletteMap` in `script.js` if you want the default colour changed. Keep its matching swatch in `styles.css` in sync. Other accent options are applied by the Appearance settings panel.

## Add a project the safe way
1. Add a project card inside `#projects-grid` in `index.html` with a unique `id` and `data-project` key.
2. Add a matching entry to the `projects` object in `script.js` with `title`, `category`, `status`, `image`, `imageAlt`, `description`, `bullets`, `tags`, and `note`.
3. Make sure the image path exists in `assets/images/`.
4. Update the category filter labels/counts if the category totals change.
5. Test save/favourite, compare, sorting, search, the project dialog, and CSV/JSON export.
6. Avoid claiming model accuracy, user counts, repair-cost reliability, or a live demo unless these are measured and really available.

## Add a Portfolio Guide answer
Search `script.js` for `function getGuideAnswer(question)`. Add a new regular-expression branch before the fallback return. Return plain text and only use the action types already supported (`section`, `project`, `resume`, `link`). Every section/project key used by an answer must exist.

## Add a design preference
1. Add a labelled control inside `#preferences-dialog` in `index.html`.
2. Read/apply it from the ULTIMATE 100 preference section near the end of `script.js`.
3. Store only non-sensitive presentation preferences with the guarded `safelyRead` / `safelyWrite` helpers.
4. Add styles near the bottom of `styles.css` and test keyboard focus, dark mode, and mobile layout.

## Before publishing
- Test locally on desktop and mobile.
- Test the whole website in light and dark mode.
- Test keyboard-only navigation and the reduced-motion setting.
- Try project sorting, saved projects, compare, exports, section bookmarks, and the email draft builder.
- Check that the PDF resume is the latest copy.
- Check the browser console and verify the asset paths.
- Publish the contents of this folder to your intended GitHub Pages repository, keeping `index.html` at the repository root.

The contact builder opens a `mailto:` draft; it does not send email. The local Portfolio Guide is rule-based, not a live AI model. The service worker and install behavior require HTTPS or localhost.
