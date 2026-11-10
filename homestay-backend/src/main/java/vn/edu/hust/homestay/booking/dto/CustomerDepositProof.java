package vn.edu.hust.homestay.booking.dto;

import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;

public record CustomerDepositProof(Resource resource, MediaType mediaType, String filename) {}
