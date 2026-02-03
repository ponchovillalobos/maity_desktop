// audio/transcription/deepgram_commands.rs
//
// Tauri commands for Deepgram cloud transcription service.
// Handles cloud proxy token management for users without their own API key.

use log::{info, warn, error};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{Duration, Instant};

// ============================================================================
// CLOUD TOKEN CACHE
// ============================================================================

/// Cached cloud token with expiration tracking
struct CachedToken {
    token: String,
    expires_at: Instant,
}

/// Global cache for cloud proxy token
static CLOUD_TOKEN_CACHE: Mutex<Option<CachedToken>> = Mutex::new(None);

/// Buffer time before token expiry to trigger refresh (30 seconds)
const TOKEN_REFRESH_BUFFER_SECS: u64 = 30;

// ============================================================================
// TYPES
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepgramCloudToken {
    pub token: String,
    pub expires_in: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeepgramCloudTokenError {
    pub error: String,
    pub details: Option<String>,
}

// ============================================================================
// TAURI COMMANDS
// ============================================================================

/// Set the cloud proxy token (called from frontend after fetching from edge function)
/// This is the bridge between the TypeScript edge function client and Rust transcription
#[tauri::command]
pub async fn set_deepgram_cloud_token(token: String, expires_in: u64) -> Result<(), String> {
    info!("🔑 Setting Deepgram cloud token (expires in {}s)", expires_in);

    // Validate token
    if token.is_empty() {
        return Err("Token cannot be empty".to_string());
    }

    // Cache the token
    let expires_at = Instant::now() + Duration::from_secs(expires_in);

    let mut cache = CLOUD_TOKEN_CACHE.lock().map_err(|e| {
        error!("Failed to lock cloud token cache: {}", e);
        format!("Internal error: {}", e)
    })?;

    *cache = Some(CachedToken {
        token,
        expires_at,
    });

    info!("✅ Cloud token cached successfully");
    Ok(())
}

/// Get the cached cloud proxy token if valid
#[tauri::command]
pub async fn get_deepgram_cloud_token() -> Result<Option<DeepgramCloudToken>, String> {
    let cache = CLOUD_TOKEN_CACHE.lock().map_err(|e| {
        error!("Failed to lock cloud token cache: {}", e);
        format!("Internal error: {}", e)
    })?;

    match &*cache {
        Some(cached) => {
            let now = Instant::now();
            if cached.expires_at > now + Duration::from_secs(TOKEN_REFRESH_BUFFER_SECS) {
                let expires_in = cached.expires_at.duration_since(now).as_secs();
                Ok(Some(DeepgramCloudToken {
                    token: cached.token.clone(),
                    expires_in,
                }))
            } else {
                // Token expired or about to expire
                warn!("🔄 Cloud token expired or about to expire");
                Ok(None)
            }
        }
        None => Ok(None),
    }
}

/// Check if a valid cloud token is available
#[tauri::command]
pub async fn has_valid_deepgram_cloud_token() -> bool {
    let cache = match CLOUD_TOKEN_CACHE.lock() {
        Ok(c) => c,
        Err(_) => return false,
    };

    match &*cache {
        Some(cached) => {
            cached.expires_at > Instant::now() + Duration::from_secs(TOKEN_REFRESH_BUFFER_SECS)
        }
        None => false,
    }
}

/// Clear the cached cloud token (e.g., on logout)
#[tauri::command]
pub async fn clear_deepgram_cloud_token() -> Result<(), String> {
    info!("🗑️ Clearing Deepgram cloud token cache");

    let mut cache = CLOUD_TOKEN_CACHE.lock().map_err(|e| {
        error!("Failed to lock cloud token cache: {}", e);
        format!("Internal error: {}", e)
    })?;

    *cache = None;
    Ok(())
}

// ============================================================================
// INTERNAL FUNCTIONS (for use within Rust code)
// ============================================================================

/// Get the current cloud token if valid (for internal use)
/// Returns None if no token or token is expired
pub fn get_cached_cloud_token() -> Option<String> {
    let cache = CLOUD_TOKEN_CACHE.lock().ok()?;

    cache.as_ref().and_then(|cached| {
        if cached.expires_at > Instant::now() + Duration::from_secs(TOKEN_REFRESH_BUFFER_SECS) {
            Some(cached.token.clone())
        } else {
            None
        }
    })
}

/// Check if cloud token is available and valid (for internal use)
pub fn has_cached_cloud_token() -> bool {
    get_cached_cloud_token().is_some()
}
