package com.campuscarpool.service;

import org.springframework.http.HttpStatus;

/** A business-rule failure that maps directly to an HTTP status. */
public class ApiException extends RuntimeException {
    private final HttpStatus status;

    public ApiException(HttpStatus status, String message) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
