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
    initTypingEffect();
    initScrollAnimations();

    // Static projects are loaded via modals on demand
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
        'Senior Software Engineer',
        'Backend Developer',
        'Problem Solver',
        'Team Leader'
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

    // Using FormSubmit.co for backend-less submission
    // Default HTML submission is enabled
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

// Get static project data
function getProjectData(projectId) {
    const projects = {
        'frequency-capping': {
            title: 'Advanced Frequency Capping System',
            content: `
                <h3>Overview</h3>
                <p>Developed a sophisticated rule-based frequency capping system to prevent user over-messaging at scale. This system handles label-level, channel-level, and cross-channel limits.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>Complex rule evaluation engine</li>
                    <li>Cross-channel message limiting</li>
                    <li>Real-time enforcement at scale</li>
                    <li>Granular control with label-level limits</li>
                </ul>
                
                <h3>Impact</h3>
                <p>Significantly improved user experience by preventing message fatigue and ensuring compliance with communication policies in high-throughput environments.</p>
                
                <h3>Technologies Used</h3>
                <p>Java, Redis, Distributed Systems, Rule Engine</p>
            `
        },
        'campaign-archival': {
            title: 'Campaign Auto Archival Pipeline',
            content: `
                <h3>Overview</h3>
                <p>Built an automated pipeline to offload inactive campaign targeting data from the primary MongoDB cluster to a dedicated archival datastore.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>Automated data identification and migration</li>
                    <li>Zero-downtime archival process</li>
                    <li>Data integrity verification</li>
                    <li>Performance optimization for primary cluster</li>
                </ul>
                
                <h3>Impact</h3>
                <p>Improved overall system performance and stability by reducing the load on the primary operational database.</p>
                
                <h3>Technologies Used</h3>
                <p>Java, MongoDB, Data Pipelines, System Optimization</p>
            `
        },
        'linked-content': {
            title: 'Linked Content Personalization',
            content: `
                <h3>Overview</h3>
                <p>Architected an external API-driven content personalization system for campaigns, enabling dynamic payload generation based on real-time data.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>External API integration for dynamic content</li>
                    <li>Real-time payload generation</li>
                    <li>Simplified client onboarding process</li>
                    <li>High-performance data fetching</li>
                </ul>
                
                <h3>Impact</h3>
                <p>Significantly reduced client onboarding friction and enabled highly personalized campaign content served at runtime.</p>
                
                <h3>Technologies Used</h3>
                <p>Java, REST APIs, Microservices, Real-time Processing</p>
            `
        },
        'versioned-messaging': {
            title: 'Versioned Messaging Support',
            content: `
                <h3>Overview</h3>
                <p>Implemented robust multi-version support for campaign messages, allowing for safer updates and A/B testing capabilities.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>Message version control</li>
                    <li>Backward compatibility support</li>
                    <li>Safe rollout mechanisms</li>
                </ul>
                
                <h3>Technologies Used</h3>
                <p>Java, System Design, Data Modeling</p>
            `
        },
        'audience-integration': {
            title: 'Facebook & Google Audience Integration',
            content: `
                <h3>Overview</h3>
                <p>Integrated Facebook and Google Ads workflows directly into the CleverTap platform for seamless audience creation and ad set targeting.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>Direct integration with Ad platforms APIs</li>
                    <li>Automated audience syncing</li>
                    <li>Profile attribute targeting (email, phone)</li>
                    <li>Streamlined marketing workflow</li>
                </ul>
                
                <h3>Technologies Used</h3>
                <p>Java, Third-party APIs, OAuth, Batch Processing</p>
            `
        },
        'push-analytics': {
            title: 'Push Notification Analytics',
            content: `
                <h3>Overview</h3>
                <p>Built comprehensive analytics pipelines and dashboards to compute and visualize push notification render rates (Impressions vs Sent).</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>Data pipeline for tracking delivery stats</li>
                    <li>Real-time dashboard visualization</li>
                    <li>Calculation of complex metrics</li>
                </ul>
                
                <h3>Impact</h3>
                <p>Greatly improved visibility into campaign performance, helping clients optimize their messaging strategies.</p>
                
                <h3>Technologies Used</h3>
                <p>Java, Data Analytics, Visualization Tools</p>
            `
        },
        'campaign-api': {
            title: 'Campaign API System',
            content: `
                <h3>Overview</h3>
                <p>Developed a comprehensive RESTful API system that enables clients to programmatically create and manage marketing campaigns across multiple channels including push notifications, emails, and SMS.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>RESTful API design with comprehensive documentation</li>
                    <li>Support for multiple campaign types (Push, Email, SMS)</li>
                    <li>Batch processing capabilities for large-scale campaigns</li>
                    <li>Real-time validation and error handling</li>
                    <li>Rate limiting and authentication mechanisms</li>
                </ul>
                
                <h3>Impact</h3>
                <p>This API system now powers <strong>40% of all campaigns</strong> on the CleverTap platform, processing millions of requests daily and significantly improving client automation capabilities.</p>
                
                <h3>Technologies Used</h3>
                <p>Java, Spring Boot, Redis, MongoDB, REST API, OAuth 2.0</p>
            `
        },
        'unified-inbox': {
            title: 'Unified Inbox System',
            content: `
                <h3>Overview</h3>
                <p>Created a Redis-based server-side app inbox system that provides a centralized message management solution for mobile applications.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>High-performance Redis-based storage</li>
                    <li>Real-time message synchronization</li>
                    <li>Support for rich media content</li>
                    <li>Message prioritization and categorization</li>
                    <li>Analytics and engagement tracking</li>
                </ul>
                
                <h3>Impact</h3>
                <p>This system was instrumental in migrating <strong>$1M ARR</strong> to the CleverTap platform, providing enterprise clients with a robust messaging infrastructure.</p>
                
                <h3>Technologies Used</h3>
                <p>Java, Redis, Microservices Architecture, WebSockets, REST API</p>
            `
        },
        'encryption': {
            title: 'PII Data Encryption System',
            content: `
                <h3>Overview</h3>
                <p>Led the development of an end-to-end encryption system for protecting personally identifiable information (PII) including user properties, emails, and phone numbers.</p>
                
                <h3>Key Features</h3>
                <ul>
                    <li>AES-256 encryption for data at rest</li>
                    <li>TLS 1.3 for data in transit</li>
                    <li>Key rotation and management system</li>
                    <li>Secure decryption for personalization</li>
                    <li>Compliance with GDPR and data protection regulations</li>
                </ul>
                
                <h3>Impact</h3>
                <p>Enhanced data security for millions of user records, ensuring compliance with international data protection standards and building client trust.</p>
                
                <h3>Technologies Used</h3>
                <p>Java, Cryptography Libraries, HSM Integration, Key Management Systems</p>
            `
        }
    };

    return projects[projectId] || { title: 'Project Details', content: '<p>Project information not available.</p>' };
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
