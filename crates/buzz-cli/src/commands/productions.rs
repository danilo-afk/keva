//! NIP-KP (keva): productions — film/series projects that group channels and
//! agents. One addressable event (kind 30180) per production, keyed by slug.

use crate::client::BuzzClient;
use crate::error::CliError;
use buzz_core::kind::KIND_PRODUCTION;
use uuid::Uuid;

fn parse_agent_spec(spec: &str) -> Result<(String, Option<String>), CliError> {
    let (pk, instr) = match spec.split_once('=') {
        Some((pk, instr)) => (pk.trim(), Some(instr.trim().to_string())),
        None => (spec.trim(), None),
    };
    if pk.len() != 64 || !pk.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(CliError::Usage(format!(
            "--agent expects <64-hex pubkey>[=instructions], got {spec:?}"
        )));
    }
    Ok((pk.to_ascii_lowercase(), instr.filter(|s| !s.is_empty())))
}

fn parse_channel(spec: &str) -> Result<Uuid, CliError> {
    Uuid::parse_str(spec.trim())
        .map_err(|e| CliError::Usage(format!("--channel must be a channel UUID: {e}")))
}

async fn fetch(client: &BuzzClient, slug: Option<&str>) -> Result<Vec<serde_json::Value>, CliError> {
    let mut filter = serde_json::json!({
        "kinds": [KIND_PRODUCTION],
        "authors": [client.keys().public_key().to_hex()],
        "limit": 200,
    });
    if let Some(slug) = slug {
        filter["#d"] = serde_json::json!([slug]);
    }
    let raw = client.query(&filter).await?;
    let events: Vec<serde_json::Value> = serde_json::from_str(&raw)
        .map_err(|e| CliError::Other(format!("relay returned non-JSON: {e}")))?;
    Ok(events)
}

fn tag_values<'a>(ev: &'a serde_json::Value, name: &str) -> Vec<&'a [serde_json::Value]> {
    ev["tags"]
        .as_array()
        .map(|tags| {
            tags.iter()
                .filter_map(|t| t.as_array())
                .filter(|t| t.first().and_then(|v| v.as_str()) == Some(name))
                .map(|t| t.as_slice())
                .collect()
        })
        .unwrap_or_default()
}

fn summarize(ev: &serde_json::Value) -> serde_json::Value {
    let content: serde_json::Value =
        serde_json::from_str(ev["content"].as_str().unwrap_or("{}")).unwrap_or_default();
    let slug = tag_values(ev, "d")
        .first()
        .and_then(|t| t.get(1))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let channels: Vec<String> = tag_values(ev, "c")
        .iter()
        .filter_map(|t| t.get(1).and_then(|v| v.as_str()))
        .map(str::to_string)
        .collect();
    let agents: Vec<serde_json::Value> = tag_values(ev, "agent")
        .iter()
        .map(|t| {
            serde_json::json!({
                "pubkey": t.get(1).and_then(|v| v.as_str()).unwrap_or(""),
                "instructions": t.get(2).and_then(|v| v.as_str()),
            })
        })
        .collect();
    serde_json::json!({
        "slug": slug,
        "event_id": ev["id"],
        "created_at": ev["created_at"],
        "production": content,
        "channels": channels,
        "agents": agents,
    })
}

#[allow(clippy::too_many_arguments)]
pub async fn dispatch(cmd: crate::ProductionsCmd, client: &BuzzClient) -> Result<(), CliError> {
    match cmd {
        crate::ProductionsCmd::List => {
            let events = fetch(client, None).await?;
            let mut list: Vec<serde_json::Value> = events.iter().map(summarize).collect();
            list.sort_by(|a, b| a["slug"].as_str().cmp(&b["slug"].as_str()));
            println!("{}", serde_json::to_string(&list).unwrap_or_default());
            Ok(())
        }
        crate::ProductionsCmd::Get { slug } => {
            let events = fetch(client, Some(&slug)).await?;
            let newest = events
                .iter()
                .max_by_key(|e| e["created_at"].as_i64().unwrap_or(0))
                .ok_or_else(|| CliError::Other(format!("production {slug:?} not found")))?;
            println!("{}", serde_json::to_string(&summarize(newest)).unwrap_or_default());
            Ok(())
        }
        crate::ProductionsCmd::Create {
            slug,
            name,
            format,
            aspect,
            status,
            premise,
            context_file,
            channel,
            agent,
            replace,
        } => {
            let existing = fetch(client, Some(&slug)).await?;
            let existing = existing
                .iter()
                .max_by_key(|e| e["created_at"].as_i64().unwrap_or(0))
                .cloned();
            if existing.is_some() && !replace {
                return Err(CliError::Usage(format!(
                    "production {slug:?} already exists; pass --replace to publish a new version"
                )));
            }
            // Start from the previous body so partial edits keep the rest.
            let mut body: serde_json::Value = existing
                .as_ref()
                .and_then(|e| serde_json::from_str(e["content"].as_str().unwrap_or("{}")).ok())
                .unwrap_or_else(|| serde_json::json!({}));
            if !body.is_object() {
                body = serde_json::json!({});
            }
            if let Some(v) = name {
                body["name"] = serde_json::json!(v);
            }
            if let Some(v) = format {
                body["format"] = serde_json::json!(v);
            }
            if let Some(v) = aspect {
                body["aspect"] = serde_json::json!(v);
            }
            if let Some(v) = status {
                body["status"] = serde_json::json!(v);
            }
            if let Some(path) = context_file {
                let text = std::fs::read_to_string(&path)
                    .map_err(|e| CliError::Usage(format!("cannot read {path}: {e}")))?;
                let ctx: serde_json::Value = serde_json::from_str(&text)
                    .map_err(|e| CliError::Usage(format!("{path} must be a JSON object: {e}")))?;
                if !ctx.is_object() {
                    return Err(CliError::Usage(format!("{path} must be a JSON object")));
                }
                body["context"] = ctx;
            }
            if let Some(p) = premise {
                if !body["context"].is_object() {
                    body["context"] = serde_json::json!({});
                }
                body["context"]["premise"] = serde_json::json!(p);
            }
            if body.get("name").and_then(|v| v.as_str()).is_none() {
                body["name"] = serde_json::json!(slug);
            }
            // Channels/agents: explicit flags replace the previous set; none given keeps it.
            let channels: Vec<Uuid> = if channel.is_empty() {
                existing
                    .as_ref()
                    .map(|e| {
                        tag_values(e, "c")
                            .iter()
                            .filter_map(|t| t.get(1).and_then(|v| v.as_str()))
                            .filter_map(|s| Uuid::parse_str(s).ok())
                            .collect()
                    })
                    .unwrap_or_default()
            } else {
                channel.iter().map(|c| parse_channel(c)).collect::<Result<_, _>>()?
            };
            let agents: Vec<(String, Option<String>)> = if agent.is_empty() {
                existing
                    .as_ref()
                    .map(|e| {
                        tag_values(e, "agent")
                            .iter()
                            .filter_map(|t| {
                                Some((
                                    t.get(1)?.as_str()?.to_string(),
                                    t.get(2).and_then(|v| v.as_str()).map(str::to_string),
                                ))
                            })
                            .collect()
                    })
                    .unwrap_or_default()
            } else {
                agent.iter().map(|a| parse_agent_spec(a)).collect::<Result<_, _>>()?
            };
            let content = serde_json::to_string(&body).unwrap_or_default();
            let builder = buzz_sdk::build_production(&slug, &content, &channels, &agents)
                .map_err(|e| CliError::Usage(e.to_string()))?;
            let event = builder
                .sign_with_keys(client.keys())
                .map_err(|e| CliError::Other(format!("sign failed: {e}")))?;
            let resp = client.submit_event(event.clone()).await?;
            println!(
                "{}",
                serde_json::json!({
                    "slug": slug,
                    "event_id": event.id.to_hex(),
                    "channels": channels.iter().map(|c| c.to_string()).collect::<Vec<_>>(),
                    "agents": agents.len(),
                    "relay": resp,
                })
            );
            Ok(())
        }
    }
}
