package com.churnprediction.repository;

import com.churnprediction.entity.Customer;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface CustomerRepository extends JpaRepository<Customer, Long> {

    Optional<Customer> findByCustomerCode(String customerCode);

    // Only records with a known outcome are usable for supervised training
    List<Customer> findByChurnedIsNotNull();

    Page<Customer> findByRiskLevel(String riskLevel, Pageable pageable);

    Page<Customer> findBySegment(String segment, Pageable pageable);

    Page<Customer> findByRiskLevelAndSegment(String riskLevel, String segment, Pageable pageable);

    @Query("select c.riskLevel as riskLevel, count(c) as total from Customer c where c.riskLevel is not null group by c.riskLevel")
    List<RiskCount> countByRiskLevel();

    @Query("select c.segment as segment, count(c) as total, avg(c.churnProbability) as avgProbability " +
           "from Customer c where c.segment is not null group by c.segment")
    List<SegmentSummary> summarizeBySegment();

    @Query("select avg(c.churnProbability) from Customer c where c.churnProbability is not null")
    Double averageChurnProbability();

    interface RiskCount {
        String getRiskLevel();
        Long getTotal();
    }

    interface SegmentSummary {
        String getSegment();
        Long getTotal();
        Double getAvgProbability();
    }
}
