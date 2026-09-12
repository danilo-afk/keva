//! NIP-KP (keva): fetch the production a channel belongs to at session
//! creation and render it as a `<production>` prompt section.
//!
//! Same lifecycle as the core engram: fetched once per new channel session,
//! never mid-session (a production change is picked up when the session is
//! recreated). Any error emits nothing — a relay hiccup must not make the
//! agent believe there is no production.

use buzz_core::kind::KIND_PRODUCTION;
use nostr::{Alphabet, Event, PublicKey, SingleLetterTag};
use uuid::Uuid;

use crate::relay::RestClient;

/// Hard cap for the rendered section: the bible must stay a briefing, not a
/// second base prompt (measured turns already run 50k+ input tokens).
const MAX_SECTION_CHARS: usize = 8_000;

pub async fn build_production_section(
    rest: &RestClient,
    channel_id: Uuid,
    agent_pubkey: &PublicKey,
) -> Option<String> {
    let filter = nostr::Filter::new()
        .kind(nostr::Kind::Custom(KIND_PRODUCTION as u16))
        .custom_tags(
            SingleLetterTag::lowercase(Alphabet::C),
            [channel_id.to_string()],
        )
        .limit(16);
    let value = match rest.query(&[filter]).await {
        Ok(v) => v,
        Err(e) => {
            tracing::warn!(target: "production", channel = %channel_id, "fetch failed: {e}");
            return None;
        }
    };
    let arr = value.as_array()?;
    let mut newest: Option<Event> = None;
    for ev_json in arr {
        let Ok(event) = serde_json::from_value::<Event>(ev_json.clone()) else {
            continue;
        };
        if event.verify().is_err() {
            continue;
        }
        if newest.as_ref().is_none_or(|n| event.created_at > n.created_at) {
            newest = Some(event);
        }
    }
    let event = newest?;
    let rendered = render_production(&event, agent_pubkey)?;
    Some(crate::prompt_framing::semantic_section("production", &rendered))
}

/// Render the production body and this agent's per-production instructions
/// as plain text for the prompt. Returns `None` when there is nothing useful.
pub fn render_production(event: &Event, agent_pubkey: &PublicKey) -> Option<String> {
    let body: serde_json::Value = serde_json::from_str(&event.content).ok()?;
    let mut out = String::new();
    let field = |key: &str| body.get(key).and_then(|v| v.as_str()).map(str::trim).filter(|s| !s.is_empty());
    let slug = event
        .tags
        .iter()
        .find(|t| t.as_slice().first().map(|s| s.as_str()) == Some("d"))
        .and_then(|t| t.as_slice().get(1).cloned())
        .unwrap_or_default();
    out.push_str(&format!("Production: {}", field("name").unwrap_or(slug.as_str())));
    if let Some(f) = field("format") {
        out.push_str(&format!(" · {f}"));
    }
    if let Some(a) = field("aspect") {
        out.push_str(&format!(" · {a}"));
    }
    if let Some(s) = field("status") {
        out.push_str(&format!(" · {s}"));
    }
    out.push('\n');
    if let Some(ctx) = body.get("context").and_then(|v| v.as_object()) {
        for (key, value) in ctx {
            let text = match value {
                serde_json::Value::String(s) => s.trim().to_string(),
                serde_json::Value::Array(items) => items
                    .iter()
                    .filter_map(|i| i.as_str())
                    .map(|s| format!("- {}", s.trim()))
                    .collect::<Vec<_>>()
                    .join("\n"),
                other => other.to_string(),
            };
            if text.is_empty() {
                continue;
            }
            out.push_str(&format!("\n## {}\n{}\n", key.replace('_', " "), text));
        }
    }
    let me = agent_pubkey.to_hex();
    if let Some(instr) = event.tags.iter().find_map(|t| {
        let s = t.as_slice();
        (s.first().map(|x| x.as_str()) == Some("agent")
            && s.get(1).map(|x| x.eq_ignore_ascii_case(&me)).unwrap_or(false))
        .then(|| s.get(2).cloned())
        .flatten()
    }) {
        if !instr.trim().is_empty() {
            out.push_str(&format!("\n## Your instructions for this production\n{}\n", instr.trim()));
        }
    }
    if out.chars().count() > MAX_SECTION_CHARS {
        out = out.chars().take(MAX_SECTION_CHARS).collect::<String>() + "\n[…truncated]";
    }
    Some(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use nostr::{EventBuilder, Keys, Kind, Tag};

    fn event(content: &str, tags: Vec<Vec<&str>>) -> Event {
        let keys = Keys::generate();
        EventBuilder::new(Kind::Custom(KIND_PRODUCTION as u16), content)
            .tags(tags.into_iter().map(|t| Tag::parse(t).unwrap()))
            .sign_with_keys(&keys)
            .unwrap()
    }

    #[test]
    fn renders_body_and_agent_instructions() {
        let agent = Keys::generate();
        let pk = agent.public_key().to_hex();
        let ev = event(
            r#"{"name":"Jony","format":"microdrama","aspect":"9:16","context":{"premise":"Um menino foge da guerra.","continuity_rules":["Jony tem 9 anos","Sem sangue em quadro"]}}"#,
            vec![vec!["d", "jony"], vec!["agent", &pk, "Câmera nervosa, luz natural."]],
        );
        let out = render_production(&ev, &agent.public_key()).unwrap();
        assert!(out.starts_with("Production: Jony · microdrama · 9:16"));
        assert!(out.contains("## premise\nUm menino foge da guerra."));
        assert!(out.contains("- Jony tem 9 anos"));
        assert!(out.contains("## Your instructions for this production\nCâmera nervosa, luz natural."));
    }

    #[test]
    fn other_agents_instructions_are_not_shown() {
        let agent = Keys::generate();
        let other = Keys::generate().public_key().to_hex();
        let ev = event(r#"{"name":"Jony"}"#, vec![vec!["d", "jony"], vec!["agent", &other, "só pro outro"]]);
        let out = render_production(&ev, &agent.public_key()).unwrap();
        assert!(!out.contains("só pro outro"));
    }
}
