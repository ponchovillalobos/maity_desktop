use std::sync::OnceLock;
use log::info;

/// Hardware capabilities for audio processing optimization
#[derive(Debug, Clone, PartialEq)]
pub struct HardwareProfile {
    pub cpu_cores: u8,
    pub has_gpu_acceleration: bool,
    pub gpu_type: GpuType,
    pub memory_gb: u8,
    pub performance_tier: PerformanceTier,
}

#[derive(Debug, Clone, PartialEq)]
pub enum GpuType {
    None,
    Metal,      // Apple Silicon
    Cuda,       // NVIDIA
    Vulkan,     // AMD/Intel
    OpenCL,     // Generic GPU compute
}

#[derive(Debug, Clone, PartialEq)]
pub enum PerformanceTier {
    Low,      // CPU-only, limited resources
    Medium,   // CPU-only but powerful, or basic GPU
    High,     // Dedicated GPU with good compute
    Ultra,    // High-end hardware with fast GPU
}

/// Adaptive Whisper configuration based on hardware
#[derive(Debug, Clone)]
pub struct AdaptiveWhisperConfig {
    pub beam_size: usize,
    pub temperature: f32,
    pub use_gpu: bool,
    pub max_threads: Option<usize>,
    pub chunk_size_preference: ChunkSizePreference,
    pub audio_ctx: u32,       // Encoder context size (768=15s, 1500=30s default)
    pub single_segment: bool, // Force single segment output for streaming
}

#[derive(Debug, Clone, PartialEq)]
pub enum ChunkSizePreference {
    Fast,       // Smaller chunks for responsiveness
    Balanced,   // Medium chunks for balance
    Quality,    // Larger chunks for accuracy
}

static HARDWARE_PROFILE: OnceLock<HardwareProfile> = OnceLock::new();

impl HardwareProfile {
    /// Get the detected hardware profile (cached after first call)
    pub fn detect() -> &'static HardwareProfile {
        HARDWARE_PROFILE.get_or_init(|| {
            let profile = Self::detect_hardware();
            info!("Detected hardware profile: {:?}", profile);
            profile
        })
    }

    /// Perform hardware detection
    fn detect_hardware() -> HardwareProfile {
        let cpu_cores = Self::detect_cpu_cores();
        let (has_gpu_acceleration, gpu_type) = Self::detect_gpu();
        let memory_gb = Self::detect_memory_gb();
        let performance_tier = Self::calculate_performance_tier(cpu_cores, &gpu_type, memory_gb);

        HardwareProfile {
            cpu_cores,
            has_gpu_acceleration,
            gpu_type,
            memory_gb,
            performance_tier,
        }
    }

    /// Detect number of CPU cores
    fn detect_cpu_cores() -> u8 {
        std::thread::available_parallelism()
            .map(|n| n.get().min(255) as u8)
            .unwrap_or(4) // Default to 4 cores
    }

    /// Detect GPU acceleration capabilities
    fn detect_gpu() -> (bool, GpuType) {
        // Check for Metal (Apple Silicon)
        #[cfg(target_os = "macos")]
        {
            if Self::has_metal_support() {
                return (true, GpuType::Metal);
            }
        }

        // Check for CUDA (NVIDIA)
        if Self::has_cuda_support() {
            return (true, GpuType::Cuda);
        }

        // Check for Vulkan (AMD/Intel/others)
        if Self::has_vulkan_support() {
            return (true, GpuType::Vulkan);
        }

        // Fallback to CPU-only
        (false, GpuType::None)
    }

    /// Detect available system memory in GB using sysinfo
    fn detect_memory_gb() -> u8 {
        // Allow override via env var for testing (e.g., simulating low-RAM hardware)
        if let Ok(mem_str) = std::env::var("MEMORY_GB") {
            if let Ok(val) = mem_str.parse::<u8>() {
                info!("Using MEMORY_GB override: {}GB", val);
                return val;
            }
        }

        // Real detection via sysinfo
        let mut sys = sysinfo::System::new();
        sys.refresh_memory();
        let total_bytes = sys.total_memory();
        let total_gb = (total_bytes / 1_073_741_824) as u8; // bytes → GB
        if total_gb == 0 { 8 } else { total_gb } // fallback if detection fails
    }

    /// Calculate performance tier based on hardware
    fn calculate_performance_tier(cpu_cores: u8, gpu_type: &GpuType, memory_gb: u8) -> PerformanceTier {
        match gpu_type {
            GpuType::Metal => {
                if memory_gb >= 16 && cpu_cores >= 8 {
                    PerformanceTier::Ultra
                } else {
                    PerformanceTier::High
                }
            }
            GpuType::Cuda => {
                if memory_gb >= 16 && cpu_cores >= 8 {
                    PerformanceTier::Ultra
                } else {
                    PerformanceTier::High
                }
            }
            GpuType::Vulkan | GpuType::OpenCL => {
                if memory_gb >= 12 && cpu_cores >= 6 {
                    PerformanceTier::High
                } else {
                    PerformanceTier::Medium
                }
            }
            GpuType::None => {
                if cpu_cores >= 8 && memory_gb >= 16 {
                    PerformanceTier::Medium
                } else {
                    PerformanceTier::Low
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    fn has_metal_support() -> bool {
        // Simple check for Apple Silicon (Metal is available on Intel Macs too, but less optimal for ML)
        std::env::consts::ARCH == "aarch64"
    }

    fn has_cuda_support() -> bool {
        // Check for CUDA environment or libraries
        std::env::var("CUDA_PATH").is_ok() ||
        std::env::var("CUDA_HOME").is_ok() ||
        std::path::Path::new("/usr/local/cuda").exists()
    }

    fn has_vulkan_support() -> bool {
        // Basic Vulkan detection - could be enhanced
        std::env::var("VULKAN_SDK").is_ok() ||
        std::path::Path::new("/usr/lib/x86_64-linux-gnu/libvulkan.so").exists() ||
        std::path::Path::new("/usr/lib/libvulkan.so").exists()
    }

    /// Generate adaptive Whisper configuration based on hardware
    /// OPTIMIZED FOR REAL-TIME: All tiers use Greedy decoding (beam_size=1),
    /// temperature=0.0, audio_ctx=768 (15s), and single_segment=true.
    /// Thread count and GPU usage vary by hardware capability.
    pub fn get_whisper_config(&self) -> AdaptiveWhisperConfig {
        match self.performance_tier {
            PerformanceTier::Ultra => AdaptiveWhisperConfig {
                beam_size: 1,           // Greedy = fastest decoding
                temperature: 0.0,       // Deterministic = no sampling overhead
                use_gpu: self.has_gpu_acceleration,
                max_threads: Some(self.cpu_cores.min(8) as usize),
                chunk_size_preference: ChunkSizePreference::Quality,
                audio_ctx: 512,         // ~10s context = faster encoder for short chunks
                single_segment: true,   // Single segment for streaming chunks
            },
            PerformanceTier::High => AdaptiveWhisperConfig {
                beam_size: 1,
                temperature: 0.0,
                use_gpu: self.has_gpu_acceleration,
                max_threads: Some(self.cpu_cores.min(8) as usize), // Use more cores
                chunk_size_preference: ChunkSizePreference::Balanced,
                audio_ctx: 512,
                single_segment: true,
            },
            PerformanceTier::Medium => AdaptiveWhisperConfig {
                beam_size: 1,
                temperature: 0.0,
                use_gpu: self.has_gpu_acceleration,
                max_threads: Some(self.cpu_cores.min(6) as usize), // Use more cores (was 4)
                chunk_size_preference: ChunkSizePreference::Fast,
                audio_ctx: 512,
                single_segment: true,
            },
            PerformanceTier::Low => AdaptiveWhisperConfig {
                beam_size: 1,
                temperature: 0.0,
                use_gpu: false, // Force CPU to avoid GPU overhead on weak hardware
                max_threads: Some(self.cpu_cores.max(2).min(6) as usize), // Use available cores (min 2, max 6)
                chunk_size_preference: ChunkSizePreference::Fast,
                audio_ctx: 512,
                single_segment: true,
            },
        }
    }

    /// Get recommended chunk duration in milliseconds based on performance tier
    pub fn get_recommended_chunk_duration_ms(&self) -> u32 {
        match self.performance_tier {
            PerformanceTier::Ultra => 25000,   // 25 seconds for maximum accuracy
            PerformanceTier::High => 20000,    // 20 seconds for high quality
            PerformanceTier::Medium => 15000,  // 15 seconds for balance
            PerformanceTier::Low => 10000,     // 10 seconds for responsiveness
        }
    }

    /// Check if hardware can handle real-time processing of given sample rate
    pub fn can_handle_realtime(&self, sample_rate: u32, channels: u16) -> bool {
        let data_rate = sample_rate * channels as u32;

        match self.performance_tier {
            PerformanceTier::Ultra => data_rate <= 192000, // Up to 192kHz stereo
            PerformanceTier::High => data_rate <= 96000,   // Up to 96kHz stereo or 192kHz mono
            PerformanceTier::Medium => data_rate <= 48000, // Up to 48kHz stereo
            PerformanceTier::Low => data_rate <= 22050,    // Up to 22kHz stereo or 48kHz mono
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hardware_detection() {
        let profile = HardwareProfile::detect();
        assert!(profile.cpu_cores > 0);
        // Performance optimization: remove println! from tests
        log::debug!("Detected profile: {:?}", profile);
    }

    #[test]
    fn test_whisper_config_generation() {
        let profile = HardwareProfile::detect();
        let config = profile.get_whisper_config();

        assert_eq!(config.beam_size, 1); // Always greedy for real-time
        assert!(config.temperature >= 0.0 && config.temperature <= 1.0);

        // Performance optimization: remove println! from tests
        log::debug!("Generated config: {:?}", config);
    }

    #[test]
    fn test_performance_tier_logic() {
        // Test different hardware combinations
        let low_tier = HardwareProfile::calculate_performance_tier(2, &GpuType::None, 4);
        assert_eq!(low_tier, PerformanceTier::Low);

        let high_tier = HardwareProfile::calculate_performance_tier(8, &GpuType::Metal, 16);
        assert_eq!(high_tier, PerformanceTier::Ultra);
    }
}