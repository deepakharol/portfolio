package com.deepakkharol.portfolio.service;

import com.deepakkharol.portfolio.model.Contact;
import com.deepakkharol.portfolio.repository.ContactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class ContactService {

    @Autowired(required = false)
    private ContactRepository contactRepository;

    // In-memory storage as fallback
    private List<Contact> inMemoryContacts = new ArrayList<>();

    public Contact saveContact(Contact contact) {
        if (contactRepository != null) {
            try {
                return contactRepository.save(contact);
            } catch (Exception e) {
                // Fall back to in-memory storage
            }
        }
        // Use in-memory storage as fallback
        contact.setId(String.valueOf(System.currentTimeMillis()));
        inMemoryContacts.add(contact);
        System.out.println("Contact saved in memory: " + contact.getName() + " - " + contact.getEmail());
        return contact;
    }

    public List<Contact> getAllContacts() {
        if (contactRepository != null) {
            try {
                return contactRepository.findAll();
            } catch (Exception e) {
                // Fall back to in-memory storage
            }
        }
        return inMemoryContacts;
    }

    public Contact getContactById(String id) {
        if (contactRepository != null) {
            try {
                Optional<Contact> contact = contactRepository.findById(id);
                return contact.orElse(null);
            } catch (Exception e) {
                // Fall back to in-memory storage
            }
        }
        return inMemoryContacts.stream()
            .filter(c -> c.getId().equals(id))
            .findFirst()
            .orElse(null);
    }

    public Contact markAsRead(String id) {
        if (contactRepository != null) {
            try {
                Optional<Contact> contactOpt = contactRepository.findById(id);
                if (contactOpt.isPresent()) {
                    Contact contact = contactOpt.get();
                    contact.setRead(true);
                    return contactRepository.save(contact);
                }
            } catch (Exception e) {
                // Fall back to in-memory storage
            }
        }
        Contact contact = inMemoryContacts.stream()
            .filter(c -> c.getId().equals(id))
            .findFirst()
            .orElse(null);
        if (contact != null) {
            contact.setRead(true);
        }
        return contact;
    }

    public boolean deleteContact(String id) {
        if (contactRepository != null) {
            try {
                if (contactRepository.existsById(id)) {
                    contactRepository.deleteById(id);
                    return true;
                }
            } catch (Exception e) {
                // Fall back to in-memory storage
            }
        }
        return inMemoryContacts.removeIf(c -> c.getId().equals(id));
    }
}
