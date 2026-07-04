package com.churnprediction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainResponse {
    private int trainingRecords;
    private double accuracy;
    private double precision;
    private double recall;
    private double f1Score;
    private double rocAuc;
    private String message;
}
