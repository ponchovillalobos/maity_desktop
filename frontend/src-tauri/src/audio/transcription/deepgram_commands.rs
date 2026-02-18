// audio/transcription/deepgram_commands.rs
//
// Tauri commands for Deepgram cloud transcription service.
// Handles proxy configuration management for connecting via Cloudflare Worker proxy.
// The API key never reaches the client — the proxy holds it server-side.

use log::{info, warn, error};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant};

// ============================================================================
// PROXY CONFIG CACHE
// ============================================================================

/// Cached proxy configuration with expiration tracking
struct CachedProxyConfig {
    proxy_base_url: String,
    jwt: String,
    expires_at: Instant,
}

/// Global cache for proxy configuration
static PROXY_CONFIG_CACHE: Mutex<Option<CachedProxyConfig>> = Mutex::new(None);

/// Buffer time before config expiry to trigger refresh (30 seconds)
const CONFIG_REFRESH_BUFFER_SECS: u64 = 30;

// ============================================================================
// TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepgramProxyConfig {
    pub proxy_base_url: String,
    pub jwt: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepgramProxyConfigError {
    pub error: String,
    pub details: Option<String>,
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

/// Set the proxy configuration (called from frontend after fetching from Vercel API)
/// This is the bridge between the TypeScript API client and Rust transcription
#[tauri::command]
pub async fn set_deepgram_proxy_config(proxy_base_url: String, jwt: String, expires_in: u64) -> Result<(), String> {
    info!("Setting Deepgram proxy config (expires in {}s)", expires_in);

    // Validate inputs
    if proxy_base_url.is_empty() {
        return Err("Proxy base URL cannot be empty".to_string());
    }
    if jwt.is_empty() {
        return Err("JWT cannot be empty".to_string());
    }

    // Cache the config
    let expires_at = Instant::now() + Duration::from_secs(expires_in);

    let mut cache = PROXY_CONFIG_CACHE.lock().map_err(|e| {
        error!("Failed to lock proxy config cache: {}", e);
        format!("Internal error: {}", e)
    })?;

    *cache = Some(CachedProxyConfig {
        proxy_base_url,
        jwt,
        expires_at,
    });

    info!("Proxy config cached successfully");
    Ok(())
}

/// Get the cached proxy configuration if valid
#[tauri::command]
pub async fn get_deepgram_proxy_config() -> Result<Option<DeepgramProxyConfig>, String> {
    let cache = PROXY_CONFIG_CACHE.lock().map_err(|e| {
        error!("Failed to lock proxy config cache: {}", e);
        format!("Internal error: {}", e)
    })?;

    match &*cache {
        Some(cached) => {
            let now = Instant::now();
            if cached.expires_at > now + Duration::from_secs(CONFIG_REFRESH_BUFFER_SECS) {
                let expires_in = cached.expires_at.duration_since(now).as_secs();
                Ok(Some(DeepgramProxyConfig {
                    proxy_base_url: cached.proxy_base_url.clone(),
                    jwt: cached.jwt.clone(),
                    expires_in,
                }))
            } else {
                // Config expired or about to expire
                warn!("Proxy config expired or about to expire");
                Ok(None)
            }
        }
        None => Ok(None),
    }
}

/// Check if a valid proxy configuration is available
#[tauri::command]
pub async fn has_valid_deepgram_proxy_config() -> bool {
    let cache = match PROXY_CONFIG_CACHE.lock() {
        Ok(c) => c,
        Err(_) => return false,
    };

    match &*cache {
        Some(cached) => {
            cached.expires_at > Instant::now() + Duration::from_secs(CONFIG_REFRESH_BUFFER_SECS)
        }
        None => false,
    }
}

/// Clear the cached proxy configuration (e.g., on logout)
#[tauri::command]
pub async fn clear_deepgram_proxy_config() -> Result<(), String> {
    info!("Clearing Deepgram proxy config cache");

    let mut cache = PROXY_CONFIG_CACHE.lock().map_err(|e| {
        error!("Failed to lock proxy config cache: {}", e);
        format!("Internal error: {}", e)
    })?;

    *cache = None;
    Ok(())
}

// ============================================================================
// INTERNAL FUNCTIONS (for use within Rust code)
// ============================================================================

/// Get the current proxy config if valid (for internal use)
/// Returns None if no config or config is expired
/// Returns Some((proxy_base_url, jwt)) if valid
pub fn get_cached_proxy_config() -> Option<(String, String)> {
    let cache = PROXY_CONFIG_CACHE.lock().ok()?;

    cache.as_ref().and_then(|cached| {
        if cached.expires_at > Instant::now() + Duration::from_secs(CONFIG_REFRESH_BUFFER_SECS) {
            Some((cached.proxy_base_url.clone(), cached.jwt.clone()))
        } else {
            None
        }
    })
}

/// Check if proxy config is available and valid (for internal use)
pub fn has_cached_proxy_config() -> bool {
    get_cached_proxy_config().is_some()
}
