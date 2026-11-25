//! Multithreaded integer factorization for the browser.
//!
//! JavaScript calls [`start`], then polls [`activity`] and [`take_result`] while the
//! work runs on a rayon thread pool (Web Workers through wasm-bindgen-rayon).
//! [`factor_decimal`] runs the same strategy synchronously (tests, native builds).

mod engine;
mod progress;

use std::str::FromStr;
use std::sync::Mutex;

use num_bigint::BigUint;
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
pub use wasm_bindgen_rayon::init_thread_pool;

/// Result of a factorization.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Factorization {
    /// The parsed input, in canonical decimal form.
    pub n: String,
    /// Distinct prime factors in ascending order.
    pub primes: Vec<String>,
    /// Exponent of each prime in `primes`.
    pub exponents: Vec<u32>,
    /// Composite cofactors that could not be split (empty when complete).
    pub unfactored: Vec<String>,
}

static RESULT: Mutex<Option<Factorization>> = Mutex::new(None);

/// Factors a decimal integer greater than 1 (spaces, `_` and `,` are ignored).
pub fn factor_decimal(input: &str) -> Result<Factorization, String> {
    let n = parse(input)?;

    progress::reset();
    Ok(factor(n))
}

/// Starts factoring `input` in the background. Fails at once on invalid input.
#[wasm_bindgen]
pub fn start(input: &str) -> Result<(), JsError> {
    let n = parse(input).map_err(|message| JsError::new(&message))?;

    progress::reset();
    *RESULT.lock().unwrap() = None;
    rayon::spawn(move || {
        let result = factor(n);
        *RESULT.lock().unwrap() = Some(result);
    });
    Ok(())
}

/// What is running right now, one line per parallel task.
#[wasm_bindgen]
pub fn activity() -> Vec<String> {
    progress::activity()
}

/// Methods used by the current run, in the order they started.
#[wasm_bindgen]
pub fn methods() -> Vec<String> {
    progress::methods()
}

/// The finished factorization, once; `None` while still running.
#[wasm_bindgen(js_name = takeResult)]
pub fn take_result() -> Option<Factorization> {
    RESULT.lock().unwrap().take()
}

fn factor(n: BigUint) -> Factorization {
    let (powers, unfactored) = engine::split(n.clone());

    Factorization {
        n: n.to_string(),
        primes: powers.keys().map(BigUint::to_string).collect(),
        exponents: powers.into_values().collect(),
        unfactored: unfactored.iter().map(BigUint::to_string).collect(),
    }
}

fn parse(input: &str) -> Result<BigUint, String> {
    let invalid = || "Enter an integer greater than 1.".to_string();
    let digits: String = input
        .chars()
        .filter(|c| !c.is_whitespace() && *c != '_' && *c != ',')
        .collect();

    if digits.is_empty() || !digits.bytes().all(|b| b.is_ascii_digit()) {
        return Err(invalid());
    }
    let n = BigUint::from_str(&digits).map_err(|_| invalid())?;
    if n < BigUint::from(2u8) {
        return Err(invalid());
    }
    Ok(n)
}
