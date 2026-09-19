//! NIP-KP (keva): shape checks for production entities before they are signed.
//!
//! The desktop parser is tolerant (a missing or misspelt field renders as
//! empty), so a malformed write would land silently. Agents write through the
//! CLI; rejecting here turns a silent hole into an error they can fix.

use buzz_core::kind::{
    KIND_PRODUCTION_CHARACTER, KIND_PRODUCTION_DOCUMENT, KIND_PRODUCTION_EPISODE,
};
use serde_json::{Map, Value};

const EPISODE_KEYS: &[&str] = &[
    "id",
    "number",
    "title",
    "block",
    "blockTitle",
    "year",
    "duration",
    "aspect",
    "storyboardPrompt",
    "shots",
];
const EPISODE_STRINGS: &[&str] = &[
    "title",
    "block",
    "blockTitle",
    "year",
    "duration",
    "aspect",
    "storyboardPrompt",
];
const SHOT_STRINGS: &[&str] = &[
    "start",
    "end",
    "scene",
    "framing",
    "action",
    "dialogue",
    "sound",
    "cast",
    "storyboardPrompt",
    "videoPrompt",
    "notes",
];
const SHOT_OTHER_KEYS: &[&str] = &["n", "frames", "clip", "state", "evals"];
const SHOT_STATES: &[&str] = &["cartela", "gerado", "revisao", "aprovado"];
const EVAL_KEYS: &[&str] = &["voices", "quality", "director"];
const DOCUMENT_KEYS: &[&str] = &["title", "format", "body", "version"];
const CHARACTER_KEYS: &[&str] = &[
    "id", "name", "kicker", "summary", "sections", "images", "voices",
];
const IMAGE_KEYS: &[&str] = &["url", "caption", "group"];
const VOICE_KEYS: &[&str] = &["phase", "engine", "voice", "targetF0", "direction", "where"];

/// Cap on reported problems: enough to fix a payload in one pass, bounded so a
/// thousand-shot mistake cannot flood the agent's context.
const MAX_PROBLEMS: usize = 20;

/// The animatic is a desktop-owned document with its own shape (cut list).
const ANIMATIC_DOC_ID: &str = "animatic";

/// Check `content` against the NIP-KP shape of `kind`. Tombstones pass.
pub fn validate_entity(kind: u32, id: &str, content: &Value) -> Result<(), String> {
    let Some(body) = content.as_object() else {
        return Err("content must be a JSON object".into());
    };
    if body.get("deleted").and_then(Value::as_bool) == Some(true) {
        return Ok(());
    }
    let mut problems = Vec::new();
    match kind {
        KIND_PRODUCTION_EPISODE => episode(body, &mut problems),
        KIND_PRODUCTION_CHARACTER => character(body, &mut problems),
        KIND_PRODUCTION_DOCUMENT if id != ANIMATIC_DOC_ID => document(body, &mut problems),
        _ => {}
    }
    if problems.is_empty() {
        return Ok(());
    }
    let total = problems.len();
    problems.truncate(MAX_PROBLEMS);
    let mut msg = format!("content rejected, nothing was written ({total} problem(s)):");
    for p in &problems {
        msg.push_str("\n- ");
        msg.push_str(p);
    }
    if total > MAX_PROBLEMS {
        msg.push_str(&format!("\n- … and {} more", total - MAX_PROBLEMS));
    }
    Err(msg)
}

fn unknown_keys(at: &str, body: &Map<String, Value>, allowed: &[&[&str]], out: &mut Vec<String>) {
    for key in body.keys() {
        if !allowed.iter().any(|set| set.contains(&key.as_str())) {
            let known: Vec<&str> = allowed.iter().flat_map(|set| set.iter().copied()).collect();
            out.push(format!(
                "{at}: unknown field {key:?} (allowed: {})",
                known.join(", ")
            ));
        }
    }
}

fn strings(at: &str, body: &Map<String, Value>, keys: &[&str], out: &mut Vec<String>) {
    for key in keys {
        if body.get(*key).is_some_and(|v| !v.is_string()) {
            out.push(format!("{at}: {key} must be a string"));
        }
    }
}

fn required_text(at: &str, body: &Map<String, Value>, key: &str, out: &mut Vec<String>) {
    if body
        .get(key)
        .and_then(Value::as_str)
        .is_none_or(|s| s.trim().is_empty())
    {
        out.push(format!("{at}: {key} is required (non-empty string)"));
    }
}

/// "MM:SS" → seconds. The desktop timeline only understands this form.
fn timecode(s: &str) -> Option<u32> {
    let (m, sec) = s.split_once(':')?;
    let digits = |t: &str| !t.is_empty() && t.len() <= 3 && t.chars().all(|c| c.is_ascii_digit());
    if !digits(m) || sec.len() != 2 || !digits(sec) {
        return None;
    }
    let sec: u32 = sec.parse().ok()?;
    (sec < 60)
        .then(|| m.parse::<u32>().ok().map(|m| m * 60 + sec))
        .flatten()
}

fn episode(body: &Map<String, Value>, out: &mut Vec<String>) {
    unknown_keys("episode", body, &[EPISODE_KEYS], out);
    strings("episode", body, EPISODE_STRINGS, out);
    required_text("episode", body, "title", out);
    if body
        .get("number")
        .and_then(Value::as_u64)
        .is_none_or(|n| n == 0)
    {
        out.push("episode: number is required (integer ≥ 1)".into());
    }
    let Some(shots) = body.get("shots") else {
        out.push("episode: shots is required (use [] for none)".into());
        return;
    };
    let Some(shots) = shots.as_array() else {
        out.push("episode: shots must be an array".into());
        return;
    };
    let mut prev_end: Option<(usize, u32)> = None;
    for (i, raw) in shots.iter().enumerate() {
        let at = format!("shots[{i}]");
        let Some(s) = raw.as_object() else {
            out.push(format!("{at}: must be an object"));
            prev_end = None;
            continue;
        };
        prev_end = shot(&at, i, s, prev_end, out);
    }
}

/// Returns this shot's end so the next one can be chained against it.
fn shot(
    at: &str,
    index: usize,
    s: &Map<String, Value>,
    prev_end: Option<(usize, u32)>,
    out: &mut Vec<String>,
) -> Option<(usize, u32)> {
    unknown_keys(at, s, &[SHOT_OTHER_KEYS, SHOT_STRINGS], out);
    strings(at, s, SHOT_STRINGS, out);
    if s.get("n").and_then(Value::as_u64) != Some(index as u64 + 1) {
        out.push(format!(
            "{at}: n must be {} (shots are numbered 1..N in order)",
            index + 1
        ));
    }
    match s.get("state").and_then(Value::as_str) {
        Some(state) if SHOT_STATES.contains(&state) => {}
        _ => out.push(format!(
            "{at}: state must be one of {}",
            SHOT_STATES.join(" | ")
        )),
    }
    if let Some(frames) = s.get("frames") {
        if !frames
            .as_array()
            .is_some_and(|f| f.iter().all(Value::is_string))
        {
            out.push(format!("{at}: frames must be an array of URL strings"));
        }
    }
    if s.get("clip")
        .is_some_and(|c| !c.is_string() && !c.is_null())
    {
        out.push(format!("{at}: clip must be a URL string or null"));
    }
    if let Some(evals) = s.get("evals") {
        match evals.as_object() {
            Some(e) => {
                unknown_keys(&format!("{at}.evals"), e, &[EVAL_KEYS], out);
                if e.values().any(|v| !v.is_boolean()) {
                    out.push(format!("{at}.evals: values must be booleans"));
                }
            }
            None => out.push(format!("{at}: evals must be an object")),
        }
    }
    let time = |key: &str, out: &mut Vec<String>| -> Option<u32> {
        let text = s.get(key).and_then(Value::as_str).unwrap_or("").trim();
        if text.is_empty() {
            return None;
        }
        let parsed = timecode(text);
        if parsed.is_none() {
            out.push(format!("{at}: {key} must be MM:SS (got {text:?})"));
        }
        parsed
    };
    let start = time("start", out);
    let end = time("end", out);
    if let (Some(a), Some(b)) = (start, end) {
        if b <= a {
            out.push(format!("{at}: end must be after start"));
        }
    }
    if let (Some((prev, prev_end)), Some(a)) = (prev_end, start) {
        if a != prev_end {
            out.push(format!(
                "{at}: start must equal the end of shots[{prev}] (no gaps or overlaps)"
            ));
        }
    }
    end.map(|e| (index, e))
}

fn document(body: &Map<String, Value>, out: &mut Vec<String>) {
    unknown_keys("document", body, &[DOCUMENT_KEYS], out);
    required_text("document", body, "title", out);
    if body.get("body").is_none_or(|v| !v.is_string()) {
        out.push("document: body is required (markdown string)".into());
    }
    if body
        .get("format")
        .is_some_and(|f| f.as_str() != Some("markdown"))
    {
        out.push("document: format must be \"markdown\"".into());
    }
    if body.get("version").is_some_and(|v| v.as_u64().is_none()) {
        out.push("document: version must be a non-negative integer".into());
    }
}

fn character(body: &Map<String, Value>, out: &mut Vec<String>) {
    unknown_keys("character", body, &[CHARACTER_KEYS], out);
    strings("character", body, &["kicker", "summary"], out);
    required_text("character", body, "name", out);
    if let Some(sections) = body.get("sections") {
        if !sections
            .as_object()
            .is_some_and(|s| s.values().all(Value::is_string))
        {
            out.push("character: sections must be an object of strings".into());
        }
    }
    rows("images", body, IMAGE_KEYS, out);
    rows("voices", body, VOICE_KEYS, out);
}

fn rows(key: &str, body: &Map<String, Value>, allowed: &[&str], out: &mut Vec<String>) {
    let Some(value) = body.get(key) else { return };
    let Some(items) = value.as_array() else {
        out.push(format!("character: {key} must be an array"));
        return;
    };
    for (i, item) in items.iter().enumerate() {
        let at = format!("{key}[{i}]");
        match item.as_object() {
            Some(row) => {
                unknown_keys(&at, row, &[allowed], out);
                strings(&at, row, allowed, out);
            }
            None => out.push(format!("{at}: must be an object")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn shot_json(n: u64, start: &str, end: &str) -> Value {
        json!({"n": n, "start": start, "end": end, "scene": "EXT. VALE", "framing": "aéreo",
               "action": "a", "dialogue": "", "sound": "", "cast": "JONY (11)",
               "storyboardPrompt": "", "videoPrompt": "p", "frames": [], "clip": null,
               "state": "cartela", "notes": ""})
    }

    fn episode_json(shots: Vec<Value>) -> Value {
        json!({"number": 4, "title": "O Contrato", "block": "Bloco I", "blockTitle": "", "year": "1478",
               "duration": "37 s", "aspect": "2.39:1", "storyboardPrompt": "", "shots": shots})
    }

    #[test]
    fn accepts_a_well_formed_episode() {
        let ep = episode_json(vec![
            shot_json(1, "00:00", "00:06"),
            shot_json(2, "00:06", "00:14"),
        ]);
        assert_eq!(
            validate_entity(KIND_PRODUCTION_EPISODE, "ep04", &ep),
            Ok(())
        );
    }

    #[test]
    fn rejects_a_misspelt_shot_field() {
        let mut s = shot_json(1, "00:00", "00:06");
        s["prompt"] = json!("typo for videoPrompt");
        let err =
            validate_entity(KIND_PRODUCTION_EPISODE, "ep04", &episode_json(vec![s])).unwrap_err();
        assert!(err.contains("shots[0]: unknown field \"prompt\""), "{err}");
    }

    #[test]
    fn rejects_gaps_bad_numbering_and_unknown_state() {
        let mut second = shot_json(3, "00:08", "00:07");
        second["state"] = json!("done");
        let ep = episode_json(vec![shot_json(1, "00:00", "00:06"), second]);
        let err = validate_entity(KIND_PRODUCTION_EPISODE, "ep04", &ep).unwrap_err();
        assert!(err.contains("shots[1]: n must be 2"), "{err}");
        assert!(err.contains("shots[1]: state must be one of"), "{err}");
        assert!(err.contains("shots[1]: end must be after start"), "{err}");
        assert!(
            err.contains("shots[1]: start must equal the end of shots[0]"),
            "{err}"
        );
    }

    #[test]
    fn rejects_timecodes_the_desktop_cannot_parse() {
        let ep = episode_json(vec![shot_json(1, "0s", "00:61")]);
        let err = validate_entity(KIND_PRODUCTION_EPISODE, "ep04", &ep).unwrap_err();
        assert!(err.contains("start must be MM:SS"), "{err}");
        assert!(err.contains("end must be MM:SS"), "{err}");
    }

    #[test]
    fn untimed_shots_and_tombstones_pass() {
        let ep = episode_json(vec![shot_json(1, "", ""), shot_json(2, "", "")]);
        assert_eq!(
            validate_entity(KIND_PRODUCTION_EPISODE, "ep04", &ep),
            Ok(())
        );
        assert_eq!(
            validate_entity(KIND_PRODUCTION_EPISODE, "ep04", &json!({"deleted": true})),
            Ok(())
        );
    }

    #[test]
    fn caps_the_problem_list() {
        let shots = (0..40).map(|_| json!({"n": 99, "state": "x"})).collect();
        let err =
            validate_entity(KIND_PRODUCTION_EPISODE, "ep04", &episode_json(shots)).unwrap_err();
        assert!(err.contains("(80 problem(s))"), "{err}");
        assert!(err.contains("… and 60 more"), "{err}");
    }

    #[test]
    fn checks_documents_and_characters() {
        let doc = json!({"title": "Bíblia", "format": "markdown", "body": "# x", "version": 2});
        assert_eq!(
            validate_entity(KIND_PRODUCTION_DOCUMENT, "biblia", &doc),
            Ok(())
        );
        let err = validate_entity(
            KIND_PRODUCTION_DOCUMENT,
            "biblia",
            &json!({"title": "x", "text": "y"}),
        )
        .unwrap_err();
        assert!(err.contains("unknown field \"text\""), "{err}");
        assert!(err.contains("body is required"), "{err}");

        let animatic = json!({"title": "Animatic", "format": "animatic", "body": "", "cuts": []});
        assert_eq!(
            validate_entity(KIND_PRODUCTION_DOCUMENT, "animatic", &animatic),
            Ok(())
        );

        let ch = json!({"name": "Maya", "sections": {"voz": "grave"},
                        "voices": [{"phase": "11", "engine": "x", "pitch": "A3"}]});
        let err = validate_entity(KIND_PRODUCTION_CHARACTER, "maya", &ch).unwrap_err();
        assert!(err.contains("voices[0]: unknown field \"pitch\""), "{err}");
    }
}
