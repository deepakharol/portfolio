# Deepak Kharol - Portfolio Website

A modern, responsive portfolio website showcasing professional experience, skills, and projects with an interactive Tetris game and Spring Boot backend integration.

## 🌟 Features

### Frontend
- **Modern Design**: Clean, professional layout with smooth animations
- **Responsive**: Mobile-first design that works on all devices
- **Interactive Elements**: 
  - Particle effects in hero section
  - Typing animation for titles
  - Smooth scrolling navigation
  - Animated skill cards
- **Tetris Game**: Fully functional Tetris game built with JavaScript
- **Contact Form**: Integrated contact form with backend API
- **Project Showcase**: Dynamic project cards with detailed modals

### Backend (Optional)
- **Spring Boot REST API**: RESTful endpoints for projects and contact submissions
- **MongoDB Integration**: Database support with fallback to in-memory storage
- **CORS Configuration**: Properly configured for cross-origin requests
- **Service Layer**: Clean architecture with service and repository layers

## 🚀 Quick Start

### Frontend Only (No Backend Required)

```bash
# Navigate to portfolio directory
cd /Users/deepakkharol/IdeaProjects/portfolio

# Option 1: Using npm http-server
npm install -g http-server
http-server -p 8000

# Option 2: Using Python
python3 -m http.server 8000
```

Visit `http://localhost:8000` to view your portfolio.

### Full Stack (With Backend)

#### Start Backend
```bash
cd backend/portfolio-api
./mvnw spring-boot:run
```
Backend will run on `http://localhost:8080`

#### Start Frontend
```bash
cd ../../
http-server -p 8000
```
Frontend will run on `http://localhost:8000`

## 🎮 Tetris Game Controls

- **Arrow Left/Right**: Move piece
- **Arrow Up**: Rotate piece
- **Arrow Down**: Soft drop
- **Space**: Hard drop
- **P**: Pause game

## 🛠️ Technologies Used

### Frontend
- HTML5, CSS3, JavaScript (ES6+)
- CSS Grid & Flexbox
- Canvas API (for Tetris)
- Font Awesome Icons

### Backend
- Java 11
- Spring Boot 2.7.14
- Spring Data MongoDB
- Maven

## 🚢 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions to Cloudflare.

## 📄 License

This project is open source and available for personal use and modification.

## 👤 Author

**Deepak Kharol**
- Senior Software Engineer at CleverTap
- Email: deepakkharol12@gmail.com
- LinkedIn: [linkedin.com/in/deepakkharol](https://linkedin.com/in/deepakkharol)
- GitHub: [github.com/deepakkharol](https://github.com/deepakkharol)
- Deployment: Cloudflare Pages

## Author
Deepak Kharol - dkharol48@gmail.com
