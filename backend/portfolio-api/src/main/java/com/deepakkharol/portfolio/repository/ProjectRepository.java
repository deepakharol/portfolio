package com.deepakkharol.portfolio.repository;

import com.deepakkharol.portfolio.model.Project;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends MongoRepository<Project, String> {
    List<Project> findByFeatured(boolean featured);
    List<Project> findByProjectType(String projectType);
    List<Project> findByOrderByOrderAsc();
}
