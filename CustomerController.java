package com.churnprediction.util;

import com.churnprediction.entity.Customer;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Generates realistic, internally-correlated synthetic customer records
 * for demo purposes. Churn likelihood is driven by a weighted combination
 * of contract type, tenure, support call volume, and pricing, then a
 * Bernoulli draw decides the actual historical "churned" label -- this
 * gives the Random Forest genuine, learnable signal instead of noise.
 */
public class SyntheticDataGenerator {

    private static final String[] CONTRACT_TYPES = {"Month-to-month", "One year", "Two year"};
    private static final double[] CONTRACT_WEIGHTS = {0.55, 0.25, 0.20};

    private static final String[] PAYMENT_METHODS = {"Electronic check", "Mailed check", "Bank transfer", "Credit card"};
    private static final String[] INTERNET_SERVICES = {"DSL", "Fiber optic", "No"};
    private static final String[] YES_NO = {"Yes", "No"};

    private final Random random;

    public SyntheticDataGenerator(long seed) {
        this.random = new Random(seed);
    }

    public List<Customer> generate(int count) {
        List<Customer> customers = new ArrayList<>(count);
        for (int i = 0; i < count; i++) {
            customers.add(generateOne(i));
        }
        return customers;
    }

    private Customer generateOne(int index) {
        int tenureMonths = 1 + (int) (random.nextDouble() * random.nextDouble() * 71); // skewed toward newer customers
        String contractType = weightedChoice(CONTRACT_TYPES, CONTRACT_WEIGHTS);
        String internetService = INTERNET_SERVICES[random.nextInt(INTERNET_SERVICES.length)];
        String paymentMethod = PAYMENT_METHODS[random.nextInt(PAYMENT_METHODS.length)];
        String paperlessBilling = YES_NO[random.nextInt(2)];
        String multipleLines = YES_NO[random.nextInt(2)];

        String techSupport;
        if (internetService.equals("No")) {
            techSupport = "No internet service";
        } else {
            techSupport = YES_NO[random.nextInt(2)];
        }

        double baseCharge = internetService.equals("Fiber optic") ? 65 : internetService.equals("DSL") ? 45 : 25;
        double monthlyCharges = round2(baseCharge + random.nextDouble() * 40
                + (multipleLines.equals("Yes") ? 12 : 0));
        double totalCharges = round2(monthlyCharges * tenureMonths * (0.9 + random.nextDouble() * 0.2));

        int numSupportCalls = poissonLike(tenureMonths > 0 ? 0.15 + (monthlyCharges / 200.0) : 0.2);
        double avgMonthlyUsageGb = round2(5 + random.nextDouble() * 95);

        // ---- Weighted churn propensity model (used only to LABEL synthetic history) ----
        double churnScore = 0.0;
        churnScore += contractType.equals("Month-to-month") ? 0.35 : contractType.equals("One year") ? 0.10 : 0.02;
        churnScore += Math.max(0, (12 - tenureMonths)) * 0.015;           // new customers churn more
        churnScore += Math.min(numSupportCalls, 10) * 0.045;              // frustration signal
        churnScore += paymentMethod.equals("Electronic check") ? 0.12 : 0.0;
        churnScore += monthlyCharges > 85 ? 0.10 : 0.0;
        churnScore += techSupport.equals("No") ? 0.08 : 0.0;
        churnScore += paperlessBilling.equals("Yes") ? 0.02 : 0.0;
        churnScore -= tenureMonths > 48 ? 0.15 : 0.0;                     // long tenure = loyal
        churnScore += (random.nextDouble() - 0.5) * 0.25;                 // noise so it's not perfectly separable

        double churnProbability = clamp(churnScore, 0.02, 0.97);
        boolean churned = random.nextDouble() < churnProbability;

        String segment = tenureMonths <= 3 ? "New"
                : monthlyCharges >= 80 ? "High Value"
                : monthlyCharges >= 40 ? "Standard"
                : "Budget";

        return Customer.builder()
                .customerCode(String.format("CUST-%06d", index + 1))
                .tenureMonths(tenureMonths)
                .monthlyCharges(monthlyCharges)
                .totalCharges(totalCharges)
                .contractType(contractType)
                .paymentMethod(paymentMethod)
                .internetService(internetService)
                .techSupport(techSupport)
                .numSupportCalls(numSupportCalls)
                .avgMonthlyUsageGb(avgMonthlyUsageGb)
                .paperlessBilling(paperlessBilling)
                .multipleLines(multipleLines)
                .segment(segment)
                .churned(churned ? "Yes" : "No")
                .build();
    }

    private String weightedChoice(String[] options, double[] weights) {
        double r = random.nextDouble();
        double cumulative = 0;
        for (int i = 0; i < options.length; i++) {
            cumulative += weights[i];
            if (r <= cumulative) return options[i];
        }
        return options[options.length - 1];
    }

    private int poissonLike(double lambda) {
        // Cheap approximation good enough for synthetic demo data
        int calls = 0;
        double p = Math.exp(-lambda);
        double cumulative = p;
        double r = random.nextDouble();
        while (cumulative < r && calls < 15) {
            calls++;
            p *= lambda / calls;
            cumulative += p;
        }
        return calls;
    }

    private double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
