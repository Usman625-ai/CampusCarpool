package com.campuscarpool.web;

import com.campuscarpool.service.ApiException;
import java.sql.SQLException;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Turns failures into { "error": "..." } bodies. SQL Server THROW codes 50000-50999 are our business rules. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    public record ErrorBody(String error) {
    }

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ErrorBody> handleApi(ApiException e) {
        return ResponseEntity.status(e.getStatus()).body(new ErrorBody(e.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorBody> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + " " + f.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return ResponseEntity.badRequest().body(new ErrorBody(message));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<ErrorBody> handleData(DataAccessException e) {
        SQLException sql = findSqlException(e);
        if (sql != null) {
            int code = sql.getErrorCode();
            if (code >= 50000 && code < 51000) {
                return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorBody(sql.getMessage()));
            }
            if (code == 2627 || code == 2601) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ErrorBody("That already exists (email, enrollment number, plate, route name or booking)."));
            }
            if (code == 547) {
                return ResponseEntity.badRequest().body(new ErrorBody("A value is invalid or refers to something that does not exist."));
            }
        }
        log.error("Unexpected database error", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(new ErrorBody("Unexpected database error."));
    }

    private static SQLException findSqlException(Throwable t) {
        for (Throwable c = t; c != null; c = c.getCause()) {
            if (c instanceof SQLException s) {
                return s;
            }
        }
        return null;
    }
}
