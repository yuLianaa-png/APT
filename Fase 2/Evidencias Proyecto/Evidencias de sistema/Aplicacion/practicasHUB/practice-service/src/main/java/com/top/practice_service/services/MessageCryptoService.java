package com.top.practice_service.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

//cifra el contenido de los mensajes antes de guardarlo
@Service
public class MessageCryptoService {
    private static final int IV_LENGTH = 12;
    private static final int TAG_BITS = 128;
    private final SecureRandom random = new SecureRandom();
    private final SecretKeySpec key;

    public MessageCryptoService(@Value("${messages.key:}") String secret) {
        String value = secret;
        if (value == null || value.isBlank()) {
            //solo para desarrollo local, en Render la clave es obligatoria (la genera render.yaml)
            System.err.println("ADVERTENCIA: MESSAGE_KEY no está definida, se usa una clave de desarrollo.");
            value = "practicashub-clave-solo-desarrollo";
        }
        try {
            //se deriva una clave de 256 bits a partir del texto de la variable
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(hash, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo preparar la clave de los mensajes.", e);
        }
    }

    public String encrypt(String text) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] encrypted = cipher.doFinal(text.getBytes(StandardCharsets.UTF_8));
            //se guarda el vector de inicializacion junto al texto cifrado
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(iv.length + encrypted.length)
                    .put(iv).put(encrypted).array());
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo cifrar el mensaje.", e);
        }
    }

    public String decrypt(String stored) {
        try {
            byte[] data = Base64.getDecoder().decode(stored);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, data, 0, IV_LENGTH));
            return new String(cipher.doFinal(data, IV_LENGTH, data.length - IV_LENGTH), StandardCharsets.UTF_8);
        } catch (Exception e) {
            //clave cambiada o dato alterado: no se muestra nada en vez de romper la conversacion
            return "(No se pudo leer este mensaje)";
        }
    }
}
