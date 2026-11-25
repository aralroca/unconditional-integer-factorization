//! What the engine is doing right now, and which methods the current run has used.
//!
//! Factoring runs on worker threads while the page polls [`activity`] and [`methods`],
//! so the state lives behind a global mutex.

use std::collections::BTreeMap;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Mutex;

/// A line of work that can run at the same time as another one.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum Lane {
    /// Trial division, then yamaquasi's automatic strategy (P−1, ECM, quadratic sieve).
    Main,
    /// ECM looking for a medium-size factor while the quadratic sieve runs.
    Race,
}

struct State {
    activity: BTreeMap<Lane, String>,
    methods: Vec<&'static str>,
}

static STATE: Mutex<State> = Mutex::new(State { activity: BTreeMap::new(), methods: Vec::new() });

const SIQS: &str = "Quadratic sieve (SIQS)";

// Sieve progress arrives after every polynomial from every thread: kept lock-free and
// only turned into text when the page asks for it.
static RELATIONS: AtomicUsize = AtomicUsize::new(0);
static TARGET: AtomicUsize = AtomicUsize::new(0);

fn with_state<R>(f: impl FnOnce(&mut State) -> R) -> R {
    f(&mut STATE.lock().unwrap_or_else(|poisoned| poisoned.into_inner()))
}

/// Starts a new run.
pub fn reset() {
    TARGET.store(0, Ordering::Relaxed);
    with_state(|state| {
        state.activity.clear();
        state.methods.clear();
    });
}

/// Records that `lane` is running `method`, with an optional detail such as progress.
pub fn report(lane: Lane, method: &'static str, detail: Option<String>) {
    with_state(|state| {
        if !state.methods.contains(&method) {
            state.methods.push(method);
        }
        let line = detail.map_or(method.to_string(), |d| format!("{method}: {d}"));
        state.activity.insert(lane, line);
    });
}

pub fn finish(lane: Lane) {
    with_state(|state| state.activity.remove(&lane));
}

/// One line per lane that is currently running.
pub fn activity() -> Vec<String> {
    with_state(|state| state.activity.values().map(|line| with_sieve_progress(line)).collect())
}

fn with_sieve_progress(line: &str) -> String {
    let relations = RELATIONS.load(Ordering::Relaxed);
    let target = TARGET.load(Ordering::Relaxed);

    if line != SIQS || target == 0 {
        return line.to_string();
    }
    let percent = (100 * relations / target).min(99);
    format!("{SIQS}: {percent}% of the relations ({relations} of {target})")
}

/// Methods used so far, in the order they started.
pub fn methods() -> Vec<String> {
    with_state(|state| state.methods.iter().map(|m| m.to_string()).collect())
}

/// Maps yamaquasi's progress events to the main lane.
pub fn from_yamaquasi(event: yamaquasi::Progress) {
    match event {
        yamaquasi::Progress::Algorithm("Pollard P-1") => report(Lane::Main, "Pollard P−1", None),
        yamaquasi::Progress::Algorithm("ECM") => report(Lane::Main, "ECM (elliptic curves)", None),
        yamaquasi::Progress::Algorithm("SIQS") => {
            TARGET.store(0, Ordering::Relaxed);
            report(Lane::Main, SIQS, None)
        }
        yamaquasi::Progress::Algorithm("linear algebra") => {
            report(Lane::Main, "Linear algebra (SIQS)", Some("combining relations into a square".into()))
        }
        yamaquasi::Progress::Algorithm(_) => {}
        yamaquasi::Progress::Sieve { relations, target } => {
            RELATIONS.store(relations, Ordering::Relaxed);
            TARGET.store(target, Ordering::Relaxed);
        }
    }
}
