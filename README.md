# Mukesh S — Portfolio Ultimate 100

A responsive static portfolio website for Mukesh S, using the selected blue accent `#92A8D1` by default. Built with HTML, CSS, and vanilla JavaScript; no build step or package installation is required. This revision adds an appearance/accessibility control centre, saved sections and favourite projects, project sorting and comparison, project data exports, Markdown case-study downloads, and a recruiter email draft builder. It also includes a 100-item upgrade catalog; the catalog clearly distinguishes features included now from future ideas.

## Included

- `index.html` — page content, structured metadata, project case studies, command palette, contact actions.
- `styles.css` — responsive design, light/dark themes, interaction states, print styling, mobile menu, dialogs, and motion preferences.
- `script.js` — navigation, scroll progress, active-section tracking, project filters/search, case-study dialogs, keyboard command palette, theme persistence, copy/share helpers, image fallbacks, and the local Portfolio Guide.
- `assets/images/vehicle-damage.webp` — vehicle-damage project visual.
- `assets/images/loanclear-dashboard.svg` — LoanClear dashboard illustration.
- `assets/images/portfolio-preview.webp` and `portfolio-concept.webp` — portfolio preview concepts.
- `assets/Mukesh_S_Resume.pdf` — resume download.
- `assets/Mukesh_S_Contact.vcf` — downloadable contact card.
- `favicon.svg` — browser tab icon.
- `manifest.webmanifest` — installable Progressive Web App metadata.
- `service-worker.js` — versioned offline cache for the site shell and local assets.
- `assets/icons/icon-192.png` and `icon-512.png` — installable app icons.
- `404.html` — custom not-found page for static hosting.

## Run locally

1. Extract the ZIP.
2. Open this folder in VS Code.
3. Open `index.html` with the Live Server extension, or open it directly in a modern browser.
4. Keep the folder structure intact; image, resume, and contact-card URLs are relative paths.

## Ultimate 100 additions

- Appearance & accessibility dialog: four accent palettes, 14–19 px base text size, high contrast, reduced motion, recruiter focus mode, reading mode, and reset. Preferences are local to the browser.
- Bookmark main sections and revisit them from the saved-sections dialog.
- Save favourite projects and filter to saved items.
- Sort projects by featured order, title ascending/descending, or category.
- Switch project display between grid and list layouts.
- Select up to two projects for a comparison table.
- Export project metadata as CSV or JSON.
- Copy deep links to project cards, share an individual project where supported, and download Markdown case studies.
- Build a recruiter email draft using the target role and optional company; this opens the visitor's email client and does not send messages itself.
- Extra command-palette actions and keyboard shortcuts (`?` for settings, `B` to bookmark the current section outside editable fields).
- Service-worker cache version bumped to refresh this version's assets.

See `UPGRADE_CATALOG_100.md` for a complete roadmap. It does **not** mean 100 separate features were all implemented in this revision; included features and future ideas are labelled individually.

## Main features

- Mobile navigation with auto-close and Escape handling.
- Light/dark mode that remembers the selected theme and follows the system preference until you choose one.
- Scroll progress, sticky-header refinement, active navigation, back-to-top control, and section reveal effects.
- Project filtering and search with live counts, clear-search action, empty state, and clickable skill chips that discover matching projects.
- Keyboard command palette: `Ctrl + K` (Windows/Linux) or `⌘ + K` (macOS); arrow keys move through results, Enter runs a command, Escape closes it.
- `/` focuses project search when you are not already typing in a field.
- Project case-study dialogs with galleries for the portfolio project, focus restoration, and reduced page-jump behavior.
- Copy email, portfolio URL, or a recruiter-ready professional summary; download a skills snapshot; print/save a clean PDF; use the native share sheet where supported; and download a contact card.
- Local Portfolio Guide with curated answers about projects, skills, education, experience, certifications, and contact details. It runs entirely in the browser and does not store or send messages.
- `Ctrl/⌘ + K` command palette includes the Portfolio Guide and recruiter-summary copy action.
- Accessible focus states, skip link, reduced-motion support, local image fallbacks, semantic metadata, and print-friendly styles.
- Resume PDF download and current copyright year.
- Progressive Web App manifest, install prompt where supported, and service-worker caching so previously visited pages/assets can work offline after the first successful visit on HTTPS or localhost.
- Branded 404 page and 192/512 app icons.
- Print-friendly stylesheet for saving a readable paper/PDF version of the portfolio.

## Project list

The portfolio intentionally shows only these three projects:

1. **Vehicle Damage Detection** — Python, YOLOv11, OpenCV; status is clearly shown as in development.
2. **LoanClear** — Python, Flask, MySQL, JavaScript; the dashboard image is an illustrative mockup.
3. **Personal Portfolio Website** — HTML, CSS, JavaScript.

The Traffic Management Prediction and AI Resume Analyzer projects are not included. Avoid adding performance claims or repository/demo links unless you can verify them.

## Profile links

- GitHub: https://github.com/MukeshKrct
- LinkedIn: https://www.linkedin.com/in/mukesh96fc/
- Email: mukesh9696fc@gmail.com

Update social/contact URLs in `index.html` if any of these change.

## Publish using GitHub Pages

1. Create or open the repository you want to publish.
2. Upload the **contents** of this folder, keeping `index.html` at the repository root.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**, choose the intended branch (usually `main`) and `/(root)`, then save.
5. Wait for GitHub Pages to finish the deployment, then open the published URL from the Pages settings.

For a user-site URL such as `https://MukeshKrct.github.io/`, the repository generally needs to be named `MukeshKrct.github.io`. If you are updating an existing project-site repository, keep that repository's existing Pages configuration and publish from the correct branch.

## Before sharing with recruiters

- Test the local site in desktop and mobile widths.
- Confirm the resume PDF is the latest version.
- Confirm your contact and LinkedIn links.
- Add project-specific GitHub repository links only when those repositories exist and are ready for public viewing.
- The share/copy page URL features copy the current URL. When opened locally, it will be a local file URL; after publication, it will be your public site URL.

This is a static site. The email button opens a pre-filled email draft; it does not send email by itself or use a backend contact form. The service worker requires HTTPS or localhost and caches local assets after the first successful visit. Browser install prompts vary by browser and device.

## Upgrade validation notes

See `UPGRADE_TEST_REPORT.md` for the scope and results of the local syntax, asset-reference, and browser-interaction checks performed for this package. As with any static site, review it on your own target browsers and after publishing, especially PWA installation/offline behavior.
