package services;

import models.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import repositories.UserRepository;

@Service
public class UserService {
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

    public User authenticateUser(String email, String password){
        User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("Invalid Credentials"));

        if(!passwordEncoder.matches(password,user.getPassword())){
            throw new IllegalArgumentException("Invalid Credentials");
        }

        return user;
    }
}
