package com.churnprediction.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Payload accepted by the /api/predict and /api/customers endpoints.
 * customerCode is optional for pure "what-if" predictions; if provided
 * and it matches an existing customer, that customer's record is updated
 * with the new prediction.
 */
@Data
public class CustomerDTO {

    private String customerCode;

    @NotNull @Min(0) @Max(120)
    private Integer tenureMonths;

    @NotNull @PositiveOrZero
    private Double monthlyCharges;

    @PositiveOrZero
    private Double totalCharges;

    @NotBlank
    private String contractType;          // Month-to-month, One year, Two year

    @NotBlank
    private String paymentMethod;         // Electronic check, Mailed check, Bank transfer, Credit card

    @NotBlank
    private String internetService;       // DSL, Fiber optic, No

    @NotBlank
    private String techSupport;           // Yes, No, No internet service

    @NotNull @PositiveOrZero
    private Integer numSupportCalls;

    @NotNull @PositiveOrZero
    private Double avgMonthlyUsageGb;

    @NotBlank
    private String paperlessBilling;      // Yes, No

    @NotBlank
    private String multipleLines;         // Yes, No

    // Optional: only present when submitting historical/labeled data for retraining
    private String churned;               // Yes, No
}
