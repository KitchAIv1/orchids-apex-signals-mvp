/**
 * Security utilities for API routes
 * Provides rate limiting, authentication, and input validation
 */

import { NextRequest, NextResponse } from 'next/server'

// In-memory rate limiter (use Redis in production for distributed systems)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

type RateLimitConfig = {
  maxRequests: number
  windowMs: number
}

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60 * 1000 // 1 minute
}

const STRICT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 60 * 1000 // 5 requests per minute for expensive operations
}

/**
 * Get client IP from request headers
 */
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  if (realIP) {
    return realIP
  }
  return 'unknown'
}

/**
 * Check rate limit for a given key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetIn: entry.resetAt - now 
    }
  }

  entry.count++
  return { 
    allowed: true, 
    remaining: config.maxRequests - entry.count, 
    resetIn: entry.resetAt - now 
  }
}

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT
): NextResponse | null {
  const ip = getClientIP(request)
  const key = `${endpoint}:${ip}`
  const result = checkRateLimit(key, config)

  if (!result.allowed) {
    return NextResponse.json(
      { 
        error: 'Too many requests', 
        retryAfter: Math.ceil(result.resetIn / 1000) 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil(result.resetIn / 1000)),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000))
        }
      }
    )
  }

  return null // Request allowed
}

/**
 * Strict rate limit for expensive operations (AI calls, etc.)
 */
export function withStrictRateLimit(
  request: NextRequest,
  endpoint: string
): NextResponse | null {
  return withRateLimit(request, endpoint, STRICT_RATE_LIMIT)
}

/**
 * Validate API key authentication
 */
export function validateApiAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const apiKey = process.env.INTERNAL_API_KEY
  
  if (!apiKey) {
    // If no API key configured, allow requests (dev mode)
    console.warn('INTERNAL_API_KEY not configured - allowing unauthenticated access')
    return true
  }

  if (!authHeader) {
    return false
  }

  return authHeader === `Bearer ${apiKey}`
}

/**
 * Require API authentication middleware
 */
export function withApiAuth(request: NextRequest): NextResponse | null {
  if (!validateApiAuth(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }
  return null
}

/**
 * Sanitize ticker symbol input
 */
export function sanitizeTicker(ticker: string | null): string | null {
  if (!ticker) return null
  
  // Only allow alphanumeric, dots, and hyphens (for stocks like BRK.A)
  const sanitized = ticker.toUpperCase().replace(/[^A-Z0-9.-]/g, '')
  
  // Max length check
  if (sanitized.length > 10) {
    return null
  }
  
  return sanitized || null
}

/**
 * Validate array of tickers
 */
export function validateTickers(tickers: string): string[] | null {
  const tickerList = tickers.split(',').map(t => sanitizeTicker(t.trim()))
  const valid = tickerList.filter((t): t is string => t !== null)
  
  // Max 20 tickers per request
  if (valid.length > 20) {
    return null
  }
  
  return valid.length > 0 ? valid : null
}

/**
 * Cleanup old rate limit entries (call periodically)
 */
export function cleanupRateLimitStore(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

// Cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimitStore, 5 * 60 * 1000)
}

