//! Meeting Detector Module
//!
//! Detects when meeting applications (Zoom, Teams, Google Meet) are running
//! and optionally prompts the user to start recording.

pub mod detector;
pub mod process_monitor;
pub mod settings;
pub mod commands;

pub use detector::MeetingDetector;
pub use process_monitor::{MeetingApp, DetectedMeeting};
pub use settings::MeetingDetectorSettings;
pub use commands::*;
