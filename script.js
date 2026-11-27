(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.documentElement.classList.add('js');

  const safelyRead = (key) => {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  };
  const safelyWrite = (key, value) => {
    try { window.localStorage.setItem(key, value); } catch (_) { /* The feature still works for this visit. */ }
  };

  // ---------------------------------------------------------------------------
  // Toasts and resilient copy/share utilities
  // ---------------------------------------------------------------------------
  const toast = $('#toast-message');
  let toastTimer = 0;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2800);
  }

  async function copyText(value, successMessage = 'Copied to clipboard.') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        showToast(successMessage);
        return true;
      }
      const field = document.createElement('textarea');
      field.value = value;
      field.setAttribute('readonly', '');
      field.setAttribute('aria-hidden', 'true');
      field.style.position = 'fixed';
      field.style.opacity = '0';
      field.style.pointerEvents = 'none';
      field.style.inset = '0 auto auto -9999px';
      document.body.appendChild(field);
      field.select();
      field.setSelectionRange(0, field.value.length);
      const copied = Boolean(document.execCommand && document.execCommand('copy'));
      field.remove();
      showToast(copied ? successMessage : `Copy this manually: ${value}`);
      return copied;
    } catch (_) {
      showToast(`Copy this manually: ${value}`);
      return false;
    }
  }

  function isEditableTarget(target) {
    return Boolean(target && target.closest && target.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'));
  }

  // ---------------------------------------------------------------------------
  // Responsive navigation and theme preferences
  // ---------------------------------------------------------------------------
  const menuToggle = $('#menu-toggle');
  const nav = $('#primary-nav');
  const navLinks = $$('.nav-link');

  function setMenu(open) {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
  }

  menuToggle?.addEventListener('click', () => {
    setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  navLinks.forEach(link => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('click', event => {
    if (menuToggle?.getAttribute('aria-expanded') === 'true' && nav && !nav.contains(event.target) && !menuToggle.contains(event.target)) {
      setMenu(false);
    }
  });

  const themeButton = $('#theme-toggle');
  const themeIcon = $('#theme-icon');
  const themeMeta = $('meta[name="theme-color"]');
  const themePreference = safelyRead('mukesh-portfolio-theme');
  let themeWasChosen = themePreference === 'dark' || themePreference === 'light';
  if (themeWasChosen) {
    if (themePreference === 'dark') document.body.dataset.theme = 'dark';
    else delete document.body.dataset.theme;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.body.dataset.theme = 'dark';
  }

  function refreshThemeButton() {
    const dark = document.body.dataset.theme === 'dark';
    if (themeIcon) themeIcon.textContent = dark ? '☀' : '☾';
    if (themeButton) {
      themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      themeButton.setAttribute('aria-pressed', String(dark));
      themeButton.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
    if (themeMeta) themeMeta.setAttribute('content', dark ? '#0e1728' : '#92A8D1');
  }
  refreshThemeButton();
  themeButton?.addEventListener('click', () => {
    const dark = document.body.dataset.theme !== 'dark';
    if (dark) document.body.dataset.theme = 'dark';
    else delete document.body.dataset.theme;
    themeWasChosen = true;
    safelyWrite('mukesh-portfolio-theme', dark ? 'dark' : 'light');
    refreshThemeButton();
    showToast(dark ? 'Dark theme enabled.' : 'Light theme enabled.');
  });

  if (window.matchMedia) {
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    const syncSystemTheme = event => {
      if (themeWasChosen) return;
      if (event.matches) document.body.dataset.theme = 'dark';
      else delete document.body.dataset.theme;
      refreshThemeButton();
    };
    if (systemTheme.addEventListener) systemTheme.addEventListener('change', syncSystemTheme);
    else if (systemTheme.addListener) systemTheme.addListener(syncSystemTheme);
  }

  // Role rotation pauses when the tab is hidden and respects reduced motion.
  const roleRotator = $('#role-rotator');
  const roles = ['Python Developer', 'AI / ML Enthusiast', 'Software Developer', 'Computer Vision Learner'];
  let roleIndex = 0;
  let roleTimer = 0;
  function startRoleRotation() {
    if (!roleRotator || reducedMotion.matches || document.hidden || roleTimer) return;
    roleTimer = window.setInterval(() => {
      roleIndex = (roleIndex + 1) % roles.length;
      roleRotator.classList.add('role-changing');
      window.setTimeout(() => {
        roleRotator.textContent = roles[roleIndex];
        roleRotator.classList.remove('role-changing');
      }, 160);
    }, 3000);
  }
  function stopRoleRotation() {
    window.clearInterval(roleTimer);
    roleTimer = 0;
  }
  startRoleRotation();
  document.addEventListener('visibilitychange', () => document.hidden ? stopRoleRotation() : startRoleRotation());
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', () => reducedMotion.matches ? stopRoleRotation() : startRoleRotation());

  // ---------------------------------------------------------------------------
  // Scroll progress, active section, sticky header, and reveal animations
  // ---------------------------------------------------------------------------
  const progressBar = $('#scroll-progress-bar');
  const backTop = $('#back-top-floating');
  const header = $('.site-header');
  const navTargets = navLinks.map(link => {
    const hash = link.getAttribute('href');
    return { link, target: hash && hash.startsWith('#') ? document.getElementById(hash.slice(1)) : null };
  }).filter(item => item.target);
  let scrollScheduled = false;

  function updateActiveNav() {
    if (!navTargets.length) return;
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const readingLine = window.scrollY + headerHeight + Math.min(window.innerHeight * 0.27, 180);
    let activeItem = navTargets[0];
    for (const item of navTargets) {
      const sectionTop = item.target.getBoundingClientRect().top + window.scrollY;
      if (sectionTop <= readingLine + 2) activeItem = item;
      else break;
    }
    const distanceToBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    if (distanceToBottom < 30 && navTargets.length) activeItem = navTargets[navTargets.length - 1];
    navTargets.forEach(item => {
      const active = item === activeItem;
      item.link.classList.toggle('active', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
  }

  function updateScrollUi() {
    const root = document.documentElement;
    const maxScroll = Math.max(0, root.scrollHeight - window.innerHeight);
    const progress = maxScroll ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)) : 0;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (backTop) backTop.classList.toggle('visible', window.scrollY > 540);
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 18);
    updateActiveNav();
    scrollScheduled = false;
  }

  function scheduleScrollUi() {
    if (scrollScheduled) return;
    scrollScheduled = true;
    window.requestAnimationFrame(updateScrollUi);
  }
  window.addEventListener('scroll', scheduleScrollUi, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setMenu(false);
    scheduleScrollUi();
  }, { passive: true });
  window.addEventListener('load', scheduleScrollUi, { once: true });
  window.addEventListener('pageshow', scheduleScrollUi);
  window.addEventListener('orientationchange', scheduleScrollUi, { passive: true });
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' }));
  scheduleScrollUi();
  if ('ResizeObserver' in window) {
    const resizeObserver = new ResizeObserver(scheduleScrollUi);
    resizeObserver.observe(document.body);
  }

  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion.matches) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  // ---------------------------------------------------------------------------
  // Project filtering, live search, clear control, and skill-to-project discovery
  // ---------------------------------------------------------------------------
  const filterButtons = $$('.filter-button');
  const projectCards = $$('.project-card[data-category]');
  const projectSearch = $('#project-search');
  const projectResults = $('#project-results');
  const projectEmpty = $('#projects-empty');
  const searchClear = $('#search-clear');
  let activeProjectFilter = 'all';

  function updateFilterCounts() {
    filterButtons.forEach(button => {
      const filter = button.dataset.filter || 'all';
      const count = filter === 'all' ? projectCards.length : projectCards.filter(card => card.dataset.category === filter).length;
      const badge = $('span', button);
      if (badge) badge.textContent = String(count).padStart(2, '0');
    });
    const projectCount = $('.projects-count');
    if (projectCount) projectCount.textContent = String(projectCards.length).padStart(2, '0');
  }

  function applyProjectFilters() {
    const query = (projectSearch?.value || '').trim().toLocaleLowerCase();
    let visibleCount = 0;
    projectCards.forEach(card => {
      const categoryMatch = activeProjectFilter === 'all' || card.dataset.category === activeProjectFilter;
      const searchableText = `${card.textContent || ''} ${card.dataset.project || ''} ${card.dataset.projectSearch || ''}`.toLocaleLowerCase();
      const searchMatch = !query || searchableText.includes(query);
      const show = categoryMatch && searchMatch;
      card.hidden = !show;
      if (show) {
        visibleCount += 1;
        card.classList.add('is-visible');
      }
    });
    if (searchClear) searchClear.hidden = !query;
    if (projectResults) {
      const liveDot = document.createElement('span');
      liveDot.className = 'tiny-live';
      liveDot.setAttribute('aria-hidden', 'true');
      const categoryLabel = activeProjectFilter === 'all' ? 'all categories' : (activeProjectFilter === 'ai' ? 'AI / ML' : 'web apps');
      const label = query
        ? `Found ${visibleCount} ${visibleCount === 1 ? 'project' : 'projects'} for “${query}”`
        : `Showing ${visibleCount} ${visibleCount === 1 ? 'project' : 'projects'} · ${categoryLabel}`;
      projectResults.replaceChildren(liveDot, document.createTextNode(` ${label}`));
    }
    if (projectEmpty) projectEmpty.hidden = visibleCount > 0;
  }

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      activeProjectFilter = button.dataset.filter || 'all';
      filterButtons.forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      applyProjectFilters();
    });
  });
  projectSearch?.addEventListener('input', applyProjectFilters);
  searchClear?.addEventListener('click', () => {
    if (projectSearch) {
      projectSearch.value = '';
      projectSearch.focus();
    }
    applyProjectFilters();
  });
  updateFilterCounts();
  applyProjectFilters();

  // Convert skill chips into accessible project-discovery buttons, keeping their visual look.
  $$('.skill-tags span').forEach(span => {
    const skillName = span.textContent.trim();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'skill-tag-action';
    button.textContent = skillName;
    button.title = `Find projects related to ${skillName}`;
    button.setAttribute('aria-label', `Find projects related to ${skillName}`);
    button.addEventListener('click', () => {
      if (projectSearch) projectSearch.value = skillName;
      activeProjectFilter = 'all';
      filterButtons.forEach(item => {
        const active = (item.dataset.filter || 'all') === 'all';
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      applyProjectFilters();
      document.getElementById('projects')?.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
      window.setTimeout(() => projectSearch?.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 350);
    });
    span.replaceWith(button);
  });

  // ---------------------------------------------------------------------------
  // Project case studies: no scroll restoration jump, focus returns to the trigger
  // ---------------------------------------------------------------------------
  const projects = {
    vehicle: {
      title: 'Vehicle Damage Detection', category: 'AI / ML · Computer Vision', status: 'In development',
      image: 'assets/images/vehicle-damage.webp', imageAlt: 'Illustrative AI vehicle inspection scene highlighting visible body damage',
      description: 'An image-based computer-vision project exploring how visible vehicle damage can be detected and categorized. The intended workflow is to help create an initial damage assessment from an uploaded vehicle image.',
      bullets: ['Use YOLOv11 object detection as the starting model.', 'Prepare images and annotations for visible damage regions.', 'Use OpenCV and Python in the image-processing workflow.', 'Clearly label severity and repair-cost outputs as estimates if implemented.'],
      tags: ['Python', 'YOLOv11', 'OpenCV', 'Computer Vision'],
      note: 'Development status: in progress. This portfolio does not claim a validated accuracy score or production-ready repair-cost estimate.'
    },
    loanclear: {
      title: 'LoanClear', category: 'Web application', status: 'Portfolio project',
      image: 'assets/images/loanclear-dashboard.svg', imageAlt: 'Illustrative LoanClear dashboard concept',
      description: 'A Python and Flask loan-management application designed to make multiple loans easier to track from one place.',
      bullets: ['Record loan balances and interest rates.', 'Organize due dates, repayment schedules, and payment history.', 'Use a dashboard to summarize balances and upcoming payments.', 'Designed around a Python and Flask backend with a MySQL database.'],
      tags: ['Python', 'Flask', 'MySQL', 'SQL', 'HTML5', 'CSS3', 'JavaScript'],
      note: 'The image is an illustrative dashboard mockup; displayed amounts and dates are sample UI content, not real financial data.'
    },
    portfolio: {
      title: 'Personal Portfolio Website', category: 'Frontend / Web development', status: 'Current website',
      image: 'assets/images/portfolio-preview.webp', imageAlt: 'Illustrative blue portfolio interface concept',
      description: 'A responsive personal website intended to showcase skills, projects, education, certifications, and contact details with a clear, accessible experience.',
      bullets: ['Responsive layouts for desktop, tablet, and mobile screens.', 'JavaScript interactions for theme switching, project filtering, and project detail dialogs.', 'Keyboard-friendly quick navigation, copy/share actions, and accessible controls.', 'Designed to be hosted as a static website using GitHub Pages or another static host.'],
      tags: ['HTML5', 'CSS3', 'JavaScript', 'Responsive design', 'Accessibility'],
      note: 'The large portfolio image is a design concept preview; this website uses its own responsive layout and local assets.'
    }
  };

  const projectDialog = $('#project-dialog');
  const dialogClose = $('#dialog-close');
  const dialogTitle = $('#dialog-title');
  const dialogKicker = $('#dialog-kicker');
  const dialogCategory = $('#dialog-category');
  const dialogStatus = $('#dialog-status');
  const dialogImage = $('#dialog-image');
  const dialogDescription = $('#dialog-description');
  const dialogBullets = $('#dialog-bullets');
  const dialogTags = $('#dialog-tags');
  const dialogNote = $('#dialog-note');
  const dialogGallery = $('#dialog-gallery-nav');
  let lastProjectTrigger = null;

  const portfolioGallery = [
    { src: 'assets/images/portfolio-preview.webp', alt: 'Blue portfolio interface preview', label: 'Blue interface' },
    { src: 'assets/images/portfolio-concept.webp', alt: 'Portfolio homepage concept using the blue theme', label: 'Homepage concept' }
  ];

  function renderPortfolioGallery(selectedSrc) {
    if (!dialogGallery) return;
    dialogGallery.replaceChildren();
    portfolioGallery.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'dialog-gallery-button';
      button.setAttribute('aria-pressed', String(item.src === selectedSrc));
      button.setAttribute('aria-label', `Show ${item.label}`);
      const image = document.createElement('img');
      image.src = item.src;
      image.alt = '';
      image.loading = 'lazy';
      image.decoding = 'async';
      const label = document.createElement('span');
      label.textContent = item.label;
      button.append(image, label);
      button.addEventListener('click', () => {
        if (!dialogImage) return;
        dialogImage.src = item.src;
        dialogImage.alt = item.alt;
        $$('.dialog-gallery-button', dialogGallery).forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      });
      dialogGallery.append(button);
    });
    dialogGallery.hidden = false;
  }

  function openProject(key, trigger = null) {
    if (commandDialog?.open) commandDialog.close();
    const project = projects[key];
    if (!project || !projectDialog) return;
    lastProjectTrigger = trigger instanceof HTMLElement ? trigger : null;
    if (dialogTitle) dialogTitle.textContent = project.title;
    if (dialogKicker) dialogKicker.textContent = project.category.toUpperCase();
    if (dialogCategory) dialogCategory.textContent = project.category;
    if (dialogStatus) dialogStatus.textContent = project.status;
    if (dialogImage) {
      dialogImage.src = project.image;
      dialogImage.alt = project.imageAlt;
    }
    if (dialogDescription) dialogDescription.textContent = project.description;
    if (dialogNote) dialogNote.textContent = project.note;
    if (dialogGallery) {
      dialogGallery.replaceChildren();
      dialogGallery.hidden = true;
    }
    if (key === 'portfolio') renderPortfolioGallery(project.image);
    if (dialogBullets) dialogBullets.replaceChildren(...project.bullets.map(text => {
      const li = document.createElement('li');
      li.textContent = text;
      return li;
    }));
    if (dialogTags) dialogTags.replaceChildren(...project.tags.map(text => {
      const span = document.createElement('span');
      span.textContent = text;
      return span;
    }));
    if (typeof projectDialog.showModal === 'function') projectDialog.showModal();
    else projectDialog.setAttribute('open', '');
    dialogClose?.focus({ preventScroll: true });
  }

  $$('[data-project-details]').forEach(button => {
    button.addEventListener('click', () => openProject(button.dataset.projectDetails, button));
  });
  dialogClose?.addEventListener('click', () => {
    if (projectDialog?.open && typeof projectDialog.close === 'function') projectDialog.close();
    else projectDialog?.removeAttribute('open');
  });
  projectDialog?.addEventListener('click', event => {
    if (event.target === projectDialog) {
      if (typeof projectDialog.close === 'function') projectDialog.close();
      else projectDialog.removeAttribute('open');
    }
  });
  projectDialog?.addEventListener('cancel', event => {
    event.preventDefault();
    if (typeof projectDialog.close === 'function') projectDialog.close();
    else projectDialog.removeAttribute('open');
  });
  projectDialog?.addEventListener('close', () => {
    if (lastProjectTrigger && document.contains(lastProjectTrigger)) {
      try { lastProjectTrigger.focus({ preventScroll: true }); }
      catch (_) { lastProjectTrigger.focus(); }
    }
    lastProjectTrigger = null;
    // Do not call scrollTo() here: native <dialog> keeps the current page position.
  });

  // ---------------------------------------------------------------------------
  // Email copy, page sharing, profile links, and downloadable contact card
  // ---------------------------------------------------------------------------
  function getPortfolioUrl() {
    try {
      const url = new URL(window.location.href);
      url.hash = '';
      return url.toString();
    } catch (_) {
      return window.location.href.split('#')[0];
    }
  }

  $$('[data-copy-email]').forEach(button => {
    button.addEventListener('click', () => copyText(button.dataset.copyEmail || 'mukesh9696fc@gmail.com', 'Email address copied.'));
  });
  $$('[data-copy-page-url]').forEach(button => {
    button.addEventListener('click', () => copyText(getPortfolioUrl(), 'Portfolio link copied.'));
  });
  $$('[data-share-portfolio]').forEach(button => {
    button.addEventListener('click', async () => {
      const shareData = { title: 'Mukesh S — Developer Portfolio', text: 'Explore Mukesh S’s Python, AI/ML, and web development portfolio.', url: getPortfolioUrl() };
      if (navigator.share) {
        try { await navigator.share(shareData); }
        catch (error) { if (error?.name !== 'AbortError') showToast('Sharing was unavailable. Copy the portfolio link instead.'); }
      } else {
        await copyText(getPortfolioUrl(), 'Portfolio link copied — ready to share.');
      }
    });
  });

  const recruiterSummary = 'Mukesh S is a 2026 B.E. Computer Science and Engineering graduate from K. Ramakrishnan College of Technology. He is interested in entry-level Python Developer, software development, AI/ML, and computer vision opportunities. Skills include Python, JavaScript, SQL/MySQL, Machine Learning, Deep Learning, Generative AI, YOLOv11, OpenCV, HTML5, CSS3, Azure Fundamentals, and networking fundamentals. Projects: Vehicle Damage Detection (in development), LoanClear, and Personal Portfolio Website. Internship: Python & Web Development Intern at GR Soft Tech. Email: mukesh9696fc@gmail.com | GitHub: https://github.com/MukeshKrct | LinkedIn: https://www.linkedin.com/in/mukesh96fc/';
  $$('[data-copy-recruiter-summary]').forEach(button => button.addEventListener('click', () => copyText(recruiterSummary, 'Recruiter summary copied.')));
  $$('[data-print-portfolio]').forEach(button => button.addEventListener('click', () => window.print()));
  $$('[data-download-skills]').forEach(button => button.addEventListener('click', () => {
    const groups = $$('.skill-panel').map(panel => {
      const title = $('h3', panel)?.textContent.trim() || 'Skills';
      const skills = $$('.skill-tags span, .skill-tags button', panel).map(item => item.textContent.trim()).filter(Boolean);
      return `${title}\n${skills.map(skill => `- ${skill}`).join('\n')}`;
    });
    const body = `Mukesh S — Technical Skills\n${'='.repeat(31)}\n\n${groups.join('\n\n')}\n\nGitHub: https://github.com/MukeshKrct\nLinkedIn: https://www.linkedin.com/in/mukesh96fc/\nEmail: mukesh9696fc@gmail.com\n`;
    const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Mukesh_S_Technical_Skills.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Skills list downloaded.');
  }));

  // ---------------------------------------------------------------------------
  // Command palette: Ctrl/⌘+K, arrow-key navigation, section shortcuts, and actions
  // ---------------------------------------------------------------------------
  const commandDialog = $('#command-dialog');
  const commandToggle = $('#command-toggle');
  const commandClose = $('#command-close');
  const commandSearch = $('#command-search');
  const commandResults = $('#command-results');
  let commandActiveIndex = 0;
  let lastCommandTrigger = null;

  function goToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    if (commandDialog?.open) commandDialog.close();
    target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
    try { history.replaceState(null, '', `#${id}`); } catch (_) { /* Local-file URLs may not support history updates. */ }
    setMenu(false);
  }

  const commandItems = [
    { label: 'Go to Home', detail: 'Introduction and main actions', keywords: 'home start intro', action: () => goToSection('home') },
    { label: 'Go to About', detail: 'Background and approach', keywords: 'about profile graduate', action: () => goToSection('about') },
    { label: 'Go to Skills', detail: 'Python, AI/ML, databases, web and cloud', keywords: 'skills stack python sql yolo', action: () => goToSection('skills') },
    { label: 'Go to Projects', detail: 'Search and explore the three selected projects', keywords: 'projects work portfolio loanclear vehicle', action: () => goToSection('projects') },
    { label: 'Go to Experience & Education', detail: 'Internship and degree', keywords: 'journey experience education college', action: () => goToSection('journey') },
    { label: 'Go to Certifications', detail: 'Azure Fundamentals and GenAI course', keywords: 'certifications azure az-900 genai', action: () => goToSection('certifications') },
    { label: 'Go to Contact', detail: 'Email, phone, GitHub, LinkedIn', keywords: 'contact email phone linkedin github', action: () => goToSection('contact') },
    { label: 'Toggle light / dark theme', detail: 'Switch visual theme', keywords: 'theme dark light appearance', action: () => themeButton?.click() },
    { label: 'Download resume', detail: 'Save the resume PDF', keywords: 'resume cv pdf download', action: () => { const link = $('.nav-resume'); link?.click(); } },
    { label: 'Search projects', detail: 'Find work by title or technology', keywords: 'search filter find projects', action: () => { goToSection('projects'); window.setTimeout(() => projectSearch?.focus({ preventScroll: true }), reducedMotion.matches ? 0 : 350); } },
    { label: 'Copy email address', detail: 'Copy mukesh9696fc@gmail.com', keywords: 'email copy address', action: () => copyText('mukesh9696fc@gmail.com', 'Email address copied.') },
    { label: 'Open GitHub profile', detail: 'github.com/MukeshKrct', keywords: 'github repository code', action: () => window.open('https://github.com/MukeshKrct', '_blank', 'noopener,noreferrer') },
    { label: 'Share portfolio link', detail: 'Copy this page URL', keywords: 'share page url link', action: () => copyText(getPortfolioUrl(), 'Portfolio link copied.') },
    { label: 'Open Portfolio Guide', detail: 'Ask questions about Mukesh’s skills, projects, and contact details', keywords: 'guide assistant help ask questions chatbot', action: () => openPortfolioGuide(commandToggle) },
    { label: 'Copy recruiter summary', detail: 'Copy a concise professional introduction', keywords: 'recruiter summary introduction bio copy', action: () => copyText(recruiterSummary, 'Recruiter summary copied.') },
    { label: 'Open Vehicle Damage Detection case study', detail: 'AI / ML project', keywords: 'vehicle damage yolo11 opencv computer vision', action: () => openProject('vehicle') },
    { label: 'Open LoanClear case study', detail: 'Loan management web application', keywords: 'loan clear flask mysql repayment', action: () => openProject('loanclear') }
  ];

  function renderCommands() {
    if (!commandResults) return;
    const query = (commandSearch?.value || '').trim().toLowerCase();
    const filtered = commandItems.filter(item => `${item.label} ${item.detail} ${item.keywords}`.toLowerCase().includes(query));
    commandActiveIndex = Math.max(0, Math.min(commandActiveIndex, filtered.length - 1));
    commandResults.replaceChildren();
    if (!filtered.length) {
      const empty = document.createElement('p');
      empty.className = 'command-empty';
      empty.textContent = 'No actions found. Try a section name or keyword.';
      commandResults.append(empty);
      return;
    }
    filtered.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'command-option';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', String(index === commandActiveIndex));
      const copy = document.createElement('span');
      copy.className = 'command-option-copy';
      const title = document.createElement('strong');
      title.textContent = item.label;
      const detail = document.createElement('small');
      detail.textContent = item.detail;
      copy.append(title, detail);
      const glyph = document.createElement('span');
      glyph.className = 'command-option-glyph';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = index === commandActiveIndex ? '↵' : '↗';
      button.append(copy, glyph);
      button.addEventListener('mouseenter', () => {
        commandActiveIndex = index;
        $$('.command-option', commandResults).forEach((option, optionIndex) => option.setAttribute('aria-selected', String(optionIndex === commandActiveIndex)));
      });
      button.addEventListener('click', () => { closeCommandPalette(); item.action(); });
      commandResults.append(button);
    });
    const active = $('.command-option[aria-selected="true"]', commandResults);
    active?.scrollIntoView({ block: 'nearest' });
  }

  function openCommandPalette(trigger = document.activeElement) {
    if (!commandDialog) return;
    if (projectDialog?.open) return;
    if (commandDialog.open) {
      commandSearch?.focus({ preventScroll: true });
      return;
    }
    lastCommandTrigger = trigger instanceof HTMLElement ? trigger : commandToggle;
    if (commandSearch) commandSearch.value = '';
    commandActiveIndex = 0;
    renderCommands();
    if (typeof commandDialog.showModal === 'function') commandDialog.showModal();
    else commandDialog.setAttribute('open', '');
    window.setTimeout(() => commandSearch?.focus({ preventScroll: true }), 0);
  }
  function closeCommandPalette() {
    if (commandDialog?.open && typeof commandDialog.close === 'function') commandDialog.close();
    else commandDialog?.removeAttribute('open');
  }
  commandToggle?.addEventListener('click', () => openCommandPalette(commandToggle));
  commandClose?.addEventListener('click', closeCommandPalette);
  commandSearch?.addEventListener('input', () => { commandActiveIndex = 0; renderCommands(); });
  commandSearch?.addEventListener('keydown', event => {
    const options = $$('.command-option', commandResults || document);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      commandActiveIndex = options.length ? (commandActiveIndex + 1) % options.length : 0;
      renderCommands();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      commandActiveIndex = options.length ? (commandActiveIndex - 1 + options.length) % options.length : 0;
      renderCommands();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      options[commandActiveIndex]?.click();
    }
  });
  commandDialog?.addEventListener('click', event => {
    if (event.target === commandDialog) closeCommandPalette();
  });
  commandDialog?.addEventListener('cancel', event => {
    event.preventDefault();
    closeCommandPalette();
  });
  commandDialog?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCommandPalette();
    }
  });
  commandDialog?.addEventListener('close', () => {
    if (lastCommandTrigger && document.contains(lastCommandTrigger)) {
      try { lastCommandTrigger.focus({ preventScroll: true }); }
      catch (_) { lastCommandTrigger.focus(); }
    }
    lastCommandTrigger = null;
  });

  document.addEventListener('keydown', event => {
    const shortcut = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
    if (shortcut) {
      event.preventDefault();
      openCommandPalette(document.activeElement);
      return;
    }
    if (event.key === '/' && !isEditableTarget(event.target) && !event.altKey && !event.ctrlKey && !event.metaKey) {
      if (projectSearch) {
        event.preventDefault();
        projectSearch.focus();
        goToSection('projects');
      }
    }
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuToggle.focus({ preventScroll: true });
    }
  });

  // ---------------------------------------------------------------------------
  // Local Portfolio Guide — curated answers, no API, network request, or storage
  // ---------------------------------------------------------------------------
  const guideToggle = $('#guide-toggle');
  const guidePanel = $('#guide-panel');
  const guideClose = $('#guide-close');
  const guideReset = $('#guide-reset');
  const guideForm = $('#guide-form');
  const guideInput = $('#guide-input');
  const guideMessages = $('#guide-messages');
  const guideWelcome = 'Hi! Ask me about projects, skills, education, experience, certifications, or contact details.';

  function setGuideOpen(open, focusInput = false) {
    if (!guideToggle || !guidePanel) return;
    guidePanel.hidden = !open;
    guideToggle.setAttribute('aria-expanded', String(open));
    guideToggle.setAttribute('aria-label', open ? 'Close portfolio guide' : 'Open portfolio guide');
    if (open && focusInput) window.setTimeout(() => guideInput?.focus({ preventScroll: true }), 40);
    if (!open) guideToggle.focus({ preventScroll: true });
  }

  function resetGuide() {
    if (!guideMessages) return;
    guideMessages.replaceChildren();
    appendGuideMessage(guideWelcome, 'bot');
    if (guideInput) guideInput.value = '';
    guideInput?.focus({ preventScroll: true });
  }

  function appendGuideMessage(text, sender = 'bot', action = null) {
    if (!guideMessages) return;
    const article = document.createElement('article');
    article.className = `guide-message ${sender === 'user' ? 'guide-message-user' : 'guide-message-bot'}`;
    const label = document.createElement('span');
    label.className = 'guide-message-label';
    label.textContent = sender === 'user' ? 'YOU' : 'GUIDE';
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    article.append(label, paragraph);
    if (action?.label && action?.type) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'guide-message-action';
      button.textContent = action.label;
      button.addEventListener('click', () => runGuideAction(action));
      article.append(button);
    }
    guideMessages.append(article);
    while (guideMessages.children.length > 24) guideMessages.firstElementChild?.remove();
    guideMessages.scrollTop = guideMessages.scrollHeight;
  }

  function getGuideAnswer(question) {
    const q = question.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    if (/\b(hi|hello|hey|good morning|good afternoon)\b/.test(q)) {
      return { text: 'Hello! I can point you to Mukesh’s projects, skills, education, experience, certifications, resume, and contact information. What would you like to explore?' };
    }
    if (/\b(github|git hub|repo|repository|source code)\b/.test(q)) {
      return { text: 'Mukesh’s GitHub profile is github.com/MukeshKrct. Public project repositories should only be added to this portfolio when they are available and ready to share.', action: { label: 'Open GitHub profile ↗', type: 'link', value: 'https://github.com/MukeshKrct' } };
    }
    if (/\blinkedin\b/.test(q)) {
      return { text: 'You can find Mukesh on LinkedIn at linkedin.com/in/mukesh96fc/.', action: { label: 'Open LinkedIn ↗', type: 'link', value: 'https://www.linkedin.com/in/mukesh96fc/' } };
    }
    if (/\b(resume|cv|curriculum vitae)\b/.test(q)) {
      return { text: 'The resume PDF is available from the Resume button in the navigation and from the project shortcuts. Use the button below to download it.', action: { label: 'Download resume ↓', type: 'resume' } };
    }
    if (/\b(contact|email|phone|call|reach|message)\b/.test(q)) {
      return { text: 'You can contact Mukesh by email at mukesh9696fc@gmail.com or phone at +91 96007 83867. LinkedIn and GitHub links are also available in the Contact section.', action: { label: 'Go to Contact ↗', type: 'section', value: 'contact' } };
    }
    if (/\b(vehicle|damage|yolo|opencv|computer vision|car)\b/.test(q)) {
      return { text: 'Vehicle Damage Detection is an in-development computer-vision project exploring YOLOv11 and OpenCV to detect visible vehicle damage from images. The portfolio does not claim validated accuracy or a production-ready repair estimate.', action: { label: 'View case study ↗', type: 'project', value: 'vehicle' } };
    }
    if (/\b(loanclear|loan|repayment|interest|flask|mysql)\b/.test(q)) {
      return { text: 'LoanClear is a loan-management web application concept built around Python, Flask, MySQL, SQL, and JavaScript. It is designed to organize balances, interest, repayment schedules, and history; the dashboard art is illustrative.', action: { label: 'View LoanClear ↗', type: 'project', value: 'loanclear' } };
    }
    if (/\b(portfolio website|website project|frontend project|html|css|javascript)\b/.test(q)) {
      return { text: 'The Personal Portfolio Website showcases skills, projects, education, and contact details with responsive HTML, CSS, and JavaScript. Its case study describes features included in this static site.', action: { label: 'View portfolio case study ↗', type: 'project', value: 'portfolio' } };
    }
    if (/\b(project|projects|work|built|build)\b/.test(q)) {
      return { text: 'The portfolio currently highlights three selected projects: Vehicle Damage Detection (in development), LoanClear, and the Personal Portfolio Website.', action: { label: 'Explore projects ↗', type: 'section', value: 'projects' } };
    }
    if (/\b(certification|certificate|az-900|azure|udemy|generative ai course)\b/.test(q)) {
      return { text: 'The certifications and learning section lists Microsoft Certified: Azure Fundamentals (AZ-900) and Generative AI With Python coursework on Udemy.', action: { label: 'View certifications ↗', type: 'section', value: 'certifications' } };
    }
    if (/\b(skill|skills|technology|technologies|tech stack|python|machine learning|deep learning|ai|azure|sql)\b/.test(q)) {
      return { text: 'The current skill list includes Python, JavaScript, SQL/MySQL, Machine Learning, Deep Learning, Generative AI, YOLOv11, OpenCV, HTML5, CSS3, Git/GitHub, Azure Fundamentals, and networking fundamentals. Select Skills to see them grouped by area.', action: { label: 'Explore skills ↗', type: 'section', value: 'skills' } };
    }
    if (/\b(experience|internship|work history)\b/.test(q)) {
      return { text: 'Mukesh completed a Python & Web Development internship at GR Soft Tech, where he worked on web-based applications with Python, HTML, CSS, JavaScript, and SQL and implemented and tested features.', action: { label: 'View journey ↗', type: 'section', value: 'journey' } };
    }
    if (/\b(education|college|degree|graduate|university)\b/.test(q)) {
      return { text: 'Mukesh is a 2026 B.E. Computer Science and Engineering graduate from K. Ramakrishnan College of Technology, affiliated with Anna University.', action: { label: 'View journey ↗', type: 'section', value: 'journey' } };
    }
    if (/\b(hire|hiring|job|jobs|opportunity|opportunities|available|open to work)\b/.test(q)) {
      return { text: 'Mukesh is interested in entry-level opportunities related to Python development, software development, AI/ML, and computer vision. Use the Contact section to discuss a suitable role.', action: { label: 'Contact Mukesh ↗', type: 'section', value: 'contact' } };
    }
    if (/\b(about|who is mukesh|introduce|introduction)\b/.test(q)) {
      return { text: 'Mukesh S is a 2026 Computer Science Engineering graduate interested in Python development, practical software, AI/ML, computer vision, and web applications.' , action: { label: 'Read About Me ↗', type: 'section', value: 'about' } };
    }
    return { text: 'I can help with this portfolio’s projects, skills, resume, internship, education, certifications, GitHub, LinkedIn, or contact details. Try a question like “What projects has Mukesh worked on?”' };
  }

  function runGuideAction(action) {
    setGuideOpen(false);
    if (action.type === 'section') goToSection(action.value);
    else if (action.type === 'project') openProject(action.value);
    else if (action.type === 'resume') $('.nav-resume')?.click();
    else if (action.type === 'link') window.open(action.value, '_blank', 'noopener,noreferrer');
  }

  function askGuide(question) {
    const clean = String(question || '').trim().slice(0, 240);
    if (!clean) return;
    appendGuideMessage(clean, 'user');
    const answer = getGuideAnswer(clean);
    appendGuideMessage(answer.text, 'bot', answer.action);
  }

  function openPortfolioGuide(trigger = document.activeElement) {
    if (commandDialog?.open) closeCommandPalette();
    if (projectDialog?.open) return;
    setGuideOpen(true, true);
  }

  guideToggle?.addEventListener('click', () => setGuideOpen(guidePanel?.hidden === true, guidePanel?.hidden === true));
  guideClose?.addEventListener('click', () => setGuideOpen(false));
  guideReset?.addEventListener('click', resetGuide);
  guideForm?.addEventListener('submit', event => {
    event.preventDefault();
    const question = guideInput?.value || '';
    if (!question.trim()) { guideInput?.focus(); return; }
    if (guideInput) guideInput.value = '';
    askGuide(question);
    guideInput?.focus({ preventScroll: true });
  });
  $$('[data-guide-prompt]').forEach(button => button.addEventListener('click', () => askGuide(button.dataset.guidePrompt || '')));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && guidePanel && !guidePanel.hidden && !commandDialog?.open && !projectDialog?.open) {
      event.preventDefault();
      setGuideOpen(false);
    }
  });

  // ---------------------------------------------------------------------------
  // Progressive Web App: install prompt and resilient offline asset caching
  // ---------------------------------------------------------------------------
  const installButton = $('#install-app');
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener('click', async () => {
    if (!deferredInstallPrompt) {
      showToast('Use your browser menu and choose “Install app” or “Add to Home Screen” when available.');
      return;
    }
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    if (installButton) installButton.hidden = true;
    if (choice?.outcome === 'accepted') showToast('Thanks for installing the portfolio.');
  });
  window.addEventListener('appinstalled', () => {
    if (installButton) installButton.hidden = true;
    deferredInstallPrompt = null;
    showToast('Portfolio installed successfully.');
  });
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {
      // The website still works normally if the host does not support service workers.
    });
  }
  window.addEventListener('offline', () => showToast('You are offline. Previously cached portfolio files may still be available.'));
  window.addEventListener('online', () => showToast('Connection restored.'));

  // ---------------------------------------------------------------------------
  // ULTIMATE 100: personalization, project workspace, bookmarks, comparison,
  // exports, contact email builder, and keyboard-friendly enhancements.
  // ---------------------------------------------------------------------------
  const removeStored = key => {
    try { window.localStorage.removeItem(key); } catch (_) { /* optional preference */ }
  };
  const openDialogSafely = dialog => {
    if (!dialog) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  };
  const closeDialogSafely = dialog => {
    if (!dialog) return;
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  };
  const downloadTextFile = (filename, text, mime = 'text/plain;charset=utf-8') => {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
  };
  const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;

  // A. Preferences control center: accent palette, text size, contrast, motion,
  //    recruiter-focused layout, reading mode, persistence, and reset.
  const preferencesDialog = $('#preferences-dialog');
  const preferencesToggle = $('#preferences-toggle');
  const preferencesClose = $('#preferences-close');
  const preferencesDone = $('#preferences-done');
  const paletteMap = {
    blue: { accent: '#92a8d1', strong: '#577bb9', deep: '#35558f', navy: '#152746' },
    violet: { accent: '#b7a3e8', strong: '#7659b8', deep: '#563c91', navy: '#292144' },
    teal: { accent: '#8ccdc7', strong: '#348c85', deep: '#236a65', navy: '#173b43' },
    rose: { accent: '#e8a8b8', strong: '#b95d78', deep: '#8d3c56', navy: '#452333' }
  };
  const preferenceKeys = {
    accent: 'mukesh-portfolio-accent', font: 'mukesh-portfolio-font-size',
    contrast: 'mukesh-portfolio-high-contrast', motion: 'mukesh-portfolio-reduce-motion',
    recruiter: 'mukesh-portfolio-recruiter-mode', reading: 'mukesh-portfolio-reading-mode'
  };
  const savedPreference = key => safelyRead(key);
  function applyAccent(name, showNotice = false) {
    const palette = paletteMap[name] || paletteMap.blue;
    document.documentElement.dataset.accent = paletteMap[name] ? name : 'blue';
    document.documentElement.style.setProperty('--accent', palette.accent);
    document.documentElement.style.setProperty('--accent-strong', palette.strong);
    document.documentElement.style.setProperty('--accent-deep', palette.deep);
    document.documentElement.style.setProperty('--navy', palette.navy);
    document.documentElement.style.setProperty('--navy-2', palette.navy);
    $$('[data-accent-choice]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.accentChoice === (paletteMap[name] ? name : 'blue'))));
    safelyWrite(preferenceKeys.accent, paletteMap[name] ? name : 'blue');
    if (showNotice) showToast(`${(name || 'blue').charAt(0).toUpperCase()}${(name || 'blue').slice(1)} accent applied.`);
  }
  function applyFontSize(value) {
    const size = Math.min(19, Math.max(14, Number(value) || 15));
    document.documentElement.style.setProperty('--portfolio-font-size', `${size}px`);
    const range = $('#font-scale');
    const output = $('#font-scale-value');
    if (range) range.value = String(size);
    if (output) output.value = `${size} px`;
    safelyWrite(preferenceKeys.font, String(size));
  }
  function applyBooleanPreference(key, bodyAttribute, checked, className = null) {
    if (checked) document.body.setAttribute(bodyAttribute, 'true');
    else document.body.removeAttribute(bodyAttribute);
    if (className) document.body.classList.toggle(className, checked);
    safelyWrite(key, checked ? 'true' : 'false');
  }
  function refreshPreferenceControls() {
    const savedAccent = savedPreference(preferenceKeys.accent) || 'blue';
    applyAccent(savedAccent);
    applyFontSize(savedPreference(preferenceKeys.font) || '15');
    const prefs = [
      ['contrast-toggle', preferenceKeys.contrast, 'data-contrast'],
      ['motion-toggle', preferenceKeys.motion, 'data-motion'],
      ['recruiter-mode-toggle', preferenceKeys.recruiter, 'data-recruiter-mode', 'recruiter-mode'],
      ['reading-mode-toggle', preferenceKeys.reading, 'data-reading-mode', 'reading-mode']
    ];
    prefs.forEach(([id, key, attribute, className]) => {
      const checked = savedPreference(key) === 'true';
      const control = $(`#${id}`);
      if (control) control.checked = checked;
      applyBooleanPreference(key, attribute, checked, className || null);
    });
  }
  refreshPreferenceControls();
  preferencesToggle?.addEventListener('click', () => openDialogSafely(preferencesDialog));
  preferencesClose?.addEventListener('click', () => closeDialogSafely(preferencesDialog));
  preferencesDone?.addEventListener('click', () => closeDialogSafely(preferencesDialog));
  preferencesDialog?.addEventListener('click', event => { if (event.target === preferencesDialog) closeDialogSafely(preferencesDialog); });
  preferencesDialog?.addEventListener('cancel', event => { event.preventDefault(); closeDialogSafely(preferencesDialog); });
  preferencesDialog?.addEventListener('close', () => preferencesToggle?.focus({ preventScroll: true }));
  $$('[data-accent-choice]').forEach(button => button.addEventListener('click', () => applyAccent(button.dataset.accentChoice, true)));
  $('#font-scale')?.addEventListener('input', event => applyFontSize(event.currentTarget.value));
  $('#contrast-toggle')?.addEventListener('change', event => {
    applyBooleanPreference(preferenceKeys.contrast, 'data-contrast', event.currentTarget.checked);
    showToast(event.currentTarget.checked ? 'High contrast enabled.' : 'High contrast disabled.');
  });
  $('#motion-toggle')?.addEventListener('change', event => {
    applyBooleanPreference(preferenceKeys.motion, 'data-motion', event.currentTarget.checked);
    showToast(event.currentTarget.checked ? 'Decorative motion reduced.' : 'Standard motion restored.');
  });
  $('#recruiter-mode-toggle')?.addEventListener('change', event => {
    applyBooleanPreference(preferenceKeys.recruiter, 'data-recruiter-mode', event.currentTarget.checked, 'recruiter-mode');
    showToast(event.currentTarget.checked ? 'Recruiter focus mode enabled.' : 'Full portfolio view restored.');
  });
  $('#reading-mode-toggle')?.addEventListener('change', event => {
    applyBooleanPreference(preferenceKeys.reading, 'data-reading-mode', event.currentTarget.checked, 'reading-mode');
    showToast(event.currentTarget.checked ? 'Reading mode enabled.' : 'Standard presentation restored.');
  });
  $('#reset-preferences')?.addEventListener('click', () => {
    Object.values(preferenceKeys).forEach(removeStored);
    ['data-accent'].forEach(attr => document.documentElement.removeAttribute(attr));
    ['data-contrast', 'data-motion', 'data-recruiter-mode', 'data-reading-mode'].forEach(attr => document.body.removeAttribute(attr));
    document.body.classList.remove('recruiter-mode', 'reading-mode');
    document.documentElement.style.removeProperty('--portfolio-font-size');
    ['theme'].forEach(name => removeStored(`mukesh-portfolio-${name}`));
    delete document.body.dataset.theme;
    themeWasChosen = false;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) document.body.dataset.theme = 'dark';
    refreshThemeButton();
    refreshPreferenceControls();
    showToast('Portfolio preferences reset.');
  });

  // B. Save / bookmark main sections for a personalized shortcut list.
  const sectionBookmarkKey = 'mukesh-portfolio-saved-sections';
  let savedSections = new Set();
  try {
    const parsed = JSON.parse(safelyRead(sectionBookmarkKey) || '[]');
    if (Array.isArray(parsed)) savedSections = new Set(parsed.filter(id => typeof id === 'string' && document.getElementById(id)));
  } catch (_) { savedSections = new Set(); }
  const sectionLabels = new Map([['home', 'Home'], ['about', 'About'], ['skills', 'Skills'], ['projects', 'Projects'], ['journey', 'Experience & Education'], ['certifications', 'Certifications'], ['contact', 'Contact']]);
  const savedSectionsDialog = $('#saved-sections-dialog');
  const savedSectionsList = $('#saved-sections-list');
  const savedSectionsToggle = $('#saved-sections-toggle');
  function persistSavedSections() { safelyWrite(sectionBookmarkKey, JSON.stringify([...savedSections])); }
  function renderSavedSections() {
    if (!savedSectionsList) return;
    savedSectionsList.replaceChildren();
    const items = [...savedSections].filter(id => document.getElementById(id));
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'saved-sections-empty';
      empty.textContent = 'No saved sections yet. Use the bookmark buttons beside section headings to save quick links.';
      savedSectionsList.append(empty);
    }
    items.forEach(id => {
      const row = document.createElement('div'); row.className = 'saved-section-row';
      const link = document.createElement('a'); link.href = `#${id}`; link.textContent = sectionLabels.get(id) || id;
      link.addEventListener('click', event => { event.preventDefault(); closeDialogSafely(savedSectionsDialog); goToSection(id); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'saved-section-remove'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove ${link.textContent} from saved sections`);
      remove.addEventListener('click', () => { savedSections.delete(id); persistSavedSections(); updateSectionBookmarks(); renderSavedSections(); });
      row.append(link, remove); savedSectionsList.append(row);
    });
  }
  function updateSectionBookmarks() {
    $$('.section-bookmark').forEach(button => {
      const isSaved = savedSections.has(button.dataset.sectionBookmark);
      button.setAttribute('aria-pressed', String(isSaved));
      button.textContent = isSaved ? '★ Saved' : '☆ Save section';
      button.title = isSaved ? 'Remove this section from saved sections' : 'Save this section for quick access';
    });
    if (savedSectionsToggle) savedSectionsToggle.setAttribute('aria-label', `Open saved sections (${savedSections.size})`);
  }
  $$('main > section[id]').forEach(section => {
    const id = section.id;
    if (!sectionLabels.has(id)) return;
    const heading = $('.section-heading', section) || (id === 'home' ? $('.hero-copy', section) : null) || (id === 'contact' ? $('.contact-copy', section) : null);
    if (!heading || $('.section-bookmark', heading)) return;
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'section-bookmark'; button.dataset.sectionBookmark = id;
    button.addEventListener('click', () => {
      if (savedSections.has(id)) savedSections.delete(id); else savedSections.add(id);
      persistSavedSections(); updateSectionBookmarks(); renderSavedSections();
      showToast(savedSections.has(id) ? `${sectionLabels.get(id)} saved.` : `${sectionLabels.get(id)} removed from saved sections.`);
    });
    heading.append(button);
  });
  updateSectionBookmarks(); renderSavedSections();
  savedSectionsToggle?.addEventListener('click', () => { renderSavedSections(); openDialogSafely(savedSectionsDialog); });
  $('#saved-sections-close')?.addEventListener('click', () => closeDialogSafely(savedSectionsDialog));
  $('#saved-sections-done')?.addEventListener('click', () => closeDialogSafely(savedSectionsDialog));
  $('#clear-saved-sections')?.addEventListener('click', () => { savedSections.clear(); persistSavedSections(); updateSectionBookmarks(); renderSavedSections(); showToast('Saved sections cleared.'); });
  savedSectionsDialog?.addEventListener('click', event => { if (event.target === savedSectionsDialog) closeDialogSafely(savedSectionsDialog); });
  savedSectionsDialog?.addEventListener('cancel', event => { event.preventDefault(); closeDialogSafely(savedSectionsDialog); });
  savedSectionsDialog?.addEventListener('close', () => savedSectionsToggle?.focus({ preventScroll: true }));

  // C. Project workspace: favourites, sorting, grid/list display, compare, exports.
  const savedProjectKey = 'mukesh-portfolio-saved-projects';
  let savedProjectKeys = new Set();
  try {
    const parsed = JSON.parse(safelyRead(savedProjectKey) || '[]');
    if (Array.isArray(parsed)) savedProjectKeys = new Set(parsed.filter(key => Object.prototype.hasOwnProperty.call(projects, key)));
  } catch (_) { savedProjectKeys = new Set(); }
  let showSavedProjectsOnly = false;
  const selectedCompareProjects = new Set();
  const projectGrid = $('#projects-grid');
  const projectSort = $('#project-sort');
  const projectViewToggle = $('#project-view-toggle');
  const savedProjectsFilter = $('#saved-projects-filter');
  const savedProjectCount = $('#saved-project-count');
  const compareProjectCount = $('#compare-project-count');
  const compareDialog = $('#compare-dialog');
  const compareContent = $('#compare-content');
  let currentProjectKey = null;

  function saveProjectState() {
    safelyWrite(savedProjectKey, JSON.stringify([...savedProjectKeys]));
    if (savedProjectCount) savedProjectCount.textContent = String(savedProjectKeys.size);
    $$('.project-save-button').forEach(button => {
      const key = button.dataset.projectSave;
      const saved = savedProjectKeys.has(key);
      button.classList.toggle('is-saved', saved);
      button.setAttribute('aria-pressed', String(saved));
      button.textContent = saved ? '★ Saved' : '☆ Save';
      button.title = saved ? 'Remove from saved projects' : 'Save this project';
    });
  }
  function updateCompareControls() {
    if (compareProjectCount) compareProjectCount.textContent = `${selectedCompareProjects.size}/2`;
    $$('.project-compare-button').forEach(button => {
      const selected = selectedCompareProjects.has(button.dataset.projectCompare);
      button.setAttribute('aria-pressed', String(selected));
      button.textContent = selected ? '✓ Selected' : '⇄ Compare';
    });
    const compareOpen = $('#compare-projects-open');
    if (compareOpen) compareOpen.setAttribute('aria-label', `Compare selected projects (${selectedCompareProjects.size} of 2)`);
  }
  function updateProjectUrl(key) {
    const base = getPortfolioUrl();
    return `${base}#project-${key}`;
  }
  function projectCardActions(card) {
    const key = card.dataset.project;
    const content = $('.project-content', card);
    if (!key || !content || $('.project-card-tools', content)) return;
    const bar = document.createElement('div'); bar.className = 'project-card-tools';
    const save = document.createElement('button'); save.type = 'button'; save.className = 'project-card-tool project-save-button'; save.dataset.projectSave = key;
    save.addEventListener('click', () => {
      if (savedProjectKeys.has(key)) savedProjectKeys.delete(key); else savedProjectKeys.add(key);
      saveProjectState(); applyProjectFilters(); showToast(savedProjectKeys.has(key) ? 'Project saved to this browser.' : 'Project removed from saved projects.');
    });
    const compare = document.createElement('button'); compare.type = 'button'; compare.className = 'project-card-tool project-compare-button'; compare.dataset.projectCompare = key;
    compare.addEventListener('click', () => {
      if (selectedCompareProjects.has(key)) selectedCompareProjects.delete(key);
      else if (selectedCompareProjects.size >= 2) { showToast('Compare up to two projects at a time. Remove one selection first.'); return; }
      else selectedCompareProjects.add(key);
      updateCompareControls();
    });
    const copyLink = document.createElement('button'); copyLink.type = 'button'; copyLink.className = 'project-card-tool'; copyLink.textContent = '↗ Copy link';
    copyLink.addEventListener('click', () => copyText(updateProjectUrl(key), `${projects[key].title} link copied.`));
    bar.append(save, compare, copyLink);
    const meta = $('.project-meta', content);
    if (meta) meta.insertAdjacentElement('beforebegin', bar); else content.prepend(bar);
  }
  projectCards.forEach((card, index) => { card.dataset.originalOrder = String(index); projectCardActions(card); });
  saveProjectState(); updateCompareControls();

  // Layer a saved-only condition over the existing category + search filter.
  const originalApplyProjectFilters = applyProjectFilters;
  applyProjectFilters = function () {
    originalApplyProjectFilters();
    if (!showSavedProjectsOnly) return;
    projectCards.forEach(card => { if (!savedProjectKeys.has(card.dataset.project)) card.hidden = true; });
    const visible = projectCards.filter(card => !card.hidden).length;
    if (projectResults) {
      const indicator = document.createElement('span'); indicator.className = 'tiny-live'; indicator.setAttribute('aria-hidden', 'true');
      projectResults.replaceChildren(indicator, document.createTextNode(` Showing ${visible} saved ${visible === 1 ? 'project' : 'projects'}`));
    }
    if (projectEmpty) projectEmpty.hidden = visible > 0;
  };
  savedProjectsFilter?.addEventListener('click', () => {
    showSavedProjectsOnly = !showSavedProjectsOnly;
    savedProjectsFilter.setAttribute('aria-pressed', String(showSavedProjectsOnly));
    savedProjectsFilter.classList.toggle('active', showSavedProjectsOnly);
    applyProjectFilters();
    if (showSavedProjectsOnly) goToSection('projects');
  });
  projectSort?.addEventListener('change', () => {
    if (!projectGrid) return;
    const cards = [...projectCards];
    const mode = projectSort.value;
    cards.sort((a, b) => {
      const ka = a.dataset.project, kb = b.dataset.project;
      if (mode === 'name-asc') return (projects[ka]?.title || '').localeCompare(projects[kb]?.title || '');
      if (mode === 'name-desc') return (projects[kb]?.title || '').localeCompare(projects[ka]?.title || '');
      if (mode === 'category') return (projects[ka]?.category || '').localeCompare(projects[kb]?.category || '') || Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
      return Number(a.dataset.originalOrder) - Number(b.dataset.originalOrder);
    });
    cards.forEach(card => projectGrid.append(card));
    scheduleScrollUi();
  });
  projectViewToggle?.addEventListener('click', () => {
    const list = !document.body.classList.contains('projects-list-view');
    document.body.classList.toggle('projects-list-view', list);
    projectViewToggle.setAttribute('aria-pressed', String(list));
    projectViewToggle.textContent = list ? '▦ Grid view' : '☷ List view';
    showToast(list ? 'Project list view enabled.' : 'Project grid view enabled.');
  });

  // Compare dialog is generated from the real project metadata, not fake metrics.
  function renderProjectComparison() {
    if (!compareContent) return;
    compareContent.replaceChildren();
    const keys = [...selectedCompareProjects];
    if (keys.length < 2) {
      const hint = document.createElement('p'); hint.className = 'compare-empty';
      hint.textContent = 'Select two projects using the Compare buttons on the project cards.';
      compareContent.append(hint); return;
    }
    const table = document.createElement('table'); table.className = 'compare-table';
    const tbody = document.createElement('tbody');
    const rows = [
      ['Project', key => projects[key].title],
      ['Category', key => projects[key].category],
      ['Status', key => projects[key].status],
      ['Overview', key => projects[key].description],
      ['Technologies', key => projects[key].tags.join(', ')],
      ['Project focus', key => projects[key].bullets.join(' • ')],
      ['Notes', key => projects[key].note]
    ];
    rows.forEach(([label, valueFor]) => {
      const tr = document.createElement('tr'); const th = document.createElement('th'); th.scope = 'row'; th.textContent = label; tr.append(th);
      keys.forEach(key => { const td = document.createElement('td'); td.textContent = valueFor(key); tr.append(td); });
      tbody.append(tr);
    });
    table.append(tbody); compareContent.append(table);
  }
  $('#compare-projects-open')?.addEventListener('click', () => { renderProjectComparison(); openDialogSafely(compareDialog); });
  $('#compare-close')?.addEventListener('click', () => closeDialogSafely(compareDialog));
  $('#compare-done')?.addEventListener('click', () => closeDialogSafely(compareDialog));
  compareDialog?.addEventListener('click', event => { if (event.target === compareDialog) closeDialogSafely(compareDialog); });
  compareDialog?.addEventListener('cancel', event => { event.preventDefault(); closeDialogSafely(compareDialog); });
  $('#compare-copy')?.addEventListener('click', () => {
    const keys = [...selectedCompareProjects];
    if (keys.length !== 2) { showToast('Select two projects before copying a comparison.'); return; }
    const text = keys.map(key => `## ${projects[key].title}\nCategory: ${projects[key].category}\nStatus: ${projects[key].status}\n${projects[key].description}\nTechnologies: ${projects[key].tags.join(', ')}\nFocus: ${projects[key].bullets.join('; ')}\nNote: ${projects[key].note}`).join('\n\n---\n\n');
    copyText(text, 'Project comparison copied.');
  });
  function exportProjectData(kind) {
    const rows = Object.entries(projects).map(([key, project]) => ({ key, title: project.title, category: project.category, status: project.status, description: project.description, technologies: project.tags.join('; '), focus: project.bullets.join('; '), note: project.note }));
    if (kind === 'json') downloadTextFile('Mukesh_S_Projects.json', JSON.stringify(rows, null, 2), 'application/json;charset=utf-8');
    else {
      const headerRow = ['key', 'title', 'category', 'status', 'description', 'technologies', 'focus', 'note'];
      const csv = [headerRow.map(escapeCsv).join(','), ...rows.map(row => headerRow.map(key => escapeCsv(row[key])).join(','))].join('\r\n');
      downloadTextFile('Mukesh_S_Projects.csv', csv, 'text/csv;charset=utf-8');
    }
    showToast(`Project ${kind.toUpperCase()} export downloaded.`);
  }
  $('#export-projects-csv')?.addEventListener('click', () => exportProjectData('csv'));
  $('#export-projects-json')?.addEventListener('click', () => exportProjectData('json'));

  // Extra case-study actions use the active project's actual content.
  const originalOpenProject = openProject;
  openProject = function (key, trigger = null) {
    currentProjectKey = key;
    originalOpenProject(key, trigger);
    if (projectDialog?.open && key) {
      try { history.replaceState(null, '', `#project-${key}`); } catch (_) { /* local URLs may block history */ }
    }
  };
  $('#copy-project-link')?.addEventListener('click', () => {
    if (!currentProjectKey) return;
    copyText(updateProjectUrl(currentProjectKey), `${projects[currentProjectKey].title} link copied.`);
  });
  $('#export-project-markdown')?.addEventListener('click', () => {
    if (!currentProjectKey) return;
    const project = projects[currentProjectKey];
    const markdown = `# ${project.title}\n\n**Category:** ${project.category}\n\n**Status:** ${project.status}\n\n${project.description}\n\n## Focus\n${project.bullets.map(item => `- ${item}`).join('\n')}\n\n## Technologies\n${project.tags.join(', ')}\n\n## Notes\n${project.note}\n\nPortfolio: ${updateProjectUrl(currentProjectKey)}\n`;
    downloadTextFile(`${currentProjectKey}-case-study.md`, markdown, 'text/markdown;charset=utf-8');
    showToast('Case study downloaded as Markdown.');
  });
  $('#share-project')?.addEventListener('click', async () => {
    if (!currentProjectKey) return;
    const project = projects[currentProjectKey];
    const shareData = { title: `${project.title} — Mukesh S`, text: project.description, url: updateProjectUrl(currentProjectKey) };
    if (navigator.share) { try { await navigator.share(shareData); } catch (error) { if (error?.name !== 'AbortError') copyText(shareData.url, 'Project link copied.'); } }
    else copyText(shareData.url, 'Project link copied.');
  });

  // D. Contact email builder: prepares a mail draft; it never sends email itself.
  const emailBuilderDialog = $('#email-builder-dialog');
  $('#contact-builder-open')?.addEventListener('click', () => openDialogSafely(emailBuilderDialog));
  $('#email-builder-close')?.addEventListener('click', () => closeDialogSafely(emailBuilderDialog));
  $('#email-builder-cancel')?.addEventListener('click', () => closeDialogSafely(emailBuilderDialog));
  emailBuilderDialog?.addEventListener('click', event => { if (event.target === emailBuilderDialog) closeDialogSafely(emailBuilderDialog); });
  emailBuilderDialog?.addEventListener('cancel', event => { event.preventDefault(); closeDialogSafely(emailBuilderDialog); });
  $('#email-builder-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const role = ($('#email-role')?.value || '').trim();
    const company = ($('#email-company')?.value || '').trim();
    const message = ($('#email-message')?.value || '').trim();
    if (!role) { $('#email-role')?.focus(); return; }
    const subject = `Enquiry: ${role}${company ? ` — ${company}` : ''}`;
    const body = `${message || 'Hello Mukesh, I would like to discuss this opportunity.'}\n\nRole: ${role}${company ? `\nCompany: ${company}` : ''}\n\nRegards,`;
    closeDialogSafely(emailBuilderDialog);
    window.location.href = `mailto:mukesh9696fc@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast('Opening your email application with a draft.');
  });

  // E. Extra keyboard shortcuts. Editable fields are never interrupted.
  document.addEventListener('keydown', event => {
    if (isEditableTarget(event.target) || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === '?' && !preferencesDialog?.open && !projectDialog?.open && !commandDialog?.open) {
      event.preventDefault(); openDialogSafely(preferencesDialog);
    }
    if (event.key.toLowerCase() === 'b' && !preferencesDialog?.open && !savedSectionsDialog?.open && !projectDialog?.open && !commandDialog?.open) {
      const current = navTargets.filter(item => item.target.getBoundingClientRect().top < window.innerHeight * 0.45).slice(-1)[0]?.target;
      const bookmark = current && $(`[data-section-bookmark="${current.id}"]`);
      if (bookmark) { event.preventDefault(); bookmark.click(); }
    }
  });

  // Extra command palette actions are only added when the palette is present.
  if (Array.isArray(commandItems)) {
    commandItems.push(
      { label: 'Open appearance settings', detail: 'Accent colour, font size, and accessibility', keywords: 'settings preferences palette contrast motion font size', action: () => openDialogSafely(preferencesDialog) },
      { label: 'Open saved sections', detail: 'Jump to your bookmarked sections', keywords: 'bookmarks saved sections quick access', action: () => { renderSavedSections(); openDialogSafely(savedSectionsDialog); } },
      { label: 'Export project data as CSV', detail: 'Download the three project records', keywords: 'export csv spreadsheet projects data', action: () => exportProjectData('csv') },
      { label: 'Export project data as JSON', detail: 'Download project metadata', keywords: 'export json data projects', action: () => exportProjectData('json') },
      { label: 'Open recruiter email builder', detail: 'Prepare an email draft for a role', keywords: 'email recruiter contact job company message', action: () => openDialogSafely(emailBuilderDialog) },
      { label: 'Toggle project list layout', detail: 'Switch project display between grid and list', keywords: 'projects list grid view layout', action: () => projectViewToggle?.click() }
    );
  }

  // Deep links to project cards still scroll to the card; explicit case-study
  // links can use #case-vehicle etc if you choose to add dedicated anchors later.
  if (location.hash.startsWith('#project-')) {
    const key = location.hash.replace('#project-', '');
    const target = document.getElementById(`project-${key}`);
    if (target) window.setTimeout(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }), 50);
  }

  // ---------------------------------------------------------------------------
  // Image fallbacks, async decoding, and footer date
  // ---------------------------------------------------------------------------
  const fallbackSvg = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450"><rect width="800" height="450" fill="#edf2fc"/><rect x="46" y="46" width="708" height="358" rx="24" fill="#dce6f7" stroke="#92a8d1" stroke-width="3"/><path d="M100 330l150-150 100 90 130-135 220 195" fill="none" stroke="#577bb9" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><circle cx="600" cy="120" r="28" fill="#92a8d1"/><text x="400" y="380" font-family="Arial,sans-serif" font-size="22" text-anchor="middle" fill="#192b49">Project preview</text></svg>')}`;
  $$('img').forEach(image => {
    image.decoding = image.decoding || 'async';
    image.addEventListener('error', () => {
      if (image.dataset.fallbackApplied === 'true') return;
      image.dataset.fallbackApplied = 'true';
      image.src = fallbackSvg;
      image.classList.add('image-missing');
      image.alt = image.alt || 'Project preview placeholder';
    });
  });

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
})();
