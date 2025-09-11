#!/bin/bash

# ============================================
# Portfolio Creation Script
# This script will create all files for your portfolio
# ============================================

echo "🚀 Creating Portfolio Directory Structure..."

# Create main directory
PORTFOLIO_DIR="portfolio"

# Create directory structure
echo "📁 Creating directories..."
mkdir -p assets/css assets/js assets/images assets/resume
mkdir -p backend/portfolio-api/src/main/java/com/deepakkharol/portfolio/{controller,model,service}
mkdir -p backend/portfolio-api/src/main/resources

echo "📝 Creating frontend files..."

# Create index.html
cat > index.html << 'ENDHTML'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Deepak Kharol - Senior Software Engineer | Portfolio</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>
    <div id="preloader">
        <div class="loader"><div class="loader-inner"></div></div>
    </div>
    <nav id="navbar" class="navbar">
        <div class="nav-container">
            <div class="nav-brand"><a href="#home" class="logo"><span class="logo-text">DK</span></a></div>
            <div class="nav-menu" id="navMenu">
                <ul class="nav-list">
                    <li class="nav-item"><a href="#home" class="nav-link active">Home</a></li>
                    <li class="nav-item"><a href="#about" class="nav-link">About</a></li>
                    <li class="nav-item"><a href="#experience" class="nav-link">Experience</a></li>
                    <li class="nav-item"><a href="#skills" class="nav-link">Skills</a></li>
                    <li class="nav-item"><a href="#projects" class="nav-link">Projects</a></li>
                    <li class="nav-item"><a href="#contact" class="nav-link">Contact</a></li>
                </ul>
            </div>
        </div>
    </nav>
    
    <section id="home" class="hero">
        <div class="hero-bg"><div class="hero-particles" id="particles"></div></div>
        <div class="container">
            <div class="hero-content">
                <div class="hero-text">
                    <h1 class="hero-title">
                        <span class="greeting">Hello, I'm</span>
                        <span class="name">Deepak Kharol</span>
                    </h1>
                    <h2 class="hero-subtitle">Senior Software Engineer</h2>
                    <p class="hero-description">Passionate backend developer with 3 years of experience at CleverTap.</p>
                    <div class="hero-buttons">
                        <a href="#contact" class="btn btn-primary">Get In Touch</a>
                        <a href="assets/resume/Deepak_Kharol_Resume.pdf" download class="btn btn-secondary">Download CV</a>
                    </div>
                </div>
            </div>
        </div>
    </section>
    
    <!-- Add other sections here -->
    
    <script src="assets/js/particles.js"></script>
    <script src="assets/js/tetris.js"></script>
    <script src="assets/js/main.js"></script>
</body>
</html>
ENDHTML

echo "✅ Created index.html"

# Create package.json
cat > package.json << 'ENDPACKAGE'
{
  "name": "deepak-kharol-portfolio",
  "version": "1.0.0",
  "description": "Portfolio website for Deepak Kharol",
  "scripts": {
    "start": "http-server -p 8000",
    "build": "echo 'Build script here'"
  },
  "author": "Deepak Kharol",
  "license": "MIT",
  "devDependencies": {
    "http-server": "^14.1.1"
  }
}
ENDPACKAGE

echo "✅ Created package.json"

# Create basic CSS file
cat > assets/css/style.css << 'ENDCSS'
:root {
    --primary-color: #6366f1;
    --secondary-color: #8b5cf6;
    --dark-color: #0f172a;
    --light-color: #f8fafc;
    --text-color: #334155;
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: var(--text-color);
    line-height: 1.6;
}

.navbar {
    position: fixed;
    top: 0;
    width: 100%;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(10px);
    z-index: 1000;
    padding: 1rem 0;
}

.nav-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.hero {
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    color: white;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 2rem;
}

.btn {
    padding: 0.875rem 2rem;
    border-radius: 50px;
    text-decoration: none;
    display: inline-block;
    transition: all 0.3s ease;
    margin-right: 1rem;
}

.btn-primary {
    background: white;
    color: var(--primary-color);
}

.btn-secondary {
    background: transparent;
    color: white;
    border: 2px solid white;
}
ENDCSS

echo "✅ Created assets/css/style.css"

# Create basic main.js
cat > assets/js/main.js << 'ENDJS'
// Main JavaScript File
const CONFIG = {
    API_BASE_URL: 'http://localhost:8080/api'
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Portfolio loaded successfully!');
    
    // Hide preloader
    setTimeout(() => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            preloader.style.display = 'none';
        }
    }, 1000);
    
    // Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});

// API functions
async function loadProjects() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/projects`);
        const projects = await response.json();
        console.log('Projects loaded:', projects);
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}
ENDJS

echo "✅ Created assets/js/main.js"

# Create basic tetris.js
cat > assets/js/tetris.js << 'ENDTETRIS'
// Tetris Game Implementation
console.log('Tetris game loaded');

function initTetris() {
    console.log('Initializing Tetris...');
}

function stopTetris() {
    console.log('Stopping Tetris...');
}

window.initTetris = initTetris;
window.stopTetris = stopTetris;
ENDTETRIS

echo "✅ Created assets/js/tetris.js"

# Create particles.js
cat > assets/js/particles.js << 'ENDPARTICLES'
// Particle Effects System
console.log('Particles system loaded');

class ParticleSystem {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        console.log('Particle system initialized');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const particles = new ParticleSystem('particles');
});
ENDPARTICLES

echo "✅ Created assets/js/particles.js"

# Create README.md
cat > README.md << 'ENDREADME'
# Portfolio Website - Deepak Kharol

A modern portfolio website built with HTML5, CSS3, JavaScript, and Spring Boot.

## Features
- Responsive design
- Interactive Tetris game
- Backend API integration
- Contact form

## Setup
1. Install dependencies: `npm install`
2. Run locally: `npm start`
3. Visit: http://localhost:8000

## Technologies
- Frontend: HTML5, CSS3, JavaScript
- Backend: Java, Spring Boot
- Database: MongoDB
- Deployment: Cloudflare Pages

## Author
Deepak Kharol - dkharol48@gmail.com
ENDREADME

echo "✅ Created README.md"

# Create .gitignore
cat > .gitignore << 'ENDGITIGNORE'
node_modules/
.env
.DS_Store
*.log
dist/
build/
target/
*.jar
.idea/
*.iml
.vscode/
ENDGITIGNORE

echo "✅ Created .gitignore"

# Create backend files
echo "📝 Creating backend files..."

# Create pom.xml
cat > backend/portfolio-api/pom.xml << 'ENDPOM'
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    
    <groupId>com.deepakkharol</groupId>
    <artifactId>portfolio-api</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>2.7.14</version>
    </parent>
    
    <properties>
        <java.version>11</java.version>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-mongodb</artifactId>
        </dependency>
    </dependencies>
    
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
ENDPOM

echo "✅ Created backend/portfolio-api/pom.xml"

# Create application.properties
cat > backend/portfolio-api/src/main/resources/application.properties << 'ENDPROPS'
server.port=8080
spring.application.name=portfolio-api
spring.data.mongodb.uri=mongodb://localhost:27017/portfolio
app.cors.allowed-origins=http://localhost:8000,https://deepakkharol.com
ENDPROPS

echo "✅ Created application.properties"

# Create main Spring Boot application
cat > backend/portfolio-api/src/main/java/com/deepakkharol/portfolio/PortfolioApplication.java << 'ENDJAVA'
package com.deepakkharol.portfolio;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PortfolioApplication {
    public static void main(String[] args) {
        SpringApplication.run(PortfolioApplication.class, args);
    }
}
ENDJAVA

echo "✅ Created PortfolioApplication.java"

echo ""
echo "✨ Portfolio structure created successfully!"
echo ""
echo "📁 Your portfolio has been created in: $(pwd)"
echo ""
echo "Next steps:"
echo "1. cd portfolio"
echo "2. npm install"
echo "3. Add your profile image to assets/images/profile.jpg"
echo "4. Add your resume to assets/resume/Deepak_Kharol_Resume.pdf"
echo "5. npm start (to run locally)"
echo ""
echo "For the complete implementation with all features,"
echo "copy the full code from the artifacts provided above."
echo ""
echo "🎉 Happy coding!"