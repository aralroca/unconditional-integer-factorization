use factor_wasm::{factor_decimal, Factorization};
use num_bigint::BigUint;

fn mersenne(exponent: u32) -> BigUint {
    (BigUint::from(1u8) << exponent) - 1u8
}

fn complete(primes: &[&str]) -> Factorization {
    Factorization {
        primes: primes.iter().map(|p| p.to_string()).collect(),
        unfactored: vec![],
    }
}

#[test]
fn factors_small_composites() {
    assert_eq!(factor_decimal("3233"), Ok(complete(&["53", "61"])));
    assert_eq!(
        factor_decimal("600851475143"),
        Ok(complete(&["71", "839", "1471", "6857"]))
    );
}

#[test]
fn keeps_multiplicity_in_ascending_order() {
    let twos = vec!["2"; 64];

    assert_eq!(factor_decimal("18446744073709551616"), Ok(complete(&twos)));
    assert_eq!(
        factor_decimal("1_000_000"),
        Ok(complete(&["2", "2", "2", "2", "2", "2", "5", "5", "5", "5", "5", "5"]))
    );
}

#[test]
fn reports_primes_as_themselves() {
    assert_eq!(factor_decimal("1099511627791"), Ok(complete(&["1099511627791"])));
    assert_eq!(
        factor_decimal(&mersenne(61).to_string()),
        Ok(complete(&["2305843009213693951"]))
    );
}

#[test]
fn splits_semiprimes() {
    assert_eq!(
        factor_decimal(&mersenne(67).to_string()),
        Ok(complete(&["193707721", "761838257287"]))
    );
    assert_eq!(
        factor_decimal("1000000016000000063"),
        Ok(complete(&["1000000007", "1000000009"]))
    );
    assert_eq!(
        factor_decimal("300000000000000438880000000000084056037"),
        Ok(complete(&["10000000000000012363", "30000000000000006799"]))
    );
}

#[test]
fn handles_numbers_above_512_bits() {
    let m607 = mersenne(607);
    let n = BigUint::from(243u32 * 9973u32) * &m607;
    let with_semiprime_cofactor = BigUint::from(7u8) << 600u32;
    let m607 = m607.to_string();

    assert_eq!(
        factor_decimal(&n.to_string()),
        Ok(complete(&["3", "3", "3", "3", "3", "9973", &m607]))
    );
    assert_eq!(
        factor_decimal(&(with_semiprime_cofactor * mersenne(67)).to_string()),
        Ok(complete(
            &[vec!["2"; 600], vec!["7", "193707721", "761838257287"]].concat()
        ))
    );
    assert_eq!(
        factor_decimal(&mersenne(1279).to_string()),
        Ok(complete(&[&mersenne(1279).to_string()]))
    );
}

#[test]
fn reports_a_large_cofactor_it_cannot_split() {
    let n = mersenne(521) * mersenne(607);

    assert_eq!(
        factor_decimal(&n.to_string()),
        Ok(Factorization { primes: vec![], unfactored: vec![n.to_string()] })
    );
}

#[test]
fn rejects_invalid_input() {
    for input in ["", "   ", "abc", "12a", "-5", "0", "1", "3.5"] {
        assert_eq!(
            factor_decimal(input),
            Err("Enter an integer greater than 1.".to_string()),
            "input {input:?}"
        );
    }
}
