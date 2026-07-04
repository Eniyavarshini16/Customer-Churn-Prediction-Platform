package com.churnprediction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalyticsSummary {
    private long totalCustomers;
    private double averageChurnProbability;
    private Map<String, Long> riskDistribution;      // Low/Medium/High -> count
    private List<SegmentBreakdown> segmentBreakdown;
    private double modelAccuracy;
    private double modelRocAuc;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SegmentBreakdown {
        private String segment;
        private long customerCount;
        private double avgChurnProbability;
    }
}
