package com.fpbe.transaction;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.core.task.AsyncTaskExecutor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.concurrent.Executor;

/**
 * Main application class for the FPBE Transaction Service microservice.
 * Provides high-performance transaction processing with event sourcing capabilities.
 * Implements service discovery for dynamic scaling and async processing for optimal performance.
 * 
 * @version 1.0
 * @since 2023-06-15
 */
@SpringBootApplication(scanBasePackages = "com.fpbe.transaction")
@EnableDiscoveryClient
@EnableAsync(proxyTargetClass = true)
public class TransactionServiceApplication {

    private static final Logger logger = LoggerFactory.getLogger(TransactionServiceApplication.class);
    private static final int CORE_POOL_SIZE = 8;
    private static final int MAX_POOL_SIZE = 32;
    private static final int QUEUE_CAPACITY = 100;
    private static final String THREAD_NAME_PREFIX = "TransactionAsync-";

    /**
     * Application entry point with enhanced error handling and startup configuration.
     * 
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        try {
            SpringApplication app = new SpringApplication(TransactionServiceApplication.class);
            app.run(args);
            logger.info("Transaction Service started successfully");
        } catch (Exception e) {
            logger.error("Failed to start Transaction Service", e);
            System.exit(1);
        }
    }

    /**
     * Configures the async executor for optimal performance in transaction processing.
     * Implements thread pool with configured boundaries for resource management.
     * 
     * @return Configured AsyncTaskExecutor for handling async operations
     */
    @Bean(name = "taskExecutor")
    public AsyncTaskExecutor taskExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(CORE_POOL_SIZE);
        executor.setMaxPoolSize(MAX_POOL_SIZE);
        executor.setQueueCapacity(QUEUE_CAPACITY);
        executor.setThreadNamePrefix(THREAD_NAME_PREFIX);
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(60);
        executor.initialize();
        return executor;
    }

    /**
     * Handles application startup events and performs necessary initialization.
     * Validates critical configurations and logs system readiness.
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        logger.info("Transaction Service is ready to process transactions");
        logger.info("Async processing configured with core pool size: {}, max pool size: {}", 
            CORE_POOL_SIZE, MAX_POOL_SIZE);
        validateSystemRequirements();
    }

    /**
     * Validates system requirements and configurations on startup.
     * Ensures all necessary components are properly initialized.
     */
    private void validateSystemRequirements() {
        try {
            // Validate critical system requirements
            Runtime runtime = Runtime.getRuntime();
            long maxMemory = runtime.maxMemory() / (1024 * 1024);
            logger.info("Maximum memory available: {} MB", maxMemory);
            
            if (maxMemory < 512) {
                logger.warn("Available memory might be insufficient for optimal performance");
            }

            // Log processor availability
            int processors = runtime.availableProcessors();
            logger.info("Available processors: {}", processors);
            
            if (processors < 4) {
                logger.warn("Number of available processors might limit performance");
            }
        } catch (Exception e) {
            logger.error("Error validating system requirements", e);
        }
    }
}