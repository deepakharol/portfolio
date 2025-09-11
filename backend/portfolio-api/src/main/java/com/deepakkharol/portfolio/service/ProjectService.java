package com.deepakkharol.portfolio.service;

import com.deepakkharol.portfolio.model.Project;
import com.deepakkharol.portfolio.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    @Autowired(required = false)
    private ProjectRepository projectRepository;

    // Initialize with some default projects if repository is not available
    private List<Project> defaultProjects = Arrays.asList(
        createDefaultProject("Campaign API System", 
            "RESTful API for programmatic campaign creation handling push notifications, emails, and SMS. Powers 40% of all campaigns at CleverTap.",
            Arrays.asList("Java", "Spring Boot", "Redis", "MongoDB")),
        createDefaultProject("Unified Inbox System", 
            "Redis-based server-side app inbox system that helped migrate $1M ARR to CleverTap platform.",
            Arrays.asList("Java", "Redis", "Microservices", "REST API")),
        createDefaultProject("PII Data Encryption", 
            "End-to-end encryption system for user data including properties, email, and phone numbers with secure personalization.",
            Arrays.asList("Java", "Cryptography", "Security"))
    );

    private Project createDefaultProject(String title, String description, List<String> technologies) {
        Project project = new Project(title, description, technologies);
        project.setFeatured(true);
        return project;
    }

    public List<Project> getAllProjects() {
        if (projectRepository != null) {
            try {
                return projectRepository.findAll();
            } catch (Exception e) {
                // Fall back to default projects if database is not available
            }
        }
        return defaultProjects;
    }

    public Project getProjectById(String id) {
        if (projectRepository != null) {
            try {
                Optional<Project> project = projectRepository.findById(id);
                return project.orElse(null);
            } catch (Exception e) {
                // Fall back to default projects if database is not available
            }
        }
        return defaultProjects.stream()
            .filter(p -> p.getTitle().equals(id))
            .findFirst()
            .orElse(null);
    }

    public List<Project> getFeaturedProjects() {
        if (projectRepository != null) {
            try {
                return projectRepository.findByFeatured(true);
            } catch (Exception e) {
                // Fall back to default projects if database is not available
            }
        }
        return defaultProjects.stream()
            .filter(Project::isFeatured)
            .collect(Collectors.toList());
    }

    public Project createProject(Project project) {
        if (projectRepository != null) {
            try {
                return projectRepository.save(project);
            } catch (Exception e) {
                // Handle exception
            }
        }
        defaultProjects.add(project);
        return project;
    }

    public Project updateProject(String id, Project project) {
        if (projectRepository != null) {
            try {
                Optional<Project> existingProject = projectRepository.findById(id);
                if (existingProject.isPresent()) {
                    project.setId(id);
                    return projectRepository.save(project);
                }
            } catch (Exception e) {
                // Handle exception
            }
        }
        return null;
    }

    public boolean deleteProject(String id) {
        if (projectRepository != null) {
            try {
                if (projectRepository.existsById(id)) {
                    projectRepository.deleteById(id);
                    return true;
                }
            } catch (Exception e) {
                // Handle exception
            }
        }
        return false;
    }
}
