//! The factoring strategy.
//!
//! 1. Trial division by every prime below 2^14 (num-prime, any size).
//! 2. A cofactor above 512 bits only gets a Baillie–PSW primality test.
//! 3. Otherwise yamaquasi's automatic strategy runs (Pollard rho, P−1, ECM, then the
//!    self-initialising quadratic sieve) on every thread. From 200 bits on, an extra
//!    ECM search races it on one thread: whichever finds a factor first stops the other.

use std::collections::BTreeMap;
use std::str::FromStr;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

use num_bigint::BigUint;
use num_prime::factor::trial_division;
use num_prime::nt_funcs::{is_prime, primes};
use num_prime::PrimalityTestConfig;
use yamaquasi::{Algo, Preferences, Uint, Verbosity};

use crate::progress::{self, Lane};

/// Largest input yamaquasi accepts (the limit of its own command line tool).
const YAMAQUASI_MAX_BITS: u64 = 512;

/// Trial division bound. Cofactors above 512 bits are not split further: num-prime's
/// general splitter (`factors`) searches for a divisor without any step limit, so a
/// hard 1000+ bit composite would never return.
const TRIAL_DIVISION_LIMIT: u64 = 1 << 14;

/// Below this size the quadratic sieve takes seconds at most: no race needed.
const RACE_MIN_BITS: u64 = 200;

/// GMP-ECM's recommended stage 1 bounds and curve counts per factor size (digits).
const ECM_SCHEDULE: [(u32, usize, usize); 6] = [
    (20, 11_000, 74),
    (25, 50_000, 214),
    (30, 250_000, 430),
    (35, 1_000_000, 904),
    (40, 3_000_000, 2_350),
    (45, 11_000_000, 4_480),
];

/// Curves per ECM call, so a lost race is noticed quickly.
const ECM_BATCH: usize = 8;

pub type Powers = BTreeMap<BigUint, u32>;

/// Splits `n` into prime powers plus the composite parts it could not split.
pub fn split(n: BigUint) -> (Powers, Vec<BigUint>) {
    progress::report(Lane::Main, "Trial division", Some("primes below 16 384".into()));
    let (small, rest) = trial_division(primes(TRIAL_DIVISION_LIMIT).into_iter(), n, None);
    let cofactor = rest.unwrap_or_else(|unfinished| unfinished);
    let mut powers: Powers = small.into_iter().map(|(p, e)| (BigUint::from(p), e as u32)).collect();
    let mut unfactored = Vec::new();

    let large = if cofactor <= BigUint::from(1u8) {
        vec![]
    } else if cofactor.bits() <= YAMAQUASI_MAX_BITS && !is_probable_prime(&cofactor) {
        race(cofactor)
    } else {
        vec![cofactor]
    };
    progress::report(Lane::Main, "Baillie–PSW primality test", None);
    for factor in large {
        if is_probable_prime(&factor) {
            *powers.entry(factor).or_default() += 1;
        } else {
            unfactored.push(factor);
        }
    }
    progress::finish(Lane::Main);
    (powers, unfactored)
}

/// Fully factors `n` (at most 512 bits); returns the factors, or `n` if it gave up.
fn race(n: BigUint) -> Vec<BigUint> {
    if n.bits() < RACE_MIN_BITS {
        return automatic(&n, Arc::new(AtomicBool::new(false))).unwrap_or_else(|| vec![n]);
    }
    let stop = Arc::new(AtomicBool::new(false));
    let (sieved, hunted) = rayon::join(
        || automatic(&n, stop.clone()).inspect(|_| stop.store(true, Ordering::Relaxed)),
        || ecm_search(&n, stop.clone()).inspect(|_| stop.store(true, Ordering::Relaxed)),
    );
    progress::finish(Lane::Race);

    match (hunted, sieved) {
        (Some(p), _) => {
            let q = &n / &p;
            [race(p), race(q)].concat()
        }
        (None, Some(factors)) => factors,
        (None, None) => vec![n],
    }
}

/// yamaquasi's automatic strategy on every thread; `None` if it failed or was stopped.
fn automatic(n: &BigUint, stop: Arc<AtomicBool>) -> Option<Vec<BigUint>> {
    let mut prefs = Preferences::default();
    prefs.verbosity = Verbosity::Silent;
    prefs.threads = Some(rayon::current_num_threads());
    prefs.should_abort = Some(Box::new(move || stop.load(Ordering::Relaxed)));
    prefs.progress = Some(Box::new(progress::from_yamaquasi));
    progress::report(Lane::Main, "Pollard rho", None);

    let found = yamaquasi::factor(to_uint(n), Algo::Auto, &prefs).ok()?;
    let product: BigUint = found.iter().map(to_biguint).product();

    (product == *n).then(|| found.iter().map(to_biguint).collect())
}

/// ECM on one thread with growing bounds; returns a non-trivial factor of `n`.
fn ecm_search(n: &BigUint, stop: Arc<AtomicBool>) -> Option<BigUint> {
    let mut prefs = Preferences::default();
    prefs.verbosity = Verbosity::Silent;
    let flag = stop.clone();
    prefs.should_abort = Some(Box::new(move || flag.load(Ordering::Relaxed)));

    for (digits, b1, curves) in ECM_SCHEDULE {
        let detail = format!("racing the sieve for factors up to {digits} digits (B1 = {b1})");
        progress::report(Lane::Race, "ECM (elliptic curves)", Some(detail));
        for _ in 0..curves.div_ceil(ECM_BATCH) {
            if stop.load(Ordering::Relaxed) {
                return None;
            }
            let found = yamaquasi::ecm::ecm(to_uint(n), ECM_BATCH, b1, 100.0 * b1 as f64, &prefs, None);
            let factor = found.into_iter().flatten().map(|f| to_biguint(&f)).find(|f| f > &BigUint::from(1u8) && f < n);
            if factor.is_some() {
                return factor;
            }
        }
    }
    None
}

fn is_probable_prime(n: &BigUint) -> bool {
    is_prime(n, Some(PrimalityTestConfig::bpsw())).probably()
}

fn to_uint(n: &BigUint) -> Uint {
    Uint::from_str(&n.to_string()).expect("at most 512 bits fits in U1024")
}

fn to_biguint(n: &Uint) -> BigUint {
    BigUint::from_str(&n.to_string()).expect("decimal output")
}
