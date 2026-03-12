/**
 * Model Selector Utility
 * Lists available models from Anthropic API and selects the latest Sonnet model
 */

import Anthropic from '@anthropic-ai/sdk';
import { SKILLS_CONFIG, initializeApiKeys } from '@/lib/config/skills';

// Import the correct type
type ModelInfo = Anthropic.Models.ModelInfo;

let cachedPreferredModel: string | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

/**
 * List all available models from Anthropic API
 */
export async function listAvailableModels(): Promise<ModelInfo[]> {
  try {
    // Ensure API keys are loaded from database
    await initializeApiKeys();
    
    const apiKey = SKILLS_CONFIG.anthropicApiKey;
    if (!apiKey) {
      console.warn('⚠️  No Anthropic API key configured, using fallback model');
      return [];
    }

    const anthropic = new Anthropic({ apiKey });
    
    console.log('📋 Listing available models from Anthropic API...');
    const response = await anthropic.models.list({ limit: 20 });
    
    console.log(`✅ Found ${response.data.length} models`);
    response.data.forEach(model => {
      // created_at is an RFC 3339 datetime string, not a Unix timestamp
      console.log(`   - ${model.id} (created: ${model.created_at})`);
    });
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Failed to list models:', error.message);
    return [];
  }
}

/**
 * Get the preferred model (Opus > Sonnet) from available models
 * Returns the most recent Opus model, falling back to most recent Sonnet
 */
export async function getPreferredModel(): Promise<string> {
  // Check cache first
  if (cachedPreferredModel && Date.now() - cacheTimestamp < CACHE_DURATION) {
    console.log(`🎯 Using cached preferred model: ${cachedPreferredModel}`);
    return cachedPreferredModel;
  }

  try {
    const models = await listAvailableModels();
    
    if (models.length === 0) {
      // Fallback to default if API fails
      // User requested Opus default
      const fallback = 'claude-3-opus-20240229'; 
      console.log(`⚠️  No models available, using fallback: ${fallback}`);
      return fallback;
    }

    // 1. Try to find Opus models
    const opusModels = models.filter(model => 
      model.id.toLowerCase().includes('opus')
    );

    if (opusModels.length > 0) {
      // Sort by creation date (most recent first)
      opusModels.sort((a, b) => b.created_at.localeCompare(a.created_at));
      const latestOpus = opusModels[0].id;
      console.log(`🎯 Latest Opus model detected: ${latestOpus}`);
      
      cachedPreferredModel = latestOpus;
      cacheTimestamp = Date.now();
      return latestOpus;
    }

    console.log('⚠️  No Opus models found, checking for Sonnet...');

    // 2. Fallback to Sonnet models
    const sonnetModels = models.filter(model => 
      model.id.toLowerCase().includes('sonnet') || 
      model.id.toLowerCase().includes('claude-3-5')
    );

    if (sonnetModels.length > 0) {
      // Sort by creation date (most recent first)
      sonnetModels.sort((a, b) => b.created_at.localeCompare(a.created_at));
      const latestSonnet = sonnetModels[0].id;
      console.log(`🎯 Latest Sonnet model detected (fallback): ${latestSonnet}`);
      
      cachedPreferredModel = latestSonnet;
      cacheTimestamp = Date.now();
      return latestSonnet;
    }

    // 3. Absolute fallback
    const fallback = 'claude-3-opus-20240229';
    console.log(`⚠️  No suitable models found, using absolute fallback: ${fallback}`);
    return fallback;

  } catch (error: any) {
    console.error('❌ Failed to get preferred model:', error.message);
    const fallback = 'claude-3-opus-20240229';
    console.log(`⚠️  Using fallback model: ${fallback}`);
    return fallback;
  }
}

/**
 * Get the latest Sonnet model from available models
 * @deprecated Use getPreferredModel() instead
 */
export async function getLatestSonnetModel(): Promise<string> {
  return getPreferredModel();
}

/**
 * Clear the model cache (useful for testing or when configuration changes)
 */
export function clearModelCache(): void {
  cachedLatestSonnet = null;
  cacheTimestamp = 0;
  console.log('🗑️  Model cache cleared');
}

