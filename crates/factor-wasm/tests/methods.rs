//! The method history is global state, so these checks live in their own test binary
//! and run one after another.

use factor_wasm::{factor_decimal, methods};

#[test]
fn records_the_methods_used_in_order() {
    let balanced = "900000000000000000000000000004580000000000000000000000000005313";

    factor_decimal("3233").unwrap();
    assert_eq!(methods(), ["Trial division", "Baillie–PSW primality test"]);

    factor_decimal(balanced).unwrap();
    let used = methods();
    let position = |method: &str| used.iter().position(|m| m == method);

    assert_eq!(position("Trial division"), Some(0));
    assert!(position("Pollard rho") < position("Quadratic sieve (SIQS)"), "{used:?}");
    assert!(position("Quadratic sieve (SIQS)").is_some(), "{used:?}");
    assert_eq!(used.last().map(String::as_str), Some("Baillie–PSW primality test"));
}
