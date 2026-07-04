package com.churnprediction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionResponse {
    private String customerCode;
    private double churnProbability;   // 0.0 - 1.0
    private String riskLevel;          // Low, Medium, High
    private String recommendedAction;
}
