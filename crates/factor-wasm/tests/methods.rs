//! The method history is global state, so these checks live in their own test binary
//! and hold a lock to run one after another.

use std::sync::Mutex;

use factor_wasm::{factor_decimal, factor_with, methods, Method};
use num_bigint::BigUint;

static SERIAL: Mutex<()> = Mutex::new(());

#[test]
fn records_the_methods_used_in_order() {
    let _serial = SERIAL.lock().unwrap();
    let balanced = "900000000000000000000000000004580000000000000000000000000005313";

    factor_decimal("3233").unwrap();
    assert_eq!(methods(), ["Trial division", "Baillie–PSW primality test"]);

    factor_decimal(balanced).unwrap();
    let used = methods();
    let position = |method: &str| used.iter().position(|m| m == method);

    let p_minus_1 = position("Pollard P−1").expect("P−1 ran");
    let sieve = position("Quadratic sieve (SIQS)").expect("the sieve ran");

    assert_eq!(position("Trial division"), Some(0));
    assert!(p_minus_1 < sieve, "{used:?}");
    assert!(!used.iter().any(|m| m == "Pollard rho"), "{used:?}");
    assert_eq!(used.last().map(String::as_str), Some("Baillie–PSW primality test"));
}

#[test]
fn single_methods_say_when_they_did_not_run() {
    let _serial = SERIAL.lock().unwrap();
    let mersenne = |e: u32| (BigUint::from(1u8) << e) - 1u8;
    let above_512_bits = (mersenne(521) * mersenne(607)).to_string();
    let above_2_10000 = (BigUint::from(1u8) << 10_000u32) + 1u8;

    factor_with(&above_512_bits, Method::Siqs).unwrap();
    assert_eq!(methods()[0], "Not run: this method works up to 512 bits");

    factor_with(&above_2_10000.to_string(), Method::Google).unwrap();
    assert_eq!(methods()[0], "Google's algorithm: its steps above 2^10000 are not implemented here");
}
