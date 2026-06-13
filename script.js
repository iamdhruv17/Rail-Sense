/* ===========================
   RAILSENSE — script.js
   =========================== */

document.addEventListener('DOMContentLoaded', () => {

  // =============================
  // 1. NAVBAR SCROLL BEHAVIOR
  // =============================
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  navToggle?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    navToggle.classList.toggle('active');
  });

  // Close nav on link click
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.classList.remove('active');
    });
  });

  // =============================
  // 2. HERO CANVAS — PARTICLE / GRID ANIMATION
  // =============================
  const canvas = document.getElementById('hero-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animFrame;
    let W, H;

    function resize() {
      W = canvas.width = canvas.offsetWidth;
      H = canvas.height = canvas.offsetHeight;
    }

    class Particle {
      constructor() { this.reset(); }
      reset() {
        this.x = Math.random() * W;
        this.y = Math.random() * H;
        this.size = Math.random() * 1.5 + 0.3;
        this.alpha = Math.random() * 0.4 + 0.05;
        this.speed = Math.random() * 0.3 + 0.05;
        this.dx = (Math.random() - 0.5) * 0.4;
        this.dy = -this.speed;
        this.pulse = Math.random() * Math.PI * 2;
      }
      update() {
        this.x += this.dx;
        this.y += this.dy;
        this.pulse += 0.02;
        this.alpha = (Math.sin(this.pulse) * 0.15 + 0.12);
        if (this.y < -10 || this.x < -10 || this.x > W + 10) this.reset();
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 33, 59, ${this.alpha})`;
        ctx.fill();
      }
    }

    // Grid lines
    function drawGrid() {
      ctx.strokeStyle = 'rgba(240, 244, 255, 0.018)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x < W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y < H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
    }

    function initParticles() {
      particles = [];
      for (let i = 0; i < 120; i++) particles.push(new Particle());
    }

    // Connection lines between close particles
    function drawConnections() {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(232, 33, 59, ${0.04 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, W, H);
      drawGrid();
      drawConnections();
      particles.forEach(p => { p.update(); p.draw(); });
      animFrame = requestAnimationFrame(animate);
    }

    resize();
    initParticles();
    animate();
    window.addEventListener('resize', () => { resize(); initParticles(); });
  }

  // =============================
  // 3. SCROLL REVEAL ANIMATION
  // =============================
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger children within same parent
        const siblings = Array.from(entry.target.parentElement.querySelectorAll('.reveal'));
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, idx * 80);
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  revealEls.forEach(el => revealObserver.observe(el));

  // =============================
  // 4. SOLUTION TABS
  // =============================
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-tab');

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = document.getElementById(`tab-${target}`);
      if (panel) panel.classList.add('active');
    });
  });

  // =============================
  // 5. FLOW DIAGRAM — STEP HIGHLIGHT ANIMATION
  // =============================
  const flowSteps = document.querySelectorAll('.flow-step');
  let currentStep = 0;
  let stepInterval;

  function activateStep(index) {
    flowSteps.forEach(s => s.classList.remove('active-step'));
    if (flowSteps[index]) flowSteps[index].classList.add('active-step');
  }

  const flowObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        currentStep = 0;
        activateStep(0);
        clearInterval(stepInterval);
        stepInterval = setInterval(() => {
          currentStep = (currentStep + 1) % flowSteps.length;
          activateStep(currentStep);
        }, 900);
      } else {
        clearInterval(stepInterval);
        flowSteps.forEach(s => s.classList.remove('active-step'));
      }
    });
  }, { threshold: 0.3 });

  const flowDiagram = document.getElementById('flow-diagram');
  if (flowDiagram) flowObserver.observe(flowDiagram);

  // =============================
  // 6. SMOOTH ACTIVE NAV LINK HIGHLIGHT
  // =============================
  const sections = document.querySelectorAll('section[id]');
  const navLinkEls = document.querySelectorAll('.nav-link:not(.nav-cta)');

  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinkEls.forEach(link => {
          link.style.color = link.getAttribute('href') === `#${id}`
            ? 'var(--text)'
            : '';
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(sec => sectionObserver.observe(sec));

  // =============================
  // 7. HERO ROUTE LINE — TRAIN MOVER
  // =============================
  // Handled via CSS animation in styles.css (@keyframes move-train)

  // =============================
  // 8. COUNTER ANIMATION FOR STAT CARDS
  // =============================
  function animateCounter(el, target, suffix, duration = 1800) {
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      el.textContent = start.toLocaleString();
      if (start >= target) clearInterval(timer);
    }, 16);
  }

  const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target;
        const valEl = card.querySelector('.stat-card-val');
        if (!valEl || card.dataset.animated) return;
        card.dataset.animated = 'true';

        const unitEl = card.querySelector('.stat-unit');
        const unitText = unitEl ? unitEl.outerHTML : '';

        if (card.id === 'stat-card-30') {
          // "30 sec"
          valEl.innerHTML = `30${unitText}`;
        } else if (card.id === 'stat-card-23m') {
          // Count up for 23M
          valEl.innerHTML = `<span class="count-num">0</span>${unitText}`;
          const num = valEl.querySelector('.count-num');
          animateCounter(num, 23, '', 1200);
        } else if (card.id === 'stat-card-13k') {
          valEl.innerHTML = `<span class="count-num">0</span>${unitText}`;
          const num = valEl.querySelector('.count-num');
          animateCounter(num, 13000, '', 1600);
        }

        statObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('.stat-card').forEach(card => statObserver.observe(card));

  // =============================
  // 9. AGENT LOG — TYPEWRITER AUTO-SCROLL
  // =============================
  const agentLog = document.querySelector('.agent-log');
  if (agentLog) {
    setInterval(() => {
      agentLog.scrollTop = agentLog.scrollHeight;
    }, 3000);
  }

  // =============================
  // 10. MAP TRAIN DOTS — SUBTLE HOVER INTERACTIVITY
  // =============================
  // SVG animate elements handle this natively

  // =============================
  // 11. PARALLAX HERO INDIA MAP
  // =============================
  const indiaMap = document.querySelector('.hero-india-map');
  if (indiaMap) {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      indiaMap.style.transform = `translateY(${scrollY * 0.25}px)`;
    });
  }

  // =============================
  // 12. CURSOR GLOW EFFECT
  // =============================
  const cursorGlow = document.createElement('div');
  cursorGlow.style.cssText = `
    position: fixed;
    width: 400px;
    height: 400px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(232,33,59,0.04) 0%, transparent 70%);
    pointer-events: none;
    z-index: 0;
    transform: translate(-50%, -50%);
    transition: opacity 0.3s ease;
    opacity: 0;
    top: 0; left: 0;
  `;
  document.body.appendChild(cursorGlow);

  document.addEventListener('mousemove', (e) => {
    cursorGlow.style.left = e.clientX + 'px';
    cursorGlow.style.top = e.clientY + 'px';
    cursorGlow.style.opacity = '1';
  });
  document.addEventListener('mouseleave', () => { cursorGlow.style.opacity = '0'; });

  // =============================
  // 13. BUTTON RIPPLE EFFECT
  // =============================
  document.querySelectorAll('.btn-primary, .btn-outline').forEach(btn => {
    btn.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255,255,255,0.2);
        transform: scale(0);
        animation: ripple-anim 0.5s linear;
        pointer-events: none;
        width: 100px; height: 100px;
        left: ${e.clientX - rect.left - 50}px;
        top: ${e.clientY - rect.top - 50}px;
      `;
      this.style.position = 'relative';
      this.style.overflow = 'hidden';
      this.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);
    });
  });

  // Add ripple keyframe
  const rippleStyle = document.createElement('style');
  rippleStyle.textContent = `
    @keyframes ripple-anim {
      to { transform: scale(4); opacity: 0; }
    }
  `;
  document.head.appendChild(rippleStyle);

  // =============================
  // 14. TECH CARDS STAGGER REVEAL
  // =============================
  const techCards = document.querySelectorAll('.tech-card');
  techCards.forEach((card, i) => {
    card.style.transitionDelay = `${i * 60}ms`;
  });

  // =============================
  // 15. HERO BADGE — Subtle entrance
  // =============================
  const heroBadge = document.querySelector('.hero-badge');
  if (heroBadge) {
    heroBadge.style.opacity = '0';
    heroBadge.style.transform = 'translateY(10px)';
    setTimeout(() => {
      heroBadge.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      heroBadge.style.opacity = '1';
      heroBadge.style.transform = 'translateY(0)';
    }, 200);
  }

  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    heroTitle.style.opacity = '0';
    heroTitle.style.transform = 'translateY(20px)';
    setTimeout(() => {
      heroTitle.style.transition = 'opacity 1s ease, transform 1s ease';
      heroTitle.style.opacity = '1';
      heroTitle.style.transform = 'translateY(0)';
    }, 400);
  }

  const heroSubtitle = document.querySelector('.hero-subtitle');
  if (heroSubtitle) {
    heroSubtitle.style.opacity = '0';
    setTimeout(() => {
      heroSubtitle.style.transition = 'opacity 1s ease 0.2s';
      heroSubtitle.style.opacity = '1';
    }, 600);
  }

  const heroCtas = document.querySelector('.hero-ctas');
  if (heroCtas) {
    heroCtas.style.opacity = '0';
    heroCtas.style.transform = 'translateY(10px)';
    setTimeout(() => {
      heroCtas.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
      heroCtas.style.opacity = '1';
      heroCtas.style.transform = 'translateY(0)';
    }, 900);
  }

  const heroStats = document.querySelector('.hero-stats');
  if (heroStats) {
    heroStats.style.opacity = '0';
    setTimeout(() => {
      heroStats.style.transition = 'opacity 0.8s ease';
      heroStats.style.opacity = '1';
    }, 1100);
  }

  // =============================
  // 16. PROBLEM CARD STAGGER
  // =============================
  document.querySelectorAll('.problem-card').forEach((card, i) => {
    card.style.transitionDelay = `${i * 120}ms`;
  });

  // =============================
  // 17. MOVING TRAIN ON ROUTE SVG
  // =============================
  const trainMover = document.getElementById('train-mover');
  const routePath = document.getElementById('route-path');

  if (trainMover && routePath) {
    let pathLength = 0;
    try { pathLength = routePath.getTotalLength(); } catch(e) { pathLength = 1450; }

    let progress = 0;
    function animateTrain() {
      progress = (progress + 1.5) % pathLength;
      try {
        const point = routePath.getPointAtLength(progress);
        const ahead = routePath.getPointAtLength(Math.min(progress + 5, pathLength));
        const angle = Math.atan2(ahead.y - point.y, ahead.x - point.x) * (180 / Math.PI);
        trainMover.setAttribute('transform', `translate(${point.x}, ${point.y}) rotate(${angle})`);
      } catch(e) {
        // Fallback: pure CSS animation handles it
      }
      requestAnimationFrame(animateTrain);
    }
    // Remove CSS animation class if we use JS
    trainMover.style.animation = 'none';
    animateTrain();
  }

  // =============================
  // 18. TICKER PAUSE ON HOVER
  // =============================
  const tickerText = document.querySelector('.ticker-text');
  const tickerBar = document.getElementById('ticker-bar');
  if (tickerBar && tickerText) {
    tickerBar.addEventListener('mouseenter', () => {
      tickerText.style.animationPlayState = 'paused';
    });
    tickerBar.addEventListener('mouseleave', () => {
      tickerText.style.animationPlayState = 'running';
    });
  }

  // =============================
  // 19. TEAM CARD TILT EFFECT
  // =============================
  document.querySelectorAll('.team-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `translateY(-5px) rotateX(${-y * 6}deg) rotateY(${x * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // =============================
  // 20. SECTION EYEBROW FLICKER
  // =============================
  document.querySelectorAll('.section-eyebrow').forEach((el, i) => {
    el.style.transitionDelay = `${i * 50}ms`;
  });

  console.log('%c🚂 RailSense — India\'s Railway, Finally Intelligent.', 'color: #E8213B; font-size: 16px; font-weight: bold; font-family: monospace;');
  console.log('%cBuilt for FAR AWAY 2026 | AI-powered real-time tracking', 'color: #F59E0B; font-size: 12px; font-family: monospace;');
});
