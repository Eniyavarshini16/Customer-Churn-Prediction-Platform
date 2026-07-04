package com.churnprediction.controller;

import com.churnprediction.dto.CustomerDTO;
import com.churnprediction.entity.Customer;
import com.churnprediction.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public Page<Customer> list(
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String segment,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return customerService.list(riskLevel, segment, pageable);
    }

    @GetMapping("/{customerCode}")
    public ResponseEntity<Customer> getByCode(@PathVariable String customerCode) {
        return customerService.findByCode(customerCode)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Customer> create(@Valid @RequestBody CustomerDTO dto) {
        Customer created = customerService.createFromDto(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }
}
