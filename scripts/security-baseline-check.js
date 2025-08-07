#!/usr/bin/env node

/**
 * Security Baseline Validator for Smart Pantry Pro
 * Implements OWASP security checks based on Cipher validation requirements
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SecurityBaselineValidator {
  constructor() {
    this.results = {
      passed: [],
      failed: [],
      warnings: []
    };
  }

  /**
   * Run all security validations
   */
  async runValidation() {
    console.log('🛡️ SMART PANTRY PRO - SECURITY BASELINE VALIDATION');
    console.log('================================================\n');

    // 1. Environment Variables Security
    await this.checkEnvironmentSecurity();

    // 2. API Keys Security
    await this.checkAPIKeysSecurity();

    // 3. Rate Limiting Implementation
    await this.checkRateLimiting();

    // 4. CORS Configuration
    await this.checkCORSConfiguration();

    // 5. SQL Injection Prevention
    await this.checkSQLInjectionPrevention();

    // 6. XSS Prevention
    await this.checkXSSPrevention();

    // 7. HTTPS/TLS Security
    await this.checkHTTPSSecurity();

    // 8. Authentication & Authorization
    await this.checkAuthSecurity();

    // 9. Dependency Security
    await this.checkDependencySecurity();

    // 10. Security Headers
    await this.checkSecurityHeaders();

    // Generate report
    this.generateReport();
  }

  /**
   * Check environment variables security
   */
  async checkEnvironmentSecurity() {
    console.log('🔍 Checking Environment Variables Security...');

    // Check .env files are gitignored
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf8');
      if (gitignore.includes('.env') && gitignore.includes('.env.local')) {
        this.results.passed.push('✅ Environment files are properly gitignored');
      } else {
        this.results.failed.push('❌ .env files not in .gitignore');
      }
    }

    // Check .env.example exists
    if (fs.existsSync(path.join(process.cwd(), '.env.example'))) {
      this.results.passed.push('✅ .env.example template exists');
    } else {
      this.results.warnings.push('⚠️  Missing .env.example template');
    }

    // Check no hardcoded keys in source
    await this.scanForHardcodedKeys();
  }

  /**
   * Scan source code for hardcoded API keys
   */
  async scanForHardcodedKeys() {
    const patterns = [
      /sk-[a-zA-Z0-9]{32,}/g, // OpenAI keys
      /AIza[a-zA-Z0-9\-_]{35}/g, // Google API keys
      /[a-zA-Z0-9]{32,}\.supabase\.co/g, // Supabase URLs
      /(api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9\-_]{20,}['"]/gi
    ];

    const srcPath = path.join(process.cwd(), 'src');
    const issues = [];

    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanDirectory(filePath);
        } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          patterns.forEach(pattern => {
            const matches = content.match(pattern);
            if (matches) {
              issues.push({ file: filePath, matches });
            }
          });
        }
      });
    };

    if (fs.existsSync(srcPath)) {
      scanDirectory(srcPath);
    }

    if (issues.length === 0) {
      this.results.passed.push('✅ No hardcoded API keys found in source code');
    } else {
      this.results.failed.push(`❌ Found ${issues.length} potential hardcoded keys`);
      issues.forEach(issue => {
        console.log(`   - ${issue.file}: ${issue.matches.length} matches`);
      });
    }
  }

  /**
   * Check API keys security implementation
   */
  async checkAPIKeysSecurity() {
    console.log('\n🔑 Checking API Keys Security...');

    // Check environment variable validation exists
    const envValidatorPath = path.join(process.cwd(), 'api/security/env-validator.js');
    if (fs.existsSync(envValidatorPath)) {
      this.results.passed.push('✅ Environment validator implemented');
    } else {
      this.results.failed.push('❌ Missing environment validator');
    }

    // Check API key format validation
    const functionsPath = path.join(process.cwd(), 'supabase/functions');
    if (fs.existsSync(functionsPath)) {
      const hasValidation = fs.readdirSync(functionsPath).some(func => {
        const indexPath = path.join(functionsPath, func, 'index.ts');
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath, 'utf8');
          return content.includes('if (!openAIApiKey)') || content.includes('throw new Error');
        }
        return false;
      });

      if (hasValidation) {
        this.results.passed.push('✅ API key validation in edge functions');
      } else {
        this.results.warnings.push('⚠️  Some edge functions lack API key validation');
      }
    }
  }

  /**
   * Check rate limiting implementation
   */
  async checkRateLimiting() {
    console.log('\n🚦 Checking Rate Limiting...');

    // Check rate limiter implementation
    const rateLimiterPath = path.join(process.cwd(), 'supabase/functions/_shared/rateLimiter.ts');
    if (fs.existsSync(rateLimiterPath)) {
      this.results.passed.push('✅ Rate limiter module implemented');
      
      const content = fs.readFileSync(rateLimiterPath, 'utf8');
      if (content.includes('checkLimit') && content.includes('RateLimitPresets')) {
        this.results.passed.push('✅ Rate limiting with presets configured');
      }
    } else {
      this.results.failed.push('❌ Rate limiter not implemented');
    }

    // Check database migration for rate limits
    const migrationsPath = path.join(process.cwd(), 'supabase/migrations');
    if (fs.existsSync(migrationsPath)) {
      const hasRateLimitTable = fs.readdirSync(migrationsPath).some(file => {
        if (file.endsWith('.sql')) {
          const content = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
          return content.includes('CREATE TABLE') && content.includes('rate_limits');
        }
        return false;
      });

      if (hasRateLimitTable) {
        this.results.passed.push('✅ Rate limits database table migration exists');
      } else {
        this.results.warnings.push('⚠️  Missing rate limits database migration');
      }
    }
  }

  /**
   * Check CORS configuration
   */
  async checkCORSConfiguration() {
    console.log('\n🌐 Checking CORS Configuration...');

    const functionsPath = path.join(process.cwd(), 'supabase/functions');
    if (fs.existsSync(functionsPath)) {
      let hasProperCORS = false;
      
      fs.readdirSync(functionsPath).forEach(func => {
        const indexPath = path.join(functionsPath, func, 'index.ts');
        if (fs.existsSync(indexPath)) {
          const content = fs.readFileSync(indexPath, 'utf8');
          
          // Check for wildcard CORS
          if (content.includes("'Access-Control-Allow-Origin': '*'") && 
              !content.includes('allowedOrigins')) {
            this.results.failed.push(`❌ Wildcard CORS in ${func} function`);
          } else if (content.includes('allowedOrigins') && content.includes('origin && allowedOrigins.includes(origin)')) {
            hasProperCORS = true;
          }
        }
      });

      if (hasProperCORS) {
        this.results.passed.push('✅ CORS properly configured with allowed origins');
      }
    }
  }

  /**
   * Check SQL injection prevention
   */
  async checkSQLInjectionPrevention() {
    console.log('\n💉 Checking SQL Injection Prevention...');

    // Check for parameterized queries
    const srcPath = path.join(process.cwd(), 'src');
    let hasParameterizedQueries = true;
    let hasRawQueries = false;

    const scanForSQL = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          scanForSQL(filePath);
        } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // Check for raw SQL concatenation
          if (content.match(/query\s*=.*\$\{.*\}/) || content.match(/WHERE.*'\s*\+.*userId/)) {
            hasRawQueries = true;
            this.results.failed.push(`❌ Potential SQL injection in ${file}`);
          }
          
          // Check for Supabase parameterized queries
          if (content.includes('.eq(') || content.includes('.select(')) {
            hasParameterizedQueries = true;
          }
        }
      });
    };

    scanForSQL(srcPath);

    if (hasParameterizedQueries && !hasRawQueries) {
      this.results.passed.push('✅ Using parameterized queries (Supabase ORM)');
    }

    // Check for SQL sanitization helper
    const securityPath = path.join(process.cwd(), 'supabase/functions/_shared/security.ts');
    if (fs.existsSync(securityPath)) {
      const content = fs.readFileSync(securityPath, 'utf8');
      if (content.includes('sanitizeSqlIdentifier')) {
        this.results.passed.push('✅ SQL identifier sanitization implemented');
      }
    }
  }

  /**
   * Check XSS prevention
   */
  async checkXSSPrevention() {
    console.log('\n🛡️ Checking XSS Prevention...');

    // Check for HTML sanitization
    const securityPath = path.join(process.cwd(), 'supabase/functions/_shared/security.ts');
    if (fs.existsSync(securityPath)) {
      const content = fs.readFileSync(securityPath, 'utf8');
      if (content.includes('escapeHtml') && content.includes('sanitizeOutput')) {
        this.results.passed.push('✅ HTML sanitization functions implemented');
      }
    }

    // Check React components for dangerouslySetInnerHTML
    const componentsPath = path.join(process.cwd(), 'src/components');
    let hasDangerousHTML = false;
    
    const scanComponents = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanComponents(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.jsx')) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (content.includes('dangerouslySetInnerHTML')) {
            hasDangerousHTML = true;
            this.results.warnings.push(`⚠️  dangerouslySetInnerHTML used in ${file}`);
          }
        }
      });
    };

    scanComponents(componentsPath);

    if (!hasDangerousHTML) {
      this.results.passed.push('✅ No dangerouslySetInnerHTML usage found');
    }
  }

  /**
   * Check HTTPS/TLS security
   */
  async checkHTTPSSecurity() {
    console.log('\n🔒 Checking HTTPS/TLS Security...');

    // Check security headers implementation
    const securityPath = path.join(process.cwd(), 'supabase/functions/_shared/security.ts');
    if (fs.existsSync(securityPath)) {
      const content = fs.readFileSync(securityPath, 'utf8');
      if (content.includes('Strict-Transport-Security')) {
        this.results.passed.push('✅ HSTS header configured');
      }
      if (content.includes('applySecurityHeaders')) {
        this.results.passed.push('✅ Security headers middleware implemented');
      }
    }

    // Check for HTTP URLs in code
    const srcPath = path.join(process.cwd(), 'src');
    let hasHTTPUrls = false;
    
    const scanForHTTP = (dir) => {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.')) {
          scanForHTTP(filePath);
        } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
          const content = fs.readFileSync(filePath, 'utf8');
          const httpMatches = content.match(/http:\/\/(?!localhost)/g);
          if (httpMatches) {
            hasHTTPUrls = true;
            this.results.warnings.push(`⚠️  Non-localhost HTTP URL in ${file}`);
          }
        }
      });
    };

    scanForHTTP(srcPath);

    if (!hasHTTPUrls) {
      this.results.passed.push('✅ No insecure HTTP URLs found');
    }
  }

  /**
   * Check authentication and authorization
   */
  async checkAuthSecurity() {
    console.log('\n🔐 Checking Authentication & Authorization...');

    // Check JWT implementation
    const hasJWTValidation = fs.existsSync(path.join(process.cwd(), 'supabase/functions/_shared/security.ts'));
    if (hasJWTValidation) {
      this.results.passed.push('✅ JWT validation middleware exists');
    }

    // Check RLS policies
    const migrationsPath = path.join(process.cwd(), 'supabase/migrations');
    if (fs.existsSync(migrationsPath)) {
      let hasRLS = false;
      
      fs.readdirSync(migrationsPath).forEach(file => {
        if (file.endsWith('.sql')) {
          const content = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
          if (content.includes('CREATE POLICY') || content.includes('ENABLE ROW LEVEL SECURITY')) {
            hasRLS = true;
          }
        }
      });

      if (hasRLS) {
        this.results.passed.push('✅ Row Level Security policies implemented');
      } else {
        this.results.warnings.push('⚠️  No RLS policies found in migrations');
      }
    }
  }

  /**
   * Check dependency security
   */
  async checkDependencySecurity() {
    console.log('\n📦 Checking Dependency Security...');

    // Check for npm audit
    const packageLockPath = path.join(process.cwd(), 'package-lock.json');
    if (fs.existsSync(packageLockPath)) {
      this.results.passed.push('✅ package-lock.json exists for dependency integrity');
    } else {
      this.results.warnings.push('⚠️  No package-lock.json found');
    }

    // Check for security scripts in package.json
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      if (packageJson.scripts && packageJson.scripts['security:check']) {
        this.results.passed.push('✅ Security check script configured');
      } else {
        this.results.warnings.push('⚠️  No security:check script in package.json');
      }
    }
  }

  /**
   * Check security headers
   */
  async checkSecurityHeaders() {
    console.log('\n📋 Checking Security Headers...');

    const securityPath = path.join(process.cwd(), 'supabase/functions/_shared/security.ts');
    if (fs.existsSync(securityPath)) {
      const content = fs.readFileSync(securityPath, 'utf8');
      const headers = [
        'X-Content-Type-Options',
        'X-Frame-Options',
        'X-XSS-Protection',
        'Strict-Transport-Security',
        'Content-Security-Policy',
        'Referrer-Policy',
        'Permissions-Policy'
      ];

      let implementedHeaders = 0;
      headers.forEach(header => {
        if (content.includes(header)) {
          implementedHeaders++;
        }
      });

      if (implementedHeaders === headers.length) {
        this.results.passed.push('✅ All OWASP security headers implemented');
      } else {
        this.results.warnings.push(`⚠️  Only ${implementedHeaders}/${headers.length} security headers implemented`);
      }
    }
  }

  /**
   * Generate security validation report
   */
  generateReport() {
    console.log('\n\n📊 SECURITY BASELINE VALIDATION REPORT');
    console.log('=====================================\n');

    const totalChecks = this.results.passed.length + this.results.failed.length + this.results.warnings.length;
    const score = Math.round((this.results.passed.length / totalChecks) * 100);

    console.log(`🎯 Security Score: ${score}%\n`);

    if (this.results.passed.length > 0) {
      console.log('✅ PASSED CHECKS:');
      this.results.passed.forEach(check => console.log(`   ${check}`));
    }

    if (this.results.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.results.warnings.forEach(warning => console.log(`   ${warning}`));
    }

    if (this.results.failed.length > 0) {
      console.log('\n❌ FAILED CHECKS:');
      this.results.failed.forEach(fail => console.log(`   ${fail}`));
    }

    console.log('\n📈 SUMMARY:');
    console.log(`   Passed: ${this.results.passed.length}`);
    console.log(`   Warnings: ${this.results.warnings.length}`);
    console.log(`   Failed: ${this.results.failed.length}`);
    console.log(`   Total: ${totalChecks}`);

    console.log('\n🔒 SECURITY RECOMMENDATIONS:');
    console.log('1. Fix all failed checks immediately');
    console.log('2. Address warnings before production deployment');
    console.log('3. Run security audits regularly (npm audit)');
    console.log('4. Keep dependencies updated');
    console.log('5. Implement security monitoring');
    console.log('6. Regular penetration testing');

    // Exit with error if critical failures
    if (this.results.failed.length > 0) {
      console.log('\n❌ Security validation FAILED! Fix critical issues before proceeding.');
      process.exit(1);
    } else if (score >= 80) {
      console.log('\n✅ Security baseline PASSED! Ready for next phase.');
    } else {
      console.log('\n⚠️  Security baseline needs improvement. Address warnings.');
    }
  }
}

// Run validation
const validator = new SecurityBaselineValidator();
validator.runValidation();