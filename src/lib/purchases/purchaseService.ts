/**
 * Cross-Platform Purchase Service
 * Handles subscriptions via RevenueCat (iOS/Android) and Stripe (Web)
 */

// Types for cross-platform subscription handling
export type Platform = 'web' | 'ios' | 'android'
export type SubscriptionTier = 'free' | 'pro' | 'premium'

export interface PurchaseResult {
  success: boolean
  tier: SubscriptionTier
  error?: string
}

export interface SubscriptionStatus {
  tier: SubscriptionTier
  isActive: boolean
  expiresAt?: Date
  platform: Platform
  willRenew: boolean
}

// RevenueCat Product IDs (configure these in RevenueCat dashboard)
export const REVENUECAT_PRODUCTS = {
  pro: {
    monthly: 'com.lifeorganizer.pro.monthly',
    yearly: 'com.lifeorganizer.pro.yearly',
  },
  premium: {
    monthly: 'com.lifeorganizer.premium.monthly',
    yearly: 'com.lifeorganizer.premium.yearly',
  },
}

// RevenueCat Entitlement IDs
export const ENTITLEMENTS = {
  pro: 'pro_access',
  premium: 'premium_access',
}

/**
 * Detect current platform
 */
export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'web'

  // Check for Capacitor
  const isCapacitor = !!(window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()

  if (!isCapacitor) return 'web'

  // Detect iOS vs Android
  const userAgent = navigator.userAgent.toLowerCase()
  if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'ios'
  }
  if (userAgent.includes('android')) {
    return 'android'
  }

  return 'web'
}

/**
 * Initialize purchases based on platform
 * Call this on app startup
 */
export async function initializePurchases(userId: string): Promise<void> {
  const platform = detectPlatform()

  if (platform === 'web') {
    // Web uses Stripe - no initialization needed
    console.log('Web platform detected - using Stripe for payments')
    return
  }

  // Native platform - initialize RevenueCat
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')

    const apiKey = platform === 'ios'
      ? process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY
      : process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY

    if (!apiKey) {
      console.error('RevenueCat API key not configured for platform:', platform)
      return
    }

    await Purchases.configure({
      apiKey,
      appUserID: userId,
    })

    console.log('RevenueCat initialized for platform:', platform)
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error)
  }
}

/**
 * Get available packages/products for purchase
 */
export async function getOfferings(): Promise<{
  pro: { monthly: unknown; yearly: unknown } | null
  premium: { monthly: unknown; yearly: unknown } | null
} | null> {
  const platform = detectPlatform()

  if (platform === 'web') {
    // Return Stripe pricing for web
    return null // Web uses different UI
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const offerings = await Purchases.getOfferings()

    if (!offerings.current) {
      return null
    }

    return {
      pro: offerings.current.availablePackages.find(p => p.identifier.includes('pro'))
        ? {
            monthly: offerings.current.availablePackages.find(p => p.identifier === '$rc_monthly' && p.product.identifier.includes('pro')),
            yearly: offerings.current.availablePackages.find(p => p.identifier === '$rc_annual' && p.product.identifier.includes('pro')),
          }
        : null,
      premium: offerings.current.availablePackages.find(p => p.identifier.includes('premium'))
        ? {
            monthly: offerings.current.availablePackages.find(p => p.identifier === '$rc_monthly' && p.product.identifier.includes('premium')),
            yearly: offerings.current.availablePackages.find(p => p.identifier === '$rc_annual' && p.product.identifier.includes('premium')),
          }
        : null,
    }
  } catch (error) {
    console.error('Failed to get offerings:', error)
    return null
  }
}

/**
 * Purchase a subscription (native platforms only)
 */
export async function purchasePackage(packageToPurchase: unknown): Promise<PurchaseResult> {
  const platform = detectPlatform()

  if (platform === 'web') {
    return {
      success: false,
      tier: 'free',
      error: 'Use Stripe checkout for web purchases',
    }
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')

    const result = await Purchases.purchasePackage({
      aPackage: packageToPurchase as Parameters<typeof Purchases.purchasePackage>[0]['aPackage'],
    })

    // Check entitlements to determine tier
    const customerInfo = result.customerInfo
    let tier: SubscriptionTier = 'free'

    if (customerInfo.entitlements.active[ENTITLEMENTS.premium]) {
      tier = 'premium'
    } else if (customerInfo.entitlements.active[ENTITLEMENTS.pro]) {
      tier = 'pro'
    }

    return {
      success: true,
      tier,
    }
  } catch (error) {
    const err = error as { code?: string; message?: string }

    // User cancelled
    if (err.code === 'PURCHASE_CANCELLED') {
      return {
        success: false,
        tier: 'free',
        error: 'Purchase cancelled',
      }
    }

    return {
      success: false,
      tier: 'free',
      error: err.message || 'Purchase failed',
    }
  }
}

/**
 * Get current subscription status
 */
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const platform = detectPlatform()

  if (platform === 'web') {
    // Web - check via your API (which checks Stripe)
    try {
      const response = await fetch('/api/subscription')
      const data = await response.json()

      return {
        tier: data.subscription?.tier || 'free',
        isActive: data.subscription?.status === 'active',
        expiresAt: data.subscription?.currentPeriodEnd
          ? new Date(data.subscription.currentPeriodEnd)
          : undefined,
        platform: 'web',
        willRenew: !data.subscription?.cancelAtPeriodEnd,
      }
    } catch {
      return {
        tier: 'free',
        isActive: false,
        platform: 'web',
        willRenew: false,
      }
    }
  }

  // Native - check RevenueCat
  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    const customerInfo = await Purchases.getCustomerInfo()

    let tier: SubscriptionTier = 'free'
    let expiresAt: Date | undefined
    let willRenew = false

    if (customerInfo.customerInfo.entitlements.active[ENTITLEMENTS.premium]) {
      tier = 'premium'
      const entitlement = customerInfo.customerInfo.entitlements.active[ENTITLEMENTS.premium]
      expiresAt = entitlement.expirationDate ? new Date(entitlement.expirationDate) : undefined
      willRenew = entitlement.willRenew
    } else if (customerInfo.customerInfo.entitlements.active[ENTITLEMENTS.pro]) {
      tier = 'pro'
      const entitlement = customerInfo.customerInfo.entitlements.active[ENTITLEMENTS.pro]
      expiresAt = entitlement.expirationDate ? new Date(entitlement.expirationDate) : undefined
      willRenew = entitlement.willRenew
    }

    return {
      tier,
      isActive: tier !== 'free',
      expiresAt,
      platform,
      willRenew,
    }
  } catch {
    return {
      tier: 'free',
      isActive: false,
      platform,
      willRenew: false,
    }
  }
}

/**
 * Restore purchases (iOS requirement)
 */
export async function restorePurchases(): Promise<SubscriptionStatus> {
  const platform = detectPlatform()

  if (platform === 'web') {
    return getSubscriptionStatus()
  }

  try {
    const { Purchases } = await import('@revenuecat/purchases-capacitor')
    await Purchases.restorePurchases()
    return getSubscriptionStatus()
  } catch {
    return {
      tier: 'free',
      isActive: false,
      platform,
      willRenew: false,
    }
  }
}

/**
 * Sync RevenueCat subscription to your backend
 * Call this after successful purchase to update your database
 */
export async function syncSubscriptionToBackend(userId: string): Promise<void> {
  const status = await getSubscriptionStatus()

  try {
    await fetch('/api/subscription/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        tier: status.tier,
        platform: status.platform,
        expiresAt: status.expiresAt?.toISOString(),
        willRenew: status.willRenew,
      }),
    })
  } catch (error) {
    console.error('Failed to sync subscription to backend:', error)
  }
}
