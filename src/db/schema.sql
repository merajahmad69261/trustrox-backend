-- Database Schema for TrustRox Store Rating System

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(60) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `address` VARCHAR(400) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin', 'user', 'owner') NOT NULL DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stores` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(60) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `address` VARCHAR(400) NOT NULL,
  `owner_id` INT NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_stores_owner` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_stores_name` (`name`),
  INDEX `idx_stores_email` (`email`),
  INDEX `idx_stores_owner` (`owner_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `ratings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `store_id` INT NOT NULL,
  `rating` TINYINT NOT NULL CHECK (`rating` >= 1 AND `rating` <= 5),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ratings_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ratings_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `unique_user_store` (`user_id`, `store_id`),
  INDEX `idx_ratings_store` (`store_id`),
  INDEX `idx_ratings_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
