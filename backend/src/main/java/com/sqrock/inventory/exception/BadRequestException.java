package com.sqrock.inventory.exception;

/** The request is syntactically fine but refers to something invalid (e.g. an unknown category). */
public class BadRequestException extends RuntimeException {
    public BadRequestException(String message) { super(message); }
}
