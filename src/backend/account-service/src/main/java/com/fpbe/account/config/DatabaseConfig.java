package com.fpbe.account.config;

import com.fpbe.account.models.Account;
import com.zaxxer.hikari.HikariDataSource;
import jakarta.persistence.EntityManagerFactory;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import javax.sql.DataSource;
import java.util.Properties;

/**
 * Database configuration class for the Account Service microservice.
 * Provides optimized database connection pooling and JPA settings for high-performance operation.
 *
 * @version 1.0
 * @since 2023-09-21
 */
@Configuration
@EnableJpaRepositories(basePackages = "com.fpbe.account.repositories")
public class DatabaseConfig {

    /**
     * Configures and provides the HikariCP datasource with optimized settings for high performance
     * and efficient connection pooling.
     *
     * @return Configured HikariCP datasource
     */
    @Bean
    public DataSource dataSource() {
        HikariDataSource dataSource = new HikariDataSource();
        
        // Core database connection settings
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setJdbcUrl("${spring.datasource.url}");
        dataSource.setUsername("${spring.datasource.username}");
        dataSource.setPassword("${spring.datasource.password}");
        
        // Connection pool settings optimized for high performance
        dataSource.setMinimumIdle(10);                  // Maintain minimum connections ready
        dataSource.setMaximumPoolSize(100);             // Maximum pool size for horizontal scaling
        dataSource.setConnectionTimeout(20000);         // 20 seconds timeout
        dataSource.setIdleTimeout(300000);              // 5 minutes idle timeout
        dataSource.setMaxLifetime(1200000);             // 20 minutes max connection lifetime
        
        // Performance optimization settings
        dataSource.setAutoCommit(false);                // Manual transaction control
        dataSource.setConnectionTestQuery("SELECT 1");  // Lightweight connection test
        dataSource.setLeakDetectionThreshold(60000);    // 1 minute leak detection
        
        // Pool maintenance and monitoring settings
        dataSource.setPoolName("AccountServicePool");
        dataSource.setRegisterMbeans(true);            // Enable JMX monitoring
        dataSource.setAllowPoolSuspension(false);      // Prevent pool suspension
        
        return dataSource;
    }

    /**
     * Configures and provides the JPA EntityManagerFactory with optimized settings
     * for the Account Service's specific requirements.
     *
     * @param dataSource The configured datasource to be used
     * @return Configured LocalContainerEntityManagerFactoryBean
     */
    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean entityManagerFactory = new LocalContainerEntityManagerFactoryBean();
        entityManagerFactory.setDataSource(dataSource);
        entityManagerFactory.setPackagesToScan("com.fpbe.account.models");
        
        // Configure JPA vendor adapter
        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        vendorAdapter.setDatabasePlatform("org.hibernate.dialect.PostgreSQL95Dialect");
        vendorAdapter.setGenerateDdl(false);
        vendorAdapter.setShowSql(false);
        entityManagerFactory.setJpaVendorAdapter(vendorAdapter);
        
        // Set JPA properties for optimization
        Properties jpaProperties = new Properties();
        
        // SQL optimization
        jpaProperties.put("hibernate.jdbc.batch_size", 100);
        jpaProperties.put("hibernate.jdbc.fetch_size", 100);
        jpaProperties.put("hibernate.jdbc.batch_versioned_data", true);
        jpaProperties.put("hibernate.order_inserts", true);
        jpaProperties.put("hibernate.order_updates", true);
        
        // Query optimization
        jpaProperties.put("hibernate.query.fail_on_pagination_over_collection_fetch", true);
        jpaProperties.put("hibernate.query.in_clause_parameter_padding", true);
        jpaProperties.put("hibernate.query.plan_cache_max_size", 2048);
        
        // Second level cache settings
        jpaProperties.put("hibernate.cache.use_second_level_cache", true);
        jpaProperties.put("hibernate.cache.region.factory_class", 
            "org.hibernate.cache.ehcache.EhCacheRegionFactory");
        jpaProperties.put("hibernate.cache.use_query_cache", true);
        
        // Statistics and monitoring
        jpaProperties.put("hibernate.generate_statistics", true);
        jpaProperties.put("hibernate.session.events.log", false);
        
        // Transaction management
        jpaProperties.put("hibernate.transaction.timeout_seconds", 30);
        jpaProperties.put("hibernate.connection.provider_disables_autocommit", true);
        
        // Physical naming strategy
        jpaProperties.put("hibernate.physical_naming_strategy",
            "org.hibernate.boot.model.naming.CamelCaseToUnderscoresNamingStrategy");
        
        entityManagerFactory.setJpaProperties(jpaProperties);
        
        return entityManagerFactory;
    }
}