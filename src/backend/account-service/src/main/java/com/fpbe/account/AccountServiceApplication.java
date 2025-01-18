package com.fpbe.account;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

/**
 * Main application class for the Account Service microservice.
 * Provides account management capabilities with service discovery integration
 * and high availability support through horizontal scaling.
 *
 * @version 1.0
 * @since 2023-09-21
 */
@SpringBootApplication(scanBasePackages = "com.fpbe.account")
@EnableDiscoveryClient
public class AccountServiceApplication {

    /**
     * Main entry point for the Account Service application.
     * Initializes Spring context and registers with service discovery.
     *
     * @param args Command line arguments passed to the application
     */
    public static void main(String[] args) {
        // Configure application properties for high availability
        System.setProperty("server.shutdown", "graceful"); // Enable graceful shutdown
        System.setProperty("spring.lifecycle.timeout-per-shutdown-phase", "20s"); // Set shutdown timeout
        
        // Set service discovery properties
        System.setProperty("spring.cloud.discovery.enabled", "true");
        System.setProperty("spring.cloud.discovery.registerWithEureka", "true");
        System.setProperty("spring.cloud.discovery.fetchRegistry", "true");
        
        // Configure metrics collection
        System.setProperty("management.endpoints.web.exposure.include", "health,info,metrics,prometheus");
        System.setProperty("management.endpoint.health.show-details", "always");
        
        // Start the Spring application with enhanced error handling
        try {
            SpringApplication application = new SpringApplication(AccountServiceApplication.class);
            
            // Configure application startup behavior
            application.setRegisterShutdownHook(true);
            application.setHeadless(true);
            
            // Start the application context
            application.run(args);
        } catch (Exception e) {
            // Log fatal startup error and exit
            System.err.println("Fatal error during application startup: " + e.getMessage());
            e.printStackTrace();
            System.exit(1);
        }
    }
}