package com.churnprediction.service;

import com.churnprediction.dto.AnalyticsSummary;
import com.churnprediction.dto.CustomerDTO;
import com.churnprediction.entity.Customer;
import com.churnprediction.repository.CustomerRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final FeatureEngineeringService featureEngineeringService;

    public CustomerService(CustomerRepository customerRepository, FeatureEngineeringService featureEngineeringService) {
        this.customerRepository = customerRepository;
        this.featureEngineeringService = featureEngineeringService;
    }

    public Page<Customer> list(String riskLevel, String segment, Pageable pageable) {
        if (riskLevel != null && segment != null) {
            return customerRepository.findByRiskLevelAndSegment(riskLevel, segment, pageable);
        } else if (riskLevel != null) {
            return customerRepository.findByRiskLevel(riskLevel, pageable);
        } else if (segment != null) {
            return customerRepository.findBySegment(segment, pageable);
        }
        return customerRepository.findAll(pageable);
    }

    public Optional<Customer> findByCode(String customerCode) {
        return customerRepository.findByCustomerCode(customerCode);
    }

    public Customer createFromDto(CustomerDTO dto) {
        Customer customer = Customer.builder()
                .customerCode(dto.getCustomerCode() != null ? dto.getCustomerCode() : generateCode())
                .tenureMonths(dto.getTenureMonths())
                .monthlyCharges(dto.getMonthlyCharges())
                .totalCharges(dto.getTotalCharges() != null ? dto.getTotalCharges()
                        : dto.getTenureMonths() * dto.getMonthlyCharges())
                .contractType(dto.getContractType())
                .paymentMethod(dto.getPaymentMethod())
                .internetService(dto.getInternetService())
                .techSupport(dto.getTechSupport())
                .numSupportCalls(dto.getNumSupportCalls())
                .avgMonthlyUsageGb(dto.getAvgMonthlyUsageGb())
                .paperlessBilling(dto.getPaperlessBilling())
                .multipleLines(dto.getMultipleLines())
                .churned(dto.getChurned())
                .segment(featureEngineeringService.deriveSegment(dto.getTenureMonths(), dto.getMonthlyCharges()))
                .build();
        return customerRepository.save(customer);
    }

    /** Persists the latest prediction result onto a matching customer record, if one exists. */
    public void applyPrediction(String customerCode, double churnProbability, String riskLevel) {
        if (customerCode == null) return;
        customerRepository.findByCustomerCode(customerCode).ifPresent(c -> {
            c.setChurnProbability(churnProbability);
            c.setRiskLevel(riskLevel);
            c.setLastPredictedAt(LocalDateTime.now());
            customerRepository.save(c);
        });
    }

    public AnalyticsSummary getAnalyticsSummary(double modelAccuracy, double modelRocAuc) {
        long total = customerRepository.count();
        Double avgProb = customerRepository.averageChurnProbability();

        Map<String, Long> riskDistribution = new LinkedHashMap<>();
        riskDistribution.put("Low", 0L);
        riskDistribution.put("Medium", 0L);
        riskDistribution.put("High", 0L);
        customerRepository.countByRiskLevel().forEach(rc -> riskDistribution.put(rc.getRiskLevel(), rc.getTotal()));

        List<AnalyticsSummary.SegmentBreakdown> segments = customerRepository.summarizeBySegment().stream()
                .map(s -> AnalyticsSummary.SegmentBreakdown.builder()
                        .segment(s.getSegment())
                        .customerCount(s.getTotal())
                        .avgChurnProbability(s.getAvgProbability() != null ? s.getAvgProbability() : 0.0)
                        .build())
                .collect(Collectors.toList());

        return AnalyticsSummary.builder()
                .totalCustomers(total)
                .averageChurnProbability(avgProb != null ? avgProb : 0.0)
                .riskDistribution(riskDistribution)
                .segmentBreakdown(segments)
                .modelAccuracy(modelAccuracy)
                .modelRocAuc(modelRocAuc)
                .build();
    }

    private String generateCode() {
        return "CUST-" + String.format("%06d", (int) (Math.random() * 999999));
    }
}
