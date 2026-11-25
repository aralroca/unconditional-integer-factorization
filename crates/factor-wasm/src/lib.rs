//! Integer factorization for the browser.
//!
//! Numbers up to 512 bits go straight to yamaquasi (trial division, Pollard rho,
//! P−1, ECM and the self-initialising quadratic sieve). Larger numbers first lose
//! their prime factors below 2^14 (num-prime trial division on arbitrary-size
//! integers); a cofactor of 512 bits or less is then handed to yamaquasi, and a
//! larger one is reported as prime or as unfactored. Every reported prime passes a
//! Baillie–PSW test.

use std::str::FromStr;

use num_bigint::BigUint;
use num_prime::nt_funcs::{is_prime, primes};
use num_prime::PrimalityTestConfig;
use wasm_bindgen::prelude::*;
use yamaquasi::{Algo, Preferences, Uint, Verbosity};

/// Largest input yamaquasi accepts (the limit of its own command line tool).
const YAMAQUASI_MAX_BITS: u64 = 512;

/// Trial division bound for numbers above [`YAMAQUASI_MAX_BITS`].
const TRIAL_DIVISION_LIMIT: u64 = 1 << 14;

/// Result of a factorization.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Default, PartialEq, Eq)]
pub struct Factorization {
    /// Prime factors in ascending order, repeated by multiplicity.
    pub primes: Vec<String>,
    /// Composite cofactors that could not be split (empty when complete).
    pub unfactored: Vec<String>,
}

/// Factors a decimal integer greater than 1.
#[wasm_bindgen]
pub fn factorize(input: &str) -> Result<Factorization, JsError> {
    factor_decimal(input).map_err(|message| JsError::new(&message))
}

/// Same as [`factorize`], usable outside WebAssembly (tests, native builds).
pub fn factor_decimal(input: &str) -> Result<Factorization, String> {
    let n = parse(input)?;
    let mut primes = Vec::new();
    let mut unfactored = Vec::new();

    for part in split(n) {
        match part {
            Part::Prime(p) => primes.push(p),
            Part::Composite(c) => unfactored.push(c.to_string()),
        }
    }
    primes.sort();
    Ok(Factorization {
        primes: primes.iter().map(BigUint::to_string).collect(),
        unfactored,
    })
}

enum Part {
    Prime(BigUint),
    Composite(BigUint),
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

fn split(n: BigUint) -> Vec<Part> {
    if n.bits() <= YAMAQUASI_MAX_BITS {
        return with_yamaquasi(n);
    }
    let (small, cofactor) = strip_small_primes(n);
    let mut parts: Vec<Part> = small.into_iter().map(Part::Prime).collect();

    if cofactor.bits() > YAMAQUASI_MAX_BITS {
        parts.push(classify(cofactor));
    } else if cofactor > BigUint::from(1u8) {
        parts.extend(with_yamaquasi(cofactor));
    }
    parts
}

/// Divides out every prime below [`TRIAL_DIVISION_LIMIT`]. Above 512 bits this is
/// all we do: general-purpose splitting of such numbers can run for hours.
fn strip_small_primes(mut n: BigUint) -> (Vec<BigUint>, BigUint) {
    let mut found = Vec::new();

    for p in primes(TRIAL_DIVISION_LIMIT).into_iter().map(BigUint::from) {
        while &n % &p == BigUint::ZERO {
            n /= &p;
            found.push(p.clone());
        }
    }
    (found, n)
}

fn with_yamaquasi(n: BigUint) -> Vec<Part> {
    let mut prefs = Preferences::default();
    prefs.verbosity = Verbosity::Silent;
    let as_uint = Uint::from_str(&n.to_string()).expect("at most 512 bits fits in U1024");

    match yamaquasi::factor(as_uint, Algo::Auto, &prefs) {
        Ok(found) => found
            .iter()
            .map(|f| classify(BigUint::from_str(&f.to_string()).expect("decimal output")))
            .collect(),
        Err(_) => vec![Part::Composite(n)],
    }
}

fn classify(n: BigUint) -> Part {
    if is_prime(&n, Some(PrimalityTestConfig::bpsw())).probably() {
        Part::Prime(n)
    } else {
        Part::Composite(n)
    }
}
