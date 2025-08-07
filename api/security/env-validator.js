/**
 * Environment variables validator for API security
 * Ensures all required API keys and configurations are properly set
 */

const requiredEnvVars = {
  // Core API Keys
  OPENAI_API_KEY: {
    pattern: /^sk-[a-zA-Z0-9\-_]{32,}$/,
    description: 'OpenAI API key for AI features',
    sensitive: true
  },
  VITE_SUPABASE_URL: {
    pattern: /^https:\/\/[a-zA-Z0-9\-]+\.supabase\.co$/,
    description: 'Supabase project URL',
    sensitive: false
  },
  VITE_SUPABASE_ANON_KEY: {
    pattern: /^[a-zA-Z0-9\-_\.]+$/,
    description: 'Supabase anonymous key',
    sensitive: false
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    pattern: /^[a-zA-Z0-9\-_\.]+$/,
    description: 'Supabase service role key',
    sensitive: true
  }
};

const optionalEnvVars = {
  // Optional API Keys
  OPENFOODFACTS_API_KEY: {
    pattern: /^[a-zA-Z0-9\-_]+$/,
    description: 'OpenFoodFacts API key'
  },
  CLARIFAI_API_KEY: {
    pattern: /^[a-zA-Z0-9]+$/,
    description: 'Clarifai Vision API key'
  },
  GOOGLE_VISION_API_KEY: {
    pattern: /^[a-zA-Z0-9\-_]+$/,
    description: 'Google Vision API key'
  },
  // Security Keys
  JWT_SECRET: {
    pattern: /^.{32,}$/,
    description: 'JWT signing secret (min 32 chars)'
  },
  ENCRYPTION_KEY: {
    pattern: /^.{32,}$/,
    description: 'Data encryption key (min 32 chars)'
  }
};

class EnvValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate all environment variables
   */
  validate() {
    console.log('🔍 Validating environment variables...\n');

    // Check required variables
    for (const [key, config] of Object.entries(requiredEnvVars)) {
      const value = process.env[key];
      
      if (!value) {
        this.errors.push(`❌ Missing required: ${key} - ${config.description}`);
      } else if (!config.pattern.test(value)) {
        this.errors.push(`❌ Invalid format: ${key} - ${config.description}`);
      } else {
        // Don't log sensitive values
        const displayValue = config.sensitive 
          ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
          : value;
        console.log(`✅ ${key}: ${displayValue}`);
      }
    }

    // Check optional variables
    for (const [key, config] of Object.entries(optionalEnvVars)) {
      const value = process.env[key];
      
      if (!value) {
        this.warnings.push(`⚠️  Optional missing: ${key} - ${config.description}`);
      } else if (!config.pattern.test(value)) {
        this.warnings.push(`⚠️  Invalid format: ${key} - ${config.description}`);
      } else {
        console.log(`✅ ${key}: Set`);
      }
    }

    // Additional security checks
    this.performSecurityChecks();

    return this.report();
  }

  /**
   * Perform additional security checks
   */
  performSecurityChecks() {
    // Check for exposed keys in code
    if (process.env.NODE_ENV === 'production') {
      // Ensure no localhost URLs in production
      if (process.env.ALLOWED_ORIGINS?.includes('localhost')) {
        this.warnings.push('⚠️  Localhost origins detected in production ALLOWED_ORIGINS');
      }

      // Ensure HTTPS only
      if (process.env.VITE_SUPABASE_URL && !process.env.VITE_SUPABASE_URL.startsWith('https://')) {
        this.errors.push('❌ Supabase URL must use HTTPS in production');
      }
    }

    // Check key strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
      this.warnings.push('⚠️  JWT_SECRET should be at least 64 characters for better security');
    }

    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 64) {
      this.warnings.push('⚠️  ENCRYPTION_KEY should be at least 64 characters for better security');
    }
  }

  /**
   * Generate validation report
   */
  report() {
    console.log('\n📊 Validation Report:');
    console.log('===================');

    if (this.errors.length === 0) {
      console.log('✅ All required environment variables are properly configured');
    } else {
      console.log(`\n❌ Found ${this.errors.length} critical errors:`);
      this.errors.forEach(error => console.log(error));
    }

    if (this.warnings.length > 0) {
      console.log(`\n⚠️  Found ${this.warnings.length} warnings:`);
      this.warnings.forEach(warning => console.log(warning));
    }

    console.log('\n🔒 Security Recommendations:');
    console.log('- Rotate API keys regularly (every 90 days)');
    console.log('- Use different keys for development and production');
    console.log('- Never commit .env files to version control');
    console.log('- Use secret management services in production');
    console.log('- Enable API key restrictions where possible');

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Generate secure random key
   */
  static generateSecureKey(length = 64) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, length);
  }

  /**
   * Check if running in secure environment
   */
  static isSecureEnvironment() {
    return process.env.NODE_ENV === 'production' 
      && process.env.HTTPS === 'true'
      && !process.env.DEBUG;
  }
}

// Export for use in other modules
module.exports = EnvValidator;

// Run validation if called directly
if (require.main === module) {
  const validator = new EnvValidator();
  const result = validator.validate();
  
  if (!result.valid) {
    console.error('\n❌ Environment validation failed! Please fix the errors above.');
    process.exit(1);
  } else {
    console.log('\n✅ Environment validation passed!');
    
    // Generate example keys if needed
    if (result.warnings.length > 0) {
      console.log('\n🔑 Example secure keys you can use:');
      console.log(`JWT_SECRET=${EnvValidator.generateSecureKey()}`);
      console.log(`ENCRYPTION_KEY=${EnvValidator.generateSecureKey()}`);
    }
  }
}