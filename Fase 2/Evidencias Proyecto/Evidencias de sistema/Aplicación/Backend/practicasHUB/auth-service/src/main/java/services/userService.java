package services;

import models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import repositories.UserRepository;

@Service
public class userService {
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    public User RegisterUser(User newUser){
        if(userRepository.findByEmail(newUser.getEmail()).isPresent()){
            throw new IllegalArgumentException("Email already in use");
        }
        newUser.setPassword(passwordEncoder.encode(newUser.getPassword()));
        return userRepository.save(newUser);
    }
}
