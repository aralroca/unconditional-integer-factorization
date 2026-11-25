//! Integer factorization for the browser.
//!
//! Every input first loses its prime factors below 2^14 (num-prime trial division,
//! any size). A cofactor of at most 512 bits then goes to yamaquasi (Pollard rho,
//! P−1, ECM and the self-initialising quadratic sieve); a larger one only gets a
//! primality test. Every reported prime passes a Baillie–PSW test.

use std::collections::BTreeMap;
use std::str::FromStr;

use num_bigint::BigUint;
use num_prime::factor::trial_division;
use num_prime::nt_funcs::{is_prime, primes};
use num_prime::PrimalityTestConfig;
use wasm_bindgen::prelude::*;
use yamaquasi::{Algo, Preferences, Uint, Verbosity};

/// Largest input yamaquasi accepts (the limit of its own command line tool).
const YAMAQUASI_MAX_BITS: u64 = 512;

/// Trial division bound. Cofactors above 512 bits are not split further: num-prime's
/// general splitter (`factors`) searches for a divisor without any step limit, so a
/// hard 1000+ bit composite would never return.
const TRIAL_DIVISION_LIMIT: u64 = 1 << 14;

/// Result of a factorization.
#[wasm_bindgen(getter_with_clone)]
#[derive(Debug, Default, PartialEq, Eq)]
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

/// Factors a decimal integer greater than 1 (spaces, `_` and `,` are ignored).
#[wasm_bindgen]
pub fn factorize(input: &str) -> Result<Factorization, JsError> {
    factor_decimal(input).map_err(|message| JsError::new(&message))
}

/// Same as [`factorize`], usable outside WebAssembly (tests, native builds).
pub fn factor_decimal(input: &str) -> Result<Factorization, String> {
    let n = parse(input)?;
    let (powers, unfactored) = split(n.clone());

    Ok(Factorization {
        n: n.to_string(),
        primes: powers.keys().map(BigUint::to_string).collect(),
        exponents: powers.into_values().collect(),
        unfactored: unfactored.iter().map(BigUint::to_string).collect(),
    })
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

/// Splits `n` into prime powers plus the composite parts it could not split.
fn split(n: BigUint) -> (BTreeMap<BigUint, u32>, Vec<BigUint>) {
    let (small, rest) = trial_division(primes(TRIAL_DIVISION_LIMIT).into_iter(), n, None);
    let cofactor = rest.unwrap_or_else(|unfinished| unfinished);
    let mut powers: BTreeMap<BigUint, u32> = small
        .into_iter()
        .map(|(p, e)| (BigUint::from(p), e as u32))
        .collect();
    let mut unfactored = Vec::new();

    let large = if cofactor <= BigUint::from(1u8) {
        vec![]
    } else if cofactor.bits() <= YAMAQUASI_MAX_BITS {
        with_yamaquasi(cofactor)
    } else {
        vec![cofactor]
    };
    for factor in large {
        if is_prime(&factor, Some(PrimalityTestConfig::bpsw())).probably() {
            *powers.entry(factor).or_default() += 1;
        } else {
            unfactored.push(factor);
        }
    }
    (powers, unfactored)
}

fn with_yamaquasi(n: BigUint) -> Vec<BigUint> {
    let mut prefs = Preferences::default();
    prefs.verbosity = Verbosity::Silent;
    let as_uint = Uint::from_str(&n.to_string()).expect("at most 512 bits fits in U1024");

    match yamaquasi::factor(as_uint, Algo::Auto, &prefs) {
        Ok(found) => found
            .iter()
            .map(|f| BigUint::from_str(&f.to_string()).expect("decimal output"))
            .collect(),
        Err(_) => vec![n],
    }
}
