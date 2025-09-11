package com.deepakkharol.portfolio.repository;

import com.deepakkharol.portfolio.model.Contact;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContactRepository extends MongoRepository<Contact, String> {
    List<Contact> findByRead(boolean read);
    List<Contact> findByEmailContaining(String email);
    List<Contact> findAllByOrderByTimestampDesc();
}
