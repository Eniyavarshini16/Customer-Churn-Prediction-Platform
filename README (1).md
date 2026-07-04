package com.churnprediction.controller;

import com.churnprediction.dto.CustomerDTO;
import com.churnprediction.dto.PredictionResponse;
import com.churnprediction.dto.TrainResponse;
import com.churnprediction.service.ChurnModelService;
import com.churnprediction.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class PredictionController {

    private final ChurnModelService churnModelService;
    private final CustomerService customerService;

    public PredictionController(ChurnModelService churnModelService, CustomerService customerService) {
        this.churnModelService = churnModelService;
        this.customerService = customerService;
    }

    /**
     * Accepts customer data, runs it through the trained Random Forest model,
     * and returns a churn probability score with risk classification.
     */
    @PostMapping("/predict")
    public ResponseEntity<?> predict(@Valid @RequestBody CustomerDTO dto) {
        try {
            double probability = churnModelService.predictChurnProbability(dto);
            String riskLevel = churnModelService.classifyRisk(probability);
            String action = recommendedAction(riskLevel);

            // If this prediction refers to an existing customer, persist the result
            customerService.applyPrediction(dto.getCustomerCode(), probability, riskLevel);

            PredictionResponse response = PredictionResponse.builder()
                    .customerCode(dto.getCustomerCode())
                    .churnProbability(Math.round(probability * 10000.0) / 10000.0)
                    .riskLevel(riskLevel)
                    .recommendedAction(action)
                    .build();
            return ResponseEntity.ok(response);
        } catch (IllegalStateException notReady) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(notReady.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Prediction failed: " + e.getMessage());
        }
    }

    /** Retrains the Random Forest model on all currently labeled customer records in MySQL. */
    @PostMapping("/model/train")
    public ResponseEntity<TrainResponse> train() {
        return ResponseEntity.ok(churnModelService.retrainFromDatabase());
    }

    @GetMapping("/model/status")
    public ResponseEntity<?> status() {
        return ResponseEntity.ok(new Object() {
            public final boolean ready = churnModelService.isModelReady();
            public final double accuracy = churnModelService.getLastAccuracy();
            public final double rocAuc = churnModelService.getLastRocAuc();
        });
    }

    private String recommendedAction(String riskLevel) {
        return switch (riskLevel) {
            case "High" -> "Escalate to retention team within 48 hours; consider loyalty offer.";
            case "Medium" -> "Add to proactive outreach campaign; monitor next billing cycle.";
            default -> "No action needed; continue standard engagement.";
        };
    }
}
