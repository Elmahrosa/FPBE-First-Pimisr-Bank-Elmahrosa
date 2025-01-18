package com.fpbe.transaction.config;

import com.fpbe.transaction.models.Transaction;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;

import java.util.HashMap;
import java.util.Map;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.springframework.kafka.support.serializer.JsonSerializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;

/**
 * Configuration class for Apache Kafka messaging setup in the Transaction Service.
 * Provides reliable event sourcing and asynchronous transaction processing capabilities.
 */
@Configuration
@EnableKafka
public class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.topic.transaction}")
    private String transactionTopic;

    @Value("${spring.kafka.topic.audit}")
    private String auditTopic;

    @Value("${spring.kafka.security.protocol:SASL_SSL}")
    private String securityProtocol;

    @Value("${spring.kafka.security.sasl.mechanism:PLAIN}")
    private String saslMechanism;

    @Value("${spring.kafka.security.sasl.jaas.config}")
    private String saslJaasConfig;

    @Value("${spring.kafka.producer.batch-size:16384}")
    private Integer batchSize;

    @Value("${spring.kafka.producer.compression.type:snappy}")
    private String compressionType;

    @Value("${spring.kafka.producer.retries:3}")
    private Integer retries;

    @Value("${spring.kafka.producer.request.timeout.ms:30000}")
    private Integer requestTimeoutMs;

    /**
     * Creates and configures the Kafka producer factory with reliability settings.
     */
    @Bean
    public ProducerFactory<String, Transaction> producerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        
        // Basic configuration
        configProps.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        configProps.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, JsonSerializer.class);
        
        // Security configuration
        configProps.put("security.protocol", securityProtocol);
        configProps.put("sasl.mechanism", saslMechanism);
        configProps.put("sasl.jaas.config", saslJaasConfig);
        
        // Reliability configuration
        configProps.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        configProps.put(ProducerConfig.ACKS_CONFIG, "all");
        configProps.put(ProducerConfig.RETRIES_CONFIG, retries);
        configProps.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1);
        
        // Performance configuration
        configProps.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, compressionType);
        configProps.put(ProducerConfig.BATCH_SIZE_CONFIG, batchSize);
        configProps.put(ProducerConfig.LINGER_MS_CONFIG, 5);
        configProps.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, requestTimeoutMs);
        
        // Monitoring configuration
        configProps.put(ProducerConfig.METRIC_REPORTER_CLASSES_CONFIG, 
            "io.confluent.metrics.reporter.ConfluentMetricsReporter");
        
        return new DefaultKafkaProducerFactory<>(configProps);
    }

    /**
     * Creates and configures the KafkaTemplate for transaction message production.
     */
    @Bean
    public KafkaTemplate<String, Transaction> kafkaTemplate(
            ProducerFactory<String, Transaction> producerFactory) {
        KafkaTemplate<String, Transaction> template = new KafkaTemplate<>(producerFactory);
        template.setDefaultTopic(transactionTopic);
        return template;
    }

    /**
     * Creates and configures the Kafka consumer factory with reliability settings.
     */
    @Bean
    public ConsumerFactory<String, Transaction> consumerFactory() {
        Map<String, Object> configProps = new HashMap<>();
        
        // Basic configuration
        configProps.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        configProps.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        configProps.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, JsonDeserializer.class);
        configProps.put(ConsumerConfig.GROUP_ID_CONFIG, "transaction-service-group");
        
        // Security configuration
        configProps.put("security.protocol", securityProtocol);
        configProps.put("sasl.mechanism", saslMechanism);
        configProps.put("sasl.jaas.config", saslJaasConfig);
        
        // Reliability configuration
        configProps.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");
        configProps.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        configProps.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");
        
        // Performance configuration
        configProps.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);
        configProps.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000);
        configProps.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 10000);
        configProps.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 3000);
        
        // Error handling configuration
        configProps.put(ConsumerConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, 60000);
        
        // Type mapping for Transaction class
        configProps.put(JsonDeserializer.TRUSTED_PACKAGES, "com.fpbe.transaction.models");
        configProps.put(JsonDeserializer.VALUE_DEFAULT_TYPE, Transaction.class.getName());
        
        return new DefaultKafkaConsumerFactory<>(configProps);
    }
}