// audio/transcription/mod.rs
//
// Transcription module: Provider abstraction, engine management, and worker pool.

pub mod provider;
pub mod whisper_provider;
pub mod parakeet_provider;
pub mod deepgram_provider;  // Deepgram cloud transcription
pub mod deepgram_commands;  // Tauri commands for Deepgram cloud proxy tokens
pub mod engine;
pub mod worker;

// Re-export commonly used types
pub use provider::{TranscriptionError, TranscriptionProvider, TranscriptResult};
pub use whisper_provider::WhisperProvider;
pub use parakeet_provider::ParakeetProvider;
pub use deepgram_provider::{DeepgramRealtimeTranscriber, DeepgramConfig};
pub use deepgram_commands::{
    set_deepgram_cloud_token,
    get_deepgram_cloud_token,
    has_valid_deepgram_cloud_token,
    clear_deepgram_cloud_token,
    get_cached_cloud_token,
    has_cached_cloud_token,
};
pub use engine::{
    TranscriptionEngine,
    validate_transcription_model_ready,
    get_or_init_transcription_engine,
    get_or_init_whisper
};
pub use worker::{
    start_transcription_task,
    reset_speech_detected_flag,
    TranscriptUpdate
};
