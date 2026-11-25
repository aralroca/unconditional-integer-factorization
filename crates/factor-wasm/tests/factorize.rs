use factor_wasm::{factor_decimal, Factorization};
use num_bigint::BigUint;

fn mersenne(exponent: u32) -> BigUint {
    (BigUint::from(1u8) << exponent) - 1u8
}

fn complete(n: &str, powers: &[(&str, u32)]) -> Factorization {
    Factorization {
        n: n.to_string(),
        primes: powers.iter().map(|(p, _)| p.to_string()).collect(),
        exponents: powers.iter().map(|(_, e)| *e).collect(),
        ..Factorization::default()
    }
}

#[test]
fn factors_small_composites() {
    assert_eq!(factor_decimal("3233"), Ok(complete("3233", &[("53", 1), ("61", 1)])));
    assert_eq!(
        factor_decimal("600851475143"),
        Ok(complete("600851475143", &[("71", 1), ("839", 1), ("1471", 1), ("6857", 1)]))
    );
}

#[test]
fn groups_powers_and_returns_the_canonical_input() {
    assert_eq!(
        factor_decimal("18446744073709551616"),
        Ok(complete("18446744073709551616", &[("2", 64)]))
    );
    assert_eq!(
        factor_decimal(" 0_001,000 000 "),
        Ok(complete("1000000", &[("2", 6), ("5", 6)]))
    );
}

#[test]
fn reports_primes_as_themselves() {
    assert_eq!(factor_decimal("1099511627791"), Ok(complete("1099511627791", &[("1099511627791", 1)])));
    assert_eq!(
        factor_decimal(&mersenne(61).to_string()),
        Ok(complete("2305843009213693951", &[("2305843009213693951", 1)]))
    );
}

#[test]
fn splits_semiprimes() {
    let m67 = mersenne(67).to_string();
    let semiprime = "300000000000000438880000000000084056037";

    assert_eq!(
        factor_decimal(&m67),
        Ok(complete(&m67, &[("193707721", 1), ("761838257287", 1)]))
    );
    assert_eq!(
        factor_decimal("1000000016000000063"),
        Ok(complete("1000000016000000063", &[("1000000007", 1), ("1000000009", 1)]))
    );
    assert_eq!(
        factor_decimal(semiprime),
        Ok(complete(semiprime, &[("10000000000000012363", 1), ("30000000000000006799", 1)]))
    );
}

#[test]
fn races_ecm_against_the_sieve_from_200_bits() {
    let medium_factor = "30000000000000000000001470000000000000000000000059000000000000000000002891";
    let balanced = "900000000000000000000000000004580000000000000000000000000005313";
    let below_race = "70000000000000000000000000226600000000000000000000000010527";

    assert_eq!(
        factor_decimal(medium_factor),
        Ok(complete(
            medium_factor,
            &[("1000000000000000000000049", 1), ("30000000000000000000000000000000000000000000000059", 1)]
        ))
    );
    assert_eq!(
        factor_decimal(balanced),
        Ok(complete(balanced, &[("10000000000000000000000000000033", 1), ("90000000000000000000000000000161", 1)]))
    );
    assert_eq!(
        factor_decimal(below_race),
        Ok(complete(below_race, &[("100000000000000000000000000319", 1), ("700000000000000000000000000033", 1)]))
    );
}

#[test]
fn handles_numbers_above_512_bits() {
    let m607 = mersenne(607);
    let n = BigUint::from(243u32 * 9973u32) * &m607;
    let with_semiprime_cofactor = (BigUint::from(7u8) << 600u32) * mersenne(67);
    let m1279 = mersenne(1279).to_string();

    assert_eq!(
        factor_decimal(&n.to_string()),
        Ok(complete(&n.to_string(), &[("3", 5), ("9973", 1), (&m607.to_string(), 1)]))
    );
    assert_eq!(
        factor_decimal(&with_semiprime_cofactor.to_string()),
        Ok(complete(
            &with_semiprime_cofactor.to_string(),
            &[("2", 600), ("7", 1), ("193707721", 1), ("761838257287", 1)]
        ))
    );
    assert_eq!(factor_decimal(&m1279), Ok(complete(&m1279, &[(&m1279, 1)])));
}

#[test]
fn reports_a_large_cofactor_it_cannot_split() {
    let n = (mersenne(521) * mersenne(607)).to_string();

    assert_eq!(
        factor_decimal(&n),
        Ok(Factorization { n: n.clone(), unfactored: vec![n], unfactored_exponents: vec![1], ..Factorization::default() })
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
