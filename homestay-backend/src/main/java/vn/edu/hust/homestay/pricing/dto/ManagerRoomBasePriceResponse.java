package vn.edu.hust.homestay.pricing.dto;

/** Response for API-PRICE-01: the approved BASE nightly price of a room. */
public record ManagerRoomBasePriceResponse(Long roomId, Long nightlyPrice) { }
