package com.churnprediction.service;

import com.churnprediction.dto.CustomerDTO;
import com.churnprediction.dto.TrainResponse;
import com.churnprediction.entity.Customer;
import com.churnprediction.repository.CustomerRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import weka.classifiers.Evaluation;
import weka.classifiers.trees.RandomForest;
import weka.core.Instance;
import weka.core.Instances;
import weka.core.SerializationHelper;

import java.io.File;
import java.util.List;
import java.util.Random;

/**
 * Wraps a Weka RandomForest classifier: builds the training dataset from
 * MySQL-backed Customer records, trains + cross-validates the model,
 * persists it to disk, and serves real-time predictions.
 */
@Slf4j
@Service
public class ChurnModelService {

    private final CustomerRepository customerRepository;
    private final FeatureEngineeringService featureEngineeringService;

    @Value("${app.ml.model-path}")
    private String modelPath;

    @Value("${app.ml.train-on-startup}")
    private boolean trainOnStartup;

    @Value("${app.risk.medium-threshold}")
    private double mediumThreshold;

    @Value("${app.risk.high-threshold}")
    private double highThreshold;

    private RandomForest model;
    private Instances schema;
    private volatile boolean modelReady = false;
    private volatile double lastAccuracy = 0.0;
    private volatile double lastRocAuc = 0.0;

    public ChurnModelService(CustomerRepository customerRepository,
                              FeatureEngineeringService featureEngineeringService) {
        this.customerRepository = customerRepository;
        this.featureEngineeringService = featureEngineeringService;
    }

    @PostConstruct
    public void init() {
        schema = featureEngineeringService.buildSchema("churn_dataset");
        File file = new File(modelPath);
        if (file.exists()) {
            try {
                model = (RandomForest) SerializationHelper.read(modelPath);
                modelReady = true;
                log.info("Loaded existing churn model from {}", modelPath);
            } catch (Exception e) {
                log.warn("Failed to load persisted model, will retrain if configured: {}", e.getMessage());
            }
        }
        if (!modelReady && trainOnStartup) {
            List<Customer> labeled = customerRepository.findByChurnedIsNotNull();
            if (!labeled.isEmpty()) {
                train(labeled);
            } else {
                log.info("No labeled data available yet; model will train once data is seeded.");
            }
        }
    }

    /** Builds an Instances dataset from labeled Customer rows in MySQL. */
    private Instances buildDataset(List<Customer> customers) {
        Instances dataset = featureEngineeringService.buildSchema("churn_dataset");
        for (Customer c : customers) {
            dataset.add(featureEngineeringService.toInstance(c, dataset));
        }
        return dataset;
    }

    /** Trains a fresh RandomForest on all currently labeled customers, evaluates via 10-fold CV, and persists it. */
    public synchronized TrainResponse train(List<Customer> labeledCustomers) {
        Instances dataset = buildDataset(labeledCustomers);

        RandomForest forest = new RandomForest();
        forest.setNumIterations(150);   // number of trees
        forest.setMaxDepth(0);          // 0 = unlimited
        forest.setSeed(42);

        TrainResponse.TrainResponseBuilder responseBuilder = TrainResponse.builder()
                .trainingRecords(dataset.numInstances());

        try {
            Evaluation eval = new Evaluation(dataset);
            eval.crossValidateModel(forest, dataset, 10, new Random(42));

            // Fit the final model on the full dataset for serving predictions
            forest.buildClassifier(dataset);

            this.model = forest;
            this.schema = dataset;
            this.modelReady = true;
            SerializationHelper.write(modelPath, forest);

            int yesIndex = dataset.classAttribute().indexOfValue("Yes");

            this.lastAccuracy = eval.pctCorrect() / 100.0;
            this.lastRocAuc = safe(eval.areaUnderROC(yesIndex));

            responseBuilder
                    .accuracy(lastAccuracy)
                    .precision(safe(eval.precision(yesIndex)))
                    .recall(safe(eval.recall(yesIndex)))
                    .f1Score(safe(eval.fMeasure(yesIndex)))
                    .rocAuc(lastRocAuc)
                    .message("Model trained and persisted to " + modelPath);

            log.info("Trained RandomForest on {} records. Accuracy={}, ROC AUC={}",
                    dataset.numInstances(), eval.pctCorrect(), eval.areaUnderROC(yesIndex));

        } catch (Exception e) {
            log.error("Training failed", e);
            responseBuilder.message("Training failed: " + e.getMessage());
        }

        return responseBuilder.build();
    }

    /** Convenience overload: pulls all labeled customers from the DB and retrains. */
    public TrainResponse retrainFromDatabase() {
        return train(customerRepository.findByChurnedIsNotNull());
    }

    /** Runs a real-time prediction for a single customer and returns churn probability [0,1]. */
    public double predictChurnProbability(CustomerDTO dto) throws Exception {
        if (!modelReady || model == null) {
            throw new IllegalStateException("Model is not trained yet. Call POST /api/model/train first.");
        }
        Instance instance = featureEngineeringService.toInstance(dto, schema);
        double[] distribution = model.distributionForInstance(instance);
        int yesIndex = schema.classAttribute().indexOfValue("Yes");
        return distribution[yesIndex];
    }

    public String classifyRisk(double churnProbability) {
        if (churnProbability >= highThreshold) return "High";
        if (churnProbability >= mediumThreshold) return "Medium";
        return "Low";
    }

    public boolean isModelReady() {
        return modelReady;
    }

    public double getLastAccuracy() {
        return lastAccuracy;
    }

    public double getLastRocAuc() {
        return lastRocAuc;
    }

    private double safe(double value) {
        return Double.isNaN(value) ? 0.0 : value;
    }
}
