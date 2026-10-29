package vn.edu.hust.homestay.room.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDate;

@Getter
@Builder
public class QuotedNightResponse {
    private LocalDate stayDate;
    private Long nightlyPrice;
}
