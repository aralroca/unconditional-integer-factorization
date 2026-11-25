//! Each method run on its own. Numbers are chosen so that the method finishes quickly.

use std::str::FromStr;

use factor_wasm::{factor_with, Factorization, Method};
use num_bigint::BigUint;

const M67: &str = "147573952589676412927"; // 193707721 × 761838257287
const TWIN_BILLIONS: &str = "1000000016000000063"; // 1000000007 × 1000000009
const SEMIPRIME_39: &str = "300000000000000438880000000000084056037";

fn primes_of(result: Result<Factorization, String>) -> Vec<String> {
    let factorization = result.expect("valid input");

    assert!(factorization.unfactored.is_empty(), "{factorization:?}");
    factorization.primes
}

#[test]
fn trial_division_finds_factors_up_to_its_bound() {
    assert_eq!(primes_of(factor_with("3233", Method::TrialDivision)), ["53", "61"]);
    assert_eq!(
        primes_of(factor_with("1000002936999811", Method::TrialDivision)),
        ["1000003", "999999937"]
    );
}

#[test]
fn googles_algorithm_runs_trial_division_at_browser_sizes() {
    assert_eq!(
        factor_with("1000002936999811", Method::Google),
        factor_with("1000002936999811", Method::TrialDivision)
    );
}

#[test]
fn pollard_rho_splits_numbers_of_any_size() {
    assert_eq!(primes_of(factor_with(TWIN_BILLIONS, Method::PollardRho)), ["1000000007", "1000000009"]);
    assert_eq!(primes_of(factor_with(M67, Method::PollardRho)), ["193707721", "761838257287"]);
    assert_eq!(primes_of(factor_with("1000000007", Method::PollardRho)), ["1000000007"]);
}

#[test]
fn pollard_p_minus_1_needs_exactly_one_smooth_p_minus_1() {
    // 1000000009 − 1 = 2³·3²·7·109²·167 is smooth; 1000000007 − 1 = 2·500000003 is not.
    assert_eq!(primes_of(factor_with(TWIN_BILLIONS, Method::PollardPm1)), ["1000000007", "1000000009"]);

    // Both p − 1 of 2^67 − 1 are smooth, so the gcd is N itself and P−1 cannot split it.
    assert_eq!(factor_with(M67, Method::PollardPm1).unwrap().unfactored, [M67]);
}

#[test]
fn ecm_and_the_quadratic_sieve_run_alone() {
    assert_eq!(primes_of(factor_with(M67, Method::Ecm)), ["193707721", "761838257287"]);
    assert_eq!(
        primes_of(factor_with(SEMIPRIME_39, Method::Siqs)),
        ["10000000000000012363", "30000000000000006799"]
    );
}

#[test]
fn yamaquasi_methods_leave_numbers_above_512_bits_unsplit() {
    let mersenne = |e: u32| (BigUint::from(1u8) << e) - 1u8;
    let n = (mersenne(521) * mersenne(607)).to_string();
    let result = factor_with(&n, Method::Siqs).unwrap();

    assert!(result.primes.is_empty());
    assert_eq!(result.unfactored, [n]);
}

#[test]
fn parses_method_names() {
    let names = ["auto", "trial", "rho", "pm1", "ecm", "siqs", "google"];

    assert!(names.iter().all(|name| Method::from_str(name).is_ok()));
    assert_eq!(Method::from_str("nfs"), Err("Unknown method \"nfs\".".to_string()));
}
