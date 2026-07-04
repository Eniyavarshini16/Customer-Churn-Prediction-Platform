package com.churnprediction.service;

import com.churnprediction.dto.CustomerDTO;
import com.churnprediction.entity.Customer;
import org.springframework.stereotype.Service;
import weka.core.Attribute;
import weka.core.DenseInstance;
import weka.core.Instance;
import weka.core.Instances;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Owns the feature schema shared by training and inference. Keeping this
 * in one place guarantees that a live prediction request is encoded
 * exactly the same way the historical training data was encoded.
 *
 * Preprocessing / feature engineering performed here:
 *  - Cleans nulls (defaults totalCharges from tenure * monthlyCharges if missing)
 *  - Derives an "average revenue per month" feature
 *  - Derives a "support call rate" feature (calls per tenure month)
 *  - Encodes categorical fields as nominal Weka attributes
 *  - Assembles the final Weka Instances / Instance objects
 */
@Service
public class FeatureEngineeringService {

    public static final String CLASS_ATTR = "churned";

    private static final List<String> CONTRACT_TYPES = Arrays.asList("Month-to-month", "One year", "Two year");
    private static final List<String> PAYMENT_METHODS = Arrays.asList("Electronic check", "Mailed check", "Bank transfer", "Credit card");
    private static final List<String> INTERNET_SERVICES = Arrays.asList("DSL", "Fiber optic", "No");
    private static final List<String> YES_NO = Arrays.asList("Yes", "No");
    private static final List<String> TECH_SUPPORT = Arrays.asList("Yes", "No", "No internet service");
    private static final List<String> CLASS_VALUES = Arrays.asList("No", "Yes");

    /** Builds the (empty) Weka schema used consistently for training and prediction. */
    public Instances buildSchema(String relationName) {
        ArrayList<Attribute> attributes = new ArrayList<>();

        attributes.add(new Attribute("tenureMonths"));
        attributes.add(new Attribute("monthlyCharges"));
        attributes.add(new Attribute("totalCharges"));
        attributes.add(new Attribute("avgRevenuePerMonth"));
        attributes.add(new Attribute("numSupportCalls"));
        attributes.add(new Attribute("supportCallRate"));
        attributes.add(new Attribute("avgMonthlyUsageGb"));

        attributes.add(new Attribute("contractType", CONTRACT_TYPES));
        attributes.add(new Attribute("paymentMethod", PAYMENT_METHODS));
        attributes.add(new Attribute("internetService", INTERNET_SERVICES));
        attributes.add(new Attribute("techSupport", TECH_SUPPORT));
        attributes.add(new Attribute("paperlessBilling", YES_NO));
        attributes.add(new Attribute("multipleLines", YES_NO));

        // Class attribute must be last
        attributes.add(new Attribute(CLASS_ATTR, CLASS_VALUES));

        Instances dataset = new Instances(relationName, attributes, 0);
        dataset.setClassIndex(attributes.size() - 1);
        return dataset;
    }

    /** Converts a persisted, labeled Customer into a training Instance. */
    public Instance toInstance(Customer c, Instances schema) {
        double[] values = toFeatureArray(
                c.getTenureMonths(), c.getMonthlyCharges(), c.getTotalCharges(),
                c.getNumSupportCalls(), c.getAvgMonthlyUsageGb(),
                c.getContractType(), c.getPaymentMethod(), c.getInternetService(),
                c.getTechSupport(), c.getPaperlessBilling(), c.getMultipleLines(),
                schema
        );

        Instance instance = new DenseInstance(1.0, values);
        instance.setDataset(schema);
        if (c.getChurned() != null) {
            instance.setClassValue(c.getChurned());
        } else {
            instance.setClassMissing();
        }
        return instance;
    }

    /** Converts an incoming, unlabeled prediction request into an Instance. */
    public Instance toInstance(CustomerDTO dto, Instances schema) {
        double totalCharges = dto.getTotalCharges() != null
                ? dto.getTotalCharges()
                : dto.getTenureMonths() * dto.getMonthlyCharges();

        double[] values = toFeatureArray(
                dto.getTenureMonths(), dto.getMonthlyCharges(), totalCharges,
                dto.getNumSupportCalls(), dto.getAvgMonthlyUsageGb(),
                dto.getContractType(), dto.getPaymentMethod(), dto.getInternetService(),
                dto.getTechSupport(), dto.getPaperlessBilling(), dto.getMultipleLines(),
                schema
        );

        Instance instance = new DenseInstance(1.0, values);
        instance.setDataset(schema);
        instance.setClassMissing();
        return instance;
    }

    private double[] toFeatureArray(int tenureMonths, double monthlyCharges, double totalChargesRaw,
                                     int numSupportCalls, double avgMonthlyUsageGb,
                                     String contractType, String paymentMethod, String internetService,
                                     String techSupport, String paperlessBilling, String multipleLines,
                                     Instances schema) {

        double totalCharges = totalChargesRaw > 0 ? totalChargesRaw : tenureMonths * monthlyCharges;
        double avgRevenuePerMonth = tenureMonths > 0 ? totalCharges / tenureMonths : monthlyCharges;
        double supportCallRate = tenureMonths > 0 ? (double) numSupportCalls / tenureMonths : numSupportCalls;

        double[] values = new double[schema.numAttributes()];
        values[0] = tenureMonths;
        values[1] = monthlyCharges;
        values[2] = totalCharges;
        values[3] = avgRevenuePerMonth;
        values[4] = numSupportCalls;
        values[5] = supportCallRate;
        values[6] = avgMonthlyUsageGb;

        values[7] = indexOrUnknown(schema.attribute(7), contractType);
        values[8] = indexOrUnknown(schema.attribute(8), paymentMethod);
        values[9] = indexOrUnknown(schema.attribute(9), internetService);
        values[10] = indexOrUnknown(schema.attribute(10), techSupport);
        values[11] = indexOrUnknown(schema.attribute(11), paperlessBilling);
        values[12] = indexOrUnknown(schema.attribute(12), multipleLines);
        // index 13 (class) left as 0; caller sets class value/missing explicitly
        return values;
    }

    private double indexOrUnknown(Attribute attribute, String value) {
        int idx = attribute.indexOfValue(value);
        // Fall back to the first category rather than throwing on unexpected input
        return idx >= 0 ? idx : 0;
    }

    /** Simple, explainable customer segmentation used for dashboard grouping (not fed into the model). */
    public String deriveSegment(int tenureMonths, double monthlyCharges) {
        if (tenureMonths <= 3) return "New";
        if (monthlyCharges >= 80) return "High Value";
        if (monthlyCharges >= 40) return "Standard";
        return "Budget";
    }
}
