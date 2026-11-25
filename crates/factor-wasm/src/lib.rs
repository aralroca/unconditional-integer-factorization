//! Multithreaded integer factorization for the browser.
//!
//! JavaScript calls [`start`] with a method (`auto` or a single algorithm), then polls
//! [`activity`] and [`take_result`] while the work runs on a rayon thread pool (Web
//! Workers through wasm-bindgen-rayon). [`factor_with`] runs the same thing
//! synchronously (tests, native builds).

mod engine;
mod progress;
mod single;

pub use single::Method;

use std::str::FromStr;
use std::sync::{Mutex, Once};

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
    /// Composite cofactors that could not be split (empty when complete), ascending.
    pub unfactored: Vec<String>,
    /// Exponent of each composite in `unfactored`.
    pub unfactored_exponents: Vec<u32>,
}

static RESULT: Mutex<Option<Factorization>> = Mutex::new(None);

/// Message of a panic on a worker thread. WebAssembly is built with panic=abort, so the
/// thread dies; the hook records why so that the page does not wait forever.
static FAILURE: Mutex<Option<String>> = Mutex::new(None);

/// Factors a decimal integer greater than 1 with the automatic strategy (spaces, `_`
/// and `,` are ignored).
pub fn factor_decimal(input: &str) -> Result<Factorization, String> {
    factor_with(input, Method::Auto)
}

/// Factors a decimal integer greater than 1 with `method`.
pub fn factor_with(input: &str, method: Method) -> Result<Factorization, String> {
    let n = parse(input)?;

    progress::reset();
    Ok(factor(n, method))
}

/// Starts factoring `input` with `method` (`auto`, `trial`, `rho`, `pm1`, `ecm`, `siqs`
/// or `google`) in the background. Fails at once on invalid input.
#[wasm_bindgen]
pub fn start(input: &str, method: &str) -> Result<(), JsError> {
    let n = parse(input).map_err(|message| JsError::new(&message))?;
    let method = Method::from_str(method).map_err(|message| JsError::new(&message))?;

    record_panics();
    progress::reset();
    *RESULT.lock().unwrap() = None;
    *FAILURE.lock().unwrap() = None;
    rayon::spawn(move || {
        let result = factor(n, method);
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

/// Why a worker thread panicked, once; the run will not finish.
#[wasm_bindgen(js_name = takeFailure)]
pub fn take_failure() -> Option<String> {
    FAILURE.lock().unwrap().take()
}

fn record_panics() {
    static HOOK: Once = Once::new();

    HOOK.call_once(|| {
        std::panic::set_hook(Box::new(|info| {
            if let Ok(mut failure) = FAILURE.try_lock() {
                *failure = Some(info.to_string());
            }
        }))
    });
}

/// The finished factorization, once; `None` while still running.
#[wasm_bindgen(js_name = takeResult)]
pub fn take_result() -> Option<Factorization> {
    RESULT.lock().unwrap().take()
}

fn factor(n: BigUint, method: Method) -> Factorization {
    let (powers, unfactored) = engine::factor(n.clone(), method);

    Factorization {
        n: n.to_string(),
        primes: powers.keys().map(BigUint::to_string).collect(),
        exponents: powers.into_values().collect(),
        unfactored: unfactored.keys().map(BigUint::to_string).collect(),
        unfactored_exponents: unfactored.into_values().collect(),
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
