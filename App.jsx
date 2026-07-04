package com.churnprediction.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Represents a customer's account and behavioral data used both as
 * historical training data (when {@code churned} is set) and as the
 * live record that gets updated with the latest churn prediction.
 */
@Entity
@Table(name = "customers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 32)
    private String customerCode;

    // ---- Behavioral / account features used by the model ----
    private Integer tenureMonths;
    private Double monthlyCharges;
    private Double totalCharges;

    @Column(length = 32)
    private String contractType;          // Month-to-month, One year, Two year

    @Column(length = 32)
    private String paymentMethod;         // Electronic check, Mailed check, Bank transfer, Credit card

    @Column(length = 16)
    private String internetService;       // DSL, Fiber optic, No

    @Column(length = 24)
    private String techSupport;           // Yes, No, No internet service

    private Integer numSupportCalls;
    private Double avgMonthlyUsageGb;

    @Column(length = 8)
    private String paperlessBilling;      // Yes, No

    @Column(length = 8)
    private String multipleLines;         // Yes, No

    // ---- Derived / segmentation ----
    @Column(length = 24)
    private String segment;               // High Value, Standard, Budget, New

    // ---- Label (only populated for historical/training records) ----
    @Column(length = 8)
    private String churned;               // Yes, No, or null for live/unlabeled records

    // ---- Latest prediction results (updated by the prediction service) ----
    private Double churnProbability;

    @Column(length = 8)
    private String riskLevel;             // Low, Medium, High

    private LocalDateTime lastPredictedAt;

    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
