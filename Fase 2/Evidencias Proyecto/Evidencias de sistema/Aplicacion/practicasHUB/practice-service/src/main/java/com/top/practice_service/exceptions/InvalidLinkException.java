package com.top.practice_service.exceptions;

//enlace del supervisor que no existe, vencio o fue revocado
public class InvalidLinkException extends RuntimeException {
    public InvalidLinkException() {
        super("Este enlace no es válido o ya venció. Pide al docente del curso que te envíe uno nuevo.");
    }
}
