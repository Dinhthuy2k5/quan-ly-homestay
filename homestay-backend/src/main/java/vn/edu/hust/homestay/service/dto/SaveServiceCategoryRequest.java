package vn.edu.hust.homestay.service.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record SaveServiceCategoryRequest(
        @JsonProperty("name")
        String name
) {}
