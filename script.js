(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  document.documentElement.classList.add('js');
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile navigation
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
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuToggle?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuToggle.focus();
    }
  });
  // Light/dark theme with a safe local preference.
  const themeButton = $('#theme-toggle');
  const themeIcon = $('#theme-icon');
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('mukesh-portfolio-theme'); } catch (_) { /* Storage may be blocked. */ }
  if (savedTheme === 'dark') document.body.dataset.theme = 'dark';

  function refreshThemeButton() {
    const dark = document.body.dataset.theme === 'dark';
    if (themeIcon) themeIcon.textContent = dark ? '☀' : '☾';
    if (themeButton) {
      themeButton.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      themeButton.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
  }
  refreshThemeButton();
  themeButton?.addEventListener('click', () => {
    const dark = document.body.dataset.theme !== 'dark';
    if (dark) document.body.dataset.theme = 'dark';
    else delete document.body.dataset.theme;
    try { localStorage.setItem('mukesh-portfolio-theme', dark ? 'dark' : 'light'); } catch (_) { /* Theme still works for this session. */ }
    refreshThemeButton();
  });

  // Small rotating role text. Keeps the page fully readable if motion is disabled.
  const roleRotator = $('#role-rotator');
  const roles = ['Python Developer', 'AI / ML Enthusiast', 'Software Developer'];
  let roleIndex = 0;
  if (roleRotator && !prefersReducedMotion) {
    window.setInterval(() => {
      roleIndex = (roleIndex + 1) % roles.length;
      roleRotator.classList.add('role-changing');
      window.setTimeout(() => {
        roleRotator.textContent = roles[roleIndex];
        roleRotator.classList.remove('role-changing');
      }, 170);
    }, 2700);
  }

  // Track the section crossing a stable reading line below the sticky header.
  // This is less jumpy than choosing the largest IntersectionObserver ratio, especially
  // when sections have very different heights or project filters change the page length.
  const navTargets = navLinks.map(link => {
    const hash = link.getAttribute('href');
    return { link, target: hash && hash.startsWith('#') ? document.getElementById(hash.slice(1)) : null };
  }).filter(item => item.target);

  function updateActiveNav() {
    if (!navTargets.length) return;
    const header = $('.site-header');
    const headerHeight = header ? header.getBoundingClientRect().height : 0;
    const readingLine = window.scrollY + headerHeight + Math.min(window.innerHeight * 0.28, 190);
    let activeItem = navTargets[0];
    for (const item of navTargets) {
      const sectionTop = item.target.getBoundingClientRect().top + window.scrollY;
      if (sectionTop <= readingLine + 2) activeItem = item;
      else break;
    }
    const distanceToBottom = document.documentElement.scrollHeight - (window.scrollY + window.innerHeight);
    if (distanceToBottom <= Math.max(24, window.innerHeight * 0.18)) {
      activeItem = navTargets[navTargets.length - 1];
    }
    navTargets.forEach(item => {
      const active = item === activeItem;
      item.link.classList.toggle('active', active);
      if (active) item.link.setAttribute('aria-current', 'location');
      else item.link.removeAttribute('aria-current');
    });
  }

  // Scroll progress, top button, and active section tracking.
  const progressBar = $('#scroll-progress-bar');
  const backTop = $('#back-top-floating');
  let scrollScheduled = false;
  function updateScrollUi() {
    const root = document.documentElement;
    const maxScroll = root.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100)) : 0;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (backTop) backTop.classList.toggle('visible', window.scrollY > 560);
    updateActiveNav();
    scrollScheduled = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollScheduled) {
      window.requestAnimationFrame(updateScrollUi);
      scrollScheduled = true;
    }
  }, { passive: true });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 900) setMenu(false);
    if (!scrollScheduled) { window.requestAnimationFrame(updateScrollUi); scrollScheduled = true; }
  }, { passive: true });
  window.addEventListener('load', () => {
    if (!scrollScheduled) { window.requestAnimationFrame(updateScrollUi); scrollScheduled = true; }
  }, { once: true });
  window.addEventListener('pageshow', () => {
    if (!scrollScheduled) { window.requestAnimationFrame(updateScrollUi); scrollScheduled = true; }
  });
  updateScrollUi();
  backTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' }));

  // Scroll reveals, with a visible fallback for browsers without IntersectionObserver.
  const revealItems = $$('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -28px 0px' });
    revealItems.forEach(item => revealObserver.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  // Project filtering
  const filterButtons = $$('.filter-button');
  const projectCards = $$('.project-card[data-category]');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter || 'all';
      filterButtons.forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      projectCards.forEach(card => {
        const show = filter === 'all' || card.dataset.category === filter;
        card.hidden = !show;
        if (show && !prefersReducedMotion) {
          card.classList.remove('is-visible');
          requestAnimationFrame(() => card.classList.add('is-visible'));
        }
      });
    });
  });

  // Case study modal copy is intentionally descriptive and avoids claiming unverified results.
  const projects = {
    vehicle: {
      title: 'Vehicle Damage Detection', category: 'AI / ML · Computer Vision', status: 'In development',
      image: 'assets/images/vehicle-damage.webp', imageAlt: 'Illustrative AI vehicle inspection scene highlighting visible body damage',
      description: 'An image-based computer-vision project exploring how visible vehicle damage can be detected and categorized. The intended workflow is to help create an initial damage assessment from an uploaded vehicle image.',
      bullets: ['Use YOLOv11 object detection as the starting model.', 'Explore image preparation and annotations for visible damage regions.', 'Use OpenCV and Python in the image-processing workflow.', 'Keep damage severity and repair-cost estimates clearly labelled as estimates if implemented.'],
      tags: ['Python', 'YOLOv11', 'OpenCV', 'Computer Vision'],
      note: 'Development status: in progress. This portfolio does not claim a validated accuracy score or production-ready cost estimate.'
    },
    loanclear: {
      title: 'LoanClear', category: 'Web application', status: 'Portfolio project',
      image: 'assets/images/loanclear-dashboard.svg', imageAlt: 'Illustrative LoanClear dashboard concept',
      description: 'A Python and Flask loan-management application designed to make multiple loans easier to track from one place.',
      bullets: ['Record loan balances and interest rates.', 'Organize due dates, repayment schedules, and payment history.', 'Use a dashboard to summarise outstanding balances and upcoming payments.', 'Designed around a Python and Flask backend with a MySQL database.'],
      tags: ['Python', 'Flask', 'MySQL', 'SQL', 'HTML5', 'CSS3', 'JavaScript'],
      note: 'The image is an illustrative dashboard mockup; displayed amounts and dates are sample UI content, not real financial data.'
    },
    resume: {
      title: 'AI Resume Analyzer', category: 'AI / NLP', status: 'Portfolio project',
      image: 'assets/images/resume-analyzer.svg', imageAlt: 'Illustrative AI resume matching dashboard concept',
      description: 'A Python-based resume-analysis project designed to compare resume text with a target job description and present a readable skill-gap summary.',
      bullets: ['Extract or review resume and job-description text.', 'Identify relevant skills and keywords for comparison.', 'Present a match summary to guide resume improvements.', 'Use Python, natural-language processing ideas, and a database for storing records if required.'],
      tags: ['Python', 'NLP', 'MySQL', 'Text processing'],
      note: 'The interface image uses illustrative scores and example keywords; it is not a claim of measured matching accuracy.'
    },
    portfolio: {
      title: 'Personal Portfolio Website', category: 'Frontend / Web development', status: 'Current website',
      image: 'assets/images/portfolio-preview.webp', imageAlt: 'Illustrative blue portfolio interface concept',
      description: 'A responsive personal website intended to showcase skills, projects, education, certifications, and contact details with a clean, accessible experience.',
      bullets: ['Responsive layouts for desktop, tablet, and mobile screens.', 'JavaScript interactions for theme switching, project filtering, and detail dialogs.', 'Clear project previews and professional contact links.', 'Designed to be hosted as a static website using GitHub Pages or another static host.'],
      tags: ['HTML5', 'CSS3', 'JavaScript', 'Responsive design', 'Accessibility'],
      note: 'The large portfolio image is a design concept preview; this website uses its own responsive layout and local assets.'
    }
  };

  const dialog = $('#project-dialog');
  const dialogClose = $('#dialog-close');
  let lastProjectTrigger = null;
  let lastProjectScrollY = 0;
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
  const portfolioGallery = [
    { src: 'assets/images/portfolio-preview.webp', alt: 'Blue portfolio interface preview', label: 'Blue interface' },
    { src: 'assets/images/portfolio-concept.webp', alt: 'Portfolio homepage concept using the blue theme', label: 'Homepage concept' },
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
      const label = document.createElement('span');
      label.textContent = item.label;
      button.append(image, label);
      button.addEventListener('click', () => {
        dialogImage.src = item.src;
        dialogImage.alt = item.alt;
        $$('.dialog-gallery-button', dialogGallery).forEach(control => control.setAttribute('aria-pressed', String(control === button)));
      });
      dialogGallery.append(button);
    });
    dialogGallery.hidden = false;
  }

  function openProject(key, trigger) {
    const project = projects[key];
    if (!project || !dialog) return;
    lastProjectTrigger = trigger || null;
    lastProjectScrollY = window.scrollY;
    dialogTitle.textContent = project.title;
    dialogKicker.textContent = project.category.toUpperCase();
    dialogCategory.textContent = project.category;
    dialogStatus.textContent = project.status;
    dialogImage.src = project.image;
    dialogImage.alt = project.imageAlt;
    dialogDescription.textContent = project.description;
    dialogNote.textContent = project.note;
    if (dialogGallery) {
      dialogGallery.replaceChildren();
      dialogGallery.hidden = true;
    }
    if (key === 'portfolio') renderPortfolioGallery(project.image);
    dialogBullets.replaceChildren(...project.bullets.map(item => {
      const li = document.createElement('li');
      li.textContent = item;
      return li;
    }));
    dialogTags.replaceChildren(...project.tags.map(item => {
      const span = document.createElement('span');
      span.textContent = item;
      return span;
    }));
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialogClose?.focus();
  }

  $$('[data-project-details]').forEach(button => {
    button.addEventListener('click', () => openProject(button.dataset.projectDetails, button));
  });
  dialogClose?.addEventListener('click', () => {
    if (dialog?.open && typeof dialog.close === 'function') dialog.close();
    else dialog?.removeAttribute('open');
  });
  dialog?.addEventListener('click', event => {
    if (event.target === dialog) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  });
  dialog?.addEventListener('close', () => {
    if (lastProjectTrigger && document.contains(lastProjectTrigger)) {
      try { lastProjectTrigger.focus({ preventScroll: true }); }
      catch (_) { lastProjectTrigger.focus(); }
    }
    // Keep closing a long case study from unexpectedly jumping the page.
    window.scrollTo({ top: lastProjectScrollY, behavior: 'auto' });
  });

  // Email copy button and small status toast.
  const toast = $('#toast-message');
  let toastTimer = 0;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2600);
  }

  $$('[data-copy-email]').forEach(button => {
    button.addEventListener('click', async () => {
      const email = button.dataset.copyEmail;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(email);
          showToast('Email address copied to clipboard.');
        } else {
          const area = document.createElement('textarea');
          area.value = email;
          area.setAttribute('readonly', '');
          area.style.position = 'absolute';
          area.style.left = '-9999px';
          document.body.appendChild(area);
          area.select();
          const copied = document.execCommand('copy');
          area.remove();
          showToast(copied ? 'Email address copied to clipboard.' : `Email: ${email}`);
        }
      } catch (_) {
        showToast(`Email: ${email}`);
      }
    });
  });

  // Footer year remains current after the next calendar year.
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // A local-image failure should not leave a broken icon visible.
  $$('img').forEach(image => {
    image.addEventListener('error', () => {
      image.classList.add('image-missing');
      image.alt = image.alt || 'Project preview unavailable';
    }, { once: true });
  });
})();
