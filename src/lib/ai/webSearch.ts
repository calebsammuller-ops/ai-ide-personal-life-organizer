/**
 * Web Search Module with Source Validation
 * Enables the AI assistant to search the web and validate sources
 */

export interface SearchResult {
  title: string
  url: string
  snippet: string
  source: string
  publishedDate?: string
}

export interface ValidatedSearchResult extends SearchResult {
  trustScore: number // 0-100
  isReliable: boolean
  sourceCategory: 'official' | 'news' | 'academic' | 'blog' | 'forum' | 'unknown'
  warnings: string[]
}

export interface WebSearchResponse {
  query: string
  results: ValidatedSearchResult[]
  summary?: string
  searchedAt: string
  sourcesValidated: boolean
}

// Trusted domain categories for source validation
const TRUSTED_DOMAINS = {
  official: [
    'gov', 'edu', 'org',
    'who.int', 'cdc.gov', 'nih.gov', 'nasa.gov',
    'wikipedia.org', 'britannica.com',
    'nature.com', 'science.org', 'sciencedirect.com',
  ],
  news: [
    'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
    'npr.org', 'pbs.org', 'nytimes.com', 'washingtonpost.com',
    'theguardian.com', 'economist.com', 'wsj.com',
    'bloomberg.com', 'ft.com',
  ],
  academic: [
    'arxiv.org', 'pubmed.gov', 'scholar.google.com',
    'jstor.org', 'researchgate.net', 'academia.edu',
    'springer.com', 'ieee.org', 'acm.org',
  ],
  tech: [
    'stackoverflow.com', 'github.com', 'developer.mozilla.org',
    'docs.microsoft.com', 'cloud.google.com', 'aws.amazon.com',
    'developer.apple.com', 'reactjs.org', 'nodejs.org',
  ],
}

// Domains to be cautious about
const CAUTION_DOMAINS = [
  'medium.com', 'quora.com', 'reddit.com',
  'facebook.com', 'twitter.com', 'x.com',
  'tiktok.com', 'youtube.com',
]

/**
 * Validate a source URL and calculate trust score
 */
function validateSource(url: string, title: string, snippet: string): {
  trustScore: number
  isReliable: boolean
  sourceCategory: ValidatedSearchResult['sourceCategory']
  warnings: string[]
} {
  const warnings: string[] = []
  let trustScore = 50 // Start neutral
  let sourceCategory: ValidatedSearchResult['sourceCategory'] = 'unknown'

  try {
    const domain = new URL(url).hostname.toLowerCase()
    const tld = domain.split('.').slice(-2).join('.')
    const baseDomain = domain.replace(/^www\./, '')

    // Check official/trusted domains
    if (TRUSTED_DOMAINS.official.some(d => domain.endsWith(d) || baseDomain === d)) {
      trustScore += 35
      sourceCategory = 'official'
    } else if (domain.endsWith('.gov') || domain.endsWith('.edu')) {
      trustScore += 40
      sourceCategory = 'official'
    } else if (TRUSTED_DOMAINS.news.some(d => baseDomain === d || domain.endsWith(d))) {
      trustScore += 25
      sourceCategory = 'news'
    } else if (TRUSTED_DOMAINS.academic.some(d => baseDomain === d || domain.endsWith(d))) {
      trustScore += 35
      sourceCategory = 'academic'
    } else if (TRUSTED_DOMAINS.tech.some(d => baseDomain === d || domain.endsWith(d))) {
      trustScore += 20
      sourceCategory = 'blog' // Tech docs are often blog-like
    }

    // Check caution domains
    if (CAUTION_DOMAINS.some(d => baseDomain === d || domain.endsWith(d))) {
      trustScore -= 15
      warnings.push('User-generated content - verify with additional sources')
      sourceCategory = 'forum'
    }

    // Check for indicators of low quality
    const lowQualityIndicators = [
      'sponsored', 'advertisement', 'affiliate',
      'buy now', 'click here', 'limited time',
    ]
    const contentLower = (title + ' ' + snippet).toLowerCase()
    if (lowQualityIndicators.some(ind => contentLower.includes(ind))) {
      trustScore -= 20
      warnings.push('May contain promotional content')
    }

    // Check for outdated content indicators
    const currentYear = new Date().getFullYear()
    const yearMatch = snippet.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      const contentYear = parseInt(yearMatch[1])
      if (currentYear - contentYear > 3) {
        trustScore -= 10
        warnings.push(`Content may be outdated (references ${contentYear})`)
      }
    }

    // HTTPS bonus
    if (url.startsWith('https://')) {
      trustScore += 5
    }

  } catch {
    warnings.push('Could not parse URL')
    trustScore = 30
  }

  // Clamp score between 0-100
  trustScore = Math.max(0, Math.min(100, trustScore))

  return {
    trustScore,
    isReliable: trustScore >= 60,
    sourceCategory,
    warnings,
  }
}

/**
 * Search the web using Brave Search API
 */
async function searchWithBrave(query: string, count: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY

  if (!apiKey) {
    throw new Error('BRAVE_SEARCH_API_KEY not configured')
  }

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}`,
    {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': apiKey,
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Brave search failed: ${response.statusText}`)
  }

  const data = await response.json()

  return (data.web?.results || []).map((result: any) => ({
    title: result.title,
    url: result.url,
    snippet: result.description,
    source: new URL(result.url).hostname,
    publishedDate: result.age || result.published_date,
  }))
}

/**
 * Search the web using SerpAPI (Google results)
 */
async function searchWithSerpAPI(query: string, count: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.SERPAPI_KEY

  if (!apiKey) {
    throw new Error('SERPAPI_KEY not configured')
  }

  const response = await fetch(
    `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${count}&api_key=${apiKey}`,
  )

  if (!response.ok) {
    throw new Error(`SerpAPI search failed: ${response.statusText}`)
  }

  const data = await response.json()

  return (data.organic_results || []).map((result: any) => ({
    title: result.title,
    url: result.link,
    snippet: result.snippet,
    source: new URL(result.link).hostname,
    publishedDate: result.date,
  }))
}

/**
 * Search the web using Tavily API (designed for AI)
 */
async function searchWithTavily(query: string, count: number = 5): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY

  if (!apiKey) {
    throw new Error('TAVILY_API_KEY not configured')
  }

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: count,
      include_answer: true,
      search_depth: 'advanced',
    }),
  })

  if (!response.ok) {
    throw new Error(`Tavily search failed: ${response.statusText}`)
  }

  const data = await response.json()

  return (data.results || []).map((result: any) => ({
    title: result.title,
    url: result.url,
    snippet: result.content,
    source: new URL(result.url).hostname,
    publishedDate: result.published_date,
  }))
}

/**
 * Search using DuckDuckGo Instant Answers (FREE - no API key required)
 */
async function searchWithDuckDuckGo(query: string, count: number = 5): Promise<SearchResult[]> {
  // Use DuckDuckGo's instant answer API (free, no key needed)
  const response = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed: ${response.statusText}`)
  }

  const data = await response.json()
  const results: SearchResult[] = []

  // Add abstract result if available
  if (data.Abstract && data.AbstractURL) {
    results.push({
      title: data.Heading || query,
      url: data.AbstractURL,
      snippet: data.Abstract,
      source: data.AbstractSource || new URL(data.AbstractURL).hostname,
    })
  }

  // Add related topics
  if (data.RelatedTopics && Array.isArray(data.RelatedTopics)) {
    for (const topic of data.RelatedTopics) {
      if (results.length >= count) break

      if (topic.FirstURL && topic.Text) {
        try {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 60),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: new URL(topic.FirstURL).hostname,
          })
        } catch {
          // Skip invalid URLs
        }
      }

      // Handle nested topics
      if (topic.Topics && Array.isArray(topic.Topics)) {
        for (const subTopic of topic.Topics) {
          if (results.length >= count) break
          if (subTopic.FirstURL && subTopic.Text) {
            try {
              results.push({
                title: subTopic.Text.split(' - ')[0] || subTopic.Text.substring(0, 60),
                url: subTopic.FirstURL,
                snippet: subTopic.Text,
                source: new URL(subTopic.FirstURL).hostname,
              })
            } catch {
              // Skip invalid URLs
            }
          }
        }
      }
    }
  }

  // Add results from Results array if available
  if (data.Results && Array.isArray(data.Results)) {
    for (const result of data.Results) {
      if (results.length >= count) break
      if (result.FirstURL && result.Text) {
        try {
          results.push({
            title: result.Text.split(' - ')[0] || result.Text.substring(0, 60),
            url: result.FirstURL,
            snippet: result.Text,
            source: new URL(result.FirstURL).hostname,
          })
        } catch {
          // Skip invalid URLs
        }
      }
    }
  }

  return results
}

/**
 * Main web search function with automatic provider selection and source validation
 */
export async function searchWeb(
  query: string,
  options: {
    count?: number
    validateSources?: boolean
    preferredProvider?: 'brave' | 'serpapi' | 'tavily' | 'duckduckgo'
  } = {}
): Promise<WebSearchResponse> {
  const { count = 5, validateSources = true, preferredProvider } = options

  let results: SearchResult[] = []
  let searchError: Error | null = null

  // Try providers in order of preference (DuckDuckGo is free fallback - always available)
  const providers = preferredProvider
    ? [preferredProvider, 'brave', 'tavily', 'serpapi', 'duckduckgo'].filter((v, i, a) => a.indexOf(v) === i)
    : ['brave', 'tavily', 'serpapi', 'duckduckgo']

  for (const provider of providers) {
    try {
      switch (provider) {
        case 'brave':
          if (process.env.BRAVE_SEARCH_API_KEY) {
            results = await searchWithBrave(query, count)
            break
          }
          continue
        case 'tavily':
          if (process.env.TAVILY_API_KEY) {
            results = await searchWithTavily(query, count)
            break
          }
          continue
        case 'serpapi':
          if (process.env.SERPAPI_KEY) {
            results = await searchWithSerpAPI(query, count)
            break
          }
          continue
        case 'duckduckgo':
          // DuckDuckGo is always available - no API key needed!
          results = await searchWithDuckDuckGo(query, count)
          break
      }
      if (results.length > 0) break
    } catch (error) {
      searchError = error as Error
      console.error(`[WebSearch] ${provider} failed:`, error)
      continue
    }
  }

  if (results.length === 0) {
    throw searchError || new Error('All search providers failed.')
  }

  // Validate sources if requested
  const validatedResults: ValidatedSearchResult[] = results.map(result => {
    if (!validateSources) {
      return {
        ...result,
        trustScore: 50,
        isReliable: true,
        sourceCategory: 'unknown' as const,
        warnings: [],
      }
    }

    const validation = validateSource(result.url, result.title, result.snippet)
    return {
      ...result,
      ...validation,
    }
  })

  // Sort by trust score (most reliable first)
  validatedResults.sort((a, b) => b.trustScore - a.trustScore)

  return {
    query,
    results: validatedResults,
    searchedAt: new Date().toISOString(),
    sourcesValidated: validateSources,
  }
}

/**
 * Format search results for AI consumption
 */
export function formatSearchResultsForAI(response: WebSearchResponse): string {
  if (response.results.length === 0) {
    return 'No search results found.'
  }

  const lines: string[] = [
    `Web search results for: "${response.query}"`,
    `Searched at: ${response.searchedAt}`,
    '',
  ]

  for (let i = 0; i < response.results.length; i++) {
    const result = response.results[i]
    const reliabilityIcon = result.isReliable ? '✓' : '⚠️'

    lines.push(`${i + 1}. [${reliabilityIcon} Trust: ${result.trustScore}/100] ${result.title}`)
    lines.push(`   Source: ${result.source} (${result.sourceCategory})`)
    lines.push(`   URL: ${result.url}`)
    lines.push(`   ${result.snippet}`)

    if (result.warnings.length > 0) {
      lines.push(`   ⚠️ ${result.warnings.join('; ')}`)
    }
    lines.push('')
  }

  lines.push('---')
  lines.push('Note: Always cross-reference information from multiple reliable sources before presenting as fact.')

  return lines.join('\n')
}

/**
 * Check if commercial web search is configured (for premium users)
 * Note: DuckDuckGo is NOT suitable for commercial use
 */
export function isWebSearchEnabled(): boolean {
  // Only enable if a commercial-licensed API is configured
  return !!(
    process.env.BRAVE_SEARCH_API_KEY ||
    process.env.TAVILY_API_KEY ||
    process.env.SERPAPI_KEY
  )
}

/**
 * Check which search provider is available
 */
export function getSearchProviderStatus(): {
  available: boolean
  provider: string | null
  isCommercialReady: boolean
} {
  if (process.env.BRAVE_SEARCH_API_KEY) {
    return { available: true, provider: 'Brave Search', isCommercialReady: true }
  }
  if (process.env.TAVILY_API_KEY) {
    return { available: true, provider: 'Tavily', isCommercialReady: true }
  }
  if (process.env.SERPAPI_KEY) {
    return { available: true, provider: 'SerpAPI', isCommercialReady: true }
  }
  return { available: false, provider: null, isCommercialReady: false }
}
