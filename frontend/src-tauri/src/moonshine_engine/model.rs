use ndarray::{Array2, ArrayD};
use ort::execution_providers::CPUExecutionProvider;
use ort::inputs;
use ort::session::builder::GraphOptimizationLevel;
use ort::session::Session;
use ort::value::TensorRef;
use std::collections::HashMap;
use std::fs;
use std::path::Path;

const MAX_TOKENS: usize = 1024;
const EOS_TOKEN_ID: i64 = 2; // End of sequence token

#[derive(thiserror::Error, Debug)]
pub enum MoonshineError {
    #[error("ORT error")]
    Ort(#[from] ort::Error),
    #[error("I/O error")]
    Io(#[from] std::io::Error),
    #[error("ndarray shape error")]
    Shape(#[from] ndarray::ShapeError),
    #[error("Tokenizer error: {0}")]
    Tokenizer(String),
    #[error("Model input not found: {0}")]
    InputNotFound(String),
    #[error("Model output not found: {0}")]
    OutputNotFound(String),
    #[error("JSON parse error: {0}")]
    JsonParse(String),
}

/// Simple tokenizer that parses HuggingFace tokenizer.json format
/// This avoids the C++ runtime conflicts caused by the tokenizers crate on Windows
pub struct SimpleTokenizer {
    /// Map from token ID to token string
    id_to_token: HashMap<u32, String>,
    /// Map from token string to token ID
    token_to_id: HashMap<String, u32>,
}

impl SimpleTokenizer {
    /// Load tokenizer from HuggingFace tokenizer.json format
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, MoonshineError> {
        let content = fs::read_to_string(path.as_ref())
            .map_err(|e| MoonshineError::Tokenizer(format!("Failed to read tokenizer file: {}", e)))?;

        let json: serde_json::Value = serde_json::from_str(&content)
            .map_err(|e| MoonshineError::JsonParse(format!("Failed to parse tokenizer JSON: {}", e)))?;

        let mut id_to_token = HashMap::new();
        let mut token_to_id = HashMap::new();

        // Parse the model.vocab section which contains the vocabulary
        // HuggingFace tokenizer.json format has vocab in model.vocab as {"token": id, ...}
        if let Some(model) = json.get("model") {
            if let Some(vocab) = model.get("vocab") {
                if let Some(vocab_obj) = vocab.as_object() {
                    for (token, id_value) in vocab_obj {
                        if let Some(id) = id_value.as_u64() {
                            let id = id as u32;
                            id_to_token.insert(id, token.clone());
                            token_to_id.insert(token.clone(), id);
                        }
                    }
                }
            }
        }

        // Also check for added_tokens which may contain special tokens
        if let Some(added_tokens) = json.get("added_tokens") {
            if let Some(tokens_array) = added_tokens.as_array() {
                for token_obj in tokens_array {
                    if let (Some(id), Some(content)) = (
                        token_obj.get("id").and_then(|v| v.as_u64()),
                        token_obj.get("content").and_then(|v| v.as_str())
                    ) {
                        let id = id as u32;
                        id_to_token.insert(id, content.to_string());
                        token_to_id.insert(content.to_string(), id);
                    }
                }
            }
        }

        if id_to_token.is_empty() {
            return Err(MoonshineError::Tokenizer(
                "No vocabulary found in tokenizer.json".to_string()
            ));
        }

        log::info!("Loaded Moonshine tokenizer with {} tokens", id_to_token.len());

        Ok(Self {
            id_to_token,
            token_to_id,
        })
    }

    /// Decode token IDs to text
    pub fn decode(&self, token_ids: &[u32], skip_special_tokens: bool) -> Result<String, MoonshineError> {
        let mut result = String::new();

        for &id in token_ids {
            if let Some(token) = self.id_to_token.get(&id) {
                // Skip special tokens if requested
                if skip_special_tokens {
                    // Common special tokens to skip
                    if token == "<s>" || token == "</s>" || token == "<pad>" ||
                       token == "<unk>" || token == "[CLS]" || token == "[SEP]" ||
                       token == "[PAD]" || token == "[UNK]" || token == "<|endoftext|>" {
                        continue;
                    }
                }

                // Handle byte-level BPE tokens (like "Ġ" for space)
                let decoded_token = token
                    .replace("Ġ", " ")  // GPT-style space marker
                    .replace("▁", " ")  // SentencePiece space marker
                    .replace("Ċ", "\n"); // GPT-style newline marker

                result.push_str(&decoded_token);
            } else {
                // Unknown token - skip or add placeholder
                log::trace!("Unknown token ID: {}", id);
            }
        }

        Ok(result)
    }

    /// Get vocabulary size
    #[allow(dead_code)]
    pub fn vocab_size(&self) -> usize {
        self.id_to_token.len()
    }
}

pub struct MoonshineModel {
    encoder: Session,
    decoder: Session,
    tokenizer: SimpleTokenizer,
}

impl Drop for MoonshineModel {
    fn drop(&mut self) {
        log::debug!("Dropping MoonshineModel");
    }
}

impl MoonshineModel {
    pub fn new<P: AsRef<Path>>(model_dir: P) -> Result<Self, MoonshineError> {
        let encoder = Self::init_session(&model_dir, "encoder_model")?;
        let decoder = Self::init_session(&model_dir, "decoder_model_merged")?;
        let tokenizer = Self::load_tokenizer(&model_dir)?;

        log::info!(
            "Loaded Moonshine model from {}",
            model_dir.as_ref().display()
        );

        Ok(Self {
            encoder,
            decoder,
            tokenizer,
        })
    }

    fn init_session<P: AsRef<Path>>(
        model_dir: P,
        model_name: &str,
    ) -> Result<Session, MoonshineError> {
        let providers = vec![CPUExecutionProvider::default().build()];

        let model_filename = format!("{}.onnx", model_name);
        log::info!("Loading Moonshine model from {}...", model_filename);

        let session = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_execution_providers(providers)?
            .with_parallel_execution(true)?
            .commit_from_file(model_dir.as_ref().join(&model_filename))?;

        for input in &session.inputs {
            log::info!(
                "Moonshine Model '{}' input: name={}, type={:?}",
                model_filename,
                input.name,
                input.input_type
            );
        }

        Ok(session)
    }

    fn load_tokenizer<P: AsRef<Path>>(model_dir: P) -> Result<SimpleTokenizer, MoonshineError> {
        let tokenizer_path = model_dir.as_ref().join("tokenizer.json");
        let tokenizer = SimpleTokenizer::from_file(tokenizer_path)?;

        log::info!("Loaded Moonshine tokenizer");
        Ok(tokenizer)
    }

    /// Encode audio samples to hidden states
    fn encode(&mut self, audio_samples: &[f32]) -> Result<ArrayD<f32>, MoonshineError> {
        log::trace!("Running Moonshine encoder inference...");

        // Moonshine expects audio as [batch_size, sequence_length]
        let batch_size = 1;
        let seq_len = audio_samples.len();

        // Create input array
        let audio_array = Array2::from_shape_vec((batch_size, seq_len), audio_samples.to_vec())?
            .into_dyn();

        let inputs = inputs![
            "args_0" => TensorRef::from_array_view(audio_array.view())?,
        ];

        let outputs = self.encoder.run(inputs)?;

        // Get encoder output (hidden states)
        // Try different output names that Moonshine models might use
        let hidden_states = if let Some(v) = outputs.get("last_hidden_state") {
            v.try_extract_array()?.to_owned()
        } else if let Some(v) = outputs.get("hidden_states") {
            v.try_extract_array()?.to_owned()
        } else {
            // Fallback to first output
            let first_output = outputs.values().next()
                .ok_or_else(|| MoonshineError::OutputNotFound("hidden_states".to_string()))?;
            first_output.try_extract_array()?.to_owned()
        };

        log::trace!("Encoder output shape: {:?}", hidden_states.shape());

        Ok(hidden_states)
    }

    /// Decode hidden states to text tokens
    fn decode(&mut self, encoder_output: &ArrayD<f32>) -> Result<Vec<i64>, MoonshineError> {
        log::trace!("Running Moonshine decoder inference...");

        let mut tokens: Vec<i64> = vec![1]; // Start with BOS token (usually 1)
        let batch_size = 1;

        // Moonshine decoder expects:
        // - encoder_hidden_states: [batch, seq_len, hidden_dim]
        // - input_ids: [batch, token_seq_len]

        for step in 0..MAX_TOKENS {
            // Prepare input_ids tensor
            let token_seq_len = tokens.len();
            let input_ids = Array2::from_shape_vec((batch_size, token_seq_len), tokens.clone())?
                .into_dyn();

            let inputs = inputs![
                "input_ids" => TensorRef::from_array_view(input_ids.view())?,
                "encoder_hidden_states" => TensorRef::from_array_view(encoder_output.view())?,
            ];

            let outputs = self.decoder.run(inputs)?;

            // Get logits output
            let logits = if let Some(v) = outputs.get("logits") {
                v.try_extract_array::<f32>()?.to_owned()
            } else {
                // Fallback to first output
                let first_output = outputs.values().next()
                    .ok_or_else(|| MoonshineError::OutputNotFound("logits".to_string()))?;
                first_output.try_extract_array::<f32>()?.to_owned()
            };

            log::trace!("Decoder logits shape: {:?}", logits.shape());

            // Get last token logits and find argmax
            let logits_slice = logits.as_slice().ok_or_else(|| {
                MoonshineError::Shape(ndarray::ShapeError::from_kind(
                    ndarray::ErrorKind::IncompatibleShape,
                ))
            })?;

            // Get vocabulary size from logits shape
            let vocab_size = if logits.shape().len() >= 3 {
                logits.shape()[2]
            } else if logits.shape().len() == 2 {
                logits.shape()[1]
            } else {
                return Err(MoonshineError::OutputNotFound(
                    "Could not determine vocab size from logits".to_string(),
                ));
            };

            // Get the logits for the last token position
            let last_token_start = logits_slice.len() - vocab_size;
            let last_logits = &logits_slice[last_token_start..];

            // Find argmax
            let next_token = last_logits
                .iter()
                .enumerate()
                .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                .map(|(idx, _)| idx as i64)
                .unwrap_or(EOS_TOKEN_ID);

            log::trace!("Step {}: next token = {}", step, next_token);

            // Check for EOS token
            if next_token == EOS_TOKEN_ID {
                log::debug!("EOS token reached at step {}", step);
                break;
            }

            tokens.push(next_token);
        }

        // Remove BOS token from output
        if !tokens.is_empty() && tokens[0] == 1 {
            tokens.remove(0);
        }

        Ok(tokens)
    }

    /// Decode token IDs to text
    fn tokens_to_text(&self, tokens: &[i64]) -> Result<String, MoonshineError> {
        // Convert i64 tokens to u32 for tokenizer
        let token_ids: Vec<u32> = tokens.iter().map(|&t| t as u32).collect();

        let text = self.tokenizer.decode(&token_ids, true)?;

        Ok(text.trim().to_string())
    }

    /// Transcribe audio samples to text
    pub fn transcribe(&mut self, audio_samples: Vec<f32>) -> Result<String, MoonshineError> {
        let samples_len = audio_samples.len();
        log::debug!(
            "Moonshine transcribing {} samples ({:.1}s duration)",
            samples_len,
            samples_len as f64 / 16000.0
        );

        // Encode audio to hidden states
        let encoder_output = self.encode(&audio_samples)?;

        // Decode hidden states to tokens
        let tokens = self.decode(&encoder_output)?;

        log::debug!("Decoded {} tokens", tokens.len());

        // Convert tokens to text
        let text = self.tokens_to_text(&tokens)?;

        log::debug!("Moonshine transcription: '{}'", text);

        Ok(text)
    }
}
