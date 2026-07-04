package com.churnprediction.service;

import com.churnprediction.entity.Customer;
import com.churnprediction.repository.CustomerRepository;
import com.churnprediction.util.SyntheticDataGenerator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * On first application startup (empty customers table), generates
 * synthetic historical customer data, persists it to MySQL, then kicks
 * off the initial Random Forest training run so the API is immediately
 * usable end-to-end.
 */
@Slf4j
@Component
public class DataSeedService implements CommandLineRunner {

    private final CustomerRepository customerRepository;
    private final ChurnModelService churnModelService;

    @Value("${app.seed.customer-count}")
    private int seedCount;

    public DataSeedService(CustomerRepository customerRepository, ChurnModelService churnModelService) {
        this.customerRepository = customerRepository;
        this.churnModelService = churnModelService;
    }

    @Override
    public void run(String... args) {
        long existing = customerRepository.count();
        if (existing > 0) {
            log.info("Found {} existing customer records; skipping synthetic seeding.", existing);
            if (!churnModelService.isModelReady()) {
                churnModelService.retrainFromDatabase();
            }
            return;
        }

        log.info("No customer data found. Generating {} synthetic records for demo/training...", seedCount);
        SyntheticDataGenerator generator = new SyntheticDataGenerator(System.currentTimeMillis());
        List<Customer> customers = generator.generate(seedCount);
        customerRepository.saveAll(customers);
        log.info("Seeded {} synthetic customers.", customers.size());

        churnModelService.retrainFromDatabase();
    }
}
