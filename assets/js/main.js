// Main JavaScript File
const CONFIG = {
    // Static configuration
};

document.addEventListener('DOMContentLoaded', function () {
    // Initialize all components
    initPreloader();
    initNavigation();
    initSmoothScrolling();
    initContactForm();
    initProjectModals();
    initCvMenu();
    initTypingEffect();
    initScrollAnimations();
    initExperienceCounter();
    initTimelineNow();

    // Dynamic footer year
    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
});

// Preloader
function initPreloader() {
    window.addEventListener('load', () => {
        setTimeout(() => {
            const preloader = document.getElementById('preloader');
            if (preloader) {
                preloader.style.opacity = '0';
                setTimeout(() => {
                    preloader.style.display = 'none';
                }, 500);
            }
        }, 500);
    });
}

// Navigation
function initNavigation() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Update active nav link
        updateActiveNavLink();
    });

    // Mobile menu toggle
    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');
        });
    }

    // Close mobile menu on link click
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        });
    });
}

// Update active navigation link based on scroll position
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');

    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 100;
        const sectionHeight = section.clientHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// Smooth scrolling
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offsetTop = target.offsetTop - 70;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Typing effect for hero subtitle
function initTypingEffect() {
    const typingText = document.querySelector('.typing-text');
    if (!typingText) return;

    const texts = [
        'Staff Software Engineer',
        'Backend & Distributed Systems',
        'Tech Lead'
    ];

    let textIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typingSpeed = 100;

    function type() {
        const currentText = texts[textIndex];

        if (isDeleting) {
            typingText.textContent = currentText.substring(0, charIndex - 1);
            charIndex--;
            typingSpeed = 50;
        } else {
            typingText.textContent = currentText.substring(0, charIndex + 1);
            charIndex++;
            typingSpeed = 100;
        }

        if (!isDeleting && charIndex === currentText.length) {
            typingSpeed = 2000;
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            textIndex = (textIndex + 1) % texts.length;
            typingSpeed = 500;
        }

        setTimeout(type, typingSpeed);
    }

    type();
}

// Scroll animations
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Observe all elements with data-aos attribute
    document.querySelectorAll('[data-aos]').forEach(element => {
        observer.observe(element);
    });
}

// Contact form
function initContactForm() {
    const contactForm = document.getElementById('contactForm');
    if (!contactForm) return;

    contactForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

        try {
            const data = new FormData(contactForm);
            await fetch(contactForm.action, {
                method: 'POST',
                body: data,
                headers: { Accept: 'application/json' }
            });
            contactForm.style.display = 'none';
            document.getElementById('form-success').style.display = 'block';
        } catch {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Message';
            showNotification('Failed to send message. Please try emailing directly.', 'error');
        }
    });
}

// Project modals
function initProjectModals() {
    window.closeProjectModal = function () {
        const modal = document.getElementById('projectModal');
        if (modal) modal.style.display = 'none';
    };

    window.loadProjectDetails = function (projectId) {
        const modal = document.getElementById('projectModal');
        const projectTitle = document.getElementById('projectTitle');
        const projectDetails = document.getElementById('projectDetails');

        if (!modal || !projectTitle || !projectDetails) return;

        modal.style.display = 'block';

        // Load project details (static data)
        const projectData = getProjectData(projectId);
        projectTitle.textContent = projectData.title;
        projectDetails.innerHTML = projectData.content;
    };

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Hero "Download CV" button: a disclosure listing the 1-page and 2-page CVs
function initCvMenu() {
    const toggle = document.getElementById('cv-menu-toggle');
    const list = document.getElementById('cv-menu-list');
    if (!toggle || !list) return;

    function setCvMenuOpen(open) {
        list.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
    }

    toggle.addEventListener('click', () => setCvMenuOpen(list.hidden));
    list.addEventListener('click', (e) => {
        if (e.target.closest('a')) setCvMenuOpen(false);
    });
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.cv-menu')) setCvMenuOpen(false);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !list.hidden) {
            setCvMenuOpen(false);
            toggle.focus();
        }
    });
}

// Get static project data
function getProjectData(projectId) {
    const projects = {
        'price-drop-alerts': {
            title: 'Flipkart Price-Drop & Back-in-Stock Alerts',
            content: `
                <h3>Overview</h3>
                <p>When a product a shopper viewed gets cheaper or comes back in stock, they get a personalised push. For Flipkart that means a 150M-product catalog taking around 50M updates a day, and millions of qualifying users per sale — so the pipeline was designed for Big Billion Days scale from day one. I was technical lead across the five services involved.</p>

                <h3>How It Flows</h3>
                <p>Catalog ingestion captures the change, a Redis queue carries it to the event processor, and the processor fans it out to all 47 shards of the user-behaviour store. The delivery service then streams the matching users and enqueues their pushes. Back-in-stock alerts ride the same pipeline.</p>

                <h3>What I Built</h3>
                <ul>
                    <li>A delivery side that never buffers a full response: a streaming reader, a bounded window of concurrent requests, and disk-spilling k-way-merge de-duplication</li>
                    <li>A pacer that backs off against a queue shared with other tenants' transactional traffic</li>
                    <li>Safety rails: freshness gates that fail closed, all-or-nothing retries per trigger, at-least-once hand-off de-duplicated on a trigger id, out-of-stock withholding and purchase suppression</li>
                    <li>Every knob as per-account configuration — thresholds, price bands, pacing — re-read each round, so it can change mid-sale without a deploy</li>
                </ul>

                <h3>Shipping It Safely</h3>
                <p>A 20k-line change, split into <strong>17 stacked PRs</strong> ordered reader-before-writer, so any mix of old and new services is always a valid state. I also wrote the contract the platform team's store was built against.</p>

                <h3>Technologies Used</h3>
                <p>Java, Redis, event-driven services, sharded in-memory state</p>
            `
        },
        'ai-decisioning': {
            title: 'AI Decisioning Agents: 1:1 Individualisation',
            content: `
                <h3>Overview</h3>
                <p>CleverTap's decisioning layer runs reinforcement-learning agents, each optimising a reward — clicks, conversions or revenue. Nightly, an agent scores every campaign a user qualifies for, and the delivery service sends the top-ranked message that still fits that user's frequency budget.</p>

                <h3>What I Built</h3>
                <ul>
                    <li>Led a six-PR stacked rollout extending the ranker from choosing the campaign to choosing the content variant each user receives — every user gets their own winner, not one A/B winner for everyone</li>
                    <li>Designed the versioned 11-byte ranking-store entry: the variant id takes one nibble and the other is reserved, so the next field ships without a format bump while older entries stay readable</li>
                    <li>Wrote the cross-service contract, and a fail-open resolver whose fallbacks are counted in dispatch diagnostics rather than dropped silently</li>
                    <li>Built the read-only budget simulator the ranker uses to keep its pick inside each user's caps</li>
                </ul>

                <h3>Impact</h3>
                <p>Sold as the <strong>Campaign and Variant Decisioning Agents</strong> paid add-on, with first deployments at Axis Bank and Nykaa.</p>

                <h3>Technologies Used</h3>
                <p>Java, ranking store, versioned binary formats, feature flags</p>
            `
        },
        'frequency-capping': {
            title: 'Frequency Capping',
            content: `
                <h3>Overview</h3>
                <p>Brands set rules for how many messages a user may receive — by channel, label, segment or team, over daily, weekly, monthly or per-slot windows. This engine enforces those budgets on the dispatch hot path, for every message, without a database call.</p>

                <h3>What I Built</h3>
                <ul>
                    <li>A credit-based rule model replacing fixed per-channel counters. Criteria are optional and window types are plug-ins, so a new kind of rule needs no change to the dispatch path</li>
                    <li>Per-user state as a compact byte array — 3 bytes per rule, 5 per campaign — rebuilt nightly from 30 days of send history, so a cap check is a few array reads</li>
                    <li>Real-time rule propagation to every shard, a live debug endpoint, and an idempotent migration from legacy caps</li>
                    <li>Hardening for scale: 64-stripe locking against cache stampedes, stale-on-error reads, rolling windows and lazy slot resets</li>
                </ul>
                <p>Shipped as seven stacked PRs, from storage and APIs through to the credit engine.</p>

                <h3>Impact</h3>
                <p>Live for <strong>60+ enterprise accounts</strong> within six months of private beta — including Kotak Mahindra Bank group (50M+ customers), Axis Bank (~59M customers), Nykaa, Bajaj Finserv, Angel One, Apollo, Carousell and Cars24 — and the foundation four later products were built on.</p>

                <h3>Technologies Used</h3>
                <p>Java, sharded in-memory state, real-time configuration propagation</p>
            `
        },
        'message-spacing': {
            title: 'Message Spacing with Deferral',
            content: `
                <h3>Overview</h3>
                <p>Brands can require a minimum gap between messages to the same user. A message that hit that gap used to be dropped. Now it waits for its turn.</p>

                <h3>What I Built</h3>
                <ul>
                    <li>A runtime that, when a gap blocks a message, works out the next eligible minute — accounting for the gap clearing, quiet-hours shifts, delivery windows and end-of-day cutoffs — reserves it in the user's budget, and re-enqueues the message through a timed queue</li>
                    <li>An opt-in for both dashboard and API campaigns</li>
                    <li>Outage resilience for scheduled campaigns: after two incidents in which a user-behaviour store outage permanently killed customer campaigns, scheduled sends now retry with exponential backoff instead of stopping. Retry budget and backoff are typed per-account configuration with safe defaults</li>
                </ul>

                <h3>Technologies Used</h3>
                <p>Java, timed queues, exponential backoff</p>
            `
        },
        'campaign-archival': {
            title: 'Campaign Data Archival',
            content: `
                <h3>Overview</h3>
                <p>Finished campaigns and their statistics piled up on the primary MongoDB cluster and became the platform's largest source of slow queries.</p>

                <h3>What I Built</h3>
                <p>A reusable collection-archival framework, applied first to campaign data. Campaigns past a configurable age move, with their statistics, to a separate low-index MongoDB cluster; threshold, batch size and schedule are all configuration.</p>
                <ul>
                    <li>Reads fall back to the archive transparently</li>
                    <li>Archived campaigns can't be republished by accident, but can still be cloned</li>
                </ul>

                <h3>Impact</h3>
                <p>Took the largest source of slow queries off the primary cluster, and left a framework the next collection can reuse.</p>

                <h3>Technologies Used</h3>
                <p>Java, MongoDB</p>
            `
        },
        'unified-inbox': {
            title: 'Server-Side Unified Inbox',
            content: `
                <h3>Overview</h3>
                <p>A new channel built for StockX: an in-app inbox stored server-side in Redis and targeted at users rather than devices.</p>

                <h3>What I Owned</h3>
                <ul>
                    <li>The backend end to end: CRUD, and dispatch for scheduled, live-trigger and API-trigger campaigns</li>
                    <li>Reporting, billing integration and version history</li>
                    <li>Retry for Redis outages</li>
                    <li>The design note and the operations handover</li>
                </ul>

                <h3>Impact</h3>
                <p>Supported a <strong>$1M ARR</strong> customer migration.</p>

                <h3>Technologies Used</h3>
                <p>Java, Redis</p>
            `
        },
        'reliability-security': {
            title: 'Reliability, Performance & Security',
            content: `
                <h3>Overview</h3>
                <p>The work that keeps a high-volume dispatch path fast, standing and safe.</p>

                <h3>What I Did</h3>
                <ul>
                    <li>Fixed a 4.7 GB heap out-of-memory on the dispatch path by replacing a non-thread-safe LRU cache with a lock-free one</li>
                    <li>Made post-publish audit writes asynchronous to cut publish latency</li>
                    <li>Fixed statistics corruption for A/B variants with dots in their names</li>
                    <li>Completed platform-wide PII encryption in the send path — personalisation, test sends and audience estimates — without affecting dispatch throughput</li>
                </ul>

                <h3>Impact</h3>
                <p>The encryption work serves regulated clients including Kotak Mahindra Bank group, Axis Bank, Flipkart and EU-region accounts under GDPR.</p>

                <h3>Technologies Used</h3>
                <p>Java, concurrency, encryption</p>
            `
        },
        'campaign-api': {
            title: 'Campaign Creation API',
            content: `
                <h3>Overview</h3>
                <p>Brought the programmatic API to parity with the dashboard for push, email and SMS campaigns — audience, schedule, conversion tracking and priorities.</p>

                <h3>Design</h3>
                <p>Built as a per-section handler pipeline, so later features plugged in as new handlers rather than rewrites: v2 audience caps, personalisation validation and payload compression all arrived that way.</p>

                <h3>Impact</h3>
                <p>The API now creates <strong>40%+ of all campaigns</strong> on the platform. It's also where I started — as an intern, I built its first extensions for the audience, schedule and setup sections.</p>

                <h3>Technologies Used</h3>
                <p>Java, REST API</p>
            `
        },
        'send-time-personalisation': {
            title: 'Send-Time Content Personalisation',
            content: `
                <h3>Overview</h3>
                <p>Lets a brand personalise a message with content fetched from its own APIs at the moment of sending, instead of syncing its data into the platform first.</p>

                <h3>What I Built</h3>
                <p>Architected the fetch at send time, with Liquid templating of both the URL parameters and the JSON response — so the request can be shaped per user, and fields from the response used in the message.</p>

                <h3>Impact</h3>
                <p>Removed the data-sync step from brand onboarding. Now generally available.</p>

                <h3>Technologies Used</h3>
                <p>Java, Liquid, REST APIs</p>
            `
        },
        'analytics-integrations': {
            title: 'Analytics, Integrations & Security',
            content: `
                <h3>Overview</h3>
                <p>A set of smaller pieces from my first years as a software engineer.</p>

                <h3>What I Did</h3>
                <ul>
                    <li>Built push render-rate measurement, giving visibility into how notifications actually performed</li>
                    <li>Added phone-number matching to the Facebook and Google Ads audience integrations, so audiences can be built from profile data</li>
                    <li>Remediated penetration-test findings: label injection and CSV injection</li>
                </ul>

                <h3>Technologies Used</h3>
                <p>Java, Facebook Ads API, Google Ads API</p>
            `
        }
    };

    return projects[projectId] || { title: 'Project Details', content: '<p>Project information not available.</p>' };
}

// Live IST clock for the "Present" label in the experience timeline
function initTimelineNow() {
    const el = document.getElementById('timeline-now');
    if (!el) return;
    function update() {
        const now = new Date();
        // IST = UTC + 5:30
        const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
        const day   = String(ist.getUTCDate()).padStart(2, '0');
        const month = ist.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        const year  = ist.getUTCFullYear();
        const h     = String(ist.getUTCHours()).padStart(2, '0');
        const m     = String(ist.getUTCMinutes()).padStart(2, '0');
        const s     = String(ist.getUTCSeconds()).padStart(2, '0');
        el.textContent = `${day} ${month} ${year}, ${h}:${m}:${s} IST`;
    }
    update();
    setInterval(update, 1000);
}

// Live experience counter — start: July 4 2022, 9:00 AM IST (UTC+5:30 = 03:30 UTC)
function initExperienceCounter() {
    const START = new Date('2022-07-04T03:30:00Z');
    const els = [
        document.getElementById('exp-counter'),
        document.getElementById('exp-counter-about')
    ].filter(Boolean);
    const yearsEl = document.getElementById('exp-years');
    if (!els.length && !yearsEl) return;

    function update() {
        const now = new Date();

        // Calendar-accurate years and months
        let years  = now.getUTCFullYear() - START.getUTCFullYear();
        let months = now.getUTCMonth()    - START.getUTCMonth();
        if (months < 0) { years--; months += 12; }

        // Anchor = exactly (years, months) after START, same day/time
        let anchor = new Date(Date.UTC(
            START.getUTCFullYear() + years,
            START.getUTCMonth()    + months,
            START.getUTCDate(),
            START.getUTCHours(),
            START.getUTCMinutes(),
            START.getUTCSeconds()
        ));
        // If anchor overshot (e.g. Feb 30 → Mar 2), pull back one month
        if (anchor > now) {
            months--;
            if (months < 0) { years--; months += 12; }
            anchor = new Date(Date.UTC(
                START.getUTCFullYear() + years,
                START.getUTCMonth()    + months,
                START.getUTCDate(),
                START.getUTCHours(),
                START.getUTCMinutes(),
                START.getUTCSeconds()
            ));
        }

        const diff  = now - anchor;
        const secs  = Math.floor(diff / 1000)     % 60;
        const mins  = Math.floor(diff / 60000)    % 60;
        const hours = Math.floor(diff / 3600000)  % 24;
        const days  = Math.floor(diff / 86400000);

        const text = `${years}y ${months}mo ${days}d ${hours}h ${mins}m ${secs}s`;
        els.forEach(el => el.textContent = text);

        // Keep the "N+ Years" highlight card in step with the live counter
        if (yearsEl) yearsEl.textContent = `${years}+ Years`;
    }

    update();
    setInterval(update, 1000);
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Add notification animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    [data-aos] {
        opacity: 0;
        transition: opacity 0.6s ease, transform 0.6s ease;
    }
    [data-aos].animate {
        opacity: 1;
        transition-delay: 0s;
    }
    [data-aos="fade-up"].animate {
        animation: fadeInUp 0.6s ease forwards;
    }
    [data-aos="fade-right"].animate {
        animation: fadeInRight 0.6s ease forwards;
    }
    [data-aos="fade-left"].animate {
        animation: fadeInLeft 0.6s ease forwards;
    }
    @keyframes fadeInUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    @keyframes fadeInRight {
        from { transform: translateX(-30px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeInLeft {
        from { transform: translateX(30px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
