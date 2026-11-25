//! One method on its own, so the page can compare methods on the same number.
//!
//! Trial division and Pollard rho never give up: when they are too slow for the number
//! they keep reporting progress until the page cancels them (which terminates the
//! worker). That is the point of the comparison. P−1, ECM and the quadratic sieve stop
//! when yamaquasi gives up, and the parts they could not split are reported as such.

use std::str::FromStr;

use num_bigint::BigUint;
use num_prime::factor::pollard_rho;
use yamaquasi::{Algo, Preferences, Verbosity};

use crate::engine::{is_probable_prime, to_biguint, to_uint, YAMAQUASI_MAX_BITS};
use crate::progress::{self, Lane};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Method {
    /// The automatic strategy (trial division, P−1, ECM racing the quadratic sieve).
    Auto,
    TrialDivision,
    PollardRho,
    PollardPm1,
    Ecm,
    Siqs,
    /// The paper's algorithm. Below 2^10000 its first step is trial division, and every
    /// number a browser can handle is far below that, so this runs trial division.
    Google,
}

impl FromStr for Method {
    type Err = String;

    fn from_str(name: &str) -> Result<Self, String> {
        match name {
            "auto" => Ok(Self::Auto),
            "trial" => Ok(Self::TrialDivision),
            "rho" => Ok(Self::PollardRho),
            "pm1" => Ok(Self::PollardPm1),
            "ecm" => Ok(Self::Ecm),
            "siqs" => Ok(Self::Siqs),
            "google" => Ok(Self::Google),
            _ => Err(format!("Unknown method {name:?}.")),
        }
    }
}

const TRIAL_DIVISION: &str = "Trial division";
const GOOGLE: &str = "Google's algorithm (trial division below 2^10000)";
const GOOGLE_NOT_IMPLEMENTED: &str = "Google's algorithm: its steps above 2^10000 are not implemented here";
const NOT_RUN_ABOVE_512_BITS: &str = "Not run: this method works up to 512 bits";

/// Below 2^10000 (that is, up to 10 000 bits) the paper's algorithm is trial division.
const GOOGLE_TRIAL_DIVISION_BITS: u64 = 10_000;

/// Report trial-division progress every this many candidate divisors.
const REPORT_EVERY: u64 = 1 << 22;

/// First Pollard rho attempt length; each new attempt doubles it.
const RHO_FIRST_STEPS: usize = 1 << 16;

/// Runs `method` alone (not `Auto`); returns the parts it found, primes or composites.
pub fn run(n: BigUint, method: Method) -> Vec<BigUint> {
    match method {
        Method::Auto => unreachable!("Auto is the engine's own strategy"),
        Method::TrialDivision => trial_division(n, TRIAL_DIVISION),
        Method::Google => google(n),
        Method::PollardRho => rho(n),
        Method::PollardPm1 => yamaquasi_only(n, Algo::Pm1, "Pollard P−1"),
        Method::Ecm => yamaquasi_only(n, Algo::Ecm, "ECM (elliptic curves)"),
        Method::Siqs => yamaquasi_only(n, Algo::Siqs, "Quadratic sieve (SIQS)"),
    }
}

/// The paper's algorithm: trial division below 2^10000; its other steps are not implemented.
fn google(n: BigUint) -> Vec<BigUint> {
    if n.bits() > GOOGLE_TRIAL_DIVISION_BITS {
        progress::report(Lane::Main, GOOGLE_NOT_IMPLEMENTED, None);
        return vec![n];
    }
    trial_division(n, GOOGLE)
}

/// Divides by 2, 3, 5, 7, 9… up to √n. Exact, and hopeless for large factors.
fn trial_division(mut n: BigUint, label: &'static str) -> Vec<BigUint> {
    let mut parts = Vec::new();
    let mut digits = n.to_u64_digits();
    let mut limit = isqrt_u64(&n);
    let mut d: u64 = 2;

    progress::report(Lane::Main, label, None);
    while d <= limit {
        if remainder(&digits, d) == 0 {
            n /= d;
            parts.push(BigUint::from(d));
            digits = n.to_u64_digits();
            limit = isqrt_u64(&n);
            continue;
        }
        d += if d == 2 { 1 } else { 2 };
        if d & (REPORT_EVERY - 1) == 1 {
            progress::report(Lane::Main, label, Some(trial_detail(d, &n)));
        }
    }
    parts.push(n);
    parts
}

fn trial_detail(d: u64, n: &BigUint) -> String {
    let needed = n.sqrt();

    format!("tried every divisor below {}; it may need up to √N ≈ {}", sci(d), magnitude(&needed))
}

/// `n mod d` from the 64-bit digits of `n` (least significant first).
fn remainder(digits: &[u64], d: u64) -> u64 {
    let d = u128::from(d);

    digits.iter().rev().fold(0u128, |rem, &digit| ((rem << 64) | u128::from(digit)) % d) as u64
}

fn isqrt_u64(n: &BigUint) -> u64 {
    u64::try_from(&n.sqrt()).unwrap_or(u64::MAX)
}

/// Pollard rho alone, on any size: random walks x² + c with a growing step budget.
fn rho(n: BigUint) -> Vec<BigUint> {
    let mut steps: u64 = 0;

    progress::report(Lane::Main, "Pollard rho", None);
    split_with_rho(n, &mut steps)
}

fn split_with_rho(n: BigUint, steps: &mut u64) -> Vec<BigUint> {
    if n <= BigUint::from(1u8) || is_probable_prime(&n) {
        return vec![n];
    }
    let mut budget = RHO_FIRST_STEPS;

    for offset in 1u32.. {
        let (found, used) = pollard_rho(&n, BigUint::from(2u8), BigUint::from(offset), budget);
        *steps += used as u64;
        progress::report(Lane::Main, "Pollard rho", Some(format!("{} steps so far", sci(*steps))));
        if let Some(d) = found.filter(|d| d > &BigUint::from(1u8) && d < &n) {
            let other = &n / &d;
            return [split_with_rho(d, steps), split_with_rho(other, steps)].concat();
        }
        budget = budget.saturating_mul(2);
    }
    unreachable!("the loop above only ends by returning")
}

/// One of yamaquasi's algorithms on its own, on every thread (numbers up to 512 bits).
fn yamaquasi_only(n: BigUint, algo: Algo, label: &'static str) -> Vec<BigUint> {
    let mut prefs = Preferences::default();

    if n.bits() > YAMAQUASI_MAX_BITS {
        progress::report(Lane::Main, NOT_RUN_ABOVE_512_BITS, None);
        return vec![n];
    }
    progress::report(Lane::Main, label, None);
    prefs.verbosity = Verbosity::Silent;
    prefs.threads = Some(rayon::current_num_threads());
    prefs.progress = Some(Box::new(progress::from_yamaquasi));
    match yamaquasi::factor(to_uint(&n), algo, &prefs) {
        Ok(found) => found.iter().map(to_biguint).collect(),
        Err(_) => vec![n],
    }
}

/// `x` as "4.2 × 10^9" (or plain digits below 10 000).
fn sci(x: u64) -> String {
    if x < 10_000 {
        return x.to_string();
    }
    // Rust's `e` formatting rounds the mantissa first, so 99 999 is "1.0e5", not "10.0e4".
    let formatted = format!("{:.1e}", x as f64);
    let (mantissa, exponent) = formatted.split_once('e').unwrap_or((&formatted, "0"));

    format!("{mantissa} × 10^{exponent}")
}

/// Order of magnitude of a possibly huge number, as "10^19".
fn magnitude(n: &BigUint) -> String {
    format!("10^{}", n.to_string().len().saturating_sub(1))
}

#[cfg(test)]
mod tests {
    use super::sci;

    #[test]
    fn writes_large_counts_in_scientific_notation() {
        assert_eq!(sci(1_234), "1234");
        assert_eq!(sci(4_194_305), "4.2 × 10^6");
        assert_eq!(sci(99_999), "1.0 × 10^5");
    }
}
